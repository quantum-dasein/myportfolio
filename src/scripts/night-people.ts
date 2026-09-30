// The two people in the night scene. Until Rodion's own models of the two of them arrive, each is a simple
// stylised figure (in the spirit of the astronaut): a jointed body that can stand, kneel on one knee, hold
// out a ring box, turn and lean in for a kiss, always smiling.
//
// Real models replace them without code changes: put `rodion.glb` / `lida.glb` in public/models/night/
// (metres, feet at the origin, facing +Z). Animation clips named `idle`, `kneel` and `kiss`, if present,
// are played for those moments; without them the model is posed by moving it as a whole.
import * as THREE from 'three';
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type Pose = { kneel: number; offer: number; lean: number; tiptoe: number; wave: number };
type Look = { height: number; skin: string; hair: string; long: boolean; top: string; bottom: string; shoes: string; dress: boolean; cheeks?: string };

export const RODION: Look = { height: 1.82, skin: '#e2b999', hair: '#2b1d14', long: false, top: '#15171b', bottom: '#15171b', shoes: '#0b0b0c', dress: false };
export const LIDA: Look = { height: 1.66, skin: '#f0caae', hair: '#5b3a25', long: true, top: '#efe2d3', bottom: '#efe2d3', shoes: '#d9c4ae', dress: true, cheeks: '#f3a3a3' };

export type Person = {
  root: THREE.Group;
  /** Blend the pose towards a target (called every frame). */
  pose(target: Partial<Pose>, dt: number): void;
  /** The ring box in his hands (placeholder only), opened 0..1. */
  ring?: { group: THREE.Group; open(k: number): void };
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

  const cur: Pose = { kneel: 0, offer: 0, lean: 0, tiptoe: 0, wave: 0 };
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

/** A person: his own model if it is there, else the stand-in. */
export async function createPerson(loader: GLTFLoader, url: string, look: Look, withRing = false): Promise<Person> {
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok || !/model|octet/.test(head.headers.get('content-type') ?? '')) throw new Error('none');
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene, root = new THREE.Group(); root.add(model);
    const box = new THREE.Box3().setFromObject(model), h = box.max.y - box.min.y;
    if (h > .1) { model.scale.multiplyScalar(look.height / h); model.position.y -= box.min.y * look.height / h; }
    model.traverse(n => { if ((n as THREE.Mesh).isMesh) n.castShadow = true; });
    const mixer = gltf.animations.length ? new THREE.AnimationMixer(model) : null;
    const clip = (name: string) => gltf.animations.find(a => a.name.toLowerCase().includes(name));
    let playing = '';
    const stand = placeholder(look, withRing);   // only for the ring box, if he has none of his own
    if (withRing && stand.ring) { root.add(stand.ring.group); }
    return {
      root, ring: stand.ring,
      pose(target, dt) {
        const want = (target.kneel ?? 0) > .5 ? 'kneel' : (target.lean ?? 0) > .5 ? 'kiss' : 'idle';
        if (mixer) {
          if (want !== playing && clip(want)) { mixer.stopAllAction(); mixer.clipAction(clip(want)!).reset().fadeIn(.4).play(); playing = want; }
          mixer.update(dt);
        } else model.position.y += (-(target.kneel ?? 0) * .4 - model.position.y) * Math.min(1, dt * 2.6);
        if (stand.ring) { stand.ring.group.visible = (target.offer ?? 0) > .2; stand.ring.group.position.set(0, .95, .38); }
      },
      dispose() { stand.dispose(); },
    };
  } catch {
    return placeholder(look, withRing);
  }
}
