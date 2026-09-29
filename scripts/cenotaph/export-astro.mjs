// Bakes the site's own astronaut (Observatory suit on its Mixamo rig) into GLBs for Blender:
//   astronaut.glb       the loop's first frame, standing still (used by the fly-in film)
//   astronaut-anim.glb  a seamless loop: he looks up at the vault, points at the constellation,
//                       lowers his arm, looks around, and settles back to the first frame.
// Every rigid suit part becomes its own node with sampled TRS tracks, so Blender needs no rig.
// Needs the dev server: npm run dev, then node scripts/cenotaph/export-astro.mjs [outDir]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const outDir = process.argv[2] || '.';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=d3d11'] });
const p = await b.newPage();
p.on('console', m => { if (m.type() === 'error' || m.type() === 'log') console.log('page', m.type(), m.text().slice(0, 300)); });
await p.goto('http://localhost:4337/', { waitUntil: 'domcontentloaded', timeout: 180000 });
const out = await p.evaluate(async () => {
  const { createAstronaut } = await import('/src/scripts/observatory-astronaut.ts');
  const { GLTFExporter } = await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js');
  const a = createAstronaut();
  await a.load();
  if (a.root.userData.astronautRig !== 'mixamo') throw new Error('rig ' + a.root.userData.astronautRig);
  const root = a.root, Group = root.constructor;
  let THREE = null;
  root.traverse(o => { if (!THREE && o.isMesh) THREE = { Mesh: o.constructor, Matrix4: o.matrixWorld.constructor, Vector3: o.position.constructor, Quaternion: o.quaternion.constructor }; });
  const bone = name => { let f = null; root.traverse(o => { if (!f && o.name.replace(/^mixamorig[:_]?/, '') === name) f = o; }); return f; };
  const RArm = bone('RightArm'), RFore = bone('RightForeArm'), Spine = bone('Spine1');

  // Choreography, in seconds. Smooth envelopes that start and end at rest, so the loop closes.
  const FPS = 24, T = 10, N = T * FPS;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const env = (t, a, b, c, d) => ss(a, b, t) * (1 - ss(c, d, t));
  const choreo = t => {
    const up = env(t, 0.9, 2.5, 6.6, 8.0);                  // looks up at the address
    const point = env(t, 1.7, 3.1, 6.2, 7.6);               // and points at it
    const around = env(t, 7.4, 8.4, 8.8, 9.9);              // then glances across the vault
    return {
      pitch: -.95 * up - .45 * around,
      yaw: .28 * up - .42 * around,
      point, t,
    };
  };
  const rest = new Map();
  const pose = t => {
    const c = choreo(t);
    a.animate(t, 0, 0, 1 / FPS, 0, { pitch: c.pitch, yaw: c.yaw });
    if (c.point > 1e-3) {
      // Right arm up and a little forward, forearm straight: pointing at the stars.
      const q = new THREE.Quaternion();
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -2.35 * c.point); RArm.quaternion.multiply(q);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), .55 * c.point); RArm.quaternion.multiply(q);
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), .25 * c.point); RFore.quaternion.multiply(q);
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -.08 * c.point); Spine.quaternion.multiply(q);
    }
    root.updateMatrixWorld(true);
  };

  // Rigid parts, geometry kept in each part's own space.
  const parts = [];
  const visible = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  root.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && visible(o)) parts.push(o); });
  const inv = new THREE.Matrix4();
  const local = o => { inv.copy(root.matrixWorld).invert(); return inv.clone().multiply(o.matrixWorld); };

  // Settle the idle and the head damping with one silent pass, then record the loop.
  for (let i = 0; i < N; i++) pose(i / FPS);
  const frames = [];
  for (let i = 0; i <= N; i++) { pose(i / FPS); frames.push(parts.map(local)); }

  const build = animated => {
    const scene = new Group(); const tracks = [];
    parts.forEach((o, k) => {
      const mat = o.material.clone(); mat.onBeforeCompile = () => {};
      if (o.material.metalness > .8 && o.material.roughness < .1) mat.color.set('#0a1016');
      const m = new o.constructor(o.geometry.clone(), mat); m.name = 'part' + k;
      frames[0][k].decompose(m.position, m.quaternion, m.scale); scene.add(m);
      if (!animated) return;
      const times = [], P = [], Q = [], S = [];
      frames.forEach((f, i) => {
        const pos = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
        f[k].decompose(pos, q, s); times.push(i / FPS); P.push(pos.x, pos.y, pos.z); Q.push(q.x, q.y, q.z, q.w); S.push(s.x, s.y, s.z);
      });
      tracks.push({ name: m.name, times, P, Q, S });
    });
    return { scene, tracks };
  };
  const b64 = buf => { const bytes = new Uint8Array(buf); let s = ''; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(s); };
  // Animation classes from the same three instance the exporter uses, via a clip the loader builds.
  const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const sample = (await new GLTFLoader().loadAsync('/models/observatory/curator-motion-v1.glb')).animations[0];
  const kinds = {}; sample.tracks.forEach(tr => { kinds[tr.ValueTypeName] = tr.constructor; });
  const three = { AnimationClip: sample.constructor, VectorKeyframeTrack: kinds.vector, QuaternionKeyframeTrack: kinds.quaternion };
  const exporter = new GLTFExporter();
  const still = build(false);
  const stillGlb = await exporter.parseAsync(still.scene, { binary: true });
  const anim = build(true);
  const clip = new three.AnimationClip('loop', T, anim.tracks.flatMap(t => [
    new three.VectorKeyframeTrack(`${t.name}.position`, t.times, t.P),
    new three.QuaternionKeyframeTrack(`${t.name}.quaternion`, t.times, t.Q),
    new three.VectorKeyframeTrack(`${t.name}.scale`, t.times, t.S),
  ]));
  const animGlb = await exporter.parseAsync(anim.scene, { binary: true, animations: [clip] });
  return { still: b64(stillGlb), anim: b64(animGlb), parts: parts.length };
});
writeFileSync(`${outDir}/astronaut.glb`, Buffer.from(out.still, 'base64'));
writeFileSync(`${outDir}/astronaut-anim.glb`, Buffer.from(out.anim, 'base64'));
console.log('saved', out.parts, 'parts');
await b.close();
