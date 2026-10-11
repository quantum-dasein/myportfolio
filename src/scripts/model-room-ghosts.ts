// Other visitors, as ghosts. Everyone in the Model Room at the same time sees everyone else as a translucent,
// glowing astronaut walking where they walk. Nothing about anyone is sent but a random id that lives as long
// as the tab, where they stand and which way they face; nothing is stored.
//
// Transport: Supabase Realtime (a public channel, the project's public anon key), spoken over its Phoenix
// websocket protocol directly, so no client library is loaded. Presence says who is in the room; positions
// go out only while someone else is there to see them, at most five times a second, and only when they change
// (with a keep-alive every few seconds). A tab in the background leaves the room.
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const SOCKET = 'wss://meprkjzcsoixnxwpgtpd.supabase.co/realtime/v1/websocket';
// (The public anon key: it is meant to be in the page. Realtime only lets it use public channels.)
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lcHJranpjc29peG54d3BndHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDcwNTQsImV4cCI6MjEwNzMyMzA1NH0._aZwfinIpiHqzAArEt-c4a81eQLy2jff7Pr5-hxa1V4';
const TOPIC = 'realtime:model-room';

type Pos = { i: string; x: number; z: number; r: number };
type Ghost = { id: string; root: THREE.Object3D; disc: THREE.Mesh; mixer?: THREE.AnimationMixer; idle?: THREE.AnimationAction; walk?: THREE.AnimationAction;
  at: THREE.Vector3; to: THREE.Vector3; yaw: number; toYaw: number; heard: number; fade: number; leaving: boolean; seed: number; speed: number; mat: THREE.ShaderMaterial };

