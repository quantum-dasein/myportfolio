// The two people in the night scene. Until Rodion's own models of the two of them arrive, each is a simple
// stylised figure (in the spirit of the astronaut): a jointed body that can stand, kneel on one knee, hold
// out a ring box, turn and lean in for a kiss, always smiling.
//
// Their real figures are rodion.glb / lida.glb in public/models/night/ (scripts/proposal/build-people.py):
// realistic base meshes with their hair, glasses and clothes, and an 18-bone skeleton that this file poses
// procedurally (kneeling, offering the ring, holding her, the kiss). The stand-ins remain the fallback.
import * as THREE from 'three';
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type Pose = { kneel: number; offer: number; lean: number; tiptoe: number; wave: number; hold: number; happy: number };
type Look = { height: number; skin: string; hair: string; long: boolean; top: string; bottom: string; shoes: string; dress: boolean; cheeks?: string };

export const RODION: Look = { height: 1.83, skin: '#e2b999', hair: '#2b1d14', long: false, top: '#15171b', bottom: '#15171b', shoes: '#0b0b0c', dress: false };
export const LIDA: Look = { height: 1.55, skin: '#f0caae', hair: '#5b3a25', long: true, top: '#efe2d3', bottom: '#efe2d3', shoes: '#d9c4ae', dress: true, cheeks: '#f3a3a3' };

export type Person = {
  root: THREE.Group;
  /** Blend the pose towards a target (called every frame). */
  pose(target: Partial<Pose>, dt: number): void;
  /** The ring box in his hands, opened 0..1. */
  ring?: { group: THREE.Group; open(k: number): void };
  /** Where to look (world space), or null to look ahead. */
  look?(target: THREE.Vector3 | null): void;
  /** The head's position in the world (for framing and for the other's gaze). */
  head?(out: THREE.Vector3): THREE.Vector3;
  dispose(): void;
};

