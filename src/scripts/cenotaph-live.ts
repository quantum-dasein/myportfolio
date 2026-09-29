// The 404, live: Boullée's Cenotaph for Newton rendered in real time. Blender computes the light
// once (sun shaft, fire bowls, the bounce off the stone) into lightmaps; the browser lays those over
// the photo-scanned stone, pierces the vault with twinkling holes, and adds everything that moves:
// the astronaut, fire, dust in the shaft, the constellation of the address, the visitor's star and
// Newton's apple. The visitor can look round and walk the arena.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createAstronaut } from './observatory-astronaut';
import { layout, editScript } from './cenotaph';
import type { CenotaphEvent } from './cenotaph';

type V3 = [number, number, number];
type Meta = { mode: string; groups: Record<string, { scale: number; objects: string[] }>; fig: V3; fires: V3[]; hole: V3; sphere: { c: V3; rin: number } };
type Anchor = { dir: THREE.Vector3; width: number };

/** Blender (Z up) to three (Y up), the same way the glTF exporter turns the scene. */
const b2t = (v: V3 | number[]) => new THREE.Vector3(v[0], v[2], -v[1]);
const ease = (x: number) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const ARENA = 33.2, PODIUM = 11.8;

// ------------------------------------------------------------------ stone
const stoneVertex = /* glsl */`
attribute vec2 lmUv;
varying vec3 vWorld; varying vec3 vNormal; varying vec2 vLm;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.);
  vWorld = w.xyz; vNormal = normalize(mat3(modelMatrix) * normal); vLm = lmUv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const stoneFragment = /* glsl */`
