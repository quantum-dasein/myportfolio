// Bakes the site's own astronaut (Observatory suit on its rig, idle pose) into a static GLB for Blender.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=d3d11'] });
const p = await b.newPage();
p.on('console', m => console.log('page', m.type(), m.text().slice(0, 300)));
await p.goto('http://localhost:4337/', { waitUntil: 'domcontentloaded', timeout: 180000 });
const b64 = await p.evaluate(async () => {
  const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => null);
  const { createAstronaut } = await import('/src/scripts/observatory-astronaut.ts');
  const { GLTFExporter } = await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js');
  const a = createAstronaut();
  await a.load();
  if (a.root.userData.astronautRig !== 'mixamo') throw new Error('rig ' + a.root.userData.astronautRig);
  for (let i = 0; i < 90; i++) a.animate(i * .016, 0, 0, .016, 0, {});
  a.root.updateMatrixWorld(true);
  const T = a.root.constructor; // THREE.Group from the same module instance
  const out = new T();
  const visible = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  a.root.traverse(o => {
    if (!o.isMesh || !visible(o) || o.isSkinnedMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const src = o.material, M = src.constructor;
    const mat = src.clone(); mat.onBeforeCompile = () => {};
    if (src.name === '' && src.metalness > .8 && src.roughness < .1) { mat.color.set('#0a1016'); }
    const m = new o.constructor(g, mat); m.name = o.name || 'part'; out.add(m);
  });
  const glb = await new GLTFExporter().parseAsync(out, { binary: true });
  const bytes = new Uint8Array(glb); let s = ''; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(s);
});
writeFileSync('astronaut.glb', Buffer.from(b64, 'base64'));
console.log('saved', Buffer.from(b64, 'base64').length);
await b.close();
