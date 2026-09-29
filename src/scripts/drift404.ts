/*
 * 404 — "The Drift".
 *
 * The visitor has fallen out of the Observatory into open space. A black hole
 * bends the starlight behind everything (geodesics integrated per pixel in a
 * shader, rendered at a reduced resolution that adapts to the device); the same
 * astronaut from the archive floats untethered in front of it, his tablet
 * showing the address that led nowhere; and the pages the visitor most likely
 * meant drift past as lit frames. Grab him and throw him, or pick a frame and he
 * beams you there. Leave him alone long enough and the hole takes him.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createAstronaut } from './observatory-astronaut';
import type { DriftRoute } from '../data/drift-routes';

type Lang = 'en' | 'de';
export type Signal = { route: DriftRoute; score: number };

/* ---------- Where did they mean to go? ---------- */
const norm = (s: string) => s.toLowerCase().replace(/\.(html?|php)$/, '').replace(/[^a-z0-9äöüß]+/g, ' ').trim();
function lev(a: string, b: string) {
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
const similar = (a: string, b: string) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);
const IGNORE = new Set(['en', 'de', 'www', 'index', 'page', 'the']);
export function rankSignals(requested: string, routes: DriftRoute[], lang: Lang, count: number): Signal[] {
  const wanted = norm(decodeURIComponent(requested)).split(' ').filter(t => t && !IGNORE.has(t));
  const scored = routes.map(route => {
    if (!wanted.length) return { route, score: 0 };
    const tokens = [...norm(route.path).split(' '), ...norm(route[lang]).split(' ')].filter(t => t && !IGNORE.has(t));
    const whole = similar(wanted.join(''), norm(route.path).replace(/ /g, ''));
    const per = wanted.reduce((sum, w) => sum + Math.max(0, ...tokens.map(t => t.startsWith(w) && w.length > 2 ? .92 : similar(w, t))), 0) / wanted.length;
    const fit = route.lang === 'any' || route.lang === lang ? 1 : .9;
    return { route, score: Math.max(whole, per * .97) * fit };
  }).sort((a, b) => b.score - a.score);
  const picks: Signal[] = scored.filter(s => s.score >= .55).slice(0, Math.min(3, count));
  const defaults = lang === 'de' ? ['/', '/gallery/', '/de/leistungen/', '/de/kontakt/', '/work/studio/'] : ['/', '/gallery/', '/services/', '/contact/', '/work/studio/'];
  for (const path of defaults) {
    if (picks.length >= count) break;
    if (picks.some(p => p.route.path === path)) continue;
    const route = routes.find(r => r.path === path); if (route) picks.push({ route, score: 0 });
  }
  return picks;
}

