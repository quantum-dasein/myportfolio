/*
 * 404 — "Fundbüro". A Viennese lost-and-found office after hours: one lamp over a
 * wooden counter, shelves of parcels with paper tags behind it. The address the
 * visitor typed drops onto the counter as brass letters, the bell rings, and the
 * typo repairs itself in front of them: extra letters topple off the counter,
 * wrong ones flip over like a split-flap board into the right ones, missing ones
 * drop in from under the lamp, the rest slide into place. Their mistake gets a
 * numbered tag and is filed on the shelf with everyone else's. The letters can be
 * grabbed and thrown; they find their way back.
 */
import * as THREE from 'three';
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/* ---------- The repair: a minimal edit script from the typo to the real address ---------- */
export type Op = { kind: 'keep' | 'sub' | 'del' | 'ins'; from: number; to: number };
export function editScript(a: string, b: string): Op[] {
  const n = a.length, m = b.length, d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const ops: Op[] = []; let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) { ops.push({ kind: 'keep', from: i - 1, to: j - 1 }); i--; j--; }
    else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) { ops.push({ kind: 'sub', from: i - 1, to: j - 1 }); i--; j--; }
    else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { ops.push({ kind: 'del', from: i - 1, to: -1 }); i--; }
    else { ops.push({ kind: 'ins', from: -1, to: j - 1 }); j--; }
  }
  return ops.reverse();
}

/* ---------- Procedural textures ---------- */
function canvasTexture(w: number, h: number, paint: (c: CanvasRenderingContext2D) => void, srgb = true) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas); if (srgb) texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}
function rng(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const woodTexture = (base: string, seed: number) => canvasTexture(1024, 256, c => {
  const r = rng(seed); c.fillStyle = base; c.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 180; i++) {
    const y = r() * 256, a = .03 + r() * .09; c.strokeStyle = r() > .5 ? `rgba(0,0,0,${a})` : `rgba(255,220,180,${a * .5})`; c.lineWidth = .6 + r() * 2.2;
    c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= 1024; x += 32) c.lineTo(x, y + Math.sin(x * .004 + i) * (3 + r() * 6)); c.stroke();
  }
});
const plasterTexture = () => canvasTexture(512, 512, c => {
  const r = rng(7); c.fillStyle = '#231c18'; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { const s = r() * 2.4; c.fillStyle = r() > .5 ? `rgba(0,0,0,${r() * .18})` : `rgba(255,235,210,${r() * .05})`; c.fillRect(r() * 512, r() * 512, s, s); }
  for (let i = 0; i < 26; i++) { c.strokeStyle = `rgba(0,0,0,${.05 + r() * .1})`; c.lineWidth = .7; c.beginPath(); let x = r() * 512, y = r() * 512; c.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - .5) * 40; y += r() * 30; c.lineTo(x, y); } c.stroke(); }
});

/** A kraft-paper luggage tag with a reinforced eyelet, written by the office. */
function drawTag(c: CanvasRenderingContext2D, W: number, H: number, number: string, path: string, date: string, lang: 'en' | 'de', fresh: boolean) {
  c.clearRect(0, 0, W, H);
  const cut = H * .28;
  c.beginPath(); c.moveTo(cut, 0); c.lineTo(W - 10, 0); c.quadraticCurveTo(W, 0, W, 10); c.lineTo(W, H - 10); c.quadraticCurveTo(W, H, W - 10, H); c.lineTo(cut, H); c.lineTo(0, H - cut); c.lineTo(0, cut); c.closePath();
  const paper = c.createLinearGradient(0, 0, W, H); paper.addColorStop(0, fresh ? '#d9c29a' : '#c2a97e'); paper.addColorStop(1, fresh ? '#c9ae82' : '#a88f68');
  c.fillStyle = paper; c.fill();
  c.save(); c.clip(); const r = rng(path.length * 31 + 7);
  for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(80,50,20,${r() * .08})`; c.fillRect(r() * W, r() * H, 1.5, 1.5); }
  c.restore();
  c.fillStyle = '#e8dcc2'; c.beginPath(); c.arc(H * .3, H / 2, H * .13, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3a2d20'; c.beginPath(); c.arc(H * .3, H / 2, H * .055, 0, Math.PI * 2); c.fill();
  const x = H * .58;
  c.fillStyle = '#6b4a2c'; c.font = `600 ${H * .1}px Inter, Arial, sans-serif`; c.textBaseline = 'alphabetic';
  if ('letterSpacing' in c) (c as unknown as { letterSpacing: string }).letterSpacing = `${H * .02}px`;
  c.fillText(lang === 'de' ? 'FUNDSTÜCK' : 'FUNDSTÜCK · FOUND ITEM', x, H * .24);
  if ('letterSpacing' in c) (c as unknown as { letterSpacing: string }).letterSpacing = '0px';
  c.fillStyle = '#2b2118'; c.font = `500 ${H * .26}px "RB Space", Inter, Arial, sans-serif`; c.fillText(`Nr. ${number}`, x, H * .52);
  let size = H * .15; c.font = `italic ${size}px Georgia, "Times New Roman", serif`;
  let label = path; while (c.measureText(label).width > W - x - 16 && label.length > 6) label = label.slice(0, -2) + '…';
  c.fillStyle = '#3d2c1c'; c.fillText(label, x, H * .74);
  c.fillStyle = '#7a5a3a'; c.font = `500 ${H * .085}px Inter, Arial, sans-serif`; c.fillText(date, x, H * .9);
  // A faded office stamp across the corner.
  c.save(); c.translate(W * .8, H * .5); c.rotate(-.35); c.strokeStyle = fresh ? 'rgba(150,40,30,.55)' : 'rgba(120,40,30,.3)'; c.lineWidth = H * .02;
  c.beginPath(); c.arc(0, 0, H * .26, 0, Math.PI * 2); c.stroke();
  c.fillStyle = c.strokeStyle; c.font = `700 ${H * .075}px Inter, Arial, sans-serif`; c.textAlign = 'center'; c.fillText('WIEN', 0, H * .03); c.restore();
}

/* ---------- Final pass: warm grade, vignette, grain ---------- */
const FINISH = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uTime: { value: 0 }, uDim: { value: 0 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;uniform float uTime,uDim;varying vec2 vUv;
    float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){
      vec3 col=texture2D(tDiffuse,vUv).rgb;
      vec2 c=vUv-.5;float v=1.-smoothstep(.25,.85,length(c*vec2(1.15,1.)));
      col*=mix(.32,1.,v);
      col+=(h(vUv*vec2(1731.,977.)+fract(uTime*5.3))-.5)*.022;
      col*=1.-uDim*.82;
      gl_FragColor=vec4(max(col,0.),1.);
    }`,
};