export function createGhosts(o: {
  scene: THREE.Scene; camera: THREE.Camera; renderer: THREE.WebGLRenderer; target: () => THREE.WebGLRenderTarget | null;
  astro: THREE.Object3D; mobile: boolean;
}) {
  const id = Math.random().toString(36).slice(2, 10);
  const max = o.mobile ? 5 : 10;
  const ghosts = new Map<string, Ghost>(), present = new Set<string>();
  let disposed = false;

  // ── Their look: the astronaut's suit, glass-thin, lit from its own edges ──────────────────────────────
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#9ff0c4') }, uFade: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = -mv.xyz; vY = (modelMatrix * vec4(position, 1.)).y; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uFade, uTime; varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.); float scan = .85 + .15 * sin(vY * 38. - uTime * 2.6);
        gl_FragColor = vec4(uColor * (.07 + 1.15 * f) * scan * uFade, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  // A soft pool of light where each one stands.
  const discTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(159,240,196,.55)'); r.addColorStop(1, 'rgba(159,240,196,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const discGeo = new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2);
  const discMat = new THREE.MeshBasicMaterial({ map: discTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 1 });

  // The template, cloned from the astronaut as he stands now (before the guide has posed him), dressed in the
  // ghost material, and compiled before anyone is seen.
  let template: THREE.Object3D | null = null;
  const clips: THREE.AnimationClip[] = (o.astro.userData.clips as THREE.AnimationClip[] | undefined) ?? [];
  function makeTemplate() {
    const t = cloneSkinned(o.astro);
    t.visible = true; t.position.set(0, 0, 0); t.rotation.set(0, 0, 0);
    t.traverse(n => { const m = n as THREE.Mesh; if (!m.isMesh) return; m.castShadow = m.receiveShadow = false; m.frustumCulled = false; if (m.visible) m.material = material; });
    return t;
  }
  try {
    template = makeTemplate();
    const previous = o.renderer.getRenderTarget();
    try { o.renderer.setRenderTarget(o.target()); void o.renderer.compileAsync(template, o.camera as THREE.PerspectiveCamera, o.scene).catch(() => {}); } finally { o.renderer.setRenderTarget(previous); }
  } catch { template = null; }

  function spawn(p: Pos) {
    if (!template || ghosts.size >= max) return;
    const root = cloneSkinned(template), mat = material.clone();
    root.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh && m.material === material) m.material = mat; });
    const disc = new THREE.Mesh(discGeo, discMat.clone());
    const g: Ghost = { id: p.i, root, disc, at: new THREE.Vector3(p.x, 0, p.z), to: new THREE.Vector3(p.x, 0, p.z), yaw: p.r, toYaw: p.r, heard: performance.now(), fade: 0, leaving: false, seed: Math.random() * 10, speed: 0, mat };
    if (clips.length) {
      g.mixer = new THREE.AnimationMixer(root);
      const idle = clips.find(c => c.name === 'idle'), walk = clips.find(c => c.name === 'walk');
      if (idle) g.idle = g.mixer.clipAction(idle).play();
      if (walk) { g.walk = g.mixer.clipAction(walk).play(); g.walk.setEffectiveWeight(0); }
      g.mixer.update(Math.random() * 3);
    }
    o.scene.add(root, disc); ghosts.set(p.i, g);
  }
  function drop(g: Ghost) {
    o.scene.remove(g.root, g.disc); g.mixer?.stopAllAction(); g.mat.dispose(); (g.disc.material as THREE.Material).dispose(); ghosts.delete(g.id);
  }

  // ── The line to the others ────────────────────────────────────────────────────────────────────────────
  let ws: WebSocket | null = null, ref = 0, joined = false, retry = 2000, beat = 0, retryTimer = 0;
  const send = (event: string, payload: unknown, topic = TOPIC) => {
    if (ws?.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ topic, event, payload, ref: String(++ref), join_ref: topic === TOPIC ? '1' : undefined }));
  };
  function connect() {
    if (disposed || ws || document.hidden) return;
    try { ws = new WebSocket(`${SOCKET}?apikey=${KEY}&vsn=1.0.0`); } catch { return; }
    const socket = ws;
    socket.onopen = () => {
      send('phx_join', { config: { broadcast: { ack: false, self: false }, presence: { key: id, enabled: true }, postgres_changes: [], private: false }, access_token: KEY });
      beat = window.setInterval(() => send('heartbeat', {}, 'phoenix'), 25000);
    };
    socket.onmessage = e => {
      let m: { event: string; payload: { status?: string; event?: string; payload?: Pos; joins?: Record<string, unknown>; leaves?: Record<string, unknown> } & Record<string, unknown> };
      try { m = JSON.parse(e.data); } catch { return; }
      if (m.event === 'phx_reply' && m.payload.status === 'ok' && !joined) { joined = true; retry = 2000; send('presence', { type: 'presence', event: 'track', payload: { t: Date.now() } }); }
      else if (m.event === 'presence_state') { present.clear(); for (const k of Object.keys(m.payload)) if (k !== id) present.add(k); lastSent = 0; }
      else if (m.event === 'presence_diff') {
        for (const k of Object.keys(m.payload.joins ?? {})) if (k !== id) { present.add(k); lastSent = 0; }
        for (const k of Object.keys(m.payload.leaves ?? {})) { present.delete(k); const g = ghosts.get(k); if (g) g.leaving = true; }
      } else if (m.event === 'broadcast' && m.payload.event === 'pos') {
        const p = m.payload.payload; if (!p || p.i === id || typeof p.x !== 'number') return;
        const g = ghosts.get(p.i);
        if (!g) spawn(p); else { g.to.set(p.x, 0, p.z); g.toYaw = p.r; g.heard = performance.now(); g.leaving = false; }
      }
    };
    const lost = () => {
      if (ws !== socket) return;
      ws = null; joined = false; clearInterval(beat); present.clear();
      for (const g of ghosts.values()) g.leaving = true;
      if (!disposed && !document.hidden) { retryTimer = window.setTimeout(connect, retry); retry = Math.min(retry * 2, 60000); }
    };
    socket.onclose = lost; socket.onerror = () => socket.close();
  }
  function leave() { clearTimeout(retryTimer); const s = ws; ws = null; joined = false; clearInterval(beat); present.clear(); s?.close(); for (const g of ghosts.values()) g.leaving = true; }
  const visibility = () => (document.hidden ? leave() : connect());
  document.addEventListener('visibilitychange', visibility);
  connect();

  // ── Every frame ───────────────────────────────────────────────────────────────────────────────────────
  let lastSent = 0; const sent = { x: NaN, z: NaN, r: NaN };
  const lerpAngle = (a: number, b: number, k: number) => a + (THREE.MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI) * k;
  return {
    /** `me`: where this visitor stands and faces (null while not walking, e.g. inspecting: the last place stands). */
    update(t: number, dt: number, me: { x: number; z: number; yaw: number } | null) {
      const now = performance.now();
      if (me && joined && present.size) {
        const moved = Math.hypot(me.x - sent.x, me.z - sent.z) > .03 || Math.abs(me.yaw - sent.r) > .04 || Number.isNaN(sent.x);
        if ((moved && now - lastSent > 200) || now - lastSent > 4000) {
          // (Facing: the camera looks down -z at yaw 0; the astronaut faces +z, so he turns half round.)
          send('broadcast', { type: 'broadcast', event: 'pos', payload: { i: id, x: +me.x.toFixed(2), z: +me.z.toFixed(2), r: +me.yaw.toFixed(2) } });
          sent.x = me.x; sent.z = me.z; sent.r = me.yaw; lastSent = now;
        }
      }
      material.uniforms.uTime.value = t;
      for (const g of [...ghosts.values()]) {
        if (now - g.heard > 12000) g.leaving = true;
        g.fade = THREE.MathUtils.clamp(g.fade + dt * (g.leaving ? -1.2 : .9), 0, 1);
        if (g.leaving && g.fade <= 0) { drop(g); continue; }
        const before = g.at.clone();
        g.at.lerp(g.to, 1 - Math.exp(-dt * 6));
        g.yaw = lerpAngle(g.yaw, g.toYaw, 1 - Math.exp(-dt * 6));
        g.speed += (before.distanceTo(g.at) / Math.max(dt, 1e-3) - g.speed) * Math.min(1, dt * 5);
        const walking = THREE.MathUtils.clamp(g.speed / 1.2, 0, 1);
        g.idle?.setEffectiveWeight(1 - walking); g.walk?.setEffectiveWeight(walking); g.mixer?.update(dt);
        g.root.position.set(g.at.x, .04 + Math.sin(t * 1.3 + g.seed) * .03, g.at.z); g.root.rotation.y = g.yaw + Math.PI;
        g.disc.position.set(g.at.x, .012, g.at.z);
        g.mat.uniforms.uFade.value = g.fade * .9; g.mat.uniforms.uTime.value = t + g.seed;
        (g.disc.material as THREE.MeshBasicMaterial).opacity = g.fade * .8;
      }
    },
    count: () => ghosts.size,
    dispose() {
      disposed = true; document.removeEventListener('visibilitychange', visibility); leave();
      for (const g of [...ghosts.values()]) drop(g);
      material.dispose(); discMat.dispose(); discGeo.dispose(); discTex.dispose();
    },
  };
}
