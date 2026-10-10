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
import type { SoundEvent } from './cenotaph-sound';
import { Guide } from './cenotaph-guide';
import { Orchard, groundAt } from './cenotaph-apple';
import type { DriftRoute } from '../data/drift-routes';

type V3 = [number, number, number];
type Meta = { mode: string; groups: Record<string, { scale: number; objects: string[] }>; fig: V3; fires: V3[]; hole: V3; sphere: { c: V3; rin: number } };
type Anchor = { dir: THREE.Vector3; width: number };

/** Blender (Z up) to three (Y up), the same way the glTF exporter turns the scene. */
const b2t = (v: V3 | number[]) => new THREE.Vector3(v[0], v[2], -v[1]);
const ease = (x: number) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const ARENA = 33.2;

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
uniform vec3 uHaze, uKey;
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
float luma(vec3 c){ return dot(c, vec3(.3, .59, .11)); }
void main(){
  vec3 B = vec3(vWorld.x, -vWorld.z, vWorld.y);          // Blender coordinates, for the stone layout
  vec3 N = normalize(vNormal);
  // Every unwrapping the stone can use, and its derivatives, all computed before any branching.
  vec3 P = B - vec3(0., 0., 60.); float Lr = length(P); float lat = asin(clamp(P.z / Lr, -1., 1.));
  float cr = cos(lat) * R;
  vec2 vA = vec2(atan(P.y, P.x) * cr, lat * R) / 3., vB = vec2(atan(-P.y, -P.x) * cr, lat * R) / 3.;
  float rc = length(B.xy);
  vec2 cA = vec2(atan(B.y, B.x) * rc, B.z) / 3., cB = vec2(atan(-B.y, -B.x) * rc, B.z) / 3.;
  vec2 pl = B.xy / 3.3;
  vec2 vAx = dFdx(vA), vAy = dFdy(vA), vBx = dFdx(vB), vBy = dFdy(vB);
  vec2 cAx = dFdx(cA), cAy = dFdy(cA), cBx = dFdx(cB), cBy = dFdy(cB), plx = dFdx(pl), ply = dFdy(pl);
  vec3 dpx = dFdx(vWorld), dpy = dFdy(vWorld);
  bool flatTop = abs(N.y) > .7 && uKind > .5 && uKind < 1.5;
  vec2 uv, gx, gy;
  if (uKind < .5) { bool a = dot(vAx, vAx) + dot(vAy, vAy) < dot(vBx, vBx) + dot(vBy, vBy); uv = a ? vA : vB; gx = a ? vAx : vBx; gy = a ? vAy : vBy; }
  else if (flatTop) { uv = pl; gx = plx; gy = ply; }
  else { bool a = dot(cAx, cAx) + dot(cAy, cAy) < dot(cBx, cBx) + dot(cBy, cBy); uv = a ? cA : cB; gx = a ? cAx : cBx; gy = a ? cAy : cBy; }
  // Relief: the scan's own light and dark read as height, lit from high in the vault.
  vec2 e1 = vec2(1. / 1024., 0.), e2 = vec2(0., 1. / 1024.);
  vec3 s0 = flatTop ? textureGrad(tPave, uv, gx, gy).rgb : textureGrad(tWall, uv, gx, gy).rgb;
  float h0 = luma(s0);
  float hx = luma(flatTop ? textureGrad(tPave, uv + e1, gx, gy).rgb : textureGrad(tWall, uv + e1, gx, gy).rgb);
  float hy = luma(flatTop ? textureGrad(tPave, uv + e2, gx, gy).rgb : textureGrad(tWall, uv + e2, gx, gy).rgb);
  vec3 nT = normalize(vec3((h0 - hx) * 7., (h0 - hy) * 7., 1.));
  vec3 d2 = cross(dpy, N), d1 = cross(N, dpx);
  vec3 Tt = d2 * gx.x + d1 * gy.x, Bt = d2 * gx.y + d1 * gy.y;
  float im = inversesqrt(max(max(dot(Tt, Tt), dot(Bt, Bt)), 1e-12));
  vec3 Np = normalize(mat3(Tt * im, Bt * im, N) * nT);
  vec3 Lk = normalize(uKey - vWorld);
  float relief = clamp(mix(1., max(dot(Np, Lk), 0.) / max(dot(N, Lk), .25), .6), .55, 1.5);
  // Relief only where a texel is bigger than a pixel: further off it would only shimmer.
  relief = mix(relief, 1., smoothstep(.0012, .004, length(gx) + length(gy)));
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 albedo; vec3 emit = vec3(0.);
  if (uKind < .5) {                                       // the vault: courses follow the sphere
    albedo = grade(s0) * vec3(1.12, 1.05, .93);
    emit = holes(P / Lr, length(vWorld - cameraPosition)) * uStars;
  } else if (uKind < 1.5) {                               // stone on the floor and the steps
    albedo = flatTop ? grade(s0) * vec3(.87, .82, .72) : grade(s0) * vec3(1.05, .99, .88);
    albedo *= mix(.55, 1., smoothstep(0., 3.5, B.z));    // grime at the foot of every wall
  } else if (uKind < 2.5) {
    // Honed black granite: a faint grain, and a soft sheen of the room (warm fires low, the dim
    // vault above) rather than a mirror, which read as stars stuck to the stone.
    float grain = luma(s0);
    albedo = vec3(.022, .021, .021) * (.75 + .5 * grain); relief = 1.;
    vec3 Rw = reflect(-V, N);
    float fres = .04 + .96 * pow(1. - max(dot(N, V), 0.), 5.);
    vec3 room = mix(vec3(.55, .32, .16), vec3(.1, .1, .12), smoothstep(-.1, .5, Rw.y));
    emit = room * fres * .22;
  } else {
    albedo = vec3(.2, .13, .07) * 1.4;                    // bronze bowls
    float fres = pow(1. - max(dot(N, V), 0.), 3.);
    emit = vec3(1., .55, .25) * fres * .35;
  }
  vec3 lm = texture(tLm, vLm).rgb; lm = lm * lm * uLmScale;
  if (uKind > 1.5 && uKind < 2.5) lm = mix(vec3(luma(lm)), lm, .35);   // granite stays black, not firelit brown
  vec3 col = albedo * lm * uGain * relief + emit;
  float d = length(vWorld - cameraPosition);
  col = mix(col, uHaze, (1. - exp(-d * .0035)) * .35);
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

export type LiveMode = 'menu' | 'explore';

export function mountCenotaphLive(o: {
  host: HTMLElement; base: string; mode: 'day' | 'night'; requested: string; target: string; reduced: boolean; still?: boolean;
  portrait: boolean; routes: DriftRoute[]; targetRoute: DriftRoute | null; lang: () => 'en' | 'de';
  sections?: () => { text: string; href: string; label: string }[];
  onReveal: () => void; onRepaired: () => void; onEvent?: (e: SoundEvent, d?: unknown) => void; onOpen?: (href: string) => void;
  onReady?: () => void; onMode?: (m: LiveMode) => void; ui?: HTMLElement;
}) {
  const mobile = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = o.mode === 'day' ? 1.15 : 1.45;
  renderer.domElement.className = 'live-canvas';
  o.host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(o.mode === 'day' ? '#1a1612' : '#07080b');
  // The film's last frame: same place, same lens, so the hand-over from video to real time is seamless.
  const FILM_FOV = o.portrait ? 100.4 : 67.4, FOV = o.portrait ? 78 : 62;
  const camera = new THREE.PerspectiveCamera(FILM_FOV, 1, .05, 600);
  const clock = new THREE.Clock();
  const emit = (e: SoundEvent, d?: unknown) => o.onEvent?.(e, d);

  // Post: bloom on the holes and the flames, a light grade, vignette and grain in the site's key.
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .5, .5, .9);
  composer.addPass(bloom);
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: mobile ? .02 : .032 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; vec2 q = vUv - .5;
        float l = dot(c, vec3(.2126, .7152, .0722)); c = mix(vec3(l), c, .88); c = max(vec3(0.), (c - .18) * 1.08 + .18);
        c *= 1. - .6 * smoothstep(.32, .9, length(q * vec2(1.1, 1.)));
        c *= 1. + (h(vUv * 900. + fract(uTime) * 91.) - .5) * uGrain * 4.;
        gl_FragColor = vec4(c, 1.); }`,
  });
  composer.addPass(finish);
  composer.addPass(new OutputPass());

  let meta: Meta | null = null;
  const stoneMaterials: THREE.ShaderMaterial[] = [];
  const dynamic: { update: (t: number, dt: number) => void }[] = [];
  let fig = new THREE.Vector3(3.4, 0, 23.5);
  const clickables: { obj: THREE.Object3D; act: () => void }[] = [];

  // ---- Camera and the visitor's body.
  const START = new THREE.Vector3(0, 2.0, 33.4), EYE = 1.72;
  const PITCH0 = Math.atan2(17.8, 53.4);
  const YAW0 = o.portrait ? -.3 : 0;
  let yaw = 0, pitch = PITCH0, tYaw = 0, tPitch = PITCH0;
  const feet = new THREE.Vector3(START.x, 0, START.z);   // on the floor; the film's extra height is eased out as 'lift'
  let vy = 0, onGround = true, mode: LiveMode = 'menu', enteredAt = Infinity, fovFrom = FILM_FOV;
  const keys = new Set<string>(), walkTo = new THREE.Vector3(); let walkToOn = false;
  const mouse = new THREE.Vector2();

  // Images are decoded off the main thread (ImageBitmap), so loading never stalls the film.
  const textures: THREE.Texture[] = [];
  const loadTex = async (url: string, srgb: boolean, flip = true) => {
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob, { imageOrientation: flip ? 'flipY' : 'from-image' });
    const t = new THREE.Texture(bmp as unknown as HTMLImageElement); t.flipY = false; t.needsUpdate = true;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); textures.push(t); return t;
  };

  let props: THREE.Group | null = null;
  async function build() {
    meta = await (await fetch(`${o.base}/live-${o.mode}.json`)).json() as Meta;
    const groups = Object.keys(meta.groups);
    const [wall, pave, ...maps] = await Promise.all([
      loadTex(`${o.base}/stone-wall.jpg`, true), loadTex(`${o.base}/stone-pave.jpg`, true),
      ...groups.map(g => loadTex(`${o.base}/lm-${o.mode}-${g}.jpg`, false, false)),
    ]);
    const lms: Record<string, THREE.Texture> = {};
    groups.forEach((g, i) => { const t = maps[i]; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.flipY = false; t.needsUpdate = true; lms[g] = t; });
    const draco = new DRACOLoader(); draco.setDecoderPath('/draco/');
    const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(`${o.base}/interior-${o.mode}.glb`);
    const haze = new THREE.Color(o.mode === 'day' ? '#2a241e' : '#0c0d12');
    const key = new THREE.Vector3(0, 26, 0);
    gltf.scene.traverse(obj => {
      const mesh = obj as THREE.Mesh; if (!mesh.isMesh) return;
      const g = mesh.geometry;
      g.setAttribute('lmUv', g.attributes.uv1 ?? g.attributes.uv);
      const name = `${mesh.name} ${mesh.parent?.name ?? ''}`;
      const group = (name.match(/(vault|tomb|floor)\|/) ?? [])[1] ?? (/Sphere/.test(name) ? 'vault' : 'floor');
      const vault = group === 'vault';
      const kind = vault ? 0 : /Sarcophagus|Lid/.test(name) ? 2 : /Cone|Torus/.test(name) ? 3 : 1;
      const lmKey = lms[group] ? group : 'floor';
      const m = new THREE.ShaderMaterial({
        uniforms: {
          tWall: { value: wall }, tPave: { value: pave }, tLm: { value: lms[lmKey] }, uLmScale: { value: meta!.groups[lmKey].scale },
          uKind: { value: kind }, uTime: { value: 0 }, uStars: { value: o.mode === 'day' ? 14 : 30 }, uGain: { value: 1 }, uDim: { value: 0 },
          uHaze: { value: haze }, uKey: { value: key },
        },
        vertexShader: stoneVertex, fragmentShader: stoneFragment, side: vault ? THREE.DoubleSide : THREE.FrontSide,
      });
      mesh.material = m; stoneMaterials.push(m);
    });
    scene.add(gltf.scene);
    // By day Boullée's lamp hangs over the tomb: brass rings round a glowing core. Its shadows are in the bake.
    if (o.mode === 'day') {
      const p = await new GLTFLoader().setDRACOLoader(draco).loadAsync(`${o.base}/props-day.glb`).catch(() => null);
      if (p) {
        props = p.scene;
        props.traverse(obj => { const m = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && 'emissiveIntensity' in m && m.emissive.getHex()) m.emissiveIntensity = 60; });
        scene.add(props);
        const lamp = new THREE.PointLight('#ffd6a4', 2600, 70, 1.4); lamp.position.set(0, 34, 0); scene.add(lamp);
        clickables.push({ obj: props, act: toggleOrbits });
      }
    }
    fig = b2t(meta.fig);
    buildTunnel(); buildShaft(); buildFires(); buildInscription(); await buildAstronaut(); buildWords();
    o.onReady?.();
  }

  // The tunnel behind the visitor: dark stone lit by sconces, so turning round is not a void.
  function buildTunnel() {
    const shape = new THREE.Shape();
    // A hair narrower than the cut through the steps, so the two walls never fight over the same pixels.
    shape.moveTo(-3.38, 0); shape.lineTo(3.38, 0); shape.lineTo(3.38, 6);
    shape.absarc(0, 6, 3.38, 0, Math.PI, false); shape.lineTo(-3.38, 0);
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
          vec3 c = a * (vec3(1., .6, .3) * lamp * 1.8 * fl + vec3(.05, .055, .07)) * exp(-max(0., vW.z - 60.) * .03);
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
    const spot = new THREE.SpotLight('#ffe6c4', 900, len + 5, .045, .5, 1.2);
    spot.position.copy(hole); spot.target.position.copy(foot); scene.add(spot, spot.target);
    dynamic.push({ update: t => { m.uniforms.uTime.value = t; dm.uniforms.uTime.value = t; dm.uniforms.uPx.value = renderer.getPixelRatio(); spot.intensity = 900 * (1 + .08 * Math.sin(t * .52 + .5)); } });
  }

  function buildFires() {
    const geo = new THREE.PlaneGeometry(1, 1.6); geo.translate(0, .8, 0);
    meta!.fires.forEach((f, i) => {
      const at = b2t(f);
      const big = at.distanceTo(new THREE.Vector3(0, at.y, 0)) < 20;
      const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSeed: { value: i * .37 } }, vertexShader: flameVertex, fragmentShader: flameFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const flame = new THREE.Mesh(geo, m); flame.position.copy(at).add(new THREE.Vector3(0, -.5 * (big ? 1.2 : .5), 0)); flame.scale.setScalar(big ? 1.35 : .5);
      scene.add(flame);
      dynamic.push({ update: t => { m.uniforms.uTime.value = t; flame.rotation.y = Math.atan2(camera.position.x - flame.position.x, camera.position.z - flame.position.z); } });
      if (big) {
        const light = new THREE.PointLight('#ff8a3c', 30, 22, 1.6); light.position.copy(at); scene.add(light);
        SOLID.push([at.x, at.z, .95]);
        dynamic.push({ update: t => { light.intensity = 30 * (1 + .16 * Math.sin(t * 9 + i) + .08 * Math.sin(t * 23 + i * 3)); } });
      }
    });
    scene.add(new THREE.HemisphereLight(o.mode === 'day' ? '#d8cbb4' : '#6f7ea0', '#1a120b', o.mode === 'day' ? 1.5 : 1.1));
  }

  // Cut into the end of the sarcophagus that faces the entrance, as on Boullée's drawing.
  function buildInscription() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d')!;
    g.font = '500 70px "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '12px';
    g.fillStyle = 'rgba(0,0,0,.75)'; g.fillText('ISAACO · NEWTON', 514, 98);
    g.fillStyle = 'rgba(214,196,160,.55)'; g.fillText('ISAACO · NEWTON', 512, 96);
    g.font = '400 46px "Times New Roman", serif'; g.fillStyle = 'rgba(214,196,160,.4)'; g.fillText('MDCCXXVII', 512, 190);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .475), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    plate.position.set(0, 2.55, 2.612); scene.add(plate);
  }

  // ---- The astronaut: the Observatory suit, now the curator of the cenotaph.
  const astro = createAstronaut();
  let guide: Guide | null = null;
  let pointing = 0, lookUp = 0;
  async function buildAstronaut() {
    astro.root.position.copy(fig);
    astro.root.rotation.y = Math.PI;
    scene.add(astro.root);
    // A tiny painted environment for his suit and visor: warm stone below, the dim vault above,
    // a patch of daylight where the shaft comes in. Far cheaper to prefilter than a studio scene.
    const ec = document.createElement('canvas'); ec.width = 64; ec.height = 32; const eg = ec.getContext('2d')!;
    const sky = eg.createLinearGradient(0, 0, 0, 32);
    sky.addColorStop(0, o.mode === 'day' ? '#b9a78c' : '#3a3f4c'); sky.addColorStop(.5, '#6d5a44'); sky.addColorStop(1, '#241a12');
    eg.fillStyle = sky; eg.fillRect(0, 0, 64, 32);
    eg.fillStyle = '#fff2dc'; eg.beginPath(); eg.arc(14, 6, 4, 0, 6.283); eg.fill();
    const etex = new THREE.CanvasTexture(ec); etex.mapping = THREE.EquirectangularReflectionMapping; etex.colorSpace = THREE.SRGBColorSpace;
    const env = new THREE.PMREMGenerator(renderer);
    scene.environment = env.fromEquirectangular(etex).texture; scene.environmentIntensity = .6; env.dispose();
    await astro.load().catch(() => {});
    astro.root.updateMatrixWorld(true);
    const hb = new THREE.Box3().setFromObject(astro.root); const hNow = hb.max.y - hb.min.y;
    if (hNow > .5) astro.root.scale.multiplyScalar(1.85 / hNow);
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62); grad.addColorStop(0, 'rgba(0,0,0,.8)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
    guide = new Guide({
      scene, camera, host: o.host, ui: o.ui, astro, routes: o.routes, lang: o.lang, onOpen: href => { emit('open', href); o.onOpen?.(href); },
      onSpeak: () => emit('talk'),
      canWalkTo: p => { const r = Math.hypot(p.x, p.z); if (r > ARENA - 1) p.multiplyScalar((ARENA - 1) / r); if (r < 12) p.multiplyScalar(12 / Math.max(r, .01)); p.y = 0; return p; },
    });
    clickables.push({ obj: astro.root, act: () => { if (!guide!.isOpen) guide!.open(); } });
    dynamic.push({ update: (t, dt) => {
      guide!.update(t, dt, { lookUp, point: pointing });
      shadow.position.set(astro.root.position.x + .2, groundAt(astro.root.position.x, astro.root.position.z) + .02, astro.root.position.z - .2);
      guide!.place(o.host.clientWidth, o.host.clientHeight);
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
    if (o.mode === 'day') {
      const sm = new THREE.ShaderMaterial({ uniforms: { uPx: { value: 1 } }, vertexShader: starVertex, transparent: true, depthWrite: false, depthTest: false,
        fragmentShader: 'varying vec3 vColor; varying float vAlpha; void main(){ float d = length(gl_PointCoord - .5) * 2.; gl_FragColor = vec4(vec3(.05, .03, .015), smoothstep(1., .1, d) * .55 * vAlpha); }' });
      const shade = new THREE.Points(pg, sm); shade.frustumCulled = false; shade.renderOrder = 3; wordGroup.add(shade);
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

  // ---- The visitor's star.
  let visitorN: number | null = null;
  const visitorEl = document.createElement('span'); visitorEl.className = 'live-visitor'; labels.append(visitorEl);
  const visitorPos = vaultHit(START, new THREE.Vector3(-.28, .55, -1).normalize());
  const visitorStar = (() => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([visitorPos.x, visitorPos.y, visitorPos.z]), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array([34]), 1)); g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array([.9, .95, 1]), 3)); g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array([0]), 1));
    const p = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uPx: { value: 1 } }, vertexShader: starVertex, fragmentShader: starFragment, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    p.frustumCulled = false; scene.add(p); return p;
  })();

  // ---- Newton: apples that fall, bounce off helmets and roll down the steps.
  const orchard = new Orchard(scene, () => astro.root.position, (kind, speed) => { if (speed > .6) emit(kind === 'helmet' ? 'apple-hit' : 'apple-bounce'); });
  function dropApple() { orchard.add(astro.root.position.clone().add(new THREE.Vector3(.05, 22, -.04)), new THREE.Vector3()); }
  function throwApple() {
    emit('throw');
    const f = new THREE.Vector3(); camera.getWorldDirection(f);
    const at = camera.position.clone().addScaledVector(f, .45).add(new THREE.Vector3(0, -.18, 0));
    orchard.add(at, f.multiplyScalar(12).add(new THREE.Vector3(0, 2.6, 0)));
  }

  // ---- The armillary sphere by day: click it and the planets take their orbits.
  let orbits: THREE.Group | null = null, orbitsOn = 0;
  function toggleOrbits() {
    if (!orbits) {
      orbits = new THREE.Group(); orbits.position.set(0, 34, 0); orbits.rotation.x = THREE.MathUtils.degToRad(23.44); scene.add(orbits);
      const planets: [number, number, string, number][] = [[2.1, .16, '#c9b8a2', 4.1], [2.9, .24, '#f0d9a8', 1.6], [3.8, .26, '#8fb7ff', 1], [4.6, .2, '#e0764a', .53], [5.8, .5, '#e9c89a', .084], [6.9, .42, '#f3e2b8', .034]];
      planets.forEach(([r, size, col, speed], i) => {
        const pivot = new THREE.Group(); pivot.rotation.y = i * 1.3; orbits!.add(pivot);
        const m = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 16), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 3, roughness: .6 }));
        m.position.x = r; pivot.add(m);
        if (i === 5) { const ring = new THREE.Mesh(new THREE.RingGeometry(size * 1.4, size * 2.2, 48), new THREE.MeshBasicMaterial({ color: '#f3e2b8', side: THREE.DoubleSide, transparent: true, opacity: .6 })); ring.rotation.x = 1.2; m.add(ring); }
        const path = new THREE.Mesh(new THREE.TorusGeometry(r, .012, 6, 128), new THREE.MeshBasicMaterial({ color: '#ffd9a6', transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
        path.rotation.x = Math.PI / 2; orbits!.add(path);
        dynamic.push({ update: (_t, dt) => { pivot.rotation.y += dt * speed * .9 * orbitsOn; } });
      });
      orbits.scale.setScalar(.001);
    }
    orbitsOn = orbitsOn > .5 ? 0 : 1;
    emit('open', 'orbits');
  }
  dynamic.push({ update: (_t, dt) => {
    if (!orbits) return;
    const s = orbits.scale.x + ((orbitsOn ? 1 : .001) - orbits.scale.x) * (1 - Math.pow(.05, dt)); orbits.scale.setScalar(s);
    if (props) props.rotation.y += dt * .15 * orbitsOn;
  } });

  // ---- Input. On a desk, walking works like a game: the pointer is captured, the mouse turns the
  // head, a click acts on whatever the crosshair is on. On touch, drag to look and tap to walk.
  let dragging = false, lastX = 0, lastY = 0, moved = 0, locked = false, releasing = false;
  const el = renderer.domElement;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const cross = document.createElement('div'); cross.className = 'live-cross'; o.host.append(cross);
  const aim = (e?: PointerEvent) => {
    if (locked || !e) ndc.set(0, 0);
    else { const r = el.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); }
    ray.setFromCamera(ndc, camera);
  };
  const onWord = (w: Word) => { const b = w.screen; return !!b && ndc.x > b[0] - .03 && ndc.x < b[2] + .03 && ndc.y > b[1] - .05 && ndc.y < b[3] + .05; };
  const canLock = !mobile && 'requestPointerLock' in el;
  const lock = () => { if (canLock && mode === 'explore' && !locked) { try { const r = el.requestPointerLock() as unknown as Promise<void> | undefined; r?.catch?.(err => console.warn('pointer lock', String(err))); } catch (err) { console.warn('pointer lock', String(err)); } } };
  const unlockFor = () => { if (locked) { releasing = true; document.exitPointerLock(); } };
  const waiting = () => cross.classList.toggle('is-waiting', canLock && mode === 'explore' && !locked);
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === el;
    cross.classList.toggle('is-on', locked);
    cross.dataset.hint = o.lang() === 'de' ? 'Klicken zum Umsehen' : 'Click to look around';
    setTimeout(waiting, 50);
    // Esc releases the pointer: that is also how you leave. Opening the curator releases it too, but keeps you inside.
    if (!locked && mode === 'explore' && !releasing) setMode('menu');
    releasing = false;
  });
  /** What the pointer (or the crosshair) is on, and what clicking it does. */
  function actionAt(): (() => void) | null {
    const holo = guide?.hitHologram(ray); if (holo) return () => { emit('open', holo); o.onOpen?.(holo); };
    for (const c of clickables) {
      const hit = ray.intersectObject(c.obj, true)[0];
      // The curator talks to whoever walks up to him; from across the arena the click is a throw at him.
      if (hit && c.obj === astro.root && mode === 'explore' && hit.distance > 7) continue;
      if (hit) return () => { if (c.obj === astro.root) unlockFor(); c.act(); };
    }
    for (const ex of extras) if (onWord(ex.word)) return () => { emit('open', ex.href); o.onOpen?.(ex.href); };
    return null;
  }
  el.addEventListener('pointerdown', e => {
    moved = 0; lastX = e.clientX; lastY = e.clientY;
    if (mode === 'explore' && canLock && !locked) { lock(); moved = 99; return; }
    dragging = mode === 'explore' && !locked; if (dragging) el.setPointerCapture(e.pointerId);
    if (locked) { aim(); const act = actionAt(); if (act) act(); else throwApple(); moved = 99; }
  });
  const onMove = (e: PointerEvent) => {
    mouse.set(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1);
    if (locked) {
      tYaw -= e.movementX * .0022; tPitch = THREE.MathUtils.clamp(tPitch - e.movementY * .0022, -1.3, 1.45);
      yaw = tYaw; pitch = tPitch;
      aim(); const hot = !!actionAt(); guide?.hover(!!guide?.hitHologram(ray)); cross.classList.toggle('is-hot', hot);
    } else if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      const k = mobile ? .006 : .0035;
      tYaw -= dx * k; tPitch = THREE.MathUtils.clamp(tPitch + dy * k, -1.2, 1.35);
    } else if (e.target === el) {
      aim(e);
      const hot = !!actionAt(); guide?.hover(!!guide?.hitHologram(ray));
      el.style.cursor = hot ? 'pointer' : mode === 'explore' ? 'crosshair' : '';
    }
  };
  addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', e => {
    dragging = false;
    if (moved > 8) return;
    aim(e);
    const act = actionAt(); if (act) { act(); return; }
    if (mode !== 'explore') return;
    if (mobile) { const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -feet.y), new THREE.Vector3()); if (hit && hit.distanceTo(feet) < 30) { walkTo.copy(hit); walkToOn = true; return; } }
    throwApple();
  });
  const MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (mode !== 'explore' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.code === 'Space') { if (down && !e.repeat) jump(); e.preventDefault(); return; }
    if (e.code === 'Escape' && down) { setMode('menu'); return; }
    if (e.code === 'KeyE' && down && !e.repeat) { throwApple(); return; }
    if ((e.code === 'KeyF' || e.code === 'KeyT') && down && !e.repeat) { unlockFor(); guide?.open(); return; }
    if (MOVE.includes(e.code)) { down ? keys.add(e.code) : keys.delete(e.code); e.preventDefault(); walkToOn = false; }
  };
  const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false);
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  addEventListener('blur', () => keys.clear());
  let tiltYaw = 0, tiltPitch = 0;
  // The phone's tilt is low-passed: a hand's tremor while tapping to walk used to shake the whole view.
  const tilt = (e: DeviceOrientationEvent) => { if (e.gamma == null || e.beta == null) return; tiltYaw += (-THREE.MathUtils.degToRad(e.gamma) * .5 - tiltYaw) * .08; tiltPitch += (THREE.MathUtils.degToRad(e.beta - 55) * .4 - tiltPitch) * .08; };
  if (mobile) addEventListener('deviceorientation', tilt);

  function jump() { if (onGround) { vy = 5.2; onGround = false; emit('jump'); } }
  function setMode(m: LiveMode) {
    if (m === mode) return;
    mode = m; keys.clear(); walkToOn = false; vel.set(0, 0, 0);
    if (m === 'menu') { tYaw = YAW0; tPitch = PITCH0; guide?.close(); if (locked) { releasing = true; document.exitPointerLock(); } }
    else lock();
    cross.dataset.hint = o.lang() === 'de' ? 'Klicken zum Umsehen' : 'Click to look around';
    setTimeout(waiting, 400);
    o.onMode?.(m);
  }
  // Leaving the page (or coming back to it from history) resets the conversation and the controls.
  const onHide = () => { guide?.close(); guide?.forget(); if (mode === 'explore') setMode('menu'); };
  addEventListener('pagehide', onHide);

  // Walking: steps up to 60 cm are climbed (the podium), higher ones stop you; jumping clears a little more.
  const SOLID: [number, number, number][] = [];   // round obstacles: x, z, radius (fire bowls on their pedestals)
  function tryMove(dx: number, dz: number) {
    const nx = feet.x + dx, nz = feet.z + dz;
    const r = Math.hypot(nx, nz), tunnel = Math.abs(nx) < 2.6 && nz > 30 && nz < 64;
    if (!tunnel && r > ARENA) return false;
    const g = groundAt(nx, nz);
    if (g - feet.y > (onGround ? .62 : .3)) return false;
    const a = astro.root.position; if (Math.hypot(nx - a.x, nz - a.z) < .7) return false;
    for (const [x, z, rr] of SOLID) if (Math.hypot(nx - x, nz - z) < rr && feet.y < 1.4) return false;
    feet.x = nx; feet.z = nz; return true;
  }
  const vel = new THREE.Vector3(); let stepDist = 0, stepPhase = 0;

  // ---- Resize and quality.
  let dpr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5);
  function resize() {
    const w = o.host.clientWidth, h = o.host.clientHeight;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr); composer.setSize(w, h);
    bloom.resolution.set(w * dpr / 2, h * dpr / 2);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(o.host); resize();
  let frames = 0, slow = 0, lastCheck = performance.now() + 5000;

  // ---- Frame.
  let raf = 0, dim = 0, running = true, visitorShown = false;
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    // While the film is still playing, the vault only waits: rendering it unseen would steal frames from the video.
    if (enteredAt === Infinity) { clock.getDelta(); return; }
    const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
    const since = t - enteredAt;
    // Lens: from the film's wide angle to the walking one, once the hand-over is done.
    camera.fov = since > 0 ? THREE.MathUtils.lerp(fovFrom, FOV, ease(since / 2.2)) : fovFrom; camera.updateProjectionMatrix();
    if (since > .8 && since < 1) tYaw = YAW0;
    if (mode === 'explore') {
      const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), rgt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const mv = new THREE.Vector3();
      if (keys.has('KeyW') || keys.has('ArrowUp')) mv.add(f);
      if (keys.has('KeyS') || keys.has('ArrowDown')) mv.sub(f);
      if (keys.has('KeyA')) mv.sub(rgt);
      if (keys.has('KeyD')) mv.add(rgt);
      if (keys.has('ArrowLeft')) tYaw += 1.6 * dt;
      if (keys.has('ArrowRight')) tYaw -= 1.6 * dt;
      if (walkToOn) { const d = new THREE.Vector3(walkTo.x - feet.x, 0, walkTo.z - feet.z); if (d.length() < .2) walkToOn = false; else mv.add(d.normalize()); }
      // Velocity eases in and out (less in the air), so walking has weight without feeling sluggish.
      const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
      if (mv.lengthSq() > 0) mv.normalize().multiplyScalar(run ? 8 : 4.4);
      vel.lerp(mv, 1 - Math.pow(onGround ? .0004 : .2, dt));
      const sx = vel.x * dt, sz = vel.z * dt;
      if (Math.abs(sx) + Math.abs(sz) > 1e-5) {
        const bx = feet.x, bz = feet.z;
        if (!tryMove(sx, sz)) { if (!tryMove(sx, 0)) tryMove(0, sz); }
        const d = Math.hypot(feet.x - bx, feet.z - bz);
        if (onGround) { stepDist += d; if (stepDist > (run ? 1.05 : .78)) { stepDist = 0; emit('step'); } }
      }
    } else {
      // Menu: the visitor stands at the entrance; the view follows the mouse a little.
      feet.x += (START.x - feet.x) * (1 - Math.pow(.05, dt)); feet.z += (START.z - feet.z) * (1 - Math.pow(.05, dt));
    }
    vy -= 13 * dt; feet.y += vy * dt;
    const g = groundAt(feet.x, feet.z);
    if (feet.y <= g) { if (!onGround && vy < -2.5) emit('land', Math.min(1.5, -vy / 6)); feet.y = g; vy = 0; onGround = true; } else if (feet.y > g + .05) onGround = false;
    const idle = mode === 'menu' && since > 1 ? { y: mouse.x * -.09 + .04 * Math.sin(t * .07), p: mouse.y * -.05 } : { y: 0, p: 0 };
    yaw += (tYaw + tiltYaw + idle.y - yaw) * (1 - Math.pow(.004, dt));
    pitch += (tPitch + tiltPitch + idle.p - pitch) * (1 - Math.pow(.004, dt));
    const speed = Math.hypot(vel.x, vel.z);
    // The step's phase is accumulated: sin(t * (7 + speed)) jumped by t × Δspeed whenever the pace changed,
    // and the longer the visitor had been on the page the harder every start and stop shook the view.
    stepPhase += dt * (7 + speed);
    const bob = mode === 'explore' && onGround ? Math.sin(stepPhase) * .005 * speed : Math.sin(t * 1.1) * .01;
    // The film's camera rode a little higher than eyes do: settle down from it gently.
    const lift = (START.y - EYE - groundAt(START.x, START.z)) * (since > 0 ? 1 - ease(since / 3) : 1);
    camera.position.set(feet.x, feet.y + EYE + bob + lift, feet.z);
    camera.rotation.set(0, 0, 0); camera.rotateY(yaw); camera.rotateX(pitch);
    for (const m of stoneMaterials) { m.uniforms.uTime.value = t; m.uniforms.uDim.value = dim; }
    for (const d of dynamic) d.update(t, dt);
    finish.uniforms.uTime.value = t;
    orchard.step(dt);

    // Story, from the hand-over: the address comes out, burns, repairs; he points, then shows the page.
    if (!revealed && since > 1) { revealed = true; revealAt = t; o.onReveal(); emit('reveal'); }
    if (repairAt === Infinity && since > 4.4) repairAt = t;
    const m = Math.max(0, t - repairAt) / 2.4;
    if (!repaired && m >= 1) {
      repaired = true; repairedAt = t; o.onRepaired(); emit('repaired');
      if (o.targetRoute) setTimeout(() => { if (guide && !guide.isOpen && !guide.holoRoute) guide.show(o.targetRoute!); }, 4500);
    }
    const inn = ease(m * 1.7 - .55), nIn = main.stars.filter(s => s.kind === 'in').length;
    while (nIn && lit < Math.floor(inn * nIn)) { lit++; emit('star', lit); }
    lookUp += ((since > 2 && since < 14 ? 1 : 0) - lookUp) * (1 - Math.pow(.3, dt));
    const wantPoint = repairAt < Infinity && t - repairAt < 4 ? 1 : 0;
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
    frames++; const now = performance.now();
    if (now - lastCheck > 2000) { const fps = frames * 1000 / (now - lastCheck); frames = 0; lastCheck = now;
      if (fps < 38 && dpr > (mobile ? .75 : 1)) { if (++slow >= 2) { dpr = Math.max(mobile ? .75 : 1, dpr * .88); resize(); slow = 0; } } else slow = 0; }
  }
  const vis = () => { running = !document.hidden; if (running) clock.getDelta(); };
  document.addEventListener('visibilitychange', vis);

  // Once loaded, compile every shader and draw one frame at the film's last pose, so the hand-over does not stutter.
  const ready = build().then(async () => {
    camera.position.set(START.x, START.y, START.z); camera.rotation.set(0, 0, 0); camera.rotateX(PITCH0);
    // Upload one texture per frame and let the GPU compile in parallel: no single long frame.
    const nextFrame = () => new Promise(r => requestAnimationFrame(r));
    for (const t of textures) { renderer.initTexture(t); await nextFrame(); }
    // Everything that will ever be drawn gets compiled now, in parallel on the GPU: the scene with
    // its hidden props made visible for the moment, and every full-screen pass of the post chain.
    const hidden: THREE.Object3D[] = [];
    scene.traverse(ob => { if (!ob.visible) { hidden.push(ob); ob.visible = true; } });
    const warm = new THREE.Scene(), quad = new THREE.PlaneGeometry(2, 2);
    const passMats: THREE.Material[] = [];
    for (const pass of composer.passes) {
      const pp = pass as unknown as Record<string, unknown>;
      for (const k of Object.keys(pp)) {
        const v = pp[k];
        if (v instanceof THREE.Material) passMats.push(v);
        if (Array.isArray(v)) v.forEach(x => { if (x instanceof THREE.Material) passMats.push(x); });
      }
    }
    passMats.forEach(m => warm.add(new THREE.Mesh(quad, m)));
    // Compiled for the half-float buffer the scene is really drawn into (tone mapping differs from the screen).
    renderer.setRenderTarget(composer.readBuffer);
    try { await Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(warm, camera)]); } catch { /* compiled on first draw instead */ }
    renderer.setRenderTarget(null);
    hidden.forEach(ob => { ob.visible = false; });
    // Allocate the post chain's targets at a tiny size first, then at full size on the hand-over.
    await nextFrame();
    clock.start(); frame();
  });
  (window as unknown as { __live: unknown }).__live = { camera, scene, astro, feet, orchard, dropApple, throwApple, setMode, jump, setView: (y: number, p: number) => { yaw = tYaw = y; pitch = tPitch = p; }, get guide() { return guide; }, get state() { return { yaw, pitch, tYaw, tPitch, t: clock.elapsedTime, dpr, mode }; } };

  return {
    ready,
    /** The film has reached the vault: take over from its last frame. */
    enter(fromFilm = true) { if (enteredAt < Infinity) return; enteredAt = clock.elapsedTime; fovFrom = fromFilm ? FILM_FOV : FOV; if (!fromFilm) tYaw = YAW0; },
    replay() { enteredAt = Infinity; revealed = false; repaired = false; revealAt = repairAt = repairedAt = Infinity; lit = 0; visitorShown = false; feet.set(START.x, 0, START.z); tYaw = 0; tPitch = PITCH0; yaw = 0; pitch = PITCH0; setMode('menu'); },
    setMode, jump, throwApple,
    talk() { if (guide && !guide.isOpen) guide.open(); },
    visitor(n: number) { visitorN = n; visitorEl.textContent = `№ ${n.toLocaleString('de-AT')}`; },
    dropApple,
    dim(v: number) { dim = v; },
    story: () => ({ currentTime: enteredAt === Infinity ? 0 : 12 + (clock.elapsedTime - enteredAt), ended: enteredAt < Infinity, paused: false }),
    dispose() { removeEventListener('pagehide', onHide); cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', vis); renderer.dispose(); },
  };
}
