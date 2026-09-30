// The night scene's music, synthesised on the site's shared audio context: a slow music-box waltz in D over
// a warm pad, which swells when she says yes. Plus the little sounds of the scene: the astronaut's chirps,
// sparkles, the camera's shutter and flash.
const MELODY: [number, number][] = [
  // (semitones above D5, beats) — a simple, tender waltz line, three beats to the bar.
  [0, 1], [4, 1], [7, 1], [9, 2], [7, 1], [4, 2], [2, 1], [0, 3],
  [2, 1], [4, 1], [5, 1], [7, 2], [4, 1], [2, 3], [-3, 3],
  [0, 1], [4, 1], [7, 1], [12, 2], [11, 1], [9, 2], [7, 1], [4, 3],
  [5, 1], [4, 1], [2, 1], [4, 2], [2, 1], [0, 3], [0, 3],
];
const CHORDS = [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-7, -3, 0]];   // D, Bm, G, A — as offsets from D4
const D5 = 587.33, D3 = 146.83;
const hz = (base: number, semis: number) => base * Math.pow(2, semis / 12);

export function createNightSound() {
  let ctx: AudioContext | null = null, out!: GainNode, verb!: ConvolverNode, pad!: GainNode, box!: GainNode;
  let beat = .52, next = 0, step = 0, bar = 0, timer = 0, swell = 0;

  function impulse(c: AudioContext, seconds: number, decay: number) {
    const n = Math.floor(c.sampleRate * seconds), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  function ensure() {
    if (ctx) return ctx;
    ctx = (window as unknown as { __rbAudioContext?: () => AudioContext | null }).__rbAudioContext?.() ?? null;
    if (!ctx) { try { ctx = new AudioContext(); } catch { return null; } }
    const c = ctx;
    const limit = c.createDynamicsCompressor(); limit.threshold.value = -12; limit.ratio.value = 5; limit.connect(c.destination);
    out = c.createGain(); out.gain.value = 0; out.connect(limit);
    verb = c.createConvolver(); verb.buffer = impulse(c, 3.8, 2.4);
    const wet = c.createGain(); wet.gain.value = .5; verb.connect(wet).connect(out);
    pad = c.createGain(); pad.gain.value = .0; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; pad.connect(lp); lp.connect(out); lp.connect(verb);
    box = c.createGain(); box.gain.value = .5; box.connect(out); box.connect(verb);
    return c;
  }
  // A music-box tine: a sine with a quick metallic partial and a long ring.
  function tine(f: number, t: number, level: number) {
    const c = ctx!; for (const [k, l, d] of [[1, 1, 2.4], [4.02, .18, .35], [2, .12, 1]] as const) {
      const o = c.createOscillator(); o.frequency.value = f * k; const g = c.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level * l, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(box); o.start(t); o.stop(t + d + .05);
    }
  }
  function chord(i: number, t: number, dur: number) {
    const c = ctx!;
    for (const s of CHORDS[i % CHORDS.length]) for (const det of [-4, 4]) {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(D3 * 2, s); o.detune.value = det;
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 + swell * .03, t + dur * .35); g.gain.linearRampToValueAtTime(0, t + dur + .6);
      o.connect(g).connect(pad); o.start(t); o.stop(t + dur + .8);
    }
    const bass = c.createOscillator(); bass.frequency.value = hz(D3, CHORDS[i % CHORDS.length][0]); const bg = c.createGain();
    bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(.12, t + .05); bg.gain.exponentialRampToValueAtTime(.001, t + dur);
    bass.connect(bg).connect(pad); bass.start(t); bass.stop(t + dur + .1);
  }
  function schedule() {
    if (!ctx) return;
    while (next < ctx.currentTime + .6) {
      const [semi, beats] = MELODY[step % MELODY.length];
      if (step % MELODY.length === 0) bar = 0;
      tine(hz(D5, semi), next, .09);
      if (swell > .5 && step % 2 === 0) tine(hz(D5, semi + 12), next + beat * .5, .03);   // a higher echo once it is a celebration
      // A chord at every bar line (three beats).
      const at = MELODY.slice(0, step % MELODY.length).reduce((s, n) => s + n[1], 0);
      if (at % 3 === 0) chord(Math.floor(at / 6) + bar, next, beat * 3);
      next += beats * beat; step++;
    }
  }

  return {
    /** Start (after a tap: browsers only allow sound after one). */
    start() {
      const c = ensure(); if (!c) return; if (c.state === 'suspended') c.resume().catch(() => {});
      dispatchEvent(new CustomEvent('rb:exhibition-film', { detail: true }));   // the studio drone steps aside
      out.gain.cancelScheduledValues(c.currentTime); out.gain.setTargetAtTime(.9, c.currentTime, 1.2);
      pad.gain.setTargetAtTime(1, c.currentTime, 2);
      next = c.currentTime + .3; clearInterval(timer); timer = window.setInterval(schedule, 150);
    },
    /** She said yes: the waltz lifts a little and grows. */
    celebrate() { swell = 1; beat = .46; if (ctx) { out.gain.setTargetAtTime(1, ctx.currentTime, .8); for (const [f, i] of [[1174.66, 0], [1479.98, 1], [1760, 2], [2349.32, 3]]) tine(f, ctx.currentTime + i * .09, .07); } },
    /** A soft glassy chirp for the astronaut's reactions. */
    chirp(up: boolean) {
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(up ? 1318.5 : 880, t); o.frequency.exponentialRampToValueAtTime(up ? 1975 : 740, t + .16);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.025, t + .01); g.gain.exponentialRampToValueAtTime(.0005, t + .25); o.connect(g).connect(box); o.start(t); o.stop(t + .3);
    },
    /** Sparkles: a quick run of high tines. */
    sparkle(n = 6) { if (!ctx || ctx.state !== 'running') return; for (let i = 0; i < n; i++) tine(hz(D5 * 2, [0, 4, 7, 9, 12, 16][i % 6]), ctx.currentTime + i * .06, .035); },
    /** The shutter: a click and a flash's whine. */
    shutter() {
      if (!ctx || ctx.state !== 'running') return;
      const c = ctx, t = c.currentTime, n = c.createBuffer(1, c.sampleRate * .12, c.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
      const src = c.createBufferSource(); src.buffer = n; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800; const g = c.createGain(); g.gain.value = .5;
      src.connect(hp).connect(g).connect(out); src.start(t);
      const o = c.createOscillator(), og = c.createGain(); o.frequency.setValueAtTime(3000, t); o.frequency.exponentialRampToValueAtTime(7000, t + .5);
      og.gain.setValueAtTime(.006, t); og.gain.exponentialRampToValueAtTime(.0001, t + .6); o.connect(og).connect(out); o.start(t); o.stop(t + .65);
    },
    dispose() { clearInterval(timer); dispatchEvent(new CustomEvent('rb:exhibition-film', { detail: false })); if (ctx && out) out.gain.setTargetAtTime(0, ctx.currentTime, .3); },
  };
}
