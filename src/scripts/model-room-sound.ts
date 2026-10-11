// The Model Room's own music, synthesised on the site's shared audio context (no downloads).
// Music follows the site's sound switch and replaces the studio drone while you are in the room:
// a slow, warm pad in A (the key the archive plays for this room) drifting through four chords in a
// long gallery reverb, with a soft bell now and then, and the hum of the return portal that grows as
// you walk towards it. Actions sound regardless, since the visitor just made them: footsteps, the
// arrival out of the light, stepping back into it, picking out a detail.
const html = document.documentElement;
const wanted = () => html.classList.contains('rb-sound') && !html.classList.contains('rb-calm') && !document.hidden;

// Amaj9, F#m9, Dmaj9, E6sus: open and bright, never sad; the lowest voice carries the root.
const CHORDS = [
  [55, 110, 164.81, 207.65, 246.94],
  [46.25, 92.5, 164.81, 220, 277.18],
  [36.71, 73.42, 185, 220, 329.63],
  [41.2, 82.41, 185, 246.94, 277.18],
];
const BELLS = [659.25, 739.99, 880, 987.77, 1108.73, 1318.51];

export function createRoomSound() {
  let ctx: AudioContext | null = null;
  let music!: GainNode, sfx!: GainNode, bus!: GainNode, sfxBus!: GainNode, pad!: GainNode, hum!: GainNode, humTone!: BiquadFilterNode;
  const voices: { osc: OscillatorNode[]; g: GainNode }[] = [];
  let chordAt = 0, chordIx = 0, bellAt = 0, stepAt = 0, droneMuted = false;

  function impulse(c: AudioContext, seconds: number, decay: number) {
    const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0;
      for (let i = 0; i < n; i++) { const k = i / n; lp += (Math.random() * 2 - 1 - lp) * (.3 - .22 * k); d[i] = lp * Math.pow(1 - k, decay); }
    }
    return buf;
  }
  let noiseBuf: AudioBuffer | null = null;
  const noise = (c: AudioContext) => {
    if (noiseBuf) return noiseBuf;
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  };

  function ensure() {
    if (ctx) return ctx;
    ctx = (window as unknown as { __rbAudioContext?: () => AudioContext | null }).__rbAudioContext?.() ?? null;
    if (!ctx) return null;
    const c = ctx;
    const limit = c.createDynamicsCompressor(); limit.threshold.value = -14; limit.knee.value = 8; limit.ratio.value = 6; limit.release.value = .3;
    limit.connect(c.destination);
    const verb = c.createConvolver(); verb.buffer = impulse(c, 4.5, 2.6);
    const warm = c.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 3600;
    music = c.createGain(); music.gain.value = 0; music.connect(limit);
    sfx = c.createGain(); sfx.gain.value = .85; sfx.connect(limit);
    const wet = c.createGain(); wet.gain.value = .65; verb.connect(warm).connect(wet).connect(music);
    const dry = c.createGain(); dry.gain.value = .4; dry.connect(music);
    bus = c.createGain(); bus.connect(verb); bus.connect(dry);
    const sverb = c.createConvolver(); sverb.buffer = impulse(c, 2.2, 3);
    const swet = c.createGain(); swet.gain.value = .3; sverb.connect(swet).connect(sfx);
    sfxBus = c.createGain(); sfxBus.connect(sfx); sfxBus.connect(sverb);
    // Pad: five voices of sine plus a quiet triangle an octave up, slowly breathing.
    pad = c.createGain(); pad.gain.value = 0;
    const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 1500; tone.Q.value = .3;
    const sway = c.createOscillator(); sway.frequency.value = .04; const swayDepth = c.createGain(); swayDepth.gain.value = 450; sway.connect(swayDepth).connect(tone.frequency); sway.start();
    pad.connect(tone).connect(bus);
    for (let v = 0; v < 5; v++) {
      const g = c.createGain(); g.gain.value = 0; g.connect(pad);
      const osc = [0, 1].map(k => { const o = c.createOscillator(); o.type = k ? 'triangle' : 'sine'; o.detune.value = (v % 2 ? 5 : -5) + k * 3; const og = c.createGain(); og.gain.value = k ? .14 : 1; o.connect(og).connect(g); o.start(); return o; });
      const lfo = c.createOscillator(); lfo.frequency.value = .045 + v * .017; const lg = c.createGain(); lg.gain.value = .02; lfo.connect(lg).connect(g.gain); lfo.start();
      voices.push({ osc, g });
    }
    setChord(0, true);
    // The portal: a low A with its fifth, and a breath of filtered air that opens up as you near it.
    hum = c.createGain(); hum.gain.value = 0; hum.connect(bus);
    for (const [f, l] of [[55, .5], [82.41, .25], [220, .08]] as const) { const o = c.createOscillator(); o.frequency.value = f; const g = c.createGain(); g.gain.value = l; o.connect(g).connect(hum); o.start(); }
    const air = c.createBufferSource(); air.buffer = noise(c); air.loop = true;
    humTone = c.createBiquadFilter(); humTone.type = 'bandpass'; humTone.frequency.value = 600; humTone.Q.value = .7;
    const airGain = c.createGain(); airGain.gain.value = .18; air.connect(humTone).connect(airGain).connect(hum); air.start();
    return c;
  }
  function setChord(i: number, now = false) {
    if (!ctx) return;
    const t = ctx.currentTime, glide = now ? .01 : 4;
    CHORDS[i].forEach((f, v) => {
      voices[v].osc[0].frequency.setTargetAtTime(f, t, glide / 3);
      voices[v].osc[1].frequency.setTargetAtTime(f * 2, t, glide / 3);
      voices[v].g.gain.setTargetAtTime(v === 0 ? .09 : .065 / (1 + v * .15), t, 1);
    });
  }
  const ramp = (p: AudioParam, v: number, s = .8) => { if (!ctx) return; p.cancelScheduledValues(ctx.currentTime); p.setTargetAtTime(v, ctx.currentTime, s / 3); };
  function tone(freq: number, dur: number, level: number, o: { type?: OscillatorType; glide?: number; attack?: number; delay?: number; dest?: AudioNode } = {}) {
    if (!ctx) return;
    const c = ctx, t = c.currentTime + (o.delay ?? 0), osc = c.createOscillator(); osc.type = o.type ?? 'sine'; osc.frequency.setValueAtTime(freq, t);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(freq * o.glide, t + dur * .7);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + (o.attack ?? .01)); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    osc.connect(g).connect(o.dest ?? bus); osc.start(t); osc.stop(t + dur + .05); osc.onended = () => osc.disconnect();
  }
  function burst(o: { f: number; to?: number; q?: number; dur: number; level: number; attack?: number; dest?: AudioNode }) {
    if (!ctx) return;
    const c = ctx, t = c.currentTime, src = c.createBufferSource(); src.buffer = noise(c);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(o.f, t); bp.Q.value = o.q ?? 1.2;
    if (o.to) bp.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.level, t + (o.attack ?? .005)); g.gain.exponentialRampToValueAtTime(.0005, t + o.dur);
    src.connect(bp).connect(g).connect(o.dest ?? sfxBus); src.start(t, Math.random()); src.stop(t + o.dur + .05);
  }
  const bell = (f: number, level: number, delay = 0, dest?: AudioNode) => { tone(f, 3.6, level, { attack: .03, delay, dest }); tone(f * 2.76, 1.4, level * .15, { attack: .02, delay, dest }); };

  // The studio drone steps aside while the room plays its own music, and comes back when you leave.
  function muteDrone(on: boolean) { if (droneMuted === on) return; droneMuted = on; dispatchEvent(new CustomEvent('rb:exhibition-film', { detail: on })); }
  const sync = () => {
    if (wanted()) { ensure(); if (ctx?.state === 'suspended') ctx.resume().catch(() => {}); }
    if (ctx) { ramp(music.gain, wanted() ? .8 : 0, wanted() ? 3 : .6); ramp(pad.gain, wanted() ? 1 : 0, 4); }
    muteDrone(wanted());
  };
  new MutationObserver(sync).observe(html, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  const warm = () => sync();
  addEventListener('pointerdown', warm, { capture: true, passive: true });
  addEventListener('keydown', warm, { capture: true, passive: true });
  sync();

  /** Wake the engine for an action the visitor just made, even with the music switched off. */
  function act() {
    if (document.hidden) return false;
    // Without any gesture on this page yet (arriving through the portal) the browser will not start audio; don't try.
    if (!ctx && !(navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) return false;
    ensure(); if (!ctx) return false; if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx.state === 'running'; }

  return {
    /** Every frame: how fast you walk (0..1) and how close the return portal is (0..1). */
    frame(walking: number, portal: number) {
      if (!ctx || ctx.state !== 'running') return;
      const now = performance.now();
      if (wanted()) {
        if (now > chordAt) { if (chordAt) setChord(chordIx = (chordIx + 1) % CHORDS.length); chordAt = now + 12000; }
        if (now > bellAt) { if (bellAt) bell(BELLS[Math.floor(Math.random() * BELLS.length)], .035); bellAt = now + 5200 + Math.random() * 5000; }
      }
      hum.gain.setTargetAtTime(wanted() ? portal * portal * .5 : 0, ctx.currentTime, .3);
      humTone.frequency.setTargetAtTime(500 + portal * 1600, ctx.currentTime, .3);
      if (walking > .5 && now > stepAt) { burst({ f: 480 + Math.random() * 180, dur: .07, level: .09, q: 1.8 }); stepAt = now + 430 + Math.random() * 40; }
    },
    /** Out of the light into the room: a rising shimmer. */
    arrive() { if (!act()) return; burst({ f: 1400, to: 380, q: .7, dur: 1.8, level: .035, attack: .5 }); [440, 554.37, 659.25, 880].forEach((f, i) => bell(f, .045, .25 + i * .14, sfxBus)); },
    /** Back into the light: the same shimmer, falling. */
    leave() { if (!act()) return; burst({ f: 400, to: 3600, q: .6, dur: .9, level: .16, attack: .2 }); [880, 659.25, 554.37, 440].forEach((f, i) => bell(f, .045, i * .09, sfxBus)); },
    /** A piece printed into the room: a soft rising scan and three notes, with the music. */
    reveal() { if (!ctx || ctx.state !== 'running' || !wanted()) return; burst({ f: 300, to: 2400, q: .9, dur: 2, level: .05, attack: .6 }); [554.37, 659.25, 880].forEach((f, i) => bell(f, .03, .4 + i * .45, sfxBus)); },
    /** The astronaut's reactions: a tiny glassy chirp, rising when he is delighted, falling when he is tired. */
    chirp(kind: string) {
      if (!ctx || ctx.state !== 'running' || !wanted()) return;
      const up = ['wow', 'love', 'hi', 'happy', 'spark', 'photo'].includes(kind), down = ['tired', 'sleep', 'clock'].includes(kind);
      const f = up ? 1318.51 : down ? 659.25 : 987.77;
      tone(f, .22, .018, { type: 'sine', glide: up ? 1.5 : down ? .7 : 1.12, dest: sfxBus });
    },
    /** A detail picked out, or inspection toggled. */
    select() { if (!act()) return; bell(1318.51, .04, 0, sfxBus); tone(659.25, .8, .03, { dest: sfxBus }); },
    click() { if (!act()) return; tone(880, .25, .03, { type: 'triangle', dest: sfxBus }); },
    /**
     * The SVJ's V12: two detuned saws and the firing-order fifth under a low-pass, with a burble in the level.
     * Walking up it idles quietly for a few seconds; clicked, it blips the throttle.
     */
    engine(rev: boolean) {
      if (!act() || !ctx) return;
      const c = ctx, t = c.currentTime, dur = rev ? 2 : 3.4, f0 = rev ? 36 : 31;
      const out = c.createGain(); out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(rev ? .2 : .085, t + (rev ? .06 : .7)); out.gain.setTargetAtTime(0, t + dur * .55, dur * .18);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(rev ? 260 : 200, t);
      if (rev) { lp.frequency.exponentialRampToValueAtTime(1300, t + .32); lp.frequency.exponentialRampToValueAtTime(240, t + 1.4); }
      const burble = c.createGain(); burble.gain.value = .6; const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = rev ? 14 : 9.5;
      const depth = c.createGain(); depth.gain.value = .4; lfo.connect(depth).connect(burble.gain);
      burble.connect(lp).connect(out).connect(sfxBus);
      const oscs = [[1, -6, 'sawtooth'], [1, 7, 'sawtooth'], [1.5, 0, 'square'], [.5, 0, 'sine']].map(([k, detune, type]) => {
        const o = c.createOscillator(); o.type = type as OscillatorType; o.detune.value = detune as number; o.frequency.setValueAtTime(f0 * (k as number), t);
        if (rev) { o.frequency.exponentialRampToValueAtTime(f0 * (k as number) * 2.7, t + .3); o.frequency.exponentialRampToValueAtTime(f0 * (k as number), t + 1.3); }
        const g = c.createGain(); g.gain.value = k === .5 ? .7 : k === 1.5 ? .18 : .35; o.connect(g).connect(burble); o.start(t); o.stop(t + dur + .2); return o;
      });
      lfo.start(t); lfo.stop(t + dur + .2); oscs[0].onended = () => { out.disconnect(); lfo.disconnect(); };
    },
    /** K-2SO powering up his eyes: a short servo whine and a click. */
    eyes() { if (!act()) return; tone(420, .5, .018, { type: 'sawtooth', glide: 2.2, attack: .05, dest: sfxBus }); tone(2600, .06, .02, { type: 'square', delay: .45, dest: sfxBus }); },
    /** A light switch in the house model. */
    lights(on: boolean) { if (!act()) return; burst({ f: on ? 2400 : 1800, dur: .05, level: .12, q: 3 }); tone(on ? 1760 : 1320, .3, .012, { dest: sfxBus, delay: .02 }); },
    dispose() { muteDrone(false); removeEventListener('pointerdown', warm, { capture: true }); removeEventListener('keydown', warm, { capture: true }); if (ctx) { music.gain.value = 0; hum.gain.value = 0; } },
  };
}
