// The author in his own room. Rodion, life size (the avatar he made of himself in Avaturn), stands at a
// sculptor's stand by the left wall and builds a figure edge by edge: the clay rises out of a line of light
// that runs up the piece while his tool works at it, and when it is done it turns to bronze, holds, and
// starts again. He is the room's host and its archive: he notices you, greets you, talks (in short lines
// with his hands), opens his archive of models for you and turns to point at whatever you put on the
// stage, and he is the way to commission a model of your own.
//
// He moves procedurally on his own skeleton (a Mixamo-style rig in a T-pose): two-bone IK for the arms
// (the tool hand follows the build line) and for the legs (the feet stay planted, and he steps when he
// turns), a breathing, swaying spine, and a head that looks at what matters. There are no blendshapes,
// so the face does not move; everything else does.
import * as THREE from 'three';
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ExhibitInfo } from './model-room-exhibits';
import { ROOM } from './model-room-layout';

type Lang = { en: string; de: string };
const L = (en: string, de: string): Lang => ({ en, de });

/** Where he works: just inside the entrance on the left, between the door and the stage, facing the visitor who
 *  steps out of the frame (the first person you see in the room, not a figure in a corner). */
const AT = new THREE.Vector3(-3, 0, 10.9);
const FACE = Math.atan2(0 - AT.x, ROOM.shift + 9.5 - AT.z);
/** He and his stand stand on the platform, not in it. */
const FLOOR = .06;
const HEIGHT = 1.83;
const STAND = .58;          // the stand in front of him
const WHEEL_Y = .965;       // the banding wheel the piece turns on
const PIECE_H = .6;         // the figure he is building

const LINES = {
  hello: [L("Hi, I'm Rodion. Everything in this room I built by hand.", 'Hi, ich bin Rodion. Alles in diesem Raum habe ich von Hand gebaut.')],
  barks: [
    L('Almost done. Watch the shoulders come in.', 'Fast fertig. Achte auf die Schultern.'),
    L('Every edge here I place by hand, one at a time.', 'Jede Kante hier setze ich von Hand, eine nach der anderen.'),
    L('Over a thousand models so far. A few of them stand in this room.', 'Über tausend Modelle bisher. Ein paar stehen in diesem Raum.'),
    L('Want to see something from my archive? Just ask.', 'Willst du etwas aus meinem Archiv sehen? Frag einfach.'),
    L('Need a model of your own? Talk to me.', 'Brauchst du ein eigenes Modell? Sprich mich an.'),
  ],
  ask: L('What can I do for you?', 'Was kann ich für dich tun?'),
  archive: L("Pick one. I'll build it on the stage for you.", 'Such dir eine aus. Ich baue sie dir auf der Bühne auf.'),
  order: [
    L('Tell me what it is: a product, an interior, a figure, a building.', 'Erzähl mir, was es ist: ein Produkt, ein Interieur, eine Figur, ein Gebäude.'),
    L('From photos or drawings, ready for the web, for film or for print.', 'Aus Fotos oder Zeichnungen, fertig fürs Web, für Film oder Druck.'),
  ],
  how: [
    L('First the shape, in big blocks.', 'Erst die Form, in großen Blöcken.'),
    L('Then the edges, one by one, until they hold the light.', 'Dann die Kanten, eine nach der anderen, bis sie das Licht halten.'),
    L('Then materials, light and a camera. Watch.', 'Dann Materialien, Licht und eine Kamera. Schau.'),
  ],
  who: [
    L('Rodion Belousov. 3D artist and developer in Vienna.', 'Rodion Belousov. 3D-Künstler und Entwickler in Wien.'),
    L('I build the models, the films and the websites they live in.', 'Ich baue die Modelle, die Filme und die Websites, in denen sie leben.'),
  ],
  present: (title: string) => L(`There it is: ${title}.`, `Bitte schön: ${title}.`),
  bye: L('See you around.', 'Bis später.'),
};
const CHOICES: [key: 'archive' | 'order' | 'how' | 'who', label: Lang][] = [
  ['archive', L('Show me your work', 'Zeig mir deine Arbeiten')],
  ['order', L('I need a 3D model', 'Ich brauche ein 3D-Modell')],
  ['how', L('How do you build them?', 'Wie baust du sie?')],
  ['who', L('Who are you?', 'Wer bist du?')],
];

export const AUTHOR_INFO: ExhibitInfo = {
  id: 'author', no: '000', kind: L('The author', 'Der Autor'), title: 'Rodion Belousov',
  sub: L('3D artist · Vienna', '3D-Künstler · Wien'),
  text: L('He built every piece in this room.\nTalk to him: click him.', 'Er hat jedes Stück in diesem Raum gebaut.\nSprich ihn an: klick ihn an.'),
  focus: new THREE.Vector3(AT.x, 1.4, AT.z), distance: 3.4, elevation: .12,
};

