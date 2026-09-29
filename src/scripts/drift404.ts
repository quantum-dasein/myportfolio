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
  const wanted = norm(requested).split(' ').filter(t => t && !IGNORE.has(t));
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

/* ---------- The black hole (linear HDR out; the final pass tone-maps) ---------- */
const HOLE_FRAG = /* glsl */`
precision highp float;
uniform vec2 uRes;uniform float uTime;uniform vec2 uCenter;uniform float uDist;uniform vec2 uTilt;uniform int uSteps;uniform float uFlash;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vnoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 sky(vec3 d){
  vec3 col=vec3(.002,.003,.007);
  // A galactic band across the sky, dusty and uneven.
  vec3 axis=normalize(vec3(.35,1.,.25));float lat=dot(d,axis);
  float band=exp(-lat*lat*14.);float dustLane=smoothstep(.35,.75,fbm(d*6.+2.));
  col+=vec3(.035,.03,.05)*band*(.3+.9*fbm(d*3.2))*(1.-.7*dustLane*exp(-lat*lat*60.));
  float n=fbm(d*2.2+vec3(3.,0.,uTime*.004));
  col+=vec3(.015,.028,.075)*smoothstep(.5,.95,n);
  col+=vec3(.08,.015,.05)*smoothstep(.6,1.05,fbm(d*3.1-4.))*.45;
  for(int k=0;k<3;k++){
    float sc=k==0?90.:k==1?210.:420.;vec3 p=d*sc;vec3 c=floor(p);float h=hash(c+float(k)*17.);
    vec3 f=fract(p)-.5-(vec3(hash(c+3.1),hash(c+7.7),hash(c+1.3))-.5)*.6;
    float s=smoothstep(k==0?.985:k==1?.96:.94,1.,h)*max(0.,1.-length(f)*(k==0?2.2:3.4));
    float tw=.65+.35*sin(uTime*(1.+h*3.)+h*50.);
    vec3 tint=mix(vec3(.62,.78,1.),vec3(1.,.8,.6),fract(h*13.));
    col+=tint*s*s*tw*(k==0?3.2:k==1?1.3:.6)*(1.+band*1.2*float(k>0));
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
  vec4 acc=vec4(0.);bool hole=false,escaped=false;float ring=0.;
  for(int i=0;i<200;i++){
    if(i>=uSteps)break;
    float r2=dot(pos,pos);float r=sqrt(r2);
    // Fine steps near the photon sphere keep the edge of the shadow clean.
    float dt=clamp(.045*r*max(r-1.,.25)+.012,.012,1.4);
    vec3 npos=pos+dir*dt;
    if(pos.y*npos.y<0.){
      float t=pos.y/(pos.y-npos.y);vec3 hp=mix(pos,npos,t);float dr=length(hp.xz);
      if(dr>2.35&&dr<14.){
        float ang=atan(hp.z,hp.x);float spin=uTime*2.4/(dr*sqrt(dr));
        float swirl=fbm(vec3(dr*1.7,(ang+spin)*3.,dr*.35));float fine=vnoise(vec3(dr*11.,(ang+spin)*18.,1.));
        float heat=1.-smoothstep(2.35,14.,dr);
        vec3 c=mix(vec3(1.,.3,.06),vec3(1.,.9,.76),heat*heat)*(.12+1.35*heat*heat*heat);
        c*=.35+.9*swirl+.3*fine;
        vec3 v=normalize(vec3(-hp.z,0.,hp.x));float dop=1.+.6*dot(v,-normalize(dir));c*=dop*dop;
        // The hot inner rim, just outside the last stable orbit.
        c+=vec3(1.,.85,.65)*exp(-(dr-2.55)*(dr-2.55)*18.)*.7*dop;
        float a=smoothstep(2.35,2.7,dr)*(1.-smoothstep(9.,14.,dr))*(.45+.55*swirl);
        acc.rgb+=(1.-acc.a)*c*a;acc.a+=(1.-acc.a)*a*.9;
        if(acc.a>.97)break;
      }
    }
    // Light skimming the photon sphere piles up into a thin bright ring.
    ring+=dt*exp(-(r-1.5)*(r-1.5)*40.);
    dir+=-1.5*h2*pos/(r2*r2*r)*dt;pos=npos;
    if(r2<1.){hole=true;break;}
    if(r2>1600.){escaped=true;break;}
  }
  // Out of steps while still circling close in: it would have fallen in.
  if(!hole&&!escaped&&acc.a<.97&&dot(pos,pos)<36.)hole=true;
  vec3 col=acc.rgb;
  if(!hole)col+=(1.-acc.a)*sky(normalize(dir));
  if(!hole)col+=vec3(1.,.78,.55)*min(ring,2.)*.3*(1.-acc.a);
  col+=vec3(.75,.88,1.)*uFlash*1.6;
  gl_FragColor=vec4(col,1.);
}`;

