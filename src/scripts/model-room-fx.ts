// The Model Room's atmosphere, kept apart from Codex's architecture (model-room-design.ts) and the
// controller (model-room.ts): a polished floor that mirrors the room, shafts of light with dust
// from the suspended ring, a living portal membrane in the rear frame that leads back to the
// archive, ambient occlusion and a finishing grade in the site's key.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';

const floorShader = {
  name: 'ModelRoomFloor',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: { value: 0 } },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix; varying vec4 vUvR; varying vec3 vWorld;
    void main(){ vec4 w = modelMatrix * vec4(position, 1.); vWorld = w.xyz; vUvR = textureMatrix * vec4(position, 1.); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; varying vec4 vUvR; varying vec3 vWorld;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      // Honed dark terrazzo: large slabs, a soft blurred reflection, strongest at grazing angles.
      vec2 q = vWorld.xz; vec2 g = abs(fract(q / 2.4) - .5);
      float seam = smoothstep(.494, .5, max(g.x, g.y));
      float speck = step(.985, h(floor(q * 38.))) * .6 + h(floor(q * 9.)) * .08;
      vec3 base = vec3(.045, .055, .055) * (1. + speck) * (1. - seam * .5);
      vec2 uv = vUvR.xy / vUvR.w; vec3 r = vec3(0.); float tot = 0.;
      for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) { float w = 1. / (1. + float(i * i + j * j)); r += texture2D(tDiffuse, uv + vec2(i, j) * .0024).rgb * w; tot += w; }
      r /= tot;
      vec3 V = normalize(cameraPosition - vWorld);
      float fres = .1 + .7 * pow(1. - max(V.y, 0.), 4.);
      gl_FragColor = vec4(base + r * fres * (1. - seam * .7), 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

const coneVertex = /* glsl */`varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vY = uv.y; gl_Position = projectionMatrix * viewMatrix * w; }`;
const coneFragment = /* glsl */`uniform float uGain, uTime; varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ float edge = pow(abs(dot(normalize(vN), vV)), 2.5); float a = edge * mix(.15, 1., vY) * (.92 + .08 * sin(uTime * .7));
  gl_FragColor = vec4(vec3(1., .86, .66) * a * uGain, 1.); }`;

const portalFragment = /* glsl */`uniform float uTime, uOpen, uNear; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main(){
  vec2 p = vUv - .5; p.x *= .77; float r = length(p), a = atan(p.y, p.x);
  float s = a + r * 5. - uTime * .35; vec2 ring = vec2(cos(s), sin(s));   // seamless round the circle
  float swirl = n2(ring * 2.5 + r * 6. - uTime * .6) * .6 + n2(ring * r * 14. + uTime * .2) * .4;
  float core = exp(-r * r * 9.) * (1.3 + .5 * uNear);
  vec3 col = mix(vec3(.12, .34, .38), vec3(.72, .95, 1.), core) * (.55 + .7 * swirl);
  col += vec3(.9, 1., 1.) * pow(core, 3.) * (.35 + .8 * uNear);
  float edge = smoothstep(.5, .44, max(abs(vUv.x - .5), abs(vUv.y - .5)));
  gl_FragColor = vec4(col * edge * uOpen * .5, 1.);
}`;

export function createRoomFx(o: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; mobile: boolean }) {
  const { scene, camera, renderer, mobile } = o;
  const updates: ((t: number, dt: number) => void)[] = [];
  const disposables: { dispose: () => void }[] = [];

  // Mirror floor (desktop): the whole room doubles in it, softly.
  let floor: Reflector | null = null;
  if (!mobile) {
    const size = renderer.getSize(new THREE.Vector2());
    floor = new Reflector(new THREE.PlaneGeometry(17.9, 23.9), { clipBias: .003, textureWidth: size.x * .5, textureHeight: size.y * .5, shader: floorShader, multisample: 0 });
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -.035, 1);
    scene.add(floor); disposables.push(floor);
  }

  // Shafts of warm light from the suspended ring onto the exhibit, with dust drifting through them.
  const cones: THREE.ShaderMaterial[] = [];
  for (const [x, z] of [[-2.4, -3.6], [0, -3.1], [2.4, -3.6]]) {
    const h = 5.8, geo = new THREE.CylinderGeometry(.22, 1.35, h, 40, 1, true); geo.translate(0, -h / 2, 0);
    const m = new THREE.ShaderMaterial({ uniforms: { uGain: { value: mobile ? .16 : .12 }, uTime: { value: 0 } }, vertexShader: coneVertex, fragmentShader: coneFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(geo, m); cone.position.set(x, 5.8, z); scene.add(cone); cones.push(m); disposables.push(geo, m);
  }
  const N = mobile ? 180 : 420, P = new Float32Array(N * 3), S = new Float32Array(N);
  for (let i = 0; i < N; i++) { P.set([(Math.random() - .5) * 8, Math.random() * 5.6, -3.4 + (Math.random() - .5) * 4.4], i * 3); S[i] = Math.random(); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(P, 3)); dg.setAttribute('aSeed', new THREE.BufferAttribute(S, 1));
  const dm = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `uniform float uTime, uPx; attribute float aSeed; varying float vA;
      void main(){ vec3 p = position; float t = uTime * (.05 + .05 * aSeed);
        p.x += sin(t * 3. + aSeed * 40.) * .4; p.z += cos(t * 2.3 + aSeed * 17.) * .3;
        p.y = mod(position.y - uTime * .04 * (.3 + aSeed), 5.6);   // settling slowly, forever
        vec4 mv = modelViewMatrix * vec4(p, 1.); vA = (.35 + .65 * aSeed) * smoothstep(0., .6, p.y) * smoothstep(5.6, 4.6, p.y);
        gl_PointSize = uPx * (1.2 + 2.2 * aSeed) * 6. / max(.5, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1., .9, .75) * vA * smoothstep(.5, .05, d) * .9, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(dg, dm)); disposables.push(dg, dm);

  // The rear frame holds a living portal: step into it to go back to the archive.
  const pm = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uOpen: { value: 1 }, uNear: { value: 0 } }, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`, fragmentShader: portalFragment, depthWrite: false });
  const membrane = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.9), pm); membrane.position.set(0, 2.16, 11.39); membrane.rotation.y = Math.PI; scene.add(membrane);
  disposables.push(membrane.geometry, pm);
  const portalLight = new THREE.PointLight('#8fe6e0', 5, 9, 1.8); portalLight.position.set(0, 2.2, 10.6); scene.add(portalLight);

  updates.push((t) => {
    for (const m of cones) m.uniforms.uTime.value = t;
    dm.uniforms.uTime.value = t; dm.uniforms.uPx.value = renderer.getPixelRatio();
    const near = THREE.MathUtils.clamp(1 - (11.2 - camera.position.z) / 4, 0, 1) * (Math.abs(camera.position.x) < 2 ? 1 : 0);
    pm.uniforms.uTime.value = t; pm.uniforms.uNear.value += (near - pm.uniforms.uNear.value) * .08;
    portalLight.intensity = 5 * (1 + .12 * Math.sin(t * 1.3) + pm.uniforms.uNear.value);
    if (floor) (floor.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
  });

  // Quality guard: if frames run long, drop the occlusion first, then halve the mirror again.
  let ao: GTAOPass | null = null, mirror = .5, slow = 0, watched = 0;
  updates.push((_t, dt) => {
    if (dt <= 0 || dt > .25 || (!ao?.enabled && mirror < .5)) return;
    watched += dt; slow += dt > 1 / 40 ? dt : 0;
    if (watched < 2.5) return;
    if (slow / watched > .5) {
      if (ao?.enabled) ao.enabled = false;
      else if (floor) { mirror = .3; const s = renderer.getSize(new THREE.Vector2()); resizeMirror(s.x, s.y); }
    }
    watched = slow = 0;
  });
  function resizeMirror(w: number, h: number) { floor?.getRenderTarget().setSize(w * mirror * renderer.getPixelRatio(), h * mirror * renderer.getPixelRatio()); }

  /** Plug ambient occlusion and the finishing grade into the controller's post chain. */
  function extendComposer(composer: EffectComposer, width: number, height: number) {
    const passes = composer.passes;
    if (!mobile) {
      ao = new GTAOPass(scene, camera, width, height);
      ao.updateGtaoMaterial({ radius: .45, distanceExponent: 1.6, thickness: 1.2, scale: 1.1, samples: 8 });
      ao.blendIntensity = .85;
      composer.insertPass(ao, 1);
    }
    const finish = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; vec2 q = vUv - .5;
          c *= 1. - .55 * smoothstep(.35, .95, length(q * vec2(1.05, 1.)));
          c += (h(vUv * 800. + fract(uTime) * 71.) - .5) * .018;
          gl_FragColor = vec4(c, 1.); }`,
    });
    composer.insertPass(finish, passes.length - 1);
    updates.push(t => { finish.uniforms.uTime.value = t; });
  }

  return {
    update(t: number, dt: number) { for (const u of updates) u(t, dt); },
    extendComposer,
    resize: resizeMirror,
    /** Walked into the rear frame. */
    inPortal: (p: THREE.Vector3) => p.z > 10.75 && Math.abs(p.x) < 1.3,
    setOpen(v: number) { pm.uniforms.uOpen.value = v; },
    dispose() { disposables.forEach(d => d.dispose()); },
  };
}
