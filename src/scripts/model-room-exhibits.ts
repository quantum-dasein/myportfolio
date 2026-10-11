// The Model Room's collection beyond the kitchen: each piece shown the way its kind is shown in the
// world. The e-bike turns on a showroom turntable, the droid stands on a museum pedestal like a
// sculpture. Every stand has its own downlights, a
// green glow on the floor and a lit lectern. The models stream in after the room has opened and are
// "printed" into the room by a rising green scan line.
import * as THREE from 'three';
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { dressLounge } from './model-room-lounge';
import { ROOM } from './model-room-layout';

type Lang = { en: string; de: string };
export type ExhibitInfo = {
  id: string; no: string; kind: Lang; title: string; sub: Lang; text: Lang;
  /** What the inspection orbit looks at, and from how far. */
  focus: THREE.Vector3; distance: number; elevation?: number;
};

export const KITCHEN: ExhibitInfo = {
  id: 'kitchen', no: '001', kind: { en: 'Material study', de: 'Materialstudie' }, title: 'White & Wood',
  sub: { en: 'Kitchen Modern 25', de: 'Kitchen Modern 25' },
  text: { en: 'Oak, stone and brushed metal.\nA study in light, proportion and construction.', de: 'Eiche, Stein und gebürstetes Metall.\nEine Studie über Licht, Proportion und Konstruktion.' },
  focus: new THREE.Vector3(0, 1.65, -3.5), distance: 9,
};

/** K-2SO stands facing the door you come in through, and meets you with his gaze. */
// His face points along the model's +x; he looks from his pedestal to the entrance.
// Turning by y sends local +x to world (cos y, -sin y), so y = atan2(-dz, dx) toward the door: about -2.01.
const K2SO_AT = new THREE.Vector3(7.5, 0, 1.5);
const K2SO_YAW = Math.atan2(-(10.5 + ROOM.shift - K2SO_AT.z), 0 - K2SO_AT.x);

type Stage = {
  info: ExhibitInfo; url: string; stand: 'turntable' | 'pedestal' | 'table' | 'lounge' | 'wall' | 'hanging';
  at: THREE.Vector3; lift: number; spin: number; yaw: number; reach: number; height: number;
  lectern?: { x: number; z: number; face: number; title: string; line: string };
};

const STAGES: Stage[] = [
  {
    info: {
      id: 'svj', no: '002', kind: { en: 'Automotive', de: 'Automobil' }, title: 'Aventador SVJ',
      sub: { en: 'Lamborghini Aventador SVJ Roadster, 2021', de: 'Lamborghini Aventador SVJ Roadster, 2021' },
      text: { en: 'Modelled in 2021, every vent and wing strut.\nIt turns slowly, the way cars are shown.', de: 'Modelliert 2021, jede Lüftung, jede Flügelstrebe.\nEr dreht sich langsam, wie Autos gezeigt werden.' },
      focus: new THREE.Vector3(-8.5, .7, 4.5), distance: 7,
    },
    url: '/models/exhibits/svj.glb', stand: 'turntable', at: new THREE.Vector3(-8.5, 0, 4.5), lift: .14, spin: .09, yaw: 0, reach: 2.75, height: 1.25,
    lectern: { x: -6.3, z: 8, face: .85, title: 'SVJ ROADSTER', line: 'EXHIBIT 002  ·  LAMBORGHINI  ·  2021' },
  },
  {
    info: {
      id: 'k2so', no: '003', kind: { en: 'Character', de: 'Figur' }, title: 'K-2SO',
      sub: { en: 'Star Wars droid, fan study', de: 'Star-Wars-Droide, Fan-Studie' },
      text: { en: 'Hard-surface detail, textured for close inspection.\nIt watches the door, and whoever comes through it.', de: 'Hard-Surface-Details, für die Nahansicht texturiert.\nEr beobachtet die Tür und jeden, der hindurchkommt.' },
      focus: new THREE.Vector3(K2SO_AT.x, 1.6, K2SO_AT.z), distance: 4.4,
    },
    url: '/models/exhibits/k2so.glb', stand: 'pedestal', at: K2SO_AT, lift: .5, spin: 0, yaw: K2SO_YAW, reach: .75, height: 2.8,
    lectern: { x: 8.85, z: 2.4, face: -.6, title: 'K-2SO', line: 'EXHIBIT 003  ·  CHARACTER  ·  FAN STUDY' },
  },
  {
    info: {
      id: 'ebike', no: '004', kind: { en: 'Product', de: 'Produkt' }, title: 'e-bike',
      sub: { en: 'Audi e-bike, low poly', de: 'Audi e-bike, Low Poly' },
      text: { en: 'A real-time study: the whole bike\nin fewer than nine thousand triangles.', de: 'Eine Echtzeitstudie: das ganze Rad\nin weniger als neuntausend Dreiecken.' },
      focus: new THREE.Vector3(ROOM.halfW - .65, 1.5, 6), distance: 3.4,
    },
    url: '/models/exhibits/audi-ebike.glb', stand: 'wall', at: new THREE.Vector3(ROOM.halfW - .6, 0, 6), lift: .98, spin: 0, yaw: Math.PI / 2, reach: 1, height: 1.1,
    lectern: { x: ROOM.halfW - 1.55, z: 4.45, face: -1.25, title: 'E-BIKE', line: 'EXHIBIT 004  ·  AUDI  ·  LOW POLY' },
  },
  {
    info: {
      id: 'house', no: '005', kind: { en: 'Architecture', de: 'Architektur' }, title: 'ABS House',
      sub: { en: 'V176, three variants', de: 'V176, drei Varianten' },
      text: { en: 'A two-storey house in three variants,\nshown as a white architectural model.', de: 'Ein zweigeschossiges Haus in drei Varianten,\nals weißes Architekturmodell.' },
      focus: new THREE.Vector3(8.2, .95, 9.2), distance: 2.6,
    },
    url: '/models/exhibits/abs-house.glb', stand: 'table', at: new THREE.Vector3(8.2, 0, 9.2), lift: .845, spin: 0, yaw: Math.PI / 2, reach: .9, height: .3,
    lectern: { x: 7, z: 11, face: -.9, title: 'ABS HOUSE', line: 'EXHIBIT 005  ·  ARCHITECTURE  ·  1:15' },
  },
  {
    info: {
      id: 'sofa', no: '006', kind: { en: 'Furniture', de: 'Möbel' }, title: 'Lounge',
      sub: { en: 'Vavicci Sofa C and its set', de: 'Vavicci Sofa C mit Ensemble' },
      text: { en: 'Velvet, linen and a knitted throw.\nThe astronaut rests here and waits for you.', de: 'Samt, Leinen und ein Strickplaid.\nHier ruht der Astronaut und wartet auf Sie.' },
      focus: new THREE.Vector3(-8.5, .6, 13.2), distance: 4.6,
    },
    url: '/models/exhibits/sofa.glb', stand: 'lounge', at: new THREE.Vector3(-8.5, 0, 13.2), lift: 0, spin: 0, yaw: Math.PI, reach: 1.9, height: 1,
    lectern: { x: -6.25, z: 11.2, face: .8, title: 'LOUNGE', line: 'EXHIBIT 006  ·  FURNITURE  ·  VAVICCI' },
  },
  {
    info: {
      id: 'plant', no: '007', kind: { en: 'Lighting', de: 'Leuchte' }, title: 'Hanging garden',
      sub: { en: 'Pot light pendant 08', de: 'Pflanzenleuchte 08' },
      text: { en: 'A rack of pendant pots with trailing leaves,\nthe lamp over the lounge.', de: 'Ein Hängegestell mit Leuchten und rankenden Blättern,\ndie Lampe über der Lounge.' },
      focus: new THREE.Vector3(-8.4, 3, 13), distance: 4,
    },
    url: '/models/exhibits/plant-pendant.glb', stand: 'hanging', at: new THREE.Vector3(-8.4, 0, 13), lift: 2.3, spin: 0, yaw: 0, reach: 1.1, height: 1.25,
  },
];export const EXHIBITS: ExhibitInfo[] = [KITCHEN, ...STAGES.map(s => s.info)];