/* ---------- Sound (only when the visitor has turned the site's sound on) ---------- */
function makeSound() {
  let ctx: AudioContext | undefined;
  const on = () => document.documentElement.classList.contains('rb-sound') && !document.documentElement.classList.contains('rb-calm');
  const audio = () => {
    if (!on()) return undefined;
    if (!ctx) ctx = ((window as unknown as { __rbAudioContext?: () => AudioContext | null }).__rbAudioContext?.() ?? undefined) || new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  };
  const noiseBuffer = (a: AudioContext) => { const b = a.createBuffer(1, a.sampleRate * .2, a.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); return b; };
  return {
    clack(pitch = 1, gain = .5) {
      const a = audio(); if (!a) return; const t = a.currentTime;
      const src = a.createBufferSource(); src.buffer = noiseBuffer(a); src.playbackRate.value = .8 + pitch * .5;
      const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 * pitch; f.Q.value = 3;
      const g = a.createGain(); g.gain.setValueAtTime(gain * .5, t); g.gain.exponentialRampToValueAtTime(.001, t + .12);
      src.connect(f).connect(g).connect(a.destination); src.start(t);
      const o = a.createOscillator(); o.frequency.setValueAtTime(420 * pitch, t); o.frequency.exponentialRampToValueAtTime(180 * pitch, t + .08);
      const og = a.createGain(); og.gain.setValueAtTime(gain * .25, t); og.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(og).connect(a.destination); o.start(t); o.stop(t + .12);
    },
    ding() {
      const a = audio(); if (!a) return; const t = a.currentTime;
      for (const [f, v, d] of [[2093, .16, 2.4], [4186, .05, 1.4], [5588, .025, .9], [3136, .04, 1.8]] as const) {
        const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = a.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .05);
      }
    },
    flip() { this.clack(1.6, .25); },
    swish() {
      const a = audio(); if (!a) return; const t = a.currentTime;
      const src = a.createBufferSource(); const b = a.createBuffer(1, a.sampleRate * .6, a.sampleRate); const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length); src.buffer = b;
      const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(2400, t + .5); f.Q.value = 1.2;
      const g = a.createGain(); g.gain.value = .12; src.connect(f).connect(g).connect(a.destination); src.start(t);
    },
  };
}

/* ---------- Scene ---------- */
export type FundOptions = {
  host: HTMLElement;
  requested: string;
  /** Where the typo most likely meant to go; null when nothing is close enough. */
  target: string | null;
  lang: () => 'en' | 'de';
  reduced: boolean;
  /** Item number for the visitor's tag, from the shared counter. */
  number: Promise<number | null>;
  /** Plausible lost addresses for the tags already on the shelves. */
  shelfPaths: string[];
  /** The repair finished: where, on screen, the corrected word sits (centre, bottom). */
  onRepaired?: (at: { x: number; y: number }) => void;
  onFiled?: (number: number | null) => void;
};

