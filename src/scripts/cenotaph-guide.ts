// The curator: the Observatory astronaut, awake. He breathes, looks about, glances at you; click
// him and he walks over, waves and asks where you meant to go. Pick a place or type anything:
// he reads it with the same guesser as "Did you mean" and projects the page as a hologram from
// his hand. Step into the hologram (click it) to go there.
import * as THREE from 'three';
import type { DriftRoute } from '../data/drift-routes';
import { guess } from '../data/lost-guess';
import type { createAstronaut } from './observatory-astronaut';

type Astro = ReturnType<typeof createAstronaut>;
type Lang = 'en' | 'de';
type Mood = 'idle' | 'approach' | 'talk' | 'present';

const T = {
  en: {
    who: 'Curator',
    hello: 'Hello. I look after this place. Tell me what you were looking for — or pick one — and I will show you the way.',
    placeholder: 'Ask me anything…',
    send: 'Ask',
    chips: [['Work', '/gallery/'], ['Services', '/services/'], ['Contact', '/contact/'], ['About Rodion', '/en/rodion-belousov-vienna/'], ['Where am I?', '?where']],
    where: 'Inside Boullée’s Cenotaph for Newton — drawn in 1784, never built. The vault is pierced so daylight turns into stars. Lost addresses end up here, and I help them home.',
    whoami: 'The curator of Rodion’s Observatory. Usually I guide people through the archive; today I keep the cenotaph.',
    greet: 'Hello! Where were you heading?',
    found: (t: string) => `This one, I think: ${t}. Step into the light when you are ready.`,
    unsure: (t: string) => `I am not sure — but ${t} is a good place to start.`,
    go: 'Take me there',
    close: 'Close',
  },
  de: {
    who: 'Kurator',
    hello: 'Hallo. Ich passe hier auf. Sag mir, was du gesucht hast — oder wähl etwas —, und ich zeige dir den Weg.',
    placeholder: 'Frag mich etwas…',
    send: 'Fragen',
    chips: [['Arbeiten', '/gallery/'], ['Leistungen', '/de/leistungen/'], ['Kontakt', '/de/kontakt/'], ['Über Rodion', '/de/rodion-belousov-wien/'], ['Wo bin ich?', '?where']],
    where: 'Im Kenotaph für Newton von Boullée — 1784 gezeichnet, nie gebaut. Das Gewölbe ist durchbrochen, damit Tageslicht zu Sternen wird. Verlorene Adressen landen hier, und ich bringe sie nach Hause.',
    whoami: 'Der Kurator von Rodions Observatory. Sonst führe ich durchs Archiv; heute hüte ich den Kenotaph.',
    greet: 'Hallo! Wohin wolltest du?',
    found: (t: string) => `Das hier, glaube ich: ${t}. Tritt ins Licht, wenn du so weit bist.`,
    unsure: (t: string) => `Ich bin nicht sicher — aber ${t} ist ein guter Anfang.`,
    go: 'Bring mich hin',
    close: 'Schließen',
  },
};

const holoVertex = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const holoFragment = /* glsl */`
uniform sampler2D tMap; uniform float uTime, uOn, uHover; varying vec2 vUv;
float h(float x){ return fract(sin(x * 91.7) * 43758.5); }
void main(){
  vec2 uv = vUv;
  float glitch = step(.97, h(floor(uTime * 12.))) * (h(floor(uv.y * 40.) + floor(uTime * 30.)) - .5) * .04;
  uv.x += glitch;
  vec3 img = texture2D(tMap, uv).rgb;
  float l = dot(img, vec3(.3, .59, .11));
  vec3 tint = mix(vec3(.35, .75, 1.), vec3(.9, .97, 1.), l) * (.35 + 1.1 * l);
  tint = mix(tint, img * 1.2, .35);
  float scan = .78 + .22 * sin(uv.y * 420. - uTime * 6.);
  float edge = smoothstep(0., .03, uv.x) * smoothstep(1., .97, uv.x) * smoothstep(0., .04, uv.y) * smoothstep(1., .96, uv.y);
  float frame = (1. - smoothstep(.0, .012, min(min(uv.x, 1. - uv.x), min(uv.y, 1. - uv.y)))) * 1.6;
  float reveal = smoothstep(0., .2, uOn * 1.2 - (1. - uv.y));   // drawn from the top down
  float a = (edge * .85 * scan + frame) * reveal * uOn * (.8 + .1 * sin(uTime * 23.) + .3 * uHover) * 2.2;
  gl_FragColor = vec4((tint + vec3(.2, .5, .8) * frame) * a * 1.4, 1.);
}`;
const beamFragment = /* glsl */`uniform float uOn, uTime; varying vec2 vUv;
void main(){ float a = (1. - vUv.y) * .5 + .15; a *= .65 + .35 * sin(vUv.y * 60. - uTime * 8.); gl_FragColor = vec4(vec3(.4, .8, 1.) * a * uOn * .35, 1.); }`;

