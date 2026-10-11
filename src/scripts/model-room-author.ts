// The author in his own room. Rodion, life size (the avatar he made of himself in Avaturn), stands at a
// sculptor's stand by the entrance and builds a piece edge by edge: it rises in its own materials out of a
// line of light that runs up it while his tool works at it; when it stands he steps back and tells you what
// it is made of. He is the room's host and its archive: he notices you, greets you, talks (in short lines
// with his hands), opens his archive of models for you, and whatever you choose there he builds twice: full
// size on the stage, and small, by hand, on his own wheel. He is also the way to commission a model.
//
// He moves procedurally on his own skeleton (a Mixamo-style rig in a T-pose): two-bone IK for the arms
// (the tool hand follows the build line) and for the legs (the feet stay planted, and he steps when he
// turns), a breathing, swaying spine, and a head that looks at what matters. His avatar has no blendshapes,
// so his face (blinks, speech, a smile) is morphed from landmarks at load: see buildFace.
import * as THREE from 'three';
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ExhibitInfo } from './model-room-exhibits';
import { ROOM } from './model-room-layout';
import { buildPiece, PIECE_BINS, type PieceData, type PiecePart } from './model-room-piece';
import { modelArchive } from '../data/model-archive';
import { archiveFacts } from '../data/model-archive-facts';

/** A line in both languages; `v` names its recording (public/audio/rodion/<lang>/<v>.mp3), `say` is how it is
 *  spoken where that differs from how it is written (numbers in words, "3D"). */
type Lang = { en: string; de: string; v?: string; say?: { en: string; de: string } };
const L = (en: string, de: string, v?: string, say?: { en: string; de: string }): Lang => ({ en, de, v, say });

// Numbers as he says them: whole numbers in words; above ten thousand, rounded to the thousand ("about").
const ONES_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS_EN = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function wordsEn(n: number): string {
  if (n < 20) return ONES_EN[n];
  if (n < 100) return TENS_EN[Math.floor(n / 10)] + (n % 10 ? '-' + ONES_EN[n % 10] : '');
  if (n < 1000) return ONES_EN[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + wordsEn(n % 100) : '');
  return wordsEn(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? (n % 1000 < 100 ? ' and ' : ' ') + wordsEn(n % 1000) : '');
}
const ONES_DE = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS_DE = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
function wordsDe(n: number, alone = true): string {
  if (n === 1) return alone ? 'eins' : 'ein';
  if (n < 20) return ONES_DE[n];
  if (n < 100) return (n % 10 ? (n % 10 === 1 ? 'ein' : ONES_DE[n % 10]) + 'und' : '') + TENS_DE[Math.floor(n / 10)];
  if (n < 1000) return wordsDe(Math.floor(n / 100), false) + 'hundert' + (n % 100 ? wordsDe(n % 100, alone) : '');
  return wordsDe(Math.floor(n / 1000), false) + 'tausend' + (n % 1000 ? wordsDe(n % 1000, alone) : '');
}
const spokenCount = (n: number, de: boolean) => (n > 10000 ? (de ? 'rund ' : 'about ') + (de ? wordsDe(Math.round(n / 1000), false) + 'tausend' : wordsEn(Math.round(n / 1000)) + ' thousand') : de ? wordsDe(n) : wordsEn(n));
/** Archive titles as spoken: the digits of a model number one by one ("oh three"). */
const spokenTitle = (title: string, de: boolean) => title.replace(/\b0(\d)\b/g, (_, d) => (de ? 'null ' + ONES_DE[+d] : 'oh ' + ONES_EN[+d])).replace(/\b(\d{1,2})\b/g, (_, d) => (de ? wordsDe(+d) : wordsEn(+d)));

/** Where he works: just inside the entrance on the left, between the door and the stage, facing the visitor who
 *  steps out of the frame (the first person you see in the room, not a figure in a corner). */
const AT = new THREE.Vector3(-3, 0, 10.9);
const FACE = Math.atan2(0 - AT.x, ROOM.shift + 9.5 - AT.z);
/** He and his stand stand on the platform, not in it. */
const FLOOR = .06;
const HEIGHT = 1.83;
const STAND = .58;          // the stand in front of him
const WHEEL_Y = .965;       // the banding wheel the piece turns on
const PIECE_H = .6;         // the figure he is building

const LINES = {
  hello: [L("Hi, I'm Rodion. Everything in this room I built by hand.", 'Hi, ich bin Rodion. Alles in diesem Raum habe ich von Hand gebaut.', 'hello')],
  barks: [
    L('Every piece here started as a single edge.', 'Jedes Stück hier hat mit einer einzigen Kante angefangen.', 'bark-0'),
    L('Every edge here I place by hand, one at a time.', 'Jede Kante hier setze ich von Hand, eine nach der anderen.', 'bark-1'),
    L('Over a thousand models so far. A few of them stand in this room.', 'Über tausend Modelle bisher. Ein paar stehen in diesem Raum.', 'bark-2'),
    L('Want to see something from my archive? Just ask.', 'Willst du etwas aus meinem Archiv sehen? Frag einfach.', 'bark-3'),
    L('Need a model of your own? Talk to me.', 'Brauchst du ein eigenes Modell? Sprich mich an.', 'bark-4'),
  ],
  ask: L('What can I do for you?', 'Was kann ich für dich tun?', 'ask'),
  archive: L("Pick one. I'll build it for you: big on the stage, small here on my wheel.", 'Such dir eine aus. Ich baue sie dir: groß auf der Bühne, klein hier auf meiner Scheibe.', 'archive'),
  order: [
    L('Tell me what it is: a product, an interior, a figure, a building.', 'Erzähl mir, was es ist: ein Produkt, ein Interieur, eine Figur, ein Gebäude.', 'order-0'),
    L('From photos or drawings, ready for the web, for film or for print.', 'Aus Fotos oder Zeichnungen, fertig fürs Web, für Film oder Druck.', 'order-1'),
  ],
  how: [
    L('First the shape, in big blocks.', 'Erst die Form, in großen Blöcken.', 'how-0'),
    L('Then the edges, one by one, until they hold the light.', 'Dann die Kanten, eine nach der anderen, bis sie das Licht halten.', 'how-1'),
    L('Then materials, light and a camera. Watch.', 'Dann Materialien, Licht und eine Kamera. Schau.', 'how-2'),
  ],
  who: [
    L('Rodion Belousov. 3D artist and developer in Vienna.', 'Rodion Belousov. 3D-Künstler und Entwickler in Wien.', 'who-0',
      { en: 'Rodion Belousov. Three-D artist and developer in Vienna.', de: 'Rodion Belousov. Drei-D-Künstler und Entwickler in Wien.' }),
    L('I build the models, the films and the websites they live in.', 'Ich baue die Modelle, die Filme und die Websites, in denen sie leben.', 'who-1'),
  ],
  // (No line opens on a work's name: spoken first, it lost its start.)
  expect: (title: string, id?: string) => L(`Good choice. ${title} is on its way.`, `Gute Wahl. ${title} ist unterwegs.`, id && `expect-${id}`,
    { en: `Good choice. ${spokenTitle(title, false)} is on its way.`, de: `Gute Wahl. ${spokenTitle(title, true)} ist unterwegs.` }),
  present: (title: string, id?: string) => L(`Here it is: ${title}. And a small one, by hand, here on my wheel.`, `Bitte schön: ${title}. Und eine kleine, von Hand, hier auf meiner Scheibe.`, id && `present-${id}`,
    { en: `Here it is: ${spokenTitle(title, false)}. And a small one, by hand, here on my wheel.`, de: `Bitte schön: ${spokenTitle(title, true)}. Und eine kleine, von Hand, hier auf meiner Scheibe.` }),
  bye: L('See you around.', 'Bis später.', 'bye'),
};
const CHOICES: [key: 'archive' | 'order' | 'how' | 'who', label: Lang][] = [
  ['archive', L('Show me your work', 'Zeig mir deine Arbeiten')],
  ['order', L('I need a 3D model', 'Ich brauche ein 3D-Modell')],
  ['how', L('How do you build them?', 'Wie baust du sie?')],
  ['who', L('Who are you?', 'Wer bist du?')],
];

export const AUTHOR_INFO: ExhibitInfo = {
  id: 'author', no: '000', kind: L('The author', 'Der Autor'), title: 'Rodion Belousov',
  sub: L('3D artist · Vienna', '3D-Künstler · Wien'),
  text: L('He built every piece in this room.\nTalk to him: click him.', 'Er hat jedes Stück in diesem Raum gebaut.\nSprich ihn an: klick ihn an.'),
  focus: new THREE.Vector3(AT.x, 1.4, AT.z), distance: 3.4, elevation: .12,
};