/* ---------- Frames: holograms with a lit edge ---------- */
const FRAME_VERT = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const FRAME_FRAG = /* glsl */`
uniform sampler2D uMap;uniform float uTime,uHover,uGold,uAppear,uSeed,uAspect,uBeam;varying vec2 vUv;
float box(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float h1(float x){return fract(sin(x*91.7)*43758.5453);}
void main(){
  // The plane is 12% bigger than the image; the margin carries the halo.
  vec2 p=(vUv-.5)*vec2(uAspect,1.)*1.12;
  float d=box(p,vec2(uAspect,1.)*.5,.045);
  vec2 iuv=(p/vec2(uAspect,1.))+.5;
  // Appear: scanned in from the top with a glitchy leading edge.
  float line=floor(iuv.y*60.);float jitter=(h1(line+floor(uTime*18.)+uSeed)-.5)*.03*(1.-uAppear);
  float shown=step(1.-uAppear*1.15,1.-iuv.y+h1(line+uSeed)*.08);
  vec2 s=iuv+vec2(jitter,0.);
  float split=.001+.0018*(1.-uHover);
  vec3 img=vec3(texture2D(uMap,s+vec2(split,0.)).r,texture2D(uMap,s).g,texture2D(uMap,s-vec2(split,0.)).b);
  float scan=.93+.07*sin(iuv.y*540.+uTime*6.);
  float flick=.94+.06*step(.985,h1(floor(uTime*9.)+uSeed));
  vec3 edgeCol=mix(vec3(.45,.8,1.),vec3(1.,.8,.45),uGold);
  float inside=1.-smoothstep(0.,.004,d);
  float rim=exp(-abs(d)*90.)*(.7+1.6*uHover+2.4*uBeam);
  float halo=exp(-max(d,0.)*22.)*(1.-inside)*(.12+.45*uHover+.8*uBeam);
  vec3 col=img*(.62+.5*uHover)*scan*flick*inside;
  col*=1.-.35*smoothstep(.25,.62,length(iuv-.5));
  col+=edgeCol*(rim+halo);
  col+=vec3(.7,.9,1.)*uBeam*.6*inside;
  float a=clamp(inside*(.9+.1*uHover)+rim*.8+halo,0.,1.)*shown*uAppear;
  gl_FragColor=vec4(col*shown,a);
}`;