/* ---------- The black hole ---------- */
const HOLE_FRAG = /* glsl */`
precision highp float;
uniform vec2 uRes;uniform float uTime;uniform vec2 uCenter;uniform float uDist;uniform vec2 uTilt;uniform int uSteps;uniform float uFlash;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vnoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 sky(vec3 d){
  vec3 col=vec3(.004,.006,.012);
  float n=fbm(d*2.2+vec3(3.,0.,uTime*.004));
  col+=vec3(.06,.09,.2)*smoothstep(.45,.95,n)*.7;
  col+=vec3(.2,.07,.16)*smoothstep(.55,1.05,fbm(d*3.1-4.))*.35;
  for(int k=0;k<2;k++){
    float sc=k==0?140.:320.;vec3 p=d*sc;vec3 c=floor(p);float h=hash(c);
    vec3 f=fract(p)-.5-(vec3(hash(c+3.1),hash(c+7.7),hash(c+1.3))-.5)*.6;
    float s=smoothstep(k==0?.975:.955,1.,h)*max(0.,1.-length(f)*(k==0?2.6:3.4));
    float tw=.7+.3*sin(uTime*(1.+h*3.)+h*50.);
    col+=mix(vec3(.75,.85,1.),vec3(1.,.86,.7),fract(h*13.))*s*s*tw*(k==0?2.2:1.1);
  }
  return col;
}
void main(){
  vec2 uv=(gl_FragCoord.xy/uRes-uCenter)*vec2(uRes.x/uRes.y,1.);
  vec3 ro=vec3(0.,0.,-uDist);vec3 rd=normalize(vec3(uv,1.25));
  float cx=cos(uTilt.x),sx=sin(uTilt.x),cy=cos(uTilt.y),sy=sin(uTilt.y);
  mat3 rx=mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx);mat3 ry=mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy);
  ro=ry*(rx*ro);rd=ry*(rx*rd);
  vec3 pos=ro,dir=rd;vec3 h=cross(pos,dir);float h2=dot(h,h);
  vec4 acc=vec4(0.);bool hole=false;float glow=0.;
  for(int i=0;i<200;i++){
    if(i>=uSteps)break;
    float r2=dot(pos,pos);float r=sqrt(r2);
    float dt=clamp(.075*r,.025,1.4);
    vec3 npos=pos+dir*dt;
    if(pos.y*npos.y<0.){
      float t=pos.y/(pos.y-npos.y);vec3 hp=mix(pos,npos,t);float dr=length(hp.xz);
      if(dr>2.4&&dr<13.){
        float ang=atan(hp.z,hp.x);float spin=uTime*2.2/(dr*sqrt(dr));
        float swirl=fbm(vec3(dr*1.6,(ang+spin)*3.,dr*.35));float fine=vnoise(vec3(dr*9.,(ang+spin)*14.,1.));
        float heat=1.-smoothstep(2.4,13.,dr);
        vec3 c=mix(vec3(.95,.3,.07),vec3(1.,.9,.74),heat*heat)*(.25+1.9*heat*heat);
        c*=.4+.85*swirl+.25*fine;
        vec3 v=normalize(vec3(-hp.z,0.,hp.x));float dop=1.+.62*dot(v,-normalize(dir));c*=dop*dop;
        float a=smoothstep(2.4,3.,dr)*(1.-smoothstep(8.5,13.,dr))*(.5+.5*swirl);
        acc.rgb+=(1.-acc.a)*c*a;acc.a+=(1.-acc.a)*a*.92;
        if(acc.a>.97)break;
      }
    }
    glow+=dt*.018/max(.2,(r2-1.2)*(r2-1.2));
    dir+=-1.5*h2*pos/(r2*r2*r)*dt;pos=npos;
    if(r2<1.){hole=true;break;}
    if(r2>1600.)break;
  }
  vec3 col=acc.rgb;
  if(!hole)col+=(1.-acc.a)*sky(normalize(dir));
  col+=vec3(1.,.72,.45)*min(glow,1.2)*.18*(1.-acc.a);
  col+=vec3(.75,.85,1.)*uFlash;
  col=col/(1.+col*.45);
  gl_FragColor=vec4(pow(col,vec3(.92)),1.);
}`;

/* ---------- Scene ---------- */
export type DriftOptions = {
  host: HTMLElement; routes: DriftRoute[]; requested: string; lang: () => Lang;
  onSignals?: (signals: Signal[]) => void; onTelemetry?: (t: { horizon: number; speed: number }) => void;
  onNavigate?: (path: string) => void; reduced: boolean;
};