export function createAuthor(o: {
  scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; root: HTMLElement; loader: GLTFLoader;
  mobile: boolean; reduced: boolean; de: () => boolean; coarse: () => boolean;
  /** The archive stage he presents works on. */
  stage: THREE.Vector3;
  /** The buffer the frame is drawn into (shaders are compiled for it). */
  target: () => THREE.WebGLRenderTarget | null;
  /** Materials the post passes draw him with (ambient occlusion's normals): compiled for him too. */
  overrides?: () => THREE.Material[];
  onArchive: () => void; onTalk?: () => void; onSpeak?: () => void;
  /** He greets the visitor (with where he stands, to turn a narrow view towards him). */
  onGreet?: (at: THREE.Vector3) => void;
}) {
  const { scene, camera } = o;
  const own: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => { own.push(x); return x; };
  const lang = () => (o.de() ? 'de' : 'en');

  // ── The workshop: a platform like the other exhibits', the stand, a warm light ─────────────────────────
  const shop = new THREE.Group(); shop.position.copy(AT); shop.rotation.y = FACE; scene.add(shop);
  const stone = keep(new THREE.MeshStandardMaterial({ color: '#141918', roughness: .5, metalness: .2 }));
  const glow = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(.35, 2.1, 1.1), toneMapped: false }));
  const steel = keep(new THREE.MeshStandardMaterial({ color: '#2a2d2f', roughness: .38, metalness: .85 }));
  const wood = keep(new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: .62, metalness: 0 }));
  const disc = new THREE.Mesh(keep(new THREE.CylinderGeometry(1.02, 1.07, FLOOR, 72)), stone); disc.position.set(0, FLOOR / 2, .3); disc.receiveShadow = true; shop.add(disc);
  const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(1.04, .008, 6, 120)), glow); ring.rotation.x = Math.PI / 2; ring.position.set(0, FLOOR + .002, .3); shop.add(ring);
  const stand = new THREE.Group(); stand.position.set(0, FLOOR, STAND); shop.add(stand);
  // A sculptor's plinth: a dark stone column with a line of light at its foot, a wooden top, the turning wheel.
  const column = new THREE.Mesh(keep(new THREE.BoxGeometry(.3, .9, .3)), stone); column.position.y = .45; column.castShadow = column.receiveShadow = true; stand.add(column);
  const foot = new THREE.Mesh(keep(new THREE.BoxGeometry(.34, .03, .34)), steel); foot.position.y = .015; stand.add(foot);
  const footLine = new THREE.Mesh(keep(new THREE.BoxGeometry(.342, .004, .342)), glow); footLine.position.y = .032; stand.add(footLine);
  const top = new THREE.Mesh(keep(new THREE.BoxGeometry(.4, .04, .4)), wood); top.position.y = .92; top.castShadow = top.receiveShadow = true; stand.add(top);
  const wheel = new THREE.Group(); wheel.position.y = WHEEL_Y - .015; stand.add(wheel);
  const plate = new THREE.Mesh(keep(new THREE.CylinderGeometry(.17, .17, .025, 48)), steel); plate.receiveShadow = true; wheel.add(plate);
  const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(.172, .003, 6, 64)), glow); rim.rotation.x = Math.PI / 2; rim.position.y = .013; wheel.add(rim);
  // A soft contact shadow under him and the stand: he stands on the floor, not over it.
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sg = sc.getContext('2d')!;
  const grad = sg.createRadialGradient(64, 64, 6, 64, 64, 62); grad.addColorStop(0, 'rgba(0,0,0,.62)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = grad; sg.fillRect(0, 0, 128, 128);
  const blob = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.3, 1.6)), keep(new THREE.MeshBasicMaterial({ map: keep(new THREE.CanvasTexture(sc)), transparent: true, depthWrite: false })));
  blob.rotation.x = -Math.PI / 2; blob.position.set(0, FLOOR + .004, .25); shop.add(blob);
  // His light: a warm key from above and in front (made now, so the scene's light count never changes later).
  const key = new THREE.SpotLight('#ffe2c2', 0, 11, .55, .85, 1.5);
  shop.updateMatrixWorld(true);
  const wheelAt = shop.localToWorld(new THREE.Vector3(0, 0, STAND));
  key.position.copy(shop.localToWorld(new THREE.Vector3(1.1, 4.7, 3.1))); key.target.position.copy(shop.localToWorld(new THREE.Vector3(0, 1.2, .25))); scene.add(key, key.target);

  // ── The piece he is building: his figure, or the work you chose, rising out of a line of light in its own materials ──
  type Facts = { tris: number; parts: number; materials: number; textures: number; px: number; kinds: Lang[] };
  type Piece = {
    mesh: THREE.Mesh; wire: THREE.LineSegments; groups: { start: number; heights: Float32Array }[];
    heights: Float32Array; tris: number; h: number; radii: Float32Array; materials: THREE.Material[];
    title: string; about?: Lang; facts: Facts; told: boolean; source?: THREE.Object3D; extents: Float32Array;
    /** Whose recordings it has: an archive id, or 'figure'. */
    key: string;
  };
  const RADIUS_BINS = PIECE_BINS, MAX_R = .24;
  let piece: Piece | undefined, figure: Piece | undefined, next: Piece | undefined, chosen = false, asked = 0;
  let built = 0, buildSpeed = 1, phasePiece: 'build' | 'stand' | 'melt' = 'build';
  /** What a piece turns into when its work has left the stage (its textures went with it). */
  const clayMat = keep(new THREE.MeshStandardMaterial({ color: '#cdbca2', roughness: .82, metalness: 0, side: THREE.DoubleSide }));
  const wireMat = keep(new THREE.LineBasicMaterial({ color: new THREE.Color(.45, 2.4, 1.3), transparent: true, opacity: .55, toneMapped: false, depthWrite: false }));
  const holder = new THREE.Group(); holder.position.y = .015; wheel.add(holder);
  const band = new THREE.Mesh(keep(new THREE.TorusGeometry(.2, .0025, 6, 96)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, 2.6, 1.4), toneMapped: false, transparent: true, opacity: .8, depthWrite: false })));
  band.rotation.x = Math.PI / 2; band.visible = false; holder.add(band);
  const KINDS: [keyof THREE.MeshStandardMaterial, Lang][] = [
    ['map', L('colour', 'Farbe')], ['normalMap', L('normals', 'Normalen')], ['roughnessMap', L('roughness', 'Rauheit')],
    ['metalnessMap', L('metal', 'Metall')], ['emissiveMap', L('glow', 'Leuchten')], ['alphaMap', L('cut-outs', 'Ausschnitte')], ['aoMap', L('occlusion', 'Okklusion')],
  ];
  /** A work's material for the wheel: the same colours and maps (shared with the work on the stage), shown from
   *  both sides; glass stays see-through without the cost of real transmission. */
  function copyMaterial(src: THREE.Material): THREE.Material {
    const s = src as THREE.MeshPhysicalMaterial;
    const tex = (t: THREE.Texture | null | undefined) => (t && t.channel === 0 ? t : null);
    if (!s.isMeshStandardMaterial) return new THREE.MeshBasicMaterial({ color: s.color?.clone() ?? new THREE.Color(1, 1, 1), map: tex(s.map), side: THREE.DoubleSide, transparent: s.transparent, opacity: s.opacity, alphaTest: s.alphaTest });
    const m = new THREE.MeshStandardMaterial({
      name: s.name, color: s.color.clone(), map: tex(s.map), normalMap: tex(s.normalMap), roughness: s.roughness, roughnessMap: tex(s.roughnessMap),
      metalness: s.metalness, metalnessMap: tex(s.metalnessMap), emissive: s.emissive.clone(), emissiveMap: tex(s.emissiveMap), emissiveIntensity: s.emissiveIntensity,
      alphaMap: tex(s.alphaMap), alphaTest: s.alphaTest, side: THREE.DoubleSide, envMapIntensity: s.envMapIntensity,
    });
    if (m.normalMap) m.normalScale.copy(s.normalScale);
    if ((s.transmission ?? 0) > 0) { m.transparent = true; m.opacity = .28; m.depthWrite = false; m.roughness = Math.min(m.roughness, .08); }
    else if (s.transparent) { m.transparent = true; m.opacity = s.opacity; m.depthWrite = s.depthWrite; }
    return m;
  }
  /** Any model, as one piece for the wheel (made in a worker: see model-room-piece.ts). Here its meshes are
   *  copied out (each material's triangles as one part, with its place in the model), its materials copied,
   *  and what it is made of counted, for him to tell. */
  function collect(root: THREE.Object3D) {
    root.updateMatrixWorld(true);
    const inverse = (root.parent?.matrixWorld ?? new THREE.Matrix4()).clone().invert(), parts: PiecePart[] = [], sources = new Map<THREE.Material, number>(), textures = new Set<THREE.Texture>();
    let tris = 0, meshes = 0;
    const floats = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined, size: number) => {
      if (!a || a.itemSize < size) return null;
      if ((a as THREE.BufferAttribute).isBufferAttribute && a.array instanceof Float32Array && !a.normalized && a.itemSize === size) return a.array.slice(0, a.count * size);
      const out = new Float32Array(a.count * size);
      for (let i = 0; i < a.count; i++) { out[i * size] = a.getX(i); out[i * size + 1] = a.getY(i); if (size > 2) out[i * size + 2] = a.getZ(i); }
      return out;
    };
    root.traverse(n => {
      const m = n as THREE.Mesh; if (!m.isMesh || !m.visible) return;
      const g = m.geometry, attr = g.attributes.position; if (!attr) return;
      const position = floats(attr, 3)!, normal = floats(g.attributes.normal, 3), uv = floats(g.attributes.uv, 2);
      const matrix = inverse.clone().multiply(m.matrixWorld).elements.slice();
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const all = g.index ? Uint32Array.from(g.index.array) : null, total = all ? all.length : attr.count;
      const ranges = Array.isArray(m.material) && g.groups.length ? g.groups.map(r => ({ start: r.start, count: Math.min(r.count, total - r.start), material: mats[r.materialIndex ?? 0] })) : [{ start: 0, count: total, material: mats[0] }];
      meshes++;
      for (const r of ranges) {
        if (!r.material || r.count < 3) continue;
        if (!sources.has(r.material)) sources.set(r.material, sources.size);
        for (const v of Object.values(r.material)) if (v instanceof THREE.Texture) textures.add(v);
        const index = all ? all.slice(r.start, r.start + r.count) : Uint32Array.from({ length: r.count }, (_, i) => r.start + i);
        parts.push({ position, normal, uv, index, matrix, material: sources.get(r.material)! });
        tris += r.count / 3;
      }
    });
    const used = [...sources.keys()];
    const kinds = KINDS.filter(([k]) => used.some(mat => (mat as unknown as Record<string, unknown>)[k as string] instanceof THREE.Texture)).map(([, label]) => label);
    let px = 0; for (const t of textures) { const img = t.image as { width?: number; height?: number } | undefined; px = Math.max(px, img?.width ?? 0, img?.height ?? 0); }
    return { parts, materials: used.map(copyMaterial), facts: { tris: Math.round(tris), parts: meshes, materials: used.length, textures: textures.size, px, kinds } as Facts };
  }
  let worker: Worker | undefined, jobs = 0;
  const waiting = new Map<number, (data: PieceData | null) => void>();
  function build(parts: PiecePart[]): Promise<PieceData | null> {
    if (typeof Worker !== 'undefined' && !worker) {
      try {
        worker = new Worker(new URL('./model-room-piece.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (e: MessageEvent<{ id: number; piece: PieceData | null }>) => { waiting.get(e.data.id)?.(e.data.piece); waiting.delete(e.data.id); };
        worker.onerror = () => { worker = undefined; };
      } catch { worker = undefined; }
    }
    if (!worker) return Promise.resolve(buildPiece(parts, PIECE_H, MAX_R));
    const id = ++jobs, transfer = new Set<ArrayBuffer>();
    for (const p of parts) for (const a of [p.position, p.normal, p.uv, p.index]) if (a) transfer.add(a.buffer as ArrayBuffer);
    return new Promise(resolve => { waiting.set(id, resolve); worker!.postMessage({ id, parts, maxH: PIECE_H, maxR: MAX_R }, [...transfer]); });
  }
  function makePiece(d: PieceData, materials: THREE.Material[], facts: Facts, title: string, key: string, about?: Lang, source?: THREE.Object3D): Piece {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(d.position, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(d.normal, 3));
    if (d.uv) geo.setAttribute('uv', new THREE.BufferAttribute(d.uv, 2));
    geo.setIndex(new THREE.BufferAttribute(d.index, 1));
    for (const g of d.groups) geo.addGroup(g.start * 3, 0, g.material);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, d.h / 2, 0), Math.hypot(d.h / 2, MAX_R * 1.5));
    // The wire shares the vertices; its edges run bottom to top over the whole piece.
    const wireGeo = new THREE.BufferGeometry(); wireGeo.setAttribute('position', geo.attributes.position); wireGeo.setIndex(new THREE.BufferAttribute(d.lines, 1)); wireGeo.boundingSphere = geo.boundingSphere;
    const mesh = new THREE.Mesh(geo, materials); mesh.castShadow = true; mesh.receiveShadow = true;
    const wire = new THREE.LineSegments(wireGeo, wireMat); wire.geometry.setDrawRange(0, 0);
    return { mesh, wire, groups: d.groups, heights: d.heights, tris: d.tris, h: d.h, radii: d.radii, materials, title, about, facts, told: false, source, extents: d.extents, key };
  }
  /** Compile a piece's materials for the frame's own buffer before it joins the room (no hitch as it appears). */
  async function warm(p: Piece) {
    const previous = o.renderer.getRenderTarget(); let compiling: Promise<unknown> = Promise.resolve();
    try { o.renderer.setRenderTarget(o.target()); compiling = o.renderer.compileAsync(p.mesh, camera, scene); } finally { o.renderer.setRenderTarget(previous); }
    await compiling.catch(() => {});
  }
  const forget = (p: Piece) => { if (p === figure) return; p.mesh.geometry.dispose(); p.wire.geometry.dispose(); p.materials.forEach(m => m.dispose()); };
  function mount(p: Piece) {
    if (piece && piece !== p) { piece.mesh.removeFromParent(); piece.wire.removeFromParent(); forget(piece); }
    piece = p; holder.add(p.mesh, p.wire); built = 0; phasePiece = 'build';
    // A dense model's wire would be a solid glow at this size: the denser, the fainter.
    wireMat.opacity = .55 * THREE.MathUtils.clamp(60000 / p.tris, .2, 1);
  }
  async function loadPiece() {
    const g = await o.loader.loadAsync('/models/archive/bronze-woman.mobile.glb');
    const { parts, materials, facts } = collect(g.scene);
    g.scene.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
    const data = await build(parts); if (!data || disposed) return;
    const entry = modelArchive.find(e => e.id === 'bronze-woman');
    figure = makePiece(data, materials, facts, entry?.title ?? 'Bronze woman', 'figure', entry?.description);
    await warm(figure);
    if (!piece && !next && !disposed) mount(figure);
  }
  /** Start on another piece: what stands on the wheel goes back into the clay first. */
  function startPiece(p: Piece) {
    if (next && next !== p) forget(next);
    if (p === piece) { next = undefined; if (phasePiece === 'melt') phasePiece = 'build'; return; }
    if (piece && built > 0) { next = p; phasePiece = 'melt'; } else { next = undefined; mount(p); }
  }
  /** Height (above the wheel) of the line being built, and how far from the axis the surface is there. */
  const pieceH = () => piece?.h ?? PIECE_H;
  const lineY = () => (piece ? piece.heights[Math.min(piece.tris - 1, Math.floor(built))] ?? 0 : .3);
  const widthAt = (y: number) => { const k = THREE.MathUtils.clamp(Math.floor(y / pieceH() * RADIUS_BINS), 0, RADIUS_BINS - 1); return piece ? piece.radii[k] : .1; };
  const radiusAt = (y: number) => Math.max(.03, widthAt(y) * .82);
  /** How many of a group's triangles lie below a height (they are in height order). */
  function below(heights: Float32Array, y: number) {
    let lo = 0, hi = heights.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (heights[mid] <= y) lo = mid + 1; else hi = mid; }
    return lo;
  }
  function updatePiece(t: number, dt: number) {
    // The wheel turns while he works, and slowly, to show the piece off, once it stands.
    // The wheel turns while he works; once the piece stands, it comes round to show you its front.
    if (phasePiece === 'stand') {
      const want = Math.atan2(camPos.x - wheelAt.x, camPos.z - wheelAt.z) - shop.rotation.y;
      wheel.rotation.y = lerpAngle(wheel.rotation.y, want, 1 - Math.exp(-dt * 1.2));
    } else wheel.rotation.y += dt * (.22 + (buildSpeed > 1 ? .5 : 0));
    if (!piece) return;
    const n = piece.tris;
    if (phasePiece === 'build') {
      built = Math.min(n, built + dt * n / 22 * buildSpeed);
      if (built >= n) { phasePiece = 'stand'; buildSpeed = 1; }
    } else if (phasePiece === 'melt') {
      built = Math.max(0, built - dt * n / (next ? .8 : 1.4));
      if (built <= 0) { if (next) { const p = next; next = undefined; mount(p); } else phasePiece = 'build'; }
    }
    if (!piece) return;
    const count = Math.floor(built), y = count >= piece.tris ? Infinity : count <= 0 ? -Infinity : piece.heights[count];
    const groups = piece.mesh.geometry.groups;
    piece.groups.forEach((g, k) => { groups[k].count = below(g.heights, y) * 3; });
    const span = Math.min(count, Math.max(600, Math.round(piece.tris * .025)));
    piece.wire.geometry.setDrawRange((count - span) * 6, phasePiece === 'build' ? span * 6 : 0);
    band.visible = phasePiece === 'build' && count > 0;
    // The band hugs the piece's outline at the line's height (an ellipse round that slice).
    const k = THREE.MathUtils.clamp(Math.floor(lineY() / pieceH() * RADIUS_BINS), 0, RADIUS_BINS - 1) * 4, e = piece.extents, pulse = 1 + .03 * Math.sin(t * 8);
    band.position.set((e[k] + e[k + 1]) / 2, lineY(), (e[k + 2] + e[k + 3]) / 2);
    band.scale.set(((e[k + 1] - e[k]) / 2 + .018) / .2 * pulse, ((e[k + 3] - e[k + 2]) / 2 + .018) / .2 * pulse, 1);
  }
  /** What he tells about a piece once it stands: what it is made of, then what it is. (Each line has its own
   *  recording, named after the piece; numbers are written exactly and spoken in words, the big ones rounded.) */
  function techLines(p: Piece): Lang[] {
    const f = p.facts, en = (x: number) => x.toLocaleString('en-US'), de = (x: number) => x.toLocaleString('de-AT');
    const pl = (x: number, one: string, many: string) => (x === 1 ? one : many);
    // (Texture sizes are said the way artists say them: "two K", "three and a half K"; small ones in pixels.)
    const k = Math.round(f.px / 1024 * 2) / 2;
    const kEn = f.px < 1024 ? `${wordsEn(f.px)} pixels` : k % 1 ? `${wordsEn(Math.floor(k))} and a half K` : `${wordsEn(k)} K`;
    const kDe = f.px < 1024 ? `${wordsDe(f.px)} Pixel` : k % 1 ? `${wordsDe(Math.floor(k))}einhalb K` : `${wordsDe(k, false)} K`;
    const cap = (x: string) => x.replace(/(^|[.?!] )([a-zäöü])/g, (_, a, b) => a + b.toUpperCase());
    // (German counts by gender: "in einem Teil", "ein Material", "eine Textur".)
    const deParts = f.parts === 1 ? 'einem Teil' : `${wordsDe(f.parts, false)} Teilen`, deMats = f.materials === 1 ? 'ein Material' : `${wordsDe(f.materials, false)} Materialien`;
    const deTex = f.textures === 1 ? 'Eine Textur' : `${wordsDe(f.textures, false)} Texturen`;
    const v = (n: number) => `tech-${p.key}-${n}`;
    const lines = [L(
      `Done. ${p.title}: ${en(f.tris)} triangles in ${f.parts} ${pl(f.parts, 'part', 'parts')}, ${f.materials} ${pl(f.materials, 'material', 'materials')}.`,
      `Fertig. ${p.title}: ${de(f.tris)} Dreiecke in ${f.parts} ${pl(f.parts, 'Teil', 'Teilen')}, ${f.materials} ${pl(f.materials, 'Material', 'Materialien')}.`,
      v(0), {
        en: cap(`Done. ${spokenTitle(p.title, false)}: ${spokenCount(f.tris, false)} triangles in ${wordsEn(f.parts)} ${pl(f.parts, 'part', 'parts')}, ${wordsEn(f.materials)} ${pl(f.materials, 'material', 'materials')}.`),
        de: cap(`Fertig. ${spokenTitle(p.title, true)}: ${spokenCount(f.tris, true)} Dreiecke in ${deParts}, ${deMats}.`),
      },
    )];
    const kindsEn = f.kinds.map(x => x.en).join(', '), kindsDe = f.kinds.map(x => x.de).join(', ');
    if (f.textures) lines.push(L(
      `${f.textures} ${pl(f.textures, 'texture', 'textures')}${f.px ? `, up to ${en(f.px)} px` : ''}${kindsEn ? `: ${kindsEn}` : ''}.`,
      `${f.textures} ${pl(f.textures, 'Textur', 'Texturen')}${f.px ? `, bis ${de(f.px)} px` : ''}${kindsDe ? `: ${kindsDe}` : ''}.`,
      v(1), {
        en: cap(`${wordsEn(f.textures)} ${pl(f.textures, 'texture', 'textures')}${f.px ? `, up to ${kEn}` : ''}${kindsEn ? `: ${kindsEn}` : ''}.`),
        de: cap(`${deTex}${f.px ? `, bis ${kDe}` : ''}${kindsDe ? `: ${kindsDe}` : ''}.`),
      },
    ));
    else lines.push(L('No textures at all: every colour lives in the materials.', 'Gar keine Texturen: jede Farbe steckt in den Materialien.', v(1)));
    if (p.about) lines.push({ ...p.about, v: v(2) });
    lines.push(L('Want one like it, of your own thing? Ask me.', 'Willst du so eins von deinem eigenen Ding? Frag mich.', 'offer'));
    return lines;
  }
  /** The archive's own count of a work (so every device tells, and his voice says, the same numbers). */
  function knownFacts(id: string | undefined, live: Facts): Facts {
    const known = id ? archiveFacts[id] : undefined; if (!known) return live;
    return { ...known, kinds: known.kinds.map(k => KINDS.find(([, label]) => label.en === k)?.[1] ?? L(k, k)) };
  }

  // ── Him ───────────────────────────────────────────────────────────────────────────────────────────────
  // (He joins the scene only once he is posed and compiled: never a frame of T-pose, never a compile hitch.)
  const body = new THREE.Group(); body.position.copy(AT).setY(FLOOR); body.rotation.y = FACE;
  let rig: ReturnType<typeof makeRig> | undefined;
  /** A raycast target round him (on a layer the camera never draws, so no pass ever sees it). */
  const proxy = new THREE.Mesh(keep(new THREE.CylinderGeometry(.34, .34, 1.9, 12)), keep(new THREE.MeshBasicMaterial({ visible: false })));
  proxy.position.y = .95; proxy.layers.set(5); body.add(proxy);
  const proxyStand = new THREE.Mesh(keep(new THREE.CylinderGeometry(.3, .3, 1.6, 10)), proxy.material); proxyStand.position.set(0, .8 + FLOOR, STAND); proxyStand.layers.set(5); shop.add(proxyStand);

  // His modelling tool: a boxwood stick with a wire loop, held in the right hand and pointed at the work.
  const tool = new THREE.Group(); tool.visible = false; scene.add(tool);
  const stick = new THREE.Mesh(keep(new THREE.CylinderGeometry(.0045, .006, .15, 8)), wood); stick.position.y = .075; tool.add(stick);
  const loop = new THREE.Mesh(keep(new THREE.TorusGeometry(.011, .0012, 6, 20)), steel); loop.position.y = .162; tool.add(loop);

  function makeRig(model: THREE.Object3D) {
    const bones = new Map<string, THREE.Bone>();
    model.traverse(n => { if ((n as THREE.Bone).isBone) bones.set(n.name.replace(/[^A-Za-z0-9]/g, ''), n as THREE.Bone); });
    const B = (n: string) => bones.get(n)!;
    // His height, the top of the body mesh.
    const armature = model.children.find(c => c.getObjectByProperty('isBone', true)) ?? model;
    let topY = 0; model.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh && /body/i.test(m.name)) { m.geometry.computeBoundingBox(); topY = Math.max(topY, m.geometry.boundingBox!.max.y); } });
    if (topY > .5) armature.scale.multiplyScalar(HEIGHT / topY);
    model.updateMatrixWorld(true);
    const inv = model.getWorldQuaternion(new THREE.Quaternion()).invert();
    const rest = new Map<THREE.Bone, { local: THREE.Quaternion; fig: THREE.Quaternion; figInv: THREE.Quaternion; pos: THREE.Vector3 }>();
    for (const b of bones.values()) { const f = inv.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())); rest.set(b, { local: b.quaternion.clone(), fig: f, figInv: f.clone().invert(), pos: b.position.clone() }); }
    const wp = (n: string) => B(n).getWorldPosition(new THREE.Vector3());
    const toFig = (v: THREE.Vector3) => model.worldToLocal(v.clone());
    // Directions and lengths at rest, in his own frame (facing +Z).
    const dir = (a: string, b: string) => toFig(wp(b)).sub(toFig(wp(a))).normalize();
    const len = (a: string, b: string) => wp(a).distanceTo(wp(b));
    const restDir: Record<string, THREE.Vector3> = {}, lengths: Record<string, number> = {};
    for (const [a, b] of [['LeftArm', 'LeftForeArm'], ['LeftForeArm', 'LeftHand'], ['RightArm', 'RightForeArm'], ['RightForeArm', 'RightHand'], ['LeftUpLeg', 'LeftLeg'], ['LeftLeg', 'LeftFoot'], ['RightUpLeg', 'RightLeg'], ['RightLeg', 'RightFoot']]) { restDir[a] = dir(a, b); lengths[a] = len(a, b); }
    const hipsRest = toFig(wp('Hips'));
    const ankleRest = { L: toFig(wp('LeftFoot')), R: toFig(wp('RightFoot')) };
    const headRest = toFig(wp('Head'));
    // The tool, held like a pen: from the palm, past the fingers, tipped towards the palm and the thumb. Placed once
    // at rest and handed to the hand bone, so it moves with the hand and never on its own.
    {
      const h = wp('RightHand'), f = wp('RightHandMiddle1').sub(h).normalize(), th = wp('RightHandThumb1').sub(h);
      th.sub(f.clone().multiplyScalar(th.dot(f))).normalize();
      const palm = new THREE.Vector3().crossVectors(f, th).normalize(); if (palm.y > 0) palm.negate();   // the T-pose palm faces the floor
      const aimTool = f.clone().multiplyScalar(.8).addScaledVector(palm, .42).addScaledVector(th, .3).normalize();
      tool.position.copy(h).addScaledVector(f, .07).addScaledVector(palm, .025);
      tool.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aimTool);
      B('RightHand').attach(tool);
    }
    return { model, armature, B, rest, restDir, lengths, hipsRest, ankleRest, headRest };
  }

  // Pose state: everything eases towards its goal, so every change of mind reads as motion, not a cut.
  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), v2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const bodyQ = new THREE.Quaternion(), bodyQi = new THREE.Quaternion();
  let yaw = FACE, yawGoal = FACE;
  const hand = { L: new THREE.Vector3(), R: new THREE.Vector3() }, handGoal = { L: new THREE.Vector3(), R: new THREE.Vector3() };
  const look = new THREE.Vector3(), lookGoal = new THREE.Vector3();
  const lean = { now: 0, goal: 0 }, crouch = { now: 0, goal: 0 }, speak = { now: 0, goal: 0 };
  type Foot = { at: THREE.Vector3; yaw: number; from: THREE.Vector3; fromYaw: number; to: THREE.Vector3; toYaw: number; k: number };
  let feet: { L: Foot; R: Foot } | undefined, nextFoot: 'L' | 'R' = 'L';
  let mixer: THREE.AnimationMixer | undefined; const captured = new Map<THREE.Bone, THREE.Quaternion>();
  /** The bones the capture moves, and its last pose of them (see pose()). */
  const tracked = new Set<string>(), mixHips = new THREE.Vector3(); let mixed = false;
  let faceTest: [number, number, number] | null = null;
  let nextGlance = 1; const eyeGoal = new THREE.Vector2(), eyeNow = new THREE.Vector2();
  let face: ReturnType<typeof buildFace> | undefined, nextBlink = 2, blinkAt = -1, doubleBlink = false, jawNow = 0, smileNow = 0;
  let placed = false;

  function euler(x: number, y = 0, z = 0) { return q.setFromEuler(e.set(x, y, z, 'YXZ')); }
  /** Set a bone's orientation in his own frame (delta on the rest orientation); `keep` leaves that much of the
   *  motion-captured pose in it (the head keeps a little of its own life while it looks at you). */
  function setFig(name: string, delta: THREE.Quaternion, keep = 0) {
    const R = rig!, b = R.B(name), r = R.rest.get(b); if (!b || !r) return;
    const want = q2.copy(bodyQ).multiply(delta).multiply(r.fig);
    const parent = (b.parent as THREE.Object3D).getWorldQuaternion(new THREE.Quaternion());
    if (keep > 0) want.slerp(parent.clone().multiply(b.quaternion), keep);
    b.quaternion.copy(parent.invert().multiply(want));
  }
  /** Turn a bone from its rest pose (ignoring the capture): for the grip, whose axes are only known at rest. */
  function relRest(name: string, delta: THREE.Quaternion) {
    const R = rig!, b = R.B(name), r = R.rest.get(b); if (!b || !r) return;
    b.quaternion.copy(r.local).multiply(q2.copy(r.figInv).multiply(delta).multiply(r.fig));
  }
  /** Turn a bone on top of the motion-captured pose (or the rest pose, without one), the turn given in his frame. */
  function rel(name: string, delta: THREE.Quaternion) {
    const R = rig!, b = R.B(name), r = R.rest.get(b); if (!b || !r) return;
    b.quaternion.copy(captured.get(b) ?? r.local).multiply(q2.copy(r.figInv).multiply(delta).multiply(r.fig));
  }
  function aim(name: string, worldDir: THREE.Vector3) {
    const R = rig!; v2.copy(worldDir).applyQuaternion(bodyQi).normalize();
    setFig(name, new THREE.Quaternion().setFromUnitVectors(R.restDir[name], v2));
  }
  /** Two-bone IK: aim the upper bone and the lower bone so the chain's end reaches the target, bending towards the pole. */
  function limb(upper: string, lower: string, target: THREE.Vector3, pole: THREE.Vector3) {
    const R = rig!; const S = R.B(upper).getWorldPosition(new THREE.Vector3());
    const a = R.lengths[upper], b = R.lengths[lower];
    const toT = target.clone().sub(S); const d = THREE.MathUtils.clamp(toT.length(), Math.abs(a - b) + .01, (a + b) * .995);
    const dirT = toT.normalize(); const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
    const p = pole.clone().sub(dirT.clone().multiplyScalar(pole.dot(dirT))).normalize();
    const E = S.clone().addScaledVector(dirT, x).addScaledVector(p, h), T = S.clone().addScaledVector(dirT, d);
    aim(upper, E.clone().sub(S));
    aim(lower, T.sub(E));
  }
  const W = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyQuaternion(bodyQ);   // his frame → world direction
  /** Where the right hand goes to show something: towards it, but low and short of a full reach, so the elbow
   *  stays bent and the hand opens out at waist height (a gesture, not a pointing stick). */
  function offer(target: THREE.Vector3, shoulder: THREE.Vector3) {
    const dir = target.clone().sub(shoulder).setY(0);
    const local = dir.applyQuaternion(bodyQi); local.z = Math.max(local.z, .25); local.x = Math.min(local.x, .1);   // (in front of him, on his right)
    return shoulder.clone().add(local.normalize().applyQuaternion(bodyQ).multiplyScalar(.36)).add(W(-.08, -.22, 0));
  }

  // ── What he is doing ─────────────────────────────────────────────────────────────────────────────────
  type Mode = 'work' | 'admire' | 'notice' | 'talk' | 'present' | 'wave' | 'idle' | 'explain';
  let awayFor = 0, onScreen = true, roomAt = -1;
  // How much each arm follows his action (IK) rather than the motion capture.
  const armW = { L: 0, R: 0 }, armGoal = { L: 0, R: 0 };
  let mode: Mode = 'work', modeAt = 0, nextAdmire = 9, greeted = false, lastBark = -99, barks = 0, near = false;
  let presentAt = -99;
  const queue: Lang[] = []; let line: Lang | null = null, lineAt = 0, lineHold = 0, typed = 0, dialog = false, cta = false;

  // ── His words: a glass card by his head, typed as he speaks; in a conversation it carries the choices ─
  const ui = document.createElement('div'); ui.className = 'mr-author'; ui.hidden = true; ui.setAttribute('aria-live', 'polite');
  ui.innerHTML = `<div class="mr-author-card"><span class="mr-author-who"><i></i>RODION</span><button type="button" class="mr-author-x" aria-label="Close">×</button><p class="mr-author-say"></p><div class="mr-author-chips"></div><a class="mr-author-cta" hidden></a></div>`;
  o.root.append(ui);
  const say = ui.querySelector<HTMLElement>('.mr-author-say')!, chips = ui.querySelector<HTMLElement>('.mr-author-chips')!, ctaEl = ui.querySelector<HTMLAnchorElement>('.mr-author-cta')!;
  const xBtn = ui.querySelector<HTMLButtonElement>('.mr-author-x')!;
  const events = new AbortController();
  xBtn.addEventListener('click', () => close(), { signal: events.signal });
  function renderChips() {
    chips.innerHTML = '';
    if (!dialog) return;
    for (const [key, label] of CHOICES) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label[lang()];
      b.addEventListener('click', () => choose(key), { signal: events.signal }); chips.append(b);
    }
    ctaEl.hidden = !cta;
    ctaEl.href = o.de() ? '/de/kontakt/?project=modeling' : '/contact/?project=modeling';
    ctaEl.innerHTML = `<span>${o.de() ? 'Projekt anfragen' : 'Start a project'}</span><svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  addEventListener('rb:langchange', () => { renderChips(); typed = 0; }, { signal: events.signal });
  // ── His voice: his own lines, recorded (synthesised from his voice), from where he stands ─────────────
  // While the site's sound is on, each line he says plays its recording; the card types in step with it and his
  // jaw follows its loudness. Off (or a recording missing), he speaks silently as before.
  const html = document.documentElement;
  const voiceOn = () => html.classList.contains('rb-sound') && !html.classList.contains('rb-calm') && !document.hidden;
  const clips = new Map<string, Promise<AudioBuffer | null>>();
  let actx: AudioContext | null = null, mouth: AnalyserNode | null = null, place3d: PannerNode | null = null;
  const wave = new Float32Array(512);
  function audio() {
    if (!actx) actx = (window as unknown as { __rbAudioContext?: () => AudioContext | null }).__rbAudioContext?.() ?? null;
    if (actx && !mouth) {
      mouth = actx.createAnalyser(); mouth.fftSize = 512;
      place3d = actx.createPanner(); place3d.panningModel = 'equalpower'; place3d.distanceModel = 'inverse'; place3d.refDistance = 2.4; place3d.rolloffFactor = 1.2;
      const level = actx.createGain(); level.gain.value = 1.15;
      mouth.connect(place3d).connect(level).connect(actx.destination);
    }
    return actx;
  }
  function clip(v: string, l = lang()) {
    const key = `${l}/${v}`;
    if (!clips.has(key)) clips.set(key, fetch(`/audio/rodion/${key}.mp3`).then(r => (r.ok ? r.arrayBuffer() : null))
      .then(b => (b && audio() ? audio()!.decodeAudioData(b) : null)).catch(() => null));
    return clips.get(key)!;
  }
  /** The recording now playing, and when it began (on his clock). */
  let voice: { src: AudioBufferSourceNode; at: number; dur: number; line: Lang } | null = null, waitingFor: Lang | null = null;
  function hush() { try { voice?.src.stop(); } catch { /* already ended */ } voice = null; waitingFor = null; }
  function sayAloud(l: Lang) {
    if (!l.v || !voiceOn()) return;
    const c = audio(); if (!c || c.state !== 'running') return;
    waitingFor = l;
    void clip(l.v).then(buf => {
      if (waitingFor !== l || line !== l || !buf || disposed) return;
      const src = c.createBufferSource(); src.buffer = buf; src.connect(mouth!); src.start();
      voice = { src, at: clock, dur: buf.duration, line: l }; waitingFor = null;
      src.onended = () => { if (voice?.src === src) voice = null; };
    });
  }
  function speakLines(lines: Lang[], replace = true) {
    if (replace) { queue.length = 0; line = null; hush(); }
    queue.push(...lines);
    if (voiceOn()) for (const l of lines) if (l.v) void clip(l.v);   // (fetched while the line before is said)
  }
  function choose(key: 'archive' | 'order' | 'how' | 'who') {
    cta = key === 'order'; renderChips(); o.onSpeak?.();
    if (key === 'archive') { speakLines([LINES.archive]); setTimeout(() => { if (dialog) { close(true); o.onArchive(); } }, 1300); }
    else if (key === 'order') speakLines(LINES.order);
    else if (key === 'how') { speakLines(LINES.how); if (phasePiece !== 'build' || built > (piece?.tris ?? 0) * .6) { phasePiece = 'melt'; } buildSpeed = 4.5; }
    else speakLines(LINES.who);
  }
  function open() {
    if (dialog) return;
    dialog = true; greeted = true; cta = false; mode = 'talk'; modeAt = clock; ui.classList.add('is-dialog'); o.root.classList.add('mr-talking'); renderChips();
    speakLines([LINES.ask]); o.onTalk?.();
  }
  function close(quiet = false) {
    if (!dialog) return;
    dialog = false; cta = false; ui.classList.remove('is-dialog'); o.root.classList.remove('mr-talking'); renderChips();
    if (!quiet) speakLines([LINES.bye]);
    mode = building() ? 'work' : 'idle'; modeAt = clock;
  }

  // ── Load ──────────────────────────────────────────────────────────────────────────────────────────────
  let loaded = false, disposed = false, clock = 0;
  /** Is there work on the wheel (or is it standing finished)? */
  const building = () => phasePiece !== 'stand';
  async function load() {
    const url = o.mobile ? '/models/author/rodion.mobile.glb' : '/models/author/rodion.glb';
    const [gltf, idle] = await Promise.all([
      o.loader.loadAsync(url), fetch('/models/author/idle.json').then(r => r.ok ? r.json() : null).catch(() => null), loadPiece().catch(() => {}),
    ]) as [Awaited<ReturnType<GLTFLoader['loadAsync']>>, { duration: number; tracks: { name: string; times: number[]; values: number[] }[] } | null, unknown];
    if (disposed) return;
    const model = gltf.scene; dress(model, o.mobile, keep);
    body.add(model);
    rig = makeRig(model);
    model.traverse(n => { const m = n as THREE.Mesh; if (!face && m.isMesh && /avaturn_body/.test(m.name)) face = buildFace(m); });
    // His motion-captured idle (Avaturn), looped; the arms, the legs' contact and the gaze are layered on it.
    if (idle) {
      const tracks = idle.tracks.map(t => /quaternion$/.test(t.name) ? new THREE.QuaternionKeyframeTrack(t.name, t.times, t.values) : new THREE.VectorKeyframeTrack(t.name, t.times, t.values));
      mixer = new THREE.AnimationMixer(model); mixer.clipAction(new THREE.AnimationClip('idle', idle.duration, tracks)).play();
      for (const t of idle.tracks) if (/quaternion$/.test(t.name)) tracked.add(t.name.slice(0, t.name.lastIndexOf('.')));
    }
    // Soles on the platform: measured on the shoes themselves, at rest.
    { let sole = Infinity; const p = new THREE.Vector3();
      model.updateMatrixWorld(true);
      model.traverse(n => { const m = n as THREE.SkinnedMesh; if (!m.isSkinnedMesh || !/shoes|body/.test(m.name)) return; const pos = m.geometry.attributes.position; for (let i = 0; i < pos.count; i += 3) { m.getVertexPosition(i, p); m.localToWorld(p); sole = Math.min(sole, p.y); } });
      if (Number.isFinite(sole)) body.position.y += FLOOR - sole + .002;
      body.updateMatrixWorld(true); }
    // His textures go up to the GPU one per frame, and his shaders compile in parallel for the frame's own buffer,
    // before he appears: all at once on one frame they were the stutter as he came in.
    const textures = new Set<THREE.Texture>();
    model.traverse(n => { const m = (n as THREE.Mesh).material as THREE.Material | undefined; if (m) for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value); });
    for (const texture of textures) { if (disposed) return; o.renderer.initTexture(texture); await new Promise(r => requestAnimationFrame(r)); }
    // (The room's post buffer only exists once the room is built; compile for that one, not the canvas.)
    while (!o.target() && !disposed) await new Promise(r => requestAnimationFrame(r));
    const previous = o.renderer.getRenderTarget();
    let compiling: Promise<unknown> = Promise.resolve();
    try {
      o.renderer.setRenderTarget(o.target());
      compiling = Promise.all([o.renderer.compileAsync(shop, camera, scene), o.renderer.compileAsync(body, camera, scene)]);
    } finally { o.renderer.setRenderTarget(previous); }
    await compiling.catch(() => {});
    // The post passes draw him once more in their own material (skinned and morphed: its own shader variant).
    // He is not in the room yet, so he can wear it until it is ready (compileAsync waits on what he wears).
    const meshes: THREE.Mesh[] = []; body.traverse(n => { if ((n as THREE.Mesh).isMesh) meshes.push(n as THREE.Mesh); });
    for (const override of o.overrides?.() ?? []) {
      if (disposed) return;
      const own = meshes.map(m => m.material); meshes.forEach(m => { m.material = override; });
      const before = o.renderer.getRenderTarget(); let job: Promise<unknown> = Promise.resolve();
      try { o.renderer.setRenderTarget(o.target()); job = o.renderer.compileAsync(body, camera, scene); } finally { o.renderer.setRenderTarget(before); }
      await job.catch(() => {});
      meshes.forEach((m, i) => { m.material = own[i]; });
    }
    if (disposed) return;
    loaded = true; update(clock, 1 / 60); scene.add(body);
  }

  // ── Every frame ───────────────────────────────────────────────────────────────────────────────────────
  const camPos = new THREE.Vector3(), headW = new THREE.Vector3(), tmp = new THREE.Vector3();
  const stageLook = o.stage.clone().setY(1.2);
  function update(t: number, dt: number) {
    clock = t;
    key.intensity += ((loaded ? 17 : 0) - key.intensity) * Math.min(1, dt * 1.5);
    updatePiece(t, dt);
    if (!loaded || !rig) return;
    camera.getWorldPosition(camPos);
    const dist = Math.hypot(camPos.x - AT.x, camPos.z - AT.z);
    near = dist < 7;
    // Walking away (or turning away from him for a moment) ends the conversation.
    awayFor = dialog && !onScreen ? awayFor + dt : 0;
    if (dialog && (dist > 4.8 || awayFor > 1.2)) close();

    // Moods: greet a visitor who comes close, bark now and then, step back to admire the piece. (Not a word
    // while the room is still opening: he may be loaded before it is.)
    if (roomAt < 0 && o.root.dataset.state === 'ready') roomAt = t;
    const settled = roomAt >= 0 && t - roomAt > 2.4;
    if (settled && !greeted && !dialog && dist < 6.5 && inFront(camPos)) { greeted = true; mode = 'wave'; modeAt = t; speakLines(LINES.hello); lastBark = t; o.onGreet?.(AUTHOR_INFO.focus); }
    if (settled && !dialog && near && greeted && t - lastBark > 16 + (barks % 3) * 4 && barks < 4 && !line && !queue.length) {
      lastBark = t; speakLines([LINES.barks[barks % LINES.barks.length]]); barks++;
      if (mode === 'work') { mode = 'notice'; modeAt = t; }
    }
    // He works while there is work on the wheel; when it stands he steps back from it, and tells you about it
    // (once, when you are there to hear it).
    const rest = () => (building() ? 'work' : 'idle') as Mode;
    if ((mode === 'idle' || mode === 'explain') && building()) { mode = 'work'; modeAt = t; }
    if ((mode === 'work' || mode === 'notice') && !building()) { mode = 'idle'; modeAt = t; }
    if (mode === 'work' && t > nextAdmire && !near) { mode = 'admire'; modeAt = t; }
    if (mode === 'admire' && t - modeAt > 3.2) { mode = rest(); modeAt = t; nextAdmire = t + 9 + Math.random() * 6; }
    if (mode === 'wave' && t - modeAt > 2.6) { mode = dialog ? 'talk' : building() ? 'notice' : 'idle'; modeAt = t; }
    if (mode === 'notice' && t - modeAt > 3.2 && !dialog) { mode = rest(); modeAt = t; }
    if (mode === 'present' && t - presentAt > 4.2) { mode = dialog ? 'talk' : rest(); modeAt = t; }
    if (piece && !piece.told && !building() && settled && near && inFront(camPos) && (mode === 'idle' || mode === 'talk') && !line && !queue.length) {
      piece.told = true; speakLines(techLines(piece), false); lastBark = t;
      if (!dialog) { mode = 'explain'; modeAt = t; }
    }
    if (mode === 'explain' && !line && !queue.length && t - modeAt > 1) { mode = 'idle'; modeAt = t; }

    // Speech: one line at a time, typed out as he says it, then held long enough to read.
    if (!line && queue.length) { line = queue.shift()!; lineAt = t; typed = 0; lineHold = 1.6 + line.en.length / 22; ui.hidden = false; sayAloud(line); }
    // (A recording is given half a second to arrive; the card waits for it, then types in step with it.)
    if (waitingFor && t - lineAt > .5) waitingFor = null;
    if (line) {
      const text = line[lang()], heard = voice?.line === line ? voice : null;
      const chars = heard ? Math.min(text.length, Math.floor((t - heard.at) / Math.max(.4, heard.dur * .9) * text.length))
        : waitingFor === line ? 0 : Math.min(text.length, Math.floor((t - lineAt) * 34));
      if (chars !== typed) { typed = chars; say.textContent = text.slice(0, chars); }
      const typing = chars < text.length;
      speak.goal = heard ? 1 : typing ? 1 : 0;
      const done = heard ? t - heard.at > heard.dur + Math.min(lineHold, 1.4) : waitingFor !== line && !typing && t - lineAt > text.length / 34 + lineHold;
      if (done) { if (heard) voice = null; line = null; if (!dialog && !queue.length) ui.hidden = true; }
    } else speak.goal = 0;
    // The voice comes from his head; you hear it from where you stand.
    if (actx && place3d) {
      rig.B('Head').getWorldPosition(headW); const L3 = actx.listener, now = actx.currentTime;
      place3d.positionX.setTargetAtTime(headW.x, now, .05); place3d.positionY.setTargetAtTime(headW.y, now, .05); place3d.positionZ.setTargetAtTime(headW.z, now, .05);
      if (L3.positionX) {
        const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        L3.positionX.setTargetAtTime(camPos.x, now, .05); L3.positionY.setTargetAtTime(camPos.y, now, .05); L3.positionZ.setTargetAtTime(camPos.z, now, .05);
        L3.forwardX.setTargetAtTime(f.x, now, .05); L3.forwardY.setTargetAtTime(f.y, now, .05); L3.forwardZ.setTargetAtTime(f.z, now, .05);
      }
    }
    if (dialog) ui.hidden = false;

    // Where he faces, what his hands do, what he looks at.
    const toCam = Math.atan2(camPos.x - AT.x, camPos.z - AT.z);
    const toStage = Math.atan2(o.stage.x - AT.x, o.stage.z - AT.z);
    const wheelW = shop.localToWorld(new THREE.Vector3(0, FLOOR + WHEEL_Y, STAND));
    const lineW = wheelW.clone().setY(FLOOR + WHEEL_Y + .015 + lineY());
    bodyQ.setFromAxisAngle(up, yaw); bodyQi.copy(bodyQ).invert();
    const shoulderR = rig.B('RightArm').getWorldPosition(new THREE.Vector3()), shoulderL = rig.B('LeftArm').getWorldPosition(new THREE.Vector3());
    const relaxed = (side: 'L' | 'R') => (side === 'L' ? shoulderL : shoulderR).clone().add(W(side === 'L' ? .06 : -.06, -.56, .06));
    const s = Math.sin, wob = (k: number) => s(t * k) * .5 + s(t * k * 1.7 + 1.3) * .3;
    const working = mode === 'work' || mode === 'notice';
    if (working) {
      // At the stand, working: the tool hand goes round his right side of the piece at the height being built,
      // pressing in and drawing out; the other hand now steadies the piece on his left, now rests on the plinth.
      // He bends to work low and straightens to work high; his eyes are on the tool, now and then on the whole.
      yawGoal = FACE;
      const toHim = new THREE.Vector3(-Math.sin(FACE), 0, -Math.cos(FACE));
      const side = new THREE.Vector3(-toHim.z, 0, toHim.x);   // (his left)
      const around = (angle: number) => toHim.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle));
      const workY = Math.min(lineW.y, shoulderR.y - .12), low = THREE.MathUtils.clamp((workY - wheelW.y) / .45, 0, 1);
      lean.goal = .3 - .16 * low; crouch.goal = .14 * (1 - low);
      const angleR = -.95 + .42 * s(t * .52) + .14 * s(t * 1.37 + 2);
      const press = Math.max(0, s(t * 4.1)) * .022 + Math.max(0, s(t * 1.9 + 1)) * .015;
      handGoal.R.copy(lineW).setY(workY + .035 * s(t * 2.3) + .02 * s(t * 5.3))
        .addScaledVector(around(angleR), widthAt(workY - wheelW.y - .015) + .04 - press);
      // (The left hand's two places, blended by a slow cycle: steadying the piece, resting on the plinth's edge.)
      const steady = THREE.MathUtils.smoothstep(s(t * .37 + .8), -.3, .3);
      const holdY = wheelW.y + .015 + THREE.MathUtils.clamp(lineY() * .55, .04, pieceH() * .5);
      const holdAt = wheelW.clone().setY(holdY).addScaledVector(around(.9 + .2 * s(t * .6)), widthAt(holdY - wheelW.y - .015) + .03);
      const restAt = wheelW.clone().setY(wheelW.y - .02).addScaledVector(around(1.05), .25);
      handGoal.L.copy(restAt).lerp(holdAt, steady).add(v.set(0, .01 * s(t * 1.1), 0));
      lookGoal.copy(handGoal.R).add(v.set(s(t * .7) * .03, .02, 0));
      if (s(t * .29 + 1.5) > .82) lookGoal.copy(wheelW).setY(wheelW.y + pieceH() * .55);
      armGoal.L = 1; armGoal.R = mode === 'notice' ? .35 : 1;
      if (mode === 'notice') { lookGoal.copy(camPos); lean.goal = .12; crouch.goal = 0; }
    } else if (mode === 'admire') {
      // A step back from the stand, a hand at his chin, head on one side.
      yawGoal = FACE; lean.goal = -.04; crouch.goal = 0;
      rig.B('Head').getWorldPosition(headW);
      handGoal.L.copy(headW).add(W(.02, -.14, .1)); handGoal.R.copy(relaxed('R')).add(W(.04, .12, .12));
      lookGoal.copy(wheelW).setY(FLOOR + WHEEL_Y + pieceH() * .6);
      armGoal.L = 1; armGoal.R = 0;
    } else if (mode === 'talk' || mode === 'wave') {
      // Turned to you; while he speaks his hands talk too, and while he listens they rest together.
      yawGoal = clampYaw(toCam); lean.goal = 0; crouch.goal = 0;
      lookGoal.copy(camPos).add(v.set(0, -.05, 0));
      // Listening, his arms are his own (the capture); speaking, his hands come up in front and talk with him.
      const k = speak.now, hipsW = body.localToWorld(rig.hipsRest.clone());
      handGoal.L.copy(hipsW).add(W(.2 + .04 * wob(2.3), .28 + .06 * Math.abs(s(t * 2.9)), .3));
      handGoal.R.copy(hipsW).add(W(-.22 - .06 * wob(2.1), .34 + .1 * Math.abs(s(t * 3.3 + 1)), .32 + .04 * s(t * 1.9)));
      armGoal.L = .55 * k; armGoal.R = .85 * k;
      if (mode === 'wave') { handGoal.R.copy(shoulderR).add(W(-.3, .32 + .02 * s(t * 9), .12)).add(W(.08 * s(t * 9), 0, 0)); armGoal.R = 1; armGoal.L = 0; }
    } else if (mode === 'present') {
      // Turned half to the stage, his arm out to it, an open hand; a look there, then back to you.
      yawGoal = clampYaw(lerpAngle(toCam, toStage, .55)); lean.goal = .02; crouch.goal = 0;
      handGoal.R.copy(offer(stageLook, shoulderR));
      handGoal.L.copy(relaxed('L'));
      armGoal.R = t - presentAt < 3 ? 1 : 0; armGoal.L = 0;
      lookGoal.copy(t - presentAt < 1.8 ? stageLook : camPos);
    }

    if (mode === 'idle' || mode === 'explain') {
      // Done: a step back from the stand, his own arms (the capture), turned between his work and you. Telling you
      // about it, his right hand opens towards the piece and the left talks with him.
      const facing = near && inFront(camPos);
      yawGoal = clampYaw(facing ? lerpAngle(FACE, toCam, mode === 'explain' ? .5 : .65) : FACE); lean.goal = -.02; crouch.goal = 0;
      const topW = wheelW.clone().setY(FLOOR + WHEEL_Y + .015 + pieceH() * .6);
      lookGoal.copy(facing && !(mode === 'explain' && t - lineAt < 1.3) ? camPos : topW);
      armGoal.L = 0; armGoal.R = 0;
      if (mode === 'explain') {
        const hipsW = body.localToWorld(rig.hipsRest.clone()), showing = Boolean(line) && t - lineAt < 2.6;
        handGoal.R.copy(showing ? offer(topW, shoulderR) : hipsW.clone().add(W(-.22 - .06 * wob(2.1), .34 + .1 * Math.abs(s(t * 3.3 + 1)), .32 + .04 * s(t * 1.9))));
        handGoal.L.copy(hipsW).add(W(.2 + .04 * wob(2.3), .28 + .06 * Math.abs(s(t * 2.9)), .3));
        armGoal.R = showing ? .9 : .8 * speak.now; armGoal.L = .5 * speak.now;
      }
    }

    // No hand ever goes into his body: below the chest, a goal behind the front of the torso is brought forward.
    if (mode !== 'admire') for (const g of [handGoal.L, handGoal.R]) {
      const hipsW = body.localToWorld(rig.hipsRest.clone()), rel = g.clone().sub(hipsW).applyQuaternion(bodyQi);
      if (rel.y > -.2 && rel.y < .5 && Math.abs(rel.x) < .26 && rel.z < .2) { rel.z = .2; g.copy(hipsW).add(rel.applyQuaternion(bodyQ)); }
    }

    // Ease everything (the body turns at a person's pace; the hands are quicker than the head).
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);
    const turn = THREE.MathUtils.euclideanModulo(yawGoal - yaw + Math.PI, Math.PI * 2) - Math.PI;
    yaw += THREE.MathUtils.clamp(turn, -dt * 1.9, dt * 1.9) * Math.min(1, Math.abs(turn) * 4);
    if (!placed) { hand.L.copy(handGoal.L); hand.R.copy(handGoal.R); look.copy(lookGoal); placed = true; }
    hand.L.lerp(handGoal.L, ease(mode === 'wave' ? 14 : 6)); hand.R.lerp(handGoal.R, ease(mode === 'wave' ? 14 : working ? 9 : 6));
    look.lerp(lookGoal, ease(4.5));
    armW.L += (armGoal.L - armW.L) * ease(4); armW.R += (armGoal.R - armW.R) * ease(4);
    lean.now += (lean.goal - lean.now) * ease(3); crouch.now += (crouch.goal - crouch.now) * ease(3); speak.now += (speak.goal - speak.now) * ease(5);
    body.rotation.y = yaw; body.updateMatrixWorld(true);
    bodyQ.setFromAxisAngle(up, yaw); bodyQi.copy(bodyQ).invert();
    pose(t, dt);
    tool.visible = building() && (mode === 'work' || mode === 'notice' || mode === 'admire');
    // The face: a blink every few seconds (now and then twice), the jaw with the syllables while he speaks, a
    // smile for a greeting and while he listens to you.
    if (face) {
      if (blinkAt < 0 && t > nextBlink) { blinkAt = t; doubleBlink = Math.random() < .18; }
      let blink = 0;
      if (blinkAt >= 0) {
        const k = t - blinkAt, dur = .17;
        blink = k < .06 ? k / .06 : Math.max(0, 1 - (k - .06) / (dur - .06));
        if (k > dur) { if (doubleBlink) { doubleBlink = false; blinkAt = t + .08; } else { blinkAt = -1; nextBlink = t + 2.2 + Math.random() * 3.8; } }
        if (blinkAt > t) blink = 0;
      }
      let syllables = speak.now * (.25 + .75 * Math.abs(Math.sin(t * 10.5 + Math.sin(t * 3.1) * 2)));
      if (voice && mouth) {
        mouth.getFloatTimeDomainData(wave); let sum = 0; for (let i = 0; i < wave.length; i++) sum += wave[i] * wave[i];
        syllables = THREE.MathUtils.clamp((Math.sqrt(sum / wave.length) - .012) * 7, 0, 1);
      }
      jawNow += (syllables * .55 - jawNow) * ease(18);
      const wantSmile = mode === 'wave' ? .85 : dialog ? .35 + .25 * (1 - speak.now) : mode === 'notice' || mode === 'explain' ? .3 : 0;
      smileNow += (wantSmile - smileNow) * ease(3);
      if (faceTest) face.set(...faceTest); else face.set(blink, jawNow, smileNow);
      // The gaze: small jumps every second or two (now and then back to the middle), a little down while he works.
      if (t > nextGlance) {
        const busy = mode === 'work' || mode === 'notice';
        if (Math.random() < .35) eyeGoal.set(0, 0); else eyeGoal.set((Math.random() - .5) * .0032, (Math.random() - .5) * .0014);
        if (busy) eyeGoal.y -= .0009;
        nextGlance = t + .5 + Math.random() * 2;
      }
      eyeNow.lerp(eyeGoal, 1 - Math.exp(-dt * 30)); face.look(eyeNow.x, eyeNow.y);
    }
  }

  function pose(t: number, dt: number) {
    const R = rig!, s = Math.sin;
    // Breath and weight: the chest rises, the weight drifts from foot to foot.
    // (With the captured idle these come from the capture; the procedural ones are the fallback.)
    const live = mixer ? 0 : 1, breath = (s(t * 1.65) * .5 + .5) * live, sway = s(t * .42) * (mode === 'work' ? .5 : 1) * live;
    // Hips: down a little when he works, shifted over the standing leg, turned a touch with the shoulders.
    // The motion capture first (his own idle: breath, weight, the small life of a standing person), then
    // everything he does on top of it.
    const hipsBone = R.B('Hips'), hipsRest = R.rest.get(hipsBone)!;
    // (The mixer only writes a value that changed since it last wrote it. So every bone goes back to what the
    // capture last made of it, or to rest, before it runs; otherwise, wherever the capture holds still (as at
    // the start of each loop), last frame's pose would be read back as the capture and applied twice: the drop
    // every eight seconds, the arms folding into him.)
    if (mixer) {
      for (const [b, r] of R.rest) b.quaternion.copy(captured.get(b) ?? r.local);
      hipsBone.position.copy(mixed ? mixHips : hipsRest.pos);
      mixer.update(dt);
      for (const b of R.rest.keys()) if (tracked.has(b.name)) (captured.get(b) ?? captured.set(b, new THREE.Quaternion()).get(b)!).copy(b.quaternion);
      mixHips.copy(hipsBone.position); mixed = true;
    }
    const drift = mixer ? mixHips.clone().sub(hipsRest.pos) : new THREE.Vector3();
    const hips = R.hipsRest.clone().add(new THREE.Vector3(mixer ? 0 : sway * .022, -crouch.now * .25 - (mixer ? 0 : Math.abs(sway) * .008), -lean.now * .1));
    hipsBone.position.copy(R.armature.worldToLocal(body.localToWorld(hips.clone()))).add(drift);
    rel('Hips', euler(lean.now * .35, 0, mixer ? 0 : -sway * .035));
    rel('Spine', euler(lean.now * .3 + breath * .012, 0, sway * .02));
    rel('Spine1', euler(lean.now * .25 + breath * .01, speak.now * s(t * 1.3) * .04));
    rel('Spine2', euler(lean.now * .2 - breath * .015, speak.now * s(t * 1.1 + .7) * .05));

    // Head and neck: towards what he looks at, within a neck's reach of where the chest faces.
    R.B('Head').getWorldPosition(v);
    const d = look.clone().sub(v).applyQuaternion(bodyQi);
    let hy = Math.atan2(d.x, d.z), hp = -Math.atan2(d.y, Math.hypot(d.x, d.z));
    hy = THREE.MathUtils.clamp(hy, -1.25, 1.25); hp = THREE.MathUtils.clamp(hp, -.5, .75);
    const nod = speak.now * (s(t * 4.1) * .035 + s(t * 2.3) * .02), tilt = mode === 'admire' ? .16 : speak.now * s(t * .9) * .05;
    setFig('Neck', euler(hp * .45 + lean.now * .1, hy * .45, 0), .35);
    setFig('Head', euler(hp + nod, hy, tilt), .2);

    // Arms: the captured arm where he is not doing anything with it; two-bone IK, blended in by weight, where he
    // is (the tool, the steadying hand, a gesture, pointing, waving). The pole starts from the captured elbow,
    // so blending in never flips an elbow; the IK's own pole keeps elbows down and a little out.
    body.updateMatrixWorld(true);
    for (const side of ['L', 'R'] as const) {
      const w = mixer ? armW[side] : 1; if (w < .01) continue;
      const name = side === 'L' ? 'Left' : 'Right', sx = side === 'L' ? 1 : -1;
      const sh = R.B(`${name}Arm`).getWorldPosition(new THREE.Vector3()), el = R.B(`${name}ForeArm`).getWorldPosition(new THREE.Vector3()), wr = R.B(`${name}Hand`).getWorldPosition(new THREE.Vector3());
      const natPole = el.clone().sub(sh.clone().add(wr).multiplyScalar(.5)).normalize();
      const pole = natPole.lerp(W(sx * .72, -.66, -.12).normalize(), w).normalize();
      limb(`${name}Arm`, `${name}ForeArm`, wr.lerp(hand[side], w), pole);
    }
    // Hands: the captured fingers, except the tool hand's grip (set from the rest pose, on its own axes).
    const grip = mode === 'work' || mode === 'notice' || mode === 'admire' ? 1 : 0;
    if (grip || !mixer) for (const side of (mixer ? ['Right'] : ['Left', 'Right']) as ('Left' | 'Right')[]) {
      const sx = side === 'Left' ? 1 : -1, curl = .25 + (side === 'Right' ? grip * .55 : 0);
      for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (let k = 1; k <= 3; k++) relRest(`${side}Hand${f}${k}`, q.setFromAxisAngle(v2.set(0, 0, 1), -sx * curl * (k === 1 ? .9 : 1.2) * (f === 'Pinky' ? 1.2 : 1)));
      relRest(`${side}HandThumb2`, q.setFromAxisAngle(v2.set(0, 0, 1), -sx * (.15 + grip * .2)));
    }
    if (mode === 'wave') rel('RightHand', euler(0, 0, s(t * 9) * .3));

    // Legs: the feet stay where they stand; when he has turned far enough, he steps, one foot at a time.
    stepFeet(dt);
    for (const side of ['L', 'R'] as const) {
      const f = feet![side], name = side === 'L' ? 'Left' : 'Right';
      const lift = s(Math.min(1, f.k) * Math.PI) * (f.k < 1 ? .07 : 0);
      const target = f.at.clone().add(v.set(0, lift, 0));
      limb(`${name}UpLeg`, `${name}Leg`, target, new THREE.Vector3(Math.sin(f.yaw), 0, Math.cos(f.yaw)).add(v2.set(0, .15, 0)));
      setFig(`${name}Foot`, q.setFromAxisAngle(up, f.yaw - yaw));
    }
  }
  function stepFeet(dt: number) {
    const R = rig!;
    const want = (side: 'L' | 'R') => body.localToWorld(R.ankleRest[side].clone());
    if (!feet) {
      const mk = (side: 'L' | 'R'): Foot => { const p = want(side); return { at: p.clone(), yaw, from: p.clone(), fromYaw: yaw, to: p.clone(), toYaw: yaw, k: 1 }; };
      feet = { L: mk('L'), R: mk('R') };
    }
    const stepping = feet.L.k < 1 || feet.R.k < 1;
    for (const side of ['L', 'R'] as const) {
      const f = feet[side];
      if (f.k < 1) { f.k = Math.min(1, f.k + dt / .34); const e = f.k * f.k * (3 - 2 * f.k); f.at.lerpVectors(f.from, f.to, e); f.yaw = f.fromYaw + (f.toYaw - f.fromYaw) * e; }
    }
    if (stepping) return;
    // The foot that has drifted furthest from where it should be goes first, then the other.
    const err = (side: 'L' | 'R') => feet![side].at.distanceTo(want(side)) + Math.abs(THREE.MathUtils.euclideanModulo(yaw - feet![side].yaw + Math.PI, Math.PI * 2) - Math.PI) * .25;
    const side = err('L') > .06 || err('R') > .06 ? (err(nextFoot) > .03 ? nextFoot : nextFoot === 'L' ? 'R' : 'L') : null;
    if (!side) return;
    const f = feet[side]; f.from.copy(f.at); f.fromYaw = f.yaw; f.to.copy(want(side)); f.toYaw = yaw; f.k = 0;
    nextFoot = side === 'L' ? 'R' : 'L';
  }
  function clampYaw(a: number) {
    // He does not turn his back on his work: within 110° either side of the stand.
    const d = THREE.MathUtils.euclideanModulo(a - FACE + Math.PI, Math.PI * 2) - Math.PI;
    return FACE + THREE.MathUtils.clamp(d, -1.9, 1.9);
  }
  function lerpAngle(a: number, b: number, k: number) { const d = THREE.MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI; return a + d * k; }
  function inFront(p: THREE.Vector3) { const a = Math.atan2(p.x - AT.x, p.z - AT.z); return Math.abs(THREE.MathUtils.euclideanModulo(a - FACE + Math.PI, Math.PI * 2) - Math.PI) < 1.5; }

  /** Keep his card by his head on screen (or at the foot of the screen on a phone, in a conversation). */
  const proj = new THREE.Vector3();
  function place(width: number, height: number) {
    if (ui.hidden || !rig) return;
    rig.B('Head').getWorldPosition(proj); proj.y += .32; proj.project(camera);
    const behind = proj.z > 1, x = (proj.x * .5 + .5) * width, y = (-proj.y * .5 + .5) * height;
    const offscreen = behind || x < -40 || x > width + 40 || y < -40 || y > height + 40;
    onScreen = !offscreen;
    ui.classList.toggle('is-away', offscreen && !dialog);
    // The card hangs above and beside the anchor: keep all of it on screen, under the site's header.
    const card = ui.firstElementChild as HTMLElement, cw = card.offsetWidth + 30, ch = card.offsetHeight + 16;
    const left = x + cw > width - 12 && x - cw > 12;
    ui.style.setProperty('--x', `${Math.round(THREE.MathUtils.clamp(x, left ? cw + 12 : 16, left ? width - 16 : width - cw - 12))}px`);
    ui.style.setProperty('--y', `${Math.round(THREE.MathUtils.clamp(y, ch + 96, height - 24))}px`);
    ui.classList.toggle('is-left', left);
  }

  return {
    /** What a click can hit: him and his stand. */
    targets: [proxy, proxyStand] as THREE.Object3D[],
    layer: 5,
    collider: new THREE.Box3().setFromPoints([AT, AT.clone().add(new THREE.Vector3(Math.sin(FACE), 0, Math.cos(FACE)).multiplyScalar(STAND))]).expandByVector(new THREE.Vector3(.42, 0, .42)).expandByPoint(new THREE.Vector3(AT.x, 2, AT.z)),
    load, update, place, open, close,
    isTalking: () => dialog,
    /** (Debug: hold the face at blink / jaw / smile.) */
    testFace(v: [number, number, number] | null) { faceTest = v; },
    /** Every line he can say, with its recording's name and how it is spoken (scripts/voice: the recordings are
     *  made from this list). */
    voiceLines() {
      const all: Lang[] = [...LINES.hello, ...LINES.barks, LINES.ask, LINES.archive, ...LINES.order, ...LINES.how, ...LINES.who, LINES.bye];
      for (const e of modelArchive) {
        all.push(LINES.expect(e.title, e.id), LINES.present(e.title, e.id));
        if (archiveFacts[e.id]) all.push(...techLines({ key: e.id, title: e.title, about: e.description, facts: knownFacts(e.id, null as unknown as Facts) } as Piece));
      }
      if (figure) all.push(...techLines(figure));
      const seen = new Set<string>();
      return all.filter(l => l.v && !seen.has(l.v) && seen.add(l.v)).map(l => ({ v: l.v!, en: l.say?.en ?? l.en, de: l.say?.de ?? l.de }));
    },
    /** (Debug: what a model is made of, as he would tell it.) */
    factsOf(root: THREE.Object3D) { const { materials, facts } = collect(root); materials.forEach(m => m.dispose()); return facts; },
    /** (Debug: what he is doing and how far the piece is.) */
    state: () => ({ voice: voice ? `${voice.line.v} ${voice.dur.toFixed(1)}s` : null, mode, phase: phasePiece, built: Math.round(built), tris: piece?.tris ?? 0, told: piece?.told ?? false, clock: +clock.toFixed(2) }),
    /** A work arrived on the stage: he turns to it and presents it, and starts a small one of it on his wheel. */
    present(title: string, model?: THREE.Object3D, about?: Lang, id?: string) {
      if (model && piece?.source !== model && next?.source !== model) {
        const ticket = ++asked, { parts, materials, facts } = collect(model);
        void build(parts).then(async data => {
          if (!data || ticket !== asked || disposed) { materials.forEach(m => m.dispose()); return; }
          const made = makePiece(data, materials, knownFacts(id, facts), title, id ?? 'work', about, model);
          await warm(made);
          if (ticket !== asked || disposed) { forget(made); return; }
          chosen = true; buildSpeed = 2.2; startPiece(made);
          if (mode === 'idle' || mode === 'explain') { mode = 'work'; modeAt = clock; }
        });
      }
      if (!loaded) return;
      mode = 'present'; presentAt = clock; modeAt = clock;
      if (Math.hypot(camPos.x - AT.x, camPos.z - AT.z) < 16) speakLines([LINES.present(title, id)], !dialog);
    },
    /** A work was chosen and is on its way to the stage. */
    expect(title: string, id?: string) {
      if (loaded && Math.hypot(camPos.x - AT.x, camPos.z - AT.z) < 16) speakLines([LINES.expect(title, id)], !dialog);
    },
    /** The stage was cleared: back to his own figure. */
    unpresent() {
      asked++;
      if (!chosen || !figure) return;
      chosen = false; buildSpeed = 1; startPiece(figure);
    },
    /** A work is leaving the stage (and its textures with it): his copy of it goes on in plain clay. */
    retire(root: THREE.Object3D) {
      for (const p of [piece, next]) if (p && p.source === root) {
        p.materials.forEach(m => m.dispose()); p.materials = p.materials.map(() => clayMat); p.mesh.material = p.materials; p.source = undefined;
      }
    },
    /** The caption's subject when you look at him from close by. */
    inView(position: THREE.Vector3, forward: THREE.Vector3) {
      if (!loaded) return undefined;
      tmp.copy(AUTHOR_INFO.focus).sub(position); const dist = tmp.length();
      return dist < 6.5 && tmp.normalize().angleTo(forward) < .42 ? AUTHOR_INFO : undefined;
    },
    dispose() {
      disposed = true; hush(); events.abort(); ui.remove(); worker?.terminate(); waiting.clear();
      scene.remove(shop, body, key, key.target);
      body.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
      own.forEach(x => x.dispose());
    },
  };
}

/**
 * His face. The Avaturn export has no blendshapes, and its eyes and mouth are painted, but the mesh is dense round
 * them, so three morph targets are built here from landmarks measured on his own model (in its bind space: x to
 * his left, y up, z forward):
 *  - blink: between the lower lash line and the lid crease everything closes onto the lower lash line, the lid's
 *    skin stretching down over the painted eye;
 *  - jaw: everything below the line of the lips turns down about a hinge by the ears, so the lips part;
 *  - smile: the corners of the mouth go up and a little out.
 * And, in his skin's shader, from masks made here: the inside of the mouth, dark where the lips part as the jaw
 * opens; wet eyes with a catchlight; and irises that move (the painted iris is
 * slid inside the opening of each eye, the lids staying put), for glances and the small jumps of a living gaze.
 */
function buildFace(mesh: THREE.Mesh) {
  const geo = mesh.geometry, pos = geo.attributes.position as THREE.BufferAttribute, n = pos.count;
  const blink = new Float32Array(n * 3), jaw = new Float32Array(n * 3), smile = new Float32Array(n * 3);
  const smooth = (a: number, b: number, x: number) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const EYE = { x: .0336, half: .0187, corner: 1.727, upper: .0067, lower: .0027, crease: .0068 };
  const LIPS = { y: 1.663, corners: .038, droop: .0028 }, HINGE = { y: 1.69, z: -.005 }, JAW = .15;
  const rot = new THREE.Vector3();
  // aEye: how much of the eye's painting slides with the iris (+ his left eye, - his right); aEyeAt: where the
  // vertex is from the eye's centre (metres, for the catchlight); aMouth: which side of the lips (+ upper, - lower)
  // and how far in from the corners; triangles across the line are the parting, dark when it opens.
  const aEye = new Float32Array(n), aEyeAt = new Float32Array(n * 2).fill(1), aMouth = new Float32Array(n * 2);
  const uv = geo.attributes.uv as THREE.BufferAttribute | undefined;
  const fit = [0, 1].map(() => ({ sx: 0, sy: 0, su: 0, sv: 0, sxx: 0, syy: 0, sxy: 0, sxu: 0, syu: 0, sxv: 0, syv: 0, k: 0 }));
  const EYE_Y = EYE.corner + (EYE.upper - EYE.lower) / 2;
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (z < -.01) continue;                                             // the back of the head never moves
    for (const [side, cx] of [[1, EYE.x], [0, -EYE.x]] as const) {
      const u = (x - cx) / EYE.half; if (Math.abs(u) > 1.3 || y < 1.705 || y > 1.755) continue;
      aEyeAt[i * 2] = x - cx; aEyeAt[i * 2 + 1] = y - EYE_Y;
      const arc = Math.max(0, 1 - u * u), zL = EYE.corner - EYE.lower * arc, zU = EYE.corner + EYE.upper * arc;
      if (y < zL || y > zU || Math.abs(u) > 1) continue;
      const inner = Math.min(y - zL, zU - y) / Math.max(1e-4, zU - zL);
      const m = smooth(.08, .38, inner) * (1 - smooth(.5, .88, Math.abs(u)));
      aEye[i] = side ? m : -m;
      if (uv && m > .2) { const f = fit[side], U = uv.getX(i), V = uv.getY(i), X = x - cx, Y = y - EYE_Y;
        f.sx += X; f.sy += Y; f.su += U; f.sv += V; f.sxx += X * X; f.syy += Y * Y; f.sxy += X * Y; f.sxu += X * U; f.syu += Y * U; f.sxv += X * V; f.syv += Y * V; f.k++; }
    }
    const lipAt = LIPS.y - LIPS.droop * Math.min(1, (x / LIPS.corners) ** 2);
    // (Which side of the line of the lips; where: the mouth only.)
    aMouth[i * 2] = y >= lipAt ? 1 : -1;
    aMouth[i * 2 + 1] = z > 0 && Math.abs(y - lipAt) < .012 ? 1 - smooth(LIPS.corners * .7, LIPS.corners * 1.15, Math.abs(x)) : 0;
    // Eyes.
    for (const cx of [-EYE.x, EYE.x]) {
      const u = (x - cx) / EYE.half; if (Math.abs(u) > 1.25 || y < 1.71 || y > 1.75) continue;
      const arc = Math.max(0, 1 - u * u);
      const zL = EYE.corner - EYE.lower * arc, zU = EYE.corner + EYE.upper * arc, zC = zU + EYE.crease + .0012 * arc;
      const close = zL + .0006, w = 1 - smooth(.85, 1.2, Math.abs(u));
      let to = y;
      if (y >= zL - .0004 && y <= zU) to = close;
      else if (y > zU && y < zC) to = close + (y - zU) / (zC - zU) * (zC - close);
      blink[i * 3 + 1] += (to - y) * w;
      if (y >= zL - .0004 && y <= zU) blink[i * 3 + 2] += .0012 * w;     // the closed lid sits over the eye, not in it
    }
    // Jaw: below the line of the lips, in front, between the corners and a little beyond.
    const lip = LIPS.y - LIPS.droop * Math.min(1, (x / LIPS.corners) ** 2);
    if (y < lip && y > 1.57 && Math.abs(x) < .075) {
      // At the lips the opening is a lens, closed at the corners; lower down the whole chin turns.
      const lens = 1 - smooth(.008, .04, Math.abs(x)), chin = 1 - smooth(.03, .07, Math.abs(x));
      const across = THREE.MathUtils.lerp(lens, chin, smooth(.002, .022, lip - y));
      // (Everything below the line moves in full: a ramp right under it stretched whole triangles of the lower lip
      // into pale spikes. Only the triangles across the line stretch, and they are the dark parting.)
      const w = across * smooth(1.585, 1.615, y) * smooth(-.01, .03, z);
      const a = JAW * w, ry = y - HINGE.y, rz = z - HINGE.z;
      rot.set(0, ry * Math.cos(a) - rz * Math.sin(a), ry * Math.sin(a) + rz * Math.cos(a));
      jaw[i * 3 + 1] = rot.y - ry; jaw[i * 3 + 2] = rot.z - rz;
    }
    // Smile: round each corner of the mouth.
    for (const sx of [-1, 1]) {
      const dx = x - sx * LIPS.corners, dy = y - (LIPS.y - LIPS.droop), d = Math.hypot(dx, dy * 1.3);
      if (d > .03) continue;
      const w = (1 - d / .03) ** 2;
      smile[i * 3] += sx * .0034 * w; smile[i * 3 + 1] += .0072 * w; smile[i * 3 + 2] -= .0016 * w;
    }
  }
  geo.morphAttributes.position = [new THREE.BufferAttribute(blink, 3), new THREE.BufferAttribute(jaw, 3), new THREE.BufferAttribute(smile, 3)];
  geo.morphTargetsRelative = true;
  mesh.updateMorphTargets();
  geo.setAttribute('aEye', new THREE.BufferAttribute(aEye, 1)); geo.setAttribute('aEyeAt', new THREE.BufferAttribute(aEyeAt, 2)); geo.setAttribute('aMouth', new THREE.BufferAttribute(aMouth, 2));
  // How the painting's UVs run across each eye (a least-squares fit of uv against position): an iris moved by so
  // many millimetres is the painting slid by so much.
  const jac = fit.map(f => {
    if (f.k < 6) return null;
    const mx = f.sx / f.k, my = f.sy / f.k, cxx = f.sxx / f.k - mx * mx, cyy = f.syy / f.k - my * my, cxy = f.sxy / f.k - mx * my, det = cxx * cyy - cxy * cxy;
    if (Math.abs(det) < 1e-16) return null;
    const cu = [f.sxu / f.k - mx * f.su / f.k, f.syu / f.k - my * f.su / f.k], cv = [f.sxv / f.k - mx * f.sv / f.k, f.syv / f.k - my * f.sv / f.k];
    const solve = (c: number[]) => [(c[0] * cyy - c[1] * cxy) / det, (c[1] * cxx - c[0] * cxy) / det];
    const [ux, uy] = solve(cu), [vx, vy] = solve(cv); return { ux, uy, vx, vy };
  });
  const uniforms = { uJaw: { value: 0 }, uEyeUVL: { value: new THREE.Vector2() }, uEyeUVR: { value: new THREE.Vector2() }, uLook: { value: new THREE.Vector2() } };
  const material = mesh.material as THREE.MeshStandardMaterial, before = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (sh, r) => {
    before(sh, r);
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aEye; attribute vec2 aEyeAt; attribute vec2 aMouth; uniform vec2 uEyeUVL, uEyeUVR;
        varying float vEye; varying vec2 vEyeAt; varying vec3 vMouth;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vEye = aEye; vEyeAt = aEyeAt; vMouth = vec3(max(aMouth.x, 0.), max(-aMouth.x, 0.), aMouth.y);
        #ifdef USE_MAP
          vMapUv += (aEye > 0. ? uEyeUVL : uEyeUVR) * abs(aEye);
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uJaw; uniform vec2 uLook; varying float vEye; varying vec2 vEyeAt; varying vec3 vMouth;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        // The parting of the lips: every triangle across the line of the lips (only there are both its "above" and
        // its "below" shares above zero), dark as the jaw opens, so the mouth opens instead of stretching. Its edges
        // are the rows of the lips themselves.
        float parted = smoothstep(.02, .12, uJaw) * vMouth.z * smoothstep(0., .035, min(vMouth.x, vMouth.y));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.075, .02, .018), clamp(parted, 0., .95));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, .14, smoothstep(.05, .5, abs(vEye)));`)
      .replace('#include <opaque_fragment>', `
        // A catchlight in each eye, up and to the side, riding with the iris.
        vec2 glint = vEyeAt - uLook - vec2(-.0017, .0019);
        outgoingLight += vec3(1., .97, .92) * (1. - smoothstep(.00045, .001, length(glint))) * smoothstep(.04, .3, abs(vEye)) * .85;
        #include <opaque_fragment>`);
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => key() + '-face';
  material.needsUpdate = true;
  const influences = mesh.morphTargetInfluences!;
  return {
    set(b: number, j: number, sm: number) { influences[0] = b; influences[1] = j; influences[2] = sm; uniforms.uJaw.value = j; },
    /** The irises' offset from the middle of each eye, in metres (x to his left, y up). */
    look(x: number, y: number) {
      uniforms.uLook.value.set(x, y);
      jac.forEach((J, side) => { const t = side ? uniforms.uEyeUVL.value : uniforms.uEyeUVR.value; if (J) t.set(-(J.ux * x + J.uy * y), -(J.vx * x + J.vy * y)); });   // (sliding the painting the other way moves the iris this way)
    },
  };
}

