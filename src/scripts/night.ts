// A private scene, opened from the Model Room's hidden portal: a night in front of the house of a future
// life. Lida walks up a path of lanterns (the camera is her eyes) while the windows of the house light up
// one after another; Rodion waits at the door inside a heart of rose petals and candles, tells her this is
// their future life, goes down on one knee and asks. The astronaut came through the portal too: he walks
// ahead, reacts to everything, and when she says yes he takes out his camera for two photos of the two of
// them, one smiling and one kissing, which she can keep.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createAstronaut } from './observatory-astronaut';
import { bubble, TINT, type Emote } from './model-room-guide';
import { createPerson, LIDA, RODION, type Pose } from './night-people';
import { createNightSound } from './night-sound';
import { createWorld, glowTexture } from './night-world';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
// Where things stand: the house's glass front is at z ≈ 8.9 under a roof reaching to 11.4; he waits on the
// terrace in front of it. The camera is her eyes: she is 1.55 m tall.
const EYE = 1.45;
const HIM = V(0, 0, 13.4), HER_STOP = V(0, EYE, 16.9), PATH_START = V(0, EYE, 38.5);
const LINES = {
  future: 'Это наша будущая жизнь.',
  believe: 'Ты только верь в нас, любимая Лида!',
  ask: 'Лида, ты выйдешь за меня?',
};

function heartTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!;
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(32, 56);
  x.bezierCurveTo(4, 36, 4, 12, 20, 10); x.bezierCurveTo(28, 9, 32, 16, 32, 20); x.bezierCurveTo(32, 16, 36, 9, 44, 10); x.bezierCurveTo(60, 12, 60, 36, 32, 56); x.fill();
  return new THREE.CanvasTexture(c);
}

