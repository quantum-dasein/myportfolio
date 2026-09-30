// A game hidden in the Model Room: three golden mini astronauts, each about the height of a hand, tucked
// away where only a curious visitor looks: up on the e-bike's wall mount, inside the house model's vitrine
// (at 1:15 he is exactly a person's size there) and behind K-2SO's feet. Clicking one collects it. With all
// three found, a wall safe by the lounge slides open onto a golden trophy, and confetti comes down.
// The trophy is a key: clicked, the back of the safe becomes a portal of warm light into a private scene
// (/gallery/night/), entered by stepping up to it or clicking it.
import * as THREE from 'three';

type Spot = { at: THREE.Vector3; face: number; scale?: number };

export function createSecrets(o: {
  scene: THREE.Scene; root: HTMLElement; de: () => boolean; mobile: boolean; camera: THREE.Camera;
  onFound?: (n: number, of: number) => void; onAll?: () => void; onPortal?: () => void; onEnter?: () => void;
}) {
  const { scene } = o;
  const disposables: { dispose: () => void }[] = [];
  const own = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const gold = own(new THREE.MeshPhysicalMaterial({ color: '#d9a846', metalness: 1, roughness: .22, clearcoat: .6, emissive: '#3a2708', emissiveIntensity: .6 }));
  const visor = own(new THREE.MeshPhysicalMaterial({ color: '#07090c', metalness: .2, roughness: .05, clearcoat: 1 }));

  /** A little astronaut from primitives: big helmet with a dark visor, suit, backpack, arms, legs and boots. 1 m tall before scaling. */
  function figure(scale: number) {
    const g = new THREE.Group(), add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, rz = 0) => {
      const mesh = new THREE.Mesh(own(geo), m); mesh.position.set(x, y, z); mesh.rotation.set(rx, 0, rz); g.add(mesh); return mesh;
    };
    add(new THREE.SphereGeometry(.21, 24, 16), gold, 0, .8, 0);                                             // helmet
    add(new THREE.SphereGeometry(.17, 24, 16), visor, 0, .8, .07).scale.set(1, .78, .8);                     // visor
    add(new THREE.TorusGeometry(.165, .018, 8, 28), gold, 0, .8, .115).scale.set(1, .8, 1);                  // its rim
    add(new THREE.CapsuleGeometry(.17, .16, 6, 16), gold, 0, .45, 0).scale.set(1.12, 1, .88);                // suit
    add(new THREE.BoxGeometry(.13, .09, .04), visor, 0, .5, .15);                                            // chest panel
    add(new THREE.BoxGeometry(.3, .32, .13), gold, 0, .5, -.19);                                             // backpack
    for (const s of [-1, 1]) {
      add(new THREE.CapsuleGeometry(.062, .2, 4, 10), gold, s * .25, .47, .01, 0, s * .5);                   // arm
      add(new THREE.SphereGeometry(.07, 12, 10), gold, s * .32, .34, .02);                                   // glove
      add(new THREE.CapsuleGeometry(.075, .16, 4, 10), gold, s * .09, .19, 0);                               // leg
      add(new THREE.BoxGeometry(.13, .07, .19), gold, s * .09, .035, .025);                                  // boot
    }
    g.scale.setScalar(scale);
    return g;
  }

  // Where they hide (the room's own coordinates; see model-room-exhibits.ts for the stands).
  const k2Forward = new THREE.Vector3(Math.cos(Math.atan2(-(10.5 - .4), 0 - 4.8)), 0, -Math.sin(Math.atan2(-(10.5 - .4), 0 - 4.8)));
  const k2Side = new THREE.Vector3(-k2Forward.z, 0, k2Forward.x);
  const behindK2 = new THREE.Vector3(4.8, .5, .4).addScaledVector(k2Forward, -.4).addScaledVector(k2Side, .3);
  const spots: Spot[] = [
    { at: new THREE.Vector3(8.8, 2.425, 4.25), face: -Math.PI / 2 },                // up on the e-bike's wall mount, legs over the edge
    { at: new THREE.Vector3(5.74, .845, 5.86), face: -Math.PI * .75 },               // a person in the architect's model
    { at: behindK2, face: Math.atan2(-k2Forward.x, -k2Forward.z) },                  // hiding behind K-2SO, facing the wall
  ];
  const targets: THREE.Mesh[] = [];
  const minis = spots.map((s, i) => {
    const g = figure(s.scale ?? .13); g.position.copy(s.at); g.rotation.y = s.face; g.userData.mini = i; scene.add(g);
    g.traverse(n => { if ((n as THREE.Mesh).isMesh) { n.userData.mini = i; targets.push(n as THREE.Mesh); } });
    return { group: g, found: false, foundAt: -1 };
  });

  // The wall safe by the lounge: a dark cabinet on the left wall whose doors slide apart onto a lit trophy.
  const safe = new THREE.Group(); safe.position.set(-8.72, 0, 8.05); safe.rotation.y = Math.PI / 2; scene.add(safe);
  const stone = own(new THREE.MeshStandardMaterial({ color: '#141918', roughness: .55, metalness: .15 }));
  const inner = own(new THREE.MeshStandardMaterial({ color: '#2a2216', roughness: .8, emissive: '#ffb45a', emissiveIntensity: 0 }));
  const edge = own(new THREE.MeshBasicMaterial({ color: new THREE.Color(.35, 2.1, 1.1), toneMapped: false }));
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => { const b = new THREE.Mesh(own(new THREE.BoxGeometry(w, h, d)), m); b.position.set(x, y, z); safe.add(b); return b; };
  box(1.1, .04, .3, stone, 0, .78, .15); box(1.1, .04, .3, stone, 0, 2.02, .15); box(.04, 1.28, .3, stone, -.53, 1.4, .15); box(.04, 1.28, .3, stone, .53, 1.4, .15);
  box(1.02, 1.2, .02, inner, 0, 1.4, .01);
  box(1.1, .012, .012, edge, 0, .755, .3);
  const doors = [-1, 1].map(s => box(.51, 1.2, .03, stone, s * .255, 1.4, .285));
  const trophy = figure(.42); trophy.position.set(0, .83, .14); safe.add(trophy);
  const plinth = box(.3, .05, .2, own(new THREE.MeshStandardMaterial({ color: '#0d0f0f', metalness: .6, roughness: .3 })), 0, .805, .14); void plinth;
  const glow = new THREE.PointLight('#ffc27a', 0, 3.2, 2); glow.position.set(0, 1.8, .2); safe.add(glow);
  // The portal behind the trophy: a slow swirl of rose and gold light, hidden until the trophy is clicked.
  const portalMat = own(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpen: { value: 0 } }, transparent: true, depthWrite: false, toneMapped: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uTime, uOpen; varying vec2 vUv;
      void main(){ vec2 p = (vUv - .5) * vec2(1.02, 1.2); float r = length(p), a = atan(p.y, p.x);
        float swirl = sin(a * 3. + r * 18. - uTime * 2.4) * .5 + .5, core = exp(-r * r * 9.);
        vec3 rose = vec3(2.2, .9, 1.1), gold = vec3(2.4, 1.7, .8), c = mix(rose, gold, swirl) * (.35 + core * 1.6);
        float edge = smoothstep(.62, .45, max(abs(p.x) / 1.02 * 2. * .5 + .0, abs(p.y) / 1.2));
        gl_FragColor = vec4(c, uOpen * edge * (.55 + .45 * swirl)); }`,
  }));
  const portal = new THREE.Mesh(own(new THREE.PlaneGeometry(1.02, 1.2)), portalMat); portal.position.set(0, 1.4, .03); portal.visible = false; portal.userData.portal = true; safe.add(portal);
  const collider = new THREE.Box3().setFromObject(safe);

  // Confetti: a few hundred gold and green flakes that tumble down in front of the safe.
  const COUNT = o.mobile ? 160 : 360;
  const cp = new Float32Array(COUNT * 3), cv = new Float32Array(COUNT * 3), cc = new Float32Array(COUNT * 3);
  const palette = [new THREE.Color(2.2, 1.6, .5), new THREE.Color(.5, 2, 1.1), new THREE.Color(2, 2, 1.9)];
  const confettiGeo = own(new THREE.BufferGeometry()); confettiGeo.setAttribute('position', new THREE.BufferAttribute(cp, 3)); confettiGeo.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  const confetti = new THREE.Points(confettiGeo, own(new THREE.PointsMaterial({ size: .045, vertexColors: true, toneMapped: false, transparent: true, opacity: 0, depthWrite: false })));
  confetti.frustumCulled = false; confetti.visible = false; scene.add(confetti);
  function burst() {
    for (let i = 0; i < COUNT; i++) {
      cp.set([-7.8 + Math.random() * 3.2, 3.4 + Math.random() * 2.2, 6.3 + Math.random() * 3.6], i * 3);
      cv.set([(Math.random() - .5) * .6, -(.35 + Math.random() * .5), (Math.random() - .5) * .6], i * 3);
      const c = palette[i % 3]; cc.set([c.r, c.g, c.b], i * 3);
    }
    confettiGeo.attributes.color.needsUpdate = true; confetti.visible = true;
  }

  // A small line of text at the bottom of the room: what you found.
  const toast = document.createElement('p'); toast.className = 'mr-toast'; toast.setAttribute('role', 'status'); o.root.append(toast);
  let toastTimer = 0;
  function say(text: string, ms = 3200) { toast.textContent = text; toast.classList.add('is-on'); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.classList.remove('is-on'), ms); }

  let count = 0, openAt = -1, now = 0, confettiAt = -1, portalAt = -1, entered = false;
  trophy.traverse(n => { n.userData.trophy = true; });
  function openPortal() {
    if (portalAt >= 0) return; portalAt = now; portal.visible = true; targets.push(portal as unknown as THREE.Mesh);
    say('Для Лиды ♥  Шагни в свет', 6000); o.onPortal?.();
  }
  function find(object: THREE.Object3D) {
    if (object.userData.portal) { if (!entered) { entered = true; o.onEnter?.(); } return true; }
    if (object.userData.trophy) { if (openAt >= 0 && now > openAt + 1.2) openPortal(); return true; }
    const i = object.userData.mini as number | undefined; if (i === undefined) return false;
    const m = minis[i]; if (m.found) return true;
    m.found = true; m.foundAt = now; count++;
    o.onFound?.(count, minis.length);
    if (count < minis.length) say(o.de() ? `Mini-Astronaut gefunden · ${count} / ${minis.length}` : `Mini astronaut found · ${count} / ${minis.length}`);
    else {
      say(o.de() ? 'Alle drei gefunden. Beim Sofa hat sich etwas geöffnet …' : 'All three found. Something has opened by the sofa …', 5200);
      openAt = now + 1.2; confettiAt = now + 1.8; o.onAll?.();
      // The trophy can now be clicked.
      trophy.traverse(n => { if ((n as THREE.Mesh).isMesh) targets.push(n as THREE.Mesh); });
    }
    return true;
  }

  return {
    targets, collider, find,
    /** How many have been found. */
    get count() { return count; },
    update(t: number, dt: number) {
      now = t;
      for (const m of minis) {
        if (!m.group.visible) continue;
        if (!m.found) { m.group.position.y = spots[minis.indexOf(m)].at.y + Math.max(0, Math.sin(t * 2.2 + minis.indexOf(m))) * .004; continue; }
        // Collected: a hop, a spin, and it is gone into a spark.
        const k = Math.min(1, (t - m.foundAt) / .9), s = spots[minis.indexOf(m)];
        m.group.position.y = s.at.y + Math.sin(k * Math.PI) * .25 + k * .1; m.group.rotation.y = s.face + k * Math.PI * 4;
        m.group.scale.setScalar((s.scale ?? .13) * (1 + Math.sin(k * Math.PI) * .6) * (1 - k * k));
        if (k >= 1) { m.group.visible = false; for (const n of m.group.children) { const i = targets.indexOf(n as THREE.Mesh); if (i >= 0) targets.splice(i, 1); } }
      }
      if (openAt >= 0 && t > openAt) {
        const k = Math.min(1, (t - openAt) / 1.8), e = 1 - Math.pow(1 - k, 3);
        doors.forEach((d, i) => { d.position.x = (i ? 1 : -1) * (.255 + e * .5); });
        inner.emissiveIntensity = .5 * e; glow.intensity = 6 * e; trophy.rotation.y = t * .6;
      }
      if (portalAt >= 0) {
        // The trophy steps aside into the light as the portal opens behind it.
        const k = Math.min(1, (t - portalAt) / 1.6);
        portalMat.uniforms.uOpen.value = k; portalMat.uniforms.uTime.value = t;
        trophy.scale.setScalar(.42 * (1 - k)); trophy.visible = k < 1; glow.color.set('#ff9fb8'); glow.intensity = 6 + k * 6;
        // Walking up to it takes you through.
        if (k >= 1 && !entered) { const p = o.camera.position, w = safe.position; if (Math.hypot(p.x - w.x, p.z - w.z) < 1.35) { entered = true; o.onEnter?.(); } }
      }
      if (confettiAt >= 0 && t > confettiAt) {
        const age = t - confettiAt; (confetti.material as THREE.PointsMaterial).opacity = Math.min(1, age * 3) * (1 - THREE.MathUtils.smoothstep(age, 5, 7));
        for (let i = 0; i < COUNT; i++) {
          const j = i * 3; cp[j] += (cv[j] + Math.sin(t * 3 + i) * .25) * dt; cp[j + 1] = Math.max(.02, cp[j + 1] + cv[j + 1] * dt); cp[j + 2] += (cv[j + 2] + Math.cos(t * 2.6 + i) * .25) * dt;
        }
        confettiGeo.attributes.position.needsUpdate = true;
        if (age === 0 || !confetti.visible) burst();
        if (age > 7) { confetti.visible = false; confettiAt = -1; }
      }
    },
    dispose() { clearTimeout(toastTimer); toast.remove(); disposables.forEach(d => d.dispose()); scene.remove(confetti, safe, ...minis.map(m => m.group)); },
  };
}