/**
 * The "printing" reveal: everything above a world height is discarded. Done in the shader rather than with
 * three's clipping planes, because renderer.compileAsync does not see per-material clipping and the real
 * program was then compiled synchronously on first draw (a ~1 s hitch per exhibit).
 */
function printable(material: THREE.Material, height: { value: number }) {
  const m = material as THREE.Material & { userData: Record<string, unknown> };
  if (m.userData.printable) return; m.userData.printable = true;
  const before = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    before?.call(m, shader, renderer);
    shader.uniforms.uPrintY = height;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vPrintY;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvPrintY = (modelMatrix * vec4(transformed, 1.)).y;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uPrintY; varying float vPrintY;')
      .replace('void main() {', 'void main() {\n  if (vPrintY > uPrintY) discard;');
  };
  m.customProgramCacheKey = () => 'printable';
  m.needsUpdate = true;
}

const ringVertex = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
// A soft green halo on the floor around a stand, or (as the scan) a thin bright ring.
const ringFragment = /* glsl */`uniform float uR, uWidth, uGain, uFill; uniform vec3 uColor; varying vec2 vUv;
void main(){ float d = length(vUv - .5) * 2.; float ring = exp(-pow((d - uR) / uWidth, 2.)); float fill = exp(-d * d / (uR * uR * .6)) * uFill;
  gl_FragColor = vec4(uColor * (ring + fill) * uGain * smoothstep(1., .9, d), 1.); }`;

/** Little reactions of the pieces, for the room's sound. */
export type ExhibitCue = 'engine' | 'rev' | 'eyes' | 'lights-on' | 'lights-off';