function placeholder(look: Look, withRing: boolean): Person {
  const root = new THREE.Group(), s = look.height / 1.8, own: { dispose(): void }[] = [];
  const mat = (color: string, o: Partial<THREE.MeshPhysicalMaterialParameters> = {}) => { const m = new THREE.MeshPhysicalMaterial({ color, roughness: .7, ...o }); own.push(m); return m; };
  const skin = mat(look.skin, { roughness: .55, sheen: .4, sheenColor: new THREE.Color('#ffd9c4') }), hair = mat(look.hair, { roughness: .45, sheen: 1, sheenColor: new THREE.Color('#a57a55') });
  const top = mat(look.top, { roughness: look.dress ? .5 : .62, sheen: look.dress ? .8 : .2, sheenColor: new THREE.Color('#ffffff') }), bottom = mat(look.bottom), shoes = mat(look.shoes, { roughness: .3, clearcoat: .6 });
  const dark = mat('#1a1112', { roughness: .3 }), shirt = mat('#f3f1ec');
  const mesh = (geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => { own.push(geo); const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const pivot = (parent: THREE.Object3D, x: number, y: number, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  const body = pivot(root, 0, 0, 0); body.scale.setScalar(s);
  const hips = pivot(body, 0, .95);
  // Legs: thigh and shin on pivots, so he can go down on one knee.
  const legs = [-1, 1].map(side => {
    const thigh = pivot(hips, side * .1, 0);
    mesh(new THREE.CapsuleGeometry(.075, .34, 4, 12), bottom, thigh, 0, -.22);
    const knee = pivot(thigh, 0, -.45);
    mesh(new THREE.CapsuleGeometry(.065, .34, 4, 12), bottom, knee, 0, -.22);
    const foot = mesh(new THREE.BoxGeometry(.11, .07, .24), shoes, knee, 0, -.46, .05); foot.geometry.translate(0, 0, 0);
    return { thigh, knee };
  });
  if (look.dress) {
    // A long dress over the legs: a soft flared cone from the waist.
    const skirt = mesh(new THREE.CylinderGeometry(.17, .36, .9, 28, 1, true), top, hips, 0, -.4); (skirt.material as THREE.MeshPhysicalMaterial).side = THREE.DoubleSide;
  }
  const torso = pivot(hips, 0, .02);
  mesh(new THREE.CapsuleGeometry(.17, .34, 6, 18), top, torso, 0, .3).scale.set(1.1, 1, .7);
  if (!look.dress) {
    // A white shirt and a dark tie in the jacket's opening.
    mesh(new THREE.BoxGeometry(.12, .3, .02), shirt, torso, 0, .38, .115);
    mesh(new THREE.BoxGeometry(.035, .22, .025), dark, torso, 0, .36, .128);
  }
  const neck = mesh(new THREE.CylinderGeometry(.05, .055, .1, 12), skin, torso, 0, .62);
  void neck;
  const head = pivot(torso, 0, .77);
  mesh(new THREE.SphereGeometry(.12, 28, 20), skin, head).scale.set(.92, 1.06, .96);
  // Hair: a cap over the top and back; long hair falls behind the shoulders.
  mesh(new THREE.SphereGeometry(.128, 28, 16, 0, Math.PI * 2, 0, Math.PI * .55), hair, head, 0, .015, -.008).scale.set(.95, 1.05, 1);
  if (look.long) {
    const fall = mesh(new THREE.CapsuleGeometry(.11, .3, 6, 14), hair, head, 0, -.17, -.07); fall.scale.set(1.2, 1, .55);
    for (const x of [-.1, .1]) mesh(new THREE.CapsuleGeometry(.035, .22, 4, 8), hair, head, x, -.12, .02);
  }
  // A face that smiles: two eyes, brows, a curved mouth.
  for (const x of [-.04, .04]) {
    mesh(new THREE.SphereGeometry(.013, 10, 8), dark, head, x, .02, .108);
    const brow = mesh(new THREE.BoxGeometry(.035, .006, .006), hair, head, x, .055, .108); brow.rotation.z = x > 0 ? -.12 : .12;
  }
  const smile = mesh(new THREE.TorusGeometry(.03, .006, 6, 16, Math.PI), mat('#a4524f', { roughness: .4 }), head, 0, -.035, .107); smile.rotation.z = Math.PI;
  if (look.cheeks) for (const x of [-.065, .065]) { const c = mesh(new THREE.CircleGeometry(.018, 16), mat(look.cheeks, { transparent: true, opacity: .45, roughness: 1 }), head, x, -.02, .1); c.lookAt(head.position.clone().add(new THREE.Vector3(x * 3, 0, 1))); }
  // Arms on shoulder pivots, with an elbow.
  const arms = [-1, 1].map(side => {
    const shoulder = pivot(torso, side * .22, .52);
    mesh(new THREE.CapsuleGeometry(.05, .24, 4, 10), top, shoulder, 0, -.15);
    const elbow = pivot(shoulder, 0, -.3);
    mesh(new THREE.CapsuleGeometry(.045, .22, 4, 10), top, elbow, 0, -.13);
    mesh(new THREE.SphereGeometry(.045, 12, 10), skin, elbow, 0, -.29);
    shoulder.rotation.z = side * .08;
    return { shoulder, elbow, side };
  });

  let ring: Person['ring'];
  if (withRing) {
    // A small red velvet box with a lid that opens onto a ring with a stone that catches the light.
    const group = new THREE.Group(); group.visible = false; body.add(group);
    const velvet = mat('#7d1224', { roughness: .85, sheen: 1, sheenColor: new THREE.Color('#ff6f86') });
    mesh(new THREE.BoxGeometry(.075, .045, .075), velvet, group, 0, 0, 0);
    const hinge = pivot(group, 0, .0225, -.0375); mesh(new THREE.BoxGeometry(.075, .03, .075), velvet, hinge, 0, .015, .0375);
    const gold = mat('#f1c26a', { metalness: 1, roughness: .18 }), stone = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0, transmission: 1, thickness: .02, ior: 2.4, emissive: '#bfe6ff', emissiveIntensity: .6 }); own.push(stone);
    const band = mesh(new THREE.TorusGeometry(.016, .0035, 8, 28), gold, group, 0, .036, 0); band.rotation.x = .25;
    mesh(new THREE.OctahedronGeometry(.008), stone, group, 0, .055, .004);
    ring = { group, open: k => { hinge.rotation.x = -k * 1.9; } };
  }

  const cur: Pose = { kneel: 0, offer: 0, lean: 0, tiptoe: 0, wave: 0, hold: 0, happy: 0 };
  function pose(target: Partial<Pose>, dt: number) {
    for (const k of Object.keys(cur) as (keyof Pose)[]) cur[k] += ((target[k] ?? 0) - cur[k]) * Math.min(1, dt * 2.6);
    const { kneel, offer, lean, tiptoe, wave } = cur;
    // Down on the right knee, left foot forward.
    hips.position.y = .95 - kneel * .43 + tiptoe * .04;
    legs[1].thigh.rotation.x = -kneel * 1.5; legs[1].knee.rotation.x = kneel * 1.55;
    legs[0].thigh.rotation.x = kneel * .05; legs[0].knee.rotation.x = kneel * 1.5;
    torso.rotation.x = lean * .2 + kneel * .05; head.rotation.x = -lean * .1 - kneel * .12;
    // Offering: both forearms forward, the box in his hands.
    for (const a of arms) {
      a.shoulder.rotation.x = -offer * 1.05 - (a.side > 0 ? wave * 2.6 : 0) - lean * .5;
      a.elbow.rotation.x = -offer * .55 - (a.side > 0 ? wave * .4 * (1 + Math.sin(performance.now() / 160)) : 0);
      a.shoulder.rotation.z = a.side * (.08 + lean * .25 - offer * .42);   // hands together round the box
    }
    if (ring) {
      ring.group.visible = offer > .2;
      ring.group.position.set(0, hips.position.y + .5 - kneel * .02, .38 * offer);
    }
  }
  return { root, pose, ring, dispose: () => own.forEach(o => o.dispose()) };
}

/** The materials of his figures, made for the night: skin with a warm sheen, hair cards, cotton, metal, glass. */
function dress(model: THREE.Object3D, own: { dispose(): void }[]) {
  const make = <T extends THREE.Material>(m: T) => { own.push(m); return m; };
  model.traverse(node => {
    const mesh = node as THREE.Mesh; if (!mesh.isMesh) return;
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    const old = mesh.material as THREE.MeshStandardMaterial, name = old.name ?? '';
    const color = old.color?.clone() ?? new THREE.Color('#ffffff');
    let next: THREE.Material | null = null;
    if (name === 'Skin') next = make(new THREE.MeshPhysicalMaterial({
      name, vertexColors: true, roughness: .52, specularIntensity: .45, sheen: .45, sheenColor: new THREE.Color('#ff9f8a'), sheenRoughness: .55,
      emissive: new THREE.Color('#3b1409'), emissiveIntensity: .06, clearcoat: .06, clearcoatRoughness: .5,
    }));
    else if (name === 'Eye') next = make(new THREE.MeshPhysicalMaterial({ name, vertexColors: true, roughness: .12, clearcoat: 1, clearcoatRoughness: .02 }));
    else if (name === 'Hair') next = make(new THREE.MeshPhysicalMaterial({
      name, map: old.map, color: '#ffffff', alphaTest: .42, side: THREE.DoubleSide, roughness: .42, sheen: 1, sheenColor: color.clone().lerp(new THREE.Color('#c9a27e'), .5), sheenRoughness: .35, specularIntensity: .6,
    }));
    else if (/^HairCap/.test(name) || name === 'Brows') next = make(new THREE.MeshStandardMaterial({ name, color, roughness: .6 }));
    else if (name === 'Shirt' || name === 'Pants') next = make(new THREE.MeshPhysicalMaterial({ name, color, roughness: .92, sheen: .7, sheenColor: new THREE.Color('#5b5f66'), sheenRoughness: .7, side: THREE.DoubleSide }));
    else if (name === 'Shoes') next = make(new THREE.MeshPhysicalMaterial({ name, color, roughness: .5, clearcoat: .35, clearcoatRoughness: .4 }));
    else if (name === 'Frame') next = make(new THREE.MeshPhysicalMaterial({ name, color, metalness: old.metalness ?? 0, roughness: old.metalness > .5 ? .28 : .18, clearcoat: old.metalness > .5 ? 0 : 1 }));
    else if (name === 'Lens') next = make(new THREE.MeshPhysicalMaterial({ name, color: '#eef6ff', transparent: true, opacity: .05, roughness: 0, metalness: 0, depthWrite: false, envMapIntensity: .5 }));
    else if (name === 'Print') next = make(new THREE.MeshStandardMaterial({ name, map: old.map, color: '#8c8c8c', transparent: true, roughness: .95, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
    else if (name === 'Scrunchie') next = make(new THREE.MeshPhysicalMaterial({ name, vertexColors: true, roughness: .6, sheen: 1, sheenColor: new THREE.Color('#ffffff') }));
    if (next) { mesh.material = next; old.dispose(); } else own.push(old);
    if (name === 'Lens' || name === 'Print') mesh.castShadow = false;
  });
}

/** A person: his own model (a skinned figure the scene poses), else the stand-in. */
export async function createPerson(loader: GLTFLoader, url: string, look: Look, withRing = false): Promise<Person> {
  let gltf: Awaited<ReturnType<GLTFLoader['loadAsync']>>;
  try { gltf = await loader.loadAsync(url); } catch { return placeholder(look, withRing); }
  const own: { dispose(): void }[] = [];
  const root = new THREE.Group(), model = gltf.scene; root.add(model);
  dress(model, own);
  const bones = new Map<string, THREE.Bone>();
  model.traverse(n => { if ((n as THREE.Bone).isBone) bones.set(n.name.replace(/[^A-Za-z]/g, ''), n as THREE.Bone); });
  const B = (n: string) => bones.get(n);

  // Rest pose: each bone's local rotation, and its orientation in the figure's own space.
  model.updateMatrixWorld(true);
  const rootInv = new THREE.Quaternion(); model.getWorldQuaternion(rootInv).invert();
  const rest = new Map<THREE.Bone, { local: THREE.Quaternion; model: THREE.Quaternion; modelInv: THREE.Quaternion; pos: THREE.Vector3 }>();
  for (const b of bones.values()) {
    const m = rootInv.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion()));
    rest.set(b, { local: b.quaternion.clone(), model: m, modelInv: m.clone().invert(), pos: b.position.clone() });
  }
  /** The direction a bone points at rest, in figure space (from its head to its first child). */
  const restDir = (name: string) => {
    const b = B(name), c = b?.children.find(k => (k as THREE.Bone).isBone);
    if (!b || !c) return new THREE.Vector3(0, -1, 0);
    return c.getWorldPosition(new THREE.Vector3()).sub(b.getWorldPosition(new THREE.Vector3())).applyQuaternion(rootInv).normalize();
  };
  const dirs = Object.fromEntries(['UpperArmL', 'UpperArmR', 'ForearmL', 'ForearmR'].map(n => [n, restDir(n)]));
  const hipsBone = B('Hips'), hipsParent = hipsBone?.parent;
  const q = new THREE.Quaternion(), tmp = new THREE.Quaternion(), e = new THREE.Euler(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  /** Set a bone's rotation as a turn in the figure's rest frame (deltas compose down the chain). */
  function turn(name: string, delta: THREE.Quaternion) {
    const b = B(name); const r = b && rest.get(b); if (!b || !r) return;
    b.quaternion.copy(r.local).multiply(tmp.copy(r.modelInv).multiply(delta).multiply(r.model));
  }
  const euler = (x: number, y = 0, z = 0) => q.setFromEuler(e.set(x, y, z, 'YXZ'));
  const aim = (from: string, to: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(dirs[from], to.clone().normalize());

  const cur: Pose = { kneel: 0, offer: 0, lean: 0, tiptoe: 0, wave: 0, hold: 0, happy: 0 };
  // Which side the other one stands on when they hold each other: she is on his right, he on her left.
  const tall = look.height > 1.7, partnerSide: 'L' | 'R' = tall ? 'R' : 'L';
  let lookAt: THREE.Vector3 | null = null; const lookCur = new THREE.Vector2();
  const s = look.height / 1.8;
  let ring: Person['ring'];
  if (withRing) {
    // A red velvet box with a hinged lid, opening onto a gold band and a stone that catches the candlelight.
    const group = new THREE.Group(); group.visible = false; root.add(group);
    const mat = <T extends THREE.Material>(m: T) => { own.push(m); return m; };
    const geo = <T extends THREE.BufferGeometry>(g: T) => { own.push(g); return g; };
    const velvet = mat(new THREE.MeshPhysicalMaterial({ color: '#6d1024', roughness: .85, sheen: 1, sheenColor: new THREE.Color('#ff6f8e'), sheenRoughness: .4 }));
    const satin = mat(new THREE.MeshPhysicalMaterial({ color: '#efe4cf', roughness: .5, sheen: .8, sheenColor: new THREE.Color('#ffffff') }));
    const gold = mat(new THREE.MeshPhysicalMaterial({ color: '#f2c46e', metalness: 1, roughness: .16 }));
    const stone = mat(new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0, transmission: 1, thickness: .01, ior: 2.4, dispersion: 5, emissive: '#cfe8ff', emissiveIntensity: .7 }));
    const add = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo(g), m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    add(new THREE.BoxGeometry(.062, .036, .058), velvet, group);
    add(new THREE.BoxGeometry(.052, .004, .048), satin, group, 0, .018);
    const hinge = new THREE.Group(); hinge.position.set(0, .018, -.029); group.add(hinge);
    add(new THREE.BoxGeometry(.062, .018, .058), velvet, hinge, 0, .009, .029);
    add(new THREE.BoxGeometry(.052, .003, .048), satin, hinge, 0, .0005, .029);
    const band = add(new THREE.TorusGeometry(.0105, .0022, 10, 32), gold, group, 0, .031, 0); band.rotation.x = .2;
    add(new THREE.OctahedronGeometry(.0048), stone, group, 0, .044, .002);
    ring = { group, open: k => { hinge.rotation.x = -THREE.MathUtils.clamp(k, 0, 1) * 1.95; } };
  }

  function pose(target: Partial<Pose>, dt: number) {
    for (const k of Object.keys(cur) as (keyof Pose)[]) cur[k] += ((target[k] ?? 0) - cur[k]) * Math.min(1, dt * 2.4);
    const { kneel, offer, lean, tiptoe, wave, hold, happy } = cur, t = performance.now() / 1000;
    const breathe = Math.sin(t * 1.7) * .012;

    // Hips down onto one knee (his right), rising a little on tiptoe.
    if (hipsBone && hipsParent) {
      const r = rest.get(hipsBone)!;
      v1.set(0, (-.44 * kneel + .05 * tiptoe) * s, .06 * kneel * s);
      hipsParent.updateMatrixWorld(true);
      const pq = hipsParent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(model.getWorldQuaternion(new THREE.Quaternion()));
      const ps = hipsParent.getWorldScale(new THREE.Vector3()).divide(model.getWorldScale(new THREE.Vector3()));
      hipsBone.position.copy(r.pos).add(v1.applyQuaternion(pq).divide(ps));
    }
    turn('Hips', euler(.05 * kneel));
    turn('Spine', euler(breathe + (tall ? .2 : .04) * lean + .04 * offer - .06 * happy));
    turn('Chest', euler(breathe * .6 + (tall ? .14 : .02) * lean + .05 * offer, 0, 0));
    // Legs: his left foot forward, right knee on the ground.
    turn('ThighL', euler(-1.5 * kneel)); turn('ShinL', euler(1.45 * kneel)); turn('FootL', euler(-.05 * kneel - .5 * tiptoe));
    turn('ThighR', euler(.12 * kneel)); turn('ShinR', euler(1.6 * kneel)); turn('FootR', euler(.95 * kneel - .5 * tiptoe));

    // Arms: each pose says where the upper arm and the forearm point (in the figure's frame, facing +Z);
    // the forearm's own turn is what is left after the upper arm's (the chain composes).
    const W = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1, inner = side === partnerSide;
      const up = W(sx * .1, -1, .03), fore = W(sx * .06, -1, .16);
      const mix = (u: THREE.Vector3, f: THREE.Vector3, k: number) => { if (k > 0) { up.lerp(u, k); fore.lerp(f, k); } };
      mix(W(sx * .28, -.72, .62), W(-sx * .42, .12, .9), offer);                                                  // both hands round the ring box
      if (inner) mix(W(-sx * .45, -.8, -.4), W(-sx * .7, -.12, -.7), hold);                                      // an arm round the other's waist, the hand behind their back
      if (lean && tall) mix(W(sx * .34, -.5, .78), W(-sx * .85, -.05, .5), lean);                              // his arms round her
      if (lean && !tall) mix(W(sx * .25, .3, .9), W(-sx * .75, .35, .55), lean);                                 // hers round his neck
      if (side === 'R' && wave) mix(W(-.55, .8, .1), W(-.2, 1, .15), wave);
      if (happy) mix(W(sx * .45, .85, .15), W(sx * .3, 1, .1), happy);
      const qu = aim('UpperArm' + side, up.normalize());
      turn('UpperArm' + side, qu);
      const swing = side === 'R' && wave ? Math.sin(t * 7) * .45 * wave : 0;
      const qf = new THREE.Quaternion().setFromUnitVectors(dirs['Forearm' + side], fore.normalize());
      if (swing) qf.premultiply(q.setFromAxisAngle(W(0, 0, 1), swing));
      turn('Forearm' + side, qu.clone().invert().multiply(qf));
      turn('Hand' + side, q.identity());
    }

    // Head: follows what it looks at, within a neck's reach; bowed a little when kneeling, raised for the kiss.
    let yaw = 0, pitch = 0;
    if (lookAt) {
      const h = B('Head')!; h.getWorldPosition(v1); v2.copy(lookAt).sub(v1).applyQuaternion(root.getWorldQuaternion(tmp).invert());
      yaw = THREE.MathUtils.clamp(Math.atan2(v2.x, v2.z), -1, 1); pitch = THREE.MathUtils.clamp(-Math.atan2(v2.y, Math.hypot(v2.x, v2.z)), -.6, .6);
    }
    lookCur.x += (yaw - lookCur.x) * Math.min(1, dt * 3); lookCur.y += (pitch - lookCur.y) * Math.min(1, dt * 3);
    turn('Neck', euler(lookCur.y * .4 + (tall ? .18 : -.1) * lean, lookCur.x * .4, 0));
    turn('Head', euler(lookCur.y * .8 + (tall ? .12 : -.18) * lean - .08 * kneel, lookCur.x, (tall ? .2 : -.15) * lean));

    if (ring) {
      ring.group.visible = offer > .25;
      const l = B('HandL'), r = B('HandR');
      if (l && r) {
        root.updateMatrixWorld(true);
        l.getWorldPosition(v1); r.getWorldPosition(v2); v1.add(v2).multiplyScalar(.5);
        root.worldToLocal(v1); ring.group.position.copy(v1).add(v2.set(0, .045, .05));
        ring.group.rotation.set(0, 0, 0);
      }
    }
  }
  return {
    root, ring, pose,
    look(target) { lookAt = target ? target.clone() : null; },
    head(out) { return (B('Head') ?? model).getWorldPosition(out).add(v1.set(0, .08 * s, 0)); },
    dispose() {
      model.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
      own.forEach(o => o.dispose());
    },
  };
}
