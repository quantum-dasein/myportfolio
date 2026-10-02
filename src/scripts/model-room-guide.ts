// The astronaut in the Model Room is a visitor with a life of his own. He came through the portal with
// you, tours the collection the way people tour a museum (strolling, looking around, stopping at each
// piece) and reacts to every one differently: crouches at the e-bike's wheels, photographs the kitchen,
// is startled by K-2SO and then waves at it, leans over the house model. Tired, he sits down on the sofa
// by the entrance and waits for you, a little impatiently. His reactions show as a small hologram
// above his helmet and in the colour of his visor.
import * as THREE from 'three';
import type { createAstronaut } from './observatory-astronaut';

type Astro = ReturnType<typeof createAstronaut>;
type Pose = { yaw?: number; pitch?: number; wave?: number; sit?: number; tablet?: number; reach?: number };
export type Emote = 'wow' | 'curious' | 'love' | 'photo' | 'hi' | 'spark' | 'think' | 'tired' | 'clock' | 'dots' | 'sleep' | 'happy';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
// Visor colours by mood.
export const TINT: Record<Emote, string> = {
  wow: '#7dffc2', curious: '#9fc8ff', love: '#ff9fc6', photo: '#e8f4ff', hi: '#9dffd0', spark: '#ffe29a',
  think: '#b9b0ff', tired: '#8a97a8', clock: '#ffb76b', dots: '#a9c2c6', sleep: '#6f7c95', happy: '#8dffb4',
};

/** One stop of the tour: where he stands, what he looks at, and his little scene there (seconds from arrival). */
type Beat = { at: number; emote?: Emote; pose?: Pose; hold?: number; look?: THREE.Vector3; step?: number };
type Stop = { id: string; path: THREE.Vector3[]; look: THREE.Vector3; beats: Beat[]; leave: number };

