// Usage: node scripts/prepare-kitchen-model.mjs /path/to/kitchen-Modern25.obj
// The source stays outside public/. This is a geometry study with new neutral
// materials: the supplied MTL contains no texture assignments.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Box3, Vector3, MeshStandardMaterial } from 'three';

if (!process.argv[2]) throw new Error('Pass the source OBJ path.');
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(value => { this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.(); }); }
};
const model = new OBJLoader().parse(await readFile(process.argv[2], 'utf8'));
const materials = {
  ceramic: new MeshStandardMaterial({ name: 'Porcelain study', color: '#ddd9cf', roughness: .5 }),
  wood: new MeshStandardMaterial({ name: 'Warm timber study', color: '#927157', roughness: .65 }),
  stone: new MeshStandardMaterial({ name: 'Stone study', color: '#52575a', roughness: .5 }),
  metal: new MeshStandardMaterial({ name: 'Brushed metal study', color: '#777f85', roughness: .3, metalness: .8 }),
  dark: new MeshStandardMaterial({ name: 'Graphite study', color: '#171d22', roughness: .3, metalness: .25 }),
};
let triangles = 0;
model.traverse(mesh => {
  if (!mesh.isMesh) return;
  const old = mesh.geometry;
  // UVs are retained so a later material pass can use the original unwrap.
  mesh.geometry = mergeVertices(old, 1e-5); old.dispose();
  const name = mesh.name;
  mesh.material = /Sink|Tap|Handle|Legs|Ex_ilor/i.test(name) ? materials.metal
    : /Oven|Macrowave|Coock|B_Mask/i.test(name) ? materials.dark
    : /Backplate|TopSheet|Island_Part/i.test(name) ? materials.stone
    : /Island_Sheet|Cabinets0[489]/i.test(name) ? materials.wood : materials.ceramic;
  triangles += mesh.geometry.index.count / 3;
});
const bounds = new Box3().setFromObject(model);
const size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
// Normalise the installation to a six-metre width, grounded and centred.
const scale = 6 / size.x;
model.scale.setScalar(scale);
model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
model.name = 'Kitchen Modern 25 — geometry study';
const glb = await new GLTFExporter().parseAsync(model, { binary: true });
await mkdir('public/models/exhibits', { recursive: true });
await writeFile('public/models/exhibits/kitchen-modern-25.glb', Buffer.from(glb));
console.log(JSON.stringify({ meshes: model.children.length, triangles, bytes: glb.byteLength, size: size.multiplyScalar(scale).toArray(), objects: model.children.map(o => o.name) }, null, 2));