// The finish: a gentle grade (cool shadows, warm light), vignette, a fine film grain, a touch of lens fringing.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uFade: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uFade; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec2 q = vUv - .5; float r = dot(q, q);
      vec2 off = q * r * .012;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float l = dot(c, vec3(.2126, .7152, .0722));
      c = mix(c * vec3(.92, .98, 1.08), c * vec3(1.06, 1., .9), smoothstep(.05, .6, l));
      c *= 1. - .5 * smoothstep(.12, .75, r * 1.7);
      c += (h(vUv * 900. + fract(uTime) * 91.) - .5) * .022;
      gl_FragColor = vec4(c * (1. - uFade), 1.); }`,
};

export async function mountNight(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(name: string) => root.querySelector<T>(`[data-n-${name}]`)!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(pointer: coarse), (max-width: 760px)').matches;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#0a0d1b', .0085);
  const camera = new THREE.PerspectiveCamera(42, 1, .05, 500);
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('stage').append(renderer.domElement);
  // Post: multisampled HDR buffer → ambient occlusion → bloom → depth of field → grade → output.
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 });
  const composer = new EffectComposer(renderer, target); composer.addPass(new RenderPass(scene, camera));
  let ao: GTAOPass | null = null, dof: BokehPass | null = null;
  if (!mobile) {
    ao = new GTAOPass(scene, camera, 1, 1);
    ao.updateGtaoMaterial({ radius: .35, distanceExponent: 1.5, thickness: 1, scale: 1, samples: 12 }); ao.blendIntensity = .9;
    const pass = ao as unknown as { _overrideVisibility: () => void; _visibilityCache: THREE.Object3D[]; scene: THREE.Scene };
    const hideLines = pass._overrideVisibility.bind(pass);
    pass._overrideVisibility = () => {
      hideLines();
      pass.scene.traverse(object => {
        if (!object.visible) return;
        const mat = (object as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        const seeThrough = (object as THREE.Sprite).isSprite || (object as THREE.Points).isPoints || (mat && (Array.isArray(mat) ? mat.some(m => m.transparent || m.alphaTest > 0) : mat.transparent || mat.alphaTest > 0));
        if (seeThrough) { object.visible = false; pass._visibilityCache.push(object); }
      });
    };
    composer.addPass(ao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .55, .55, .88); composer.addPass(bloom);
  if (!mobile) { dof = new BokehPass(scene, camera, { focus: 20, aperture: .0006, maxblur: .0045 }); composer.addPass(dof); }
  const grade = new ShaderPass(GradeShader); composer.addPass(grade);
  composer.addPass(new OutputPass());
  const forced = new URLSearchParams(location.search).get('q');
  let quality = forced ? +forced : mobile ? 2 : 0, frames = 0, frameTime = -1;   // the first second is warm-up
  function applyQuality(level: number) {
    quality = level;
    if (ao) ao.enabled = level === 0;
    if (dof) dof.enabled = level === 0;
    // Below the top level: no multisampling (the grade's grain hides the edges), no moon shadows.
    if (level > 0) for (const rt of [composer.renderTarget1, composer.renderTarget2]) if (rt.samples) { rt.samples = 0; rt.dispose(); }
    world.moonLight.castShadow = level < 2;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, [2, 1.25, 1][level])); resize();
    world.setQuality(level);
  }
  function resize() {
    const w = root.clientWidth, h = root.clientHeight; renderer.setSize(w, h); composer.setSize(w, h); ao?.setSize(w, h);
    camera.aspect = w / Math.max(1, h); camera.fov = w / h < .8 ? 60 : 42; camera.updateProjectionMatrix();
  }
  resize(); const ro = new ResizeObserver(resize); ro.observe(root);

  const draco = new DRACOLoader(); draco.setDecoderPath('/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const world = createWorld({ scene, renderer, loader, mobile });
  applyQuality(quality);

  // Fireflies drifting over the grass and the water.
  const FLIES = mobile ? 70 : 180, fp = new Float32Array(FLIES * 3), fseed = Array.from({ length: FLIES }, () => Math.random() * 100);
  const flyGeo = new THREE.BufferGeometry(); flyGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ size: .06, color: new THREE.Color(2.6, 2, .8), map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  scene.add(flies);

  // ── The heart of petals and candles where he waits ──────────────────────────────────────────────────
  const PETALS = mobile ? 220 : 420;
  const petalGeo = new THREE.SphereGeometry(.03, 8, 4, 0, Math.PI * 2, 0, Math.PI * .35); petalGeo.scale(1, .35, .75);
  const petals = new THREE.InstancedMesh(petalGeo, new THREE.MeshPhysicalMaterial({ color: '#9c0f25', roughness: .55, side: THREE.DoubleSide, sheen: 1, sheenColor: new THREE.Color('#ff4f6d'), sheenRoughness: .4 }), PETALS);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < PETALS; i++) {
    const t = (i / PETALS) * Math.PI * 2, jitter = (Math.random() - .5) * .14;
    // The heart curve, about 2.6 m across, pointing towards her.
    const hx = 16 * Math.pow(Math.sin(t), 3), hz = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const x = HIM.x + hx * .08 + jitter, z = HIM.z + .3 - hz * .08 + jitter;
    e.set((Math.random() - .5) * .6, Math.random() * Math.PI * 2, (Math.random() - .5) * .6); q.setFromEuler(e);
    m4.compose(V(x, .005 + Math.random() * .012, z), q, V(1, 1, 1).multiplyScalar(.8 + Math.random() * .7)); petals.setMatrixAt(i, m4);
  }
  petals.receiveShadow = true; scene.add(petals);
  const wax = new THREE.MeshPhysicalMaterial({ color: '#f3e9d8', roughness: .45, sheen: .5, sheenColor: new THREE.Color('#ffd9a8'), emissive: '#5a3312', emissiveIntensity: 0 });
  const flameMat = new THREE.SpriteMaterial({ map: glowTexture('rgba(255,236,190,1)', 'rgba(255,150,60,.5)'), color: new THREE.Color(2.6, 1.7, .7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const flames: THREE.Sprite[] = [];
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * Math.PI * 2, hx = 16 * Math.pow(Math.sin(t), 3), hz = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const x = HIM.x + hx * .1, z = HIM.z + .3 - hz * .1, h = .08 + (i % 3) * .05;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, h, 16), wax); c.position.set(x, h / 2, z); c.castShadow = true; scene.add(c);
    const f = new THREE.Sprite(flameMat); f.position.set(x, h + .035, z); f.scale.set(.09, .14, 1); scene.add(f); flames.push(f);
  }
  const candleLight = new THREE.PointLight('#ffa552', 0, 6, 2); candleLight.position.set(HIM.x, .45, HIM.z + .5); scene.add(candleLight);
  const keyLight = new THREE.SpotLight('#ffe0bd', 0, 18, .38, .75, 1.4); keyLight.position.set(2.2, 5.2, HIM.z + 5.5); keyLight.target.position.set(HIM.x, 1.1, HIM.z); keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); keyLight.shadow.bias = -.0002; keyLight.shadow.normalBias = .015; scene.add(keyLight, keyLight.target);

  // ── The people ──────────────────────────────────────────────────────────────────────────────────────
  const [him, her] = await Promise.all([
    createPerson(loader, mobile ? '/models/night/rodion.mobile.glb' : '/models/night/rodion.glb', RODION, true),
    createPerson(loader, mobile ? '/models/night/lida.mobile.glb' : '/models/night/lida.glb', LIDA),
  ]);
  him.root.position.copy(HIM); scene.add(him.root);
  her.root.position.set(HIM.x - .5, 0, HIM.z + .2); her.root.visible = false; scene.add(her.root);
  const himPose: Partial<Pose> = {}, herPose: Partial<Pose> = {};
  const houseReady = world.ready;

  // ── The astronaut ───────────────────────────────────────────────────────────────────────────────────
  const astro = createAstronaut();
  const astroReady = Promise.race([astro.load().catch(() => {}), new Promise(r => setTimeout(r, 6000))]).then(() => {
    astro.root.updateMatrixWorld(true);
    const hb = new THREE.Box3().setFromObject(astro.root), h = hb.max.y - hb.min.y; if (h > .5) astro.root.scale.multiplyScalar(1.8 / h);
    astro.root.position.set(.75, 0, PATH_START.z - 1.6); astro.root.rotation.y = Math.PI; scene.add(astro.root);
  });
  const bubbles = new Map<Emote, THREE.CanvasTexture>();
  const bubbleSprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0 })); bubbleSprite.renderOrder = 5; scene.add(bubbleSprite);
  let emoteAt = -9, emoteKind: Emote | null = null;
  const visorGoal = new THREE.Color('#9fb6d0');
  const sound = createNightSound();
  function emote(kind: Emote) {
    if (!bubbles.has(kind)) bubbles.set(kind, bubble(kind));
    bubbleSprite.material.map = bubbles.get(kind)!; bubbleSprite.material.needsUpdate = true; emoteAt = clock; emoteKind = kind; visorGoal.set(TINT[kind]);
    sound.chirp(!['dots', 'think', 'tired', 'clock'].includes(kind));
  }
  const astroPose = { yaw: 0, pitch: -.08, wave: 0, sit: 0, tablet: 0, reach: 0, float: 0 };
  let astroGoal: Partial<typeof astroPose> = {}, astroTarget: THREE.Vector3 | null = null, astroLook: THREE.Vector3 | null = null, astroWalk = 0, astroPhase = 0;

  // ── Celebration: hearts rising around them and bursts of light in the sky ──────────────────────────
  const HEARTS = mobile ? 120 : 260, hp = new Float32Array(HEARTS * 3), hv = new Float32Array(HEARTS * 3), hc = new Float32Array(HEARTS * 3);
  const heartGeo = new THREE.BufferGeometry(); heartGeo.setAttribute('position', new THREE.BufferAttribute(hp, 3)); heartGeo.setAttribute('color', new THREE.BufferAttribute(hc, 3));
  const hearts = new THREE.Points(heartGeo, new THREE.PointsMaterial({ size: .16, map: heartTexture(), vertexColors: true, transparent: true, depthWrite: false, opacity: 0, alphaTest: .1, toneMapped: false }));
  hearts.frustumCulled = false; scene.add(hearts);
  const BURST = 90, bursts: { pts: THREE.Points; v: Float32Array; at: number }[] = [];
  function firework(at: THREE.Vector3, color: THREE.Color) {
    const p = new Float32Array(BURST * 3), v = new Float32Array(BURST * 3);
    for (let i = 0; i < BURST; i++) { const d = V(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(5 + Math.random() * 3); p.set([at.x, at.y, at.z], i * 3); v.set([d.x, d.y, d.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .5, color: color.clone().multiplyScalar(2.5), map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
    pts.frustumCulled = false; scene.add(pts); bursts.push({ pts, v, at: clock }); sound.sparkle(5);
  }

  // ── The story, beat by beat ─────────────────────────────────────────────────────────────────────────
  type Phase = 'intro' | 'walk' | 'speak' | 'ask' | 'yes' | 'photo' | 'end';
  let phase: Phase = 'intro', phaseAt = 0, clock = 0, last = performance.now(), frame = 0, disposed = false;
  const sub = $('sub'), answer = $('answer'), viewfinder = $('viewfinder'), count = $('count'), flash = $('flash');
  const shots: string[] = [];
  let say = '', sayUntil = 0;
  function subtitle(text: string, seconds: number) { say = text; sayUntil = clock + seconds; sub.textContent = text; sub.classList.add('is-on'); }
  const camPos = PATH_START.clone(), camLook = V(0, 2.2, 0), lookGoal = V(0, 2.2, 0);
  let beatIndex = 0;
  type Beat = { at: number; run: () => void };
  const beats: Record<Phase, Beat[]> = {
    intro: [], end: [],
    walk: [
      { at: 1, run: () => { emote('hi'); astroGoal = { wave: 1 }; setTimeout(() => (astroGoal = {}), 1800); } },
      { at: 3.5, run: () => { astroTarget = V(mobile ? .55 : 1.35, 0, 14.5); } },   // beside him, where she can see him
      { at: 7, run: () => emote('wow') },
      { at: 11.5, run: () => emote('love') },
    ],
    speak: [
      { at: .8, run: () => subtitle(LINES.future, 4.2) },
      { at: 5.4, run: () => subtitle(LINES.believe, 4.6) },
      { at: 6.4, run: () => { emote('love'); sound.sparkle(4); } },
      { at: 10.4, run: () => go('ask') },
    ],
    ask: [
      { at: .2, run: () => { Object.assign(himPose, { kneel: 1 }); emote('wow'); } },
      { at: 1.4, run: () => { Object.assign(himPose, { offer: 1 }); } },
      { at: 2.3, run: () => { ringOpenAt = clock; sound.sparkle(7); } },
      { at: 3.2, run: () => { subtitle(LINES.ask, 1e6); } },
      { at: 4.4, run: () => { answer.hidden = false; requestAnimationFrame(() => answer.classList.add('is-on')); } },
      { at: 9, run: () => emote('dots') },
      { at: 16, run: () => emote('curious') },
    ],
    yes: [
      { at: .1, run: () => { sub.classList.remove('is-on'); emote('love'); sound.celebrate(); heartsAt = clock; seedHearts(); } },
      { at: .8, run: () => { Object.assign(himPose, { kneel: 0, offer: 0 }); } },
      { at: 1.2, run: () => firework(V(-9, 16, -4), new THREE.Color('#ffcf7a')) },
      { at: 2, run: () => { emote('happy'); astroGoal = { float: .5 }; } },
      { at: 2.3, run: () => firework(V(8, 19, -8), new THREE.Color('#ff8fb1')) },
      { at: 3.4, run: () => firework(V(-2, 22, -14), new THREE.Color('#9fe8ff')) },
      { at: 4.2, run: () => { astroGoal = {}; firework(V(11, 15, -2), new THREE.Color('#ffd9f0')); } },
      { at: 5.4, run: () => { emote('photo'); astroGoal = { tablet: 1 }; } },
      { at: 7.4, run: () => go('photo') },
    ],
    photo: [
      { at: .1, run: () => { viewfinder.hidden = false; requestAnimationFrame(() => viewfinder.classList.add('is-on')); } },
      { at: 1.2, run: () => countdown(() => shoot('smile')) },
      { at: 6.2, run: () => { Object.assign(himPose, { lean: 1, hold: 0 }); Object.assign(herPose, { lean: .7, tiptoe: 1, hold: 0 }); kissing = true; } },
      { at: 7.4, run: () => countdown(() => shoot('kiss'), 2) },
      { at: 11, run: () => go('end') },
    ],
  };
  let ringOpenAt = -1, heartsAt = -1, capture: ((url: string) => void) | null = null, kissing = false;
  function go(next: Phase) { phase = next; phaseAt = clock; beatIndex = 0; root.dataset.phase = next; if (next === 'photo') setupPhoto(); if (next === 'end') showEnd(); }
  function countdown(done: () => void, from = 3) {
    let n = from; count.textContent = String(n); count.classList.add('is-on');
    const tick = () => { n--; if (n > 0) { count.textContent = String(n); setTimeout(tick, 700); } else { count.classList.remove('is-on'); done(); } };
    setTimeout(tick, 700);
  }
  function shoot(kind: 'smile' | 'kiss') {
    sound.shutter();
    capture = url => { shots.push(url); flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on'); if (kind === 'kiss') { heartsAt = clock; seedHearts(her.root.position.clone().lerp(him.root.position, .5).setY(1.7), .35); } };
  }
  // The photos: the couple side by side in front of the glowing house, seen through the astronaut's camera.
  function setupPhoto() {
    her.root.visible = true;
    him.root.position.set(HIM.x + .3, 0, HIM.z + .4); her.root.position.set(HIM.x - .3, 0, HIM.z + .4);
    him.root.rotation.y = -.12; her.root.rotation.y = .12;
    Object.assign(himPose, { kneel: 0, offer: 0, hold: 1 }); Object.assign(herPose, { hold: 1 });
    astro.root.visible = false; bubbleSprite.material.opacity = 0;
  }
  function seedHearts(from = V(HIM.x, .6, HIM.z + .4), spread = 1.4) {
    const pink = [new THREE.Color(2.2, .5, .8), new THREE.Color(2.4, 1.1, 1.4), new THREE.Color(2.4, 1.8, 1.2)];
    for (let i = 0; i < HEARTS; i++) {
      hp.set([from.x + (Math.random() - .5) * spread * 2, from.y + Math.random() * .6, from.z + (Math.random() - .5) * spread], i * 3);
      hv.set([(Math.random() - .5) * .5, .5 + Math.random() * 1.1, (Math.random() - .5) * .5], i * 3);
      const c = pink[i % 3]; hc.set([c.r, c.g, c.b], i * 3);
    }
    heartGeo.attributes.color.needsUpdate = true;
  }
  function showEnd() {
    viewfinder.classList.remove('is-on'); setTimeout(() => (viewfinder.hidden = true), 600);
    const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const cards = shots.map((url, i) => polaroid(url, i ? 'Родион + Лида' : 'Мы', date));
    Promise.all(cards).then(urls => {
      const list = $('photos'); list.replaceChildren(...urls.map((u, i) => { const img = new Image(); img.src = u; img.alt = i ? 'Фото: поцелуй' : 'Фото: мы вместе'; img.style.setProperty('--tilt', `${i ? 3 : -4}deg`); return img; }));
      ($('save') as HTMLButtonElement).onclick = () => urls.forEach((u, i) => { const a = document.createElement('a'); a.href = u; a.download = `rodion-lida-${i + 1}.jpg`; document.body.append(a); a.click(); a.remove(); });
      $('end').hidden = false; requestAnimationFrame(() => $('end').classList.add('is-on'));
    });
  }
  /** A photo made into a polaroid: a square crop of the frame on white card, with a caption and the date. */
  function polaroid(url: string, caption: string, date: string) {
    return new Promise<string>(resolve => {
      const img = new Image(); img.onload = () => {
        const c = document.createElement('canvas'); c.width = 900; c.height = 1080; const x = c.getContext('2d')!;
        x.fillStyle = '#f7f3ec'; x.fillRect(0, 0, 900, 1080);
        const side = Math.min(img.width, img.height) * .92, sx = (img.width - side) / 2, sy = (img.height - side) / 2 - img.height * .02;
        x.drawImage(img, sx, Math.max(0, sy), side, side, 50, 50, 800, 800);
        x.fillStyle = '#2b2622'; x.textAlign = 'center';
        const face = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'Georgia, serif';
        x.font = `300 54px ${face}`; x.fillText(caption, 450, 945);
        x.fillStyle = '#8a7f73'; x.font = `300 26px ${face}`; x.fillText(date, 450, 1000);
        resolve(c.toDataURL('image/jpeg', .9));
      }; img.src = url;
    });
  }

  // ── Every frame ─────────────────────────────────────────────────────────────────────────────────────
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function astroUpdate(dt: number) {
    if (!astro.root.parent || !astro.root.visible) return;
    const r = astro.root; let moving = false;
    if (astroTarget) {
      tmp.subVectors(astroTarget, r.position).setY(0); const d = tmp.length();
      if (d > .05) { r.position.addScaledVector(tmp.normalize(), Math.min(d, 1.25 * dt)); moving = true; const want = Math.atan2(tmp.x, tmp.z); r.rotation.y += Math.atan2(Math.sin(want - r.rotation.y), Math.cos(want - r.rotation.y)) * Math.min(1, dt * 5); }
      else astroTarget = null;
    }
    if (phase === 'walk' && !astroTarget && clock - phaseAt < 3.5) {
      // At the start he walks a little ahead of her, down the path.
      const ahead = camPos.z - 2.6; if (r.position.z > ahead) { r.position.z = Math.max(ahead, r.position.z - 1.3 * dt); moving = true; }
    }
    if (!moving) {
      // Standing: face between her and him, look at whoever is speaking.
      const look = astroLook ?? (phase === 'walk' ? V(0, 2, 8) : V(HIM.x, 1.5, HIM.z));
      const want = Math.atan2(look.x - r.position.x, look.z - r.position.z); r.rotation.y += Math.atan2(Math.sin(want - r.rotation.y), Math.cos(want - r.rotation.y)) * Math.min(1, dt * 3);
    }
    astroWalk += ((moving ? 1 : 0) - astroWalk) * Math.min(1, dt * 4);
    const goal = { yaw: .3 * Math.sin(clock * .7), pitch: -.1, wave: 0, sit: 0, tablet: 0, reach: 0, float: 0, ...astroGoal };
    if (phase === 'ask' && clock - phaseAt > 5) goal.yaw = .5 * Math.sin(clock * 1.3);   // glancing from him to her and back, nervous
    for (const k of Object.keys(astroPose) as (keyof typeof astroPose)[]) astroPose[k] += ((goal[k] ?? 0) - astroPose[k]) * Math.min(1, dt * 4);
    // A little hop for joy.
    r.position.y = astroGoal.float ? Math.abs(Math.sin(clock * 6)) * .22 : 0;
    astroPhase += dt * (1 + astroWalk * 5);
    astro.animate(astroPhase, astroWalk, 0, dt, 0, astroPose);
    const age = clock - emoteAt;
    if (emoteKind && age < 2.6) {
      bubbleSprite.scale.setScalar(.42 * (age < .35 ? 1.18 * Math.sin(age / .35 * Math.PI / 2) : 1 + .05 * Math.sin(age * 5)));
      bubbleSprite.position.set(r.position.x, r.position.y + 2.2 + age * .06, r.position.z);
      bubbleSprite.material.opacity = Math.min(1, age * 5) * (1 - THREE.MathUtils.smoothstep(age, 2, 2.6));
    } else bubbleSprite.material.opacity = 0;
    const visor = r.userData.visorUniforms?.uVisorTint?.value as THREE.Color | undefined;
    if (visor) { visor.lerp(visorGoal, Math.min(1, dt * 2)); if (age > 2.6) visorGoal.lerp(new THREE.Color('#9fb6d0'), dt * .5); }
  }

  function tick(now: number) {
    frame = 0; if (disposed) return;
    const dt = Math.min(.1, (now - last) / 1000); last = now; clock += dt;
    // Quality: measured while the intro card is up (and early in the walk); stepped down until it runs smoothly.
    if (!forced && quality < 2 && (phase === 'intro' || (phase === 'walk' && clock - phaseAt < 4))) {
      frames++; frameTime += dt;
      if (frameTime > 1.6) { const fps = frames / frameTime; frames = 0; frameTime = 0; if (fps < 42) applyQuality(quality + 1); }
    }
    // A beat may start the next phase: its own beats then count from that moment, not this one.
    while (beatIndex < beats[phase].length && clock - phaseAt >= beats[phase][beatIndex].at) beats[phase][beatIndex++].run();
    const local = clock - phaseAt;
    if (say && clock > sayUntil) { sub.classList.remove('is-on'); say = ''; }

    // Her walk up the path (the camera), then her eyes on him; for the photos, the astronaut's camera.
    if (phase === 'intro') { camPos.set(Math.sin(clock * .05) * 4, 4.2, 47); lookGoal.set(0, 2.4, 10); }
    else if (phase === 'walk') {
      const k = Math.min(1, local / 14), e = k * k * (3 - 2 * k);
      camPos.lerpVectors(PATH_START, HER_STOP, e); camPos.y = EYE + Math.sin(local * 5.2) * .012 * (1 - k);   // a gentle step
      lookGoal.set(0, THREE.MathUtils.lerp(2.4, 1.6, e), THREE.MathUtils.lerp(8, HIM.z, e));
      if (k >= 1) go('speak');
    } else if (phase === 'speak') { camPos.lerp(HER_STOP, dt); lookGoal.set(HIM.x, 1.62, HIM.z); }
    else if (phase === 'ask' || phase === 'yes') {
      const down = phase === 'ask' ? Math.min(1, local / 2) : Math.max(0, 1 - local / 1.5);
      camPos.lerp(V(0, EYE - down * .08, HER_STOP.z - .8 * down), Math.min(1, dt * 1.5)); lookGoal.set(HIM.x, 1.62 - down * .55, HIM.z);
      if (phase === 'yes' && local > 5) lookGoal.set(astro.root.position.x, 1.5, astro.root.position.z);
    } else if (phase === 'photo' || phase === 'end') { camPos.lerp(V(0, 1.5, HIM.z + 3.3), Math.min(1, dt * 3)); lookGoal.set(0, 1.42, HIM.z + .4); }
    camera.position.copy(camPos); camLook.lerp(lookGoal, Math.min(1, dt * 2.2)); camera.lookAt(camLook);

    // The house wakes up as she comes near; lanterns light behind and ahead of her.
    const glowT = phase === 'intro' ? 0 : phase === 'walk' ? local : 99;
    world.update(clock, glowT, camPos.z, phase === 'intro');
    const warm = phase === 'intro' ? 0 : THREE.MathUtils.smoothstep(glowT, 6, 11);
    candleLight.intensity = warm * 2.6; keyLight.intensity = warm * 26; wax.emissiveIntensity = warm * .5;
    flames.forEach((f, i) => { const k = warm * (.85 + .15 * Math.sin(clock * 13 + i * 2.1) * Math.sin(clock * 7.3 + i)); f.scale.set(.09 * k, .14 * k, 1); });
    for (let i = 0; i < FLIES; i++) { const s = fseed[i]; fp.set([Math.sin(clock * .3 + s) * (4 + (s % 9)), .3 + (s % 1.6) + Math.sin(clock * .8 + s * 3) * .25, 15 + (s % 22) + Math.cos(clock * .25 + s) * 2], i * 3); }
    flyGeo.attributes.position.needsUpdate = true;

    if (ringOpenAt >= 0) him.ring?.open(Math.min(1, (clock - ringOpenAt) / .8));
    // Where they look: he at her (the camera) while he speaks and asks; both into the lens for the photo;
    // at each other for the kiss.
    if (kissing) { him.look?.(her.head?.(tmp) ?? null); her.look?.(him.head?.(tmp2) ?? null); }
    else if (phase === 'photo' || phase === 'end') { him.look?.(camera.position); her.look?.(camera.position); }
    else if (phase !== 'intro') him.look?.(camera.position);
    him.pose(himPose, dt); her.pose(herPose, dt);
    if (kissing) {
      // Turning to each other for the kiss.
      him.root.rotation.y += (-Math.PI / 2 * .78 - him.root.rotation.y) * Math.min(1, dt * 2.5);
      her.root.rotation.y += (Math.PI / 2 * .78 - her.root.rotation.y) * Math.min(1, dt * 2.5);
      him.root.position.x += (HIM.x + .17 - him.root.position.x) * Math.min(1, dt * 2); her.root.position.x += (HIM.x - .17 - her.root.position.x) * Math.min(1, dt * 2);
    }
    // Focus: on him, on the two of them for the photos.
    if (dof) { const u = dof.uniforms as Record<string, { value: number }>; const d = camera.position.distanceTo(tmp.set(HIM.x, 1.4, HIM.z + (phase === 'photo' || phase === 'end' ? .4 : 0))); u.focus.value += (d - u.focus.value) * Math.min(1, dt * 3); }
    grade.uniforms.uTime.value = clock;
    astroUpdate(dt);

    if (heartsAt >= 0) {
      const age = clock - heartsAt; (hearts.material as THREE.PointsMaterial).opacity = Math.min(1, age * 3) * (1 - THREE.MathUtils.smoothstep(age, 4.5, 6.5));
      for (let i = 0; i < HEARTS; i++) { const j = i * 3; hp[j] += (hv[j] + Math.sin(clock * 2 + i) * .15) * dt; hp[j + 1] += hv[j + 1] * dt * .6; hp[j + 2] += hv[j + 2] * dt; }
      heartGeo.attributes.position.needsUpdate = true;
    }
    for (const b of bursts) {
      const age = clock - b.at, pos = b.pts.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < BURST; i++) { const j = i * 3; pos.array[j] += b.v[j] * dt * Math.exp(-age * 1.4); pos.array[j + 1] += (b.v[j + 1] * Math.exp(-age * 1.4) - 1.2 * age) * dt; pos.array[j + 2] += b.v[j + 2] * dt * Math.exp(-age * 1.4); }
      pos.needsUpdate = true; (b.pts.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - age / 2.4);
    }

    composer.render();
    if (capture) { const done = capture; capture = null; done(renderer.domElement.toDataURL('image/jpeg', .92)); }
    frame = requestAnimationFrame(tick);
  }

  // ── Start ───────────────────────────────────────────────────────────────────────────────────────────
  await Promise.all([houseReady.catch(() => {}), astroReady]);
  if (disposed) return () => {};
  // Compile everything while the intro card is up.
  renderer.setRenderTarget(composer.readBuffer); const compiling = renderer.compileAsync(scene, camera).catch(() => {}); renderer.setRenderTarget(null); await compiling;
  $('loading').hidden = true; root.dataset.state = 'ready';
  const start = $('start') as HTMLButtonElement; start.disabled = false; start.focus({ preventScroll: true });
  start.addEventListener('click', () => {
    sound.start(); $('intro').classList.add('is-gone'); setTimeout(() => ($('intro').hidden = true), 1200);
    go('walk');
  }, { once: true });
  answer.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    answer.classList.remove('is-on'); setTimeout(() => (answer.hidden = true), 500); go('yes');
  }));
  $('replay').addEventListener('click', () => location.reload());
  if (location.search.includes('ndebug')) (window as unknown as { __night: unknown }).__night = { scene, camera, him, her, himPose, herPose, go, renderer, composer, kiss: () => { Object.assign(himPose, { lean: 1, hold: 0 }); Object.assign(herPose, { lean: .7, tiptoe: 1, hold: 0 }); kissing = true; } };
  frame = requestAnimationFrame(tick);
  if (reduced) { /* the story plays as it is: it is short and calm; no parallax, no shake */ }

  return () => {
    disposed = true; cancelAnimationFrame(frame); ro.disconnect(); sound.dispose(); draco.dispose(); astro.dispose(); him.dispose(); her.dispose();
    world.dispose(); target.dispose(); composer.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}