export class Guide {
  mood: Mood = 'idle';
  home = new THREE.Vector3();
  facing = Math.PI;
  target = new THREE.Vector3();
  panel: HTMLDivElement;
  holo: THREE.Group; holoMat: THREE.ShaderMaterial; beamMat: THREE.ShaderMaterial; titleMat: THREE.MeshBasicMaterial;
  holoOn = 0; holoWant = 0; holoRoute: DriftRoute | null = null; holoHover = 0;
  wave = 0; tablet = 0; point = 0; lookYaw = 0; lookPitch = 0; walking = 0; phase = 0;
  private glanceAt = 0; private glance = { yaw: 0, pitch: 0 };
  private hand: THREE.Object3D | null = null;
  private panelAt: [number, number] = [-1e4, -1e4];
  private bones: Record<string, THREE.Object3D> = {};
  private loader = new THREE.TextureLoader();

  constructor(private o: {
    scene: THREE.Scene; camera: THREE.Camera; host: HTMLElement; ui?: HTMLElement; astro: Astro; routes: DriftRoute[]; lang: () => Lang;
    onOpen: (href: string) => void; onSpeak?: () => void; canWalkTo?: (p: THREE.Vector3) => THREE.Vector3;
  }) {
    this.home.copy(o.astro.root.position);
    this.facing = o.astro.root.rotation.y;
    o.astro.root.traverse(b => {
      const n = b.name.replace(/^mixamorig[:_]?/, '');
      if (/^(RightArm|RightForeArm|RightHand|Spine1|Head)$/.test(n)) this.bones[n] = b;
    });
    this.hand = this.bones.RightHand ?? null;
    // Hologram: the page's preview on a sheet of light, a beam down to his hand, a title underneath.
    this.holo = new THREE.Group(); this.holo.visible = false; o.scene.add(this.holo);
    this.holoMat = new THREE.ShaderMaterial({ uniforms: { tMap: { value: null }, uTime: { value: 0 }, uOn: { value: 0 }, uHover: { value: 0 } }, vertexShader: holoVertex, fragmentShader: holoFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.21), this.holoMat); sheet.position.y = .9; sheet.name = 'holo-sheet'; this.holo.add(sheet);
    this.beamMat = new THREE.ShaderMaterial({ uniforms: { uOn: { value: 0 }, uTime: { value: 0 } }, vertexShader: holoVertex, fragmentShader: beamFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const beamGeo = new THREE.ConeGeometry(1.15, .3, 4, 1, true); beamGeo.translate(0, .15, 0); beamGeo.rotateY(Math.PI / 4);
    const beam = new THREE.Mesh(beamGeo, this.beamMat); beam.scale.set(1, 1, .02); this.holo.add(beam);
    this.titleMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const title = new THREE.Mesh(new THREE.PlaneGeometry(2.3, .29), this.titleMat); title.position.y = .12; this.holo.add(title);
    // The conversation panel.
    this.panel = document.createElement('div'); this.panel.className = 'guide'; this.panel.hidden = true;
    (o.ui ?? o.host).append(this.panel);
  }

  // ---- Conversation.
  open() {
    const l = T[this.o.lang()];
    this.panel.innerHTML = `
      <div class="guide-head"><span class="guide-who">${l.who}</span><button class="guide-x" type="button" aria-label="${l.close}">×</button></div>
      <p class="guide-say" aria-live="polite"></p>
      <div class="guide-chips">${l.chips.map(([label, href]) => `<button type="button" data-go="${href}">${label}</button>`).join('')}</div>
      <form class="guide-ask"><input type="text" maxlength="80" autocomplete="off" placeholder="${l.placeholder}" /><button type="submit">${l.send}</button></form>
      <a class="guide-go" href="/" hidden>${l.go} ↗</a>`;
    this.panel.hidden = false;
    this.say(l.hello);
    this.panel.querySelector('.guide-x')!.addEventListener('click', () => this.close());
    this.panel.querySelectorAll<HTMLButtonElement>('[data-go]').forEach(b => b.addEventListener('click', () => this.answer(b.dataset.go!)));
    const form = this.panel.querySelector('form')!, input = form.querySelector('input')!;
    form.addEventListener('submit', e => { e.preventDefault(); if (input.value.trim()) this.ask(input.value.trim()); input.value = ''; });
    const go = this.panel.querySelector<HTMLAnchorElement>('.guide-go')!;
    go.addEventListener('click', e => { e.preventDefault(); this.o.onOpen(go.pathname); });
    // He comes over, turns to you and waves.
    this.mood = 'approach';
    this.walkTowardViewer();
  }
  private walkTowardViewer() {
    const at = this.o.astro.root.position, cam = this.o.camera.position, dir = new THREE.Vector3(cam.x - at.x, 0, cam.z - at.z);
    const dist = dir.length();
    this.target.copy(at);
    if (dist > 6.5) this.target.addScaledVector(dir.normalize(), Math.min(dist - 6, 4.5));
    if (this.o.canWalkTo) this.target.copy(this.o.canWalkTo(this.target));
  }
  close() { clearInterval(this.sayTimer); this.panel.hidden = true; this.mood = this.holoRoute ? 'present' : 'idle'; }
  /** Put the hologram away and walk back to the shaft: used when the visitor leaves the page. */
  forget() { this.holoWant = 0; this.holoOn = 0; this.holo.visible = false; this.holoRoute = null; this.mood = 'idle'; this.o.astro.root.position.copy(this.home); }
  get isOpen() { return !this.panel.hidden; }

  private sayTimer = 0;
  say(text: string) {
    const el = this.panel.querySelector<HTMLParagraphElement>('.guide-say'); if (!el) return;
    clearInterval(this.sayTimer); el.textContent = ''; let i = 0;
    this.sayTimer = window.setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(this.sayTimer); }, 16);
    this.o.onSpeak?.();
  }
  answer(href: string) {
    const l = T[this.o.lang()];
    if (href === '?where') { this.say(l.where); return; }
    const route = this.o.routes.find(r => r.path === href) ?? this.o.routes[0];
    this.show(route); this.say(l.found(route[this.o.lang()].split(' — ')[0]));
  }
  ask(q: string) {
    const l = T[this.o.lang()], s = q.toLowerCase();
    if (/(where am i|what is this|wo bin ich|was ist das|где я|что это)/.test(s)) { this.say(l.where); return; }
    if (/(who are you|wer bist du|кто ты)/.test(s)) { this.say(l.whoami); return; }
    if (/^(hi|hello|hey|hallo|servus|grüß|привет|здравств)/.test(s)) { this.say(l.greet); return; }
    const g = guess('/' + s.replace(/\s+/g, '-') + '/', this.o.routes, this.o.lang(), 1)[0];
    if (g && g.score >= .6) { this.show(g.route); this.say(l.found(g.route[this.o.lang()].split(' — ')[0])); }
    else { const r = this.o.routes.find(x => x.path === '/gallery/')!; this.show(r); this.say(l.unsure(r[this.o.lang()].split(' — ')[0])); }
  }