/** His avatar's materials, made for the room: skin with a warm sheen, hair cards, cloth. Phones get the plain versions. */
function dress(model: THREE.Object3D, mobile: boolean, keep: <T extends { dispose(): void }>(x: T) => T) {
  model.traverse(node => {
    const mesh = node as THREE.Mesh; if (!mesh.isMesh) return;
    // (No real-time shadow: the soft pool under him stands in, and a skinned shadow caster costs every frame.)
    mesh.castShadow = false; mesh.receiveShadow = true; mesh.frustumCulled = false;
    const old = mesh.material as THREE.MeshStandardMaterial, name = old.name ?? '';
    if (!/^avaturn_/.test(name)) return;
    const base = { name, map: old.map, normalMap: old.normalMap, roughnessMap: old.roughnessMap, metalnessMap: old.metalnessMap, color: old.color, metalness: 0, side: THREE.FrontSide } as THREE.MeshPhysicalMaterialParameters;
    if (old.normalMap) base.normalScale = old.normalScale.clone();
    let next: THREE.Material;
    if (/hair/.test(name)) {
      next = old.transparent
        ? new THREE.MeshStandardMaterial({ ...base, roughness: .5, side: THREE.DoubleSide, transparent: true, depthWrite: false, alphaTest: .02 } as THREE.MeshStandardMaterialParameters)
        : new THREE.MeshStandardMaterial({ ...base, roughness: .5, side: THREE.DoubleSide, alphaTest: .4 } as THREE.MeshStandardMaterialParameters);
      if (old.transparent) mesh.renderOrder = 2;
    } else if (/body/.test(name) && !mobile) {
      // Skin: a soft sheen, and light scattering red through the edges (ears, the rim of a cheek against the light).
      const skin = new THREE.MeshPhysicalMaterial({ ...base, roughness: .66, specularIntensity: .3, sheen: .14, sheenColor: new THREE.Color('#ff9f8a'), sheenRoughness: .6 });
      skin.onBeforeCompile = sh => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
          float rimScatter = pow(1. - clamp(dot(normal, normalize(vViewPosition)), 0., 1.), 2.5);
          outgoingLight += diffuseColor.rgb * vec3(.9, .25, .14) * rimScatter * .2;
          #include <opaque_fragment>`);
      };
      skin.customProgramCacheKey = () => 'author-skin';
      next = skin;
    } else next = new THREE.MeshStandardMaterial({ ...base, roughness: /body/.test(name) ? .6 : .92 } as THREE.MeshStandardMaterialParameters);
    mesh.material = keep(next); old.dispose();
  });
}
