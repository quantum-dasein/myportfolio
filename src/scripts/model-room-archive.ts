import * as THREE from 'three';
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
    m.onBeforeCompile = s => {
      s.uniforms.uArchiveY = clip;
      if (m.name === 'Pool water') {
        s.uniforms.uArchiveTime = waterTime;
        s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vArchiveXZ;').replace('#include <project_vertex>', '#include <project_vertex>\nvArchiveXZ = (modelMatrix * vec4(transformed, 1.)).xz;');
        s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uArchiveTime; varying vec2 vArchiveXZ;').replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(normal + vec3((sin(dot(vArchiveXZ, vec2(23., 17.)) + uArchiveTime * .8) + .45 * sin(dot(vArchiveXZ, vec2(53., -31.)) - uArchiveTime * 1.1)) * .018, (cos(dot(vArchiveXZ, vec2(-11., 29.)) - uArchiveTime * .6) + .4 * cos(dot(vArchiveXZ, vec2(47., 37.)) + uArchiveTime * .9)) * .018, 0.));');
      }
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vArchiveY;').replace('#include <project_vertex>', '#include <project_vertex>\nvArchiveY = (modelMatrix * vec4(transformed, 1.)).y;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uArchiveY; varying float vArchiveY;').replace('void main() {', 'void main() {\nif(vArchiveY > uArchiveY) discard;').replace('#include <opaque_fragment>', 'float archiveBand = 1. - smoothstep(0., .09, uArchiveY - vArchiveY);\noutgoingLight = mix(outgoingLight, vec3(.14, 2.8, .95), archiveBand * .88);\n#include <opaque_fragment>');
    };
    m.customProgramCacheKey = () => m.name === 'Pool water' ? 'archive-water-v1' : 'archive-scan-v1'; m.needsUpdate = true;
  }
  function cancel() { generation++; controller?.abort(); controller = undefined; }
  function erase() {
    if (current) release(current.root);
    current = undefined; meshes.length = 0; state = 'empty'; colliders.length = 0; clip.value = -1;
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
        m.userData.exhibit = entry.id; m.receiveShadow = true; m.castShadow = false;
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
        id: entry.id, no: entry.no, title: entry.title, kind: { en: 'Archive / ' + (entry.category === 'architecture' ? 'Architecture' : entry.category === 'sculpture' ? 'Sculpture' : 'Equipment'), de: 'Archiv / ' + (entry.category === 'architecture' ? 'Architektur' : entry.category === 'sculpture' ? 'Skulptur' : 'Ausstattung') },
        sub: { en: archiveDimensions(entry, false), de: archiveDimensions(entry, true) }, text: entry.description,
        focus: at.clone().add(new THREE.Vector3(0, lift + entry.height / 2, 0)), distance: entry.distance, elevation: entry.elevation,
      };
      current = { root: incoming, entry, info }; station.add(incoming); station.updateMatrixWorld(true); colliders.push(new THREE.Box3().setFromObject(incoming)); incoming = undefined;
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
      portal.update(t, state === 'revealing' || state === 'removing', clip.value, Boolean(current));
      if (!current || state === 'shown' || state === 'empty') return;
      progress = Math.min(1, progress + dt / (state === 'removing' ? .65 : 1.7));
      const k = state === 'removing' ? 1 - progress : 1 - (1 - progress) ** 2;
      clip.value = lift - .05 + k * (current.entry.height + .12);
      if (progress >= 1) { if (state === 'removing') erase(); else { state = 'shown'; clip.value = 1e4; } }
    },
    dispose() { disposed = true; cancel(); erase(); portal.dispose(); },
  };
}