// The tour, laid out for the 28 m hall: he keeps clear of the archive stage in the middle of the floor.
const STOPS: Stop[] = [
  {
    // The SVJ on its turntable: he stops in awe, gets down to the wheel, then declares his love.
    id: 'svj', path: [V(-4.2, 0, 13.2), V(-5.2, 0, 8.6), V(-5, 0, 4.9)], look: V(-8.5, .6, 4.5), leave: 7.2,
    beats: [
      { at: .2, emote: 'wow' },
      { at: 1.1, pose: { sit: .42 }, hold: 2.8, look: V(-6.7, .35, 5.3) },         // down to look at a wheel as it comes round
      { at: 4.3, pose: { reach: .85 }, hold: 1.6, emote: 'love' },                // and points at the car
    ],
  },
  {
    id: 'kitchen', path: [V(-2.6, 0, 3.2), V(.8, 0, .35)], look: V(0, 1.4, -3.4), leave: 6.4,
    beats: [
      { at: .2, emote: 'curious', look: V(-.6, 2.3, -3.8) },                     // up at the cabinets
      { at: 1.8, pose: { tablet: 1 }, hold: 2.2, look: V(0, 1.3, -3.4) },         // a photo for later
      { at: 3, emote: 'photo' },
      { at: 4.6, emote: 'love' },
    ],
  },
  {
    id: 'k2so', path: [V(5.95, 0, 2.05)], look: V(7.5, 2.45, 1.5), leave: 7,
    beats: [
      { at: .2, emote: 'curious' },
      { at: 1.6, emote: 'wow', step: -.35 },                                     // startled by how tall it is
      { at: 2.8, pose: { wave: 1 }, hold: 2.4, emote: 'hi' },                    // then says hello
      { at: 5.6, emote: 'dots' },
    ],
  },
  {
    // The e-bike on the wall: he looks it over from wheel to wheel and points up at it.
    id: 'ebike', path: [V(9.6, 0, 4.2), V(11.95, 0, 6)], look: V(13.4, 1.45, 6), leave: 5.6,
    beats: [
      { at: .2, emote: 'curious', look: V(13.4, 1.3, 5.2) },
      { at: 1.4, look: V(13.4, 1.3, 6.8) },
      { at: 2.6, pose: { reach: .9 }, hold: 1.6, emote: 'spark', look: V(13.4, 1.5, 6) },
    ],
  },
  {
    id: 'house', path: [V(9.6, 0, 7.2), V(6.9, 0, 8.2), V(6.9, 0, 9.2)], look: V(8.2, .95, 9.2), leave: 6.6,
    beats: [
      { at: .2, emote: 'think' },
      { at: 1, pose: { sit: .22 }, hold: 3, look: V(8.2, .95, 8.7) },            // bends to the model's eye level
      { at: 2.4, look: V(8.2, .95, 9.7) },                                        // along the three variants
      { at: 4.3, pose: { reach: .7 }, hold: 1.4, emote: 'spark' },
    ],
  },
];
const TO_SOFA = [V(4.2, 0, 12.2), V(-3.6, 0, 12.7)];
export function bubble(kind: Emote) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')!;
  // A hologram speech bubble: dark glass, a mint outline, a little tail.
  x.fillStyle = 'rgba(8,20,16,.72)'; x.strokeStyle = 'rgba(140,255,200,.95)'; x.lineWidth = 7;
  x.beginPath(); x.roundRect(28, 24, 200, 168, 44); x.moveTo(112, 192); x.lineTo(128, 226); x.lineTo(146, 192); x.fill(); x.stroke();
  x.fillStyle = '#eafff4'; x.strokeStyle = '#eafff4'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const text = (s: string, size: number) => { x.font = `700 ${size}px system-ui, sans-serif`; x.fillText(s, 128, 112); };
  switch (kind) {
    case 'wow': text('!', 128); break;
    case 'curious': text('?', 124); break;
    case 'love': x.fillStyle = '#ff9fc6'; text('♥', 118); break;
    case 'spark': x.fillStyle = '#ffe29a'; text('✦', 108); break;
    case 'hi': text('hi!', 84); break;
    case 'think': case 'dots': text('…', 110); break;
    case 'happy': x.fillStyle = '#8dffb4'; text('☺', 118); break;
    case 'sleep': text('zZ', 88); break;
    case 'tired': text('~', 130); break;
    case 'photo': // a little camera
      x.lineWidth = 9; x.beginPath(); x.roundRect(64, 76, 128, 84, 14); x.stroke();
      x.beginPath(); x.arc(128, 118, 24, 0, Math.PI * 2); x.stroke(); x.fillRect(90, 64, 34, 14); break;
    case 'clock': // an impatient clock
      x.lineWidth = 9; x.beginPath(); x.arc(128, 110, 50, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.moveTo(128, 110); x.lineTo(128, 78); x.moveTo(128, 110); x.lineTo(152, 122); x.stroke(); break;
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createGuide(o: {
  scene: THREE.Scene; astro: Astro; camera: THREE.Camera; reduced: boolean;
  from: THREE.Vector3; shown: (id: string) => boolean; seat: () => { at: THREE.Vector3; stand: THREE.Vector3; via: THREE.Vector3; face: number } | null;
  chirp?: (kind: Emote) => void;
  /** Seconds the visitor has stood still, and whether a point on the floor is free to walk through. */
  idle?: () => number; clear?: (x: number, z: number) => boolean;
}) {
  const { astro, camera } = o, root = astro.root;
  const textures = new Map<Emote, THREE.CanvasTexture>();
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0 }));
  sprite.scale.setScalar(.001); sprite.renderOrder = 5; o.scene.add(sprite);
  let emoteAt = -1, emoteKind: Emote | null = null;
  const visor = root.userData.visorUniforms?.uVisorTint?.value as THREE.Color | undefined, visorGoal = new THREE.Color('#9fb6d0');
  function emote(kind: Emote, t: number) {
    if (!textures.has(kind)) textures.set(kind, bubble(kind));
    sprite.material.map = textures.get(kind)!; sprite.material.needsUpdate = true;
    emoteAt = t; emoteKind = kind; visorGoal.set(TINT[kind]); o.chirp?.(kind);
  }

  // Where he is in his visit.
  type Phase = 'idle' | 'walk' | 'stop' | 'sofa-walk' | 'sit-down' | 'wait' | 'stand-up' | 'visit-walk' | 'greet';
  let phase: Phase = 'idle', stopIndex = 0, path: THREE.Vector3[] = [], stopAt = 0, beatIndex = 0, phaseAt = 0, startedAt = -1;
  let approached = false, walk = 0, astroPhase = 0, sit = 0, waitNext = 0, greetedAt = -1e9, blockedSince = -1;
  const pose: Required<Pose> = { yaw: 0, pitch: -.08, wave: 0, sit: 0, tablet: 0, reach: 0 };
  const goal: Required<Pose> = { ...pose };
  let lookAt: THREE.Vector3 | null = null, holdUntil = 0, stepBack = 0;
  const head = new THREE.Vector3(), tmp = new THREE.Vector3(), seatAt = new THREE.Vector3(), standAt = new THREE.Vector3();
  // A visit: when you stand still for a long while, he gets up, comes over to wave, and goes back to his seat.
  let visitedAt = -1e9, route: THREE.Vector3[] = [];
  const HUB = V(0, 0, 13);
  function walkable(a: THREE.Vector3, b: THREE.Vector3) {
    if (!o.clear) return false;
    const n = Math.ceil(a.distanceTo(b) / .2);
    for (let i = 1; i <= n; i++) { const k = i / n; if (!o.clear(a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k)) return false; }
    return true;
  }
  /** A way from the seat's approach to a spot beside the visitor: straight, or through the open floor by the door. */
  function planVisit(from: THREE.Vector3) {
    const cam = camera.position, dir = tmp.set(root.position.x - cam.x, 0, root.position.z - cam.z).normalize();
    for (const reach of [1.5, 1.9, 1.2]) {
      const spot = V(cam.x + dir.x * reach, 0, cam.z + dir.z * reach);
      if (!o.clear?.(spot.x, spot.z)) continue;
      if (walkable(from, spot)) return [spot];
      if (walkable(from, HUB) && walkable(HUB, spot)) return [HUB.clone(), spot];
    }
    return null;
  }

  function begin(t: number) { startedAt = t; phase = 'walk'; stopIndex = 0; path = STOPS[0].path.map(p => p.clone()); root.position.copy(o.from); root.visible = !o.reduced; }
  function goToSofa(t: number) { phase = 'sofa-walk'; path = TO_SOFA.map(p => p.clone()); emote('tired', t); }

  function faceTowards(target: THREE.Vector3, dt: number, rate = 3) {
    const want = Math.atan2(target.x - root.position.x, target.z - root.position.z);
    root.rotation.y += Math.atan2(Math.sin(want - root.rotation.y), Math.cos(want - root.rotation.y)) * Math.min(1, dt * rate);
  }
  /** Head yaw/pitch (relative to the body) that look at a point. */
  function gaze(target: THREE.Vector3) {
    head.set(root.position.x, root.position.y + 1.62, root.position.z);
    tmp.subVectors(target, head);
    const yaw = Math.atan2(tmp.x, tmp.z) - root.rotation.y;
    goal.yaw = THREE.MathUtils.clamp(Math.atan2(Math.sin(yaw), Math.cos(yaw)), -1.1, 1.1);
    goal.pitch = THREE.MathUtils.clamp(-Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)) * .9, -.85, .6);
  }

  function update(t: number, dt: number) {
    if (!root.visible || startedAt < 0) return;
    const cam = camera.position;
    goal.wave = goal.tablet = goal.reach = 0; goal.sit = 0;
    let moving = false;

    if (phase === 'walk' || phase === 'sofa-walk' || phase === 'visit-walk') {
      const target = path[0];
      // Visiting, he stops once he is beside you.
      if (phase === 'visit-walk' && Math.hypot(cam.x - root.position.x, cam.z - root.position.z) < 1.35) path.length = 0;
      if (target && path.length) {
        tmp.subVectors(target, root.position).setY(0); const dist = tmp.length();
        // Polite: if you stand right in his way, he waits a moment (not in the first seconds, when he walks past you on purpose).
        const inWay = phase !== 'visit-walk' && t - startedAt > 5 && Math.hypot(cam.x - root.position.x, cam.z - root.position.z) < 1 && tmp.dot(new THREE.Vector3(cam.x - root.position.x, 0, cam.z - root.position.z)) > 0;
        if (inWay) { if (blockedSince < 0) { blockedSince = t; emote('dots', t); } } else blockedSince = -1;
        if (!inWay || t - blockedSince > 4) {
          const speed = phase === 'sofa-walk' ? .8 : 1.05;
          root.position.addScaledVector(tmp.normalize(), Math.min(dist, speed * dt)); moving = true;
          const want = Math.atan2(tmp.x, tmp.z); root.rotation.y += Math.atan2(Math.sin(want - root.rotation.y), Math.cos(want - root.rotation.y)) * Math.min(1, dt * 5);
        }
        if (dist < .06) path.shift();
        // Strolling, he looks around the room: up at the ring of light, across to the pieces.
        goal.yaw = .45 * Math.sin(t * .6) + .2 * Math.sin(t * 1.7); goal.pitch = -.12 - .12 * Math.sin(t * .37);
      } else if (phase === 'walk') { phase = 'stop'; stopAt = t; beatIndex = 0; lookAt = STOPS[stopIndex].look; holdUntil = 0; }
      else if (phase === 'visit-walk') { phase = 'greet'; phaseAt = t; emote('hi', t); holdUntil = t + 2.6; pending.wave = 1; }
      else { const s = o.seat(); if (s && !approached) { approached = true; path.push(s.via.clone(), s.stand.clone()); } else if (s) { phase = 'sit-down'; phaseAt = t; seatAt.copy(s.at); standAt.copy(root.position); } }
    }

    if (phase === 'stop') {
      const stop = STOPS[stopIndex], local = t - stopAt;
      // A piece still being printed into the room: he waits and watches it arrive.
      if (!o.shown(stop.id) && local > 1) { stopAt = t - 1; gaze(stop.look); }
      else {
        while (beatIndex < stop.beats.length && local >= stop.beats[beatIndex].at) {
          const beat = stop.beats[beatIndex++];
          if (beat.emote) emote(beat.emote, t);
          if (beat.look) lookAt = beat.look;
          if (beat.pose) { holdUntil = t + (beat.hold ?? 1.5); Object.assign(pending, beat.pose); }
          if (beat.step) stepBack = beat.step;
        }
        if (t < holdUntil) Object.assign(goal, pending); else for (const k of Object.keys(pending)) delete (pending as Record<string, number>)[k];
        if (local >= stop.leave) {
          stopIndex++; lookAt = null;
          if (stopIndex < STOPS.length) { phase = 'walk'; path = STOPS[stopIndex].path.map(p => p.clone()); }
          else goToSofa(t);
        }
      }
      faceTowards(stop.look, dt);
      if (stepBack) { const d = Math.sign(stepBack) * Math.min(Math.abs(stepBack), dt * 1.2); root.position.x -= Math.sin(root.rotation.y) * -d; root.position.z -= Math.cos(root.rotation.y) * -d; stepBack -= d; if (Math.abs(stepBack) < .005) stepBack = 0; }
      if (lookAt) gaze(lookAt);
    }

    if (phase === 'sit-down') {
      // Standing in front of the seat: turn his back to the sofa first, then lower himself back onto it,
      // the way people sit down, so he never walks through the cushions.
      const local = t - phaseAt, turn = .8, down = 1.5;
      const s = o.seat(); if (s) faceTowards(tmp.set(root.position.x + Math.sin(s.face), 0, root.position.z + Math.cos(s.face)), dt, 5);
      const k = THREE.MathUtils.clamp((local - turn) / down, 0, 1), e = k * k * (3 - 2 * k);
      root.position.x = THREE.MathUtils.lerp(standAt.x, seatAt.x, e); root.position.z = THREE.MathUtils.lerp(standAt.z, seatAt.z, e);
      goal.sit = e; if (k >= 1) { phase = 'wait'; phaseAt = t; waitNext = t + 3; emote('tired', t); }
    }

    if (phase === 'stand-up') {
      // Getting up: forward off the seat to where he sat down from, then off he goes.
      const k = THREE.MathUtils.clamp((t - phaseAt) / 1.2, 0, 1), e = k * k * (3 - 2 * k);
      root.position.x = THREE.MathUtils.lerp(seatAt.x, standAt.x, e); root.position.z = THREE.MathUtils.lerp(seatAt.z, standAt.z, e);
      goal.sit = 1 - e; tmp.set(cam.x, cam.y, cam.z); gaze(tmp);
      if (k >= 1) { phase = 'visit-walk'; path = route.map(p => p.clone()); }
    }

    if (phase === 'greet') {
      // Beside you: he faces you, waves, and is pleased to have company. Then back to the sofa.
      tmp.set(cam.x, 0, cam.z); faceTowards(tmp, dt, 4); tmp.set(cam.x, cam.y, cam.z); gaze(tmp);
      if (t < holdUntil) Object.assign(goal, pending); else delete pending.wave;
      if (t - phaseAt > 1.4 && emoteKind === 'hi' && t - emoteAt > 1.3) emote('happy', t);
      if (t - phaseAt > 4.2) {
        const s = o.seat();
        if (s) { phase = 'sofa-walk'; approached = true; path = [...route.slice(0, -1).reverse().map(p => p.clone()), s.via.clone(), s.stand.clone()]; }
      }
    }

    if (phase === 'wait') {
      goal.sit = 1;
      // You have stood still for a long while, away from him: he comes over to see you.
      if (o.idle && o.idle() > 15 && t - visitedAt > 45 && t - phaseAt > 6 && Math.hypot(cam.x - root.position.x, cam.z - root.position.z) > 3.6) {
        const s = o.seat(); visitedAt = t;
        const plan = s && planVisit(s.via);
        if (s && plan) { route = [s.via.clone(), ...plan]; phase = 'stand-up'; phaseAt = t; seatAt.copy(root.position).setY(0); standAt.copy(s.stand); emote('curious', t); }
        else { emote('hi', t); holdUntil = t + 2.4; pending.wave = 1; }
      }
    }
    if (phase === 'wait') {
      const near = Math.hypot(cam.x - root.position.x, cam.z - root.position.z) < 3.4;
      // You came back: he lights up and waves from the sofa.
      if (near && t - greetedAt > 9) { greetedAt = t; emote(Math.random() < .5 ? 'happy' : 'hi', t); holdUntil = t + 2.4; pending.wave = 1; }
      if (t >= waitNext && !near) {
        // Impatient: checks the time on his tablet, looks around for you, drums, or nods off.
        const r = Math.random(), waited = t - phaseAt;
        if (r < .3) { pending.tablet = 1; holdUntil = t + 2.6; emote('clock', t); }
        else if (r < .55) { emote('dots', t); }
        else if (r < .75 || waited < 40) { emote(Math.random() < .5 ? 'curious' : 'clock', t); }
        else emote('sleep', t);
        waitNext = t + 5 + Math.random() * 4;
      }
      if (t < holdUntil) Object.assign(goal, pending, { sit: 1 }); else { delete pending.wave; delete pending.tablet; }
      // He watches you (or the room if you are behind him), and his foot taps.
      tmp.set(cam.x, cam.y, cam.z); gaze(tmp);
      if (goal.yaw > 1 || goal.yaw < -1) { goal.yaw = .5 * Math.sin(t * .4); goal.pitch = -.1; }
      if (emoteKind === 'sleep' && t - emoteAt < 3) goal.pitch = .45;
    }

    // Ease the pose, walk the legs, move the head.
    walk += ((moving ? 1 : 0) - walk) * Math.min(1, dt * 4);
    for (const k of Object.keys(pose) as (keyof Pose)[]) pose[k] += (goal[k] - pose[k]) * Math.min(1, dt * (k === 'yaw' || k === 'pitch' ? 3 : 4));
    sit = pose.sit;
    // Sitting on the sofa rather than the floor: the seat carries him.
    root.position.y = phase === 'wait' || phase === 'sit-down' || phase === 'stand-up' ? sit * (root.userData.seatLift ?? .72) : 0;
    if (phase === 'wait') root.position.y += Math.max(0, Math.sin(t * 7.5)) * .006 * (emoteKind === 'clock' ? 1 : .3);   // a tapping foot
    astroPhase += dt * (1 + walk * 5);
    astro.animate(astroPhase, walk, 0, dt, 0, { yaw: pose.yaw, pitch: pose.pitch, wave: pose.wave, sit: pose.sit, tablet: pose.tablet, reach: pose.reach });

    // The hologram: pops in, floats, fades after a couple of seconds.
    const age = t - emoteAt, life = 2.6;
    if (emoteKind && age < life) {
      const pop = age < .35 ? 1.18 * Math.sin(age / .35 * Math.PI / 2) : 1 + .05 * Math.sin(age * 5);
      sprite.scale.setScalar(.42 * pop);
      sprite.position.set(root.position.x, root.position.y + (phase === 'wait' ? 1.75 : 2.2) + age * .06, root.position.z);
      sprite.material.opacity = Math.min(1, age * 5) * (1 - THREE.MathUtils.smoothstep(age, life - .6, life));
    } else sprite.material.opacity = 0;
    if (visor) { visor.lerp(visorGoal, Math.min(1, dt * 2)); if (!emoteKind || age > life) visorGoal.lerp(new THREE.Color('#9fb6d0'), Math.min(1, dt * .5)); }
  }
  const pending: Pose = {};

  return {
    begin, update, emote,
    dispose() { textures.forEach(t => t.dispose()); sprite.material.dispose(); o.scene.remove(sprite); },
  };
}
