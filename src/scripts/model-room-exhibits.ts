// The Model Room's collection beyond the kitchen: each piece shown the way its kind is shown in the
// world. The e-bike turns on a showroom turntable, the droid stands on a museum pedestal like a
// sculpture. Every stand has its own downlights, a
// green glow on the floor and a lit lectern. The models stream in after the room has opened and are
// "printed" into the room by a rising green scan line.
import * as THREE from 'three';
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type Lang = { en: string; de: string };
export type ExhibitInfo = {
  id: string; no: string; kind: Lang; title: string; sub: Lang; text: Lang;
  /** What the inspection orbit looks at, and from how far. */
  focus: THREE.Vector3; distance: number;
};

export const KITCHEN: ExhibitInfo = {
  id: 'kitchen', no: '001', kind: { en: 'Material study', de: 'Materialstudie' }, title: 'White & Wood',
  sub: { en: 'Kitchen Modern 25', de: 'Kitchen Modern 25' },
  text: { en: 'Oak, stone and brushed metal.\nA study in light, proportion and construction.', de: 'Eiche, Stein und gebürstetes Metall.\nEine Studie über Licht, Proportion und Konstruktion.' },
  focus: new THREE.Vector3(0, 1.65, -3.5), distance: 9,
};

type Stage = {
  info: ExhibitInfo; url: string; stand: 'turntable' | 'pedestal' | 'table' | 'lounge';
  at: THREE.Vector3; lift: number; spin: number; yaw: number; reach: number; height: number;
  lectern: { x: number; z: number; face: number; title: string; line: string };
};

const STAGES: Stage[] = [
  {
    info: {
      id: 'ebike', no: '002', kind: { en: 'Vehicle', de: 'Fahrzeug' }, title: 'e-bike',
      sub: { en: 'Audi e-bike, low poly', de: 'Audi e-bike, Low Poly' },
      text: { en: 'A real-time study: the whole bike\nin fewer than nine thousand triangles.', de: 'Eine Echtzeitstudie: das ganze Rad\nin weniger als neuntausend Dreiecken.' },
      focus: new THREE.Vector3(-3.2, .75, 2.6), distance: 3.9,
    },
    url: '/models/exhibits/audi-ebike.glb', stand: 'turntable', at: new THREE.Vector3(-3.2, 0, 2.6), lift: .14, spin: .16, yaw: 0, reach: 1.55, height: 1.2,
    lectern: { x: -5.35, z: 1.05, face: .65, title: 'E-BIKE', line: 'EXHIBIT 002  ·  AUDI  ·  LOW POLY' },
  },
  {
    info: {
      id: 'k2so', no: '003', kind: { en: 'Character', de: 'Figur' }, title: 'K-2SO',
      sub: { en: 'Star Wars droid, fan study', de: 'Star-Wars-Droide, Fan-Studie' },
      text: { en: 'Hard-surface detail, textured for close inspection.\nOn a pedestal, like a sculpture.', de: 'Hard-Surface-Details, für die Nahansicht texturiert.\nAuf einem Sockel, wie eine Skulptur.' },
      focus: new THREE.Vector3(4.8, 1.6, .4), distance: 4.4,
    },
    url: '/models/exhibits/k2so.glb', stand: 'pedestal', at: new THREE.Vector3(4.8, 0, .4), lift: .5, spin: 0, yaw: -.75, reach: .75, height: 2.8,
    lectern: { x: 6.1, z: 1.25, face: -.45, title: 'K-2SO', line: 'EXHIBIT 003  ·  CHARACTER  ·  FAN STUDY' },
  },
  {
    info: {
      id: 'house', no: '004', kind: { en: 'Architecture', de: 'Architektur' }, title: 'ABS House',
      sub: { en: 'V176, three variants', de: 'V176, drei Varianten' },
      text: { en: 'A two-storey house in three variants,\nshown as a white architectural model.', de: 'Ein zweigeschossiges Haus in drei Varianten,\nals weißes Architekturmodell.' },
      focus: new THREE.Vector3(5.5, .95, 5.2), distance: 2.6,
    },
    url: '/models/exhibits/abs-house.glb', stand: 'table', at: new THREE.Vector3(5.5, 0, 5.2), lift: .845, spin: 0, yaw: Math.PI / 2, reach: .9, height: .3,
    lectern: { x: 4.25, z: 3.9, face: -1.05, title: 'ABS HOUSE', line: 'EXHIBIT 004  ·  ARCHITECTURE  ·  1:15' },
  },
  {
    info: {
      id: 'sofa', no: '005', kind: { en: 'Furniture', de: 'Möbel' }, title: 'Lounge',
      sub: { en: 'Vavicci Sofa C and its set', de: 'Vavicci Sofa C mit Ensemble' },
      text: { en: 'Velvet, linen and a knitted throw.\nThe astronaut rests here and waits for you.', de: 'Samt, Leinen und ein Strickplaid.\nHier ruht der Astronaut und wartet auf Sie.' },
      focus: new THREE.Vector3(-5.3, .6, 9.55), distance: 4.6,
    },
    url: '/models/exhibits/sofa.glb', stand: 'lounge', at: new THREE.Vector3(-5.3, 0, 9.55), lift: 0, spin: 0, yaw: Math.PI, reach: 1.9, height: 1,
    lectern: { x: -3.05, z: 7.55, face: .8, title: 'LOUNGE', line: 'EXHIBIT 005  ·  FURNITURE  ·  VAVICCI' },
  },
];
export const EXHIBITS: ExhibitInfo[] = [KITCHEN, ...STAGES.map(s => s.info)];

