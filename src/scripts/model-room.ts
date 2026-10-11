import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createModelRoomDesign } from './model-room-design';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { createRoomFx } from './model-room-fx';
import { createAstronaut } from './observatory-astronaut';
import { createRoomSound } from './model-room-sound';
import { createExhibits, KITCHEN, type ExhibitInfo } from './model-room-exhibits';
import { createGuide } from './model-room-guide';
import { createArchiveCatalog } from './model-room-catalog';
import { createAuthor } from './model-room-author';
import { createArchiveBay } from './model-room-archive';
import { modelArchive } from '../data/model-archive';
import { ROOM, WALK } from './model-room-layout';

// Names for the parts you can pick out on each exhibit (by mesh material).
const PARTS: Record<string, Record<string, [string, string]>> = {
  ebike: {
    Mat_Color: ['Carbon frame', 'Carbonrahmen'], tyre: ['Tyres', 'Reifen'], bicycles_Decal: ['Decals', 'Dekor'], Copper: ['Drivetrain', 'Antrieb'],
    bicycles_Color: ['Frame detail', 'Rahmendetail'], helmet: ['Wheels', 'Laufräder'], 'Unreal 4 Template': ['Hardware', 'Beschläge'],
  },
};
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br />');

/** A separate scene: it is only downloaded after entering the archive's portal. */
export async function mountModelRoom(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(name: string) => root.querySelector<T>(`[data-mr-${name}]`)!;
  const de = () => document.documentElement.lang.startsWith('de');
  const events = new AbortController(), download = new AbortController();
  const { signal } = events;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1113');
  scene.fog = new THREE.Fog('#0b1113', 26, 62);
  const camera = new THREE.PerspectiveCamera(52, 1, .08, 90);
  let renderer: THREE.WebGLRenderer | undefined;
  let orbit: OrbitControls | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let resize: ResizeObserver | undefined;
  let model: THREE.Group | undefined;
  let design: ReturnType<typeof createModelRoomDesign> | undefined;
  let archive: ReturnType<typeof createArchiveBay> | undefined;
  let fx: ReturnType<typeof createRoomFx> | undefined;
  // Arrival: the camera steps out of the rear frame, the astronaut beside it; leaving: back into it.
  let arriveAt = -1, arriveAtStart: number | undefined, leaving = false, locked = false, portalArmed = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Walk into the rear frame: the light takes you back to the painting in the archive. */
  function leave() {
    leaving = true; sound.leave(); if (document.pointerLockElement) document.exitPointerLock();
    const veil = document.createElement('div'); veil.className = 'mr-exit-veil'; root.append(veil);
    const go = () => location.assign('/gallery/model-room/');
    if (reduced) { go(); return; }
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, easing: 'ease-in', fill: 'forwards' }).finished.then(go, go);
  }
  addEventListener('pageshow', event => { if (event.persisted) { leaving = false; root.querySelectorAll('.mr-exit-veil').forEach(v => v.remove()); if (ready) home(); } });
  const astro = createAstronaut();
  let guide: ReturnType<typeof createGuide> | undefined;
  const sound = createRoomSound(); let stepping = 0;
  // Music and sound start with the room (SoundField: unless the visitor switched sound off).
  (window as unknown as { __rbSoundAuto?: () => void }).__rbSoundAuto?.();
  let exhibits: ReturnType<typeof createExhibits> | undefined;
  let catalog: ReturnType<typeof createArchiveCatalog> | undefined;
  let author: ReturnType<typeof createAuthor> | undefined;
  // When the visitor last moved or looked around (the astronaut comes over if you stand still for long).
  let stillSince = 0, hoverAt = 0; const lastPose = new THREE.Vector4();
  const draco = new DRACOLoader(); draco.setDecoderPath('/draco/');
  const gltfLoader = new GLTFLoader().setDRACOLoader(draco);
  // The exhibit the caption describes: the one you look at while walking, the one you picked while inspecting.
  let current: ExhibitInfo = KITCHEN, captionAt = 0;
  function caption(info: ExhibitInfo) {
    if (info === current && root.dataset.exhibit === info.id) return;
    current = info; root.dataset.exhibit = info.id;
    const box = root.querySelector<HTMLElement>('[data-mr-caption]'); if (!box) return;
    const both = (l: { en: string; de: string }) => `<span class="mr-en">${escape(l.en)}</span><span class="mr-de">${escape(l.de)}</span>`;
    const fill = () => {
      $('cap-kind').innerHTML = `EXHIBIT ${info.no} / ${both({ en: info.kind.en.toUpperCase(), de: info.kind.de.toUpperCase() })}`;
      $('cap-title').innerHTML = `${escape(info.title)}<span>${both(info.sub)}</span>`;
      $('cap-text').innerHTML = both(info.text);
    };
    if (reduced) { fill(); return; }
    box.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(6px)' }], { duration: 180, easing: 'ease-in', fill: 'forwards' }).finished.then(() => {
      fill(); box.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
    }, fill);
  }
  const astroFrom = new THREE.Vector3(1.1, 0, 10.9 + ROOM.shift);
  let composer: EffectComposer | undefined, bloom: UnrealBloomPass | undefined;
  let studioLight = false;
  let frame = 0, last = 0, disposed = false, ready = false, failed = false;
  let inspecting = false, wireframe = false, yaw = 0, pitch = 0;
  let selected = '', selectedMaterial = '';
  const keys = new Set<string>();
  // Held directions on the walking pad: `t<id>` for a finger, `p<id>` for a mouse or pen.
  const touchKeys = new Map<string, string>();
  const padButtons = [...root.querySelectorAll<HTMLElement>('[data-mr-move]')];
  /** Light the arrows that are held (a touch that cancels its default never shows :active). */
  const padShow = () => { const held = new Set(touchKeys.values()); padButtons.forEach(b => b.classList.toggle('is-held', held.has(b.dataset.mrMove!))); };
  const release = () => { keys.clear(); touchKeys.clear(); padShow(); };
  const colliders: THREE.Box3[] = [];
  const target = new THREE.Vector3(0, 1.65, -3.5);
  const savedWalk = { position: new THREE.Vector3(), yaw: 0, pitch: 0 };
  const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  const selection = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color('#e2d6ae'));
  selection.visible = false;scene.add(selection);
  let gesture: { id: number; x: number; y: number; distance: number } | undefined;
  const meshes: THREE.Mesh[] = [];
  const coarse = matchMedia('(pointer: coarse)');

  function disposeTree(object: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    object.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m));
    });
    materials.forEach(m => Object.values(m).forEach(value => { if(value instanceof THREE.Texture)textures.add(value); }));
    geometries.forEach(g => g.dispose());materials.forEach(m => m.dispose());textures.forEach(t => t.dispose());
  }
  function stop() { cancelAnimationFrame(frame);frame = 0;release();gesture = undefined; }
  function dispose() {
    if (disposed) return;disposed = true;stop();download.abort();events.abort();
    resize?.disconnect();orbit?.dispose();design?.dispose();fx?.dispose();sound.dispose();archive?.dispose();exhibits?.dispose();guide?.dispose();catalog?.dispose();author?.dispose();draco.dispose();astro.dispose();disposeTree(scene);environment?.dispose();bloom?.dispose();composer?.dispose();renderer?.dispose();renderer?.domElement.remove();
  }
  function fail() {
    failed = true;dispose();root.dataset.state = 'error';
    $('loading').hidden = false;$('controls').hidden = true;$('touch').hidden = true;
    $('status').textContent = de() ? 'Der Raum konnte nicht geladen werden. Bitte erneut versuchen.' : 'The room could not load. Please try again.';
    $('retry').hidden = false;
  }
  function look() { camera.rotation.set(pitch, yaw, 0, 'YXZ'); }
  // The first view: a few steps inside the door, the whole hall ahead.
  const HOME_Z = () => (coarse.matches ? 9.6 : 9) + ROOM.shift, ARRIVE_Z = 11.1 + ROOM.shift;
  function home() {
    // Far enough back to take in the whole collection: the car on the left, the droid and the bike on the right.
    camera.position.set(0, 1.7, HOME_Z());yaw = 0;pitch = 0;look();
  }
  function labelSelection() {
    const groups: [RegExp, string, string][] = [
      [/Cabinets/, 'Cabinet', 'Schrank'], [/Tap/, 'Basin tap', 'Armatur'], [/Sink/, 'Sink', 'Spüle'],
      [/Oven/, 'Oven', 'Backofen'], [/Macrowave/, 'Microwave', 'Mikrowelle'], [/Handle/, 'Handle', 'Griff'],
      [/Legs/, 'Table frame', 'Tischgestell'], [/Island_Sheet/, 'Tabletop', 'Tischplatte'], [/Island_Part/, 'Kitchen island', 'Kücheninsel'],
      [/Backplate/, 'Splashback', 'Rückwand'], [/TopSheet/, 'Worktop', 'Arbeitsplatte'], [/Coocktop/, 'Cooktop', 'Kochfeld'], [/Hood|Ex_ilor/, 'Extractor', 'Dunstabzug'],
    ];
    const label = groups.find(([pattern]) => pattern.test(selected));
    const part = current.id === 'kitchen' ? (label ? label[de() ? 2 : 1] : selected) : current.id === 'k2so' ? 'K-2SO' : (PARTS[current.id]?.[selectedMaterial]?.[de() ? 1 : 0] ?? (archive?.info(current.id) ? selectedMaterial : 'Detail'));
    $('selection').textContent = selected ? `${de() ? 'Ausgewählt' : 'Selected'} / ${part}` : '';
  }
  function labels() {
    $('walk').setAttribute('aria-pressed', String(!inspecting));$('inspect').setAttribute('aria-pressed', String(inspecting));
    $('wire').setAttribute('aria-pressed', String(wireframe));$('light').setAttribute('aria-pressed', String(studioLight));$('zoom').hidden = !inspecting;
    $('touch').hidden = !ready || inspecting || !coarse.matches;
    $('hint').textContent = inspecting
      ? de() ? 'Ziehen zum Drehen · Scrollen / Aufziehen zum Zoomen · Detail anklicken · Esc zum Gehen' : 'Drag to orbit · Scroll / pinch to zoom · Click a detail · Esc to walk'
      : coarse.matches
        ? de() ? 'Pfeile zum Gehen · Ziehen zum Umsehen · Objekt antippen zum Untersuchen' : 'Arrows to move · Drag to look · Tap the object to inspect'
        : de() ? 'Klicken zum Umsehen · WASD gehen · Objekt anvisieren und klicken · Ins Licht gehen: zurück ins Archiv' : 'Click to look around · WASD to walk · Aim and click an object to inspect · Walk into the light to return';
    labelSelection();
  }
  function inspectionHome() {
    if (!orbit) return;
    target.copy(current.focus);
    if (current.id === 'kitchen') {
      const distance = coarse.matches ? 12 : 9;
      camera.position.set(distance * .65, 4.3, target.z + distance);
    } else {
      // A three-quarter view from the room's side of the piece, a little above it.
      const d = current.distance * (coarse.matches ? 1.25 : 1);
      // (K-2SO opens from the wall side: the astronaut stands on the other.)
      const out = new THREE.Vector3(-target.x, 0, 10 - target.z).normalize(), side = new THREE.Vector3(-out.z, 0, out.x).multiplyScalar(current.id === 'k2so' ? -1 : 1);
      camera.position.copy(target).addScaledVector(out, d * .88).addScaledVector(side, d * .42); camera.position.y = target.y + d * (current.elevation ?? .3);
    }
    orbit.target.copy(target);orbit.update();
  }
  function mode(next: boolean) {
    if (!ready || !orbit || inspecting === next) return;
    release();gesture = undefined;
    if (next) { savedWalk.position.copy(camera.position);savedWalk.yaw = yaw;savedWalk.pitch = pitch; }
    inspecting = next;orbit.enabled = next;selection.visible = next && Boolean(selected);exhibits?.hold(next ? current.id : null);
    if (next) inspectionHome();
    else { camera.position.copy(savedWalk.position);yaw = savedWalk.yaw;pitch = savedWalk.pitch;look();selected = ''; }
    root.dataset.mode = next ? 'inspect' : 'walk';labels();
  }
  function select(clientX: number, clientY: number) {
    if (!renderer || !model) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(pointer, camera);
    // The archive terminal answers a click with its panel rather than an inspection orbit.
    // Rodion himself (and his stand) answers a click by turning to talk.
    const host = author ? raycaster.intersectObjects(author.targets, false)[0] : undefined;
    const hit = raycaster.intersectObjects([...meshes, ...(exhibits?.meshes ?? []), ...(archive?.meshes ?? [])], false)[0];
    if (host && (!hit || host.distance < hit.distance + .05)) { if (inspecting) mode(false); author!.open(); return; }
    if (!hit) { selected = '';selection.visible = false;labelSelection();return; }
    const info = archive?.info(hit.object.userData.exhibit) ?? exhibits?.info(hit.object.userData.exhibit ?? 'kitchen') ?? KITCHEN;
    exhibits?.poke(info.id);
    selected = hit.object.name;selectedMaterial = ((hit.object as THREE.Mesh).material as THREE.Material).name ?? '';
    // Picking another piece while inspecting flies the orbit over to it.
    const moved = inspecting && info !== current; caption(info);
    if (moved) { exhibits?.hold(info.id); inspectionHome(); } else mode(true);
    sound.select();
    selection.box.setFromObject(hit.object);selection.visible = true;labelSelection();
  }
  function blocked(x: number, z: number, self = true) {
    // The rear frame is open: you may walk into it (and that takes you back to the archive).
    if (Math.abs(x) > WALK.x || z < WALK.back || z > (Math.abs(x) < WALK.doorHalf ? WALK.door : WALK.front)) return true;
    if (self && astro.root.visible && Math.hypot(x - astro.root.position.x, z - astro.root.position.z) < .6) return true;
    // The exhibits' list grows as pieces arrive (the lounge measures itself), so read it live.
    // A piece can appear where you stand (a work built on the stage under your feet): from inside a box you may
    // always move outwards, so you are never stuck in it, only kept from going deeper.
    const p = camera.position, inside = (b: THREE.Box3, px: number, pz: number) => px > b.min.x - .3 && px < b.max.x + .3 && pz > b.min.z - .3 && pz < b.max.z + .3;
    return [...colliders, ...(exhibits?.colliders ?? []), ...(archive?.colliders ?? []), ...(author ? [author.collider] : [])].some(b => {
      if (!inside(b, x, z)) return false;
      if (!self || !inside(b, p.x, p.z)) return true;
      const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
      return Math.hypot(x - cx, z - cz) < Math.hypot(p.x - cx, p.z - cz) - 1e-4;
    });
  }
  function tick(time: number) {
    frame = 0;if (disposed || failed || document.hidden) return;
    const dt = Math.min(.04, Math.max(0, (time - last) / 1000));last = time;
    if (ready && !inspecting && !catalog?.isOpen()) {
      const held = (key: string, arrow: string, touch: string) => keys.has(key) || keys.has(arrow) || [...touchKeys.values()].includes(touch);
      let forward = Number(held('KeyW', 'ArrowUp', 'forward')) - Number(held('KeyS', 'ArrowDown', 'back'));
      let right = Number(held('KeyD', 'ArrowRight', 'right')) - Number(held('KeyA', 'ArrowLeft', 'left'));
      const norm = Math.hypot(forward, right) || 1;forward /= norm;right /= norm;
      const speed = 2.8 * dt;
      const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * speed;
      const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * speed;
      if (!blocked(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
      if (!blocked(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
      stepping = forward || right ? 1 : 0;
    } else stepping = 0;
    if (inspecting) orbit?.update();
    const t = time / 1000;
    // Arrival from the portal: a slow glide out of the rear frame to the first view.
    if (arriveAt >= 0) {
      const k = Math.min(1, (t - arriveAt) / 2.8), e = 1 - Math.pow(1 - k, 3);
      camera.position.z = THREE.MathUtils.lerp(ARRIVE_Z, HOME_Z(), e); fx?.setOpen(1);
      if (k >= 1) arriveAt = -1;
    }
    // The astronaut came through with you and now tours the collection on his own (model-room-guide.ts).
    if (guide && t - (arriveAtStart ?? t) > .6) guide.update(t, dt);
    fx?.update(t, dt);exhibits?.update(t, dt);archive?.update(t, dt);author?.update(t, dt);author?.place(root.clientWidth, root.clientHeight);
    // The kitchen's shadows are static; only the astronaut moves through them, so a few updates a second are enough.
    if (design && ++frames % 4 === 0) design.key.shadow.needsUpdate = true;
    if (Math.abs(lastPose.x - camera.position.x) + Math.abs(lastPose.y - camera.position.z) + Math.abs(lastPose.z - yaw) + Math.abs(lastPose.w - pitch) > 1e-3 || inspecting) { stillSince = t; lastPose.set(camera.position.x, camera.position.z, yaw, pitch); }
    // What the crosshair rests on (captured pointer) or, on touch, the piece you stand in front of.
    if (ready && exhibits && time - hoverAt > 150) {
      hoverAt = time;
      if (locked) { raycaster.setFromCamera(pointer.set(0, 0), camera); exhibits.hover(raycaster.intersectObjects(exhibits.meshes, false)[0]?.object.userData.exhibit ?? null); }
      else if (coarse.matches) exhibits.hover(current.id === 'ebike' && camera.position.distanceTo(current.focus) < 5 ? 'ebike' : null);
    }
    // Walking, the caption follows what you look at.
    if (ready && exhibits && !inspecting && time - captionAt > 250) {
      captionAt = time; const forward = camera.getWorldDirection(new THREE.Vector3()); caption(author?.inView(camera.position, forward) ?? archive?.inView(camera.position, forward) ?? exhibits.inView(camera.position, forward));
    }
    sound.frame(stepping, THREE.MathUtils.clamp(1 - (WALK.door - camera.position.z) / 5, 0, 1) * (Math.abs(camera.position.x) < 2.5 ? 1 : .4));
    // The way back only opens once you have stepped clear of it (you arrive standing in it).
    if (arriveAt < 0 && camera.position.z < 10.2 + ROOM.shift) portalArmed = true;
    if (ready && portalArmed && !leaving && !inspecting && fx?.inPortal(camera.position)) leave();
    // Behind the open archive tablet the room is only a blur: a third of the frames is plenty there.
    if (!(catalog?.isOpen() && frames % 3)) { if(composer)composer.render();else renderer!.render(scene, camera); }
    frame = requestAnimationFrame(tick);
  }
  function fit() {
    if (!renderer) return;const rect = $('stage').getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);composer?.setPixelRatio(renderer.getPixelRatio());composer?.setSize(rect.width, rect.height);fx?.resize(rect.width, rect.height);camera.aspect = rect.width / Math.max(1, rect.height);camera.fov = rect.width < 600 ? 62 : 52;camera.updateProjectionMatrix();
  }
  let frames = 0;
  function resume() { if (!frame && !disposed && !failed && !document.hidden) { last = performance.now();frame = requestAnimationFrame(tick); } }
  const timeout = setTimeout(() => download.abort(), 45000);
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse.matches ? 1.25 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;renderer.toneMapping = THREE.ACESFilmicToneMapping;renderer.toneMappingExposure = .95;
    renderer.shadowMap.enabled = true;renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;canvas.tabIndex = 0;canvas.setAttribute('aria-label', '3D exhibition. WASD or arrow keys to move. Drag to look.');
    $('stage').append(canvas);
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    environment = pmrem.fromScene(room, .04);scene.environment = environment.texture;scene.environmentIntensity = .45;room.dispose();pmrem.dispose();
    design=createModelRoomDesign(scene,coarse.matches);home();
    fx = createRoomFx({ scene, camera, renderer, mobile: coarse.matches, onPixelRatio: ratio => { renderer!.setPixelRatio(ratio); fit(); } });
    exhibits = createExhibits({
      scene, renderer, camera, mobile: coarse.matches, loader: gltfLoader, onReveal: () => sound.reveal(), target: () => composer?.readBuffer ?? null,
      onCue: cue => cue === 'engine' || cue === 'rev' ? sound.engine(cue === 'rev') : cue === 'eyes' ? sound.eyes() : sound.lights(cue === 'lights-on'),
    });
    archive = createArchiveBay({
      scene, renderer, camera, loader: gltfLoader, mobile: coarse.matches, reduced,
      target: () => composer?.readBuffer ?? null, wireframe: () => wireframe,
      onReveal: () => { sound.reveal(); guide?.emote('curious', performance.now() / 1000); },
    });
    // The archive tablet: Rodion's book of works. He opens it for you (or the "Model archive" button does);
    // a work chosen in it is built on the stage in the middle of the hall, and he turns to present it.
    catalog = createArchiveCatalog({
      root, de, entries: modelArchive, activeId: () => archive?.activeId() ?? null,
      onOpen: () => { release(); if (document.pointerLockElement) document.exitPointerLock(); sound.click(); },
      cancel: () => archive?.cancel(),
      select: async (entry, progress) => {
        const info = await archive!.show(entry, progress); if (!info || disposed) return false;
        selected = ''; selectedMaterial = ''; selection.visible = false; caption(info); arriveAt = -1;
        if (inspecting) inspectionHome(); else mode(true);
        author?.present(entry.title);
        return true;
      },
      clear: async () => {
        if (archive?.info(current.id)) { mode(false); caption(KITCHEN); selected = ''; selection.visible = false; labelSelection(); }
        await archive?.clear();
      },
    });
    author = createAuthor({
      scene, camera, renderer, root, loader: gltfLoader, mobile: coarse.matches, reduced, de, coarse: () => coarse.matches,
      stage: new THREE.Vector3(ROOM.stage.x, 0, ROOM.stage.z), target: () => composer?.readBuffer ?? null,
      onArchive: () => catalog?.open(),
      onTalk: () => { release(); if (document.pointerLockElement) document.exitPointerLock(); sound.click(); guide?.emote('hi', performance.now() / 1000); },
      onSpeak: () => sound.click(),
    });
    raycaster.layers.enable(author.layer);
    // He starts loading at once, under the loading glow, so the heavy part never lands in the first seconds you walk.
    void author.load().catch(error => console.warn('The author could not join the room', error));
    if (location.search.includes('mrdebug')) (window as unknown as { __mr: unknown }).__mr = { scene, camera, exhibits, archive, astro, renderer, catalog, author, fx, sound, guide: () => guide, get composer() { return composer; }, get yaw() { return yaw; }, set yaw(v: number) { yaw = v; look(); }, get pitch() { return pitch; }, set pitch(v: number) { pitch = v; look(); }, mode: (v: boolean) => mode(v), select: (x: number, y: number) => select(x, y), get orbit() { return orbit; } };
    astro.root.visible = false; scene.add(astro.root);
    colliders.push(new THREE.Box3(new THREE.Vector3(5.35,0,-3.4),new THREE.Vector3(8.05,2,-2.2)),new THREE.Box3(new THREE.Vector3(-7.1,0,-3.9),new THREE.Vector3(-5.9,1,-.7)));
    // The composer's own buffer is multisampled: without it the post chain throws away the canvas's antialiasing
    // and every edge stairs (worst on phones, which also render below their screen's resolution).
    // (At 1.5× the frame is already supersampled: there the buffers skip MSAA, which cost a desktop GPU about
    // as much as the whole scene, since every pass of the chain wrote into a multisampled target.)
    const samples = renderer.getPixelRatio() >= 1.4 ? 0 : 4;
    composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples}));composer.addPass(new RenderPass(scene,camera));
    bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.32,.5,1.05);composer.addPass(bloom);composer.addPass(new OutputPass());
    { const r = $('stage').getBoundingClientRect(); fx.extendComposer(composer, Math.max(1, r.width), Math.max(1, r.height)); }
    orbit = new OrbitControls(camera, canvas);orbit.enabled = false;orbit.enableDamping = false;orbit.enablePan = false;
    orbit.minDistance = 1.2;orbit.maxDistance = 18;orbit.maxPolarAngle = Math.PI * .49;orbit.target.copy(target);
    // Reset the orientation after constructing OrbitControls, which calls update().
    look();
    resize = new ResizeObserver(fit);resize.observe($('stage'));
    // Phones drop the GPU context when memory runs short or the tab sleeps. Ask for it back and rebuild
    // the room from scratch (a reload keeps every resource consistent); only give up if it never returns.
    let restoreTimer = 0;
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); stop();
      $('loading').hidden = false; $('status').textContent = de() ? 'Der Raum wird wiederhergestellt…' : 'Restoring the room…';
      restoreTimer = window.setTimeout(fail, 6000);
    }, { signal });
    canvas.addEventListener('webglcontextrestored', () => { clearTimeout(restoreTimer); location.reload(); }, { signal });
    // Walking on a desk works like a game: a click captures the pointer, the mouse turns the head,
    // a further click inspects whatever the crosshair is on; Esc gives the pointer back.
    const cross = document.createElement('div'); cross.className = 'mr-cross'; root.append(cross);
    document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; cross.classList.toggle('is-on', locked); root.classList.toggle('is-locked', locked); }, { signal });
    document.addEventListener('mousemove', event => {
      if (!locked || inspecting) return;
      yaw -= event.movementX * .0022; pitch = THREE.MathUtils.clamp(pitch - event.movementY * .0022, -1.2, 1.2); look();
    }, { signal });
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !ready || catalog?.isOpen()) return;canvas.focus({ preventScroll: true });
      if (event.pointerType === 'mouse' && !coarse.matches && !inspecting) {
        if (!locked) { try { (canvas.requestPointerLock() as unknown as Promise<void> | undefined)?.catch?.(() => {}); } catch { /* not allowed here */ } return; }
        const r = canvas.getBoundingClientRect(); document.exitPointerLock(); select(r.left + r.width / 2, r.top + r.height / 2); return;
      }
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
      canvas.setPointerCapture(event.pointerId);
    }, { signal });
    canvas.addEventListener('pointermove', event => {
      if (!gesture && event.pointerType === 'mouse' && exhibits && performance.now() - hoverAt > 120) {
        hoverAt = performance.now(); const r = canvas.getBoundingClientRect();
        raycaster.setFromCamera(pointer.set((event.clientX - r.left) / r.width * 2 - 1, 1 - (event.clientY - r.top) / r.height * 2), camera);
        exhibits.hover(raycaster.intersectObjects(exhibits.meshes, false)[0]?.object.userData.exhibit ?? null);
      }
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;gesture.distance += Math.hypot(dx, dy);
      gesture.x = event.clientX;gesture.y = event.clientY;
      if (!inspecting) { yaw -= dx * .003;pitch = THREE.MathUtils.clamp(pitch - dy * .003, -.95, .95);look(); }
    }, { signal });
    canvas.addEventListener('pointerup', event => {
      if (!gesture || gesture.id !== event.pointerId) return;
      if (gesture.distance < 7) select(event.clientX, event.clientY);gesture = undefined;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    }, { signal });
    canvas.addEventListener('pointercancel', () => { gesture = undefined; }, { signal });
    canvas.addEventListener('lostpointercapture', () => { gesture = undefined; }, { signal });
    $('light').addEventListener('click',()=>{studioLight=!studioLight;renderer!.toneMappingExposure=studioLight?1.4:.95;scene.environmentIntensity=studioLight?1.1:.45;if(bloom)bloom.strength=studioLight?.16:.32;labels();},{signal});
    $('inspect').addEventListener('click', () => mode(true), { signal });$('walk').addEventListener('click', () => mode(false), { signal });
    $('archive').addEventListener('click', () => { author?.close(true); catalog?.open(); }, { signal });
    $('reset').addEventListener('click', () => { selected = '';selection.visible = false;release();inspecting ? inspectionHome() : home();labelSelection(); }, { signal });
    $('wire').addEventListener('click', () => {
      wireframe = !wireframe;[...meshes, ...(exhibits?.meshes ?? []), ...(archive?.meshes ?? [])].forEach(mesh => {
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => { (m as THREE.MeshStandardMaterial).wireframe = wireframe; });
      });labels();
    }, { signal });
    for (const [name, factor] of [['closer', .8], ['farther', 1.25]] as const) $(name).addEventListener('click', () => {
      if (!orbit) return;const offset = camera.position.clone().sub(orbit.target);offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, orbit.minDistance, orbit.maxDistance));camera.position.copy(orbit.target).add(offset);orbit.update();
    }, { signal });
    // The walking pad is a D-pad read from the fingers actually on it. Phones used to lose a finger's
    // pointerup to the long-press selection (the walk then ran on forever and the other arrows went dead),
    // so a finger's direction is recomputed from the live touch list on every touch event: a lifted finger
    // can never leave a direction held, and sliding from one arrow to the next turns without lifting.
    const pad = $('touch'), padFingers = new Set<number>();
    const padRead = (touches: TouchList) => {
      for (const id of [...touchKeys.keys()]) if (id[0] === 't') touchKeys.delete(id);
      for (const touch of Array.from(touches)) {
        if (!padFingers.has(touch.identifier) || !ready || inspecting || catalog?.isOpen()) continue;
        const under = document.elementFromPoint(touch.clientX, touch.clientY)?.closest<HTMLElement>('[data-mr-move]');
        if (under && pad.contains(under)) touchKeys.set(`t${touch.identifier}`, under.dataset.mrMove!);
      }
      padShow();
    };
    pad.addEventListener('touchstart', event => {
      event.preventDefault(); window.getSelection()?.removeAllRanges();
      for (const touch of Array.from(event.changedTouches)) padFingers.add(touch.identifier);
      padRead(event.touches);
    }, { signal, passive: false });
    pad.addEventListener('touchmove', event => { event.preventDefault(); padRead(event.touches); }, { signal, passive: false });
    for (const type of ['touchend', 'touchcancel'] as const) pad.addEventListener(type, event => {
      for (const touch of Array.from(event.changedTouches)) padFingers.delete(touch.identifier);
      padRead(event.touches);
    }, { signal });
    // The last finger off the glass anywhere ends every walk, whatever happened to the pad's own events.
    for (const type of ['touchend', 'touchcancel'] as const) addEventListener(type, event => { if (!event.touches.length && padFingers.size) { padFingers.clear(); padRead(event.touches); } }, { signal, capture: true });
    // A mouse or a pen still presses the arrows like buttons.
    padButtons.forEach(button => {
      button.addEventListener('pointerdown', event => {
        if (event.pointerType === 'touch') return;
        event.preventDefault(); button.setPointerCapture(event.pointerId); touchKeys.set(`p${event.pointerId}`, button.dataset.mrMove!); padShow();
      }, { signal });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => { touchKeys.delete(`p${(event as PointerEvent).pointerId}`); padShow(); }, { signal });
    });
    // Nothing in the room is text to select or a link to press and hold (the archive's search field aside).
    const typing = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('input,textarea,[contenteditable]'));
    root.addEventListener('selectstart', event => { if (!typing(event.target)) event.preventDefault(); }, { signal });
    root.addEventListener('contextmenu', event => { if (!typing(event.target)) event.preventDefault(); }, { signal });
    addEventListener('keydown', event => {
      if (!ready || catalog?.isOpen() || event.altKey || event.ctrlKey || event.metaKey || document.body.classList.contains('is-nav-opened')) return;
      if ((event.target as HTMLElement)?.closest('button,a,input,textarea,select,[contenteditable]')) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.code)) { event.preventDefault();keys.add(event.code); }
      if (event.code === 'Escape') { author?.close(); mode(false); }if (event.code === 'KeyE') mode(true);
    }, { signal });
    addEventListener('keyup', event => keys.delete(event.code), { signal });
    addEventListener('blur', () => { release();gesture = undefined; }, { signal });
    addEventListener('rb:langchange', labels, { signal });coarse.addEventListener('change', labels, { signal });
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : resume(), { signal });
    addEventListener('pagehide', event => { if (event.persisted) stop();else dispose(); }, { signal });
    addEventListener('pageshow', event => { if (event.persisted) resume(); }, { signal });
    const response = await fetch('/models/exhibits/kitchen-modern-25.glb', { signal: download.signal });
    if (!response.ok) throw new Error(`Exhibit response: ${response.status}`);
    const data = await response.arrayBuffer();
    if (disposed) return;
    const gltf = await gltfLoader.parseAsync(data, '/models/exhibits/');
    if (disposed) { disposeTree(gltf.scene);return; }
    model = gltf.scene;model.position.y += .165;model.position.z -= 3.5;scene.add(model);model.updateMatrixWorld(true);
    await design.dressModel(model);if(disposed)return;
    model.traverse(node => {
      const mesh = node as THREE.Mesh;if (!mesh.isMesh) return;
      mesh.castShadow = true;mesh.receiveShadow = true;mesh.userData.exhibit = 'kitchen';meshes.push(mesh);
      const bound = new THREE.Box3().setFromObject(mesh);
      // Full-height cabinets and island/table volumes keep the walking camera out of furniture.
      if (/Cabinets|Island|Table_Legs|TopSheet/.test(mesh.name)) colliders.push(bound);
    });
    // The astronaut: loaded alongside, never holding the room back.
    await Promise.race([astro.load().catch(() => {}), new Promise(r => setTimeout(r, 4000))]);
    if (disposed) return;
    astro.root.updateMatrixWorld(true);
    { const hb = new THREE.Box3().setFromObject(astro.root), h = hb.max.y - hb.min.y; if (h > .5) astro.root.scale.multiplyScalar(1.8 / h); }
    astro.root.position.copy(astroFrom); astro.root.rotation.y = Math.PI; astro.root.visible = !reduced;
    guide = createGuide({
      scene, astro, camera, reduced, from: astroFrom,
      shown: id => id === 'kitchen' || Boolean(exhibits?.shown(id)),
      // His seat: on the sofa's long side, a little in from its back, facing into the room.
      seat: () => {
        const s = exhibits?.lounge.sofa; if (!s) return null;
        // The middle of the main seat (its front edge is 1.13 m in from the sofa's back; the chaise sticks out
        // further on the other side). He comes round the arm, along the legroom behind the coffee table,
        // stops in front of the seat and sits down backwards onto it.
        const front = s.max.z - 1.13, x = s.max.x - .8;
        return { at: new THREE.Vector3(x, 0, front + .32), stand: new THREE.Vector3(x, 0, front - .32), via: new THREE.Vector3(s.max.x + .35, 0, front - .32), face: Math.PI };
      },
      chirp: kind => sound.chirp(kind),
      idle: () => performance.now() / 1000 - stillSince,
      clear: (x, z) => !blocked(x, z, false),
    });
    guide.begin(performance.now() / 1000);
    if (location.search.includes('mrdebug')) (window as unknown as { __mr: Record<string, unknown> }).__mr.guide = guide;
    // Compile every shader while the loading glow still covers the room, for the buffer the frame is really drawn
    // into (post-processing, not the canvas), then draw one hidden frame so the passes and shadows are ready too.
    // Without this the first frames compiled ~5 s of shaders synchronously: the freeze on arrival.
    if (composer && renderer) {
      renderer.setRenderTarget(composer.readBuffer);
      const compiling = renderer.compileAsync(scene, camera).catch(() => {});
      renderer.setRenderTarget(null); await compiling;
      if (disposed) return;
      composer.render();
    }
    ready = true;root.dataset.state = 'ready';root.dataset.mode = 'walk';$('loading').hidden = true;$('controls').hidden = false;labels();
    if (!reduced) { camera.position.z = ARRIVE_Z; arriveAt = arriveAtStart = performance.now() / 1000; sound.arrive(); }
    // The rest of the collection streams in once you are standing in the room.
    setTimeout(() => { if (!disposed) void exhibits?.load(); }, reduced ? 0 : 2600);
    resume();
  } catch (error) {
    if (!disposed) { console.warn('Model Room could not open', error);fail(); }
  } finally { clearTimeout(timeout); }
}
