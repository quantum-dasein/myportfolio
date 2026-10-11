// The lounge's surfaces, made in the browser. The set came without its textures (they never made it into the
// archive) and read as flat grey: the rug is wool now (tufts you can see, a pattern of contour lines in the
// room's greens, a cream border), the coffee table is honed marble, the tray walnut, the books linen and
// leather, the magazine printed, the sculpture glazed ceramic. Every texture is drawn once on a canvas and
// mapped by a flat projection of its piece, so nothing depends on the source file's UVs.
import * as THREE from 'three';

type Own = <T extends { dispose(): void }>(x: T) => T;

/** Flat UVs from above (the piece's own x/z extent, 0..1): for rugs, tops, covers. */
function planarUV(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const b = geometry.boundingBox!, pos = geometry.attributes.position, uv = new Float32Array(pos.count * 2);
  const sx = Math.max(1e-6, b.max.x - b.min.x), sz = Math.max(1e-6, b.max.z - b.min.z);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = (pos.getX(i) - b.min.x) / sx; uv[i * 2 + 1] = (pos.getZ(i) - b.min.z) / sz; }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// Value noise, tileable at `period`.
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x: number, y: number, period = 1e9) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, w = (a: number) => ((a % period) + period) % period;
  const a = hash(w(ix), w(iy)), b = hash(w(ix + 1), w(iy)), c = hash(w(ix), w(iy + 1)), d = hash(w(ix + 1), w(iy + 1));
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const fbm = (x: number, y: number, octaves = 4) => { let v = 0, amp = .5, f = 1; for (let o = 0; o < octaves; o++) { v += noise(x * f, y * f) * amp; f *= 2; amp *= .5; } return v; };

/** Colour and height drawn per pixel into a colour map and a normal map made from the height. The textures exist
 *  at once (a flat first colour) and are painted a few rows per frame, so the room never waits on them. */