const ringVertex = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
// A soft green halo on the floor around a stand, or (as the scan) a thin bright ring.
const ringFragment = /* glsl */`uniform float uR, uWidth, uGain, uFill; uniform vec3 uColor; varying vec2 vUv;
void main(){ float d = length(vUv - .5) * 2.; float ring = exp(-pow((d - uR) / uWidth, 2.)); float fill = exp(-d * d / (uR * uR * .6)) * uFill;
  gl_FragColor = vec4(uColor * (ring + fill) * uGain * smoothstep(1., .9, d), 1.); }`;

export function createExhibits(o: { scene: THREE.Scene; renderer: THREE.WebGLRenderer; camera: THREE.Camera; mobile: boolean; loader: GLTFLoader; onReveal?: (id: string) => void }) {
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
    const spot = new THREE.SpotLight('#ffe6c8', mobile ? intensity * .8 : intensity, 13, angle, .85, 2); spot.position.set(x, 5.55, z);
    spot.target.position.copy(target); scene.add(spot, spot.target);
  }
  function halo(x: number, z: number, radius: number, gain: number) {
    const size = radius * 2 + 2.4;
    const m = own(new THREE.ShaderMaterial({ uniforms: { uR: { value: radius / (size / 2) }, uWidth: { value: .09 }, uGain: { value: gain }, uFill: { value: .12 }, uColor: { value: new THREE.Color(.25, 1, .6) } }, vertexShader: ringVertex, fragmentShader: ringFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const plane = new THREE.Mesh(own(new THREE.PlaneGeometry(size, size)), m); plane.rotation.x = -Math.PI / 2; plane.position.set(x, .006, z); scene.add(plane);
    return m;
  }
  function lectern(l: Stage['lectern']) {
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

  type Slot = { stage: Stage; spinner: THREE.Group; clip: THREE.Plane; scan: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; reveal: number; state: 'waiting' | 'revealing' | 'shown'; paused: boolean; angle: number };
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
    if (stage.stand === 'turntable') shade.scale.set(.8, 2.2, 1); else if (stage.stand === 'table') shade.scale.set(1.45, .5, 1); else shade.scale.set(.95, .95, 1);
    shade.visible = stage.stand !== 'lounge';   // the rug is its own ground
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
        const spot = new THREE.SpotLight('#fff1e0', mobile ? 44 : 56, 13, .5, .9, 2); spot.position.set(at.x + dx, 5.55, at.z); spot.target.position.set(at.x + dx * .3, .6, at.z); scene.add(spot, spot.target);
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
      // The waiting corner by the entrance: a warm pendant over the coffee table. Its collider comes from the sofa once loaded.
      const shadeMat = own(new THREE.MeshStandardMaterial({ color: '#1b1f1d', metalness: .6, roughness: .4, side: THREE.DoubleSide }));
      const pendant = new THREE.Mesh(own(new THREE.ConeGeometry(.32, .26, 40, 1, true)), shadeMat); pendant.position.set(at.x + .4, 2.35, at.z - .6); scene.add(pendant);
      const cord = new THREE.Mesh(stem, bronze); cord.scale.y = 4; cord.position.set(at.x + .4, 4.45, at.z - .6); scene.add(cord);
      const bulb = new THREE.Mesh(own(new THREE.SphereGeometry(.05, 16, 12)), lens); bulb.position.set(at.x + .4, 2.26, at.z - .6); scene.add(bulb);
      const lamp = new THREE.PointLight('#ffc98f', mobile ? 5 : 6, 5.5, 2); lamp.position.set(at.x + .4, 2.1, at.z - .6); scene.add(lamp);
      downlight(at.x - .8, at.z - 1.6, new THREE.Vector3(at.x, .4, at.z), 26, .6);
    } else {
      // Museum pedestal: dark stone, a bronze cap, a green line of light at its foot; a spot from above and a rim light.
      const block = new THREE.Mesh(own(new THREE.BoxGeometry(1.1, .44, 1.1)), stone); block.position.set(at.x, .22, at.z); block.castShadow = block.receiveShadow = true; scene.add(block);
      const cap = new THREE.Mesh(own(new THREE.BoxGeometry(1.16, .06, 1.16)), bronze); cap.position.set(at.x, .47, at.z); cap.receiveShadow = true; scene.add(cap);
      const line = new THREE.Mesh(own(new THREE.BoxGeometry(1.14, .012, 1.14)), glow); line.position.set(at.x, .015, at.z); scene.add(line);
      downlight(at.x - .9, at.z + 1.2, new THREE.Vector3(at.x, 1.7, at.z), 48, .34);
      const rim = new THREE.PointLight('#7fe8b0', 7, 4.5, 2); rim.position.set(at.x + .9, 2.6, at.z - 1); scene.add(rim);
      halo(at.x, at.z, .95, .45);
      colliders.push(new THREE.Box3(new THREE.Vector3(at.x - .58, 0, at.z - .58), new THREE.Vector3(at.x + .58, 2.5, at.z + .58)));
    }
    lectern(stage.lectern);
    // The scan: a bright ring that climbs the piece as it is printed into the room.
    const size = reach * 2 + 1.2;
    const sm = own(new THREE.ShaderMaterial({ uniforms: { uR: { value: (reach + .1) / (size / 2) }, uWidth: { value: .025 }, uGain: { value: 0 }, uFill: { value: .5 }, uColor: { value: new THREE.Color(.35, 1.4, .8) } }, vertexShader: ringVertex, fragmentShader: ringFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    const scan = new THREE.Mesh(own(new THREE.PlaneGeometry(size, size)), sm); scan.rotation.x = -Math.PI / 2; scan.position.set(at.x, 0, at.z); scan.visible = false; scene.add(scan);
    slots.push({ stage, spinner, clip: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), scan, reveal: 0, state: 'waiting', paused: false, angle: stage.yaw });
  }

  /** Finishes the source files could not carry: the export marks every e-bike part fully metallic. */
  function dress(id: string, root: THREE.Object3D) {
    root.traverse(node => {
      const mesh = node as THREE.Mesh; if (!mesh.isMesh) return;
      const m = mesh.material as THREE.MeshStandardMaterial; const name = m.name;
      if (id === 'k2so') Object.assign(m, { metalness: .45, envMapIntensity: 1.1 });
      else if (id === 'house') {
        // A white architectural model: one white, dark glass, the house's own green accent, dark steel.
        if (/Arch_Glass/.test(name)) mesh.material = own(new THREE.MeshPhysicalMaterial({ name, color: '#14302a', roughness: .05, metalness: .1, transparent: true, opacity: .6, depthWrite: false, envMapIntensity: 1.5 }));
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
          'Material #7136': () => fabric('#cbbfa6'), 'Material #7160': () => fabric('#1e2426'),
        };
        if (swap[name]) mesh.material = swap[name]();
        else if (name === 'Material #7022') Object.assign(m, { metalness: 0, roughness: .5 }), m.color.set('#aeaba4');
        else if (/Chrome|Nickel|Brass|Material #698|Material #6975/.test(name)) Object.assign(m, { metalness: .85, roughness: .3 }), m.color.set(/Brass/.test(name) ? '#b08a4a' : '#1a1a1a');
        else Object.assign(m, { roughness: Math.max(.35, m.roughness) });
        if (name === 'Material #7160') mesh.receiveShadow = true;
      } else if (name === 'bicycles_Decal') Object.assign(m, { transparent: false, alphaTest: .5, depthWrite: true, metalness: .3, roughness: .4 });
      else if (name === 'tyre') Object.assign(m, { metalness: 0, roughness: .9 });
      else if (name === 'Copper') Object.assign(m, { metalness: .9, roughness: .3 });
      else Object.assign(m, { metalness: .35, roughness: .38 });
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.exhibit = id;
    });
  }

  const frame = () => new Promise<void>(r => requestAnimationFrame(() => r()));
  let disposed = false;
  const lounge: { sofa?: THREE.Box3; table?: THREE.Box3 } = {};
  /** Stream the pieces in one after another, each uploaded and compiled before it appears. */
  async function load() {
    for (const slot of slots) {
      if (disposed) return;
      try {
        const gltf = await loader.loadAsync(slot.stage.url); if (disposed) return;
        const root = gltf.scene; dress(slot.stage.info.id, root);
        root.position.y = slot.stage.lift;
        const textures = new Set<THREE.Texture>();
        root.traverse(node => {
          const mesh = node as THREE.Mesh; if (!mesh.isMesh) return;
          meshes.push(mesh);
          for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            mat.clippingPlanes = [slot.clip]; mat.clipShadows = true;
            for (const v of Object.values(mat)) if (v instanceof THREE.Texture) textures.add(v);
          }
        });
        for (const t of textures) { renderer.initTexture(t); await frame(); }
        slot.clip.constant = -1; slot.spinner.add(root);
        if (slot.stage.stand === 'lounge') {
          // Walls you cannot walk through: the sofa itself and the coffee table, measured once they stand in the room.
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
        await renderer.compileAsync(slot.spinner, camera as THREE.PerspectiveCamera, scene).catch(() => {});
        if (disposed) return;
        slot.state = 'revealing'; slot.scan.visible = true; o.onReveal?.(slot.stage.info.id);
        await new Promise(r => setTimeout(r, 1600));
      } catch (error) { console.warn('Exhibit could not load', slot.stage.url, error); }
    }
  }

  updates.push((t, dt) => {
    for (const slot of slots) {
      if (slot.stage.spin && !slot.paused) slot.angle += slot.stage.spin * dt;
      slot.spinner.rotation.y = slot.angle;
      if (slot.state === 'revealing') {
        slot.reveal = Math.min(1, slot.reveal + dt / 2.2);
        const k = 1 - Math.pow(1 - slot.reveal, 2), h = slot.stage.lift - .05 + k * (slot.stage.height + .1);
        slot.clip.constant = h; slot.scan.position.y = h;
        slot.scan.material.uniforms.uGain.value = Math.sin(Math.PI * Math.min(1, slot.reveal * 1.15)) * 1.6;
        if (slot.reveal >= 1) { slot.state = 'shown'; slot.clip.constant = 1e4; slot.scan.visible = false; }
      }
    }
  });

  return {
    colliders, meshes, lounge,
    load,
    /** Whether a piece has been printed into the room yet. */
    shown(id: string) { return slots.find(s => s.stage.info.id === id)?.state === 'shown'; },
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
