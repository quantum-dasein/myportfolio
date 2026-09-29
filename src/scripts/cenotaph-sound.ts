// The sound of the cenotaph, synthesised on the site's shared audio context and heard only when
// the visitor has turned sound on: wind on the approach, steps echoing down the tunnel, a low
// choir held in a seven-second stone reverb once inside, a chime for every star that lights up
// in the corrected address, and Newton's apple on a helmet.
import type { CenotaphEvent } from './cenotaph';

export function mountCenotaphSound(video: HTMLVideoElement, filmEnd: number) {
  const html = document.documentElement;
  const wanted = () => html.classList.contains('rb-sound') && !html.classList.contains('rb-calm') && !document.hidden;
  let ctx: AudioContext | null = null;
  let out: GainNode, bus: GainNode, wind: GainNode, choir: GainNode;
  let raf = 0, stepAt = 0;

  function impulse(c: AudioContext, seconds: number, decay: number) {
    const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0;
      for (let i = 0; i < n; i++) { lp += (Math.random() * 2 - 1 - lp) * (.35 - .25 * i / n); d[i] = lp * Math.pow(1 - i / n, decay); }
    }
    return buf;
  }
  function noise(c: AudioContext, seconds = 2) {
    const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function ensure() {
    if (ctx) return ctx;
    ctx = (window as unknown as { __rbAudioContext?: () => AudioContext | null }).__rbAudioContext?.() ?? null;
    if (!ctx) return null;
    const c = ctx;
    out = c.createGain(); out.gain.value = 0; out.connect(c.destination);
    const verb = c.createConvolver(); verb.buffer = impulse(c, 7.5, 2.4);
    const wet = c.createGain(); wet.gain.value = .85; verb.connect(wet).connect(out);
    const dry = c.createGain(); dry.gain.value = .3; dry.connect(out);
    bus = c.createGain(); bus.connect(verb); bus.connect(dry);
    // A choir on "ah": detuned saws through three vowel formants.
    choir = c.createGain(); choir.gain.value = 0;
    const formants = [[700, 7, 1], [1150, 9, .5], [2700, 12, .22]].map(([f, q, g]) => {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const gg = c.createGain(); gg.gain.value = g; bp.connect(gg).connect(choir); return bp;
    });
    for (const f of [55, 82.41, 110, 164.81, 220]) for (const det of [-6, 5]) {
      const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = f; osc.detune.value = det;
      const g = c.createGain(); g.gain.value = .045; osc.connect(g); formants.forEach(bp => g.connect(bp)); osc.start();
    }
    const lfo = c.createOscillator(); lfo.frequency.value = .07; const lg = c.createGain(); lg.gain.value = 60;
    lfo.connect(lg); lg.connect(formants[0].frequency); lfo.start();
    choir.connect(bus);
    // Wind over the plain.
    const src = c.createBufferSource(); src.buffer = noise(c, 4); src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    wind = c.createGain(); wind.gain.value = 0; src.connect(lp).connect(wind).connect(out); src.start();
    return c;
  }
  const ramp = (p: AudioParam, v: number, s = .8) => { if (!ctx) return; p.cancelScheduledValues(ctx.currentTime); p.setTargetAtTime(v, ctx.currentTime, s / 3); };

  function step() {
    if (!ctx) return;
    const c = ctx, t = c.currentTime, src = c.createBufferSource(); src.buffer = noise(c, .2);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + Math.random() * 500; bp.Q.value = 1.4;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.32, t + .006); g.gain.exponentialRampToValueAtTime(.001, t + .09);
    src.connect(bp).connect(g).connect(bus); src.start(t); src.stop(t + .2);
  }
  function tone(freq: number, dur: number, level: number, type: OscillatorType = 'sine', glide = 0) {
    if (!ctx) return;
    const c = ctx, t = c.currentTime, osc = c.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (glide) osc.frequency.exponentialRampToValueAtTime(freq * glide, t + dur * .6);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + .008); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    osc.connect(g).connect(bus); osc.start(t); osc.stop(t + dur + .05);
  }
  const SCALE = [440, 554.37, 659.25, 739.99, 880, 1108.73, 1318.51];

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!ctx || !wanted()) return;
    const t = video.ended ? filmEnd + 1 : video.currentTime;
    ramp(wind.gain, t < 7.4 ? .05 : t < 9 ? .015 : 0, 1.2);
    ramp(choir.gain, t > 9.4 ? .5 : 0, t > 9.4 ? 4 : 1);
    if (t > 7.3 && t < 9.9 && !video.paused && performance.now() > stepAt) { step(); stepAt = performance.now() + 470 + Math.random() * 40; }
  }
  const sync = () => { if (wanted()) { ensure(); if (ctx?.state === 'suspended') ctx.resume().catch(() => {}); } if (ctx) ramp(out.gain, wanted() ? 1 : 0, .6); };
  new MutationObserver(sync).observe(html, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  sync(); tick();

  return {
    event(e: CenotaphEvent, detail?: unknown) {
      if (!ctx || !wanted()) return;
      if (e === 'star') { const i = Number(detail) || 0; tone(SCALE[(i * 3) % SCALE.length], 2.4, .05); tone(SCALE[(i * 3) % SCALE.length] * 2, 1.2, .012); }
      if (e === 'repaired') { tone(110, 5, .08, 'triangle'); tone(164.81, 5, .05, 'triangle'); }
      if (e === 'visitor') { tone(1318.51, 3.5, .04); tone(2637, 2, .012); }
      if (e === 'apple-hit') { tone(320, .35, .22, 'triangle', .45); tone(1900, .12, .05, 'square'); }
      if (e === 'apple-bounce') tone(140, .25, .12, 'sine', .6);
      if (e === 'open') tone(880, 1.2, .04);
    },
    dispose() { cancelAnimationFrame(raf); },
  };
}