export function createAuthor(o: {
  scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; root: HTMLElement; loader: GLTFLoader;
  mobile: boolean; reduced: boolean; de: () => boolean; coarse: () => boolean;
  /** The archive stage he presents works on. */
  stage: THREE.Vector3;
  /** The buffer the frame is drawn into (shaders are compiled for it). */
  target: () => THREE.WebGLRenderTarget | null;
  onArchive: () => void; onTalk?: () => void; onSpeak?: () => void;
}) {
  const { scene, camera } = o;
  const own: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => { own.push(x); return x; };
  const lang = () => (o.de() ? 'de' : 'en');

  // ── The workshop: a platform like the other exhibits', the stand, a warm light ─────────────────────────
  const shop = new THREE.Group(); shop.position.copy(AT); shop.rotation.y = FACE; scene.add(shop);
  const stone = keep(new THREE.MeshStandardMaterial({ color: '#141918', roughness: .5, metalness: .2 }));
  const glow = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(.35, 2.1, 1.1), toneMapped: false }));
  const steel = keep(new THREE.MeshStandardMaterial({ color: '#2a2d2f', roughness: .38, metalness: .85 }));
  const wood = keep(new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: .62, metalness: 0 }));
  const disc = new THREE.Mesh(keep(new THREE.CylinderGeometry(1.02, 1.07, FLOOR, 72)), stone); disc.position.set(0, FLOOR / 2, .3); disc.receiveShadow = true; shop.add(disc);
  const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(1.04, .008, 6, 120)), glow); ring.rotation.x = Math.PI / 2; ring.position.set(0, FLOOR + .002, .3); shop.add(ring);
  const stand = new THREE.Group(); stand.position.set(0, FLOOR, STAND); shop.add(stand);
  // A sculptor's plinth: a dark stone column with a line of light at its foot, a wooden top, the turning wheel.
  const column = new THREE.Mesh(keep(new THREE.BoxGeometry(.3, .9, .3)), stone); column.position.y = .45; column.castShadow = column.receiveShadow = true; stand.add(column);
  const foot = new THREE.Mesh(keep(new THREE.BoxGeometry(.34, .03, .34)), steel); foot.position.y = .015; stand.add(foot);
  const footLine = new THREE.Mesh(keep(new THREE.BoxGeometry(.342, .004, .342)), glow); footLine.position.y = .032; stand.add(footLine);
  const top = new THREE.Mesh(keep(new THREE.BoxGeometry(.4, .04, .4)), wood); top.position.y = .92; top.castShadow = top.receiveShadow = true; stand.add(top);
  const wheel = new THREE.Group(); wheel.position.y = WHEEL_Y - .015; stand.add(wheel);
  const plate = new THREE.Mesh(keep(new THREE.CylinderGeometry(.17, .17, .025, 48)), steel); plate.receiveShadow = true; wheel.add(plate);
  const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(.172, .003, 6, 64)), glow); rim.rotation.x = Math.PI / 2; rim.position.y = .013; wheel.add(rim);
  // A soft contact shadow under him and the stand: he stands on the floor, not over it.
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sg = sc.getContext('2d')!;
  const grad = sg.createRadialGradient(64, 64, 6, 64, 64, 62); grad.addColorStop(0, 'rgba(0,0,0,.62)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = grad; sg.fillRect(0, 0, 128, 128);
  const blob = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.3, 1.6)), keep(new THREE.MeshBasicMaterial({ map: keep(new THREE.CanvasTexture(sc)), transparent: true, depthWrite: false })));
  blob.rotation.x = -Math.PI / 2; blob.position.set(0, FLOOR + .004, .25); shop.add(blob);
  // His light: a warm key from above and in front (made now, so the scene's light count never changes later).
  const key = new THREE.SpotLight('#ffe2c2', 0, 11, .55, .85, 1.5);
  shop.updateMatrixWorld(true);
  key.position.copy(shop.localToWorld(new THREE.Vector3(1.1, 4.7, 3.1))); key.target.position.copy(shop.localToWorld(new THREE.Vector3(0, 1.2, .25))); scene.add(key, key.target);

  // ── The piece he is building: a bronze figure, rising edge by edge out of a line of light ─────────────
  let piece: { clay: THREE.Mesh; wire: THREE.Mesh; band: THREE.Mesh; heights: Float32Array; tris: number; mat: THREE.MeshStandardMaterial } | undefined;
  const RADIUS_BINS = 40; let pieceRadii: Float32Array | null = null;
  let built = 0, buildSpeed = 1, holdUntil = -1, bronze = 0, phasePiece: 'build' | 'hold' | 'melt' = 'build';
  const CLAY = new THREE.Color('#cdbca2'), BRONZE = new THREE.Color('#8a5d36');
  async function loadPiece() {
    const g = await o.loader.loadAsync('/models/archive/bronze-woman.mobile.glb');
    let src: THREE.Mesh | undefined; g.scene.updateMatrixWorld(true);
    g.scene.traverse(n => { if (!src && (n as THREE.Mesh).isMesh) src = n as THREE.Mesh; });
    if (!src) return;
    const geo = src.geometry.clone(); geo.applyMatrix4(src.matrixWorld);
    geo.computeBoundingBox(); const b = geo.boundingBox!, size = b.getSize(new THREE.Vector3()), mid = b.getCenter(new THREE.Vector3());
    const s = PIECE_H / size.y; geo.translate(-mid.x, -b.min.y, -mid.z); geo.scale(s, s, s);
    // Bottom to top: the triangles are re-ordered by height, so a growing draw range builds the figure upwards.
    const pos = geo.attributes.position, index = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i);
    const tris = index.length / 3, order = Array.from({ length: tris }, (_, i) => i), cy = new Float32Array(tris);
    for (let t = 0; t < tris; t++) cy[t] = (pos.getY(index[t * 3]) + pos.getY(index[t * 3 + 1]) + pos.getY(index[t * 3 + 2])) / 3;
    order.sort((a, c) => cy[a] - cy[c]);
    // How wide the figure is at each height: the band of light and the tool hand follow its surface.
    const radii = new Float32Array(RADIUS_BINS);
    for (let i = 0; i < pos.count; i++) { const k = Math.min(RADIUS_BINS - 1, Math.floor(pos.getY(i) / PIECE_H * RADIUS_BINS)); radii[k] = Math.max(radii[k], Math.hypot(pos.getX(i), pos.getZ(i))); }
    for (let k = 1; k < RADIUS_BINS; k++) if (!radii[k]) radii[k] = radii[k - 1];
    pieceRadii = radii;
    const sorted = new Uint32Array(tris * 3), heights = new Float32Array(tris);
    order.forEach((t, i) => { sorted.set([index[t * 3], index[t * 3 + 1], index[t * 3 + 2]], i * 3); heights[i] = cy[t]; });
    const indexAttr = new THREE.BufferAttribute(sorted, 1);
    geo.setIndex(indexAttr); geo.computeVertexNormals();
    // Two views of one geometry, each with its own draw range: the clay behind, the glowing line ahead.
    const wireGeo = new THREE.BufferGeometry(); wireGeo.setAttribute('position', geo.attributes.position); wireGeo.setIndex(indexAttr);
    keep(geo); keep(wireGeo);
    const mat = keep(new THREE.MeshStandardMaterial({ color: CLAY.clone(), roughness: .82, metalness: 0, envMapIntensity: 1.2 }));
    const clay = new THREE.Mesh(geo, mat); clay.castShadow = true; clay.receiveShadow = true;
    const wire = new THREE.Mesh(wireGeo, keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(.45, 2.4, 1.3), wireframe: true, transparent: true, opacity: .55, toneMapped: false, depthWrite: false })));
    const band = new THREE.Mesh(keep(new THREE.TorusGeometry(.2, .0025, 6, 96)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, 2.6, 1.4), toneMapped: false, transparent: true, opacity: .8, depthWrite: false })));
    band.rotation.x = Math.PI / 2;
    const holder = new THREE.Group(); holder.position.y = .015; holder.add(clay, wire, band); wheel.add(holder);
    clay.geometry.setDrawRange(0, 0); wire.geometry.setDrawRange(0, 0);
    piece = { clay, wire, band, heights, tris, mat };
    g.scene.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
  }
  /** Height (above the wheel) of the line being built, and how far from the axis the surface is there. */
  const lineY = () => (piece ? piece.heights[Math.min(piece.tris - 1, Math.floor(built))] ?? 0 : .3);
  const radiusAt = (y: number) => { const k = THREE.MathUtils.clamp(Math.floor(y / PIECE_H * RADIUS_BINS), 0, RADIUS_BINS - 1); return pieceRadii ? Math.max(.03, pieceRadii[k] * .82) : .1; };
  function updatePiece(t: number, dt: number) {
    wheel.rotation.y += dt * (.22 + (buildSpeed > 1 ? .5 : 0));
    if (!piece) return;
    const n = piece.tris;
    if (phasePiece === 'build') {
      built = Math.min(n, built + dt * n / 22 * buildSpeed);
      if (built >= n) { phasePiece = 'hold'; holdUntil = t + (buildSpeed > 1 ? 4 : 7); buildSpeed = 1; }
    } else if (phasePiece === 'hold' && t > holdUntil) phasePiece = 'melt';
    else if (phasePiece === 'melt') { built = Math.max(0, built - dt * n / 1.4); if (built <= 0) phasePiece = 'build'; }
    const count = Math.floor(built);
    piece.clay.geometry.setDrawRange(0, count * 3);
    const span = Math.min(count, 1400);
    piece.wire.geometry.setDrawRange((count - span) * 3, phasePiece === 'build' ? span * 3 : 0);
    // Clay while it grows, bronze when it stands (and as it melts away); the band of light rides the line.
    bronze += ((phasePiece === 'build' ? 0 : 1) - bronze) * Math.min(1, dt * (phasePiece === 'build' ? 8 : 1.4));
    piece.mat.color.copy(CLAY).lerp(BRONZE, bronze); piece.mat.metalness = .8 * bronze; piece.mat.roughness = .82 - .5 * bronze;
    piece.band.visible = phasePiece === 'build' && count > 0;
    piece.band.position.y = lineY();
    piece.band.scale.setScalar((radiusAt(lineY()) + .02) / .2 * (1 + .03 * Math.sin(t * 8)));
  }

  // ── Him ───────────────────────────────────────────────────────────────────────────────────────────────
  // (He joins the scene only once he is posed and compiled: never a frame of T-pose, never a compile hitch.)
  const body = new THREE.Group(); body.position.copy(AT).setY(FLOOR); body.rotation.y = FACE;
  let rig: ReturnType<typeof makeRig> | undefined;
  /** A raycast target round him (on a layer the camera never draws, so no pass ever sees it). */
  const proxy = new THREE.Mesh(keep(new THREE.CylinderGeometry(.34, .34, 1.9, 12)), keep(new THREE.MeshBasicMaterial({ visible: false })));
  proxy.position.y = .95; proxy.layers.set(5); body.add(proxy);
  const proxyStand = new THREE.Mesh(keep(new THREE.CylinderGeometry(.3, .3, 1.6, 10)), proxy.material); proxyStand.position.set(0, .8 + FLOOR, STAND); proxyStand.layers.set(5); shop.add(proxyStand);

  // His modelling tool: a boxwood stick with a wire loop, held in the right hand and pointed at the work.
  const tool = new THREE.Group(); tool.visible = false; scene.add(tool);
  const stick = new THREE.Mesh(keep(new THREE.CylinderGeometry(.0045, .006, .15, 8)), wood); stick.position.y = .075; tool.add(stick);
  const loop = new THREE.Mesh(keep(new THREE.TorusGeometry(.011, .0012, 6, 20)), steel); loop.position.y = .162; tool.add(loop);

  function makeRig(model: THREE.Object3D) {
    const bones = new Map<string, THREE.Bone>();
    model.traverse(n => { if ((n as THREE.Bone).isBone) bones.set(n.name.replace(/[^A-Za-z0-9]/g, ''), n as THREE.Bone); });
    const B = (n: string) => bones.get(n)!;
    // His height, the top of the body mesh.
    const armature = model.children.find(c => c.getObjectByProperty('isBone', true)) ?? model;
    let topY = 0; model.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh && /body/i.test(m.name)) { m.geometry.computeBoundingBox(); topY = Math.max(topY, m.geometry.boundingBox!.max.y); } });
    if (topY > .5) armature.scale.multiplyScalar(HEIGHT / topY);
    model.updateMatrixWorld(true);
    const inv = model.getWorldQuaternion(new THREE.Quaternion()).invert();
    const rest = new Map<THREE.Bone, { local: THREE.Quaternion; fig: THREE.Quaternion; figInv: THREE.Quaternion; pos: THREE.Vector3 }>();
    for (const b of bones.values()) { const f = inv.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())); rest.set(b, { local: b.quaternion.clone(), fig: f, figInv: f.clone().invert(), pos: b.position.clone() }); }
    const wp = (n: string) => B(n).getWorldPosition(new THREE.Vector3());
    const toFig = (v: THREE.Vector3) => model.worldToLocal(v.clone());
    // Directions and lengths at rest, in his own frame (facing +Z).
    const dir = (a: string, b: string) => toFig(wp(b)).sub(toFig(wp(a))).normalize();
    const len = (a: string, b: string) => wp(a).distanceTo(wp(b));
    const restDir: Record<string, THREE.Vector3> = {}, lengths: Record<string, number> = {};
    for (const [a, b] of [['LeftArm', 'LeftForeArm'], ['LeftForeArm', 'LeftHand'], ['RightArm', 'RightForeArm'], ['RightForeArm', 'RightHand'], ['LeftUpLeg', 'LeftLeg'], ['LeftLeg', 'LeftFoot'], ['RightUpLeg', 'RightLeg'], ['RightLeg', 'RightFoot']]) { restDir[a] = dir(a, b); lengths[a] = len(a, b); }
    const hipsRest = toFig(wp('Hips'));
    const ankleRest = { L: toFig(wp('LeftFoot')), R: toFig(wp('RightFoot')) };
    const headRest = toFig(wp('Head'));
    // The tool, held like a pen: from the palm, past the fingers, tipped towards the palm and the thumb. Placed once
    // at rest and handed to the hand bone, so it moves with the hand and never on its own.
    {
      const h = wp('RightHand'), f = wp('RightHandMiddle1').sub(h).normalize(), th = wp('RightHandThumb1').sub(h);
      th.sub(f.clone().multiplyScalar(th.dot(f))).normalize();
      const palm = new THREE.Vector3().crossVectors(f, th).normalize(); if (palm.y > 0) palm.negate();   // the T-pose palm faces the floor
      const aimTool = f.clone().multiplyScalar(.8).addScaledVector(palm, .42).addScaledVector(th, .3).normalize();
      tool.position.copy(h).addScaledVector(f, .07).addScaledVector(palm, .025);
      tool.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aimTool);
      B('RightHand').attach(tool);
    }
    return { model, armature, B, rest, restDir, lengths, hipsRest, ankleRest, headRest };
  }

  // Pose state: everything eases towards its goal, so every change of mind reads as motion, not a cut.
  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), v2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const bodyQ = new THREE.Quaternion(), bodyQi = new THREE.Quaternion();
  let yaw = FACE, yawGoal = FACE;
  const hand = { L: new THREE.Vector3(), R: new THREE.Vector3() }, handGoal = { L: new THREE.Vector3(), R: new THREE.Vector3() };
  const look = new THREE.Vector3(), lookGoal = new THREE.Vector3();
  const lean = { now: 0, goal: 0 }, crouch = { now: 0, goal: 0 }, speak = { now: 0, goal: 0 };
  type Foot = { at: THREE.Vector3; yaw: number; from: THREE.Vector3; fromYaw: number; to: THREE.Vector3; toYaw: number; k: number };
  let feet: { L: Foot; R: Foot } | undefined, nextFoot: 'L' | 'R' = 'L';
  let mixer: THREE.AnimationMixer | undefined; const captured = new Map<THREE.Bone, THREE.Quaternion>();
  let placed = false;

  function euler(x: number, y = 0, z = 0) { return q.setFromEuler(e.set(x, y, z, 'YXZ')); }
  /** Set a bone's orientation in his own frame (delta on the rest orientation); `keep` leaves that much of the
   *  motion-captured pose in it (the head keeps a little of its own life while it looks at you). */
  function setFig(name: string, delta: THREE.Quaternion, keep = 0) {
    const R = rig!, b = R.B(name), r = R.rest.get(b); if (!b || !r) return;
    const want = q2.copy(bodyQ).multiply(delta).multiply(r.fig);
    const parent = (b.parent as THREE.Object3D).getWorldQuaternion(new THREE.Quaternion());
    if (keep > 0) want.slerp(parent.clone().multiply(b.quaternion), keep);
    b.quaternion.copy(parent.invert().multiply(want));
  }
  /** Turn a bone on top of the motion-captured pose (or the rest pose, without one), the turn given in his frame. */
  function rel(name: string, delta: THREE.Quaternion) {
    const R = rig!, b = R.B(name), r = R.rest.get(b); if (!b || !r) return;
    b.quaternion.copy(captured.get(b) ?? r.local).multiply(q2.copy(r.figInv).multiply(delta).multiply(r.fig));
  }
  function aim(name: string, worldDir: THREE.Vector3) {
    const R = rig!; v2.copy(worldDir).applyQuaternion(bodyQi).normalize();
    setFig(name, new THREE.Quaternion().setFromUnitVectors(R.restDir[name], v2));
  }
  /** Two-bone IK: aim the upper bone and the lower bone so the chain's end reaches the target, bending towards the pole. */
  function limb(upper: string, lower: string, target: THREE.Vector3, pole: THREE.Vector3) {
    const R = rig!; const S = R.B(upper).getWorldPosition(new THREE.Vector3());
    const a = R.lengths[upper], b = R.lengths[lower];
    const toT = target.clone().sub(S); const d = THREE.MathUtils.clamp(toT.length(), Math.abs(a - b) + .01, (a + b) * .995);
    const dirT = toT.normalize(); const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
    const p = pole.clone().sub(dirT.clone().multiplyScalar(pole.dot(dirT))).normalize();
    const E = S.clone().addScaledVector(dirT, x).addScaledVector(p, h), T = S.clone().addScaledVector(dirT, d);
    aim(upper, E.clone().sub(S));
    aim(lower, T.sub(E));
  }
  const W = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyQuaternion(bodyQ);   // his frame → world direction

  // ── What he is doing ─────────────────────────────────────────────────────────────────────────────────
  type Mode = 'work' | 'admire' | 'notice' | 'talk' | 'present' | 'wave';
  let awayFor = 0, onScreen = true;
  let mode: Mode = 'work', modeAt = 0, nextAdmire = 9, greeted = false, lastBark = -99, barks = 0, near = false;
  let presentAt = -99;
  const queue: Lang[] = []; let line: Lang | null = null, lineAt = 0, lineHold = 0, typed = 0, dialog = false, cta = false;

  // ── His words: a glass card by his head, typed as he speaks; in a conversation it carries the choices ─
  const ui = document.createElement('div'); ui.className = 'mr-author'; ui.hidden = true; ui.setAttribute('aria-live', 'polite');
  ui.innerHTML = `<div class="mr-author-card"><span class="mr-author-who"><i></i>RODION</span><button type="button" class="mr-author-x" aria-label="Close">×</button><p class="mr-author-say"></p><div class="mr-author-chips"></div><a class="mr-author-cta" hidden></a></div>`;
  o.root.append(ui);
  const say = ui.querySelector<HTMLElement>('.mr-author-say')!, chips = ui.querySelector<HTMLElement>('.mr-author-chips')!, ctaEl = ui.querySelector<HTMLAnchorElement>('.mr-author-cta')!;
  const xBtn = ui.querySelector<HTMLButtonElement>('.mr-author-x')!;
  const events = new AbortController();
  xBtn.addEventListener('click', () => close(), { signal: events.signal });
  function renderChips() {
    chips.innerHTML = '';
    if (!dialog) return;
    for (const [key, label] of CHOICES) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label[lang()];
      b.addEventListener('click', () => choose(key), { signal: events.signal }); chips.append(b);
    }
    ctaEl.hidden = !cta;
    ctaEl.href = o.de() ? '/de/kontakt/?project=modeling' : '/contact/?project=modeling';
    ctaEl.innerHTML = `<span>${o.de() ? 'Projekt anfragen' : 'Start a project'}</span><svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  addEventListener('rb:langchange', () => { renderChips(); typed = 0; }, { signal: events.signal });
  function speakLines(lines: Lang[], replace = true) {
    if (replace) { queue.length = 0; line = null; }
    queue.push(...lines);
  }
  function choose(key: 'archive' | 'order' | 'how' | 'who') {
    cta = key === 'order'; renderChips(); o.onSpeak?.();
    if (key === 'archive') { speakLines([LINES.archive]); setTimeout(() => { if (dialog) { close(true); o.onArchive(); } }, 1300); }
    else if (key === 'order') speakLines(LINES.order);
    else if (key === 'how') { speakLines(LINES.how); if (phasePiece !== 'build' || built > (piece?.tris ?? 0) * .6) { phasePiece = 'melt'; } buildSpeed = 4.5; }
    else speakLines(LINES.who);
  }
  function open() {
    if (dialog) return;
    dialog = true; greeted = true; cta = false; mode = 'talk'; modeAt = clock; ui.classList.add('is-dialog'); o.root.classList.add('mr-talking'); renderChips();
    speakLines([LINES.ask]); o.onTalk?.();
  }
  function close(quiet = false) {
    if (!dialog) return;
    dialog = false; cta = false; ui.classList.remove('is-dialog'); o.root.classList.remove('mr-talking'); renderChips();
    if (!quiet) speakLines([LINES.bye]);
    mode = 'work'; modeAt = clock;
  }

  // ── Load ──────────────────────────────────────────────────────────────────────────────────────────────
  let loaded = false, disposed = false, clock = 0;
  async function load() {
    const url = o.mobile ? '/models/author/rodion.mobile.glb' : '/models/author/rodion.glb';
    const [gltf, idle] = await Promise.all([
      o.loader.loadAsync(url), fetch('/models/author/idle.json').then(r => r.ok ? r.json() : null).catch(() => null), loadPiece().catch(() => {}),
    ]) as [Awaited<ReturnType<GLTFLoader['loadAsync']>>, { duration: number; tracks: { name: string; times: number[]; values: number[] }[] } | null, unknown];
    if (disposed) return;
    const model = gltf.scene; dress(model, o.mobile, keep);
    body.add(model);
    rig = makeRig(model);
    // His motion-captured idle (Avaturn), looped; the arms, the legs' contact and the gaze are layered on it.
    if (idle) {
      const tracks = idle.tracks.map(t => /quaternion$/.test(t.name) ? new THREE.QuaternionKeyframeTrack(t.name, t.times, t.values) : new THREE.VectorKeyframeTrack(t.name, t.times, t.values));
      mixer = new THREE.AnimationMixer(model); mixer.clipAction(new THREE.AnimationClip('idle', idle.duration, tracks)).play();
    }
    // Soles on the platform: measured on the shoes themselves, at rest.
    { let sole = Infinity; const p = new THREE.Vector3();
      model.updateMatrixWorld(true);
      model.traverse(n => { const m = n as THREE.SkinnedMesh; if (!m.isSkinnedMesh || !/shoes|body/.test(m.name)) return; const pos = m.geometry.attributes.position; for (let i = 0; i < pos.count; i += 3) { m.getVertexPosition(i, p); m.localToWorld(p); sole = Math.min(sole, p.y); } });
      if (Number.isFinite(sole)) body.position.y += FLOOR - sole + .002;
      body.updateMatrixWorld(true); }
    // His textures go up to the GPU one per frame, and his shaders compile in parallel for the frame's own buffer,
    // before he appears: all at once on one frame they were the stutter as he came in.
    const textures = new Set<THREE.Texture>();
    model.traverse(n => { const m = (n as THREE.Mesh).material as THREE.Material | undefined; if (m) for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value); });
    for (const texture of textures) { if (disposed) return; o.renderer.initTexture(texture); await new Promise(r => requestAnimationFrame(r)); }
    // (The room's post buffer only exists once the room is built; compile for that one, not the canvas.)
    while (!o.target() && !disposed) await new Promise(r => requestAnimationFrame(r));
    const previous = o.renderer.getRenderTarget();
    let compiling: Promise<unknown> = Promise.resolve();
    try { o.renderer.setRenderTarget(o.target()); compiling = o.renderer.compileAsync(shop, camera, scene).then(() => o.renderer.compileAsync(body, camera, scene)); } finally { o.renderer.setRenderTarget(previous); }
    await compiling.catch(() => {});
    if (disposed) return;
    loaded = true; update(clock, 1 / 60); scene.add(body);
  }

  // ── Every frame ───────────────────────────────────────────────────────────────────────────────────────
  const camPos = new THREE.Vector3(), headW = new THREE.Vector3(), tmp = new THREE.Vector3();
  const stageLook = o.stage.clone().setY(1.2);
  function update(t: number, dt: number) {
    clock = t;
    key.intensity += ((loaded ? 30 : 0) - key.intensity) * Math.min(1, dt * 1.5);
    updatePiece(t, dt);
    if (!loaded || !rig) return;
    camera.getWorldPosition(camPos);
    const dist = Math.hypot(camPos.x - AT.x, camPos.z - AT.z);
    near = dist < 7;
    // Walking away (or turning away from him for a moment) ends the conversation.
    awayFor = dialog && !onScreen ? awayFor + dt : 0;
    if (dialog && (dist > 4.8 || awayFor > 1.2)) close();

    // Moods: greet a visitor who comes close, bark now and then, step back to admire the piece.
    if (!greeted && !dialog && dist < 6.5 && inFront(camPos)) { greeted = true; mode = 'wave'; modeAt = t; speakLines(LINES.hello); lastBark = t; }
    if (!dialog && near && greeted && t - lastBark > 16 + (barks % 3) * 4 && barks < 4 && !line && !queue.length) {
      lastBark = t; speakLines([LINES.barks[barks % LINES.barks.length]]); barks++;
      if (mode === 'work') { mode = 'notice'; modeAt = t; }
    }
    if (mode === 'work' && t > nextAdmire && !near) { mode = 'admire'; modeAt = t; }
    if (mode === 'admire' && t - modeAt > 3.2) { mode = 'work'; modeAt = t; nextAdmire = t + 9 + Math.random() * 6; }
    if (mode === 'wave' && t - modeAt > 2.6) { mode = dialog ? 'talk' : 'notice'; modeAt = t; }
    if (mode === 'notice' && t - modeAt > 3.2 && !dialog) { mode = 'work'; modeAt = t; }
    if (mode === 'present' && t - presentAt > 4.2) { mode = dialog ? 'talk' : 'work'; modeAt = t; }

    // Speech: one line at a time, typed out as he says it, then held long enough to read.
    if (!line && queue.length) { line = queue.shift()!; lineAt = t; typed = 0; lineHold = 1.6 + line.en.length / 22; ui.hidden = false; }
    if (line) {
      const text = line[lang()], chars = Math.min(text.length, Math.floor((t - lineAt) * 34));
      if (chars !== typed) { typed = chars; say.textContent = text.slice(0, chars); }
      const typing = chars < text.length;
      speak.goal = typing ? 1 : 0;
      if (!typing && t - lineAt > text.length / 34 + lineHold) { line = null; if (!dialog && !queue.length) ui.hidden = true; }
    } else speak.goal = 0;
    if (dialog) ui.hidden = false;

    // Where he faces, what his hands do, what he looks at.
    const toCam = Math.atan2(camPos.x - AT.x, camPos.z - AT.z);
    const toStage = Math.atan2(o.stage.x - AT.x, o.stage.z - AT.z);
    const wheelW = shop.localToWorld(new THREE.Vector3(0, FLOOR + WHEEL_Y, STAND));
    const lineW = wheelW.clone().setY(FLOOR + WHEEL_Y + .015 + lineY());
    bodyQ.setFromAxisAngle(up, yaw); bodyQi.copy(bodyQ).invert();
    const shoulderR = rig.B('RightArm').getWorldPosition(new THREE.Vector3()), shoulderL = rig.B('LeftArm').getWorldPosition(new THREE.Vector3());
    const relaxed = (side: 'L' | 'R') => (side === 'L' ? shoulderL : shoulderR).clone().add(W(side === 'L' ? .06 : -.06, -.56, .06));
    const s = Math.sin, wob = (k: number) => s(t * k) * .5 + s(t * k * 1.7 + 1.3) * .3;
    const working = mode === 'work' || mode === 'notice';
    if (working) {
      // At the stand, bent to the work; the tool hand strokes along the line being built, the other steadies the piece.
      yawGoal = FACE; lean.goal = .22; crouch.goal = .05;
      const toHim = new THREE.Vector3(-Math.sin(FACE), 0, -Math.cos(FACE));
      const side = new THREE.Vector3(-toHim.z, 0, toHim.x);
      const rad = radiusAt(lineY());
      handGoal.R.copy(lineW).addScaledVector(toHim, rad + .1).addScaledVector(side, -.06 + s(t * 1.6) * .045).add(v.set(0, s(t * 3.1) * .02, 0));
      handGoal.L.copy(wheelW).addScaledVector(toHim, .12).addScaledVector(side, .16).add(v.set(0, .03 + Math.max(0, s(t * .4)) * .05, 0));
      lookGoal.copy(handGoal.R).add(v.set(s(t * .7) * .03, .02, 0));
      if (mode === 'notice') { lookGoal.copy(camPos); lean.goal = .12; handGoal.R.lerp(relaxed('R'), .3); }
    } else if (mode === 'admire') {
      // A step back from the stand, a hand at his chin, head on one side.
      yawGoal = FACE; lean.goal = -.04; crouch.goal = 0;
      rig.B('Head').getWorldPosition(headW);
      handGoal.L.copy(headW).add(W(.02, -.14, .1)); handGoal.R.copy(relaxed('R')).add(W(.04, .12, .12));
      lookGoal.copy(wheelW).setY(FLOOR + WHEEL_Y + PIECE_H * .6);
    } else if (mode === 'talk' || mode === 'wave') {
      // Turned to you; while he speaks his hands talk too, and while he listens they rest together.
      yawGoal = clampYaw(toCam); lean.goal = 0; crouch.goal = 0;
      lookGoal.copy(camPos).add(v.set(0, -.05, 0));
      // Listening: hands loosely together in front of the belt. Speaking: open hands out in front, the right one
      // carrying the beat, elbows away from the body.
      const k = speak.now, hipsW = body.localToWorld(rig.hipsRest.clone());
      const listenL = hipsW.clone().add(W(.045, .1, .25)), listenR = hipsW.clone().add(W(-.045, .11, .26));
      const talkL = hipsW.clone().add(W(.19 + .04 * wob(2.3), .24 + .06 * Math.abs(s(t * 2.9)), .3));
      const talkR = hipsW.clone().add(W(-.22 - .06 * wob(2.1), .3 + .1 * Math.abs(s(t * 3.3 + 1)), .32 + .04 * s(t * 1.9)));
      handGoal.L.copy(listenL).lerp(talkL, k); handGoal.R.copy(listenR).lerp(talkR, k);
      if (mode === 'wave') handGoal.R.copy(shoulderR).add(W(-.32, .3 + .02 * s(t * 9), .14)).add(W(.09 * s(t * 9), 0, 0));
    } else if (mode === 'present') {
      // Turned half to the stage, his arm out to it, an open hand; a look there, then back to you.
      yawGoal = clampYaw(lerpAngle(toCam, toStage, .55)); lean.goal = .02; crouch.goal = 0;
      handGoal.R.copy(shoulderR).add(stageLook.clone().sub(shoulderR).normalize().multiplyScalar(rig.lengths.RightArm + rig.lengths.RightForeArm - .04)).add(v.set(0, .05, 0));
      handGoal.L.copy(relaxed('L'));
      lookGoal.copy(t - presentAt < 1.8 ? stageLook : camPos);
    }

    // No hand ever goes into his body: below the chest, a goal behind the front of the torso is brought forward.
    if (mode !== 'admire') for (const g of [handGoal.L, handGoal.R]) {
      const hipsW = body.localToWorld(rig.hipsRest.clone()), rel = g.clone().sub(hipsW).applyQuaternion(bodyQi);
      if (rel.y > -.2 && rel.y < .5 && Math.abs(rel.x) < .26 && rel.z < .2) { rel.z = .2; g.copy(hipsW).add(rel.applyQuaternion(bodyQ)); }
    }

    // Ease everything (the body turns at a person's pace; the hands are quicker than the head).
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);
    const turn = THREE.MathUtils.euclideanModulo(yawGoal - yaw + Math.PI, Math.PI * 2) - Math.PI;
    yaw += THREE.MathUtils.clamp(turn, -dt * 1.9, dt * 1.9) * Math.min(1, Math.abs(turn) * 4);
    if (!placed) { hand.L.copy(handGoal.L); hand.R.copy(handGoal.R); look.copy(lookGoal); placed = true; }
    hand.L.lerp(handGoal.L, ease(mode === 'wave' ? 14 : 6)); hand.R.lerp(handGoal.R, ease(mode === 'wave' ? 14 : working ? 9 : 6));
    look.lerp(lookGoal, ease(4.5));
    lean.now += (lean.goal - lean.now) * ease(3); crouch.now += (crouch.goal - crouch.now) * ease(3); speak.now += (speak.goal - speak.now) * ease(5);
    body.rotation.y = yaw; body.updateMatrixWorld(true);
    bodyQ.setFromAxisAngle(up, yaw); bodyQi.copy(bodyQ).invert();
    pose(t, dt);
    tool.visible = mode === 'work' || mode === 'notice' || mode === 'admire';
  }

  function pose(t: number, dt: number) {
    const R = rig!, s = Math.sin;
    // Breath and weight: the chest rises, the weight drifts from foot to foot.
    // (With the captured idle these come from the capture; the procedural ones are the fallback.)
    const live = mixer ? 0 : 1, breath = (s(t * 1.65) * .5 + .5) * live, sway = s(t * .42) * (mode === 'work' ? .5 : 1) * live;
    // Hips: down a little when he works, shifted over the standing leg, turned a touch with the shoulders.
    // The motion capture first (his own idle: breath, weight, the small life of a standing person), then
    // everything he does on top of it.
    const hipsBone = R.B('Hips'), hipsRest = R.rest.get(hipsBone)!;
    captured.clear();
    if (mixer) { mixer.update(dt); for (const b of R.rest.keys()) captured.set(b, b.quaternion.clone()); }
    const drift = mixer ? hipsBone.position.clone().sub(hipsRest.pos) : new THREE.Vector3();
    const hips = R.hipsRest.clone().add(new THREE.Vector3(mixer ? 0 : sway * .022, -crouch.now * .25 - (mixer ? 0 : Math.abs(sway) * .008), -lean.now * .1));
    hipsBone.position.copy(R.armature.worldToLocal(body.localToWorld(hips.clone()))).add(drift);
    rel('Hips', euler(lean.now * .35, 0, mixer ? 0 : -sway * .035));
    rel('Spine', euler(lean.now * .3 + breath * .012, 0, sway * .02));
    rel('Spine1', euler(lean.now * .25 + breath * .01, speak.now * s(t * 1.3) * .04));
    rel('Spine2', euler(lean.now * .2 - breath * .015, speak.now * s(t * 1.1 + .7) * .05));

    // Head and neck: towards what he looks at, within a neck's reach of where the chest faces.
    R.B('Head').getWorldPosition(v);
    const d = look.clone().sub(v).applyQuaternion(bodyQi);
    let hy = Math.atan2(d.x, d.z), hp = -Math.atan2(d.y, Math.hypot(d.x, d.z));
    hy = THREE.MathUtils.clamp(hy, -1.25, 1.25); hp = THREE.MathUtils.clamp(hp, -.5, .75);
    const nod = speak.now * (s(t * 4.1) * .035 + s(t * 2.3) * .02), tilt = mode === 'admire' ? .16 : speak.now * s(t * .9) * .05;
    setFig('Neck', euler(hp * .45 + lean.now * .1, hy * .45, 0), .35);
    setFig('Head', euler(hp + nod, hy, tilt), .2);

    // Arms: two-bone IK to the hands' goals, elbows down and out.
    limb('RightArm', 'RightForeArm', hand.R, W(-.9, -.45, -.45));
    limb('LeftArm', 'LeftForeArm', hand.L, W(.9, -.45, -.45));
    // Hands: the tool hand grips, the others rest half-open; while talking they open up.
    const grip = mode === 'work' || mode === 'notice' ? 1 : 0;
    for (const side of ['Left', 'Right'] as const) {
      const sx = side === 'Left' ? 1 : -1, curl = .25 + (side === 'Right' ? grip * .55 : 0) - speak.now * .12;
      rel(`${side}Hand`, euler(0, 0, (side === 'Right' && mode === 'wave' ? s(t * 9) * .35 : 0)));
      for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (let k = 1; k <= 3; k++) rel(`${side}Hand${f}${k}`, q.setFromAxisAngle(v2.set(0, 0, 1), -sx * curl * (k === 1 ? .9 : 1.2) * (f === 'Pinky' ? 1.2 : 1)));
      rel(`${side}HandThumb2`, q.setFromAxisAngle(v2.set(0, 0, 1), -sx * (.15 + grip * .2)));
    }

    // Legs: the feet stay where they stand; when he has turned far enough, he steps, one foot at a time.
    stepFeet(dt);
    for (const side of ['L', 'R'] as const) {
      const f = feet![side], name = side === 'L' ? 'Left' : 'Right';
      const lift = s(Math.min(1, f.k) * Math.PI) * (f.k < 1 ? .07 : 0);
      const target = f.at.clone().add(v.set(0, lift, 0));
      limb(`${name}UpLeg`, `${name}Leg`, target, new THREE.Vector3(Math.sin(f.yaw), 0, Math.cos(f.yaw)).add(v2.set(0, .15, 0)));
      setFig(`${name}Foot`, q.setFromAxisAngle(up, f.yaw - yaw));
    }
  }
  function stepFeet(dt: number) {
    const R = rig!;
    const want = (side: 'L' | 'R') => body.localToWorld(R.ankleRest[side].clone());
    if (!feet) {
      const mk = (side: 'L' | 'R'): Foot => { const p = want(side); return { at: p.clone(), yaw, from: p.clone(), fromYaw: yaw, to: p.clone(), toYaw: yaw, k: 1 }; };
      feet = { L: mk('L'), R: mk('R') };
    }
    const stepping = feet.L.k < 1 || feet.R.k < 1;
    for (const side of ['L', 'R'] as const) {
      const f = feet[side];
      if (f.k < 1) { f.k = Math.min(1, f.k + dt / .34); const e = f.k * f.k * (3 - 2 * f.k); f.at.lerpVectors(f.from, f.to, e); f.yaw = f.fromYaw + (f.toYaw - f.fromYaw) * e; }
    }
    if (stepping) return;
    // The foot that has drifted furthest from where it should be goes first, then the other.
    const err = (side: 'L' | 'R') => feet![side].at.distanceTo(want(side)) + Math.abs(THREE.MathUtils.euclideanModulo(yaw - feet![side].yaw + Math.PI, Math.PI * 2) - Math.PI) * .25;
    const side = err('L') > .06 || err('R') > .06 ? (err(nextFoot) > .03 ? nextFoot : nextFoot === 'L' ? 'R' : 'L') : null;
    if (!side) return;
    const f = feet[side]; f.from.copy(f.at); f.fromYaw = f.yaw; f.to.copy(want(side)); f.toYaw = yaw; f.k = 0;
    nextFoot = side === 'L' ? 'R' : 'L';
  }
  function clampYaw(a: number) {
    // He does not turn his back on his work: within 110° either side of the stand.
    const d = THREE.MathUtils.euclideanModulo(a - FACE + Math.PI, Math.PI * 2) - Math.PI;
    return FACE + THREE.MathUtils.clamp(d, -1.9, 1.9);
  }
  function lerpAngle(a: number, b: number, k: number) { const d = THREE.MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI; return a + d * k; }
  function inFront(p: THREE.Vector3) { const a = Math.atan2(p.x - AT.x, p.z - AT.z); return Math.abs(THREE.MathUtils.euclideanModulo(a - FACE + Math.PI, Math.PI * 2) - Math.PI) < 1.5; }

  /** Keep his card by his head on screen (or at the foot of the screen on a phone, in a conversation). */
  const proj = new THREE.Vector3();
  function place(width: number, height: number) {
    if (ui.hidden || !rig) return;
    rig.B('Head').getWorldPosition(proj); proj.y += .32; proj.project(camera);
    const behind = proj.z > 1, x = (proj.x * .5 + .5) * width, y = (-proj.y * .5 + .5) * height;
    const offscreen = behind || x < -40 || x > width + 40 || y < -40 || y > height + 40;
    onScreen = !offscreen;
    ui.classList.toggle('is-away', offscreen && !dialog);
    // The card hangs above and beside the anchor: keep all of it on screen, under the site's header.
    const card = ui.firstElementChild as HTMLElement, cw = card.offsetWidth + 30, ch = card.offsetHeight + 16;
    const left = x + cw > width - 12 && x - cw > 12;
    ui.style.setProperty('--x', `${Math.round(THREE.MathUtils.clamp(x, left ? cw + 12 : 16, left ? width - 16 : width - cw - 12))}px`);
    ui.style.setProperty('--y', `${Math.round(THREE.MathUtils.clamp(y, ch + 96, height - 24))}px`);
    ui.classList.toggle('is-left', left);
  }

  return {
    /** What a click can hit: him and his stand. */
    targets: [proxy, proxyStand] as THREE.Object3D[],
    layer: 5,
    collider: new THREE.Box3().setFromPoints([AT, AT.clone().add(new THREE.Vector3(Math.sin(FACE), 0, Math.cos(FACE)).multiplyScalar(STAND))]).expandByVector(new THREE.Vector3(.42, 0, .42)).expandByPoint(new THREE.Vector3(AT.x, 2, AT.z)),
    load, update, place, open, close,
    isTalking: () => dialog,
    /** A work arrived on the stage: he turns to it and presents it. */
    present(title: string) {
      if (!loaded) return;
      mode = 'present'; presentAt = clock; modeAt = clock;
      if (Math.hypot(camPos.x - AT.x, camPos.z - AT.z) < 16) speakLines([LINES.present(title)], !dialog);
    },
    /** The caption's subject when you look at him from close by. */
    inView(position: THREE.Vector3, forward: THREE.Vector3) {
      if (!loaded) return undefined;
      tmp.copy(AUTHOR_INFO.focus).sub(position); const dist = tmp.length();
      return dist < 6.5 && tmp.normalize().angleTo(forward) < .42 ? AUTHOR_INFO : undefined;
    },
    dispose() {
      disposed = true; events.abort(); ui.remove();
      scene.remove(shop, body, key, key.target);
      body.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
      own.forEach(x => x.dispose());
    },
  };
}

/** His avatar's materials, made for the room: skin with a warm sheen, hair cards, cloth. Phones get the plain versions. */
function dress(model: THREE.Object3D, mobile: boolean, keep: <T extends { dispose(): void }>(x: T) => T) {
  model.traverse(node => {
    const mesh = node as THREE.Mesh; if (!mesh.isMesh) return;
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    const old = mesh.material as THREE.MeshStandardMaterial, name = old.name ?? '';
    if (!/^avaturn_/.test(name)) return;
    const base = { name, map: old.map, normalMap: old.normalMap, roughnessMap: old.roughnessMap, metalnessMap: old.metalnessMap, color: old.color, metalness: 0, side: THREE.FrontSide } as THREE.MeshPhysicalMaterialParameters;
    if (old.normalMap) base.normalScale = old.normalScale.clone();
    let next: THREE.Material;
    if (/hair/.test(name)) {
      next = old.transparent
        ? new THREE.MeshStandardMaterial({ ...base, roughness: .5, side: THREE.DoubleSide, transparent: true, depthWrite: false, alphaTest: .02 } as THREE.MeshStandardMaterialParameters)
        : new THREE.MeshStandardMaterial({ ...base, roughness: .5, side: THREE.DoubleSide, alphaTest: .4 } as THREE.MeshStandardMaterialParameters);
      if (old.transparent) mesh.renderOrder = 2;
    } else if (/body/.test(name) && !mobile) {
      // Skin: a soft sheen, and light scattering red through the edges (ears, the rim of a cheek against the light).
      const skin = new THREE.MeshPhysicalMaterial({ ...base, roughness: .6, specularIntensity: .45, sheen: .3, sheenColor: new THREE.Color('#ff9f8a'), sheenRoughness: .55 });
      skin.onBeforeCompile = sh => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
          float rimScatter = pow(1. - clamp(dot(normal, normalize(vViewPosition)), 0., 1.), 2.5);
          outgoingLight += diffuseColor.rgb * vec3(.9, .25, .14) * rimScatter * .2;
          #include <opaque_fragment>`);
      };
      skin.customProgramCacheKey = () => 'author-skin';
      next = skin;
    } else next = new THREE.MeshStandardMaterial({ ...base, roughness: /body/.test(name) ? .6 : .92 } as THREE.MeshStandardMaterialParameters);
    mesh.material = keep(next); old.dispose();
  });
}