export function mountDrift(o: DriftOptions) {
  const { host, routes, requested } = o;
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 2 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.autoClear = false;
  host.append(renderer.domElement);
  const canvas = renderer.domElement; canvas.style.touchAction = 'pan-y';

  // Background: the hole, drawn into a smaller target and stretched to the screen.
  const gl = renderer.getContext();
  const name = String(gl.getParameter((gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL) ?? gl.RENDERER));
  const weak = /SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(name) || (/Intel|HD Graphics|UHD Graphics|Mali|Adreno|PowerVR/i.test(name) && !/Iris Xe|Arc/i.test(name));
  let holeScale = mobile ? .38 : weak ? .42 : .6, steps = mobile ? 70 : weak ? 90 : 130;
  const holeTarget = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false });
  const holeUniforms = { uRes: { value: new THREE.Vector2(2, 2) }, uTime: { value: 0 }, uCenter: { value: new THREE.Vector2(.68, .52) }, uDist: { value: 21 }, uTilt: { value: new THREE.Vector2(.085, 0) }, uSteps: { value: steps }, uFlash: { value: 0 } };
  const quad = new THREE.BufferGeometry(); quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const holeScene = new THREE.Scene(), flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  holeScene.add(new THREE.Mesh(quad, new THREE.RawShaderMaterial({ uniforms: holeUniforms, vertexShader: 'attribute vec3 position;void main(){gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: HOLE_FRAG, depthTest: false, depthWrite: false })));
  const blitScene = new THREE.Scene();
  blitScene.add(new THREE.Mesh(quad, new THREE.RawShaderMaterial({
    uniforms: { uMap: { value: holeTarget.texture } },
    vertexShader: 'attribute vec3 position;varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'precision highp float;uniform sampler2D uMap;varying vec2 vUv;void main(){gl_FragColor=vec4(texture2D(uMap,vUv).rgb,1.);}', depthTest: false, depthWrite: false,
  })));

  // Foreground: astronaut, frames, sparks.
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 200); camera.position.set(0, 0, 11);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .35;
  scene.add(new THREE.HemisphereLight('#8fb2ff', '#140a06', .55));
  const diskLight = new THREE.DirectionalLight('#ffb070', 3.2); scene.add(diskLight);
  const rim = new THREE.DirectionalLight('#9fc8ff', 1.4); rim.position.set(-6, 4, -3); scene.add(rim);
  const key = new THREE.DirectionalLight('#ffffff', .9); key.position.set(-3, 2, 8); scene.add(key);

  const curator = createAstronaut(); const astro = curator.root; astro.scale.multiplyScalar(mobile ? .62 : .78); scene.add(astro);
  void curator.load();
  let hand: THREE.Object3D | undefined, handRig = '';
  // Re-found once the animated rig replaces the procedural stand-in.
  const findHand = () => { const rig = String(astro.userData.astronautRig ?? ''); if (hand && rig === handRig) return hand; handRig = rig; hand = undefined; astro.traverse(obj => { if (!hand && /RightHand$/.test(obj.name)) hand = obj; }); return hand; };

  // Tablet with the lost address on it.
  const tabletCanvas = document.createElement('canvas'); tabletCanvas.width = 512; tabletCanvas.height = 320;
  const tabletTex = new THREE.CanvasTexture(tabletCanvas); tabletTex.colorSpace = THREE.SRGBColorSpace;
  const tablet = new THREE.Group();
  tablet.add(new THREE.Mesh(new THREE.BoxGeometry(.36, .24, .02), new THREE.MeshStandardMaterial({ color: '#1a2129', metalness: .6, roughness: .35 })));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.33, .21), new THREE.MeshBasicMaterial({ map: tabletTex, toneMapped: false })); screen.position.z = .011; tablet.add(screen);
  scene.add(tablet);
  let tabletNote = '';
  function drawTablet(time: number, mode: 'lost' | 'beam' | 'back') {
    const c = tabletCanvas.getContext('2d')!; const W = 512, H = 320, blink = Math.sin(time * 5) > 0;
    c.fillStyle = '#04101a'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(143,216,255,.08)'; for (let x = 0; x < W; x += 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    const accent = mode === 'lost' ? '#ff8a6a' : '#8fd8ff';
    c.fillStyle = accent; c.font = '600 26px ui-monospace,Consolas,monospace';
    c.fillText(mode === 'lost' ? (blink ? '● SIGNAL LOST' : '○ SIGNAL LOST') : mode === 'beam' ? '▲ BEAMING' : '✓ RECONNECTED', 26, 52);
    c.fillStyle = '#eaf6ff'; c.font = '700 110px ui-monospace,Consolas,monospace'; c.fillText('404', 26, 176);
    c.fillStyle = 'rgba(200,230,255,.75)'; c.font = '500 24px ui-monospace,Consolas,monospace';
    let path = tabletNote || requested; if (path.length > 30) path = path.slice(0, 29) + '…'; c.fillText(path, 26, 232);
    c.fillStyle = 'rgba(143,216,255,.25)'; c.fillRect(26, 262, 460, 8); c.fillStyle = accent; c.fillRect(26, 262, 460 * (mode === 'lost' ? (.15 + .1 * Math.sin(time * 2)) : 1), 8);
    tabletTex.needsUpdate = true;
  }

  // Frames: the signals still transmitting.
  const loader = new THREE.TextureLoader();
  type Frame = { group: THREE.Group; photo: THREE.Mesh; border: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; label: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; labelCanvas: HTMLCanvasElement; signal: Signal; base: THREE.Vector3; seed: number; hover: number; best: boolean };
  let frames: Frame[] = [];
  const frameW = mobile ? 1.62 : 2.05, frameH = frameW * .525;
  function drawLabel(f: Frame) {
    const c = f.labelCanvas.getContext('2d')!; const W = f.labelCanvas.width, H = f.labelCanvas.height; c.clearRect(0, 0, W, H);
    const lang = o.lang();
    c.fillStyle = f.best ? '#ffd98a' : 'rgba(170,200,230,.7)'; c.font = '600 22px ui-monospace,Consolas,monospace';
    c.fillText(f.best ? (lang === 'de' ? 'NÄCHSTES SIGNAL' : 'CLOSEST SIGNAL') : (lang === 'de' ? 'SIGNAL' : 'SIGNAL'), 6, 30);
    c.fillStyle = '#f2f7fb'; c.font = '500 36px "RB Space",Inter,Arial,sans-serif';
    let title = f.signal.route[lang]; while (c.measureText(title).width > W - 12 && title.length > 4) title = title.slice(0, -2) + '…';
    c.fillText(title, 6, 76);
    c.fillStyle = 'rgba(190,210,230,.55)'; c.font = '400 22px ui-monospace,Consolas,monospace'; c.fillText(f.signal.route.path, 6, 110);
    f.label.material.map!.needsUpdate = true;
  }
  function buildFrames() {
    frames.forEach(f => { scene.remove(f.group); f.photo.geometry.dispose(); ((f.photo.material as THREE.MeshBasicMaterial).map)?.dispose(); });
    const signals = rankSignals(requested, routes, o.lang(), host.clientWidth < host.clientHeight * .9 ? 2 : 5); o.onSignals?.(signals);
    frames = signals.map((signal, i) => {
      const group = new THREE.Group();
      const border = new THREE.Mesh(new THREE.PlaneGeometry(frameW + .08, frameH + .08), new THREE.MeshBasicMaterial({ color: i === 0 && signal.score > 0 ? '#ffd98a' : '#8fd8ff', transparent: true, opacity: .35, toneMapped: false, depthWrite: false }));
      border.position.z = -.01; group.add(border);
      const tex = loader.load(signal.route.image); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const photo = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameH), new THREE.MeshBasicMaterial({ map: tex, color: '#c8ccd2', toneMapped: false })); group.add(photo);
      const labelCanvas = document.createElement('canvas'); labelCanvas.width = 512; labelCanvas.height = 128;
      const labelTex = new THREE.CanvasTexture(labelCanvas); labelTex.colorSpace = THREE.SRGBColorSpace; labelTex.anisotropy = 4;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameW / 4), new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, toneMapped: false, depthWrite: false }));
      label.position.y = -frameH / 2 - frameW / 8 - .04; group.add(label);
      photo.userData.frame = i; border.userData.frame = i;
      scene.add(group);
      const f: Frame = { group, photo, border, label, labelCanvas, signal, base: new THREE.Vector3(), seed: Math.random() * 10, hover: 0, best: i === 0 && signal.score > 0 };
      drawLabel(f); return f;
    });
    layout();
  }

  // Screen-space layout, projected onto the depth each object floats at.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), tmp = new THREE.Vector3();
  function worldAt(x: number, y: number, z: number, out = new THREE.Vector3()) {
    ndc.set(x, y); ray.setFromCamera(ndc, camera); plane.constant = -z; return ray.ray.intersectPlane(plane, out) ?? out.set(0, 0, z);
  }
  const home = new THREE.Vector3(), holeWorld = new THREE.Vector3();
  function layout() {
    const w = host.clientWidth, h = host.clientHeight, portrait = w < h * .9;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = portrait ? 50 : 38; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    holeUniforms.uCenter.value.set(portrait ? .5 : .69, portrait ? .6 : .52);
    holeUniforms.uDist.value = portrait ? 26 : 21;
    holeTarget.setSize(Math.max(2, Math.round(w * renderer.getPixelRatio() * holeScale)), Math.max(2, Math.round(h * renderer.getPixelRatio() * holeScale)));
    holeUniforms.uRes.value.set(holeTarget.width, holeTarget.height);
    worldAt(portrait ? .02 : .08, portrait ? -.08 : -.18, 1.2, home);
    worldAt(holeUniforms.uCenter.value.x * 2 - 1, holeUniforms.uCenter.value.y * 2 - 1, -14, holeWorld);
    diskLight.position.copy(holeWorld);
    const spots = portrait
      ? [[-.47, -.5, .5], [.47, -.54, .3]]
      : [[-.4, -.48, .6], [.06, -.58, .1], [.5, -.5, -.4], [.84, .12, -1.6], [.63, .64, -2.6]];
    frames.forEach((f, i) => { const s = spots[i] ?? spots[spots.length - 1]; worldAt(s[0], s[1], s[2], f.base); f.group.position.copy(f.base); f.group.scale.setScalar(f.best ? 1.12 : 1); });
  }

  /* ---------- Motion ---------- */
  const pos = new THREE.Vector3(), vel = new THREE.Vector3(), spin = new THREE.Vector3(), euler = new THREE.Euler(), prevPointer = new THREE.Vector3();
  let grabbed = false, grabOffset = new THREE.Vector3(), pointerWorld = new THREE.Vector3(), pointerVel = new THREE.Vector3(), lastMove = performance.now();
  let hovered = -1, beaming: { frame: Frame; t: number; from: THREE.Vector3 } | undefined, idle = 0, pull = 0, swallowed = 0, respawn = 0, wave = 0, stretch = 1;
  const pointerNdc = new THREE.Vector2(-9, -9);
  let started = false;

  function pointerRay(event: PointerEvent) {
    const r = canvas.getBoundingClientRect(); pointerNdc.set((event.clientX - r.left) / r.width * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pointerNdc, camera);
  }
  const astroCenter = () => tmp.copy(pos).add(new THREE.Vector3(0, 1.25 * astro.scale.y / 1.42, 0));
  function hitAstro() { const c = astroCenter(); return ray.ray.distanceSqToPoint(c) < Math.pow(.95 * astro.scale.y / 1.42, 2) * 1.3; }
  function hitFrame() { const hits = ray.intersectObjects(frames.flatMap(f => [f.photo, f.border]), false); return hits.length ? Number(hits[0].object.userData.frame) : -1; }
  function wake() { lastMove = performance.now(); if (pull > 0 && !swallowed) pull = 0; }

  canvas.addEventListener('pointerdown', event => {
    if (beaming) return; pointerRay(event); wake();
    if (hitAstro() && !swallowed) {
      grabbed = true; canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
      plane.constant = -pos.z; ray.ray.intersectPlane(plane, pointerWorld); grabOffset.copy(pos).sub(pointerWorld); prevPointer.copy(pointerWorld); pointerVel.set(0, 0, 0);
      event.preventDefault();
    }
  });
  canvas.addEventListener('pointermove', event => {
    pointerRay(event); wake();
    if (grabbed) { plane.constant = -pos.z; ray.ray.intersectPlane(plane, pointerWorld); return; }
    hovered = beaming ? -1 : hitFrame();
    canvas.style.cursor = hovered >= 0 ? 'pointer' : hitAstro() ? 'grab' : 'default';
    if (!wave && !grabbed && hitAstro() && idle > 3) wave = 2.2;
  });
  const release = (event: PointerEvent) => {
    if (!grabbed) return; grabbed = false; canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    vel.copy(pointerVel).clampLength(0, 14); spin.set(-vel.y * .35, vel.x * .12, -vel.x * .45);
  };
  canvas.addEventListener('pointerup', event => {
    if (grabbed) { release(event); return; }
    pointerRay(event); const i = hitFrame(); if (i >= 0) beamTo(i);
  });
  canvas.addEventListener('pointercancel', release);
  // On touch the page scrolls by default; a finger that lands on him or on a frame keeps the gesture.
  canvas.addEventListener('touchstart', event => {
    const t = event.touches[0]; if (!t || event.touches.length > 1) return;
    const r = canvas.getBoundingClientRect(); pointerNdc.set((t.clientX - r.left) / r.width * 2 - 1, -((t.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(pointerNdc, camera);
    if (hitAstro()) event.preventDefault();
  }, { passive: false });
  canvas.addEventListener('pointerleave', () => { hovered = -1; pointerNdc.set(-9, -9); });

  function beamTo(index: number) {
    const frame = frames[index]; if (!frame || beaming) return;
    beaming = { frame, t: 0, from: pos.clone() }; tabletNote = frame.signal.route.path; hovered = index;
  }

  // Beam column for the respawn and the departure.
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 7, 32, 1, true), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uTime,uI;varying vec2 vUv;void main(){float band=.5+.5*sin(vUv.y*40.-uTime*9.+vUv.x*18.);float edge=pow(1.-abs(vUv.y-.5)*2.,1.5);gl_FragColor=vec4(vec3(.55,.85,1.)*(.35+.65*band)*edge*uI,1.);}',
  })); beam.visible = false; scene.add(beam);

  // Dust drifting toward the hole.
  const dustCount = mobile ? 260 : 700; const dustPos = new Float32Array(dustCount * 3), dustSeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) { dustPos.set([(Math.random() - .5) * 26, (Math.random() - .5) * 16, -8 + Math.random() * 14], i * 3); dustSeed[i] = Math.random(); }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#cfe4ff', size: mobile ? .035 : .028, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* ---------- Frame loop ---------- */
  let last = performance.now(), elapsed = 0, raf = 0, running = true, frameTimes: number[] = [], lastTablet = 0;
  const q = new THREE.Quaternion(), targetQ = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(), handPos = new THREE.Vector3();
  const timeScale = o.reduced ? .2 : 1;
  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; elapsed += dt * timeScale;
    // Adaptive cost: the hole is the expensive part, so it gives way first.
    frameTimes.push(dt); if (frameTimes.length >= 50) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length; frameTimes = [];
      if (avg > 1 / 45 && holeScale > .24) { holeScale *= .82; steps = Math.max(48, Math.round(steps * .85)); holeUniforms.uSteps.value = steps; layout(); }
    }
    idle = (now - lastMove) / 1000;

    // Motion of the astronaut.
    let dive = .32, tabletHold = .85, sit = 0, yaw = 0, pitch = 0;
    if (beaming) {
      beaming.t = Math.min(1, beaming.t + dt / 1.15);
      const target = tmp.copy(beaming.frame.group.position).add(new THREE.Vector3(-frameW * .1, -.9 * astro.scale.y / 1.42, .6));
      const e = beaming.t * beaming.t * (3 - 2 * beaming.t);
      pos.lerpVectors(beaming.from, target, e); dive = 1; tabletHold = 0;
      beaming.frame.hover = 1;
      holeUniforms.uFlash.value = Math.max(0, (beaming.t - .72) / .28) * .9;
      if (beaming.t >= 1 && !(beaming as any).gone) { (beaming as any).gone = true; o.onNavigate?.(beaming.frame.signal.route.path); }
    } else if (grabbed) {
      tmp.copy(pointerWorld).add(grabOffset);
      pointerVel.lerp(tmp.clone().sub(prevPointer).divideScalar(Math.max(dt, .008)), .35); prevPointer.copy(pointerWorld);
      pos.lerp(tmp, 1 - Math.exp(-dt * 16)); vel.set(0, 0, 0); dive = .95; tabletHold = 0; spin.multiplyScalar(.9);
    } else if (swallowed > 0) {
      swallowed += dt;
      if (swallowed > 2.2) { swallowed = 0; pull = 0; respawn = 1; pos.copy(home); vel.set(0, 0, 0); spin.set(0, 0, 0); stretch = 1; tabletNote = ''; lastMove = now; }
    } else {
      // Loose: a soft spring back to his spot, inertia from a throw, walls at the edges.
      const k = pull > 0 ? 0 : .55;
      vel.addScaledVector(tmp.copy(home).sub(pos), k * dt); vel.multiplyScalar(Math.exp(-dt * .55));
      // The edges of the screen are walls: he bounces off them, losing half his speed.
      const bound = worldAt(1, 1, pos.z, new THREE.Vector3()), body = 2.3 * astro.scale.x / 1.42, side = .45 * astro.scale.x / 1.42;
      const maxX = Math.abs(bound.x) - side, maxY = Math.abs(bound.y) - body - .15, minY = -Math.abs(bound.y) + .1;
      if (pull === 0) {
        if (pos.x > maxX) { pos.x = maxX; vel.x = -Math.abs(vel.x) * .55; spin.z += vel.y * .2; }
        if (pos.x < -maxX) { pos.x = -maxX; vel.x = Math.abs(vel.x) * .55; spin.z -= vel.y * .2; }
        if (pos.y > maxY) { pos.y = maxY; vel.y = -Math.abs(vel.y) * .55; spin.x += vel.x * .2; }
        if (pos.y < minY) { pos.y = minY; vel.y = Math.abs(vel.y) * .55; spin.x -= vel.x * .2; }
      }
      // Left alone for long enough, the hole starts to pull.
      if (!o.reduced && idle > 24 && pull === 0) pull = .001;
      if (pull > 0) {
        pull = Math.min(1, pull + dt / 9);
        const toHole = tmp.copy(holeWorld).sub(pos); const d = toHole.length();
        vel.addScaledVector(toHole.normalize(), (1.2 + 6 * pull * pull) * dt);
        spin.z += dt * 1.6 * pull; sit = .7 * pull; tabletHold = .6 * (1 - pull);
        stretch = 1 + pull * 1.6 * Math.max(0, 1 - d / 22);
        if (d < 3.2) { swallowed = .001; holeUniforms.uFlash.value = .55; }
      }
      pos.addScaledVector(vel, dt);
    }
    if (respawn > 0) respawn = Math.max(0, respawn - dt / 1.4);
    if (pull === 0) stretch = THREE.MathUtils.damp(stretch, 1, 3, dt);
    astro.visible = swallowed === 0 && respawn < .92;
    astro.position.copy(pos).add(new THREE.Vector3(0, Math.sin(elapsed * .7) * .12 * timeScale, 0));
    // Tumble: a slow zero-g drift plus whatever the throw put into him; he rights himself over time.
    spin.multiplyScalar(Math.exp(-dt * .35));
    euler.set(Math.sin(elapsed * .31) * .3 + spin.x * .4, Math.sin(elapsed * .23) * .45 + spin.y * .5 + (hovered >= 0 && !beaming ? Math.atan2(frames[hovered].group.position.x - pos.x, 6) * .5 : 0), Math.sin(elapsed * .27) * .34 + spin.z * .5);
    targetQ.setFromEuler(euler);
    if (beaming) targetQ.setFromEuler(euler.set(-.9, Math.atan2(beaming.frame.group.position.x - pos.x, 3), 0));
    astro.quaternion.slerp(targetQ, 1 - Math.exp(-dt * (grabbed ? 3 : 2.2)));
    if (pull > 0) astro.rotateZ(spin.z * dt * 2);
    astro.scale.set(astro.scale.x, astro.scale.x * stretch, astro.scale.x);
    if (hovered >= 0 && !beaming) { yaw = THREE.MathUtils.clamp((frames[hovered].group.position.x - pos.x) * .25, -.9, .9); pitch = THREE.MathUtils.clamp((frames[hovered].group.position.y - pos.y - 1) * .15, -.4, .3); tabletHold = .25; }
    else if (pointerNdc.x > -2) { yaw = pointerNdc.x * .6; pitch = pointerNdc.y * .25; }
    if (wave > 0) { wave = Math.max(0, wave - dt); tabletHold = 0; }
    curator.animate(elapsed * 2, 0, 0, dt * timeScale, .2, { yaw, pitch, wave: wave > 0 ? Math.min(1, wave * 2, (2.2 - wave) * 3) : 0, tablet: tabletHold, dive, sit });

    // The tablet rides in his right hand.
    const h = findHand(); tablet.visible = astro.visible && tabletHold > .3;
    if (h && tablet.visible) {
      h.getWorldPosition(handPos); astro.getWorldQuaternion(q); fwd.set(0, 0, 1).applyQuaternion(q);
      tablet.position.copy(handPos).addScaledVector(fwd, .12 * astro.scale.x / 1.42).addScaledVector(up.set(0, 1, 0).applyQuaternion(q), .04);
      tablet.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(euler.set(-.55, 0, 0)));
      tablet.scale.setScalar(astro.scale.x / 1.42 * 1.25);
    }
    if (now - lastTablet > 250) { lastTablet = now; drawTablet(elapsed, beaming ? 'beam' : respawn > 0 ? 'back' : 'lost'); }

    // Frames bob, turn a little toward the centre, and light up on hover.
    frames.forEach((f, i) => {
      f.hover = THREE.MathUtils.damp(f.hover, i === hovered ? 1 : 0, 8, dt);
      f.group.position.set(f.base.x + Math.sin(elapsed * .4 + f.seed) * .08, f.base.y + Math.sin(elapsed * .6 + f.seed * 2) * .1, f.base.z);
      f.group.rotation.set(Math.sin(elapsed * .5 + f.seed) * .04, -f.base.x * .045 + Math.sin(elapsed * .3 + f.seed) * .05, Math.sin(elapsed * .35 + f.seed) * .02);
      const s = (f.best ? 1.12 : 1) * (1 + f.hover * .07); f.group.scale.setScalar(s);
      f.border.material.opacity = .28 + f.hover * .6 + (f.best ? .15 : 0) + (beaming?.frame === f ? beaming.t * .6 : 0);
      (f.photo.material as THREE.MeshBasicMaterial).color.setScalar(.78 + f.hover * .22);
    });

    // Beam: on respawn it drops him back in; on departure it lifts him out.
    const beamI = respawn > 0 ? Math.sin(respawn * Math.PI) : beaming ? Math.max(0, (beaming.t - .55) / .45) : 0;
    beam.visible = beamI > .01; if (beam.visible) { beam.position.copy(beaming ? astro.position : home).add(new THREE.Vector3(0, 1.1, 0)); (beam.material as THREE.ShaderMaterial).uniforms.uI.value = beamI * .9; (beam.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed; }

    // Dust spirals slowly toward the hole.
    const p = dustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < dustCount; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const dx = holeWorld.x - x, dy = holeWorld.y - y, d = Math.hypot(dx, dy) + .5;
      x += (dx / d * .12 - dy / d * .25) * dt * timeScale * (.4 + dustSeed[i]); y += (dy / d * .12 + dx / d * .25) * dt * timeScale * (.4 + dustSeed[i]);
      if (d < 1.2) { x = (Math.random() - .5) * 26; y = (Math.random() > .5 ? 1 : -1) * (6 + Math.random() * 3); }
      p.setXYZ(i, x, y, z);
    }
    p.needsUpdate = true;
    holeUniforms.uFlash.value = Math.max(beaming ? holeUniforms.uFlash.value : 0, holeUniforms.uFlash.value * Math.exp(-dt * 2.5));
    holeUniforms.uTime.value = elapsed;
    // A little parallax with the pointer.
    holeUniforms.uTilt.value.set(.085 + (pointerNdc.y > -2 ? pointerNdc.y * .02 : 0), pointerNdc.x > -2 ? pointerNdc.x * .05 : 0);
    o.onTelemetry?.({ horizon: pos.distanceTo(holeWorld), speed: vel.length() });

    renderer.setRenderTarget(holeTarget); renderer.render(holeScene, flat);
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(blitScene, flat); renderer.clearDepth(); renderer.render(scene, camera);
    if (!started) { started = true; host.classList.add('is-live'); }
  }

  buildFrames(); pos.copy(home);
  const ro = new ResizeObserver(() => layout()); ro.observe(host);
  const io = new IntersectionObserver(([entry]) => { const on = entry.isIntersecting && !document.hidden; if (on && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } else if (!on && running) { running = false; cancelAnimationFrame(raf); } });
  io.observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else { running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); } });
  raf = requestAnimationFrame(tick);
  return {
    relabel() { buildFrames(); },
    beam(path: string) { const i = frames.findIndex(f => f.signal.route.path === path); if (i >= 0) beamTo(i); else o.onNavigate?.(path); },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); curator.dispose(); renderer.dispose(); holeTarget.dispose(); pmrem.dispose(); },
  };
}