/* ---------- Final pass: fringing, vignette, grain ---------- */
const FINISH = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uTime: { value: 0 }, uHole: { value: new THREE.Vector2(.69, .52) }, uAspect: { value: 1.6 }, uFringe: { value: 1 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;uniform float uTime,uAspect,uFringe;uniform vec2 uHole;varying vec2 vUv;
    float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){
      // The sky is already lensed by the hole itself; the foreground stays true.
      vec2 uv=vUv;
      vec2 c=vUv-.5;float edge=dot(c,c);
      vec2 off=c*(.0012+.006*edge)*uFringe;
      vec3 col=vec3(texture2D(tDiffuse,uv+off).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-off).b);
      col*=1.-.55*smoothstep(.18,.62,edge*1.6);
      col+=(h(vUv*vec2(1920.,1080.)+fract(uTime*7.))-.5)*.018;
      gl_FragColor=vec4(max(col,0.),1.);
    }`,
};

/** The first pass: the hole into its own small target, then hole + scene into the composer. */
class DriftPass extends Pass {
  constructor(private draw: (target: THREE.WebGLRenderTarget) => void) { super(); this.needsSwap = false; }
  render(_renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget) { this.draw(read); }
}

/* ---------- Scene ---------- */
export type DriftOptions = {
  host: HTMLElement; routes: DriftRoute[]; requested: string; lang: () => Lang;
  onSignals?: (signals: Signal[]) => void; onTelemetry?: (t: { horizon: number; speed: number }) => void;
  onNavigate?: (path: string) => void; reduced: boolean;
};

export function mountDrift(o: DriftOptions) {
  const { host, routes, requested } = o;
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(devicePixelRatio || 1, mobile ? 1.75 : 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.autoClear = false;
  host.append(renderer.domElement);
  const canvas = renderer.domElement; canvas.style.touchAction = 'pan-y';

  const gl = renderer.getContext();
  const name = String(gl.getParameter((gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL) ?? gl.RENDERER));
  const weak = /SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(name) || (/Intel|HD Graphics|UHD Graphics|Mali|Adreno|PowerVR/i.test(name) && !/Iris Xe|Arc/i.test(name));
  let holeScale = mobile ? .46 : weak ? .42 : .6, steps = mobile ? 130 : weak ? 120 : 180;

  // The hole, drawn small and stretched: it is soft by nature, the stars stay crisp enough.
  const holeTarget = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false, type: THREE.HalfFloatType });
  const holeUniforms = { uRes: { value: new THREE.Vector2(2, 2) }, uTime: { value: 0 }, uCenter: { value: new THREE.Vector2(.69, .52) }, uDist: { value: 21 }, uTilt: { value: new THREE.Vector2(.085, 0) }, uSteps: { value: steps }, uFlash: { value: 0 } };
  const quad = new THREE.BufferGeometry(); quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const holeScene = new THREE.Scene();
  holeScene.add(new THREE.Mesh(quad, new THREE.RawShaderMaterial({ uniforms: holeUniforms, vertexShader: 'attribute vec3 position;void main(){gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: HOLE_FRAG, depthTest: false, depthWrite: false })));
  const blitScene = new THREE.Scene();
  blitScene.add(new THREE.Mesh(quad, new THREE.RawShaderMaterial({
    uniforms: { uMap: { value: holeTarget.texture } },
    vertexShader: 'attribute vec3 position;varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'precision highp float;uniform sampler2D uMap;varying vec2 vUv;void main(){gl_FragColor=vec4(texture2D(uMap,vUv).rgb,1.);}', depthTest: false, depthWrite: false,
  })));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 200); camera.position.set(0, 0, 11);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .3;
  scene.add(new THREE.HemisphereLight('#7f9eff', '#1a0c05', .45));
  const diskLight = new THREE.DirectionalLight('#ffab66', 4.2); scene.add(diskLight);
  const rim = new THREE.DirectionalLight('#8fc0ff', 1.6); rim.position.set(-7, 5, -4); scene.add(rim);
  const key = new THREE.DirectionalLight('#ffffff', .75); key.position.set(-3, 2, 8); scene.add(key);

  // Post: bloom picks up the disk, the ring, the frame edges and the beam.
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType }));
  composer.addPass(new DriftPass(target => {
    renderer.setRenderTarget(holeTarget); renderer.render(holeScene, flat);
    renderer.setRenderTarget(target); renderer.clear(); renderer.render(blitScene, flat); renderer.clearDepth(); renderer.render(scene, camera);
  }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), mobile ? .42 : .5, .36, .95); composer.addPass(bloom);
  const finish = new ShaderPass(FINISH); composer.addPass(finish);
  composer.addPass(new OutputPass());

  /* ----- The astronaut ----- */
  const curator = createAstronaut(); const astro = curator.root; const baseScale = 1.42 * (mobile ? .62 : .76); astro.scale.setScalar(baseScale); scene.add(astro);
  void curator.load();
  const visor = astro.userData.visorUniforms; if (visor) visor.uVisorTint.value.set('#ffae6a');
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
  const screenMat = new THREE.MeshBasicMaterial({ map: tabletTex, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) });
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

  /* ----- Frames ----- */
  const loader = new THREE.TextureLoader();
  type Frame = { group: THREE.Group; card: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; label: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; labelCanvas: HTMLCanvasElement; signal: Signal; base: THREE.Vector3; seed: number; hover: number; appear: number; best: boolean; thread: THREE.Line<THREE.BufferGeometry, THREE.ShaderMaterial> };
  let frames: Frame[] = [];
  const frameW = mobile ? 1.62 : 1.9, frameH = frameW * .525;
  const threadMat = () => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uGold: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float t;varying float vT;void main(){vT=t;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uTime,uOn,uGold;varying float vT;void main(){float pulse=pow(fract(vT*3.-uTime*.9),6.);float a=(.08+.5*uOn)*(.35+pulse*2.2)*smoothstep(0.,.08,vT)*smoothstep(1.,.9,vT);vec3 c=mix(vec3(.5,.85,1.),vec3(1.,.82,.5),uGold);gl_FragColor=vec4(c*a*2.,a);}',
  });
  function drawLabel(f: Frame) {
    const c = f.labelCanvas.getContext('2d')!; const W = f.labelCanvas.width, H = f.labelCanvas.height; c.clearRect(0, 0, W, H);
    const lang = o.lang();
    c.fillStyle = f.best ? '#ffd98a' : 'rgba(160,205,240,.8)'; c.font = '600 21px ui-monospace,Consolas,monospace';
    c.fillText(f.best ? (lang === 'de' ? '◎ NÄCHSTES SIGNAL' : '◎ CLOSEST SIGNAL') : '○ SIGNAL', 4, 28);
    c.fillStyle = '#f2f7fb'; c.font = '500 34px "RB Space",Inter,Arial,sans-serif';
    let title = f.signal.route[lang]; while (c.measureText(title).width > W - 10 && title.length > 4) title = title.slice(0, -2) + '…';
    c.fillText(title, 4, 72);
    c.fillStyle = 'rgba(190,210,230,.5)'; c.font = '400 20px ui-monospace,Consolas,monospace'; c.fillText(f.signal.route.path, 4, 104);
    f.label.material.map!.needsUpdate = true;
  }
  function buildFrames() {
    frames.forEach(f => { scene.remove(f.group); scene.remove(f.thread); f.card.material.uniforms.uMap.value?.dispose(); f.card.geometry.dispose(); f.thread.geometry.dispose(); });
    const portrait = host.clientWidth < host.clientHeight * .9;
    const signals = rankSignals(requested, routes, o.lang(), portrait ? 2 : 5); o.onSignals?.(signals);
    frames = signals.map((signal, i) => {
      const group = new THREE.Group();
      const tex = loader.load(signal.route.image); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const best = i === 0 && signal.score > 0;
      const card = new THREE.Mesh(new THREE.PlaneGeometry(frameW * 1.12, frameH * 1.12), new THREE.ShaderMaterial({
        uniforms: { uMap: { value: tex }, uTime: { value: 0 }, uHover: { value: 0 }, uGold: { value: best ? 1 : 0 }, uAppear: { value: 0 }, uSeed: { value: Math.random() * 100 }, uAspect: { value: frameW / frameH }, uBeam: { value: 0 } },
        vertexShader: FRAME_VERT, fragmentShader: FRAME_FRAG, transparent: true, depthWrite: false, toneMapped: false,
      }));
      card.userData.frame = i; group.add(card);
      const labelCanvas = document.createElement('canvas'); labelCanvas.width = 512; labelCanvas.height = 116;
      const labelTex = new THREE.CanvasTexture(labelCanvas); labelTex.colorSpace = THREE.SRGBColorSpace; labelTex.anisotropy = 4;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameW * 116 / 512), new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, toneMapped: false, depthWrite: false }));
      label.position.y = -frameH / 2 - frameW * 58 / 512 - .08; group.add(label);
      scene.add(group);
      const threadGeo = new THREE.BufferGeometry(); const n = 48;
      threadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      threadGeo.setAttribute('t', new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, k) => k / (n - 1)), 1));
      const thread = new THREE.Line(threadGeo, threadMat()); thread.material.uniforms.uGold.value = best ? 1 : 0; thread.frustumCulled = false; scene.add(thread);
      const f: Frame = { group, card, label, labelCanvas, signal, base: new THREE.Vector3(), seed: Math.random() * 10, hover: 0, appear: 0, best, thread };
      drawLabel(f); return f;
    });
    layout();
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
    holeUniforms.uCenter.value.set(portrait ? .5 : .69, portrait ? .53 : .52);
    holeUniforms.uDist.value = portrait ? 33 : 21;
    finish.uniforms.uHole.value.copy(holeUniforms.uCenter.value); finish.uniforms.uAspect.value = w / h;
    finish.uniforms.uFringe.value = mobile ? .5 : 1;
    holeTarget.setSize(Math.max(2, Math.round(w * pixelRatio * holeScale)), Math.max(2, Math.round(h * pixelRatio * holeScale)));
    holeUniforms.uRes.value.set(holeTarget.width, holeTarget.height);
    worldAt(portrait ? .02 : .06, portrait ? -.1 : -.2, 1.2, home);
    worldAt(holeUniforms.uCenter.value.x * 2 - 1, holeUniforms.uCenter.value.y * 2 - 1, -14, holeWorld);
    diskLight.position.copy(holeWorld).add(new THREE.Vector3(0, -1.5, 0));
    const spots = portrait
      ? [[-.47, -.5, .5], [.47, -.54, .3]]
      : [[-.4, -.5, .6], [.07, -.6, .1], [.5, -.52, -.4], [.85, .14, -1.6], [.63, .66, -2.6]];
    frames.forEach((f, i) => { const sp = spots[i] ?? spots[spots.length - 1]; worldAt(sp[0], sp[1], sp[2], f.base); f.group.position.copy(f.base); });
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
  function hitFrame() { const hits = ray.intersectObjects(frames.map(f => f.card), false); return hits.length ? Number(hits[0].object.userData.frame) : -1; }
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
    hovered = beaming ? -1 : hitFrame();
    const onAstro = hitAstro();
    canvas.style.cursor = hovered >= 0 ? 'pointer' : onAstro ? 'grab' : 'default';
    if (!wave && onAstro && idle > 2.5) wave = 2.4;
  });
  const release = (event: PointerEvent) => {
    if (!grabbed) return; grabbed = false; canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    vel.copy(pointerVel).clampLength(0, 14); spin.set(-vel.y * .35, vel.x * .12, -vel.x * .45);
  };
  canvas.addEventListener('pointerup', event => {
    if (grabbed) { release(event); return; }
    pointerRay(event.clientX, event.clientY); const i = hitFrame(); if (i >= 0) beamTo(i);
  });
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { hovered = -1; pointerNdc.set(-9, -9); });
  // On touch the page scrolls by default; a finger that lands on him keeps the gesture.
  canvas.addEventListener('touchstart', event => {
    const t = event.touches[0]; if (!t || event.touches.length > 1) return;
    pointerRay(t.clientX, t.clientY); if (hitAstro()) event.preventDefault();
  }, { passive: false });
  function beamTo(index: number) {
    const frame = frames[index]; if (!frame || beaming) return;
    beaming = { frame, t: 0, from: pos.clone(), gone: false }; tabletNote = frame.signal.route.path; hovered = index;
  }

  /* ----- Beam, streaks ----- */
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 7, 40, 1, true), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uTime,uI;varying vec2 vUv;void main(){float helix=pow(.5+.5*sin(vUv.x*37.7-vUv.y*24.-uTime*9.),8.);float band=.5+.5*sin(vUv.y*40.-uTime*12.);float edge=pow(1.-abs(vUv.y-.5)*2.,1.4);gl_FragColor=vec4(vec3(.55,.85,1.)*(.25+.5*band+2.5*helix)*edge*uI*1.6,1.);}',
  })); beam.visible = false; scene.add(beam);

  // Light streaks spiralling into the hole, each a short line from head to tail.
  const STREAKS = mobile ? 160 : 420;
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
  const timeScale = o.reduced ? .2 : 1;
  const W = { float: 1, flail: 0, reach: 0, tablet: .9, dive: 0, sit: 0 };
  let tabletMode: 'lost' | 'lock' | 'beam' | 'back' = 'lost';

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; elapsed += dt * timeScale;
    // Adaptive cost: the hole gives way first, then the whole drawing buffer.
    frameTimes.push(dt); if (frameTimes.length >= 50) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length; frameTimes = [];
      if (avg > 1 / 45) {
        if (holeScale > .28) { holeScale *= .82; steps = Math.max(56, Math.round(steps * .85)); holeUniforms.uSteps.value = steps; layout(); }
        else if (pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio * .85); layout(); }
      }
    }
    idle = (now - lastMove) / 1000;
    smoothPointer.lerp(pointerNdc.x > -2 ? pointerNdc : zero2, 1 - Math.exp(-dt * 3));

    // Camera drifts a touch with the hand, so the frames slide against the sky.
    camera.position.set(camBase.x + smoothPointer.x * .35, camBase.y + smoothPointer.y * .22, camBase.z); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();

    // --- Astronaut motion ---
    const goal = { float: 1, flail: 0, reach: 0, tablet: .92, dive: 0, sit: 0 };
    tabletMode = 'lost';
    if (beaming) {
      beaming.t = Math.min(1, beaming.t + dt / 1.2);
      const target = tmp.copy(beaming.frame.group.position).add(tmp2.set(-frameW * .15, -1.1 * s(), .7));
      const e = beaming.t * beaming.t * (3 - 2 * beaming.t);
      pos.lerpVectors(beaming.from, target, e); goal.dive = 1; goal.float = 0; goal.tablet = .6; tabletMode = 'beam';
      beaming.frame.hover = 1;
      holeUniforms.uFlash.value = Math.max(0, (beaming.t - .75) / .25) * .6;
      if (beaming.t >= 1 && !beaming.gone) { beaming.gone = true; o.onNavigate?.(beaming.frame.signal.route.path); }
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
    const lookYaw = hovered >= 0 && !beaming ? Math.atan2(frames[hovered].group.position.x - pos.x, 7) * .6 : smoothPointer.x * .25;
    euler.set(Math.sin(elapsed * .29) * .32 + spin.x * .4, Math.sin(elapsed * .21) * .5 + spin.y * .5 + lookYaw, Math.sin(elapsed * .25) * .36 + spin.z * .5);
    targetQ.setFromEuler(euler);
    if (beaming) targetQ.setFromEuler(euler.set(-1, Math.atan2(beaming.frame.group.position.x - pos.x, 3), 0));
    astro.quaternion.slerp(targetQ, 1 - Math.exp(-dt * (grabbed ? 3 : 2)));
    if (pull > 0) astro.rotateZ(spin.z * dt * 2);
    astro.scale.set(baseScale, baseScale * stretch, baseScale);
    let yaw = smoothPointer.x * .7, pitch = smoothPointer.y * .3;
    if (hovered >= 0 && !beaming) { yaw = THREE.MathUtils.clamp((frames[hovered].group.position.x - pos.x) * .3, -1, 1); pitch = THREE.MathUtils.clamp((frames[hovered].group.position.y - pos.y - 1) * .15, -.45, .35); }
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
    if (now - lastTablet > 120) { lastTablet = now; drawTablet(elapsed, beaming ? 'beam' : tabletMode, hovered >= 0 ? frames[hovered]?.signal.route.path ?? '' : ''); }

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
    if (pack && astro.visible && !grabbed && !beaming) {
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

    // --- Frames ---
    if (tablet.visible) screen.getWorldPosition(threadFrom); else threadFrom.copy(astroCenter());
    frames.forEach((f, i) => {
      f.appear = Math.min(1, f.appear + dt / (1.1 + i * .25) * (primed ? 1 : 0));
      f.hover = THREE.MathUtils.damp(f.hover, i === hovered ? 1 : 0, 8, dt);
      f.group.position.set(f.base.x + Math.sin(elapsed * .4 + f.seed) * .08, f.base.y + Math.sin(elapsed * .6 + f.seed * 2) * .1, f.base.z);
      f.group.rotation.set(Math.sin(elapsed * .5 + f.seed) * .04, -f.base.x * .03 + Math.sin(elapsed * .3 + f.seed) * .05, Math.sin(elapsed * .35 + f.seed) * .015);
      f.group.scale.setScalar((f.best ? 1.1 : 1) * (1 + f.hover * .06));
      const u = f.card.material.uniforms; u.uTime.value = elapsed; u.uHover.value = f.hover; u.uAppear.value = f.appear; u.uBeam.value = beaming?.frame === f ? beaming.t : 0;
      (f.label.material as THREE.MeshBasicMaterial).opacity = f.appear;
      // Signal line from his tablet to the frame, bowing like it is under gravity.
      const from = threadFrom; const to = tmp.copy(f.group.position).add(tmp2.set(0, frameH * .56, 0));
      const mid = from.clone().lerp(to, .5).add(tmp2.set(0, .6, .4));
      const arr = f.thread.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < arr.count; k++) { const t = k / (arr.count - 1), a = 1 - t; arr.setXYZ(k, a * a * from.x + 2 * a * t * mid.x + t * t * to.x, a * a * from.y + 2 * a * t * mid.y + t * t * to.y, a * a * from.z + 2 * a * t * mid.z + t * t * to.z); }
      arr.needsUpdate = true;
      f.thread.material.uniforms.uTime.value = elapsed; f.thread.material.uniforms.uOn.value = Math.max(f.hover, f.best ? .25 : 0) * f.appear * (astro.visible ? 1 : 0);
    });

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
      streakCol.set([b * 1., b * .78, b * .6, 0, 0, 0], i * 6);
    }
    streakGeo.attributes.position.needsUpdate = true; streakGeo.attributes.color.needsUpdate = true;

    holeUniforms.uFlash.value = beaming ? holeUniforms.uFlash.value : holeUniforms.uFlash.value * Math.exp(-dt * 2.5);
    holeUniforms.uTime.value = elapsed;
    holeUniforms.uTilt.value.set(.085 + smoothPointer.y * .02, smoothPointer.x * .05);
    finish.uniforms.uTime.value = elapsed;
    o.onTelemetry?.({ horizon: pos.distanceTo(holeWorld), speed: vel.length() });
    composer.render(dt);
    if (!primed) { primed = true; host.classList.add('is-live'); }
  }
  function smoothstepJS(a: number, b: number, x: number) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  buildFrames(); pos.copy(home);
  if (location.search.includes('driftdebug')) (window as unknown as Record<string, unknown>).__drift = { astro, tablet, camera, bone };
  const ro = new ResizeObserver(() => layout()); ro.observe(host);
  const io = new IntersectionObserver(([entry]) => { const on = entry.isIntersecting && !document.hidden; if (on && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } else if (!on && running) { running = false; cancelAnimationFrame(raf); } });
  io.observe(host);
  document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (document.hidden) running = false; else { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } });
  raf = requestAnimationFrame(tick);
  return {
    relabel() { buildFrames(); },
    beam(path: string) { const i = frames.findIndex(f => f.signal.route.path === path); if (i >= 0) beamTo(i); else o.onNavigate?.(path); },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); curator.dispose(); composer.dispose(); renderer.dispose(); holeTarget.dispose(); pmrem.dispose(); },
  };
}