uniform sampler2D tWall, tPave, tLm; uniform float uLmScale, uKind, uTime, uStars, uGain, uDim;
uniform vec3 uHaze;
varying vec3 vWorld; varying vec3 vNormal; varying vec2 vLm;
const float R = 73.8;
float h31(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
vec3 grade(vec3 c){ float l = dot(c, vec3(.2126, .7152, .0722)); return mix(vec3(l), c, .62) * 1.45; }
// Texture lookup that hides the seam where an angle wraps round: use whichever of two
// unwrappings has the smaller footprint at this pixel.
vec3 wrapped(sampler2D t, vec2 a, vec2 b){
  vec2 da = fwidth(a), db = fwidth(b);
  return dot(da, da) < dot(db, db) ? textureGrad(t, a, dFdx(a), dFdy(a)).rgb : textureGrad(t, b, dFdx(b), dFdy(b)).rgb;
}
vec3 holes(vec3 n, float dist){
  vec3 e = vec3(0.);
  for (int L = 0; L < 2; L++){
    float sc = L == 0 ? 95. : 230.;
    vec3 q = n * sc + float(L) * 17.3;
    // Derivatives first, outside any branch: in divergent code the GPU returns garbage.
    float fp = max(length(fwidth(q)) * .6, 1e-4);
    vec3 id = floor(q);
    float cr = h31(id + 1.7), cg = h31(id + 5.3), cb = h31(id + 9.1);
    float thr = L == 0 ? .75 : .83;
    float pick = step(thr, cg);
    vec3 jit = .25 + .5 * vec3(h31(id + 3.1), h31(id + 7.7), h31(id + 1.9));
    float d = length(q - id - jit);
    float r = .035 + .09 * pow(cr, 4.);
    float cov = smoothstep(r + fp, max(r - fp, 0.), d) * min(1., (r * r) / (fp * fp));
    float bright = (.12 + 3. * pow(cb, L == 0 ? 6. : 8.)) * (L == 0 ? 1. : .3);
    float tw = 1. + .38 * sin(uTime * (1.3 + 2. * fract(cb * 7.)) + cr * 40.);
    vec3 tint = mix(vec3(.78, .86, 1.), vec3(1., .86, .66), h31(id + 4.4));
    e += tint * cov * bright * tw * pick;
  }
  return min(e, vec3(2.5)) * smoothstep(-.45, -.12, n.z);
}
void main(){
  vec3 B = vec3(vWorld.x, -vWorld.z, vWorld.y);          // Blender coordinates, for the stone layout
  vec3 N = normalize(vNormal);
  vec3 albedo; vec3 emit = vec3(0.);
  if (uKind < .5) {                                       // the vault: courses follow the sphere
    vec3 P = B - vec3(0., 0., 60.); float L = length(P); float lat = asin(clamp(P.z / L, -1., 1.));
    float lon = atan(P.y, P.x), lon2 = atan(-P.y, -P.x);
    float c = cos(lat) * R;
    albedo = grade(wrapped(tWall, vec2(lon * c, lat * R) / 3., vec2(lon2 * c, lat * R) / 3.)) * vec3(1.12, 1.05, .93);
    emit = holes(P / L, length(vWorld - cameraPosition)) * uStars;
  } else if (uKind < 1.5) {                               // stone on the floor and the steps
    if (abs(N.y) > .7) {
      vec2 uv = B.xy / 3.3;
      albedo = grade(texture(tPave, uv).rgb) * vec3(.87, .82, .72);
    } else {
      float r = length(B.xy); float a = atan(B.y, B.x), a2 = atan(-B.y, -B.x);
      albedo = grade(wrapped(tWall, vec2(a * r, B.z) / 3., vec2(a2 * r, B.z) / 3.)) * vec3(1.05, .99, .88);
    }
    albedo *= mix(.55, 1., smoothstep(0., 3.5, B.z));    // grime at the foot of every wall
  } else if (uKind < 2.5) {
    albedo = vec3(.07, .066, .062);                       // basalt sarcophagus
  } else {
    albedo = vec3(.2, .13, .07) * 1.4;                    // bronze bowls
  }
  vec3 lm = texture(tLm, vLm).rgb; lm = lm * lm * uLmScale;
  vec3 col = albedo * lm * uGain + emit;
  float d = length(vWorld - cameraPosition);
  col = mix(col, uHaze, (1. - exp(-d * .0035)) * .45);
  gl_FragColor = vec4(col * (1. - uDim), 1.);
}`;

// ------------------------------------------------------------------ shaft, fire, dust
const shaftVertex = /* glsl */`
varying vec3 vN; varying vec3 vView; varying float vT;
void main(){ vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vView = normalize(cameraPosition - w.xyz); vT = uv.y; gl_Position = projectionMatrix * viewMatrix * w; }`;
const shaftFragment = /* glsl */`
uniform float uTime, uGain; varying vec3 vN; varying vec3 vView; varying float vT;
void main(){
  float edge = pow(abs(dot(normalize(vN), vView)), 2.2);
  float breath = 1. + .08 * sin(uTime * .52 + .5);
  float fall = mix(.35, 1., vT);
  gl_FragColor = vec4(vec3(1., .88, .7) * edge * fall * breath * uGain, 1.);
}`;
const flameFragment = /* glsl */`
uniform float uTime, uSeed; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main(){
  vec2 p = vUv * 2. - 1.; p.y = vUv.y;
  float t = uTime * 2.2 + uSeed * 10.;
  float wob = (n2(vec2(p.y * 3. - t, uSeed)) - .5) * .35 * p.y;
  float w = .42 * (1. - p.y) * (.55 + .45 * sin(p.y * 3.1416));
  float body = smoothstep(w, w * .35, abs(p.x - wob)) * smoothstep(1., .55, p.y) * smoothstep(0., .08, p.y);
  float lick = n2(vec2(p.x * 4., p.y * 5. - t * 1.6)) * .5 + .5;
  float a = body * mix(.55, 1.15, lick);
  vec3 c = mix(vec3(1., .42, .12), vec3(1., .9, .62), smoothstep(.2, .9, body * (1. - p.y)));
  gl_FragColor = vec4(c * a * 5., 1.);
}`;
const flameVertex = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const dustVertex = /* glsl */`
uniform float uTime, uPx; uniform vec3 uA, uDir; attribute float aSeed; varying float vLit;
void main(){
  vec3 p = position;
  p += vec3(sin(uTime * .21 + aSeed * 6.3), sin(uTime * .17 + aSeed * 9.1) * .6, cos(uTime * .19 + aSeed * 4.7)) * (.25 + .3 * fract(aSeed * 13.));
  vec3 rel = p - uA; float off = length(cross(rel, uDir));
  vLit = smoothstep(1.35, .35, off) * (.6 + .8 * fract(aSeed * 31.));
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_PointSize = uPx * 2.2 / max(.4, -mv.z) * 6.;
  gl_Position = projectionMatrix * mv;
}`;
const dustFragment = /* glsl */`
varying float vLit; void main(){ vec2 c = gl_PointCoord - .5; float d = length(c); if (vLit < .01) discard;
  gl_FragColor = vec4(vec3(1., .9, .76) * vLit * smoothstep(.5, .05, d) * 2.5, 1.); }`;

// ------------------------------------------------------------------ constellation
const starVertex = /* glsl */`
attribute float aSize; attribute vec3 aColor; attribute float aAlpha; uniform float uPx; varying vec3 vColor; varying float vAlpha;
void main(){ vColor = aColor; vAlpha = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.);
  gl_PointSize = aSize * uPx; gl_Position = projectionMatrix * mv; }`;
const starFragment = /* glsl */`
varying vec3 vColor; varying float vAlpha;
void main(){ vec2 p = gl_PointCoord - .5; float d = length(p) * 2.;
  float core = smoothstep(.22, .12, d), halo = exp(-d * d * 7.) * .35;
  float glint = (smoothstep(.06, 0., abs(p.x)) + smoothstep(.06, 0., abs(p.y))) * smoothstep(1., .2, d) * .35;
  float a = (core + halo + glint) * vAlpha; if (a < .004) discard;
  gl_FragColor = vec4(vColor * a * 3., 1.); }`;
const lineFragment = /* glsl */`varying vec3 vColor; varying float vAlpha; void main(){ gl_FragColor = vec4(vColor * vAlpha * 1.4, 1.); }`;
const lineVertex = /* glsl */`attribute vec3 aColor; attribute float aAlpha; varying vec3 vColor; varying float vAlpha;
void main(){ vColor = aColor; vAlpha = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

type Star = { a: [number, number] | null; b: [number, number] | null; kind: 'keep' | 'out' | 'in'; order: number; mag: number; tw: number };
class Word {
  stars: Star[] = []; segs: [number, number, Star['kind']][] = []; width = 1;
  C = new THREE.Vector3(); r = new THREE.Vector3(); u = new THREE.Vector3(); s = 1;
  points!: THREE.Points; lines!: THREE.LineSegments; screen: [number, number, number, number] | null = null;
  constructor(public from: string, public to: string, maxLine: number) {
    const A = layout(from, maxLine), B = layout(to, maxLine);
    this.width = Math.max(A.width, B.width);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const put = (L: typeof A.letters[number], other: typeof A.letters[number] | null, kind: Star['kind'], order: number, side: 'a' | 'b') => {
      const base = this.stars.length;
      L.g.pts.forEach((p, k) => {
        const here: [number, number] = [L.x + p[0], L.y + p[1]];
        const there: [number, number] | null = other ? [other.x + other.g.pts[k][0], other.y + other.g.pts[k][1]] : null;
        this.stars.push({ a: side === 'a' ? here : there, b: side === 'b' ? here : there, kind, order: order + k * .02, mag: .75 + rnd() * .55, tw: rnd() * 6.28 });
      });
      L.g.segs.forEach(([p, q]) => this.segs.push([base + p, base + q, kind]));
    };
    editScript(from, to).forEach((op, n) => {
      if (op.op === 'keep') put(A.letters[op.i!], B.letters[op.j!], 'keep', n, 'a');
      if (op.op === 'sub' || op.op === 'del') put(A.letters[op.i!], null, 'out', n, 'a');
      if (op.op === 'sub' || op.op === 'ins') put(B.letters[op.j!], null, 'in', n, 'b');
    });
  }
}

export function mountCenotaphLive(o: {
  host: HTMLElement; base: string; mode: 'day' | 'night'; requested: string; target: string; reduced: boolean; still?: boolean;
  portrait: boolean;
  sections?: () => { text: string; href: string; label: string }[];
  onReveal: () => void; onRepaired: () => void; onEvent?: (e: CenotaphEvent, d?: unknown) => void; onOpen?: (href: string) => void;
  onReady?: () => void;
}) {
  const mobile = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = o.mode === 'day' ? .9 : 1;
  renderer.domElement.className = 'live-canvas';
  o.host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(o.mode === 'day' ? '#1a1612' : '#07080b');
  const camera = new THREE.PerspectiveCamera(o.portrait ? 78 : 62, 1, .1, 600);
  const clock = new THREE.Clock();
  const emit = (e: CenotaphEvent, d?: unknown) => o.onEvent?.(e, d);

  // Post: bloom on the holes and the flames, a vignette and grain in the site's key.
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .55, .5, .9);
  composer.addPass(bloom);
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: mobile ? .025 : .04 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; vec2 q = vUv - .5;
        // The films' grade: deeper shadows, less colour.
        float l = dot(c, vec3(.2126, .7152, .0722)); c = mix(vec3(l), c, .84); c = max(vec3(0.), (c - .18) * 1.14 + .18) * .92;
        c *= 1. - .75 * smoothstep(.28, .85, length(q * vec2(1.1, 1.)));
        c *= 1. + (h(vUv * 900. + fract(uTime) * 91.) - .5) * uGrain * 4.;
        gl_FragColor = vec4(c, 1.); }`,
  });
  composer.addPass(finish);
  composer.addPass(new OutputPass());

  let meta: Meta | null = null;
  const stoneMaterials: THREE.ShaderMaterial[] = [];
  const dynamic: { update: (t: number, dt: number) => void }[] = [];
  let fig = new THREE.Vector3(3.4, 0, 23.5);

  // ---- Camera: glide in from the tunnel, then the visitor looks and walks.
  const START = new THREE.Vector3(0, 1.75, 31);
  const intro = { from: new THREE.Vector3(0, 1.75, 62), t0: 0, len: o.reduced || o.still ? 0 : 6.5 };
  // On a phone the view turns a little right, so the astronaut stands in the narrow frame.
  const YAW0 = o.portrait ? -.3 : 0;
  let yaw = YAW0, pitch = .3, tYaw = YAW0, tPitch = .3;
  const pos = intro.len ? intro.from.clone() : START.clone();
  const goal = START.clone();
  const keys = new Set<string>();
  let tourUntil = 0, introDone = false;

  const loadTex = (url: string, srgb: boolean) => new Promise<THREE.Texture>((res, rej) => new THREE.TextureLoader().load(url, t => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); res(t);
  }, undefined, rej));

  async function build() {
    meta = await (await fetch(`${o.base}/live-${o.mode}.json`)).json() as Meta;
    const [wall, pave, lmVault, lmFloor] = await Promise.all([
      loadTex(`${o.base}/stone-wall.jpg`, true), loadTex(`${o.base}/stone-pave.jpg`, true),
      loadTex(`${o.base}/lm-${o.mode}-vault.jpg`, false), loadTex(`${o.base}/lm-${o.mode}-floor.jpg`, false),
    ]);
    for (const t of [lmVault, lmFloor]) { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.flipY = false; t.needsUpdate = true; }
    const draco = new DRACOLoader(); draco.setDecoderPath('/draco/');
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(`${o.base}/interior-${o.mode}.glb`);
    const haze = new THREE.Color(o.mode === 'day' ? '#2a241e' : '#0c0d12');
    gltf.scene.traverse(obj => {
      const mesh = obj as THREE.Mesh; if (!mesh.isMesh) return;
      const g = mesh.geometry;
      g.setAttribute('lmUv', g.attributes.uv1 ?? g.attributes.uv);
      const name = `${mesh.name} ${mesh.parent?.name ?? ''}`;
      const vault = /vault|^Sphere/.test(name);
      const kind = vault ? 0 : /Sarcophagus|Lid/.test(name) ? 2 : /Cone|Torus/.test(name) ? 3 : 1;
      const group = meta!.groups[vault ? 'vault' : 'floor'];
      const m = new THREE.ShaderMaterial({
        uniforms: {
          tWall: { value: wall }, tPave: { value: pave }, tLm: { value: vault ? lmVault : lmFloor }, uLmScale: { value: group.scale },
          uKind: { value: kind }, uTime: { value: 0 }, uStars: { value: o.mode === 'day' ? 14 : 30 }, uGain: { value: 1 }, uDim: { value: 0 },
          uHaze: { value: haze },
        },
        vertexShader: stoneVertex, fragmentShader: stoneFragment, side: vault ? THREE.BackSide : THREE.FrontSide,
      });
      if (vault) m.side = THREE.DoubleSide;
      mesh.material = m; stoneMaterials.push(m);
    });
    scene.add(gltf.scene);
    // By day Boullée's lamp hangs over the tomb: brass rings round a glowing core. Its shadows are in the bake.
    if (o.mode === 'day') {
      const props = await new GLTFLoader().setDRACOLoader(draco).loadAsync(`${o.base}/props-day.glb`).catch(() => null);
      if (props) {
        props.scene.traverse(obj => { const m = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && 'emissiveIntensity' in m && m.emissive.getHex()) m.emissiveIntensity = 60; });
        scene.add(props.scene);
        const lamp = new THREE.PointLight('#ffd6a4', 2600, 70, 1.4); lamp.position.set(0, 34, 0); scene.add(lamp);
      }
    }
    fig = b2t(meta.fig);
    buildTunnel(); buildShaft(); buildFires(); await buildAstronaut(); buildWords();
    o.onReady?.();
  }

  // The tunnel behind the visitor: dark stone lit by sconces, so turning round is not a void.
  function buildTunnel() {
    const shape = new THREE.Shape();
    shape.moveTo(-3.5, 0); shape.lineTo(3.5, 0); shape.lineTo(3.5, 6);
    shape.absarc(0, 6, 3.5, 0, Math.PI, false); shape.lineTo(-3.5, 0);
    // It starts inside the shell: nearer in, the trench between the steps is already in the bake.
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 80, bevelEnabled: false, curveSegments: 24 });
    geo.translate(0, 0, 43.2);
    const m = new THREE.ShaderMaterial({
      uniforms: { tWall: { value: stoneMaterials[0]?.uniforms.tWall.value }, uTime: { value: 0 } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform sampler2D tWall; uniform float uTime; varying vec3 vW;
        void main(){ vec2 uv = abs(vW.x) > 3.3 ? vW.zy / 3. : vW.zx / 3.;
          vec3 a = texture2D(tWall, uv).rgb;
          float z = vW.z - 36.; float s = mod(z, 11.) - 5.5; float lamp = exp(-s * s * .05) * exp(-pow(vW.y - 4.4, 2.) * .08);
          float fl = .85 + .15 * sin(uTime * 7. + floor(z / 11.) * 3.1);
          vec3 c = a * (vec3(1., .6, .3) * lamp * 1.8 * fl + vec3(.04, .045, .06)) * exp(-max(0., vW.z - 60.) * .03);
          gl_FragColor = vec4(c, 1.); }`,
      side: THREE.BackSide,
    });
    // Group 0 holds the end caps: the near one would wall off the vault.
    const tunnel = new THREE.Mesh(geo, [new THREE.MeshBasicMaterial({ visible: false }), m]); scene.add(tunnel);
    dynamic.push({ update: t => { m.uniforms.uTime.value = t; } });
  }

  function buildShaft() {
    const hole = b2t(meta!.hole), foot = fig.clone();
    const len = hole.distanceTo(foot);
    const geo = new THREE.CylinderGeometry(.3, 1.15, len, 48, 1, true);
    geo.translate(0, -len / 2, 0);
    const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uGain: { value: o.mode === 'day' ? .32 : .42 } }, vertexShader: shaftVertex, fragmentShader: shaftFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const shaft = new THREE.Mesh(geo, m);
    shaft.position.copy(hole); shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), foot.clone().sub(hole).normalize());
    scene.add(shaft);
    // Dust drifting through the light.
    const dir = hole.clone().sub(foot).normalize(), A = foot.clone().add(new THREE.Vector3(0, 1, 0));
    const n = mobile ? 90 : 160, P = new Float32Array(n * 3), S = new Float32Array(n);
    const side = new THREE.Vector3(1, 0, 0).cross(dir).normalize(), side2 = dir.clone().cross(side).normalize();
    for (let i = 0; i < n; i++) {
      const s = Math.pow(Math.random(), 1.6) * 16, a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 1.3;
      const p = A.clone().add(dir.clone().multiplyScalar(s)).add(side.clone().multiplyScalar(Math.cos(a) * r)).add(side2.clone().multiplyScalar(Math.sin(a) * r));
      P.set([p.x, p.y, p.z], i * 3); S[i] = Math.random();
    }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(P, 3)); dg.setAttribute('aSeed', new THREE.BufferAttribute(S, 1));
    const dm = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uA: { value: A }, uDir: { value: dir } }, vertexShader: dustVertex, fragmentShader: dustFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    scene.add(new THREE.Points(dg, dm));
    // The light that falls on the astronaut; the stone already has it baked in.
    const spot = new THREE.SpotLight('#ffe6c4', 900, len + 5, .045, .5, 1.2);
    spot.position.copy(hole); spot.target.position.copy(foot); scene.add(spot, spot.target);
    dynamic.push({ update: t => { m.uniforms.uTime.value = t; dm.uniforms.uTime.value = t; dm.uniforms.uPx.value = renderer.getPixelRatio(); spot.intensity = 900 * (1 + .08 * Math.sin(t * .52 + .5)); } });
  }

  function buildFires() {
    const geo = new THREE.PlaneGeometry(1, 1.6); geo.translate(0, .8, 0);
    meta!.fires.forEach((f, i) => {
      const at = b2t(f);
      const big = at.length() < 30 || at.distanceTo(new THREE.Vector3(0, at.y, 0)) < 20;
      const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSeed: { value: i * .37 } }, vertexShader: flameVertex, fragmentShader: flameFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const flame = new THREE.Mesh(geo, m); flame.position.copy(at).add(new THREE.Vector3(0, -.5 * (big ? 1.2 : .5), 0)); flame.scale.setScalar(big ? 1.35 : .5);
      scene.add(flame);
      dynamic.push({ update: t => { m.uniforms.uTime.value = t; flame.quaternion.copy(camera.quaternion); } });
      if (big) {
        const light = new THREE.PointLight('#ff8a3c', 30, 22, 1.6); light.position.copy(at); scene.add(light);
        dynamic.push({ update: t => { light.intensity = 30 * (1 + .16 * Math.sin(t * 9 + i) + .08 * Math.sin(t * 23 + i * 3)); } });
      }
    });
    scene.add(new THREE.HemisphereLight(o.mode === 'day' ? '#d8cbb4' : '#5b6a86', '#1a120b', o.mode === 'day' ? 1.4 : .9));
  }

  // ---- The astronaut: the Observatory suit, looking up and pointing as the address repairs.
  const astro = createAstronaut();
  const bones: Record<string, THREE.Object3D> = {};
  let pointing = 0, lookUp = 0;
  async function buildAstronaut() {
    astro.root.position.copy(fig);
    astro.root.rotation.y = Math.PI;             // back to the entrance, facing into the vault
    scene.add(astro.root);
    const env = new THREE.PMREMGenerator(renderer);
    const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
    scene.environment = env.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .25;
    await astro.load().catch(() => {});
    // The Observatory scales him for its own hall; here he is a person, 1.85 m tall.
    astro.root.updateMatrixWorld(true);
    const hb = new THREE.Box3().setFromObject(astro.root); const hNow = hb.max.y - hb.min.y;
    if (hNow > .5) astro.root.scale.multiplyScalar(1.85 / hNow);
    astro.root.traverse(b => { const n = b.name.replace(/^mixamorig[:_]?/, ''); if (/^(RightArm|RightForeArm|Spine1)$/.test(n)) bones[n] = b; });
    // Contact shadow: he is not in the bake.
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62); grad.addColorStop(0, 'rgba(0,0,0,.8)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.copy(fig).add(new THREE.Vector3(.25, .02, -.35)); scene.add(shadow);
    const q = new THREE.Quaternion(), ax = new THREE.Vector3();
    let phase = 0;
    dynamic.push({ update: (t, dt) => {
      phase += dt;
      astro.animate(phase, 0, 0, dt, 0, { pitch: -.95 * lookUp, yaw: .25 * lookUp });
      if (pointing > .001 && bones.RightArm) {
        q.setFromAxisAngle(ax.set(0, 0, 1), -2.35 * pointing); bones.RightArm.quaternion.multiply(q);
        q.setFromAxisAngle(ax.set(0, 1, 0), .55 * pointing); bones.RightArm.quaternion.multiply(q);
        q.setFromAxisAngle(ax.set(0, 0, 1), .25 * pointing); bones.RightForeArm.quaternion.multiply(q);
      }
    } });
  }

  // ---- The constellations on the vault.
  const centre = new THREE.Vector3(0, 60, 0), RIN = 73.5;
  const typed = [...o.requested].slice(0, 40).join('');
  const main = new Word(typed, o.still ? typed : o.target, o.portrait ? 11 : 22);
  let extras: { word: Word; href: string; label: string; el: HTMLElement }[] = [];
  const wordGroup = new THREE.Group(); scene.add(wordGroup);
  const shadeMats: THREE.ShaderMaterial[] = [];
  function vaultHit(from: THREE.Vector3, dir: THREE.Vector3) {
    const oc = from.clone().sub(centre), b = oc.dot(dir), c = oc.dot(oc) - RIN * RIN;
    return from.clone().add(dir.clone().multiplyScalar(-b + Math.sqrt(b * b - c)));
  }
  function place(w: Word, at: Anchor) {
    w.C = vaultHit(START, at.dir.clone().normalize());
    const n = w.C.clone().sub(centre).normalize();
    // Level baseline as seen from the entrance.
    const toC = w.C.clone().sub(START).normalize();
    const right = new THREE.Vector3().crossVectors(toC, new THREE.Vector3(0, 1, 0)).normalize();
    w.r = right.sub(n.clone().multiplyScalar(right.dot(n))).normalize();
    w.u = new THREE.Vector3().crossVectors(w.r, n).normalize(); if (w.u.y < 0) w.u.negate();
    const dist = w.C.distanceTo(START);
    w.s = dist * Math.tan(THREE.MathUtils.degToRad(at.width) / 2) * 2 / w.width;
  }
  function onVault(w: Word, x: number, y: number) {
    const p = w.C.clone().add(w.r.clone().multiplyScalar(x * w.s)).add(w.u.clone().multiplyScalar(y * w.s * 1.25));
    return centre.clone().add(p.sub(centre).normalize().multiplyScalar(RIN - .2));
  }
  function meshes(w: Word) {
    const n = w.stars.length, pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    pg.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
    pg.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    pg.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
    const pm = new THREE.ShaderMaterial({ uniforms: { uPx: { value: 1 } }, vertexShader: starVertex, fragmentShader: starFragment, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    w.points = new THREE.Points(pg, pm); w.points.frustumCulled = false; w.points.renderOrder = 5;
    // By day the vault is lit stone: a dark soft disc under every star keeps the words legible.
    if (o.mode === 'day') {
      const sm = new THREE.ShaderMaterial({ uniforms: { uPx: { value: 1 } }, vertexShader: starVertex, transparent: true, depthWrite: false, depthTest: false,
        fragmentShader: 'varying vec3 vColor; varying float vAlpha; void main(){ float d = length(gl_PointCoord - .5) * 2.; gl_FragColor = vec4(vec3(.05, .03, .015), smoothstep(1., .1, d) * .55 * vAlpha); }' });
      const shade = new THREE.Points(pg, sm); shade.frustumCulled = false; shade.renderOrder = 3; shade.scale.setScalar(1); wordGroup.add(shade);
      shadeMats.push(sm);
    }
    const m = w.segs.length, lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m * 6), 3));
    lg.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(m * 6), 3));
    lg.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(m * 2), 1));
    const lm = new THREE.ShaderMaterial({ vertexShader: lineVertex, fragmentShader: lineFragment, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    w.lines = new THREE.LineSegments(lg, lm); w.lines.frustumCulled = false; w.lines.renderOrder = 4;
    wordGroup.add(w.lines, w.points);
  }
  const labels = document.createElement('div'); labels.className = 'live-labels'; o.host.append(labels);
  function buildWords() {
    const deg = THREE.MathUtils.degToRad;
    const dir = (yawDeg: number, pitchDeg: number) => new THREE.Vector3(Math.sin(deg(yawDeg)) * Math.cos(deg(pitchDeg)), Math.sin(deg(pitchDeg)), -Math.cos(deg(yawDeg)) * Math.cos(deg(pitchDeg)));
    place(main, { dir: o.portrait ? dir(15, 26) : dir(24, 27), width: o.portrait ? 36 : 34 });
    meshes(main);
    const secs = o.sections?.() ?? [];
    // Round the vault, to be found by looking about.
    const spots = [dir(-68, 26), dir(72, 22), dir(-112, 30)];
    extras = secs.slice(0, spots.length).map((sec, i) => {
      const word = new Word(sec.text, sec.text, 30); place(word, { dir: spots[i], width: 13 }); meshes(word);
      const el = document.createElement('a'); el.href = sec.href; el.className = 'live-label'; el.textContent = sec.label; labels.append(el);
      el.addEventListener('click', e => { e.preventDefault(); emit('open', sec.href); o.onOpen?.(sec.href); });
      return { word, ...sec, el };
    });
  }

  const GOLD = new THREE.Color(1, .86, .66), EMBER = new THREE.Color(1, .41, .25), COOL = new THREE.Color(.69, .84, 1), WHITE = new THREE.Color(1, .98, .94);
  const tmpC = new THREE.Color(), v = new THREE.Vector3();
  let revealAt = Infinity, repairAt = Infinity, repairedAt = Infinity, repaired = false, revealed = false, lit = 0;
  function drawWord(w: Word, t: number, st: { born: (s: Star) => number; out: number; inn: number; slide: number; diagnose: number; fresh: number; fade: number; small?: boolean }) {
    const P = w.points.geometry.attributes.position as THREE.BufferAttribute, Sz = w.points.geometry.attributes.aSize as THREE.BufferAttribute;
    const Cl = w.points.geometry.attributes.aColor as THREE.BufferAttribute, Al = w.points.geometry.attributes.aAlpha as THREE.BufferAttribute;
    const pts: THREE.Vector3[] = [], alpha: number[] = [];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    w.stars.forEach((s, i) => {
      const a = (s.kind === 'in' ? st.inn : st.born(s) * (s.kind === 'out' ? 1 - st.out : 1)) * st.fade;
      const from = s.a ?? s.b!, to = s.b ?? s.a!, k = s.kind === 'keep' ? st.slide : 0;
      const p = onVault(w, from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k);
      pts.push(p); alpha.push(a);
      P.setXYZ(i, p.x, p.y, p.z);
      const wrong = s.kind === 'out' ? st.diagnose : 0, fresh = s.kind === 'in' ? st.fresh : 0;
      tmpC.copy(WHITE).lerp(EMBER, wrong * .8).lerp(COOL, fresh * .7);
      Cl.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
      Sz.setX(i, (st.small ? 9 : 13) * s.mag * (1 + .3 * fresh) * (.88 + .12 * Math.sin(t * 2.1 + s.tw)));
      Al.setX(i, a);
      if (a > .05) { v.copy(p).project(camera); if (v.z < 1) { x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } }
    });
    w.screen = isFinite(x0) ? [x0, y0, x1, y1] : null;
    const LP = w.lines.geometry.attributes.position as THREE.BufferAttribute, LC = w.lines.geometry.attributes.aColor as THREE.BufferAttribute, LA = w.lines.geometry.attributes.aAlpha as THREE.BufferAttribute;
    w.segs.forEach(([p, q, kind], i) => {
      const A = pts[p], B = pts[q], a = Math.min(alpha[p], alpha[q]);
      const gapA = A.clone().lerp(B, .22), gapB = B.clone().lerp(A, .22);
      LP.setXYZ(i * 2, gapA.x, gapA.y, gapA.z); LP.setXYZ(i * 2 + 1, gapB.x, gapB.y, gapB.z);
      const wrong = kind === 'out' ? st.diagnose : 0, fresh = kind === 'in' ? st.fresh : 0;
      tmpC.copy(GOLD).lerp(EMBER, wrong).lerp(COOL, fresh);
      LC.setXYZ(i * 2, tmpC.r, tmpC.g, tmpC.b); LC.setXYZ(i * 2 + 1, tmpC.r, tmpC.g, tmpC.b);
      const aa = a * (st.small ? .5 : .75);
      LA.setX(i * 2, aa); LA.setX(i * 2 + 1, aa);
    });
    for (const at of [P, Sz, Cl, Al, LP, LC, LA]) at.needsUpdate = true;
    (w.points.material as THREE.ShaderMaterial).uniforms.uPx.value = renderer.getPixelRatio();
    for (const m of shadeMats) m.uniforms.uPx.value = renderer.getPixelRatio() * 1.6;
  }

  // ---- The visitor's star, and Newton's apple.
  let visitorN: number | null = null;
  const visitorEl = document.createElement('span'); visitorEl.className = 'live-visitor'; labels.append(visitorEl);
  const visitorPos = vaultHit(START, new THREE.Vector3(-.28, .55, -1).normalize());
  const visitorStar = (() => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([visitorPos.x, visitorPos.y, visitorPos.z]), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array([34]), 1)); g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array([.9, .95, 1]), 3)); g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array([0]), 1));
    const p = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uPx: { value: 1 } }, vertexShader: starVertex, fragmentShader: starFragment, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    p.frustumCulled = false; scene.add(p); return p;
  })();
  type Apple = { m: THREE.Object3D; v: THREE.Vector3; hits: number; rest: boolean; spin: THREE.Vector3 };
  const apples: Apple[] = [];
  const appleGeo = new THREE.SphereGeometry(.14, 24, 16); appleGeo.scale(1, .92, 1);
  const appleMat = new THREE.MeshStandardMaterial({ color: '#b3231a', roughness: .35 });
  function dropApple() {
    const g = new THREE.Group(); g.add(new THREE.Mesh(appleGeo, appleMat));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.008, .012, .09), new THREE.MeshStandardMaterial({ color: '#4a2c14' })); stem.position.y = .15; g.add(stem);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshStandardMaterial({ color: '#4f9a3c' })); leaf.scale.set(1, .2, .45); leaf.position.set(.05, .17, 0); g.add(leaf);
    g.position.copy(fig).add(new THREE.Vector3(.05, 22, -.04)); scene.add(g);
    apples.push({ m: g, v: new THREE.Vector3(), hits: 0, rest: false, spin: new THREE.Vector3() });
    if (apples.length > 8) scene.remove(apples.shift()!.m);
  }
  function stepApples(dt: number) {
    const helmet = fig.clone().add(new THREE.Vector3(0, 1.72, 0));
    for (const a of apples) {
      if (a.rest) continue;
      a.v.y -= 9.81 * dt; a.m.position.addScaledVector(a.v, dt);
      const d = a.m.position.clone().sub(helmet), dist = d.length();
      if (dist < .38 && a.v.dot(d) < 0) {
        const n = d.divideScalar(dist); a.v.addScaledVector(n, -1.4 * a.v.dot(n)).add(new THREE.Vector3(.45, 0, .2));
        a.m.position.copy(helmet).addScaledVector(n, .38); a.hits++; a.spin.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
        emit(a.hits === 1 ? 'apple-hit' : 'apple-bounce');
      }
      if (a.m.position.y < .14) {
        a.m.position.y = .14;
        if (a.v.y < -1.2) { a.v.y *= -.38; a.v.x *= .7; a.v.z *= .7; emit('apple-bounce'); }
        else { a.v.y = 0; a.v.multiplyScalar(Math.pow(.25, dt)); if (a.v.length() < .03) a.rest = true; }
        a.spin.set(a.v.z / .14, 0, -a.v.x / .14);
      }
      a.m.rotation.x += a.spin.x * dt; a.m.rotation.y += a.spin.y * dt; a.m.rotation.z += a.spin.z * dt;
    }
  }

  // ---- Input: look (drag, mouse, tilt), walk (keys, wheel, tap), click the astronaut or a page.
  let dragging = false, lastX = 0, lastY = 0, moved = 0;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; moved = 0; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    const k = (mobile ? .006 : .0035);
    tYaw -= dx * k; tPitch = THREE.MathUtils.clamp(tPitch + dy * k, -.5, 1.25); tourUntil = clock.elapsedTime + 20;
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  el.addEventListener('pointerup', e => {
    dragging = false;
    if (moved > 8) return;
    const r = el.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const box = new THREE.Box3().setFromObject(astro.root);
    if (ray.ray.intersectsBox(box)) { dropApple(); return; }
    for (const ex of extras) { const b = ex.word.screen; if (b && ndc.x > b[0] - .03 && ndc.x < b[2] + .03 && ndc.y > b[1] - .05 && ndc.y < b[3] + .05) { emit('open', ex.href); o.onOpen?.(ex.href); return; } }
    const hit = ray.ray.intersectPlane(floor, new THREE.Vector3());
    if (hit && hit.distanceTo(pos) < 40) { goal.set(hit.x, 1.75, hit.z); tourUntil = clock.elapsedTime + 20; }
  });
  const onKey = (e: KeyboardEvent, down: boolean) => { if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { down ? keys.add(e.code) : keys.delete(e.code); if (down) tourUntil = clock.elapsedTime + 20; } };
  const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false);
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  let tiltYaw = 0, tiltPitch = 0;
  const tilt = (e: DeviceOrientationEvent) => { if (e.gamma == null || e.beta == null) return; tiltYaw = -THREE.MathUtils.degToRad(e.gamma) * .5; tiltPitch = THREE.MathUtils.degToRad(e.beta - 55) * .4; };
  if (mobile) addEventListener('deviceorientation', tilt);

  function keepInside(p: THREE.Vector3) {
    const r = Math.hypot(p.x, p.z);
    const tunnel = Math.abs(p.x) < 2.6 && p.z > 30;
    if (!tunnel && r > ARENA) p.multiplyScalar(ARENA / r).setY(1.75);
    if (r < PODIUM) { p.x *= PODIUM / r; p.z *= PODIUM / r; }
    if (p.z > 60) p.z = 60;
    const toFig = new THREE.Vector2(p.x - fig.x, p.z - fig.z); if (toFig.length() < .9) { toFig.setLength(.9); p.x = fig.x + toFig.x; p.z = fig.z + toFig.y; }
  }

  // ---- Resize and quality.
  let dpr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5);
  function resize() {
    const w = o.host.clientWidth, h = o.host.clientHeight;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr); composer.setSize(w, h);
    bloom.resolution.set(w * dpr / 2, h * dpr / 2);
    camera.aspect = w / h; camera.fov = w < h ? 78 : 62; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(o.host); resize();
  let frames = 0, slow = 0, lastCheck = performance.now() + 5000;   // no judging while it loads

  // ---- Frame.
  let raf = 0, dim = 0, running = true;
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
    // Intro glide, then walking.
    const ti = intro.len ? Math.min(1, t / intro.len) : 1;
    if (ti < 1) { pos.lerpVectors(intro.from, START, ease(ti)); tPitch = .08 + .22 * ease(ti * 1.2 - .2); }
    else {
      if (!introDone) { introDone = true; tPitch = .3; tYaw = YAW0; }
      const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), rgt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const sp = 5 * dt;
      if (keys.has('KeyW') || keys.has('ArrowUp')) goal.addScaledVector(f, sp);
      if (keys.has('KeyS') || keys.has('ArrowDown')) goal.addScaledVector(f, -sp);
      if (keys.has('KeyA')) goal.addScaledVector(rgt, -sp);
      if (keys.has('KeyD')) goal.addScaledVector(rgt, sp);
      if (keys.has('ArrowLeft')) tYaw += 1.4 * dt;
      if (keys.has('ArrowRight')) tYaw -= 1.4 * dt;
      keepInside(goal); pos.lerp(goal, 1 - Math.pow(.02, dt)); keepInside(pos);
      // Left alone, the gaze drifts slowly across the vault.
      if (t > tourUntil && !dragging) tYaw += (YAW0 + .1 * Math.sin(t * .07) - tYaw) * (1 - Math.pow(.7, dt));
    }
    yaw += (tYaw + tiltYaw - yaw) * (1 - Math.pow(.004, dt));
    pitch += (tPitch + tiltPitch - pitch) * (1 - Math.pow(.004, dt));
    camera.position.copy(pos).add(new THREE.Vector3(0, Math.sin(t * 1.1) * .012, 0));
    camera.rotation.set(0, 0, 0); camera.rotateY(yaw); camera.rotateX(pitch);
    for (const m of stoneMaterials) { m.uniforms.uTime.value = t; m.uniforms.uDim.value = dim; }
    for (const d of dynamic) d.update(t, dt);
    finish.uniforms.uTime.value = t;
    stepApples(dt);

    // Story: the address comes out as the visitor arrives, burns, repairs; the astronaut points.
    const tStory = t - Math.max(0, intro.len - 2.5);
    if (!revealed && tStory > 1.2) { revealed = true; revealAt = t; o.onReveal(); emit('reveal'); }
    if (repairAt === Infinity && tStory > 5.4) repairAt = t;
    const m = Math.max(0, t - repairAt) / 2.4;
    if (!repaired && m >= 1) { repaired = true; repairedAt = t; o.onRepaired(); emit('repaired'); }
    const inn = ease(m * 1.7 - .55), nIn = main.stars.filter(s => s.kind === 'in').length;
    while (nIn && lit < Math.floor(inn * nIn)) { lit++; emit('star', lit); }
    lookUp += ((tStory > 3 ? 1 : 0) - lookUp) * (1 - Math.pow(.3, dt));
    const wantPoint = repairAt < Infinity && t - repairAt < 9 ? 1 : 0;
    pointing += (wantPoint - pointing) * (1 - Math.pow(.15, dt));
    if (main.points) {
      const t0 = revealAt === Infinity ? t + 99 : revealAt;
      drawWord(main, t, { born: s => ease((t - t0 - s.order * .09) / .7), out: ease(m * 1.7), inn, slide: ease(m * 1.9 - .35), diagnose: repairAt === Infinity ? ease((t - t0 - 2.4) / .8) : 1, fresh: 1 - ease(m * 1.2 - .6), fade: 1 });
      const after = t - repairedAt;
      extras.forEach((ex, i) => {
        drawWord(ex.word, t, { born: s => ease((after - .6 - i * .5 - s.order * .05) / .8), out: 0, inn: 1, slide: 0, diagnose: 0, fresh: 0, fade: 1, small: true });
        const b = ex.word.screen, a = Math.min(1, Math.max(0, (after - 1.2 - i * .5) / .8));
        if (b && a > 0) { const w = o.host.clientWidth, h = o.host.clientHeight; ex.el.style.opacity = String(a); ex.el.style.transform = `translate(${((b[0] + b[2]) / 2 * .5 + .5) * w}px, ${(-b[1] * .5 + .5) * h + 8}px) translate(-50%, 0)`; }
        else ex.el.style.opacity = '0';
      });
      const va = visitorN && after > 1 ? ease((after - 1) / 1.2) : 0;
      (visitorStar.geometry.attributes.aAlpha as THREE.BufferAttribute).setX(0, va * (1 + .3 * Math.sin(t * 2.4))); visitorStar.geometry.attributes.aAlpha.needsUpdate = true;
      (visitorStar.material as THREE.ShaderMaterial).uniforms.uPx.value = renderer.getPixelRatio();
      v.copy(visitorPos).project(camera);
      if (va > 0 && v.z < 1) { visitorEl.style.opacity = String(va); visitorEl.style.transform = `translate(${(v.x * .5 + .5) * o.host.clientWidth + 22}px, ${(-v.y * .5 + .5) * o.host.clientHeight - 8}px)`; }
      else visitorEl.style.opacity = '0';
      if (va > .05 && !visitorShown) { visitorShown = true; emit('visitor'); }
    }
    composer.render(dt);
    // Keep the frame rate: step the resolution down if the device struggles.
    frames++; const now = performance.now();
    if (now - lastCheck > 2000) { const fps = frames * 1000 / (now - lastCheck); frames = 0; lastCheck = now;
      if (fps < 38 && dpr > (mobile ? .75 : 1)) { if (++slow >= 2) { dpr = Math.max(mobile ? .75 : 1, dpr * .88); resize(); slow = 0; } } else slow = 0; }
  }
  let visitorShown = false;
  const vis = () => { running = !document.hidden; if (running) clock.getDelta(); };
  document.addEventListener('visibilitychange', vis);

  const ready = build().then(() => { clock.start(); frame(); });
  (window as unknown as { __live: unknown }).__live = { camera, scene, astro, pos, goal, dropApple, get state() { return { yaw, pitch, tYaw, tPitch, t: clock.elapsedTime, dpr }; } };

  return {
    ready,
    skip() { intro.len = 0; pos.copy(START); goal.copy(START); },
    replay() { intro.len = 6.5; introDone = false; clock.start(); revealed = false; repaired = false; revealAt = repairAt = repairedAt = Infinity; lit = 0; visitorShown = false; pos.copy(intro.from); goal.copy(START); tYaw = YAW0; tPitch = .3; },
    visitor(n: number) { visitorN = n; visitorEl.textContent = `№ ${n.toLocaleString('de-AT')}`; },
    dropApple,
    dim(v: number) { dim = v; },
    story: () => ({ currentTime: Math.min(12, clock.elapsedTime * 12 / Math.max(6.5, intro.len || 6.5)), ended: clock.elapsedTime > intro.len, paused: false }),
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('keydown', kd); removeEventListener('keyup', ku); document.removeEventListener('visibilitychange', vis); renderer.dispose(); },
  };
}