export function createExhibits(o: { scene: THREE.Scene; renderer: THREE.WebGLRenderer; camera: THREE.Camera; mobile: boolean; loader: GLTFLoader; onReveal?: (id: string) => void; onCue?: (cue: ExhibitCue) => void; target?: () => THREE.WebGLRenderTarget | null }) {
  const { scene, renderer, camera, mobile, loader } = o;
  renderer.localClippingEnabled = true;
  const disposables: { dispose: () => void }[] = [];
  const colliders: THREE.Box3[] = [];
  const meshes: THREE.Mesh[] = [];
  const updates: ((t: number, dt: number) => void)[] = [];
  const own = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

  const stone = own(new THREE.MeshStandardMaterial({ color: '#161b1a', roughness: .6, metalness: .12 }));
  const bronze = own(new THREE.MeshStandardMaterial({ color: '#6b5238', metalness: .85, roughness: .32 }));
  const gloss = own(new THREE.MeshPhysicalMaterial({ color: '#080b0b', roughness: .14, metalness: .35, clearcoat: 1, clearcoatRoughness: .05 }));
  const glow = own(new THREE.MeshBasicMaterial({ color: new THREE.Color(.35, 2.1, 1.1), toneMapped: false }));
  const lens = own(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.1, 1.7), toneMapped: false }));
  const can = own(new THREE.CylinderGeometry(.11, .085, .26, 28)), stem = own(new THREE.CylinderGeometry(.008, .008, 1, 6)), disc = own(new THREE.CircleGeometry(.075, 28));

  function downlight(x: number, z: number, target: THREE.Vector3, intensity: number, angle: number) {
    const body = new THREE.Mesh(can, bronze); body.position.set(x, 5.72, z); scene.add(body);
    const rod = new THREE.Mesh(stem, bronze); rod.scale.y = .55; rod.position.set(x, 6.12, z); scene.add(rod);
    const glass = new THREE.Mesh(disc, lens); glass.rotation.x = Math.PI / 2; glass.position.set(x, 5.585, z); scene.add(glass);
    if (mobile) return;   // on phones the fixture glows but lights nothing: every extra lamp is paid for by every pixel
    const spot = new THREE.SpotLight('#ffe6c8', intensity, 13, angle, .85, 2); spot.position.set(x, 5.55, z);
    spot.target.position.copy(target); scene.add(spot, spot.target);
  }
  function halo(x: number, z: number, radius: number, gain: number) {
    const size = radius * 2 + 2.4;
    const m = own(new THREE.ShaderMaterial({ uniforms: { uR: { value: radius / (size / 2) }, uWidth: { value: .09 }, uGain: { value: gain }, uFill: { value: .12 }, uColor: { value: new THREE.Color(.25, 1, .6) } }, vertexShader: ringVertex, fragmentShader: ringFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const plane = new THREE.Mesh(own(new THREE.PlaneGeometry(size, size)), m); plane.rotation.x = -Math.PI / 2; plane.position.set(x, .006, z); scene.add(plane);
    return m;
  }
  function lectern(l: NonNullable<Stage['lectern']>) {
    const group = new THREE.Group(); group.position.set(l.x, 0, l.z); group.rotation.y = l.face; scene.add(group);
    const post = new THREE.Mesh(own(new THREE.BoxGeometry(.05, .92, .05)), bronze); post.position.y = .46; group.add(post);
    const foot = new THREE.Mesh(own(new THREE.BoxGeometry(.36, .02, .26)), bronze); foot.position.y = .01; group.add(foot);
    const board = new THREE.Mesh(own(new THREE.BoxGeometry(.64, .34, .03)), stone); board.position.set(0, 1, 0); board.rotation.x = -.55; group.add(board);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d')!;
    x.textAlign = 'center'; x.fillStyle = '#f4f7f1'; x.font = '500 124px sans-serif'; x.fillText(l.title, 512, 250);
    x.fillStyle = '#9fe6c0'; x.font = '500 34px monospace'; x.fillText(l.line, 512, 350);
    x.fillStyle = '#4fdc9c'; x.fillRect(372, 400, 280, 3);
    const tex = own(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const text = new THREE.Mesh(own(new THREE.PlaneGeometry(.6, .3)), own(new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.9, 1.95, 1.85), transparent: true, depthWrite: false, toneMapped: false })));
    // Just proud of the tilted board, along its normal.
    text.position.set(0, 1 + .018 * Math.sin(.55), .018 * Math.cos(.55)); text.rotation.x = -.55; group.add(text);
    const edge = new THREE.Mesh(own(new THREE.BoxGeometry(.64, .01, .01)), glow); edge.position.set(0, 1 - .17 * Math.cos(.55), .17 * Math.sin(.55) + .02); edge.rotation.x = -.55; group.add(edge);
  }

  type Slot = { stage: Stage; spinner: THREE.Group; clip: { value: number }; scan: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; reveal: number; state: 'waiting' | 'revealing' | 'shown'; paused: boolean; angle: number };
  const slots: Slot[] = [];
  for (const stage of STAGES) {
    const { at, reach } = stage;
    const spinner = new THREE.Group(); spinner.position.copy(at); scene.add(spinner);
    // A soft contact shadow, so the piece sits on its stand instead of hovering above it.
    const shade = new THREE.Mesh(own(new THREE.PlaneGeometry(1, 1)), own(new THREE.ShaderMaterial({
      vertexShader: ringVertex, transparent: true, depthWrite: false,
      fragmentShader: `varying vec2 vUv; void main(){ vec2 p = (vUv - .5) * 2.; float d = dot(p, p); gl_FragColor = vec4(0., 0., 0., .72 * exp(-d * 3.2) * smoothstep(1., .6, d)); }`,
    })));
    shade.rotation.x = -Math.PI / 2; shade.position.y = stage.lift + .006; shade.renderOrder = 1;
    if (stage.stand === 'turntable') shade.scale.set(reach * .84, reach * 1.86, 1); else if (stage.stand === 'table') shade.scale.set(1.45, .5, 1); else shade.scale.set(.95, .95, 1);
    shade.visible = !['lounge', 'wall', 'hanging'].includes(stage.stand);   // the rug is its own ground; nothing to rest on up there
    spinner.add(shade);
    if (stage.stand === 'turntable') {
      // Showroom turntable: a low gloss-black disc with a lit green edge and two long light boxes above.
      const base = new THREE.Mesh(own(new THREE.CylinderGeometry(reach + .06, reach + .1, .08, 96)), stone); base.position.set(at.x, .04, at.z); base.receiveShadow = true; scene.add(base);
      const top = new THREE.Mesh(own(new THREE.CylinderGeometry(reach, reach, .06, 96)), gloss); top.position.y = .11; top.receiveShadow = true; spinner.add(top);
      const edge = new THREE.Mesh(own(new THREE.TorusGeometry(reach + .07, .011, 6, 160)), glow); edge.rotation.x = Math.PI / 2; edge.position.set(at.x, .085, at.z); scene.add(edge);
      for (const dx of [-reach * .4, reach * .4]) {
        const box = new THREE.Mesh(own(new THREE.BoxGeometry(.4, .05, reach * 1.25)), own(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.45, 1.35), toneMapped: false }))); box.position.set(at.x + dx, 5.62, at.z); scene.add(box);
        const frame = new THREE.Mesh(own(new THREE.BoxGeometry(.48, .1, reach * 1.25 + .08)), bronze); frame.position.set(at.x + dx, 5.69, at.z); scene.add(frame);
        for (const dz of [-reach * .55, reach * .55]) { const rod = new THREE.Mesh(stem, bronze); rod.scale.y = .7; rod.position.set(at.x + dx, 6.05, at.z + dz); scene.add(rod); }
        if (dx > 0) continue;   // both boxes glow, one lamp lights the car: each lamp costs every lit pixel
        const spot = new THREE.SpotLight('#fff1e0', 86, 13, .72, .9, 2); spot.position.set(at.x, 5.55, at.z); spot.target.position.set(at.x, .6, at.z); scene.add(spot, spot.target);
      }
      halo(at.x, at.z, reach + .07, .55);
      colliders.push(new THREE.Box3(new THREE.Vector3(at.x - reach, 0, at.z - reach), new THREE.Vector3(at.x + reach, 1.2, at.z + reach)));
    } else if (stage.stand === 'table') {
      // Architect's model table: a white top on slim black legs, the model under a glass vitrine.
      const white = own(new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: .7 })), steel = own(new THREE.MeshStandardMaterial({ color: '#141616', metalness: .7, roughness: .35 }));
      const top = new THREE.Mesh(own(new THREE.BoxGeometry(.82, .05, 1.72)), white); top.position.set(at.x, .82, at.z); top.castShadow = top.receiveShadow = true; scene.add(top);
      for (const [dx, dz] of [[-.36, -.8], [.36, -.8], [-.36, .8], [.36, .8]]) { const leg = new THREE.Mesh(own(new THREE.BoxGeometry(.035, .8, .035)), steel); leg.position.set(at.x + dx, .4, at.z + dz); leg.castShadow = true; scene.add(leg); }
      const glass = new THREE.Mesh(own(new THREE.BoxGeometry(.66, .36, 1.56)), own(new THREE.MeshPhysicalMaterial({ color: '#dfeee8', roughness: .03, metalness: 0, transparent: true, opacity: .1, depthWrite: false, envMapIntensity: 1.6 })));
      glass.position.set(at.x, .845 + .18, at.z); glass.renderOrder = 2; scene.add(glass);
      const edges = new THREE.LineSegments(own(new THREE.EdgesGeometry(glass.geometry)), own(new THREE.LineBasicMaterial({ color: new THREE.Color(.5, 1.3, .9), toneMapped: false, transparent: true, opacity: .55 })));
      edges.position.copy(glass.position); scene.add(edges);
      downlight(at.x - .6, at.z, new THREE.Vector3(at.x, .9, at.z), 40, .38);
      halo(at.x, at.z, 1.05, .3);
      colliders.push(new THREE.Box3(new THREE.Vector3(at.x - .45, 0, at.z - .9), new THREE.Vector3(at.x + .45, 1.2, at.z + .9)));
    } else if (stage.stand === 'lounge') {
      // The waiting corner by the entrance; its lamp is the hanging garden above. Its collider comes from the sofa once loaded.
      downlight(at.x - .8, at.z - 1.6, new THREE.Vector3(at.x, .4, at.z), 26, .6);
    } else if (stage.stand === 'wall') {
      // Design-museum wall mount: a dark slab on the wall, two bronze arms, a line of green light beneath.
      const slab = new THREE.Mesh(own(new THREE.BoxGeometry(.06, 1.75, 2.7)), stone); slab.position.set(at.x + .43, 1.55, at.z); slab.receiveShadow = true; scene.add(slab);
      for (const y of [.66, 2.44]) { const line = new THREE.Mesh(own(new THREE.BoxGeometry(.012, .012, 2.7)), glow); line.position.set(at.x + .39, y, at.z); scene.add(line); }
      for (const dz of [-.42, .42]) { const arm = new THREE.Mesh(own(new THREE.BoxGeometry(.52, .035, .035)), bronze); arm.position.set(at.x + .15, 1.46, at.z + dz); scene.add(arm); }
      downlight(at.x - .7, at.z, new THREE.Vector3(at.x, 1.45, at.z), 44, .4);
      colliders.push(new THREE.Box3(new THREE.Vector3(at.x - .45, 0, at.z - 1.05), new THREE.Vector3(at.x + .5, 2.4, at.z + 1.05)));
    } else if (stage.stand === 'hanging') {
      // Hung from the ceiling on four steel cables; the pots glow warm over the lounge.
      const steel = own(new THREE.MeshStandardMaterial({ color: '#2a2d2c', metalness: .8, roughness: .35 }));
      const top = stage.lift + stage.height - .05, length = 6.36 - top;
      for (const [dx, dz] of [[-.95, -.34], [.95, -.34], [-.95, .1], [.95, .1]]) { const cable = new THREE.Mesh(own(new THREE.CylinderGeometry(.005, .005, length, 5)), steel); cable.position.set(at.x + dx, top + length / 2, at.z + dz); scene.add(cable); }
      const lamp = new THREE.PointLight('#ffc98f', mobile ? 5 : 7, 5.5, 2); lamp.position.set(at.x, stage.lift + .45, at.z); scene.add(lamp);
    } else {      // Museum pedestal: dark stone, a bronze cap, a green line of light at its foot; a spot from above and a rim light.
      const block = new THREE.Mesh(own(new THREE.BoxGeometry(1.1, .44, 1.1)), stone); block.position.set(at.x, .22, at.z); block.castShadow = block.receiveShadow = true; scene.add(block);
      const cap = new THREE.Mesh(own(new THREE.BoxGeometry(1.16, .06, 1.16)), bronze); cap.position.set(at.x, .47, at.z); cap.receiveShadow = true; scene.add(cap);
      const line = new THREE.Mesh(own(new THREE.BoxGeometry(1.14, .012, 1.14)), glow); line.position.set(at.x, .015, at.z); scene.add(line);
      downlight(at.x - .9, at.z + 1.2, new THREE.Vector3(at.x, 1.7, at.z), 48, .34);
      halo(at.x, at.z, .95, .45);
      colliders.push(new THREE.Box3(new THREE.Vector3(at.x - .58, 0, at.z - .58), new THREE.Vector3(at.x + .58, 2.5, at.z + .58)));
    }
    if (stage.lectern) lectern(stage.lectern);
    // The scan: a bright ring that climbs the piece as it is printed into the room.
    const size = reach * 2 + 1.2;
    const sm = own(new THREE.ShaderMaterial({ uniforms: { uR: { value: (reach + .1) / (size / 2) }, uWidth: { value: .025 }, uGain: { value: 0 }, uFill: { value: .5 }, uColor: { value: new THREE.Color(.35, 1.4, .8) } }, vertexShader: ringVertex, fragmentShader: ringFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    const scan = new THREE.Mesh(own(new THREE.PlaneGeometry(size, size)), sm); scan.rotation.x = -Math.PI / 2; scan.position.set(at.x, 0, at.z); scan.visible = false; scene.add(scan);
    slots.push({ stage, spinner, clip: { value: -1 }, scan, reveal: 0, state: 'waiting', paused: false, angle: stage.yaw });
  }

  // What the pieces do when you come close, point at them or click them.
  const lamps: { m: THREE.MeshPhysicalMaterial; base: THREE.Color; kind: 'head' | 'turn' | 'tail' }[] = [];
  const windows: THREE.MeshPhysicalMaterial[] = [];
  const wheels: THREE.Object3D[] = [], wheelAxis = new THREE.Vector3(1, 0, 0);
  let flashAt = -1e9, engineNear = false, lightsOn = false, lightsK = 0, wheelSpeed = 0, hovered: string | null = null, now = 0;
  const eyes = { group: null as THREE.Group | null, glow: null as THREE.MeshBasicMaterial | null, halo: null as THREE.SpriteMaterial | null, k: 0, on: false, at: new THREE.Vector3(), flicker: 0 };

  /**
   * The e-bike was exported as one mesh per material, wheels welded to the frame. Cut every triangle that lies
   * inside a wheel (within its radius and the width of the tyre) out into its own piece around the axle, so the
   * wheels can turn. The wheels are found from the tyre material: two rings along the bike.
   */
  function freeWheels(root: THREE.Object3D) {
    root.updateMatrixWorld(true);
    const toRoot = root.matrixWorld.clone().invert(), world = new THREE.Vector3();
    let tyre: THREE.Mesh | undefined; root.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh && (m.material as THREE.Material).name === 'tyre') tyre = m; });
    if (!tyre) return;
    // The two tyres, in the root's own space: split along the bike's length.
    const tb = new THREE.Box3(), tp = tyre.geometry.attributes.position, pts: THREE.Vector3[] = [];
    for (let i = 0; i < tp.count; i++) pts.push(world.fromBufferAttribute(tp, i).applyMatrix4(tyre.matrixWorld).applyMatrix4(toRoot).clone());
    pts.forEach(p => tb.expandByPoint(p));
    const size = tb.getSize(new THREE.Vector3()), long = size.x > size.z ? 'x' : 'z', side = long === 'x' ? 'z' : 'x';
    const radius = size.y / 2, halfWidth = size[side] / 2 + .003;   // the tyre's width: brake callipers and fork stay put
    const centres = [tb.min[long] + radius, tb.max[long] - radius].map(v => { const c = tb.getCenter(new THREE.Vector3()); c[long] = v; return c; });
    wheelAxis.set(side === 'x' ? 1 : 0, 0, side === 'z' ? 1 : 0);
    const pivots = centres.map(c => { const g = new THREE.Group(); g.position.copy(c); root.add(g); wheels.push(g); return g; });
    const meshes: THREE.Mesh[] = []; root.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh) meshes.push(m); });
    for (const mesh of meshes) {
      const g = mesh.geometry, pos = g.attributes.position, index = g.index; if (!index) continue;
      const local = Array.from({ length: pos.count }, (_, i) => world.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(toRoot).clone());
      const whose = (p: THREE.Vector3) => centres.findIndex(c => Math.hypot(p[long] - c[long], p.y - c.y) < radius * 1.02 && Math.abs(p[side] - c[side]) < halfWidth);
      const keep: number[] = [], taken: number[][] = [[], []];
      for (let t = 0; t < index.count; t += 3) {
        const a = index.getX(t), b = index.getX(t + 1), c = index.getX(t + 2), w = whose(local[a]);
        if (w >= 0 && whose(local[b]) === w && whose(local[c]) === w) taken[w].push(a, b, c); else keep.push(a, b, c);
      }
      if (!taken[0].length && !taken[1].length) continue;
      g.setIndex(keep);
      taken.forEach((tris, w) => {
        if (!tris.length) return;
        // The wheel's own copy: its vertices moved into the axle's frame.
        const part = g.clone(); part.setIndex(tris);
        const p = part.attributes.position.clone(), inv = new THREE.Matrix4().makeTranslation(-centres[w].x, -centres[w].y, -centres[w].z).multiply(toRoot).multiply(mesh.matrixWorld);
        p.applyMatrix4(inv); part.setAttribute('position', p);
        if (part.attributes.normal) { const n = part.attributes.normal.clone(); n.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(inv)); part.setAttribute('normal', n); }
        const wheel = new THREE.Mesh(part, mesh.material); wheel.userData.exhibit = 'ebike'; wheel.receiveShadow = true; pivots[w].add(wheel);
      });
    }
  }

  /**
   * The SVJ's headlamps: a soft flare over each, lit when it flashes (the lamp units are mostly chrome). The white
   * lamp glass is at the back of this model, so the nose is the other end of the car; the lamps sit a little in
   * from it, towards the corners.
   */
  const flares: THREE.SpriteMaterial[] = [];
  function giveFlares(root: THREE.Object3D) {
    root.updateMatrixWorld(true);
    const toRoot = root.matrixWorld.clone().invert(), v = new THREE.Vector3(), car = new THREE.Box3(), rear = new THREE.Box3();
    root.traverse(n => {
      const m = n as THREE.Mesh; if (!m.isMesh) return; const p = m.geometry.attributes.position, white = (m.material as THREE.Material).name === 'glass_white';
      for (let i = 0; i < p.count; i += 7) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).applyMatrix4(toRoot); car.expandByPoint(v); if (white) rear.expandByPoint(v); }
    });
    if (car.isEmpty() || rear.isEmpty()) return;
    const size = car.getSize(new THREE.Vector3()), c = car.getCenter(new THREE.Vector3());
    const long = size.x > size.z ? 'x' : 'z', lat = long === 'x' ? 'z' : 'x';
    const back = Math.sign(rear.getCenter(new THREE.Vector3())[long] - c[long]) || 1;
    const tex = own(glowTexture());
    for (const sgn of [-1, 1]) {
      const at = c.clone(); at[long] = c[long] - back * (size[long] / 2 - .4); at[lat] = c[lat] + sgn * size[lat] * .29; at.y = car.min.y + .68;
      const m = own(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(2.4, 2.5, 2.7), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      const sprite = new THREE.Sprite(m); sprite.position.copy(at); sprite.scale.setScalar(.3); root.add(sprite); flares.push(m);
    }
  }

  /** K-2SO's eyes: two lenses on the front of his head, dark until you come close. */
  function giveEyes(root: THREE.Object3D, stage: Stage) {
    root.updateMatrixWorld(true);
    // His head is the part at the top: measure it in the world, along the way he faces.
    const head = new THREE.Box3(); const pts: THREE.Vector3[] = []; const v = new THREE.Vector3();
    root.traverse(n => { const m = n as THREE.Mesh; if (!m.isMesh) return; const b = new THREE.Box3().setFromObject(m); if (b.min.y > stage.lift + stage.height * .62 && b.max.y - b.min.y > .2) { head.union(b); const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i += 3) pts.push(v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).clone()); } });
    if (head.isEmpty() || !pts.length) return;
    const fwd = new THREE.Vector3(Math.cos(stage.yaw), 0, -Math.sin(stage.yaw)), lat = new THREE.Vector3(-fwd.z, 0, fwd.x), c = head.getCenter(new THREE.Vector3());
    const y = c.y - (head.max.y - head.min.y) * .02;
    // The face: the furthest forward points around eye height.
    let front = 0; for (const p of pts) if (Math.abs(p.y - y) < .05) front = Math.max(front, v.subVectors(p, c).dot(fwd));
    // Placed in the world, then carried by the piece (so it is compiled and printed with it).
    const group = new THREE.Group(); group.position.copy(c).addScaledVector(fwd, front - .012).setY(y);
    group.rotation.y = Math.atan2(fwd.x, fwd.z); group.updateMatrix();
    group.applyMatrix4(root.matrixWorld.clone().invert());
    eyes.glow = own(new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0), toneMapped: false }));
    eyes.halo = own(new THREE.SpriteMaterial({ color: new THREE.Color(.75, .9, 1), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, map: own(glowTexture()) }));
    const lens = own(new THREE.SphereGeometry(.017, 14, 10));
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(lens, eyes.glow); eye.position.set(s * .052, 0, 0); eye.scale.set(1, 1, .45); eye.userData.exhibit = 'k2so'; group.add(eye);
      const halo = new THREE.Sprite(eyes.halo); halo.position.set(s * .052, 0, .02); halo.scale.setScalar(.085); group.add(halo);
    }
    root.add(group); eyes.group = group; group.getWorldPosition(eyes.at);
  }
  function glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!;
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
  }

  /** Finishes the source files could not carry: the export marks every e-bike part fully metallic. */
  function dress(id: string, root: THREE.Object3D) {
    root.traverse(node => {
      const mesh = node as THREE.Mesh; if (!mesh.isMesh) return;
      const m = mesh.material as THREE.MeshStandardMaterial; const name = m.name;
      // Nothing here is glass: a converter's stray transmission would make three.js draw the room twice a frame.
      if ((m as THREE.MeshPhysicalMaterial).transmission) (m as THREE.MeshPhysicalMaterial).transmission = 0;
      if (id === 'k2so') Object.assign(m, { metalness: .45, envMapIntensity: 1.1 });
      else if (id === 'svj') {
        // His own paint: deep blue metallic under a clear coat; glass that reflects; lamps that are lit.
        const coat = (color: string, metalness = .55, roughness = .3) => own(new THREE.MeshPhysicalMaterial({ name, color, metalness, roughness, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.4 }));
        const glass = (color: string, opacity: number, glowRGB?: [number, number, number]) => { const g = own(new THREE.MeshPhysicalMaterial({ name, color, metalness: 0, roughness: .02, transparent: true, opacity, depthWrite: false, envMapIntensity: 1.8 })); if (glowRGB) g.emissive.setRGB(...glowRGB); return g; };
        // The roof, sills, mirrors, splitter and window frames are carbon on the real car: glossy black
        // under clear coat, not the grey a plain rough plastic gave them. The cabin is black leather.
        const swap: Record<string, () => THREE.Material> = {
          carpaint: () => coat('#0c2552'), blackpaint: () => coat('#0a0a0b', .3, .25), paint_red: () => coat('#b8141a', .3, .3), paint_white: () => coat('#e9ebec', .1, .3), paint_green: () => coat('#1f8a3e', .3, .3),
          plastic_reflect: () => coat('#08090b', .35, .28), blackpaint_matte: () => coat('#0b0c0e', .2, .45),
          plastic_matte_black: () => coat('#0b0c0d', .1, .55), plastic_matte_midblack: () => coat('#101113', .1, .5),
          leather: () => own(new THREE.MeshPhysicalMaterial({ name, color: '#121317', roughness: .62, sheen: .6, sheenColor: new THREE.Color('#3a4a6a'), sheenRoughness: .5 })),
          glass_window: () => glass('#07090b', .42), glass_clear: () => glass('#0c0f11', .25), glass_white: () => glass('#e8eef2', .7, [.55, .6, .66]),
          glass_orange: () => glass('#ff9a3c', .8, [.9, .42, .08]), glass_red: () => glass('#d8121a', .85, [.8, .04, .03]),
        };
        if (swap[name]) {
          mesh.material = swap[name]();
          // The lamps it flashes when you click it.
          if (/glass_white|glass_orange|glass_red/.test(name)) { const lamp = mesh.material as THREE.MeshPhysicalMaterial; lamps.push({ m: lamp, base: lamp.emissive.clone(), kind: name === 'glass_white' ? 'head' : name === 'glass_orange' ? 'turn' : 'tail' }); }
        }
        else if (/chrome|mirror/.test(name)) Object.assign(m, { metalness: 1, roughness: name === 'mirror' ? .04 : .12 }), m.color.set(name === 'chrome_grey' ? '#7c8085' : '#d4d8dc');
        else if (/rim|brakedisk|metal/.test(name)) Object.assign(m, { metalness: .85, roughness: .35 }), m.color.set('#8d9197');
        else if (name === 'rubber') Object.assign(m, { metalness: 0, roughness: .92 }), m.color.set('#121212');
        else Object.assign(m, { metalness: .1, roughness: .6 });
      } else if (id === 'plant') {
        // The rack and shades in dark steel, the leaves a deep green that takes the warm light.
        if (name === 'wire_088144225') Object.assign(m, { metalness: .6, roughness: .45 }), m.color.set('#1d2120');
        else { Object.assign(m, { metalness: 0, roughness: .72, side: THREE.DoubleSide }); m.color.set('#3c7a4b'); }
      }
      else if (id === 'house') {
        // A white architectural model: one white, dark glass, the house's own green accent, dark steel.
        if (/Arch_Glass/.test(name)) { mesh.material = own(new THREE.MeshPhysicalMaterial({ name, color: '#14302a', emissive: '#ffb869', emissiveIntensity: 0, roughness: .05, metalness: .1, transparent: true, opacity: .6, depthWrite: false, envMapIntensity: 1.5 })); windows.push(mesh.material as THREE.MeshPhysicalMaterial); }
        else if (/Material #192/.test(name)) Object.assign(m, { metalness: 0, roughness: .6 }), m.color.set('#3f9e72');
        else if (/steel2|Exposed 910/.test(name)) Object.assign(m, { metalness: .2, roughness: .6 }), m.color.set('#2b2e2d');
        else Object.assign(m, { metalness: 0, roughness: .88 }), m.color.set('#eeebe4');
      } else if (id === 'sofa') {
        // The textures never made it into the archive; the set is dressed in the room's palette instead.
        const velvet = (color: string, sheen: string) => own(new THREE.MeshPhysicalMaterial({ name, color, roughness: .82, sheen: 1, sheenColor: new THREE.Color(sheen), sheenRoughness: .42 }));
        const fabric = (color: string) => own(new THREE.MeshPhysicalMaterial({ name, color, roughness: .95, sheen: .45, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: .8 }));
        const swap: Record<string, () => THREE.Material> = {
          'Material #7100': () => velvet('#23402f', '#7fc6a0'), 'Material #7087': () => velvet('#1a3226', '#5fa07e'),
          'Material #7024': () => fabric('#d9cfbb'), 'Material #7137': () => fabric('#b8764f'), 'Material #7162': () => velvet('#2f5a47', '#8fd0b0'),
          'Material #7136': () => fabric('#cbbfa6'),
        };
        if (swap[name]) mesh.material = swap[name]();
        else if (dressLounge(mesh, own, o.mobile)) { /* rug, marble, walnut, linen, print, ceramic, glass */ }
        else if (name === 'Material #7022') Object.assign(m, { metalness: 0, roughness: .5 }), m.color.set('#aeaba4');
        else if (/Chrome|Nickel|Brass|Material #698|Material #6975/.test(name)) Object.assign(m, { metalness: .85, roughness: .3 }), m.color.set(/Brass/.test(name) ? '#b08a4a' : '#1a1a1a');
        else Object.assign(m, { roughness: Math.max(.35, m.roughness) });
        if (name === 'Material #7160') mesh.receiveShadow = true;
      } else if (name === 'bicycles_Decal') Object.assign(m, { transparent: false, alphaTest: .5, depthWrite: true, metalness: .3, roughness: .4 });
      else if (name === 'tyre') Object.assign(m, { metalness: 0, roughness: .9 });
      else if (name === 'Copper') Object.assign(m, { metalness: .9, roughness: .3 });
      else Object.assign(m, { metalness: .35, roughness: .38 });
      // No real-time shadows from the exhibits: their contact shadows do that job, and each caster costs a shadow pass and shader variants.
      mesh.castShadow = false; mesh.receiveShadow = true; mesh.userData.exhibit = id;
    });
  }

  function shown(id: string) { return slots.find(s => s.stage.info.id === id)?.state === 'shown'; }
  const frame = () => new Promise<void>(r => requestAnimationFrame(() => r()));
  let disposed = false;
  const lounge: { sofa?: THREE.Box3; table?: THREE.Box3 } = {};
  /** Stream the pieces in one after another, each uploaded and compiled before it appears. */
  async function load() {
    for (const slot of slots) {
      if (disposed) return;
      try {
        // Phones get their own files: textures at most 1024 px and about half the triangles.
        const gltf = await loader.loadAsync(mobile ? slot.stage.url.replace(/\.glb$/, '.mobile.glb') : slot.stage.url); if (disposed) return;
        const root = gltf.scene; dress(slot.stage.info.id, root);
        root.position.y = slot.stage.lift;
        // Parts that move on their own are cut out while the piece stands in place (not yet drawn).
        if (['ebike', 'k2so', 'svj'].includes(slot.stage.info.id)) {
          slot.spinner.rotation.y = slot.angle; slot.spinner.add(root); slot.spinner.updateMatrixWorld(true);
          try { const id = slot.stage.info.id; if (id === 'ebike') freeWheels(root); else if (id === 'k2so') giveEyes(root, slot.stage); else giveFlares(root); } catch (error) { console.warn('Exhibit parts', error); }
          slot.spinner.remove(root);
        }
        const textures = new Set<THREE.Texture>();
        root.traverse(node => {
          const mesh = node as THREE.Mesh; if (!mesh.isMesh) return;
          meshes.push(mesh);
          for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            printable(mat, slot.clip);
            for (const v of Object.values(mat)) if (v instanceof THREE.Texture) textures.add(v);
          }
        });
        for (const t of textures) { renderer.initTexture(t); await frame(); }
        // Compile before the piece joins the scene (a drawn-but-uncompiled mesh blocks the frame), and for the
        // target the frame is drawn into: the post-processing buffer, not the canvas.
        slot.clip.value = -1;
        const previous = renderer.getRenderTarget(); renderer.setRenderTarget(o.target?.() ?? previous);
        const compiling = renderer.compileAsync(root, camera as THREE.PerspectiveCamera, scene).catch(() => {});
        renderer.setRenderTarget(previous); await compiling;
        if (disposed) return;
        slot.spinner.add(root);
        if (slot.stage.stand === 'lounge') {
          // Walls you cannot walk through: the sofa itself and the coffee table, measured once they stand in the room.
          // The coffee table stood 16 cm from the seat: pull it (and everything on it) half a metre into the
          // room, so there is legroom and a way to the seat. The set is turned half round, so world -z is local +z.
          const onTable = /CI_|Decanter|Elliot|#7022|Chrome|Nickel/;
          root.traverse(node => { const mesh = node as THREE.Mesh; if (mesh.isMesh && onTable.test((mesh.material as THREE.Material).name)) mesh.position.z += .5; });
          root.updateMatrixWorld(true);
          const sofaBox = new THREE.Box3(), tableBox = new THREE.Box3();
          root.traverse(node => {
            const mesh = node as THREE.Mesh; if (!mesh.isMesh) return; const n = (mesh.material as THREE.Material).name;
            if (/#7100|#7087|#7024|#7137|#7162|#7136|#698|#6975/.test(n)) sofaBox.expandByObject(mesh);
            else if (/#7022|Chrome/.test(n)) tableBox.expandByObject(mesh);
          });
          if (!sofaBox.isEmpty()) { colliders.push(sofaBox); lounge.sofa = sofaBox; }
          if (!tableBox.isEmpty()) { colliders.push(tableBox); lounge.table = tableBox; }
        }
        slot.state = 'revealing'; slot.scan.visible = true; o.onReveal?.(slot.stage.info.id);
        await new Promise(r => setTimeout(r, 1600));
      } catch (error) { console.warn('Exhibit could not load', slot.stage.url, error); }
    }
  }

  const svjAt = STAGES[0].at, cue = (c: ExhibitCue) => o.onCue?.(c);
  updates.push((t, dt) => {
    now = t; const cam = o.camera.position;
    // The SVJ: its engine wakes with a low growl as you walk up; clicked, it flashes its lamps.
    const toCar = Math.hypot(cam.x - svjAt.x, cam.z - svjAt.z);
    if (!engineNear && toCar < 4.4 && shown('svj')) { engineNear = true; cue('engine'); } else if (engineNear && toCar > 6.2) engineNear = false;
    const f = t - flashAt;
    if (lamps.length && f < 2) {
      const head = f < .22 || (f > .4 && f < .62) ? 12 : 1, turn = f < 1.6 && (f % .5) < .26 ? 10 : 1, tail = f < .8 ? 4 : 1;
      for (const l of lamps) l.m.emissive.copy(l.base).multiplyScalar(l.kind === 'head' ? head : l.kind === 'turn' ? turn : tail);
      for (const m of flares) m.opacity = head > 1 ? .95 : 0;
    }
    // K-2SO: his eyes come on, with a flicker, when you stand close; they go dark when you leave.
    if (eyes.glow && eyes.halo) {
      const d = cam.distanceTo(eyes.at);
      if (!eyes.on && d < 3.7 && shown('k2so')) { eyes.on = true; eyes.flicker = t; cue('eyes'); } else if (eyes.on && d > 4.8) eyes.on = false;
      eyes.k += ((eyes.on ? 1 : 0) - eyes.k) * Math.min(1, dt * (eyes.on ? 3 : 1.2));
      const warm = t - eyes.flicker < .55 && eyes.on ? (Math.sin(t * 90) > .1 ? 1 : .15) : 1, k = eyes.k * warm;
      eyes.glow.color.setRGB(.05 + 2.2 * k, .07 + 2.7 * k, .09 + 3.2 * k); eyes.halo.opacity = .7 * k;
    }
    // The e-bike's wheels turn while you point at it.
    wheelSpeed += ((hovered === 'ebike' ? 1 : 0) - wheelSpeed) * Math.min(1, dt * 1.6);
    if (wheelSpeed > .001) for (const w of wheels) w.rotateOnAxis(wheelAxis, -wheelSpeed * 6 * dt);
    // The house model's windows, lit and put out by a click.
    lightsK += ((lightsOn ? 1 : 0) - lightsK) * Math.min(1, dt * 2.5);
    for (const m of windows) { m.emissiveIntensity = 2.6 * lightsK; m.opacity = .6 + .32 * lightsK; }
    for (const slot of slots) {
      if (slot.stage.spin && !slot.paused) slot.angle += slot.stage.spin * dt;
      slot.spinner.rotation.y = slot.angle;
      if (slot.state === 'revealing') {
        slot.reveal = Math.min(1, slot.reveal + dt / 2.2);
        const k = 1 - Math.pow(1 - slot.reveal, 2), h = slot.stage.lift - .05 + k * (slot.stage.height + .1);
        slot.clip.value = h; slot.scan.position.y = h;
        slot.scan.material.uniforms.uGain.value = Math.sin(Math.PI * Math.min(1, slot.reveal * 1.15)) * 1.6;
        if (slot.reveal >= 1) { slot.state = 'shown'; slot.clip.value = 1e4; slot.scan.visible = false; }
      }
    }
  });

  return {
    colliders, meshes, lounge,
    load,
    /** Whether a piece has been printed into the room yet. */
    shown,
    /** A click on a piece: the SVJ flashes its lamps and revs, the house model's windows light up (or go out). */
    poke(id: string) {
      if (id === 'svj' && shown('svj')) { flashAt = now; cue('rev'); }
      else if (id === 'house' && windows.length) { lightsOn = !lightsOn; cue(lightsOn ? 'lights-on' : 'lights-off'); }
    },
    /** The piece under the pointer (or the crosshair), if any. */
    hover(id: string | null) { hovered = id; },
    update(t: number, dt: number) { for (const u of updates) u(t, dt); },
    /** Hold a piece still while it is being inspected. */
    hold(id: string | null) { for (const slot of slots) slot.paused = slot.stage.info.id === id; },
    info(id: string) { return EXHIBITS.find(e => e.id === id) ?? KITCHEN; },
    /** The piece you are looking at: close, and near the middle of the view. */
    inView(position: THREE.Vector3, forward: THREE.Vector3) {
      let best: ExhibitInfo = KITCHEN, score = Infinity;
      for (const e of EXHIBITS) {
        const d = new THREE.Vector3().subVectors(e.focus, position); const dist = d.length();
        const angle = d.normalize().angleTo(forward);
        const s = angle * 2.2 + dist * .09;
        if (angle < .75 && s < score) { score = s; best = e; }
      }
      return best;
    },
    dispose() { disposed = true; disposables.forEach(d => d.dispose()); },
  };
}