export function mountFundbuero(o: FundOptions) {
  const { host } = o;
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(devicePixelRatio || 1, mobile ? 2 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);
  const canvas = renderer.domElement; canvas.style.touchAction = 'pan-y';

  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0a0807'); scene.fog = new THREE.Fog('#0a0807', 6.5, 13);
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 60);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .03).texture; scene.environmentIntensity = .32;
  const sound = makeSound();

  /* ----- Room ----- */
  const TOP = 1, ROW_Z = .32;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshStandardMaterial({ map: plasterTexture(), roughness: .95 }));
  (wall.material.map as THREE.Texture).wrapS = (wall.material.map as THREE.Texture).wrapT = THREE.RepeatWrapping; (wall.material.map as THREE.Texture).repeat.set(4, 2.4);
  wall.position.set(0, 2.2, -2.55); wall.receiveShadow = true; scene.add(wall);
  const shelfWood = new THREE.MeshStandardMaterial({ map: woodTexture('#3b2a1e', 11), roughness: .72 });
  const counterWood = new THREE.MeshPhysicalMaterial({ map: woodTexture('#2e2017', 29), roughness: .42, clearcoat: .35, clearcoatRoughness: .4 });
  const frontWood = new THREE.MeshStandardMaterial({ map: woodTexture('#1f1610', 41), roughness: .8 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, cast = true) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true; scene.add(mesh); return mesh; };
  // Shelving: uprights and boards against the back wall.
  const SHELF_Z = -2.2, boards = [.42, 1.12, 1.82, 2.52, 3.22];
  for (let x = -4.8; x <= 4.81; x += 1.6) box(.06, 3.2, .46, shelfWood, x, 1.8, SHELF_Z, false);
  for (const y of boards) box(9.7, .045, .48, shelfWood, 0, y, SHELF_Z, false);
  // Parcels, hat boxes and files, each shelf bay filled differently.
  const kraft = ['#7c5b3a', '#8a6844', '#6b4e33', '#957352'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .9 }));
  const paperWhite = new THREE.MeshStandardMaterial({ color: '#cbbfa8', roughness: .85 });
  const tagSlots: THREE.Vector3[] = [];
  const shelfRand = rng(2024);
  for (let b = 0; b < boards.length - 1; b++) for (let x = -4.8; x < 4.8 - .1; x += 1.6) {
    let cx = x + .08;
    while (cx < x + 1.45) {
      const w = .28 + shelfRand() * .42, h = .2 + shelfRand() * .38; if (cx + w > x + 1.54) break;
      const kind = shelfRand();
      if (kind < .72) {
        const parcel = box(w, h, .34, kraft[Math.floor(shelfRand() * kraft.length)], cx + w / 2, boards[b] + .022 + h / 2, SHELF_Z + .02, false);
        parcel.rotation.y = (shelfRand() - .5) * .12;
        if (shelfRand() < .5) tagSlots.push(new THREE.Vector3(cx + w * (.3 + shelfRand() * .4), boards[b] + .022 + h * .78, SHELF_Z + .2));
      } else if (kind < .86) {
        const r = Math.min(w, .34) / 2; const hat = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h * .8, 28), kraft[1]); hat.position.set(cx + r, boards[b] + .022 + h * .4, SHELF_Z); scene.add(hat); cx += r * 2 + .06; continue;
      } else {
        for (let k = 0; k < 4; k++) box(.05, h * (.8 + shelfRand() * .2), .3, k % 2 ? paperWhite : kraft[2], cx + k * .055, boards[b] + .022 + h * .45, SHELF_Z, false);
        cx += .26; continue;
      }
      cx += w + .03 + shelfRand() * .05;
    }
  }
  // Counter: a heavy top and a dark front panel.
  const counterTop = box(10, .08, 1.15, counterWood, 0, TOP - .04, ROW_Z - .05); counterTop.castShadow = false;
  box(10, 1.05, .07, frontWood, 0, TOP - .6, ROW_Z + .5, false);
  const edge = box(10, .03, .05, new THREE.MeshStandardMaterial({ color: '#9b7a4c', metalness: .9, roughness: .35 }), 0, TOP - .075, ROW_Z + .53, false); edge.castShadow = false;

  // Brass bell: base, dome, plunger.
  const brass = new THREE.MeshPhysicalMaterial({ color: '#c3965a', metalness: 1, roughness: .26, clearcoat: .5, clearcoatRoughness: .25 });
  const bell = new THREE.Group();
  const bellBase = new THREE.Mesh(new THREE.CylinderGeometry(.1, .11, .03, 40), new THREE.MeshStandardMaterial({ color: '#111', roughness: .4, metalness: .3 })); bellBase.position.y = .015; bell.add(bellBase);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.085, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), brass); dome.position.y = .03; bell.add(dome);
  const plunger = new THREE.Group(); plunger.add(new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .05, 12), brass)); const knob = new THREE.Mesh(new THREE.SphereGeometry(.018, 16, 12), brass); knob.position.y = .03; plunger.add(knob);
  plunger.position.y = .14; bell.add(plunger);
  bell.traverse(m => { (m as THREE.Mesh).castShadow = true; }); scene.add(bell);

  // Lamp: a green enamel shade on a cord, a hot bulb, a warm cone of light.
  const LAMP = new THREE.Vector3(0, 2.3, ROW_Z + .05);
  const shadeProfile = [new THREE.Vector2(.02, .32), new THREE.Vector2(.06, .3), new THREE.Vector2(.1, .2), new THREE.Vector2(.22, .08), new THREE.Vector2(.36, 0)];
  const shade = new THREE.Mesh(new THREE.LatheGeometry(shadeProfile, 64), new THREE.MeshStandardMaterial({ color: '#1f3029', metalness: .55, roughness: .35, side: THREE.DoubleSide }));
  shade.position.copy(LAMP).add(new THREE.Vector3(0, -.02, 0)); scene.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.055, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.2, 2.4), toneMapped: false })); bulb.position.copy(LAMP).add(new THREE.Vector3(0, .02, 0)); scene.add(bulb);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, 3, 8), new THREE.MeshStandardMaterial({ color: '#111' })); cord.position.copy(LAMP).add(new THREE.Vector3(0, 1.8, 0)); scene.add(cord);
  const spot = new THREE.SpotLight('#ffcf9a', 38, 9, .62, .62, 1.6); spot.position.copy(LAMP); spot.target.position.set(0, TOP, ROW_Z); scene.add(spot, spot.target);
  spot.castShadow = true; spot.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); spot.shadow.bias = -.0004; spot.shadow.normalBias = .015; spot.shadow.radius = 4; spot.shadow.camera.near = .3; spot.shadow.camera.far = 6;
  scene.add(new THREE.HemisphereLight('#44506a', '#140d08', .32));
  const rim = new THREE.DirectionalLight('#7d93b8', .55); rim.position.set(-4, 3, -3); scene.add(rim);
  const shelfGlow = new THREE.PointLight('#ff9a55', 1.2, 5, 1.8); shelfGlow.position.set(2.8, 2.8, -1.2); scene.add(shelfGlow);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.35, 64, 1, true), new THREE.ShaderMaterial({
    uniforms: { uI: { value: .085 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv;varying vec3 vN,vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform float uI;varying vec2 vUv;varying vec3 vN,vV;void main(){float f=pow(abs(dot(vN,vV)),1.6);float a=f*smoothstep(0.,.7,vUv.y)*uI;gl_FragColor=vec4(vec3(1.,.8,.55)*a,a);}',
  }));
  cone.position.copy(LAMP).add(new THREE.Vector3(0, -.68, 0)); scene.add(cone);

  // Dust in the light.
  const DUST = mobile ? 220 : 520; const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.3; dustPos.set([Math.cos(a) * r, TOP + Math.random() * 1.3, ROW_Z + Math.sin(a) * r * .6], i * 3); dustSeed[i] = Math.random(); }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3)); dustGeo.setAttribute('seed', new THREE.BufferAttribute(dustSeed, 1));
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uLamp: { value: LAMP }, uGust: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float seed;uniform float uTime,uScale,uGust;uniform vec3 uLamp;varying float vA;void main(){vec3 p=position;float t=uTime*(.05+seed*.06)+seed*20.;p.x+=sin(t*1.3)*.25+uGust*sin(seed*40.)*.4;p.y+=mod(t*.18,1.3)-.65+uGust*.3*seed;p.z+=cos(t)*.15;vec3 d=p-uLamp;float inCone=smoothstep(.62,.35,length(d.xz)/max(.2,-d.y+.1));vA=inCone*(.35+.65*seed);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(1.+2.2*seed)*uScale/-mv.z*3.;}',
    fragmentShader: 'varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vA;gl_FragColor=vec4(vec3(1.,.86,.66)*a*1.6,a);}',
  })); scene.add(dust);

  /* ----- Letters ----- */
  type Letter = {
    ch: string; mesh: THREE.Mesh; mat: THREE.MeshPhysicalMaterial; slot: number; x: number; y: number; z: number; vx: number; vy: number; vz: number;
    rot: THREE.Euler; spin: THREE.Vector3; mode: 'wait' | 'drop' | 'rest' | 'slide' | 'flip' | 'topple' | 'fall' | 'gone' | 'grab' | 'fly' | 'home';
    t: number; from: number; to: number; swapTo?: string; delay: number; settled: number; fresh: boolean; ground: number;
  };
  let font: Font | undefined, S = .34, rest = TOP, letters: Letter[] = [], slotsTarget: number[] = [], slotsTypo: number[] = [];
  const glyphCache = new Map<string, THREE.BufferGeometry>(), glyphFoot = new Map<string, number>();
  const brassOld = () => new THREE.MeshPhysicalMaterial({ color: '#a97f4c', metalness: 1, roughness: .34, clearcoat: .3, clearcoatRoughness: .35, emissive: '#ff9a4a', emissiveIntensity: 0 });
  const brassNew = () => new THREE.MeshPhysicalMaterial({ color: '#d6ad6c', metalness: 1, roughness: .2, clearcoat: .6, clearcoatRoughness: .2, emissive: '#ffb066', emissiveIntensity: 0 });
  function glyph(ch: string) {
    if (!font) return new THREE.BufferGeometry();
    const key = ch + S.toFixed(3); let g = glyphCache.get(key);
    if (!g) {
      g = new TextGeometry(ch, { font, size: S, depth: S * .2, curveSegments: 10, bevelEnabled: true, bevelThickness: S * .025, bevelSize: S * .016, bevelSegments: 4 });
      g.computeBoundingBox(); const b = g.boundingBox!;
      // Pivot in the middle of the letter body, so flips and tumbles turn about the letter itself.
      g.translate(-(b.min.x + b.max.x) / 2, -S * .36, -(b.min.z + b.max.z) / 2); g.computeVertexNormals();
      glyphCache.set(key, g); glyphFoot.set(key, b.min.y - S * .36);
    }
    return g;
  }
  /** Height of a letter's centre when it stands on the counter on its lowest point: a g stands on its tail. */
  const groundOf = (ch: string) => { glyph(ch); return TOP - (glyphFoot.get(ch + S.toFixed(3)) ?? -S * .36) + S * .005; };
  // Letters are thin strokes; an invisible box around each makes them easy to catch.
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  function letterMesh(ch: string, mat: THREE.Material) {
    const mesh = new THREE.Mesh(glyph(ch), mat); mesh.castShadow = true; mesh.receiveShadow = true;
    const b = new THREE.Box3().setFromBufferAttribute(mesh.geometry.getAttribute('position') as THREE.BufferAttribute);
    const size = b.getSize(new THREE.Vector3()), centre = b.getCenter(new THREE.Vector3());
    const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(size.x, S * .3) + S * .12, size.y + S * .12, size.z + S * .2), hitMat); hit.position.copy(centre); mesh.add(hit);
    return mesh;
  }
  const advance = (ch: string) => { if (!font) return S * .6; const d = (font.data as unknown as { glyphs: Record<string, { ha: number }>; resolution: number }); const gl = d.glyphs[ch] ?? d.glyphs['?']; return (gl?.ha ?? 600) * S / d.resolution + S * .04; };
  function slotsFor(text: string) { const adv = [...text].map(advance), total = adv.reduce((a, b) => a + b, 0); let x = -total / 2; return adv.map(a => { const c = x + a / 2; x += a; return c; }); }
  const typo = normalise(o.requested), target = o.target ? normalise(o.target) : null;
  function normalise(p: string) { let s = p.toLowerCase(); if (s.length > 30) s = s.slice(0, 29) + '…'; return s; }

  function visibleHalfWidth(z: number) { const d = camera.position.z - z; return Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * d * camera.aspect; }
  function fitSize() {
    const longest = Math.max(typo.length, target?.length ?? 0);
    const room = visibleHalfWidth(ROW_Z) * 2 * (camera.aspect < .9 ? .76 : mobile ? .86 : .7);
    S = THREE.MathUtils.clamp(room / (longest * .62), .12, mobile ? .3 : .42);
    rest = TOP + S * .36 + S * .025;
  }

  /* ----- Tags on the shelves, and the visitor's own ----- */
  const date = new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Vienna' }).format(new Date());
  const tagGeo = new THREE.PlaneGeometry(.3, .13);
  const stringMat = new THREE.LineBasicMaterial({ color: '#8a7a64', transparent: true, opacity: .8 });
  const tagRand = rng(99);
  tagSlots.slice(0, mobile ? 8 : 16).forEach((at, i) => {
    const path = o.shelfPaths[i % Math.max(1, o.shelfPaths.length)] ?? '/';
    const tex = canvasTexture(512, 222, c => drawTag(c, 512, 222, String(1200 + Math.floor(tagRand() * 800)), path, `${String(1 + Math.floor(tagRand() * 27)).padStart(2, '0')}.0${1 + Math.floor(tagRand() * 8)}.2026`, 'de', false));
    const tag = new THREE.Mesh(tagGeo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .9, side: THREE.DoubleSide }));
    tag.position.set(at.x, at.y - .13, at.z); tag.rotation.set(-.1, (tagRand() - .5) * .5, (tagRand() - .5) * .5); tag.castShadow = false; scene.add(tag);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([at.clone(), tag.position.clone().add(new THREE.Vector3(-.12, 0, 0))]), stringMat); scene.add(line);
  });
  const myTagCanvas = document.createElement('canvas'); myTagCanvas.width = 1024; myTagCanvas.height = 444;
  const myTagTex = new THREE.CanvasTexture(myTagCanvas); myTagTex.colorSpace = THREE.SRGBColorSpace; myTagTex.anisotropy = 8;
  const myTag = new THREE.Mesh(new THREE.PlaneGeometry(.62, .27), new THREE.MeshStandardMaterial({ map: myTagTex, transparent: true, roughness: .85, side: THREE.DoubleSide }));
  myTag.castShadow = true; myTag.visible = false; scene.add(myTag);
  const myString = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), stringMat); myString.visible = false; scene.add(myString);
  let tagNumber: number | null = null;
  const paintMyTag = () => drawTag(myTagCanvas.getContext('2d')!, 1024, 444, tagNumber ? String(tagNumber) : '—', o.requested.length > 34 ? o.requested.slice(0, 33) + '…' : o.requested, `${date} · Wien`, o.lang(), true);
  paintMyTag(); myTagTex.needsUpdate = true;
  void o.number.then(n => { tagNumber = n; paintMyTag(); myTagTex.needsUpdate = true; });

  /* ----- Choreography ----- */
  let clock = 0, phase: 'intro' | 'dropping' | 'repairing' | 'done' = 'intro', repairAt = Infinity, doneAt = Infinity, tagT = -1, belled = 0, flickerT = 0;
  const shelfSlot = tagSlots.length ? tagSlots[Math.floor(tagSlots.length * .55)].clone().add(new THREE.Vector3(.05, -.12, .02)) : new THREE.Vector3(1.6, 2.1, -2);

  function build() {
    letters.forEach(l => { scene.remove(l.mesh); l.mat.dispose(); }); letters = [];
    fitSize(); glyphCache.forEach(g => g.dispose()); glyphCache.clear();
    slotsTypo = slotsFor(typo); slotsTarget = target ? slotsFor(target) : [];
    [...typo].forEach((ch, i) => {
      const mat = brassOld(); const mesh = letterMesh(ch, mat); mesh.visible = false; scene.add(mesh);
      letters.push({ ch, mesh, mat, slot: slotsTypo[i], x: slotsTypo[i], y: rest + 1.8 + Math.random() * .6, z: ROW_Z, vx: 0, vy: 0, vz: 0, rot: new THREE.Euler((Math.random() - .5) * .8, (Math.random() - .5) * .6, (Math.random() - .5) * .8), spin: new THREE.Vector3(), mode: 'wait', t: 0, from: 0, to: 0, delay: .35 + i * .055, settled: 0, fresh: false, ground: groundOf(ch) });
    });
    phase = 'dropping'; repairAt = Infinity; doneAt = Infinity; tagT = -1;
    if (o.reduced) finishInstantly();
  }
  function finishInstantly() {
    letters.forEach(l => { scene.remove(l.mesh); l.mat.dispose(); }); letters = [];
    const text = target ?? typo, slots = target ? slotsTarget : slotsTypo;
    [...text].forEach((ch, i) => { const mat = target ? brassNew() : brassOld(); const mesh = letterMesh(ch, mat); scene.add(mesh); letters.push({ ch, mesh, mat, slot: slots[i], x: slots[i], y: groundOf(ch), z: ROW_Z, vx: 0, vy: 0, vz: 0, rot: new THREE.Euler(), spin: new THREE.Vector3(), mode: 'rest', t: 0, from: 0, to: 0, delay: 0, settled: 1, fresh: !!target, ground: groundOf(ch) }); });
    phase = 'done'; doneAt = clock; tagT = 2.5;
  }
  function startRepair() {
    phase = 'repairing'; bellFx();
    if (!target) {
      // Nothing close: the address is lost for good. Letters topple off the counter one by one.
      letters.forEach((l, i) => { l.mode = 'topple'; l.t = 0; l.delay = .5 + i * .08; });
      doneAt = clock + .9 + letters.length * .08 + .9; return;
    }
    const ops = editScript(typo, target); let k = 0; const incoming: Letter[] = [];
    for (const op of ops) {
      const stagger = .45 + (k++) * .085;
      if (op.kind === 'del') { const l = letters[op.from]; l.mode = 'topple'; l.t = 0; l.delay = stagger; }
      else if (op.kind === 'keep') { const l = letters[op.from]; l.from = l.x; l.to = slotsTarget[op.to]; l.slot = l.to; l.mode = 'slide'; l.t = 0; l.delay = stagger; }
      else if (op.kind === 'sub') { const l = letters[op.from]; l.from = l.x; l.to = slotsTarget[op.to]; l.slot = l.to; l.swapTo = target[op.to]; l.mode = 'flip'; l.t = 0; l.delay = stagger; }
      else {
        const mat = brassNew(); const ch = target[op.to]; const mesh = letterMesh(ch, mat); mesh.visible = false; scene.add(mesh);
        incoming.push({ ch, mesh, mat, slot: slotsTarget[op.to], x: slotsTarget[op.to], y: rest + 1.6, z: ROW_Z, vx: 0, vy: 0, vz: 0, rot: new THREE.Euler(.6, 0, (Math.random() - .5) * .6), spin: new THREE.Vector3(), mode: 'wait', t: 0, from: 0, to: 0, delay: stagger + .15, settled: 0, fresh: true, ground: groundOf(ch) });
      }
    }
    letters.push(...incoming);
    doneAt = clock + .45 + k * .085 + 1.3;
  }
  function bellFx() {
    belled = 1; sound.ding(); flickerT = .5;
    (dust.material as THREE.ShaderMaterial).uniforms.uGust.value = 1;
  }
  /** The visitor rings: the bell, the lamp, and every resting letter jumps. */
  function ring() {
    bellFx();
    letters.forEach(l => { if (l.mode === 'rest') { l.vy = 1.1 + Math.random() * .5; l.mode = 'fly'; l.spin.set((Math.random() - .5) * 3, 0, (Math.random() - .5) * 3); l.settled = 0; } });
  }

  const ease = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const G = 11;
  function step(l: Letter, dt: number) {
    if (l.delay > 0) { l.delay -= dt; if (l.delay > 0) return; if (l.mode === 'wait') { l.mode = 'drop'; l.mesh.visible = true; } }
    const half = visibleHalfWidth(l.z) - S * .4;
    switch (l.mode) {
      case 'drop': case 'fly': {
        l.vy -= G * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
        l.rot.x += l.spin.x * dt; l.rot.y += l.spin.y * dt; l.rot.z += l.spin.z * dt;
        if (Math.abs(l.x) > half) { l.x = Math.sign(l.x) * half; l.vx *= -.5; }
        const onCounter = l.z < ROW_Z + .5 && l.z > ROW_Z - .55;
        if (onCounter && l.y <= l.ground && l.vy < 0) {
          const hit = Math.abs(l.vy); l.y = l.ground; l.vy = hit > .8 ? hit * .3 : 0; l.vx *= .6; l.vz *= .5; l.spin.multiplyScalar(.4);
          if (hit > .8) sound.clack(.8 + Math.random() * .6, Math.min(.6, hit * .12));
          if (l.vy === 0) { l.mode = l.mode === 'drop' ? 'rest' : 'home'; l.t = 0; l.from = l.x; l.settled = 0; }
        }
        if (l.y < -1.2) { if (l.mode === 'fly') { l.mode = 'drop'; l.x = l.slot; l.y = l.ground + 1.6; l.z = ROW_Z; l.vx = l.vy = l.vz = 0; l.rot.set(.4, 0, 0); } }
        // Upright again as it lands.
        if (l.mode === 'drop' && l.y < l.ground + .4) { l.rot.x *= 1 - dt * 6; l.rot.y *= 1 - dt * 6; l.rot.z *= 1 - dt * 6; }
        break;
      }
      case 'rest': l.rot.x *= 1 - dt * 10; l.rot.y *= 1 - dt * 10; l.rot.z *= 1 - dt * 10; l.y = l.ground; l.settled += dt; break;
      case 'home': {
        // After a throw, the letter hops back to its slot and straightens up.
        l.t = Math.min(1, l.t + dt / .7); const e = ease(l.t);
        l.x = THREE.MathUtils.lerp(l.from, l.slot, e); l.y = l.ground + Math.sin(Math.PI * l.t) * S * .6; l.z = THREE.MathUtils.lerp(l.z, ROW_Z, e);
        l.rot.x *= 1 - dt * 8; l.rot.y *= 1 - dt * 8; l.rot.z *= 1 - dt * 8;
        if (l.t >= 1) { l.mode = 'rest'; l.rot.set(0, 0, 0); sound.clack(1.2, .15); }
        break;
      }
      case 'slide': {
        l.t = Math.min(1, l.t + dt / .6); const e = ease(l.t);
        l.x = THREE.MathUtils.lerp(l.from, l.to, e); l.y = l.ground + Math.sin(Math.PI * l.t) * S * (Math.abs(l.to - l.from) > .01 ? .22 : .08);
        if (l.t >= 1) { l.mode = 'rest'; l.y = l.ground; }
        break;
      }
      case 'flip': {
        // Split-flap: a full turn forward; the character changes while its back faces you.
        const was = l.t; l.t = Math.min(1, l.t + dt / .75); const e = ease(l.t);
        l.x = THREE.MathUtils.lerp(l.from, l.to, e); l.y = l.ground + Math.sin(Math.PI * l.t) * S * .7; l.rot.x = -e * Math.PI * 2;
        if (was < .5 && l.t >= .5 && l.swapTo) { l.ch = l.swapTo; l.mesh.geometry = glyph(l.ch); l.ground = groundOf(l.ch); l.mat.dispose(); l.mat = brassNew(); l.mesh.material = l.mat; l.fresh = true; sound.flip(); }
        if (l.t >= 1) { l.mode = 'rest'; l.rot.x = 0; l.y = l.ground; sound.clack(1.3, .2); }
        break;
      }
      case 'topple': {
        // Tips over backwards, then slides off the front edge and drops out of sight.
        l.t += dt;
        if (l.t < .3) { l.rot.x = THREE.MathUtils.lerp(0, .55, l.t / .3); l.y = l.ground; }
        else { l.mode = 'fall'; l.vz = 1.5 + Math.random() * .4; l.vy = .9; l.vx = (Math.random() - .5) * .6; l.spin.set(4 + Math.random() * 3, (Math.random() - .5) * 2, (Math.random() - .5) * 3); sound.clack(.7, .25); }
        break;
      }
      case 'fall': {
        l.vy -= G * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
        l.rot.x += l.spin.x * dt; l.rot.y += l.spin.y * dt; l.rot.z += l.spin.z * dt;
        if (l.z < ROW_Z + .5 && l.y < l.ground) { l.y = l.ground; l.vy = Math.abs(l.vy) * .2; }
        if (l.y < -1.5) { l.mode = 'gone'; l.mesh.visible = false; }
        break;
      }
      case 'grab': break;
    }
    l.mesh.position.set(l.x, l.y, l.z); l.mesh.rotation.copy(l.rot);
  }

  /* ----- Input: grab letters, ring the bell ----- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -ROW_Z), hitP = new THREE.Vector3();
  let held: Letter | undefined, heldPrev = new THREE.Vector3(), heldVel = new THREE.Vector3(), lastT = 0;
  const pointer = (e: { clientX: number; clientY: number }) => { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  const pickLetter = () => { const hits = ray.intersectObjects(letters.filter(l => l.mesh.visible && l.mode !== 'gone' && l.mode !== 'fall').map(l => l.mesh), true); return hits.length ? letters.find(l => l.mesh === hits[0].object || l.mesh === hits[0].object.parent) : undefined; };
  const pickBell = () => ray.intersectObject(bell, true).length > 0;
  canvas.addEventListener('pointerdown', e => {
    pointer(e);
    if (pickBell()) { ring(); return; }
    if (phase !== 'done') return;
    const l = pickLetter(); if (!l) return;
    held = l; l.mode = 'grab'; ray.ray.intersectPlane(plane.set(new THREE.Vector3(0, 0, 1), -l.z), hitP); heldPrev.copy(hitP); heldVel.set(0, 0, 0); lastT = performance.now();
    canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    pointer(e);
    if (held) {
      if (ray.ray.intersectPlane(plane, hitP)) {
        const now = performance.now(), dt = Math.max(.008, (now - lastT) / 1000); lastT = now;
        heldVel.lerp(hitP.clone().sub(heldPrev).divideScalar(dt), .4); heldPrev.copy(hitP);
        held.x = hitP.x; held.y = Math.max(held.ground, hitP.y); held.rot.z = THREE.MathUtils.clamp(-heldVel.x * .06, -.6, .6); held.rot.x = THREE.MathUtils.clamp(heldVel.y * .04, -.5, .5);
        held.mesh.position.set(held.x, held.y, held.z); held.mesh.rotation.copy(held.rot);
      }
      return;
    }
    canvas.style.cursor = pickBell() ? 'pointer' : phase === 'done' && pickLetter() ? 'grab' : 'default';
  });
  const drop = (e: PointerEvent) => {
    if (!held) return; const l = held; held = undefined; canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    l.vx = THREE.MathUtils.clamp(heldVel.x, -9, 9); l.vy = THREE.MathUtils.clamp(heldVel.y, -9, 9); l.vz = 0; l.spin.set(-heldVel.y * .6, heldVel.x * .2, -heldVel.x * .8); l.mode = 'fly';
  };
  canvas.addEventListener('pointerup', drop); canvas.addEventListener('pointercancel', drop);
  canvas.addEventListener('touchstart', e => { const t = e.touches[0]; if (!t) return; pointer(t); if (pickBell() || (phase === 'done' && pickLetter())) e.preventDefault(); }, { passive: false });

  /* ----- Post ----- */
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .34, .45, .88); composer.addPass(bloom);
  const finish = new ShaderPass(FINISH); composer.addPass(finish); composer.addPass(new OutputPass());

  /* ----- Layout ----- */
  const camTarget = new THREE.Vector3(0, TOP + .46, ROW_Z - .4);
  let portrait = false;
  function layout() {
    const w = host.clientWidth, h = host.clientHeight; portrait = w < h * .9;
    renderer.setSize(w, h, false); composer.setPixelRatio(pixelRatio); composer.setSize(w, h); bloom.resolution.set(w * pixelRatio * .5, h * pixelRatio * .5);
    camera.aspect = w / h; camera.fov = portrait ? 46 : 30;
    camera.position.set(0, portrait ? 1.72 : 1.62, portrait ? 4.2 : 5.1); camera.lookAt(camTarget); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    bell.position.set(Math.min(visibleHalfWidth(ROW_Z) * (portrait ? .86 : .78), portrait ? 1.2 : 2.1), TOP, portrait ? ROW_Z - .28 : ROW_Z + .22);
    // On a tall screen the shade rises out of frame; its light and its cone stay.
    const lampY = portrait ? 3.35 : 2.3; LAMP.y = lampY;
    shade.position.set(LAMP.x, lampY - .02, LAMP.z); bulb.position.set(LAMP.x, lampY + .02, LAMP.z); cord.position.set(LAMP.x, lampY + 1.8, LAMP.z);
    spot.position.copy(LAMP); cone.position.set(LAMP.x, lampY - .68, LAMP.z); cone.scale.set(1, portrait ? 1.45 : 1, 1); cone.position.y = lampY - .68 * (portrait ? 1.45 : 1);
    (dust.material as THREE.ShaderMaterial).uniforms.uScale.value = renderer.getPixelRatio() * h / 900;
  }
  const project = (v: THREE.Vector3) => { const p = v.clone().project(camera); return { x: (p.x * .5 + .5) * canvas.clientWidth, y: (-p.y * .5 + .5) * canvas.clientHeight }; };

  /* ----- Loop ----- */
  let last = performance.now(), raf = 0, running = true, frameTimes: number[] = [], pointerX = 0, pointerY = 0, parallax = new THREE.Vector2(), repairedSent = false, filedSent = false;
  addEventListener('pointermove', e => { pointerX = e.clientX / innerWidth * 2 - 1; pointerY = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  let dim = 0;
  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; clock += dt;
    frameTimes.push(dt); if (frameTimes.length >= 60) { const avg = frameTimes.reduce((a, b) => a + b) / 60; frameTimes = []; if (avg > 1 / 42 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio * .85); renderer.setPixelRatio(pixelRatio); layout(); } }
    // A slow handheld drift and a touch of parallax with the pointer.
    parallax.lerp(new THREE.Vector2(pointerX, pointerY), 1 - Math.exp(-dt * 2));
    const base = portrait ? new THREE.Vector3(0, 1.72, 4.2) : new THREE.Vector3(0, 1.62, 5.1);
    camera.position.set(base.x + parallax.x * .18 + Math.sin(clock * .21) * .03, base.y - parallax.y * .08 + Math.sin(clock * .17) * .02, base.z); camera.lookAt(camTarget);
    if (font) {
      if (phase === 'dropping' && letters.every(l => l.mode === 'rest') && repairAt === Infinity) repairAt = clock + .9;
      if (phase === 'dropping' && clock >= repairAt) startRepair();
      letters.forEach(l => { if (l !== held) step(l, dt); });
      if (phase === 'repairing' && clock >= doneAt && letters.every(l => ['rest', 'gone'].includes(l.mode))) { phase = 'done'; tagT = 0; }
      // Once repaired: a slow glint runs along the corrected word.
      if (phase === 'done') letters.forEach((l, i) => { const k = Math.max(0, 1 - Math.abs((clock - doneAt) * 4 - i * .35)); l.mat.emissiveIntensity = l.fresh ? k * .14 : 0; });
      if (phase === 'done' && !repairedSent) {
        repairedSent = true; letters.forEach(l => l.fresh = l.fresh || !!target);
        o.onRepaired?.(project(new THREE.Vector3(0, TOP - .02, ROW_Z + .55)));
      }
    }
    // The visitor's tag: swings in beside the word, hangs a moment, then is filed on the shelf.
    if (tagT >= 0) {
      tagT += dt;
      const hang = new THREE.Vector3(Math.min((target ? slotsTarget : slotsTypo).at(-1)! + S * 1.4 + .35, visibleHalfWidth(ROW_Z) - .45), TOP + .62, ROW_Z + .12);
      if (portrait) hang.set(visibleHalfWidth(ROW_Z) * .42, TOP + .5, ROW_Z + .05);
      const anchor = hang.clone().add(new THREE.Vector3(0, .55, 0));
      let p = hang.clone(), swing = 0;
      if (tagT < .9) { const e = ease(tagT / .9); p.y = THREE.MathUtils.lerp(TOP + 2.2, hang.y, e); swing = (1 - e) * .8; }
      else if (tagT < 3.6) swing = Math.sin((tagT - .9) * 4.2) * .35 * Math.exp(-(tagT - .9) * 1.2);
      else {
        const e = ease(Math.min(1, (tagT - 3.6) / 1.3)); p = hang.clone().lerp(shelfSlot, e); p.y += Math.sin(Math.PI * e) * .5;
        if (tagT - dt < 3.6) sound.swish();
        if (e >= 1 && !filedSent) { filedSent = true; o.onFiled?.(tagNumber); }
      }
      const s = tagT < 3.6 ? 1 : THREE.MathUtils.lerp(1, .5, ease(Math.min(1, (tagT - 3.6) / 1.3)));
      myTag.visible = true; myTag.position.copy(p); myTag.scale.setScalar(s * (portrait ? .7 : 1)); myTag.rotation.set(-.05, -.25, swing);
      myString.visible = tagT < 3.6; (myString.geometry as THREE.BufferGeometry).setFromPoints([anchor, p.clone().add(new THREE.Vector3(-.27 * s * Math.cos(swing), .0, 0))]);
    }
    // Bell plunger, lamp flicker, dust gust.
    belled = Math.max(0, belled - dt * 5); plunger.position.y = .14 - belled * .025;
    flickerT = Math.max(0, flickerT - dt); const flicker = flickerT > 0 ? .75 + .25 * Math.sin(clock * 90) * Math.sin(clock * 37) : 1;
    spot.intensity = 38 * flicker; (bulb.material as THREE.MeshBasicMaterial).color.setRGB(6 * flicker, 4.2 * flicker, 2.4 * flicker);
    const du = (dust.material as THREE.ShaderMaterial).uniforms; du.uTime.value = clock; du.uGust.value *= Math.exp(-dt * 1.5);
    finish.uniforms.uTime.value = clock; finish.uniforms.uDim.value = dim;
    composer.render(dt);
  }

  const loader = new FontLoader();
  loader.load('/type/rb-space-560.typeface.json', f => { font = f; build(); }, undefined, () => { /* no font: the scene stays a room */ });
  layout();
  const ro = new ResizeObserver(() => { const wasS = S; layout(); fitSize(); if (font && Math.abs(S - wasS) > .01) { if (phase === 'done' || o.reduced) finishInstantly(); else build(); } }); ro.observe(host);
  const io = new IntersectionObserver(([en]) => { const on = en.isIntersecting && !document.hidden; if (on && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } else if (!on && running) { running = false; cancelAnimationFrame(raf); } });
  io.observe(host);
  document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (document.hidden) running = false; else { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } });
  raf = requestAnimationFrame(tick);
  requestAnimationFrame(() => host.classList.add('is-live'));
  return {
    ring,
    /** 0 at the top of the page, 1 once the visitor has scrolled into the list. */
    scroll(v: number) { dim = THREE.MathUtils.clamp(v, 0, 1); canvas.style.pointerEvents = v > .4 ? 'none' : 'auto'; },
    relabel() { paintMyTag(); myTagTex.needsUpdate = true; },
    anchor() { return project(new THREE.Vector3(0, TOP - .02, ROW_Z + .55)); },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); composer.dispose(); renderer.dispose(); pmrem.dispose(); },
  };
}
