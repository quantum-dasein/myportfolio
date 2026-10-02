// The archive terminal by the entrance: a waist-high screen on a post, like the info points in games.
// It wakes as you come close, counts up to the number of models Rodion has built, and draws them as a
// field of a thousand dots in which the seven standing in this room glow. Clicked (or tapped), it opens
// the searchable archive, where a selected work appears on the room's display stage.
import * as THREE from 'three';
import { projectFacts } from '../data/projectFacts';
import { createArchiveCatalog, type ArchiveCatalogOptions } from './model-room-catalog';

const CATEGORIES = {
  en: ['INTERIORS', 'VEHICLES', 'CHARACTERS', 'ARCHITECTURE', 'FURNITURE', 'PRODUCT', 'LIGHTING'],
  de: ['INTERIEURS', 'FAHRZEUGE', 'FIGUREN', 'ARCHITEKTUR', 'MÖBEL', 'PRODUKTE', 'LEUCHTEN'],
};
const HERE = 7;   // pieces in the room: kitchen, SVJ, K-2SO, e-bike, house, lounge, hanging garden

export function createKiosk(o: { scene: THREE.Scene; camera: THREE.Camera; root: HTMLElement; de: () => boolean; coarse: boolean; at: THREE.Vector3; face: number; onOpen?: () => void; onClose?: () => void; archive: ArchiveCatalogOptions }) {
  const { scene, camera } = o;
  const font = getComputedStyle(o.root).fontFamily;
  const disposables: { dispose: () => void }[] = [];
  const own = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const group = new THREE.Group(); group.position.copy(o.at); group.rotation.y = o.face; scene.add(group);

  const bronze = own(new THREE.MeshStandardMaterial({ color: '#6b5238', metalness: .85, roughness: .32 }));
  const stone = own(new THREE.MeshStandardMaterial({ color: '#141918', metalness: .2, roughness: .5 }));
  const glow = own(new THREE.MeshBasicMaterial({ color: new THREE.Color(.35, 2.1, 1.1), toneMapped: false }));
  const base = new THREE.Mesh(own(new THREE.CylinderGeometry(.26, .28, .03, 40)), bronze); base.position.y = .015; group.add(base);
  const ring = new THREE.Mesh(own(new THREE.TorusGeometry(.285, .006, 6, 60)), glow); ring.rotation.x = Math.PI / 2; ring.position.y = .03; group.add(ring);
  const post = new THREE.Mesh(own(new THREE.BoxGeometry(.06, .96, .06)), bronze); post.position.y = .5; group.add(post);
  // The head: a square slab tilted back towards the visitor, the screen set into its face.
  const tilt = -.5, headY = 1.08;
  const head = new THREE.Mesh(own(new THREE.BoxGeometry(.62, .62, .05)), stone); head.position.y = headY; head.rotation.x = tilt; group.add(head);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512; const x = canvas.getContext('2d')!;
  const tex = own(new THREE.CanvasTexture(canvas)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const screenMat = own(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.4, 1.45, 1.4) }));
  const screen = new THREE.Mesh(own(new THREE.PlaneGeometry(.56, .56)), screenMat);
  screen.position.set(0, headY + .027 * Math.sin(-tilt), .027 * Math.cos(tilt)); screen.rotation.x = tilt; group.add(screen);
  const edge = new THREE.Mesh(own(new THREE.BoxGeometry(.62, .008, .008)), glow); edge.position.set(0, headY - .31 * Math.cos(tilt), -.31 * Math.sin(tilt) + .03); edge.rotation.x = tilt; group.add(edge);
  for (const m of [head, screen]) m.userData.kiosk = true;

  // A thousand dots, one per model; seven of them (the pieces in this room) glow.
  let seed = 11; const rnd = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  const special = new Set<number>(); while (special.size < HERE) special.add(Math.floor(rnd() * 1000));
  const order = Array.from({ length: 1000 }, (_, i) => i).sort(() => rnd() - .5);   // the field fills in a scattered order
  const rank = new Array<number>(1000); order.forEach((dot, i) => { rank[dot] = i; });

  let wake = 0, count = 1000, drawnAt = -1, awakeSince = -1;
  function draw(t: number) {
    const de = o.de(), lit = count / 1000;
    x.fillStyle = '#050e0b'; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = `rgba(120,255,190,${.25 + .35 * wake})`; x.lineWidth = 3; x.strokeRect(10, 10, 492, 492);
    x.fillStyle = `rgba(150,255,205,${.5 + .4 * wake})`; x.font = `500 19px ${font}`; x.textAlign = 'left';
    x.fillText(de ? 'DAS ARCHIV HINTER DEM RAUM' : 'THE ARCHIVE BEHIND THE ROOM', 34, 52);
    const done = count >= 1000, figure = done ? (de ? projectFacts.modelsBuilt.de ?? projectFacts.modelsBuilt.value : projectFacts.modelsBuilt.value) : String(Math.floor(count));
    x.fillStyle = '#f2fff8'; x.font = `500 104px ${font}`; x.fillText(figure, 30, 158);
    x.fillStyle = 'rgba(220,245,232,.8)'; x.font = `400 24px ${font}`;
    x.fillText(de ? 'Modelle, von Hand gebaut' : 'models, built by hand', 34, 196);
    // The field.
    const cols = 50, gx = 40, gy = 232, step = 8.8;
    for (let i = 0; i < 1000; i++) {
      const cx = gx + (i % cols) * step, cy = gy + Math.floor(i / cols) * step;
      if (special.has(i) && done) {
        const pulse = .6 + .4 * Math.sin(t * 3 + i);
        x.fillStyle = `rgba(90,255,170,${pulse})`; x.beginPath(); x.arc(cx, cy, 3.6, 0, 7); x.fill();
      } else {
        const on = rank[i] / 1000 < lit;
        x.fillStyle = on ? 'rgba(215,235,226,.55)' : 'rgba(215,235,226,.1)'; x.fillRect(cx - 1.4, cy - 1.4, 2.8, 2.8);
      }
    }
    // The categories, one after another.
    const cats = CATEGORIES[de ? 'de' : 'en'], k = Math.floor(t / 1.6) % cats.length;
    x.fillStyle = 'rgba(150,255,205,.85)'; x.font = `500 19px ${font}`;
    x.fillText(`${String(k + 1).padStart(2, '0')} / ${cats[k]}`, 34, 438);
    x.fillStyle = `rgba(242,255,248,${.55 + .45 * Math.sin(t * 2.4) ** 2})`; x.font = `500 21px ${font}`;
    x.fillText(de ? 'Beispiele & Modelle nach Maß →' : 'Examples & custom 3D models →', 34, 478);
    tex.needsUpdate = true;
  }

  const catalog = createArchiveCatalog({ ...o.archive, root: o.root, de: o.de, onOpen: o.onOpen, onClose: o.onClose });

  return {
    targets: [head, screen] as THREE.Object3D[],
    collider: new THREE.Box3(new THREE.Vector3(o.at.x - .32, 0, o.at.z - .32), new THREE.Vector3(o.at.x + .32, 1.4, o.at.z + .32)),
    open: catalog.open, close: catalog.close, isOpen: catalog.isOpen,
    update(t: number, dt: number) {
      const d = Math.hypot(camera.position.x - o.at.x, camera.position.z - o.at.z);
      const near = d < 3.2, far = d > 7;
      wake += ((near ? 1 : .25) - wake) * Math.min(1, dt * 2.5);
      // Close by, the count runs up (once per approach); far away the screen sleeps and resets.
      if (near) { if (awakeSince < 0) awakeSince = t; count = Math.min(1000, 1000 * (1 - Math.pow(1 - Math.min(1, (t - awakeSince) / 2.4), 3))); }
      else if (far) { awakeSince = -1; count = 1000; }
      ring.scale.setScalar(1 + .04 * Math.sin(t * 2));
      if (d > 14) return;
      // Redraw at ~15 fps: the screen is text and dots, not a video.
      if (t - drawnAt > 1 / 15) { drawnAt = t; draw(t); }
    },
    dispose() { catalog.dispose(); disposables.forEach(d => d.dispose()); scene.remove(group); },
  };
}