  // ---- Hologram.
  show(route: DriftRoute) {
    this.holoRoute = route; this.holoWant = 1; this.holoOn = 0; this.holo.visible = true;
    this.loader.load(route.image, t => { t.colorSpace = THREE.SRGBColorSpace; this.holoMat.uniforms.tMap.value = t; });
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d')!;
    g.font = '600 46px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#cfeaff';
    g.fillText(`${route[this.o.lang()].split(' — ')[0]}  ↗`, 512, 64);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; this.titleMat.map = tex; this.titleMat.needsUpdate = true;
    const go = this.panel.querySelector<HTMLAnchorElement>('.guide-go'); if (go) { go.href = route.path; go.hidden = false; }
    if (this.mood !== 'approach') { if (this.isOpen) this.walkTowardViewer(); else this.target.copy(this.o.astro.root.position); this.mood = this.target.distanceTo(this.o.astro.root.position) > .3 ? 'approach' : 'present'; }
  }
  hitHologram(ray: THREE.Raycaster) {
    if (!this.holo.visible || this.holoOn < .5 || !this.holoRoute) return null;
    return ray.intersectObject(this.holo.getObjectByName('holo-sheet')!).length ? this.holoRoute.path : null;
  }
  hover(on: boolean) { this.holoHover = on ? 1 : 0; }

