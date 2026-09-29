/*
 * 404 — "The Drift".
 *
 * The visitor has fallen out of the Observatory into open space. A black hole
 * bends the starlight behind everything (light paths integrated per pixel in a
 * shader, drawn at a resolution that adapts to the device); the astronaut from
 * the archive floats untethered in front of it — a cut tether trailing from his
 * belt, puffs from his pack when he rights himself — with the address that led
 * nowhere on his tablet; and the pages the visitor most likely meant drift past
 * as holographic frames, wired to his tablet by thin signal lines. Grab him and
 * throw him, or pick a frame and he beams you there. Leave him alone for half a
 * minute and the hole takes him. Everything goes through bloom, chromatic fringing
 * and grain.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createAstronaut } from './observatory-astronaut';
import type { DriftRoute } from '../data/drift-routes';

import type { Signal, Lang } from '../data/drift-signals';

import { HORIZON_FRAGMENT } from './drift-horizon';

/* ---------- Final pass: fringing, vignette, grain ---------- */
const FINISH = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uTime: { value: 0 }, uHole: { value: new THREE.Vector2(.69, .52) }, uAspect: { value: 1.6 }, uFringe: { value: .1 }, uScroll: { value: 0 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;uniform float uTime,uAspect,uFringe,uScroll;uniform vec2 uHole;varying vec2 vUv;
    float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){
      // The sky is already lensed by the hole itself; the foreground stays true.
      vec2 uv=vUv;
      vec2 c=vUv-.5;float edge=dot(c,c);
      vec2 off=c*(.0012+.006*edge)*uFringe;
      vec3 col=vec3(texture2D(tDiffuse,uv+off).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-off).b);
      col*=1.-.55*smoothstep(.18,.62,edge*1.6);
      col+=(h(vUv*vec2(1920.,1080.)+fract(uTime*3.))-.5)*.0006;
      col*=mix(1.,.09,uScroll);
      col*=mix(.45,1.,smoothstep(.05,.5,vUv.x));
      gl_FragColor=vec4(max(col,0.),1.);
    }`,
};

/** Draw the analytic horizon and foreground at the same display resolution. */
class DriftPass extends Pass {
  constructor(private draw: (target: THREE.WebGLRenderTarget) => void) { super(); this.needsSwap = false; }
  render(_renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget) { this.draw(read); }
}

/* ---------- Scene ---------- */
export type DriftOptions = {
  host: HTMLElement; routes: DriftRoute[]; requested: string; lang: () => Lang;
  onSignals?: (signals: Signal[]) => void; onTelemetry?: (t: { horizon: number; speed: number }) => void;
  onNavigate?: (path: string) => void; reduced: boolean;
  /** The HTML signal cards: crisp images and type, wired to the scene by anchor. */
  cards: HTMLElement[];
  /** Where his chest is on screen, for the little "grab him" hint. */
  onAstro?: (x: number, y: number, visible: boolean, grabbed: boolean) => void;
};

export function mountDrift(o: DriftOptions) {
  const { host, routes, requested } = o;
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(devicePixelRatio || 1, mobile ? 1.75 : 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .78;
  renderer.autoClear = false;
  host.append(renderer.domElement);
  const canvas = renderer.domElement; canvas.style.touchAction = 'pan-y';

  const gl = renderer.getContext();
  const name = String(gl.getParameter((gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL) ?? gl.RENDERER));
  const weak = /SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(name) || (/Intel|HD Graphics|UHD Graphics|Mali|Adreno|PowerVR/i.test(name) && !/Iris Xe|Arc/i.test(name));
  // The hole is drawn into its own, smaller target and stretched: gas is soft by nature,
  // and the cost is what adapts first when a device struggles.
  let holeScale = mobile ? .45 : weak ? .42 : .62, steps = mobile ? 190 : weak ? 180 : 300;
  const holeTarget = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false, type: THREE.HalfFloatType });
  // The typed address, rendered once as a strip of glyphs the shader writes into the disk.
  const textCanvas = document.createElement('canvas'); textCanvas.width = 2048; textCanvas.height = 192;
  const textTex = new THREE.CanvasTexture(textCanvas); textTex.anisotropy = 8;
  function drawText() {
    const c = textCanvas.getContext('2d')!; c.clearRect(0, 0, 2048, 192);
    const label = requested.length > 42 ? requested.slice(0, 41) + '…' : requested;
    let size = 150; c.font = `500 ${size}px "RB Space", Inter, Arial, sans-serif`;
    while (c.measureText(label).width > 1960 && size > 40) { size -= 6; c.font = `500 ${size}px "RB Space", Inter, Arial, sans-serif`; }
    c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText(label, 1024, 100);
    textTex.needsUpdate = true;
  }
  const holeUniforms = { uRes: { value: new THREE.Vector2(2, 2) }, uTime: { value: 0 }, uCenter: { value: new THREE.Vector2(.71, .53) }, uDist: { value: 25 }, uTilt: { value: new THREE.Vector2(.3, -.06) }, uDetail: { value: weak || mobile ? 0 : 1 }, uFlash: { value: 0 }, uSteps: { value: steps }, uText: { value: textTex }, uTextFall: { value: 0 }, uTextAge: { value: 0 }, uTextAspect: { value: 2048 / 192 }, uTextOn: { value: 1 } };
  drawText();
  const quad = new THREE.BufferGeometry(); quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const holeScene = new THREE.Scene();
  const holeMaterial = new THREE.RawShaderMaterial({ uniforms: holeUniforms, vertexShader: 'attribute vec3 position;void main(){gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: HORIZON_FRAGMENT, depthTest: false, depthWrite: false });
  holeScene.add(new THREE.Mesh(quad, holeMaterial));
  const blitScene = new THREE.Scene();
  const blitMaterial = new THREE.RawShaderMaterial({
    uniforms: { uMap: { value: holeTarget.texture } },
    vertexShader: 'attribute vec3 position;varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'precision highp float;uniform sampler2D uMap;varying vec2 vUv;void main(){gl_FragColor=vec4(texture2D(uMap,vUv).rgb,1.);}', depthTest: false, depthWrite: false,
  });
  blitScene.add(new THREE.Mesh(quad, blitMaterial));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 200); camera.position.set(0, 0, 11);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .12;
  scene.add(new THREE.HemisphereLight('#7f9eff', '#100806', .18));
  const diskLight = new THREE.DirectionalLight('#d07843', 1.8); scene.add(diskLight);
  const rim = new THREE.DirectionalLight('#718b9d', .85); rim.position.set(-7, 5, -4); scene.add(rim);
  const key = new THREE.DirectionalLight('#bcc8cf', .35); key.position.set(-3, 2, 8); scene.add(key);

  // Post: bloom picks up the disk, the ring, the frame edges and the beam.
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType }));
  composer.addPass(new DriftPass(target => {
    renderer.setRenderTarget(holeTarget); renderer.render(holeScene, flat);
    renderer.setRenderTarget(target); renderer.clear(); renderer.render(blitScene, flat); renderer.clearDepth(); renderer.render(scene, camera);
  }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), mobile ? .2 : .28, .25, .65); composer.addPass(bloom);
  const finish = new ShaderPass(FINISH); composer.addPass(finish);
  composer.addPass(new OutputPass());

  /* ----- The astronaut ----- */
  const curator = createAstronaut(); const astro = curator.root; const baseScale = 1.42 * (mobile ? .5 : .6); astro.scale.setScalar(baseScale); scene.add(astro);
  void curator.load();
  const visor = astro.userData.visorUniforms; if (visor) visor.uVisorTint.value.set('#b9835a');
  const s = () => baseScale / 1.42;
  const bonesCache: Record<string, THREE.Object3D | undefined> = {}; let rigSeen = '';
  const bone = (tail: string) => {
    const rig = String(astro.userData.astronautRig ?? ''); if (rig !== rigSeen) { rigSeen = rig; for (const k in bonesCache) delete bonesCache[k]; }
    if (!(tail in bonesCache)) { let found: THREE.Object3D | undefined; astro.traverse(obj => { if (!found && obj.name.endsWith(tail) && !obj.name.endsWith('Up' + tail)) found = obj; }); bonesCache[tail] = found; }
    return bonesCache[tail];
  };

  // Tablet: the dead address, then the signal he is locking onto.
  const tabletCanvas = document.createElement('canvas'); tabletCanvas.width = 512; tabletCanvas.height = 320;
  const tabletTex = new THREE.CanvasTexture(tabletCanvas); tabletTex.colorSpace = THREE.SRGBColorSpace;
  const tablet = new THREE.Group();
  tablet.add(new THREE.Mesh(new THREE.BoxGeometry(.36, .24, .02), new THREE.MeshStandardMaterial({ color: '#1a2129', metalness: .6, roughness: .35 })));
  const screenMat = new THREE.MeshBasicMaterial({ map: tabletTex, toneMapped: false, color: new THREE.Color(.8, .8, .8) });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.33, .21), screenMat); screen.position.z = .011; tablet.add(screen);
  scene.add(tablet);
  let tabletNote = '';
  function drawTablet(time: number, mode: 'lost' | 'lock' | 'beam' | 'back', target = '') {
    const c = tabletCanvas.getContext('2d')!; const W = 512, H = 320, blink = Math.sin(time * 5) > 0;
    c.fillStyle = '#03101a'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(143,216,255,.09)'; c.lineWidth = 1;
    for (let x = 0; x < W; x += 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    const accent = mode === 'lost' ? '#ff8a6a' : mode === 'lock' ? '#ffd98a' : '#8fd8ff';
    c.fillStyle = accent; c.font = '600 26px ui-monospace,Consolas,monospace';
    const head = mode === 'lost' ? `${blink ? '●' : '○'} SIGNAL LOST` : mode === 'lock' ? '◎ LOCKING SIGNAL' : mode === 'beam' ? '▲ BEAMING' : '✓ RECONNECTED';
    c.fillText(head, 26, 50);
    if (mode === 'lock') {
      // A radar sweep homing onto the frame under the cursor.
      c.strokeStyle = 'rgba(255,217,138,.5)'; c.lineWidth = 2;
      for (let r = 30; r <= 90; r += 30) { c.beginPath(); c.arc(410, 170, r, 0, Math.PI * 2); c.stroke(); }
      const a = time * 4; c.beginPath(); c.moveTo(410, 170); c.lineTo(410 + Math.cos(a) * 90, 170 + Math.sin(a) * 90); c.stroke();
      c.fillStyle = '#ffd98a'; c.beginPath(); c.arc(410 + 38, 170 - 26, 7, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#eaf6ff'; c.font = '600 44px ui-monospace,Consolas,monospace'; c.fillText('LOCK', 26, 130);
      c.fillStyle = 'rgba(220,235,255,.8)'; c.font = '500 22px ui-monospace,Consolas,monospace';
      let t = target; if (t.length > 22) t = t.slice(0, 21) + '…'; c.fillText(t, 26, 180);
    } else {
      c.fillStyle = '#eaf6ff'; c.font = '700 110px ui-monospace,Consolas,monospace'; c.fillText('404', 26, 172);
      c.fillStyle = 'rgba(200,230,255,.75)'; c.font = '500 24px ui-monospace,Consolas,monospace';
      let path = tabletNote || requested; if (path.length > 30) path = path.slice(0, 29) + '…'; c.fillText(path, 26, 226);
    }
    c.fillStyle = 'rgba(143,216,255,.22)'; c.fillRect(26, 262, 460, 8);
    c.fillStyle = accent; c.fillRect(26, 262, 460 * (mode === 'lost' ? (.14 + .1 * Math.sin(time * 2)) : mode === 'lock' ? (.5 + .5 * Math.sin(time * 3)) : 1), 8);
    tabletTex.needsUpdate = true;
  }

  // The cut tether: a rope of points hanging off his belt, the frayed end blinking red.
  const ROPE = 26; const rope = Array.from({ length: ROPE }, () => ({ p: new THREE.Vector3(), q: new THREE.Vector3() }));
  let ropeReady = false; const ropeSeg = () => .085 * s();
  const ropeMat = new THREE.MeshStandardMaterial({ color: '#262c33', roughness: .55, metalness: .35 });
  let ropeMesh: THREE.Mesh | undefined;
  const ropeTip = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, .5, .3), toneMapped: false })); scene.add(ropeTip);

  // Puffs of gas from the pack when he rights himself.
  const PUFFS = 90; const puffPos = new Float32Array(PUFFS * 3), puffLife = new Float32Array(PUFFS), puffVel: THREE.Vector3[] = Array.from({ length: PUFFS }, () => new THREE.Vector3());
  const puffGeo = new THREE.BufferGeometry(); puffGeo.setAttribute('position', new THREE.BufferAttribute(puffPos, 3)); puffGeo.setAttribute('life', new THREE.BufferAttribute(puffLife, 1));
  const puffs = new THREE.Points(puffGeo, new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float life;varying float vL;uniform float uScale;void main(){vL=life;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(10.+40.*(1.-life))*uScale/-mv.z*6.;}',
    fragmentShader: 'varying float vL;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d)*vL*vL*.55;if(a<.003)discard;gl_FragColor=vec4(vec3(.75,.88,1.)*a*1.6,a);}',
  })); scene.add(puffs); let puffNext = 0;
  function puff(from: THREE.Vector3, dir: THREE.Vector3, n: number) {
    for (let k = 0; k < n; k++) {
      const i = puffNext; puffNext = (puffNext + 1) % PUFFS;
      puffPos.set([from.x, from.y, from.z], i * 3); puffLife[i] = 1;
      puffVel[i].copy(dir).multiplyScalar(1.2 + Math.random() * 1.2).add(new THREE.Vector3((Math.random() - .5) * .5, (Math.random() - .5) * .5, (Math.random() - .5) * .5));
    }
  }

  /* ----- Signal cards (HTML) ----- */
  type Frame = { el: HTMLElement; path: string; anchor: THREE.Vector3; hover: number; best: boolean; thread: THREE.Line<THREE.BufferGeometry, THREE.ShaderMaterial> };
  let frames: Frame[] = [];
  const threadMat = () => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uGold: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float t;varying float vT;void main(){vT=t;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uTime,uOn,uGold;varying float vT;void main(){float pulse=pow(fract(vT*3.-uTime*.9),6.);float a=(.06+.55*uOn)*(.35+pulse*2.4)*smoothstep(0.,.08,vT)*smoothstep(1.,.92,vT);vec3 c=mix(vec3(.62,.8,.95),vec3(1.,.72,.48),uGold);gl_FragColor=vec4(c*a*2.,a);}',
  });
  function bindCards(list: HTMLElement[]) {
    frames.forEach(f => { scene.remove(f.thread); f.thread.geometry.dispose(); f.thread.material.dispose(); });
    frames = list.map((el, i) => {
      const threadGeo = new THREE.BufferGeometry(); const n = 48;
      threadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      threadGeo.setAttribute('t', new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, k) => k / (n - 1)), 1));
      const best = el.dataset.best === '1';
      const thread = new THREE.Line(threadGeo, threadMat()); thread.material.uniforms.uGold.value = best ? 1 : 0; thread.frustumCulled = false; scene.add(thread);
      el.addEventListener('pointerenter', () => { if (!beaming) hovered = i; wake(); });
      el.addEventListener('pointerleave', () => { if (hovered === i) hovered = -1; });
      el.addEventListener('focus', () => { hovered = i; });
      el.addEventListener('blur', () => { if (hovered === i) hovered = -1; });
      el.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault(); beamTo(i);
      });
      return { el, path: el.getAttribute('href') ?? '/', anchor: new THREE.Vector3(), hover: 0, best, thread };
    });
  }
  // The point on a card the astronaut reaches for: its left edge, a little above the middle.
  function anchorOf(f: Frame) {
    const r = f.el.getBoundingClientRect(), c = canvas.getBoundingClientRect();
    return worldAt((r.left + 6 - c.left) / c.width * 2 - 1, -((r.top + r.height * .42 - c.top) / c.height) * 2 + 1, .4, f.anchor);
  }

  /* ----- Layout in screen space ----- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const camBase = new THREE.Vector3(0, 0, 11);
  function worldAt(x: number, y: number, z: number, out = new THREE.Vector3()) {
    ndc.set(x, y); ray.setFromCamera(ndc, camera); plane.constant = -z; return ray.ray.intersectPlane(plane, out) ?? out.set(0, 0, z);
  }
  const home = new THREE.Vector3(), holeWorld = new THREE.Vector3();
  function layout() {
    const w = host.clientWidth, h = host.clientHeight, portrait = w < h * .9;
    renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false); composer.setPixelRatio(pixelRatio); composer.setSize(w, h);
    bloom.resolution.set(w * pixelRatio * .5, h * pixelRatio * .5);
    camera.aspect = w / h; camera.fov = portrait ? 50 : 38; camera.position.copy(camBase); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    holeUniforms.uCenter.value.set(portrait ? .57 : .71, portrait ? .43 : .53);
    holeUniforms.uDist.value = portrait ? 36 : 25;
    finish.uniforms.uHole.value.copy(holeUniforms.uCenter.value); finish.uniforms.uAspect.value = w / h;
    finish.uniforms.uFringe.value = mobile ? 0 : .1;
    holeTarget.setSize(Math.max(2, Math.round(w * pixelRatio * holeScale)), Math.max(2, Math.round(h * pixelRatio * holeScale)));
    holeUniforms.uRes.value.set(holeTarget.width, holeTarget.height);
    worldAt(portrait ? -.24 : .13, portrait ? -.24 : -.15, 1.2, home);
    worldAt(holeUniforms.uCenter.value.x * 2 - 1, holeUniforms.uCenter.value.y * 2 - 1, -14, holeWorld);
    diskLight.position.copy(holeWorld).add(new THREE.Vector3(0, -1.5, 0));
  }

  /* ----- Input ----- */
  const pos = new THREE.Vector3(), vel = new THREE.Vector3(), spin = new THREE.Vector3(), euler = new THREE.Euler(), prevPointer = new THREE.Vector3();
  const grabOffset = new THREE.Vector3(), pointerWorld = new THREE.Vector3(), pointerVel = new THREE.Vector3();
  let grabbed = false, lastMove = performance.now();
  let hovered = -1, beaming: { frame: Frame; t: number; from: THREE.Vector3; gone: boolean } | undefined, idle = 0, pull = 0, swallowed = 0, respawn = 0, wave = 0, stretch = 1;
  const pointerNdc = new THREE.Vector2(-9, -9), smoothPointer = new THREE.Vector2(), zero2 = new THREE.Vector2(), threadFrom = new THREE.Vector3();
  function pointerRay(x: number, y: number) {
    const r = canvas.getBoundingClientRect(); pointerNdc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pointerNdc, camera);
  }
  const astroCenter = () => tmp.copy(pos).add(tmp2.set(0, 1.2 * s(), 0));
  const hitAstro = () => !swallowed && astro.visible && ray.ray.distanceSqToPoint(astroCenter()) < Math.pow(1.05 * s(), 2);
  function wake() { lastMove = performance.now(); if (pull > 0 && !swallowed) { pull = 0; vel.multiplyScalar(.3); } }

  canvas.addEventListener('pointerdown', event => {
    if (beaming) return; pointerRay(event.clientX, event.clientY); wake();
    if (hitAstro()) {
      grabbed = true; canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
      plane.constant = -pos.z; ray.ray.intersectPlane(plane, pointerWorld); grabOffset.copy(pos).sub(pointerWorld); prevPointer.copy(pointerWorld); pointerVel.set(0, 0, 0);
      event.preventDefault();
    }
  });
  canvas.addEventListener('pointermove', event => {
    pointerRay(event.clientX, event.clientY); wake();
    if (grabbed) { plane.constant = -pos.z; ray.ray.intersectPlane(plane, pointerWorld); return; }
    const onAstro = hitAstro();
    canvas.style.cursor = onAstro ? 'grab' : 'default';
    if (!wave && onAstro && idle > 2.5) wave = 2.4;
  });
  const release = (event: PointerEvent) => {
    if (!grabbed) return; grabbed = false; canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    vel.copy(pointerVel).clampLength(0, 14); spin.set(-vel.y * .35, vel.x * .12, -vel.x * .45);
  };
  canvas.addEventListener('pointerup', event => {
    if (grabbed) { release(event); return; }
  });
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { hovered = -1; pointerNdc.set(-9, -9); });
  // On touch the page scrolls by default; a finger that lands on him keeps the gesture.
  canvas.addEventListener('touchstart', event => {
    const t = event.touches[0]; if (!t || event.touches.length > 1) return;
    pointerRay(t.clientX, t.clientY); if (hitAstro()) event.preventDefault();
  }, { passive: false });
  function beamTo(index: number) {
    if (o.reduced) { const path = frames[index]?.path; if (path) o.onNavigate?.(path); return; }
    const frame = frames[index]; if (!frame || beaming) return;
    beaming = { frame, t: 0, from: pos.clone(), gone: false }; tabletNote = frame.path; hovered = index;
  }

  /* ----- Beam, streaks ----- */
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 7, 40, 1, true), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uTime,uI;varying vec2 vUv;void main(){float helix=pow(.5+.5*sin(vUv.x*37.7-vUv.y*24.-uTime*9.),8.);float band=.5+.5*sin(vUv.y*40.-uTime*12.);float edge=pow(1.-abs(vUv.y-.5)*2.,1.4);gl_FragColor=vec4(vec3(.55,.85,1.)*(.25+.5*band+2.5*helix)*edge*uI*1.6,1.);}',
  })); beam.visible = false; scene.add(beam);

  // Light streaks spiralling into the hole, each a short line from head to tail.
  const STREAKS = mobile ? 32 : 80;
  const streakPos = new Float32Array(STREAKS * 6), streakCol = new Float32Array(STREAKS * 6), streakState = Array.from({ length: STREAKS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), seed: Math.random() }));
  const streakGeo = new THREE.BufferGeometry(); streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3)); streakGeo.setAttribute('color', new THREE.BufferAttribute(streakCol, 3));
  const streaks = new THREE.LineSegments(streakGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); streaks.frustumCulled = false; scene.add(streaks);
  const spawnStreak = (st: typeof streakState[0], anywhere: boolean) => {
    const a = Math.random() * Math.PI * 2, r = anywhere ? 4 + Math.random() * 16 : 14 + Math.random() * 6;
    st.p.set(holeWorld.x + Math.cos(a) * r * 1.4, holeWorld.y + Math.sin(a) * r * .55, -12 + Math.random() * 13);
    st.v.set(0, 0, 0);
  };

  /* ----- Frame loop ----- */
  let last = performance.now(), elapsed = 0, raf = 0, running = true, frameTimes: number[] = [], lastTablet = 0, primed = false;
  const q = new THREE.Quaternion(), targetQ = new THREE.Quaternion(), fwd = new THREE.Vector3(), upv = new THREE.Vector3(), handPos = new THREE.Vector3(), belt = new THREE.Vector3(), packPos = new THREE.Vector3(), prevSpin = new THREE.Vector3();
  let timeScale = o.reduced ? 0 : 1;
  let scroll = 0;
  const motion = () => { o.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("rb-calm"); timeScale = o.reduced ? 0 : 1; };
  const motionObserver = new MutationObserver(motion); motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)"); motionQuery.addEventListener("change", motion);
  const W = { float: 1, flail: 0, reach: 0, tablet: .9, dive: 0, sit: 0 };
  let tabletMode: 'lost' | 'lock' | 'beam' | 'back' = 'lost';

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const wallDt = Math.max(0, (now - last) / 1000);
    const dt = Math.min(.05, wallDt); last = now; elapsed += Math.min(.25, wallDt) * timeScale;
    finish.uniforms.uScroll.value = scroll;
    // Foreground objects leave with the opening chapter; the horizon stays behind the links.
    scene.position.y = scroll * 2 * Math.tan(camera.fov * Math.PI / 360) * camBase.z * .8;
    scene.visible = scroll < .8;
    // Reduce texture detail before resolution, and never render below a CSS pixel.
    frameTimes.push(wallDt); if (frameTimes.length >= 50) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length; frameTimes = [];
      if (avg > 1 / 45) {
        if (holeUniforms.uDetail.value > 0) holeUniforms.uDetail.value = 0;
        else if (holeScale > .3) { holeScale *= .85; steps = Math.max(110, Math.round(steps * .88)); holeUniforms.uSteps.value = steps; layout(); }
        else if (pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio * .9); layout(); }
      }
    }
    idle = (now - lastMove) / 1000;
    smoothPointer.lerp(!o.reduced && pointerNdc.x > -2 ? pointerNdc : zero2, 1 - Math.exp(-dt * 3));

    // Camera drifts a touch with the hand, so the frames slide against the sky.
    camera.position.set(camBase.x + smoothPointer.x * .35, camBase.y + smoothPointer.y * .22, camBase.z); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();

    // --- Astronaut motion ---
    const goal = { float: 1, flail: 0, reach: 0, tablet: .92, dive: 0, sit: 0 };
    tabletMode = 'lost';
    if (beaming) {
      beaming.t = Math.min(1, beaming.t + dt / 1.2);
      const target = tmp.copy(beaming.frame.anchor).add(tmp2.set(-.35 * s(), -1.15 * s(), .4));
      const e = beaming.t * beaming.t * (3 - 2 * beaming.t);
      pos.lerpVectors(beaming.from, target, e); goal.dive = 1; goal.float = 0; goal.tablet = .6; tabletMode = 'beam';
      beaming.frame.hover = 1;
      holeUniforms.uFlash.value = Math.max(0, (beaming.t - .75) / .25) * .6;
      if (beaming.t >= 1 && !beaming.gone) { beaming.gone = true; o.onNavigate?.(beaming.frame.path); }
    } else if (grabbed) {
      tmp.copy(pointerWorld).add(grabOffset);
      pointerVel.lerp(tmp2.copy(pointerWorld).sub(prevPointer).divideScalar(Math.max(dt, .008)), .35); prevPointer.copy(pointerWorld);
      pos.lerp(tmp, 1 - Math.exp(-dt * 16)); vel.set(0, 0, 0); goal.flail = 1; goal.float = .4; goal.tablet = 0; spin.multiplyScalar(.9);
    } else if (swallowed > 0) {
      swallowed += dt;
      if (swallowed > 2.4) { swallowed = 0; pull = 0; respawn = 1; pos.copy(home); vel.set(0, 0, 0); spin.set(0, 0, 0); stretch = 1; tabletNote = ''; lastMove = now; ropeReady = false; }
    } else {
      vel.addScaledVector(tmp.copy(home).sub(pos), (pull > 0 ? 0 : .55) * dt); vel.multiplyScalar(Math.exp(-dt * .55));
      // The screen edges are walls: he bounces off them, losing half his speed.
      const bound = worldAt(1, 1, pos.z, new THREE.Vector3()), body = 2.3 * s(), side = .45 * s();
      const maxX = Math.abs(bound.x) - side, maxY = Math.abs(bound.y) - body - .15, minY = -Math.abs(bound.y) + .1;
      if (pull === 0) {
        if (pos.x > maxX) { pos.x = maxX; vel.x = -Math.abs(vel.x) * .55; spin.z += vel.y * .2; }
        if (pos.x < -maxX) { pos.x = -maxX; vel.x = Math.abs(vel.x) * .55; spin.z -= vel.y * .2; }
        if (pos.y > maxY) { pos.y = maxY; vel.y = -Math.abs(vel.y) * .55; spin.x += vel.x * .2; }
        if (pos.y < minY) { pos.y = minY; vel.y = Math.abs(vel.y) * .55; spin.x -= vel.x * .2; }
      }
      const speed = vel.length(); goal.flail = Math.min(.8, Math.max(0, speed - 1.5) / 5); goal.tablet = .92 * (1 - goal.flail);
      // Left alone for half a minute, the hole starts to pull.
      if (!o.reduced && idle > 26 && pull === 0) pull = .001;
      if (pull > 0) {
        pull = Math.min(1, pull + dt / 9);
        const toHole = tmp.copy(holeWorld).sub(pos); const d = toHole.length();
        vel.addScaledVector(toHole.normalize(), (1.2 + 6 * pull * pull) * dt);
        spin.z += dt * 1.6 * pull; goal.flail = .9; goal.tablet = 0; goal.float = .3;
        stretch = 1 + pull * 1.8 * Math.max(0, 1 - d / 22);
        if (d < 3.2) { swallowed = .001; holeUniforms.uFlash.value = .35; }
      }
      pos.addScaledVector(vel, dt);
      if (hovered >= 0 && pull === 0) { goal.reach = .95; tabletMode = 'lock'; }
    }
    if (respawn > 0) { respawn = Math.max(0, respawn - dt / 1.5); tabletMode = 'back'; }
    if (pull === 0) stretch = THREE.MathUtils.damp(stretch, 1, 3, dt);
    if (wave > 0) { wave = Math.max(0, wave - dt); goal.tablet = 0; goal.reach = 0; }
    for (const k of Object.keys(W) as (keyof typeof W)[]) W[k] = THREE.MathUtils.damp(W[k], goal[k], 5, dt);

    astro.visible = swallowed === 0 && respawn < .9;
    astro.position.copy(pos).add(tmp2.set(0, Math.sin(elapsed * .7) * .12, 0));
    // Tumble: a slow weightless roll plus whatever the throw put into him; he rights himself.
    prevSpin.copy(spin); spin.multiplyScalar(Math.exp(-dt * .4));
    const lookYaw = hovered >= 0 && !beaming ? Math.atan2(frames[hovered].anchor.x - pos.x, 7) * .6 : smoothPointer.x * .25;
    euler.set(Math.sin(elapsed * .29) * .32 + spin.x * .4, Math.sin(elapsed * .21) * .5 + spin.y * .5 + lookYaw, Math.sin(elapsed * .25) * .36 + spin.z * .5);
    targetQ.setFromEuler(euler);
    if (beaming) targetQ.setFromEuler(euler.set(-1, Math.atan2(beaming.frame.anchor.x - pos.x, 3), 0));
    astro.quaternion.slerp(targetQ, 1 - Math.exp(-dt * (grabbed ? 3 : 2)));
    if (pull > 0) astro.rotateZ(spin.z * dt * 2);
    astro.scale.set(baseScale, baseScale * stretch, baseScale);
    let yaw = smoothPointer.x * .7, pitch = smoothPointer.y * .3;
    if (hovered >= 0 && !beaming) { yaw = THREE.MathUtils.clamp((frames[hovered].anchor.x - pos.x) * .3, -1, 1); pitch = THREE.MathUtils.clamp((frames[hovered].anchor.y - pos.y - 1) * .15, -.45, .35); }
    const waveW = wave > 0 ? Math.min(1, wave * 2, (2.4 - wave) * 3) : 0;
    curator.animate(elapsed * 2, 0, 0, dt * timeScale, .2, { yaw, pitch, wave: waveW, tablet: W.tablet * (1 - waveW), dive: W.dive, float: W.float, flail: W.flail, reach: W.reach, time: elapsed, sit: W.sit });
    astro.updateMatrixWorld(true);

    // --- Tablet in his right hand, eased in and out rather than switched ---
    const hand = bone('RightHand');
    const tabletShow = astro.visible ? W.tablet * (1 - waveW) : 0;
    tablet.visible = tabletShow > .03 && !!hand;
    if (hand && tablet.visible) {
      hand.getWorldPosition(handPos); astro.getWorldQuaternion(q); fwd.set(0, 0, 1).applyQuaternion(q); upv.set(0, 1, 0).applyQuaternion(q);
      tablet.position.copy(handPos).addScaledVector(fwd, .13 * s()).addScaledVector(upv, .05 * s());
      tablet.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-.5, 0, 0)));
      tablet.scale.setScalar(s() * 1.3 * Math.min(1, tabletShow * 1.4));
    }
    if (now - lastTablet > 120) { lastTablet = now; drawTablet(elapsed, beaming ? 'beam' : tabletMode, hovered >= 0 ? frames[hovered]?.path ?? '' : ''); }

    // --- Tether: verlet rope from the belt, drifting, pulled faintly towards the hole ---
    const hips = bone('Hips');
    if (hips && astro.visible) {
      hips.getWorldPosition(belt); astro.getWorldQuaternion(q); belt.add(tmp2.set(.16 * s(), -.05 * s(), -.05 * s()).applyQuaternion(q));
      if (!ropeReady) { rope.forEach((r, i) => { r.p.copy(belt).add(tmp2.set(i * ropeSeg() * .6, -i * ropeSeg() * .6, 0)); r.q.copy(r.p); }); ropeReady = true; }
      const pullDir = tmp.copy(holeWorld).sub(belt).normalize().multiplyScalar(.12 * dt * dt);
      for (let i = 1; i < ROPE; i++) { const r = rope[i]; const nx = r.p.clone().multiplyScalar(1.985).sub(r.q.clone().multiplyScalar(.985)).add(pullDir); r.q.copy(r.p); r.p.copy(nx); }
      rope[0].p.copy(belt); rope[0].q.copy(belt);
      for (let it = 0; it < 6; it++) for (let i = 1; i < ROPE; i++) {
        const a = rope[i - 1].p, b = rope[i].p; const d = tmp2.copy(b).sub(a); const len = d.length() || 1e-4; const diff = (len - ropeSeg()) / len;
        if (i === 1) b.addScaledVector(d, -diff); else { a.addScaledVector(d, diff * .5); b.addScaledVector(d, -diff * .5); }
      }
      const curve = new THREE.CatmullRomCurve3(rope.map(r => r.p));
      ropeMesh?.geometry.dispose();
      if (!ropeMesh) { ropeMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .014 * s() * 1.42, 5, false), ropeMat); scene.add(ropeMesh); }
      else ropeMesh.geometry = new THREE.TubeGeometry(curve, 40, .014 * s() * 1.42, 5, false);
      ropeTip.position.copy(rope[ROPE - 1].p); ropeTip.scale.setScalar(s() * (Math.sin(elapsed * 6) > .2 ? 1 : .35));
    }
    if (ropeMesh) ropeMesh.visible = astro.visible; ropeTip.visible = astro.visible;

    // --- Puffs from the pack while he steadies himself ---
    const pack = bone('Spine2');
    if (pack && astro.visible && !grabbed && !beaming && !o.reduced) {
      const steadying = prevSpin.length() > .25 || vel.length() > 1.2;
      if (steadying && Math.random() < dt * 14 || Math.random() < dt * .25) {
        pack.getWorldPosition(packPos); astro.getWorldQuaternion(q);
        const back = tmp2.set((Math.random() > .5 ? 1 : -1) * .2 * s(), -.1 * s(), -.3 * s()).applyQuaternion(q); packPos.add(back);
        puff(packPos, back.clone().normalize().add(vel.clone().multiplyScalar(-.08)), steadying ? 3 : 2);
      }
    }
    const pl = puffGeo.attributes.life as THREE.BufferAttribute, pp = puffGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < PUFFS; i++) if (puffLife[i] > 0) { puffLife[i] = Math.max(0, puffLife[i] - dt * 1.4); puffVel[i].multiplyScalar(Math.exp(-dt * 1.5)); puffPos[i * 3] += puffVel[i].x * dt; puffPos[i * 3 + 1] += puffVel[i].y * dt; puffPos[i * 3 + 2] += puffVel[i].z * dt; }
    pl.needsUpdate = true; pp.needsUpdate = true; (puffs.material as THREE.ShaderMaterial).uniforms.uScale.value = renderer.getPixelRatio() * (mobile ? .8 : 1);

    // --- Cards: anchors follow the page; a signal line runs from his tablet to each ---
    if (tablet.visible) screen.getWorldPosition(threadFrom); else threadFrom.copy(astroCenter());
    frames.forEach((f, i) => {
      anchorOf(f);
      f.hover = THREE.MathUtils.damp(f.hover, i === hovered ? 1 : 0, 8, dt);
      f.el.classList.toggle('is-locked', i === hovered && !beaming);
      f.el.classList.toggle('is-beaming', beaming?.frame === f);
      const to = f.anchor; const mid = tmp.copy(threadFrom).lerp(to, .5).add(tmp2.set(0, .7, .5));
      const arr = f.thread.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < arr.count; k++) { const t = k / (arr.count - 1), a = 1 - t; arr.setXYZ(k, a * a * threadFrom.x + 2 * a * t * mid.x + t * t * to.x, a * a * threadFrom.y + 2 * a * t * mid.y + t * t * to.y, a * a * threadFrom.z + 2 * a * t * mid.z + t * t * to.z); }
      arr.needsUpdate = true;
      f.thread.visible = scroll < .35;
      f.thread.material.uniforms.uTime.value = elapsed; f.thread.material.uniforms.uOn.value = Math.max(f.hover, f.best ? .22 : 0) * (astro.visible ? 1 : 0) * (1 - scroll * 2.5);
    });
    if (o.onAstro) { const c = astroCenter().clone().project(camera); o.onAstro((c.x * .5 + .5) * canvas.clientWidth, (-c.y * .5 + .5) * canvas.clientHeight, astro.visible && scroll < .3, grabbed); }

    // --- Beam: drops him back in on respawn, lifts him out on departure ---
    const beamI = respawn > 0 ? Math.sin(respawn * Math.PI) : beaming ? Math.max(0, (beaming.t - .5) / .5) : 0;
    beam.visible = beamI > .01;
    if (beam.visible) { beam.position.copy(beaming ? astro.position : home).add(tmp2.set(0, 1.1 * s() / .76, 0)); beam.scale.setScalar(s() / .76); (beam.material as THREE.ShaderMaterial).uniforms.uI.value = beamI; (beam.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed; }

    // --- Streaks: spiral inwards, speeding up, stretching ---
    for (let i = 0; i < STREAKS; i++) {
      const st = streakState[i]; if (st.p.lengthSq() === 0) spawnStreak(st, true);
      const dx = holeWorld.x - st.p.x, dy = holeWorld.y - st.p.y, d = Math.hypot(dx, dy) + .3;
      const pullA = 3.2 / (d * d + 2), swirl = 2.4 / (d + 1.5);
      st.v.x += (dx / d * pullA - dy / d * swirl * .5) * dt * timeScale; st.v.y += (dy / d * pullA + dx / d * swirl * .5) * dt * timeScale;
      st.v.multiplyScalar(Math.exp(-dt * .3)); st.p.addScaledVector(st.v, dt * timeScale * (.6 + st.seed));
      if (d < 2.2 || d > 32) spawnStreak(st, false);
      const tail = tmp.copy(st.p).addScaledVector(st.v, -.12 - st.seed * .08);
      streakPos.set([st.p.x, st.p.y, st.p.z, tail.x, tail.y, tail.z], i * 6);
      const b = Math.min(1.6, .25 + st.v.length() * .35) * (st.seed > .7 ? 1.4 : .8) * smoothstepJS(2.2, 4.5, d);
      streakCol.set([b * .22, b * .16, b * .12, 0, 0, 0], i * 6);
    }
    streakGeo.attributes.position.needsUpdate = true; streakGeo.attributes.color.needsUpdate = true;

    holeUniforms.uFlash.value = beaming ? holeUniforms.uFlash.value : holeUniforms.uFlash.value * Math.exp(-dt * 2.5);
    holeUniforms.uTime.value = elapsed;
    // A slow, breathing camera; scrolling down lowers it towards the plane of the disk.
    holeUniforms.uTilt.value.set(.3 - scroll * .16 + Math.sin(elapsed * .17) * .025 + smoothPointer.y * .04, -.06 + Math.sin(elapsed * .11) * .02 + smoothPointer.x * .03);
    // The address falls in over 14 s, rests 3 s, and is written again.
    const cycle = (elapsed % 17) / 14; holeUniforms.uTextFall.value = Math.min(1, cycle); holeUniforms.uTextAge.value = (elapsed % 17);
    holeUniforms.uTextOn.value = cycle < 1 ? 1 : 0;
    finish.uniforms.uTime.value = elapsed;
    o.onTelemetry?.({ horizon: pos.distanceTo(holeWorld), speed: vel.length() });
    composer.render(dt);
    if (!primed) { primed = true; host.classList.add('is-live'); }
  }
  function smoothstepJS(a: number, b: number, x: number) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  layout(); bindCards(o.cards); pos.copy(home);
  if (location.search.includes('driftdebug')) (window as unknown as Record<string, unknown>).__drift = { astro, tablet, camera, bone, holeUniforms, renderer };
  const ro = new ResizeObserver(() => layout()); ro.observe(host);
  const io = new IntersectionObserver(([entry]) => { const on = entry.isIntersecting && !document.hidden; if (on && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } else if (!on && running) { running = false; cancelAnimationFrame(raf); } });
  io.observe(host);
  document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (document.hidden) running = false; else { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } });
  raf = requestAnimationFrame(tick);
  return {
    relabel() { drawText(); },
    cards(list: HTMLElement[]) { hovered = -1; bindCards(list); },
    pulse() { wake(); wave = 2.4; tabletNote = o.lang() === "de" ? "DU BIST NICHT ALLEIN" : "YOU ARE NOT ALONE"; },
    scroll(value: number) { scroll = THREE.MathUtils.clamp(value, 0, 1); canvas.style.pointerEvents = scroll > .5 ? "none" : "auto"; },
    beam(path: string) { const i = frames.findIndex(f => f.path === path); if (i >= 0) beamTo(i); else o.onNavigate?.(path); },
    dispose() { motionObserver.disconnect(); motionQuery.removeEventListener("change", motion); cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); curator.dispose(); composer.dispose(); renderer.dispose(); quad.dispose(); holeMaterial.dispose(); blitMaterial.dispose(); holeTarget.dispose(); textTex.dispose(); pmrem.dispose(); },
  };
}
