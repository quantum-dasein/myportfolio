// Phones get their own GLBs (`*.mobile.glb`). This pass keeps them inside a phone's memory budget: textures at
// most `--max` px (WebP), optional mesh simplification, Draco geometry. It runs on the published files in place.
//
//   node scripts/model-room/slim-mobile.mjs [--max 1024] [--simplify id=ratio,...] [id ...]
//
// Uses @gltf-transform/cli through npx (no project dependency). A mobile GLB that a phone has to decode is
// paid for twice: once in download size, once (much more) in GPU memory, where a 4k JPEG becomes 90 MB.
import { execFileSync } from 'node:child_process';
import { readdirSync, renameSync, rmSync, statSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); if (i < 0) return fallback; const v = args[i + 1]; args.splice(i, 2); return v; };
const max = +opt('--max', 1024);
const simplify = Object.fromEntries((opt('--simplify', '') || '').split(',').filter(Boolean).map(s => s.split('=')).map(([k, v]) => [k, +v]));
const dir = path.resolve('public/models/archive');
const ids = args.length ? args : readdirSync(dir).filter(f => f.endsWith('.mobile.glb')).map(f => f.replace('.mobile.glb', ''));
const tmp = path.resolve('artifacts/slim'); mkdirSync(tmp, { recursive: true });
const cli = (...a) => execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--yes', '@gltf-transform/cli@4.5.1', ...a], { stdio: 'pipe', shell: process.platform === 'win32' });

for (const id of ids) {
  const file = path.join(dir, id + '.mobile.glb'), before = statSync(file).size;
  const a = path.join(tmp, id + '.a.glb'), b = path.join(tmp, id + '.b.glb'), c = path.join(tmp, id + '.c.glb');
  cli('resize', file, a, '--width', String(max), '--height', String(max));
  let src = a;
  if (simplify[id]) { cli('simplify', a, b, '--ratio', String(simplify[id]), '--error', '0.002'); src = b; }
  cli('webp', src, c, '--quality', '82');
  cli('draco', c, file);
  for (const f of [a, b, c]) rmSync(f, { force: true });
  console.log(id.padEnd(24), (before / 1e6).toFixed(2), '->', (statSync(file).size / 1e6).toFixed(2), 'MB', simplify[id] ? `(simplified ${simplify[id]})` : '');
}
