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
    const airGain = c.createGain(); airGain.gain.value = .35; air.connect(humTone).connect(airGain).connect(hum); air.start();
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
  function act() { if (document.hidden) return false; ensure(); if (!ctx) return false; if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx.state === 'running'; }

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
    arrive() { if (!act()) return; burst({ f: 3200, to: 500, q: .6, dur: 1.6, level: .1, attack: .3 }); [440, 554.37, 659.25, 880].forEach((f, i) => bell(f, .045, .25 + i * .14, sfxBus)); },
    /** Back into the light: the same shimmer, falling. */
    leave() { if (!act()) return; burst({ f: 400, to: 3600, q: .6, dur: .9, level: .16, attack: .2 }); [880, 659.25, 554.37, 440].forEach((f, i) => bell(f, .045, i * .09, sfxBus)); },
    /** A detail picked out, or inspection toggled. */
    select() { if (!act()) return; bell(1318.51, .04, 0, sfxBus); tone(659.25, .8, .03, { dest: sfxBus }); },
    click() { if (!act()) return; tone(880, .25, .03, { type: 'triangle', dest: sfxBus }); },
    dispose() { muteDrone(false); removeEventListener('pointerdown', warm, { capture: true }); removeEventListener('keydown', warm, { capture: true }); if (ctx) { music.gain.value = 0; hum.gain.value = 0; } },
  };
}
