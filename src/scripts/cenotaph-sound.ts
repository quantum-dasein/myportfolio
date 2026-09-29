// The sound of the cenotaph, synthesised on the site's shared audio context.
// Music (with the site's sound toggle): wind on the approach, steps down the tunnel, then a slow
// warm pad of soft sines in a long stone reverb, drifting through four chords; each star that lights
// in the corrected address rings a quiet bell. Actions (always, since the visitor made them): a
// jump and its landing, an apple thrown, apples knocking on stone and on a helmet, footsteps.
import type { CenotaphEvent } from './cenotaph';

export type SoundEvent = CenotaphEvent | 'jump' | 'land' | 'throw' | 'step' | 'talk';

export function mountCenotaphSound(video: HTMLVideoElement, filmEnd: number) {
  const html = document.documentElement;
  const wanted = () => html.classList.contains('rb-sound') && !html.classList.contains('rb-calm') && !document.hidden;
  let ctx: AudioContext | null = null;
  let music: GainNode, sfx: GainNode, bus: GainNode, sfxBus: GainNode, wind: GainNode, pad: GainNode;
  let raf = 0, stepAt = 0, chordAt = 0, chordIx = 0;
  const voices: { osc: OscillatorNode[]; g: GainNode }[] = [];

  function impulse(c: AudioContext, seconds: number, decay: number) {
    const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0;
      // Darker as it decays, like air in a big stone room.
      for (let i = 0; i < n; i++) { const k = i / n; lp += (Math.random() * 2 - 1 - lp) * (.25 - .2 * k); d[i] = lp * Math.pow(1 - k, decay); }
    }
    return buf;
  }
  const noiseBuf = new Map<number, AudioBuffer>();
  function noise(c: AudioContext, seconds = 2) {
    if (noiseBuf.has(seconds)) return noiseBuf.get(seconds)!;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf.set(seconds, buf); return buf;
  }
  // Four slow chords (D minor 9, B flat maj 7, F add 9, C sus): soft, a little melancholy.
  const CHORDS = [[73.42, 146.83, 220, 261.63, 329.63], [58.27, 116.54, 174.61, 220, 293.66], [87.31, 130.81, 174.61, 196, 261.63], [65.41, 130.81, 196, 233.08, 293.66]];

  function ensure() {
    if (ctx) return ctx;
    ctx = (window as unknown as { __rbAudioContext?: () => AudioContext | null }).__rbAudioContext?.() ?? null;
    if (!ctx) return null;
    const c = ctx;
    const limit = c.createDynamicsCompressor(); limit.threshold.value = -12; limit.knee.value = 8; limit.ratio.value = 8; limit.attack.value = .004; limit.release.value = .3;
    limit.connect(c.destination);
    const verb = c.createConvolver(); verb.buffer = impulse(c, 6, 2.8);
    const warm = c.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 3200;
    music = c.createGain(); music.gain.value = 0; music.connect(limit);
    sfx = c.createGain(); sfx.gain.value = .9; sfx.connect(limit);
    const wet = c.createGain(); wet.gain.value = .7; verb.connect(warm).connect(wet).connect(music);
    const dry = c.createGain(); dry.gain.value = .35; dry.connect(music);
    bus = c.createGain(); bus.connect(verb); bus.connect(dry);
    // Actions get their own touch of the same room, so they sound like they happen in it.
    const sverb = c.createConvolver(); sverb.buffer = impulse(c, 3.5, 3);
    const swet = c.createGain(); swet.gain.value = .35; sverb.connect(swet).connect(sfx);
    sfxBus = c.createGain(); sfxBus.connect(sfx); sfxBus.connect(sverb);
    // Pad: five soft voices, each a sine with a quiet octave, gently detuned and breathing.
    pad = c.createGain(); pad.gain.value = 0;
    const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 1400; tone.Q.value = .3;
    pad.connect(tone).connect(bus);
    for (let v = 0; v < 5; v++) {
      const g = c.createGain(); g.gain.value = 0; g.connect(pad);
      const osc = [0, 1].map(k => { const o = c.createOscillator(); o.type = k ? 'triangle' : 'sine'; o.detune.value = (v % 2 ? 4 : -4) + k * 2; const og = c.createGain(); og.gain.value = k ? .18 : 1; o.connect(og).connect(g); o.start(); return o; });
      const lfo = c.createOscillator(); lfo.frequency.value = .05 + v * .013; const lg = c.createGain(); lg.gain.value = .25; lfo.connect(lg).connect(g.gain); lfo.start();
      voices.push({ osc, g });
    }
    setChord(0, true);
    const src = c.createBufferSource(); src.buffer = noise(c, 4); src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    wind = c.createGain(); wind.gain.value = 0; src.connect(lp).connect(wind).connect(music); src.start();
    return c;
  }
  function setChord(i: number, now = false) {
    if (!ctx) return;
    const t = ctx.currentTime, glide = now ? .01 : 5;
    CHORDS[i].forEach((f, v) => {
      voices[v].osc[0].frequency.setTargetAtTime(f, t, glide / 3);
      voices[v].osc[1].frequency.setTargetAtTime(f * 2, t, glide / 3);
      voices[v].g.gain.setTargetAtTime(v === 0 ? .1 : .07 / (1 + v * .2), t, 1);
    });
  }
  const ramp = (p: AudioParam, v: number, s = .8) => { if (!ctx) return; p.cancelScheduledValues(ctx.currentTime); p.setTargetAtTime(v, ctx.currentTime, s / 3); };

  /** A filtered noise burst: footsteps, knocks, a whoosh. */
  function burst(o: { f: number; q?: number; type?: BiquadFilterType; dur: number; level: number; attack?: number; to?: number; dest?: AudioNode }) {
    if (!ctx) return;
    const c = ctx, t = c.currentTime, src = c.createBufferSource(); src.buffer = noise(c, 1);
    const bp = c.createBiquadFilter(); bp.type = o.type ?? 'bandpass'; bp.frequency.setValueAtTime(o.f, t); bp.Q.value = o.q ?? 1.2;
    if (o.to) bp.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.level, t + (o.attack ?? .005)); g.gain.exponentialRampToValueAtTime(.0005, t + o.dur);
    src.connect(bp).connect(g).connect(o.dest ?? sfxBus); src.start(t, Math.random() * .5); src.stop(t + o.dur + .05);
  }
  function tone(freq: number, dur: number, level: number, o: { type?: OscillatorType; glide?: number; attack?: number; dest?: AudioNode } = {}) {
    if (!ctx) return;
    const c = ctx, t = c.currentTime, osc = c.createOscillator(); osc.type = o.type ?? 'sine'; osc.frequency.setValueAtTime(freq, t);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(freq * o.glide, t + dur * .6);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + (o.attack ?? .01)); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    osc.connect(g).connect(o.dest ?? bus); osc.start(t); osc.stop(t + dur + .05);
  }
  // A soft bell: a sine with one inharmonic partial, slow attack.
  const bell = (f: number, level: number) => { tone(f, 4, level, { attack: .04 }); tone(f * 2.76, 1.6, level * .18, { attack: .02 }); };
  const PENTA = [293.66, 349.23, 392, 440, 523.25, 587.33];

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!ctx || !wanted()) return;
    const t = video.ended ? filmEnd + 1 : video.currentTime;
    ramp(wind.gain, t < 7.4 ? .22 : t < 9 ? .07 : 0, 1.2);
    ramp(pad.gain, t > 9.4 ? 1 : 0, t > 9.4 ? 5 : 1);
    if (t > 7.3 && t < 9.9 && !video.paused && performance.now() > stepAt) { burst({ f: 700 + Math.random() * 300, dur: .09, level: .35, dest: bus }); stepAt = performance.now() + 470 + Math.random() * 40; }
    const now = performance.now();
    if (t > 9.4 && now > chordAt) { chordAt = now + 11000; setChord(chordIx = (chordIx + 1) % CHORDS.length); }
  }
  const sync = () => { if (wanted()) { ensure(); if (ctx?.state === 'suspended') ctx.resume().catch(() => {}); } if (ctx) ramp(music.gain, wanted() ? .9 : 0, .8); };
  new MutationObserver(sync).observe(html, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  sync(); tick();
  // Start the audio engine on the visitor's first gesture anywhere on the page, so the first jump or
  // throw plays at once instead of waiting for the engine to wake.
  const warm = () => { ensure(); if (ctx?.state === 'suspended') ctx.resume().catch(() => {}); };
  addEventListener('pointerdown', warm, { once: true, capture: true });
  addEventListener('keydown', warm, { once: true, capture: true });

  const ACTIONS = new Set<SoundEvent>(['jump', 'land', 'throw', 'step', 'apple-hit', 'apple-bounce', 'talk']);
  return {
    event(e: SoundEvent, detail?: unknown) {
      // Actions always sound: the visitor's own gesture has just unlocked audio. Music waits for the toggle.
      if (ACTIONS.has(e)) {
        if (document.hidden) return;
        ensure(); if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      } else if (!ctx || !wanted()) return;
      const k = typeof detail === 'number' ? Math.min(1.5, detail) : 1;
      switch (e) {
        case 'jump': burst({ f: 300, to: 900, type: 'bandpass', q: .8, dur: .28, level: .22, attack: .02 }); burst({ f: 180, dur: .06, level: .35, q: 2 }); break;
        case 'land': burst({ f: 140, dur: .16, level: .7 * k, q: 1.5 }); burst({ f: 2400, dur: .05, level: .12 * k, q: 1 }); tone(62, .25, .35 * k, { glide: .7, dest: sfxBus }); break;
        case 'throw': burst({ f: 500, to: 2600, type: 'bandpass', q: .7, dur: .32, level: .28, attack: .06 }); break;
        case 'step': burst({ f: 520 + Math.random() * 200, dur: .08, level: .16, q: 1.6 }); break;
        case 'apple-hit': tone(380, .22, .45, { type: 'triangle', glide: .55, dest: sfxBus }); burst({ f: 1600, dur: .05, level: .3, q: 3 }); tone(2100, .5, .05, { dest: sfxBus }); break;
        case 'apple-bounce': tone(170 + Math.random() * 40, .16, .35 * k, { glide: .6, dest: sfxBus }); burst({ f: 900, dur: .04, level: .2 * k, q: 2 }); break;
        case 'talk': bell(587.33, .05); break;
        case 'star': { const i = Number(detail) || 0; bell(PENTA[(i * 2) % PENTA.length], .055); break; }
        case 'repaired': tone(146.83, 7, .14, { attack: 1.2 }); tone(220, 7, .1, { attack: 1.6 }); tone(293.66, 6, .06, { attack: 2 }); break;
        case 'visitor': bell(880, .05); break;
        case 'open': bell(440, .06); break;
      }
    },
    dispose() { cancelAnimationFrame(raf); },
  };
}
