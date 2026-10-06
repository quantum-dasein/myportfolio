import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { archiveDimensions, type ArchiveModel } from '../data/model-archive';
import type { ExhibitInfo } from './model-room-exhibits';
import { createArchivePortal } from './model-room-portal';

/** One on-demand exhibit. At most one resident model and one incoming model; stale loads are disposed. */
export function createArchiveBay(o: {
  scene: THREE.Scene; renderer: THREE.WebGLRenderer; camera: THREE.Camera; loader: GLTFLoader;
  mobile: boolean; reduced: boolean; target: () => THREE.WebGLRenderTarget | null;
  onReveal?: () => void; wireframe: () => boolean;
}) {
  const portal = createArchivePortal(o.scene, o.reduced);
  const station = portal.root, at = station.position;
  const colliders: THREE.Box3[] = [];
  let lift = .22;
  const meshes: THREE.Mesh[] = [];
  const clip = { value: -1 }, waterTime = { value: 0 };
  let current: { root: THREE.Group; entry: ArchiveModel; info: ExhibitInfo } | undefined;
  let controller: AbortController | undefined;
  let generation = 0, disposed = false, state: 'empty' | 'revealing' | 'shown' | 'removing' = 'empty', progress = 0;
  let finishRemoval: (() => void) | undefined;

  // The stage's own light: a warm key from high on the left, a little behind the work, so its shadows fall
  // towards the visitor (the pergola onto the terrace, the dumbbells into their shelves), and a cool kicker
  // from the entrance side to open the front. Both are dark
  // while the stage is empty. The shadow map is drawn once per work, not every frame.
  const key = new THREE.SpotLight('#ffe9cf', 0, 16, .46, .75, 1.6); key.position.set(at.x - 4, 6.2, at.z - 1.2); key.target.position.set(at.x, .9, at.z);
  key.castShadow = !o.mobile; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0003; key.shadow.normalBias = .012; key.shadow.radius = 4;
  key.shadow.camera.near = 3; key.shadow.camera.far = 14; key.shadow.autoUpdate = false; key.shadow.intensity = 0;
  const kicker = new THREE.PointLight('#cfe6ff', 0, 11, 1.6); kicker.position.set(at.x + 2.8, 3, at.z + 3.2);
  o.scene.add(key, key.target, kicker);
  let lit = 0, shadowAt = -1;
  // What the work stands on: a dark stone base cut to its footprint, with a line of light round the top.
  const baseStone = new THREE.MeshStandardMaterial({ color: '#27302d', roughness: .62, metalness: .1 });
  const baseGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(.25, 1.5, .8), toneMapped: false });
  let base: THREE.Group | undefined;
  function buildBase(root: THREE.Object3D, height: number) {
    const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const w = size.x + .16, d = size.z + .16, group = new THREE.Group();
    const slab = new THREE.Mesh(new RoundedBoxGeometry(w, height, d, 2, Math.min(.03, height / 3)), baseStone); slab.position.y = height / 2; slab.castShadow = slab.receiveShadow = true; group.add(slab);
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + .004, .002, d + .004)), new THREE.LineBasicMaterial({ color: baseGlow.color, toneMapped: false })); line.position.y = height - .012; group.add(line);
    group.position.set(mid.x - at.x, 0, mid.z - at.z); group.scale.y = .001; return group;
  }
  function dropBase() {
    if (!base) return;
    base.removeFromParent(); base.traverse(n => { const m = n as THREE.Mesh; if (m.geometry) m.geometry.dispose(); if ((n as THREE.LineSegments).isLineSegments) (m.material as THREE.Material).dispose(); });
    base = undefined;
  }

  function release(root: THREE.Object3D) {
    root.removeFromParent();
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    root.traverse(n => {
      const m = n as THREE.Mesh; if (!m.isMesh) return;
      geometries.add(m.geometry); for (const mat of Array.isArray(m.material) ? m.material : [m.material]) materials.add(mat);
    });
    for (const mat of materials) for (const v of Object.values(mat)) if (v instanceof THREE.Texture) textures.add(v);
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => { if (typeof ImageBitmap !== 'undefined' && t.image instanceof ImageBitmap) t.image.close(); t.dispose(); });
  }
  function shader(material: THREE.Material) {
    const m = material as THREE.MeshStandardMaterial;
    m.wireframe = o.wireframe();
    // A little more of the room in every surface; water that glows like a lit pool at dusk.
    m.envMapIntensity = 1.5;
    if (m.name === 'Pool water') { m.roughness = .04; m.metalness = 0; m.color.set('#1b8ea2'); m.emissive.set('#063f4a'); m.emissiveIntensity = .55; m.envMapIntensity = 2.6; }
    else if (/bronze/i.test(m.name)) { m.envMapIntensity = 2; m.roughness = Math.min(m.roughness, .38); }
    else if (/steel|metal/i.test(m.name)) m.envMapIntensity = 2;
    m.onBeforeCompile = s => {
      s.uniforms.uArchiveY = clip;
      if (m.name === 'Pool water') {
        // Living water. Still surfaces ripple (three layers of drifting noise, turned into a normal), with
        // caustic glints; steep surfaces (the cascades and spillways) run downwards in streaks, with foam.
        // The works are miniatures, so the wavelengths are a few centimetres.
        s.uniforms.uArchiveTime = waterTime;
        s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vArchiveW; varying vec3 vArchiveN;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvArchiveW = (modelMatrix * vec4(transformed, 1.)).xyz; vArchiveN = normalize(mat3(modelMatrix) * objectNormal);');
        s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
          uniform float uArchiveTime; varying vec3 vArchiveW; varying vec3 vArchiveN;
          float wHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float wNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
            return mix(mix(wHash(i), wHash(i + vec2(1., 0.)), f.x), mix(wHash(i + vec2(0., 1.)), wHash(i + vec2(1., 1.)), f.x), f.y); }
          float wWaves(vec2 p, float t){ return wNoise(p * 9. + vec2(t * .35, t * .21)) * .6 + wNoise(p * 21. - vec2(t * .5, -t * .33)) * .3 + wNoise(p * 47. + vec2(-t * .8, t * .6)) * .1; }
          float wFoam = 0., wCaustic = 0.;`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          {
            vec3 wN = normalize(vArchiveN); float t = uArchiveTime;
            float still = smoothstep(.5, .85, wN.y);
            vec2 q = vArchiveW.xz; float e = .004;
            float h0 = wWaves(q, t), hx = wWaves(q + vec2(e, 0.), t), hz = wWaves(q + vec2(0., e), t);
            vec3 ripple = normalize(vec3(-(hx - h0) / e * .014, 1., -(hz - h0) / e * .014));
            vec3 side = normalize(cross(wN, vec3(0., 1., 0.)) + vec3(1e-4));
            float along = dot(vArchiveW, side);
            float fall = wNoise(vec2(along * 60., vArchiveW.y * 7. + t * 3.4)) * .7 + wNoise(vec2(along * 140., vArchiveW.y * 16. + t * 5.2)) * .3;
            vec3 falling = normalize(wN + side * (fall - .5) * .9);
            vec3 w = normalize(mix(falling, ripple, still));
            normal = normalize((viewMatrix * vec4(w, 0.)).xyz);
            wFoam = (1. - still) * smoothstep(.5, .85, fall);
            float c = wWaves(q * 1.6 + 3.1, t * 1.3);
            wCaustic = still * pow(1. - abs(sin(c * 14.)), 8.);
          }`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .95, .97), wFoam * .65);
          totalEmissiveRadiance += vec3(.8, .95, 1.) * wFoam * .35 + vec3(.55, .95, 1.) * wCaustic * .3;`);
      }
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vArchiveY;').replace('#include <project_vertex>', '#include <project_vertex>\nvArchiveY = (modelMatrix * vec4(transformed, 1.)).y;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uArchiveY; varying float vArchiveY;').replace('void main() {', 'void main() {\nif(vArchiveY > uArchiveY) discard;').replace('#include <opaque_fragment>', 'float archiveBand = 1. - smoothstep(0., .09, uArchiveY - vArchiveY);\noutgoingLight = mix(outgoingLight, vec3(.14, 2.8, .95), archiveBand * .88);\n#include <opaque_fragment>');
    };
    m.customProgramCacheKey = () => m.name === 'Pool water' ? 'archive-water-v2' : 'archive-scan-v1'; m.needsUpdate = true;
  }
  function cancel() { generation++; controller?.abort(); controller = undefined; }
  function erase() {
    if (current) release(current.root);
    current = undefined; meshes.length = 0; state = 'empty'; colliders.length = 0; clip.value = -1; dropBase();
    finishRemoval?.(); finishRemoval = undefined;
  }
  function remove() {
    if (!current) return Promise.resolve();
    if (o.reduced) { erase(); return Promise.resolve(); }
    // A caller can cancel while the outgoing object dissolves; resolve the old waiter first.
    finishRemoval?.();
    state = 'removing'; progress = 0;
    return new Promise<void>(resolve => { finishRemoval = resolve; });
  }
  async function show(entry: ArchiveModel, status: (phase: 'loading' | 'preparing') => void): Promise<ExhibitInfo | null> {
    cancel(); const token = generation;
    if (disposed) return null;
    if (current?.entry.id === entry.id && state !== 'removing') return current.info;
    const abort = new AbortController(); controller = abort;
    let incoming: THREE.Group | undefined;
    const stale = () => disposed || token !== generation;
    try {
      status('loading');
      const url = o.mobile ? entry.mobileSrc : entry.src;
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok) throw new Error(`Model request failed (${response.status})`);
      const bytes = await response.arrayBuffer(); if (stale()) return null;
      const gltf = await o.loader.parseAsync(bytes, url.slice(0, url.lastIndexOf('/') + 1)); incoming = gltf.scene;
      if (stale()) { release(incoming); return null; }
      status('preparing'); incoming.position.y = entry.lift ?? .22; incoming.rotation.y = entry.yaw ?? 0;
      const textures = new Set<THREE.Texture>();
      incoming.traverse(n => {
        const m = n as THREE.Mesh; if (!m.isMesh) return;
        m.userData.exhibit = entry.id; m.receiveShadow = true; m.castShadow = true;
        for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
          shader(mat); for (const v of Object.values(mat)) if (v instanceof THREE.Texture) textures.add(v);
        }
      });
      for (const texture of textures) o.renderer.initTexture(texture);
      const previous = o.renderer.getRenderTarget();
      let compiling: Promise<unknown>;
      try { o.renderer.setRenderTarget(o.target()); compiling = o.renderer.compileAsync(incoming, o.camera, o.scene); }
      finally { o.renderer.setRenderTarget(previous); }
      await compiling;
      if (stale()) { release(incoming); return null; }
      await remove();
      if (stale()) { release(incoming); return null; }
      lift = entry.lift ?? .22;
      const info: ExhibitInfo = {
        id: entry.id, no: entry.no, title: entry.title, kind: { en: 'Archive / ' + (entry.category === 'architecture' ? 'Architecture' : entry.category === 'sculpture' ? 'Sculpture' : entry.category === 'people' ? 'People' : entry.category === 'objects' ? 'Objects' : 'Equipment'), de: 'Archiv / ' + (entry.category === 'architecture' ? 'Architektur' : entry.category === 'sculpture' ? 'Skulptur' : entry.category === 'people' ? 'Menschen' : entry.category === 'objects' ? 'Objekte' : 'Ausstattung') },
        sub: { en: archiveDimensions(entry, false), de: archiveDimensions(entry, true) }, text: entry.description,
        focus: at.clone().add(new THREE.Vector3(0, lift + entry.height / 2, 0)), distance: entry.distance, elevation: entry.elevation,
      };
      current = { root: incoming, entry, info }; station.add(incoming); station.updateMatrixWorld(true); colliders.push(new THREE.Box3().setFromObject(incoming));
      base = buildBase(incoming, lift - .012); station.add(base); incoming = undefined;
      current.root.traverse(n => { if ((n as THREE.Mesh).isMesh) meshes.push(n as THREE.Mesh); });
      progress = 0; state = o.reduced ? 'shown' : 'revealing'; clip.value = o.reduced ? 1e4 : lift - .05;
      o.onReveal?.(); return info;
    } catch (error) {
      if (incoming) release(incoming);
      if (stale() || abort.signal.aborted) return null;
      throw error;
    } finally { if (controller === abort) controller = undefined; }
  }
  return {
    meshes, colliders, show, cancel,
    activeId: () => current?.entry.id ?? null,
    info: (id: string) => current?.entry.id === id ? current.info : undefined,
    inView(position: THREE.Vector3, forward: THREE.Vector3) {
      if (!current) return undefined;
      const v = current.info.focus.clone().sub(position);
      return v.length() < 7 && v.normalize().angleTo(forward) < .5 ? current.info : undefined;
    },
    async clear() { cancel(); await remove(); },
    update(t: number, dt: number) {
      waterTime.value = o.reduced ? 0 : t;
      // The stage lights come up with the work and go down when it leaves; its shadows fade in once it stands.
      const want = current && state !== 'removing' ? 1 : 0;
      lit += (want - lit) * Math.min(1, dt * 2.2); key.intensity = 120 * lit; kicker.intensity = 16 * lit;
      if (base) base.scale.y += ((state === 'removing' ? .001 : 1) - base.scale.y) * Math.min(1, dt * 5);
      if (state === 'shown' && shadowAt < 0) { shadowAt = t; key.shadow.needsUpdate = true; }
      if (state !== 'shown') { shadowAt = -1; key.shadow.intensity = Math.max(0, key.shadow.intensity - dt * 4); }
      else { key.shadow.intensity = Math.min(1, (t - shadowAt) / .9); if (t - shadowAt < 1.2) key.shadow.needsUpdate = true; }
      portal.update(t, state === 'revealing' || state === 'removing', clip.value, Boolean(current));
      if (!current || state === 'shown' || state === 'empty') return;
      progress = Math.min(1, progress + dt / (state === 'removing' ? .65 : 1.7));
      const k = state === 'removing' ? 1 - progress : 1 - (1 - progress) ** 2;
      clip.value = lift - .05 + k * (current.entry.height + .12);
      if (progress >= 1) { if (state === 'removing') erase(); else { state = 'shown'; clip.value = 1e4; } }
    },
    dispose() { disposed = true; cancel(); erase(); portal.dispose(); o.scene.remove(key, key.target, kicker); key.dispose(); kicker.dispose(); baseStone.dispose(); baseGlow.dispose(); },
  };
}