function paint(size: number, pixel: (u: number, v: number) => { rgb: [number, number, number]; h: number }, strength: number, own: Own) {
  const color = new Uint8Array(size * size * 4), height = new Float32Array(size * size), normal = new Uint8Array(size * size * 4);
  const first = pixel(.5, .5).rgb;
  for (let i = 0; i < size * size; i++) { color.set([first[0], first[1], first[2], 255], i * 4); normal.set([128, 128, 255, 255], i * 4); }
  const tex = (data: Uint8Array, srgb: boolean) => {
    const t = own(new THREE.DataTexture(data, size, size)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
  };
  const map = tex(color, true), normalMap = tex(normal, false);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  let row = 0;
  const step = () => {
    const end = Math.min(size, row + 24);
    for (let y = row; y < end; y++) for (let x = 0; x < size; x++) {
      const p = pixel(x / size, y / size), i = y * size + x;
      color[i * 4] = p.rgb[0]; color[i * 4 + 1] = p.rgb[1]; color[i * 4 + 2] = p.rgb[2]; height[i] = p.h;
    }
    row = end;
    if (row < size) { requestAnimationFrame(step); return; }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
      normal[i] = (-dx / l * .5 + .5) * 255; normal[i + 1] = (-dy / l * .5 + .5) * 255; normal[i + 2] = (1 / l * .5 + .5) * 255;
    }
    map.needsUpdate = true; normalMap.needsUpdate = true;
  };
  requestAnimationFrame(step);
  return { map, normalMap };
}
const mix = (a: number[], b: number[], k: number): [number, number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** A hand-tufted wool rug: contour lines in the room's greens on a deep green-grey field, a cream border. */
function rug(own: Own, mobile: boolean) {
  const field = hex('#2f3d37'), line = hex('#7c968a'), mint = hex('#9fd3b7'), border = hex('#cbbfa6'), edge = hex('#1d2622');
  return paint(mobile ? 384 : 512, (u, v) => {
    const tuft = noise(u * 420, v * 420) * .6 + noise(u * 170, v * 170) * .4;
    const m = Math.min(u, v, 1 - u, 1 - v);
    if (m < .05) { const k = m < .008 ? .55 : m > .042 && m < .047 ? .2 : 1; return { rgb: mix(edge, border, k * (.86 + .14 * tuft)), h: tuft * .9 + (m < .008 ? -.4 : 0) }; }
    // Contours of a soft landscape: two lines in ten are mint, as if a path ran through it.
    const f = fbm(u * 2.2 + 3.1, v * 2.2 + 1.7, 4) * 9 + Math.sin(u * 3.2) * .6;
    const d = Math.abs(f - Math.round(f)), lineK = 1 - Math.min(1, d / .035), accent = Math.round(f) % 5 === 0;
    const base = mix(field, line, lineK * .75);
    const rgb = accent && lineK > 0 ? mix(base, mint, lineK * .6) : base;
    const shade = .8 + .3 * tuft;
    return { rgb: [rgb[0] * shade, rgb[1] * shade, rgb[2] * shade], h: tuft - lineK * .35 };
  }, 2.2, own);
}

/** Honed white marble with soft grey veins. */
function marble(own: Own, mobile: boolean) {
  const white = hex('#b9b4ab'), vein = hex('#6f6b65');   // honed, a little grey: it sits right under the planter's lamp
  return paint(mobile ? 256 : 512, (u, v) => {
    const t = fbm(u * 3, v * 3, 5), w = Math.abs(Math.sin((u * 2.5 + v * 1.2 + t * 2.4) * Math.PI)), veins = Math.pow(1 - w, 9) * .85 + Math.pow(1 - w, 40) * .4;
    const cloud = fbm(u * 8, v * 8, 3) * .08;
    return { rgb: mix(white, vein, Math.min(1, veins + cloud)), h: -veins * .1 };
  }, 1, own);
}

/** Walnut: straight grain with a little figure. */
function walnut(own: Own) {
  const light = hex('#6a4a33'), dark = hex('#2e1d13');
  return paint(256, (u, v) => {
    const g = Math.sin((v * 60 + fbm(u * 3, v * 9, 3) * 9) * Math.PI) * .5 + .5, fine = noise(u * 400, v * 30);
    return { rgb: mix(dark, light, g * .7 + fine * .3), h: g * .3 + fine * .2 };
  }, 1.4, own);
}

/** Linen book cloth, with a title pressed into it. */
function linen(own: Own, tone: string, title: string) {
  const base = hex(tone);
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d')!;
  x.fillStyle = '#000'; x.fillRect(0, 0, 512, 512); x.fillStyle = '#fff'; x.font = '600 34px ui-monospace, monospace'; x.textAlign = 'center';
  x.save(); x.translate(256, 256); x.fillText(title, 0, -10); x.font = '400 18px ui-monospace, monospace'; x.fillText('RODION BELOUSOV', 0, 30); x.restore();
  const press = x.getImageData(0, 0, 512, 512).data;
  return paint(256, (u, v) => {
    const weave = (Math.sin(u * 512 * Math.PI * .5) * Math.sin(v * 512 * Math.PI * .5)) * .5 + .5, slub = noise(u * 90, v * 600) * .4;
    const p = press[(Math.floor(v * 512) * 512 + Math.floor(u * 512)) * 4] / 255;
    const k = .78 + .2 * weave + .1 * slub;
    return { rgb: [base[0] * k + p * 40, base[1] * k + p * 36, base[2] * k + p * 26], h: weave * .4 + slub * .3 - p * .8 };
  }, 1.6, own);
}

/** A printed magazine cover: a photograph of a model under a soft light, a masthead, a line of type. */
function cover(own: Own) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#d9d4c9'); g.addColorStop(1, '#a9a196'); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  const glow = x.createRadialGradient(270, 300, 10, 270, 300, 220); glow.addColorStop(0, '#f6efe2'); glow.addColorStop(1, 'rgba(246,239,226,0)'); x.fillStyle = glow; x.fillRect(0, 0, 512, 512);
  x.fillStyle = '#2b2622'; x.beginPath(); x.ellipse(270, 330, 70, 110, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#4b433b'; x.beginPath(); x.ellipse(250, 300, 34, 60, -.3, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#16130f'; x.font = '700 92px Georgia, serif'; x.textAlign = 'center'; x.fillText('FORM', 256, 104);
  x.font = '500 18px ui-monospace, monospace'; x.fillText('ISSUE 07 · OBJECTS & ROOMS', 256, 140);
  x.font = 'italic 26px Georgia, serif'; x.fillText('Built by hand, edge by edge', 256, 470);
  const t = own(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/** Dress one lounge mesh (by its source material name). Returns true if it was handled here. */
export function dressLounge(mesh: THREE.Mesh, own: Own, mobile: boolean): boolean {
  const name = (mesh.material as THREE.Material).name;
  const physical = (p: THREE.MeshPhysicalMaterialParameters) => own(new THREE.MeshPhysicalMaterial({ name, ...p }));
  if (name === 'Material #7160') {
    planarUV(mesh.geometry); const t = rug(own, mobile);
    mesh.material = physical({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(.7, .7), roughness: .97, sheen: .7, sheenColor: new THREE.Color('#c9d8cf'), sheenRoughness: .8 });
    mesh.receiveShadow = true; return true;
  }
  if (name === 'Material #7022') {
    planarUV(mesh.geometry); const t = marble(own, mobile);
    mesh.material = physical({ map: t.map, normalMap: t.normalMap, roughness: .45, clearcoat: .35, clearcoatRoughness: .3, envMapIntensity: .8 }); return true;
  }
  if (name === 'CI_Decor_B') { planarUV(mesh.geometry); const t = walnut(own); mesh.material = physical({ map: t.map, normalMap: t.normalMap, roughness: .45, clearcoat: .7, clearcoatRoughness: .2 }); return true; }
  if (name === 'Elliot_Decor_C') { planarUV(mesh.geometry); const t = linen(own, '#3b4a44', 'THE MODEL ROOM'); mesh.material = physical({ map: t.map, normalMap: t.normalMap, roughness: .9, sheen: .4, sheenColor: new THREE.Color('#9fb3a8') }); return true; }
  if (name === 'CI_Decor_J_02') { planarUV(mesh.geometry); const t = linen(own, '#7a5136', 'OBJECTS'); mesh.material = physical({ map: t.map, normalMap: t.normalMap, roughness: .7, clearcoat: .15 }); return true; }
  if (name === 'Decanter_Magazine_C') { planarUV(mesh.geometry); mesh.material = physical({ map: cover(own), roughness: .55, clearcoat: .35, clearcoatRoughness: .3 }); return true; }
  if (name === 'Decanter_Magazine_Side') { mesh.material = physical({ color: '#efeae0', roughness: .85 }); return true; }
  if (name === 'Elliot_Decor_B') { mesh.material = physical({ color: '#dfeee8', roughness: .06, metalness: 0, transparent: true, opacity: .28, depthWrite: false, envMapIntensity: 1.6 }); mesh.renderOrder = 2; return true; }
  if (name === 'CI_Decor_F') { mesh.material = physical({ color: '#d9d2c5', roughness: .48, clearcoat: .55, clearcoatRoughness: .25, sheen: .3, sheenColor: new THREE.Color('#ffffff') }); return true; }
  if (name === 'CI_Decor_F_Base') { planarUV(mesh.geometry); const t = marble(own, true); mesh.material = physical({ map: t.map, color: '#cfc5b4', roughness: .6 }); return true; }
  if (name === 'CI_Decor_L_Wood') { planarUV(mesh.geometry); const t = walnut(own); mesh.material = physical({ map: t.map, normalMap: t.normalMap, roughness: .5 }); return true; }
  return false;
}