  // ---- Frame.
  update(t: number, dt: number, extra: { lookUp: number; point: number }) {
    const root = this.o.astro.root, cam = this.o.camera.position;
    const toCam = new THREE.Vector3(cam.x - root.position.x, 0, cam.z - root.position.z);
    let wantFacing = this.facing, walking = 0;
    if (this.mood === 'approach') {
      const d = new THREE.Vector3(this.target.x - root.position.x, 0, this.target.z - root.position.z);
      if (d.length() > .12) { walking = 1; wantFacing = Math.atan2(d.x, d.z); root.position.addScaledVector(d.normalize(), Math.min(d.length(), 1.35 * dt)); }
      else { this.mood = this.holoRoute ? 'present' : 'talk'; this.wave = 1.6; }
    }
    if (this.mood === 'talk' || this.mood === 'present' || this.isOpen) { if (this.mood !== 'approach') wantFacing = Math.atan2(toCam.x, toCam.z); }
    // Turn the short way round.
    let dA = wantFacing - this.facing; dA = Math.atan2(Math.sin(dA), Math.cos(dA));
    this.facing += dA * (1 - Math.pow(.02, dt)); root.rotation.y = this.facing;
    this.walking += (walking - this.walking) * (1 - Math.pow(.01, dt));
    // Idle life: now and then he glances round, up at the vault, or at you.
    if (t > this.glanceAt) {
      this.glanceAt = t + 3 + Math.random() * 5;
      const r = Math.random();
      this.glance = r < .35 ? { yaw: (Math.random() - .5) * 1.2, pitch: -.1 - Math.random() * .3 } : r < .7 ? { yaw: (Math.random() - .5) * .5, pitch: -.8 } : { yaw: 0, pitch: 0 };
    }
    const talking = this.mood !== 'idle' || this.isOpen;
    const gy = talking ? 0 : this.glance.yaw, gp = talking ? .05 : this.mood === 'idle' ? Math.min(this.glance.pitch, -.95 * extra.lookUp) : 0;
    this.lookYaw += (gy - this.lookYaw) * (1 - Math.pow(.2, dt)); this.lookPitch += (gp - this.lookPitch) * (1 - Math.pow(.2, dt));
    this.wave = Math.max(0, this.wave - dt);
    const tabletWant = this.mood === 'present' && this.holoRoute ? 1 : 0;
    this.tablet += (tabletWant - this.tablet) * (1 - Math.pow(.05, dt));
    this.phase += dt * (1 + this.walking * 3);
    this.o.astro.animate(this.phase, this.walking, 0, dt, talking ? 1 : 0, { yaw: this.lookYaw, pitch: this.lookPitch, wave: this.wave > 0 ? Math.min(1, this.wave * 2) : 0, tablet: this.tablet * .8 });
    // Pointing up at the repaired address, as before.
    const pt = talking ? 0 : extra.point;
    if (pt > .001 && this.bones.RightArm) {
      const q = new THREE.Quaternion(), ax = new THREE.Vector3();
      q.setFromAxisAngle(ax.set(0, 0, 1), -2.35 * pt); this.bones.RightArm.quaternion.multiply(q);
      q.setFromAxisAngle(ax.set(0, 1, 0), .55 * pt); this.bones.RightArm.quaternion.multiply(q);
      q.setFromAxisAngle(ax.set(0, 0, 1), .25 * pt); this.bones.RightForeArm.quaternion.multiply(q);
    }
    // Hologram above the hand, turned to you.
    const holoWant = this.holoWant && this.tablet > .35 ? 1 : 0;
    this.holoOn += (holoWant - this.holoOn) * (1 - Math.pow(.08, dt));
    this.holo.visible = this.holoOn > .01;
    if (this.holo.visible) {
      root.updateMatrixWorld(true);
      // Beside him on the side away from the panel, turned to you.
      const side = new THREE.Vector3(1, 0, 0).applyQuaternion((this.o.camera as THREE.PerspectiveCamera).quaternion).setY(0).normalize().multiplyScalar(-1);
      const hand = this.hand ? this.hand.getWorldPosition(new THREE.Vector3()) : root.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      const at = root.position.clone().addScaledVector(side, -1.6).add(new THREE.Vector3(0, Math.max(1.05, hand.y - root.position.y), 0));
      this.holo.position.lerp(at, this.holoOn < .05 ? 1 : .2);
      this.holo.rotation.y = Math.atan2(cam.x - this.holo.position.x, cam.z - this.holo.position.z);
      this.holo.scale.setScalar(.8 + .2 * this.holoOn);
      this.holoMat.uniforms.uOn.value = this.holoOn; this.holoMat.uniforms.uTime.value = t; this.holoMat.uniforms.uHover.value += (this.holoHover - this.holoMat.uniforms.uHover.value) * .2;
      this.beamMat.uniforms.uOn.value = this.holoOn; this.beamMat.uniforms.uTime.value = t;
      this.titleMat.opacity = this.holoOn;
    }
  }

  /** Where to put the panel on screen: beside his head. */
  place(w: number, h: number) {
    if (this.panel.hidden) return;
    const head = this.o.astro.root.position.clone().add(new THREE.Vector3(0, 1.95, 0)).project(this.o.camera);
    const x = (head.x * .5 + .5) * w, y = (-head.y * .5 + .5) * h;
    const pw = this.panel.offsetWidth, ph = this.panel.offsetHeight;
    // The panel sits to his left on screen; it only moves when he has moved noticeably.
    const left = Math.min(w - pw - 16, Math.max(16, x - pw - 60));
    const top = Math.min(h - ph - 90, Math.max(80, y - ph * .35));
    if (Math.abs(left - this.panelAt[0]) + Math.abs(top - this.panelAt[1]) < 14) return;
    this.panelAt = [left, top];
    this.panel.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }
}
