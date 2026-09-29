import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** The exhibition architecture and finishes are kept out of the movement controller. */
export function createModelRoomDesign(scene: THREE.Scene, mobile: boolean) {
  let disposed = false;
  const extraTextures: THREE.Texture[] = [];
  const standard = (color: string, roughness = .6, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const glow = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(r, g, b) });
  const warm = glow(3.2, 2.3, 1.5), jade = glow(1.35, 2.5, 2.15);
  const bronze = standard('#766350', .33, .8), charcoal = standard('#192222', .74), limestone = standard('#88887e', .83);
  const ceramic = new THREE.MeshPhysicalMaterial({ color: '#e7e3d9', roughness: .3, metalness: .03, clearcoat: .25 });
  const metal = standard('#a9b6b8', .23, .92), graphite = standard('#111719', .23, .45);

  function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, rounded = 0) {
    const geometry = rounded ? new RoundedBoxGeometry(w, h, d, 3, rounded) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, mat);mesh.position.set(x, y, z);mesh.receiveShadow = true;scene.add(mesh);return mesh;
  }
  // Deterministic stone grain: no noise is regenerated during rendering.
  const canvas = document.createElement('canvas');canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;let seed = 83;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0;return seed / 4294967296; };
  const pixels = ctx.createImageData(512, 512);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const v = 105 + random() * 22;pixels.data.set([v, v + 3, v + 2, 255], i);
  }
  ctx.putImageData(pixels, 0, 0);ctx.strokeStyle = '#4b5654';ctx.lineWidth = 1;
  ctx.strokeRect(.5, .5, 511, 511);
  const floorMap = new THREE.CanvasTexture(canvas);floorMap.colorSpace = THREE.SRGBColorSpace;
  floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;floorMap.repeat.set(6, 8);
  const floor = new THREE.MeshStandardMaterial({ color: '#7e8987', map: floorMap, roughness: .38, metalness: .24, bumpMap: floorMap, bumpScale: .007 });
  box(18, .2, 24, 0, -.14, 1, floor);
  box(18, 6.5, .25, 0, 3.2, -7.6, charcoal);
  box(.25, 6.5, 24, -9, 3.2, 1, charcoal);box(.25, 6.5, 24, 9, 3.2, 1, charcoal);
  box(18, 6.5, .25, 0, 3.2, 12, charcoal);box(18, .18, 24, 0, 6.45, 1, charcoal);

  // Layered stone niche, shadow reveals, and a bronze surround behind the installation.
  box(10.6, 5.1, .2, 0, 2.72, -7.36, bronze, .08);
  box(10.38, 4.94, .16, 0, 2.72, -7.2, limestone, .07);
  for (const x of [-5.12, 5.12]) box(.025, 4.65, .028, x, 2.76, -7.08, warm);
  box(10.25, .025, .028, 0, 5.08, -7.08, warm);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 17; i++) box(.085, 5.2, .19, side * (5.7 + i * .18), 2.72, -7.25, bronze, .018);
    box(.035, .03, 18, side * 8.82, .18, 1, jade);
    // Tapered light slots down the side walls give the room depth when walking.
    for (const z of [-4, 1, 6, 10]) {
      box(.16, 4.8, .14, side * 8.82, 2.5, z, bronze, .025);
      box(.022, 4.55, .025, side * 8.71, 2.5, z, warm);
    }
  }
  const base = standard('#424c48', .54, .08);
  box(8.6, .11, 4.7, 0, .015, -3.5, graphite, .05);
  box(8.38, .035, 4.48, 0, .07, -3.5, jade, .015);
  box(8.6, .075, 4.7, 0, .125, -3.5, base, .03);

  // Suspended elliptical light, with a dark carrier and a luminous inner edge.
  for (const [radius, tube, y, mat] of [[4.6, .085, 5.85, bronze], [4.48, .033, 5.8, warm]] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 96), mat);
    ring.rotation.x = Math.PI / 2;ring.scale.y = .74;ring.position.set(0, y, -2);scene.add(ring);
  }
  for (const x of [-3.25, 3.25]) for (const z of [-4.4, .4]) box(.012, .58, .012, x, 6.15, z, bronze);
  for (const z of [-5.6, -1, 5]) {
    box(10, .12, .16, 0, 6.27, z, bronze);box(9.8, .016, .09, 0, 6.2, z, warm);
  }

  function lettering(text: string, subtitle: string, x: number, y: number, z: number, width: number, rotation = 0) {
    const c = document.createElement('canvas');c.width = 1024;c.height = 256;
    const context = c.getContext('2d')!;context.clearRect(0, 0, 1024, 256);
    context.textAlign = 'center';context.fillStyle = '#d6ddd2';context.font = '500 74px sans-serif';context.fillText(text, 512, 112);
    context.fillStyle = '#a5b6ac';context.font = '24px monospace';context.fillText(subtitle, 512, 178);
    const texture = new THREE.CanvasTexture(c);texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
    mesh.position.set(x, y, z);mesh.rotation.y = rotation;scene.add(mesh);return mesh;
  }
  lettering('WHITE / WOOD', '01     FORM, MATERIAL & LIGHT', 0, 4.24, -7.08, 5.3);
  lettering('THE MATERIAL LIBRARY', 'OAK     /     STONE     /     METAL', 7, 2.65, -3.7, 2.8, -.25);
  lettering('THE OBSERVATORY', 'THROUGH THE FRAME, INTO THE OBJECT', -6.9, 2.7, -4.8, 2.8, .28);

  // Material studies are part of the installation, not additional portfolio works.
  box(2.55, .08, 1.1, 6.7, 1.08, -2.8, bronze, .035);
  box(.08, 1.04, .9, 5.6, .5, -2.8, graphite);box(.08, 1.04, .9, 7.8, .5, -2.8, graphite);
  const swatches: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.29, 32, 20), [ceramic, limestone, metal][i]);
    ball.position.set(5.95 + i * .75, 1.42, -2.8);ball.castShadow = true;scene.add(ball);swatches.push(ball);
    box(.56, .035, .56, ball.position.x, 1.135, -2.8, graphite, .015);
  }
  // A quiet bench and plinth plaque balance the material library.
  box(1.2, .13, 3.1, -6.5, .57, -2.3, bronze, .055);
  box(.9, .47, .18, -6.5, .235, -3.45, graphite);box(.9, .47, .18, -6.5, .235, -1.15, graphite);
  const plaque = box(1.05, .025, .32, -3.25, .19, -1.36, bronze, .01);plaque.rotation.x = -.16;
  const plate = lettering('KITCHEN MODERN 25', 'EXHIBIT 001', -3.25, .21, -1.34, .94);plate.rotation.x = -Math.PI / 2 + .16;

  // The return portal is built into the rear wall. Its light ties both spaces together.
  box(3.5, 4.35, .13, 0, 2.18, 11.74, bronze, .09);
  box(3.25, 4.13, .15, 0, 2.18, 11.61, jade, .08);
  box(3.09, 4, .17, 0, 2.16, 11.49, graphite, .07);
  lettering('THE ARCHIVE', 'RETURN THROUGH THE FRAME', 0, 2.75, 11.38, 2.65, Math.PI);
  const exit = new THREE.PointLight('#95d6c2', 18, 9, 2);exit.position.set(0, 2.5, 10.5);scene.add(exit);

  const key = new THREE.DirectionalLight('#ffe7c5', 2.5);key.position.set(-3.5, 7, 3);
  key.castShadow = true;key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .1, far: 23 });
  key.shadow.normalBias = .022;key.shadow.bias = -.00015;key.shadow.radius = 3;
  key.target.position.set(0, 1.4, -3.5);scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#bfdae0', 1.05);fill.position.set(5, 3.5, 2);scene.add(fill);
  const top = new THREE.PointLight('#ffdab0', 38, 13, 2);top.position.set(0, 5.5, -2);scene.add(top);
  const wallWash = new THREE.PointLight('#bdd8c5', 11, 11, 2);wallWash.position.set(0, 4.6, -6.5);scene.add(wallWash);
  scene.add(new THREE.HemisphereLight('#c5d1d0', '#26261e', .65));

  async function dressModel(model: THREE.Group) {
    const loader = new THREE.TextureLoader();
    const result = await Promise.allSettled(['oak','marble','stone'].map(name => loader.loadAsync(`/models/exhibits/textures/${name}.webp`)));
    const maps = result.map(item => item.status === 'fulfilled' ? item.value : null);
    if (disposed) { maps.forEach(map => map?.dispose());return; }
    maps.forEach(map => { if (!map) return;map.colorSpace = THREE.SRGBColorSpace;map.wrapS = map.wrapT = THREE.RepeatWrapping;map.anisotropy = mobile ? 2 : 8;extraTextures.push(map); });
    const oak = new THREE.MeshStandardMaterial({ color: '#c4b49d', map: maps[0], roughness: .5 });
    const marble = new THREE.MeshPhysicalMaterial({ color: '#e5e7e1', map: maps[1], roughness: .3, clearcoat: .24 });
    const stone = new THREE.MeshStandardMaterial({ color: '#60676a', map: maps[2], roughness: .38 });
    const old = new Set<THREE.Material>();
    model.traverse(node => {
      const mesh = node as THREE.Mesh;if (!mesh.isMesh) return;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(mat => old.add(mat));
      mesh.material = /Cabinets0[48]|Island_Sheet/.test(mesh.name) ? oak
        : /Island_Part/.test(mesh.name) ? marble
        : /TopSheet|Backplate/.test(mesh.name) ? stone
        : /Sink|Tap|Handle|Legs|Ex_ilor/.test(mesh.name) ? metal
        : /Oven|Macrowave|Coock|B_Mask/.test(mesh.name) ? graphite : ceramic;
    });
    old.forEach(mat => mat.dispose());swatches[0].material = oak;swatches[1].material = marble;
  }
  return { dressModel, dispose: () => { disposed = true;extraTextures.forEach(texture => texture.dispose()); } };
}
