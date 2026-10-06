// Avaturn's clothing can carry eight bone influences per vertex (JOINTS_1/WEIGHTS_1); three.js skins with four
// and would drop the second set, leaving weights that no longer add up to one (the cloth tears when posed).
// This keeps each vertex's four strongest influences, renormalised, in JOINTS_0/WEIGHTS_0 and removes the rest.
//   node scripts/proposal/avaturn-influences.mjs in.glb out.glb
import fs from 'fs';
const [src, out] = process.argv.slice(2);
const b = fs.readFileSync(src), jlen = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + jlen).toString().trim());
const bin = b.slice(20 + jlen + 8);
const view = a => { const acc = j.accessors[a], bv = j.bufferViews[acc.bufferView]; return { acc, off: (bv.byteOffset || 0) + (acc.byteOffset || 0), st: bv.byteStride || 0 }; };
let fixed = 0;
for (const m of j.meshes) for (const p of m.primitives) {
  const A = p.attributes; if (A.JOINTS_1 === undefined) continue;
  const J0 = view(A.JOINTS_0), J1 = view(A.JOINTS_1), W0 = view(A.WEIGHTS_0), W1 = view(A.WEIGHTS_1);
  if (J0.acc.componentType !== 5121 || W0.acc.componentType !== 5126) throw new Error('unexpected types');
  const at = (v, size, i) => v.off + i * (v.st || size);
  for (let i = 0; i < J0.acc.count; i++) {
    const inf = [], j0 = at(J0, 4, i), j1 = at(J1, 4, i), w0 = at(W0, 16, i), w1 = at(W1, 16, i);
    for (let k = 0; k < 4; k++) inf.push([bin[j0 + k], bin.readFloatLE(w0 + k * 4)], [bin[j1 + k], bin.readFloatLE(w1 + k * 4)]);
    inf.sort((x, y) => y[1] - x[1]); const top = inf.slice(0, 4), sum = top.reduce((s, x) => s + x[1], 0) || 1;
    top.forEach(([jt, w], k) => { bin[j0 + k] = jt; bin.writeFloatLE(w / sum, w0 + k * 4); });
  }
  delete A.JOINTS_1; delete A.WEIGHTS_1; fixed++;
}
let js = Buffer.from(JSON.stringify(j)); const pad = (4 - js.length % 4) % 4; js = Buffer.concat([js, Buffer.alloc(pad, 0x20)]);
const head = Buffer.alloc(20); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8); head.writeUInt32LE(js.length, 12); head.writeUInt32LE(0x4E4F534A, 16);
const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004E4942, 4);
fs.writeFileSync(out, Buffer.concat([head, js, bh, bin])); console.log('primitives fixed:', fixed);
