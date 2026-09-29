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

/** A separate scene: it is only downloaded after entering the archive's portal. */
export async function mountModelRoom(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(name: string) => root.querySelector<T>(`[data-mr-${name}]`)!;
  const de = () => document.documentElement.lang.startsWith('de');
  const events = new AbortController(), download = new AbortController();
  const { signal } = events;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1113');
  scene.fog = new THREE.Fog('#0b1113', 19, 42);
  const camera = new THREE.PerspectiveCamera(52, 1, .08, 70);
  let renderer: THREE.WebGLRenderer | undefined;
  let orbit: OrbitControls | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let resize: ResizeObserver | undefined;
  let model: THREE.Group | undefined;
  let design: ReturnType<typeof createModelRoomDesign> | undefined;
  let fx: ReturnType<typeof createRoomFx> | undefined;
  // Arrival: the camera steps out of the rear frame, the astronaut beside it; leaving: back into it.
  let arriveAt = -1, arriveAtStart: number | undefined, leaving = false, locked = false, portalArmed = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Walk into the rear frame: the light takes you back to the painting in the archive. */
  function leave() {
    leaving = true; if (document.pointerLockElement) document.exitPointerLock();
    const veil = document.createElement('div'); veil.className = 'mr-exit-veil'; root.append(veil);
    const go = () => location.assign('/gallery/model-room/');
    if (reduced) { go(); return; }
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, easing: 'ease-in', fill: 'forwards' }).finished.then(go, go);
  }
  addEventListener('pageshow', event => { if (event.persisted) { leaving = false; root.querySelectorAll('.mr-exit-veil').forEach(v => v.remove()); if (ready) home(); } });
  const astro = createAstronaut(); let astroPhase = 0, astroWalk = 0;
  const astroFrom = new THREE.Vector3(1.1, 0, 10.9), astroTo = new THREE.Vector3(2.3, 0, .3), astroVia = new THREE.Vector3(3.2, 0, 6);
  let composer: EffectComposer | undefined, bloom: UnrealBloomPass | undefined;
  let studioLight = false;
  let frame = 0, last = 0, disposed = false, ready = false, failed = false;
  let inspecting = false, wireframe = false, yaw = 0, pitch = 0;
  let selected = '';
  const keys = new Set<string>();
  const touchKeys = new Map<number, string>();
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
  function stop() { cancelAnimationFrame(frame);frame = 0;keys.clear();touchKeys.clear();gesture = undefined; }
  function dispose() {
    if (disposed) return;disposed = true;stop();download.abort();events.abort();
    resize?.disconnect();orbit?.dispose();design?.dispose();fx?.dispose();astro.dispose();disposeTree(scene);environment?.dispose();bloom?.dispose();composer?.dispose();renderer?.dispose();renderer?.domElement.remove();
  }
  function fail() {
    failed = true;dispose();root.dataset.state = 'error';
    $('loading').hidden = false;$('controls').hidden = true;$('touch').hidden = true;
    $('status').textContent = de() ? 'Der Raum konnte nicht geladen werden. Bitte erneut versuchen.' : 'The room could not load. Please try again.';
    $('retry').hidden = false;
  }
  function look() { camera.rotation.set(pitch, yaw, 0, 'YXZ'); }
  function home() {
    camera.position.set(0, 1.7, coarse.matches ? 8.4 : 7);yaw = 0;pitch = 0;look();
  }
  function labelSelection() {
    const groups: [RegExp, string, string][] = [
      [/Cabinets/, 'Cabinet', 'Schrank'], [/Tap/, 'Basin tap', 'Armatur'], [/Sink/, 'Sink', 'Spüle'],
      [/Oven/, 'Oven', 'Backofen'], [/Macrowave/, 'Microwave', 'Mikrowelle'], [/Handle/, 'Handle', 'Griff'],
      [/Legs/, 'Table frame', 'Tischgestell'], [/Island_Sheet/, 'Tabletop', 'Tischplatte'], [/Island_Part/, 'Kitchen island', 'Kücheninsel'],
      [/Backplate/, 'Splashback', 'Rückwand'], [/TopSheet/, 'Worktop', 'Arbeitsplatte'], [/Coocktop/, 'Cooktop', 'Kochfeld'], [/Hood|Ex_ilor/, 'Extractor', 'Dunstabzug'],
    ];
    const label = groups.find(([pattern]) => pattern.test(selected));
    $('selection').textContent = selected ? `${de() ? 'Ausgewählt' : 'Selected'} / ${label ? label[de() ? 2 : 1] : selected}` : '';
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
    const distance = coarse.matches ? 12 : 9;
    camera.position.set(distance * .65, 4.3, target.z + distance);
    orbit.target.copy(target);orbit.update();
  }
  function mode(next: boolean) {
    if (!ready || !orbit || inspecting === next) return;
    keys.clear();touchKeys.clear();gesture = undefined;
    if (next) { savedWalk.position.copy(camera.position);savedWalk.yaw = yaw;savedWalk.pitch = pitch; }
    inspecting = next;orbit.enabled = next;selection.visible = next && Boolean(selected);
    if (next) inspectionHome();
    else { camera.position.copy(savedWalk.position);yaw = savedWalk.yaw;pitch = savedWalk.pitch;look(); }
    root.dataset.mode = next ? 'inspect' : 'walk';labels();
  }
  function select(clientX: number, clientY: number) {
    if (!renderer || !model) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit) { selected = '';selection.visible = false;labelSelection();return; }
    selected = hit.object.name;mode(true);
    selection.box.setFromObject(hit.object);selection.visible = true;labelSelection();
  }
  function blocked(x: number, z: number) {
    // The rear frame is open: you may walk into it (and that takes you back to the archive).
    if (Math.abs(x) > 8.5 || z < -7.05 || z > (Math.abs(x) < 1.3 ? 11.3 : 10.9)) return true;
    if (astro.root.visible && Math.hypot(x - astro.root.position.x, z - astro.root.position.z) < .6) return true;
    return colliders.some(b => x > b.min.x - .3 && x < b.max.x + .3 && z > b.min.z - .3 && z < b.max.z + .3);
  }
  function tick(time: number) {
    frame = 0;if (disposed || failed || document.hidden) return;
    const dt = Math.min(.04, Math.max(0, (time - last) / 1000));last = time;
    if (ready && !inspecting) {
      const held = (key: string, arrow: string, touch: string) => keys.has(key) || keys.has(arrow) || [...touchKeys.values()].includes(touch);
      let forward = Number(held('KeyW', 'ArrowUp', 'forward')) - Number(held('KeyS', 'ArrowDown', 'back'));
      let right = Number(held('KeyD', 'ArrowRight', 'right')) - Number(held('KeyA', 'ArrowLeft', 'left'));
      const norm = Math.hypot(forward, right) || 1;forward /= norm;right /= norm;
      const speed = 2.8 * dt;
      const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * speed;
      const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * speed;
      if (!blocked(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
      if (!blocked(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
    }
    if (inspecting) orbit?.update();
    const t = time / 1000;
    // Arrival from the portal: a slow glide out of the rear frame to the first view.
    if (arriveAt >= 0) {
      const k = Math.min(1, (t - arriveAt) / 2.8), e = 1 - Math.pow(1 - k, 3);
      camera.position.z = THREE.MathUtils.lerp(11.1, coarse.matches ? 8.4 : 7, e); fx?.setOpen(1);
      if (k >= 1) arriveAt = -1;
    }
    // The astronaut came through with you: he walks to the exhibit, then stands and looks at it.
    if (astro.root.visible) {
      // A wide arc past you on the right, so he never walks through the view.
      const goal = astro.root.position.z > 6.2 ? astroVia : astroTo;
      const d = new THREE.Vector3().subVectors(goal, astro.root.position).setY(0), dist = d.length();
      const walking = t - (arriveAtStart ?? t) > .6 && (goal === astroVia || dist > .08) ? 1 : 0;
      astroWalk += (walking - astroWalk) * Math.min(1, dt * 4);
      if (walking) { astro.root.position.addScaledVector(d.normalize(), Math.min(dist, 1.35 * dt)); astro.root.rotation.y = Math.atan2(d.x, d.z); }
      else { const face = Math.atan2(-.3 - astro.root.position.x * .1, -1); astro.root.rotation.y += (face - astro.root.rotation.y) * Math.min(1, dt * 2); }
      astroPhase += dt * (1 + astroWalk * 5);
      astro.animate(astroPhase, astroWalk, 0, dt, 0, { yaw: .25 * Math.sin(t * .23), pitch: -.08 });
    }
    fx?.update(t, dt);
    // The way back only opens once you have stepped clear of it (you arrive standing in it).
    if (arriveAt < 0 && camera.position.z < 10.2) portalArmed = true;
    if (ready && portalArmed && !leaving && !inspecting && fx?.inPortal(camera.position)) leave();
    if(composer)composer.render();else renderer!.render(scene, camera);frame = requestAnimationFrame(tick);
  }
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
    fx = createRoomFx({ scene, camera, renderer, mobile: coarse.matches });
    astro.root.visible = false; scene.add(astro.root);
    colliders.push(new THREE.Box3(new THREE.Vector3(5.35,0,-3.4),new THREE.Vector3(8.05,2,-2.2)),new THREE.Box3(new THREE.Vector3(-7.1,0,-3.9),new THREE.Vector3(-5.9,1,-.7)));
    composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
    bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.32,.5,1.05);composer.addPass(bloom);composer.addPass(new OutputPass());
    { const r = $('stage').getBoundingClientRect(); fx.extendComposer(composer, Math.max(1, r.width), Math.max(1, r.height)); }
    orbit = new OrbitControls(camera, canvas);orbit.enabled = false;orbit.enableDamping = false;orbit.enablePan = false;
    orbit.minDistance = 1.2;orbit.maxDistance = 18;orbit.maxPolarAngle = Math.PI * .49;orbit.target.copy(target);
    // Reset the orientation after constructing OrbitControls, which calls update().
    look();
    resize = new ResizeObserver(() => {
      if (!renderer) return;const rect = $('stage').getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);composer?.setSize(rect.width, rect.height);fx?.resize(rect.width, rect.height);camera.aspect = rect.width / Math.max(1, rect.height);camera.fov = rect.width < 600 ? 62 : 52;camera.updateProjectionMatrix();
    });resize.observe($('stage'));
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault();fail(); }, { signal });
    // Walking on a desk works like a game: a click captures the pointer, the mouse turns the head,
    // a further click inspects whatever the crosshair is on; Esc gives the pointer back.
    const cross = document.createElement('div'); cross.className = 'mr-cross'; root.append(cross);
    document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; cross.classList.toggle('is-on', locked); root.classList.toggle('is-locked', locked); }, { signal });
    document.addEventListener('mousemove', event => {
      if (!locked || inspecting) return;
      yaw -= event.movementX * .0022; pitch = THREE.MathUtils.clamp(pitch - event.movementY * .0022, -1.2, 1.2); look();
    }, { signal });
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !ready) return;canvas.focus({ preventScroll: true });
      if (event.pointerType === 'mouse' && !coarse.matches && !inspecting) {
        if (!locked) { try { (canvas.requestPointerLock() as unknown as Promise<void> | undefined)?.catch?.(() => {}); } catch { /* not allowed here */ } return; }
        const r = canvas.getBoundingClientRect(); document.exitPointerLock(); select(r.left + r.width / 2, r.top + r.height / 2); return;
      }
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
      canvas.setPointerCapture(event.pointerId);
    }, { signal });
    canvas.addEventListener('pointermove', event => {
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
    $('reset').addEventListener('click', () => { selected = '';selection.visible = false;keys.clear();touchKeys.clear();inspecting ? inspectionHome() : home();labelSelection(); }, { signal });
    $('wire').addEventListener('click', () => {
      wireframe = !wireframe;meshes.forEach(mesh => {
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => { (m as THREE.MeshStandardMaterial).wireframe = wireframe; });
      });labels();
    }, { signal });
    for (const [name, factor] of [['closer', .8], ['farther', 1.25]] as const) $(name).addEventListener('click', () => {
      if (!orbit) return;const offset = camera.position.clone().sub(orbit.target);offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, orbit.minDistance, orbit.maxDistance));camera.position.copy(orbit.target).add(offset);orbit.update();
    }, { signal });
    root.querySelectorAll<HTMLElement>('[data-mr-move]').forEach(button => {
      button.addEventListener('pointerdown', event => { event.preventDefault();button.setPointerCapture(event.pointerId);touchKeys.set(event.pointerId, button.dataset.mrMove!); }, { signal });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => touchKeys.delete((event as PointerEvent).pointerId), { signal });
    });
    addEventListener('keydown', event => {
      if (!ready || event.altKey || event.ctrlKey || event.metaKey || document.body.classList.contains('is-nav-opened')) return;
      if ((event.target as HTMLElement)?.closest('button,a,input,textarea,select,[contenteditable]')) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.code)) { event.preventDefault();keys.add(event.code); }
      if (event.code === 'Escape') mode(false);if (event.code === 'KeyE') mode(true);
    }, { signal });
    addEventListener('keyup', event => keys.delete(event.code), { signal });
    addEventListener('blur', () => { keys.clear();touchKeys.clear();gesture = undefined; }, { signal });
    addEventListener('rb:langchange', labels, { signal });coarse.addEventListener('change', labels, { signal });
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : resume(), { signal });
    addEventListener('pagehide', event => { if (event.persisted) stop();else dispose(); }, { signal });
    addEventListener('pageshow', event => { if (event.persisted) resume(); }, { signal });
    const response = await fetch('/models/exhibits/kitchen-modern-25.glb', { signal: download.signal });
    if (!response.ok) throw new Error(`Exhibit response: ${response.status}`);
    const data = await response.arrayBuffer();
    if (disposed) return;
    const draco = new DRACOLoader(); draco.setDecoderPath('/draco/');
    const gltf = await new GLTFLoader().setDRACOLoader(draco).parseAsync(data, '/models/exhibits/');draco.dispose();
    if (disposed) { disposeTree(gltf.scene);return; }
    model = gltf.scene;model.position.y += .165;model.position.z -= 3.5;scene.add(model);model.updateMatrixWorld(true);
    await design.dressModel(model);if(disposed)return;
    model.traverse(node => {
      const mesh = node as THREE.Mesh;if (!mesh.isMesh) return;
      mesh.castShadow = true;mesh.receiveShadow = true;meshes.push(mesh);
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
    ready = true;root.dataset.state = 'ready';root.dataset.mode = 'walk';$('loading').hidden = true;$('controls').hidden = false;labels();
    if (!reduced) { camera.position.z = 11.1; arriveAt = arriveAtStart = performance.now() / 1000; }
    resume();
  } catch (error) {
    if (!disposed) { console.warn('Model Room could not open', error);fail(); }
  } finally { clearTimeout(timeout); }
}
