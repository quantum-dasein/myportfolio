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
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createAstronaut } from './observatory-astronaut';
import { bubble, TINT, type Emote } from './model-room-guide';
import { createPerson, LIDA, RODION, type Pose } from './night-people';
import { createNightSound } from './night-sound';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
// Where things stand: the house's south glass front is at z ≈ 11.4; he waits in front of its door.
const HIM = V(0, 0, 13.4), HER_STOP = V(0, 1.62, 17.4), PATH_START = V(0, 1.62, 38);
const LINES = {
  future: 'Это наша будущая жизнь.',
  believe: 'Ты только верь в нас, любимая Лида!',
  ask: 'Лида, ты выйдешь за меня?',
};

function glowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,.35)') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, inner); g.addColorStop(.3, mid); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function heartTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!;
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(32, 56);
  x.bezierCurveTo(4, 36, 4, 12, 20, 10); x.bezierCurveTo(28, 9, 32, 16, 32, 20); x.bezierCurveTo(32, 16, 36, 9, 44, 10); x.bezierCurveTo(60, 12, 60, 36, 32, 56); x.fill();
  return new THREE.CanvasTexture(c);
}

export async function mountNight(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(name: string) => root.querySelector<T>(`[data-n-${name}]`)!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(pointer: coarse), (max-width: 760px)').matches;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#0a0d1b', .011);
  const camera = new THREE.PerspectiveCamera(50, 1, .05, 400);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = !mobile; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('stage').append(renderer.domElement);
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .4, .5, .9); composer.addPass(bloom); composer.addPass(new OutputPass());
  function resize() {
    const w = root.clientWidth, h = root.clientHeight; renderer.setSize(w, h); composer.setSize(w, h);
    camera.aspect = w / Math.max(1, h); camera.fov = w / h < .8 ? 66 : 50; camera.updateProjectionMatrix();
  }
  resize(); const ro = new ResizeObserver(resize); ro.observe(root);

  // ── The night: a dusky sky with stars and a moon ────────────────────────────────────────────────────
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec3 vP; void main(){ float h = clamp(vP.y, -.1, 1.);
      vec3 horizon = vec3(.23,.13,.25), glow = vec3(.45,.24,.3), zenith = vec3(.015,.025,.07);
      vec3 c = mix(horizon, zenith, pow(max(h, 0.), .45)); c += glow * exp(-abs(h) * 14.) * .55; gl_FragColor = vec4(c, 1.); }`,
  })); scene.add(sky);
  const STARS = mobile ? 900 : 1800, sp = new Float32Array(STARS * 3), sz = new Float32Array(STARS);
  for (let i = 0; i < STARS; i++) { const u = Math.random() * Math.PI * 2, v = Math.acos(1 - Math.random() * .95); sp.set([Math.sin(v) * Math.cos(u) * 250, Math.cos(v) * 250, Math.sin(v) * Math.sin(u) * 250], i * 3); sz[i] = Math.random(); }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); starGeo.setAttribute('seed', new THREE.BufferAttribute(sz, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false, fog: false,
    vertexShader: `attribute float seed; uniform float uTime; varying float vA; void main(){ vA = .35 + .65 * (.5 + .5 * sin(uTime * (1. + seed * 2.) + seed * 40.)); vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = 1. + seed * 2.2; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1., .97, .92), vA * smoothstep(.5, .1, d)); }`,
  });
  scene.add(new THREE.Points(starGeo, starMat));
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,250,235,1)', 'rgba(210,220,255,.25)'), fog: false, depthWrite: false, color: new THREE.Color(1.6, 1.6, 1.5), toneMapped: false }));
  moon.position.set(-70, 62, -140); moon.scale.setScalar(26); scene.add(moon);

  scene.add(new THREE.HemisphereLight('#3a4a7a', '#120c08', .55));
  const moonLight = new THREE.DirectionalLight('#b8c6ff', .5); moonLight.position.set(-14, 26, 22); moonLight.target.position.copy(HIM);
  moonLight.castShadow = !mobile; moonLight.shadow.mapSize.set(1024, 1024); Object.assign(moonLight.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 5, far: 60 }); moonLight.shadow.bias = -.0005;
  scene.add(moonLight, moonLight.target);

  // ── The ground and the path of lanterns ─────────────────────────────────────────────────────────────
  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.MeshStandardMaterial({ color: '#141a14', roughness: .95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 27), new THREE.MeshStandardMaterial({ color: '#3a3833', roughness: .8 }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, .005, 25.5); path.receiveShadow = true; scene.add(path);
  const terrace = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.5), new THREE.MeshStandardMaterial({ color: '#403c36', roughness: .75 }));
  terrace.rotation.x = -Math.PI / 2; terrace.position.set(0, .006, 13.6); terrace.receiveShadow = true; scene.add(terrace);
  const post = new THREE.MeshStandardMaterial({ color: '#15130f', roughness: .5, metalness: .6 });
  const lanternGlass = new THREE.MeshStandardMaterial({ color: '#2a1f14', emissive: '#ffb45e', emissiveIntensity: 0 });
  const lanterns: { mat: THREE.MeshStandardMaterial; z: number }[] = [];
  const postGeo = new THREE.CylinderGeometry(.022, .03, .6, 8), headGeo = new THREE.BoxGeometry(.09, .13, .09);
  for (let z = 36; z >= 16; z -= 2.5) for (const x of [-1.55, 1.55]) {
    const p = new THREE.Mesh(postGeo, post); p.position.set(x, .3, z); scene.add(p);
    const m = lanternGlass.clone(); lanterns.push({ mat: m, z });
    const h = new THREE.Mesh(headGeo, m); h.position.set(x, .665, z); scene.add(h);
  }
  // Fireflies drifting over the grass.
  const FLIES = mobile ? 60 : 140, fp = new Float32Array(FLIES * 3), fseed = Array.from({ length: FLIES }, () => Math.random() * 100);
  const flyGeo = new THREE.BufferGeometry(); flyGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ size: .07, color: new THREE.Color(2.4, 1.9, .8), map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  scene.add(flies);

  // ── The heart of petals and candles where he waits ──────────────────────────────────────────────────
  const PETALS = mobile ? 180 : 320;
  const petals = new THREE.InstancedMesh(new THREE.PlaneGeometry(.06, .045), new THREE.MeshStandardMaterial({ color: '#b3122c', roughness: .6, side: THREE.DoubleSide, emissive: '#3a0008' }), PETALS);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < PETALS; i++) {
    const t = (i / PETALS) * Math.PI * 2, jitter = (Math.random() - .5) * .12;
    // The heart curve, about 2.6 m across, pointing towards her.
    const hx = 16 * Math.pow(Math.sin(t), 3), hz = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const x = HIM.x + hx * .08 + jitter, z = HIM.z + .3 - hz * .08 + jitter;
    e.set(-Math.PI / 2 + (Math.random() - .5) * .5, Math.random() * Math.PI * 2, 0); q.setFromEuler(e);
    m4.compose(V(x, .012 + Math.random() * .01, z), q, V(1, 1, 1).multiplyScalar(.8 + Math.random() * .6)); petals.setMatrixAt(i, m4);
  }
  scene.add(petals);
  const wax = new THREE.MeshStandardMaterial({ color: '#f1e7d6', roughness: .6, emissive: '#3a2410' });
  const flameMat = new THREE.SpriteMaterial({ map: glowTexture('rgba(255,236,190,1)', 'rgba(255,150,60,.5)'), color: new THREE.Color(2.4, 1.6, .7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const flames: THREE.Sprite[] = [];
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2, hx = 16 * Math.pow(Math.sin(t), 3), hz = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const x = HIM.x + hx * .1, z = HIM.z + .3 - hz * .1, h = .08 + (i % 3) * .05;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, h, 12), wax); c.position.set(x, h / 2, z); scene.add(c);
    const f = new THREE.Sprite(flameMat); f.position.set(x, h + .035, z); f.scale.set(.09, .14, 1); scene.add(f); flames.push(f);
  }
  const candleLight = new THREE.PointLight('#ffae5c', 0, 7, 2); candleLight.position.set(HIM.x, .5, HIM.z + .6); scene.add(candleLight);
  const keyLight = new THREE.SpotLight('#ffe2c0', 0, 16, .5, .7, 1.6); keyLight.position.set(1.5, 5.5, HIM.z + 5); keyLight.target.position.set(HIM.x, 1, HIM.z); keyLight.castShadow = !mobile; scene.add(keyLight, keyLight.target);

  // ── The house ───────────────────────────────────────────────────────────────────────────────────────
  const draco = new DRACOLoader(); draco.setDecoderPath('/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const houseLights: { m: THREE.MeshStandardMaterial; at: number; gain: number }[] = [];
  const inside: THREE.PointLight[] = [];
  const houseReady = loader.loadAsync(mobile ? '/models/night/pavilion.mobile.glb' : '/models/night/pavilion.glb').then(gltf => {
    const house = gltf.scene;
    house.traverse(n => {
      const mesh = n as THREE.Mesh; if (!mesh.isMesh) return;
      const m = mesh.material as THREE.MeshStandardMaterial, name = m.name;
      mesh.receiveShadow = true; mesh.castShadow = !/Glass/.test(name);
      if (name === 'Glass') mesh.material = new THREE.MeshPhysicalMaterial({ color: '#cfe0e6', metalness: .1, roughness: .04, transparent: true, opacity: .2, depthWrite: false, envMapIntensity: 1.2 });
      else if (/Backlight|Light/.test(name)) {
        const lit = new THREE.MeshStandardMaterial({ color: '#221a12', emissive: '#ffc27a', emissiveIntensity: 0, name });
        mesh.material = lit; // The back wall is one big lit panel: only a glow, or it blinds everything in front of it.
        houseLights.push({ m: lit, at: { BacklightCeilingPerimeter: 4, CeilingSpotLights: 6, BacklightBackWall: 8, FloorLight: 10 }[name] ?? 7, gain: { BacklightCeilingPerimeter: 1.1, CeilingSpotLights: 1.5, BacklightBackWall: .06, FloorLight: .9 }[name] ?? 1 });
      } else if (name === 'Matte') m.color.set('#d9d4ca');
    });
    scene.add(house);
    for (const [x, z] of [[-8, 4], [0, 1], [8, 4]]) { const l = new THREE.PointLight('#ffc987', 0, 16, 1.6); l.position.set(x, 3.8, z); scene.add(l); inside.push(l); }
  });

  // ── The people ──────────────────────────────────────────────────────────────────────────────────────
  const [him, her] = await Promise.all([createPerson(loader, '/models/night/rodion.glb', RODION, true), createPerson(loader, '/models/night/lida.glb', LIDA)]);
  him.root.position.copy(HIM); scene.add(him.root);
  her.root.position.set(HIM.x - .5, 0, HIM.z + .2); her.root.visible = false; scene.add(her.root);
  const himPose: Partial<Pose> = {}, herPose: Partial<Pose> = {};

  // ── The astronaut ───────────────────────────────────────────────────────────────────────────────────
  const astro = createAstronaut();
  const astroReady = Promise.race([astro.load().catch(() => {}), new Promise(r => setTimeout(r, 6000))]).then(() => {
    astro.root.updateMatrixWorld(true);
    const hb = new THREE.Box3().setFromObject(astro.root), h = hb.max.y - hb.min.y; if (h > .5) astro.root.scale.multiplyScalar(1.8 / h);
    astro.root.position.set(1.6, 0, PATH_START.z - 1.5); astro.root.rotation.y = Math.PI; scene.add(astro.root);
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
      { at: 3.5, run: () => { astroTarget = V(mobile ? .5 : 1.25, 0, 14.4); } },   // beside him, where she can see him
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
      { at: 6.2, run: () => { Object.assign(himPose, { lean: 1 }); Object.assign(herPose, { lean: 1, tiptoe: 1 }); } },
      { at: 7.4, run: () => countdown(() => shoot('kiss'), 2) },
      { at: 11, run: () => go('end') },
    ],
  };
  let ringOpenAt = -1, heartsAt = -1, capture: ((url: string) => void) | null = null;
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
    him.root.position.set(HIM.x + .34, 0, HIM.z + .4); her.root.position.set(HIM.x - .34, 0, HIM.z + .4);
    him.root.rotation.y = her.root.rotation.y = 0;
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
  const tmp = new THREE.Vector3();
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
    const dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
    // A beat may start the next phase: its own beats then count from that moment, not this one.
    while (beatIndex < beats[phase].length && clock - phaseAt >= beats[phase][beatIndex].at) beats[phase][beatIndex++].run();
    const local = clock - phaseAt;
    if (say && clock > sayUntil) { sub.classList.remove('is-on'); say = ''; }

    // Her walk up the path (the camera), then her eyes on him; for the photos, the astronaut's camera.
    if (phase === 'intro') { camPos.set(Math.sin(clock * .05) * 3, 3.2, 44); lookGoal.set(0, 3, 10); }
    else if (phase === 'walk') {
      const k = Math.min(1, local / 14), e = k * k * (3 - 2 * k);
      camPos.lerpVectors(PATH_START, HER_STOP, e); camPos.y = 1.62 + Math.sin(local * 5.2) * .012 * (1 - k);   // a gentle step
      lookGoal.set(0, THREE.MathUtils.lerp(2.6, 1.55, e), THREE.MathUtils.lerp(8, HIM.z, e));
      if (k >= 1) go('speak');
    } else if (phase === 'speak') { camPos.lerp(HER_STOP, dt); lookGoal.set(HIM.x, 1.55, HIM.z); }
    else if (phase === 'ask' || phase === 'yes') {
      const down = phase === 'ask' ? Math.min(1, local / 2) : Math.max(0, 1 - local / 1.5);
      camPos.lerp(V(0, 1.55 - down * .12, HER_STOP.z - .6 * down), Math.min(1, dt * 1.5)); lookGoal.set(HIM.x, 1.55 - down * .5, HIM.z);
      if (phase === 'yes' && local > 5) lookGoal.set(astro.root.position.x, 1.5, astro.root.position.z);
    } else if (phase === 'photo' || phase === 'end') { camPos.lerp(V(0, 1.45, HIM.z + 3.6), Math.min(1, dt * 3)); lookGoal.set(0, 1.35, HIM.z + .3); }
    camera.position.copy(camPos); camLook.lerp(lookGoal, Math.min(1, dt * 2.2)); camera.lookAt(camLook);

    // The house wakes up as she comes near; lanterns light behind and ahead of her.
    const glowT = phase === 'intro' ? 0 : phase === 'walk' ? local : 99;
    for (const l of houseLights) l.m.emissiveIntensity = THREE.MathUtils.smoothstep(glowT, l.at, l.at + 1.2) * l.gain;
    inside.forEach((l, i) => (l.intensity = THREE.MathUtils.smoothstep(glowT, 5 + i * 1.5, 7 + i * 1.5) * 8));
    for (const l of lanterns) l.mat.emissiveIntensity = phase === 'intro' ? .15 : THREE.MathUtils.smoothstep(camPos.z - l.z, -9, -4) * 1.8;
    const warm = phase === 'intro' ? 0 : THREE.MathUtils.smoothstep(glowT, 6, 11);
    candleLight.intensity = warm * 2.4; keyLight.intensity = warm * 16;
    flames.forEach((f, i) => { const k = warm * (.85 + .15 * Math.sin(clock * 13 + i * 2.1) * Math.sin(clock * 7.3 + i)); f.scale.set(.09 * k, .14 * k, 1); });
    for (let i = 0; i < FLIES; i++) { const s = fseed[i]; fp.set([Math.sin(clock * .3 + s) * (4 + (s % 7)), .4 + (s % 1.4) + Math.sin(clock * .8 + s * 3) * .25, 14 + (s % 20) + Math.cos(clock * .25 + s) * 2], i * 3); }
    flyGeo.attributes.position.needsUpdate = true;
    starMat.uniforms.uTime.value = clock;

    if (ringOpenAt >= 0) him.ring?.open(Math.min(1, (clock - ringOpenAt) / .8));
    him.pose(himPose, dt); her.pose(herPose, dt);
    if (phase === 'photo' && (himPose.lean ?? 0) > 0) {
      // Turning to each other for the kiss.
      him.root.rotation.y += (-Math.PI / 2 * .8 - him.root.rotation.y) * Math.min(1, dt * 2.5);
      her.root.rotation.y += (Math.PI / 2 * .8 - her.root.rotation.y) * Math.min(1, dt * 2.5);
      him.root.position.x += (HIM.x + .2 - him.root.position.x) * Math.min(1, dt * 2); her.root.position.x += (HIM.x - .2 - her.root.position.x) * Math.min(1, dt * 2);
    }
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
  await Promise.all([houseReady, astroReady]);
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
  frame = requestAnimationFrame(tick);
  if (reduced) { /* the story plays as it is: it is short and calm; no parallax, no shake */ }

  return () => {
    disposed = true; cancelAnimationFrame(frame); ro.disconnect(); sound.dispose(); draco.dispose(); astro.dispose(); him.dispose(); her.dispose();
    composer.dispose(); renderer.dispose(); renderer.domElement.remove();
  };
}
