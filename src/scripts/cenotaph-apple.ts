// Newton's apples: a turned apple with a painted skin, and just enough physics for the cenotaph,
// the arena floor, the podium drums, the sarcophagus, the eight colossal steps and the astronaut.
import * as THREE from 'three';

const R = .11;                        // a generous apple, readable across the arena
const ARENA = 36;

/** Skin: a red blush over yellow-green, streaks running pole to pole, fine lenticels. */
function skin() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  const base = g.createLinearGradient(0, 0, 0, 256);
  base.addColorStop(0, '#6f8a2a'); base.addColorStop(.18, '#b3261c'); base.addColorStop(.55, '#c7301f'); base.addColorStop(.85, '#8f1a14'); base.addColorStop(1, '#a5a33a');
  g.fillStyle = base; g.fillRect(0, 0, 512, 256);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) {
    const x = rnd() * 512, w = 1 + rnd() * 5;
    g.fillStyle = rnd() < .5 ? `rgba(255,190,90,${.05 + rnd() * .12})` : `rgba(90,8,8,${.06 + rnd() * .14})`;
    g.fillRect(x, 20 + rnd() * 40, w, 150 + rnd() * 60);
  }
  const blush = g.createRadialGradient(360, 120, 10, 360, 120, 170);
  blush.addColorStop(0, 'rgba(230,200,70,.45)'); blush.addColorStop(1, 'rgba(230,200,70,0)');
  g.fillStyle = blush; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,236,170,${.25 + rnd() * .35})`; g.beginPath(); g.arc(rnd() * 512, 30 + rnd() * 200, .6 + rnd() * .9, 0, 6.283); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

let shared: { body: THREE.LatheGeometry; mat: THREE.MeshPhysicalMaterial; stem: THREE.TubeGeometry; stemMat: THREE.MeshStandardMaterial; leaf: THREE.ShapeGeometry; leafMat: THREE.MeshStandardMaterial } | null = null;
function parts() {
  if (shared) return shared;
  // Profile of a real apple: a dimple at the stem, broad shoulders, a narrower base with its own dimple.
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48, a = t * Math.PI;
    let r = Math.sin(a) * (1 + .12 * Math.sin(a * 2 - .6)) * (1 - .1 * t);
    let y = -Math.cos(a) * .93;
    if (t < .12) { y += (.12 - t) * .9; r *= .9; }          // calyx dimple
    if (t > .9) { y -= (t - .9) * 1.6; }                      // stem cavity
    pts.push(new THREE.Vector2(Math.max(0, r) * R, y * R));
  }
  const body = new THREE.LatheGeometry(pts, 48);
  // Five soft lobes round the base, as on most apples.
  const p = body.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), low = THREE.MathUtils.smoothstep(-y / R, .1, .9);
    const k = 1 + .045 * Math.cos(a * 5) * low;
    p.setXYZ(i, x * k, y, z * k);
  }
  body.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({ map: skin(), roughness: .38, clearcoat: .7, clearcoatRoughness: .25, sheen: .3, sheenColor: new THREE.Color('#ffcf9a') });
  const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, R * .75, 0), new THREE.Vector3(.004, R * 1.15, .002), new THREE.Vector3(.014, R * 1.45, 0)]);
  const stem = new THREE.TubeGeometry(stemCurve, 8, .0035, 6);
  const stemMat = new THREE.MeshStandardMaterial({ color: '#4a2e17', roughness: .9 });
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(.018, .012, .05, 0); shape.quadraticCurveTo(.018, -.012, 0, 0);
  const leaf = new THREE.ShapeGeometry(shape, 8);
  const leafMat = new THREE.MeshStandardMaterial({ color: '#3f7f2c', roughness: .6, side: THREE.DoubleSide });
  return (shared = { body, mat, stem, stemMat, leaf, leafMat });
}

export function appleMesh() {
  const s = parts(), g = new THREE.Group();
  const body = new THREE.Mesh(s.body, s.mat); body.castShadow = true; g.add(body);
  g.add(new THREE.Mesh(s.stem, s.stemMat));
  const leaf = new THREE.Mesh(s.leaf, s.leafMat); leaf.position.set(.008, R * 1.3, 0); leaf.rotation.set(.3, .4, .5); g.add(leaf);
  return g;
}

/** Height of the stone under a point (three coordinates, the cenotaph centred on the origin). */
export function groundAt(x: number, z: number) {
  const r = Math.hypot(x, z);
  if (Math.abs(x) < 1.3 && Math.abs(z) < 2.8) return 3.63;             // lid
  if (Math.abs(x) < 1.1 && Math.abs(z) < 2.6) return 3.35;             // sarcophagus
  if (r < 7.6) return 1.65; if (r < 9.2) return 1.1; if (r < 11) return .55;
  if (r < ARENA) return 0;
  if (Math.abs(x) < 3.5 && z > 0) return 0;                            // the trench to the tunnel
  const k = Math.min(7, Math.floor((r - ARENA) / 2.5));
  return 1.5 * (k + 1);
}

type Body = { m: THREE.Group; v: THREE.Vector3; w: THREE.Vector3; rest: number; hits: number };
export class Orchard {
  apples: Body[] = [];
  constructor(private scene: THREE.Scene, private fig: () => THREE.Vector3, private onHit: (kind: 'helmet' | 'stone', speed: number) => void) {}
  add(at: THREE.Vector3, v: THREE.Vector3) {
    const m = appleMesh(); m.position.copy(at); m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    this.scene.add(m);
    this.apples.push({ m, v: v.clone(), w: new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(6), rest: 0, hits: 0 });
    if (this.apples.length > 24) { const old = this.apples.shift()!; this.scene.remove(old.m); }
  }
  step(dt: number) {
    const h = Math.min(dt, 1 / 30), sub = 3;
    for (let s = 0; s < sub; s++) for (const a of this.apples) this.integrate(a, h / sub);
  }
  private integrate(a: Body, dt: number) {
    if (a.rest > 1.5) return;
    const p = a.m.position, prev = p.clone();
    a.v.y -= 9.81 * dt;
    p.addScaledVector(a.v, dt);
    // The astronaut: a helmet and a body, both round enough.
    const f = this.fig();
    for (const [c, rad] of [[f.clone().add(new THREE.Vector3(0, 1.72, 0)), .2], [f.clone().add(new THREE.Vector3(0, 1.15, 0)), .28], [f.clone().add(new THREE.Vector3(0, .55, 0)), .22]] as [THREE.Vector3, number][]) {
      const d = p.clone().sub(c), dist = d.length();
      if (dist < rad + R && a.v.dot(d) < 0) {
        const n = d.divideScalar(dist), speed = -a.v.dot(n);
        a.v.addScaledVector(n, 1.55 * speed); a.v.x += (Math.random() - .5) * .6; a.v.z += (Math.random() - .5) * .6;
        p.copy(c).addScaledVector(n, rad + R); a.hits++; this.onHit(rad === .2 ? 'helmet' : 'stone', speed);
      }
    }
    // Stone: tops of steps and drums bounce; risers push back the way the apple came.
    const g = groundAt(p.x, p.z);
    if (p.y - R < g) {
      const gPrev = groundAt(prev.x, prev.z);
      if (prev.y - R >= g - .02 || gPrev >= g) {
        const speed = -a.v.y;
        p.y = g + R;
        if (speed > .8) { a.v.y = speed * .42; a.v.x *= .82; a.v.z *= .82; this.onHit('stone', speed); }
        else { a.v.y = 0; const damp = Math.pow(.35, dt); a.v.x *= damp; a.v.z *= damp; }
        // Rolling: spin follows the ground speed.
        a.w.set(a.v.z / R, a.w.y * .98, -a.v.x / R);
      } else {
        // A riser: which way is out? Radial for drums and steps, the box face for the tomb.
        let n: THREE.Vector3;
        if (Math.abs(p.x) < 1.35 && Math.abs(p.z) < 2.85) n = Math.abs(p.x) / 1.3 > Math.abs(p.z) / 2.8 ? new THREE.Vector3(Math.sign(p.x), 0, 0) : new THREE.Vector3(0, 0, Math.sign(p.z));
        else { n = new THREE.Vector3(p.x, 0, p.z).normalize(); if (g > gPrev && Math.hypot(p.x, p.z) > Math.hypot(prev.x, prev.z)) n.negate(); }
        const vn = a.v.dot(n); if (vn < 0) a.v.addScaledVector(n, -1.5 * vn);
        p.x = prev.x; p.z = prev.z; this.onHit('stone', Math.abs(vn));
      }
    }
    // The inside of the sphere.
    const c = new THREE.Vector3(0, 60, 0), d = p.clone().sub(c), L = d.length();
    if (L > 73.4) { const n = d.divideScalar(L); const vn = a.v.dot(n); if (vn > 0) a.v.addScaledVector(n, -1.5 * vn); p.copy(c).addScaledVector(n, 73.4); }
    a.m.rotation.x += a.w.x * dt; a.m.rotation.y += a.w.y * dt; a.m.rotation.z += a.w.z * dt;
    a.rest = a.v.lengthSq() < .0004 && p.y - R <= groundAt(p.x, p.z) + .001 ? a.rest + dt : 0;
  }
}
