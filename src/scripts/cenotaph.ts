// The 404: a pre-rendered flight into Boullée's Cenotaph for Newton, with the visitor's mistyped
// address written live across the pierced vault as a constellation. The constellation is drawn on a
// canvas over the film and follows the film's own camera (exported from Blender frame by frame), so
// the stars stay pinned to the stone while the camera moves. Once the film ends, the wrong stars burn
// out and the right ones come on: the address repairs itself in the sky.

type Vec = [number, number, number];
type Frame = { p: Vec; q: [number, number, number, number]; lens: number };
export type CenotaphMeta = { fps: number; frames: Frame[]; sensor: number; sphere: { c: Vec; rin: number } };

// ---------------------------------------------------------------- star-chart alphabet
// Single strokes; every vertex is a star, every stroke a line between two.
const GLYPHS: Record<string, string> = {
  a: '1,1 1,0|1,.7 .6,1 .15,.85 0,.45 .2,.05 .6,0 1,.3', b: '0,1.55 0,0|0,.7 .4,1 .85,.85 1,.45 .8,.05 .4,0 0,.3',
  c: '.95,.8 .55,1 .12,.85 0,.45 .18,.08 .55,0 .95,.2', d: '1,1.55 1,0|1,.7 .6,1 .15,.85 0,.45 .2,.05 .6,0 1,.3',
  e: '0,.5 1,.5 .85,.88 .5,1 .12,.85 0,.5 .15,.1 .55,0 .95,.2', f: '.85,1.5 .5,1.55 .3,1.35 .3,0|0,1 .75,1',
  g: '1,1 1,-.35 .75,-.6 .25,-.6 .05,-.45|1,.7 .6,1 .15,.85 0,.5 .2,.12 .6,.05 1,.3', h: '0,1.55 0,0|0,.65 .4,1 .85,.9 1,.6 1,0',
  i: '0,1 0,0|0,1.38', j: '.3,1 .3,-.4 .1,-.6 -.1,-.55|.3,1.38', k: '0,1.55 0,0|.9,1 0,.38|.3,.6 1,0', l: '0,1.55 0,0',
  m: '0,1 0,0|0,.7 .3,1 .6,.8 .6,0|.6,.8 .9,1 1.2,.75 1.2,0', n: '0,1 0,0|0,.65 .4,1 .85,.9 1,.6 1,0',
  o: '.5,1 .1,.8 0,.4 .25,.02 .75,0 1,.42 .88,.82 .5,1', p: '0,1 0,-.6|0,.7 .4,1 .85,.85 1,.45 .8,.05 .4,0 0,.3',
  q: '1,1 1,-.6|1,.7 .6,1 .15,.85 0,.45 .2,.05 .6,0 1,.3', r: '0,1 0,0|0,.6 .35,.95 .75,1',
  s: '.9,.85 .5,1 .1,.85 .12,.6 .5,.5 .88,.4 .9,.15 .5,0 .05,.15', t: '.3,1.4 .3,.15 .5,0 .75,.05|0,1 .75,1',
  u: '0,1 0,.35 .2,.05 .6,0 1,.35|1,1 1,0', v: '0,1 .5,0 1,1', w: '0,1 .3,0 .6,.8 .9,0 1.2,1', x: '0,1 1,0|1,1 0,0',
  y: '0,1 .5,0|1,1 .35,-.6 .1,-.6', z: '0,1 1,1 0,0 1,0',
  ä: '1,1 1,0|1,.7 .6,1 .15,.85 0,.45 .2,.05 .6,0 1,.3|.3,1.35|.75,1.35', ö: '.5,1 .1,.8 0,.4 .25,.02 .75,0 1,.42 .88,.82 .5,1|.3,1.35|.72,1.35',
  ü: '0,1 0,.35 .2,.05 .6,0 1,.35|1,1 1,0|.3,1.35|.72,1.35', ß: '0,0 0,1.25 .3,1.55 .7,1.45 .75,1.05 .4,.85 .9,.55 .8,.1 .35,0',
  0: '.5,1.5 .1,1.2 0,.75 .1,.3 .5,0 .9,.3 1,.75 .9,1.2 .5,1.5', 1: '.1,1.2 .5,1.5 .5,0', 2: '.05,1.2 .45,1.5 .9,1.3 .95,.95 0,0 1,0',
  3: '.05,1.4 .5,1.5 .9,1.25 .8,.85 .4,.75|.4,.75 .9,.6 1,.25 .6,0 .05,.1', 4: '.75,0 .75,1.5 0,.45 1,.45',
  5: '.95,1.5 .15,1.5 .05,.8 .5,.9 .95,.6 .9,.2 .5,0 .05,.15', 6: '.85,1.45 .4,1.3 .05,.7 .1,.2 .5,0 .9,.25 .9,.6 .5,.85 .1,.6',
  7: '0,1.5 1,1.5 .35,0', 8: '.5,.8 .1,1.1 .5,1.5 .9,1.1 .5,.8 .05,.45 .5,0 .95,.45 .5,.8', 9: '.9,.9 .5,.65 .1,.9 .1,1.3 .5,1.5 .9,1.2 .95,.8 .6,.1 .15,0',
  '/': '0,-.3 .8,1.55', '-': '0,.5 .7,.5', '.': '0,0', _: '0,-.2 1,-.2', '?': '.1,1.3 .5,1.5 .9,1.3 .9,1 .5,.7 .5,.4|.5,0',
  '#': '.25,0 .45,1.4|.6,0 .8,1.4|0,.45 1,.45|.05,.95 1.05,.95', '=': '0,.35 .8,.35|0,.75 .8,.75', '&': '1,0 .1,1.1 .4,1.5 .7,1.2 0,.4 .3,0 .65,.1 1,.6',
};
type Glyph = { pts: [number, number][]; segs: [number, number][]; w: number };
const cache = new Map<string, Glyph>();
function glyph(ch: string): Glyph {
  const key = ch.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const src = GLYPHS[key] ?? (/\s/.test(ch) ? '' : GLYPHS['?']);
  const pts: [number, number][] = [], segs: [number, number][] = [], seen = new Map<string, number>();
  for (const stroke of src ? src.split('|') : []) {
    let last = -1;
    for (const xy of stroke.trim().split(' ')) {
      if (!seen.has(xy)) { seen.set(xy, pts.length); pts.push(xy.split(',').map(Number) as [number, number]); }
      const k = seen.get(xy)!; if (last >= 0 && last !== k) segs.push([last, k]); last = k;
    }
  }
  const g = { pts, segs, w: pts.length ? Math.max(...pts.map(p => p[0])) : .5 };
  cache.set(key, g); return g;
}

/** Levenshtein with backtrack: how to turn what was typed into what was meant. */
function editScript(a: string, b: string) {
  const A = [...a], B = [...b], D: number[][] = A.map(() => []).concat([[]]);
  for (let i = 0; i <= A.length; i++) for (let j = 0; j <= B.length; j++)
    D[i][j] = !i ? j : !j ? i : Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
  const ops: { op: 'keep' | 'sub' | 'del' | 'ins'; i?: number; j?: number }[] = []; let i = A.length, j = B.length;
  while (i || j) {
    if (i && j && D[i][j] === D[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1)) { i--; j--; ops.unshift({ op: A[i] === B[j] ? 'keep' : 'sub', i, j }); }
    else if (i && D[i][j] === D[i - 1][j] + 1) { i--; ops.unshift({ op: 'del', i }); }
    else { j--; ops.unshift({ op: 'ins', j }); }
  }
  return ops;
}

/** Letter origins in glyph units; long addresses break after a slash, dot or hyphen onto a second line. */
function layout(text: string, maxLine: number) {
  const chars = [...text];
  let split = -1;
  if (chars.length > maxLine) {
    const mid = chars.length / 2; let best = Infinity;
    chars.forEach((c, i) => { if ((c === '/' || c === '.' || c === '-') && i > 1 && i < chars.length - 2 && Math.abs(i + 1 - mid) < best) { best = Math.abs(i + 1 - mid); split = i + 1; } });
    if (split < 0) split = Math.ceil(mid);
  }
  const lines = split < 0 ? [chars] : [chars.slice(0, split), chars.slice(split)];
  const out: { x: number; y: number; g: Glyph }[] = [];
  let widest = 0;
  lines.forEach((line, li) => {
    let pen = 0; const row = line.map(ch => { const g = glyph(ch); const at = { x: pen, y: 0, g }; pen += g.w + .55; return at; });
    const w = pen - .55; widest = Math.max(widest, w);
    row.forEach(r => { r.x -= w / 2; r.y = (lines.length - 1) * 1.45 - li * 2.9; out.push(r); });
  });
  return { letters: out, width: widest, height: lines.length * 2.9 };
}

// ---------------------------------------------------------------- tiny vector kit
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec): Vec => mul(a, 1 / Math.hypot(a[0], a[1], a[2]));
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function axes(q: [number, number, number, number]) {
  const [w, x, y, z] = q;
  const right: Vec = [1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)];
  const up: Vec = [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)];
  const back: Vec = [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)];
  return { right, up, fwd: mul(back, -1) };
}
const ease = (x: number) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

type Star = { a: [number, number] | null; b: [number, number] | null; kind: 'keep' | 'out' | 'in'; order: number; mag: number; tw: number };

export function mountCenotaph(o: {
  stage: HTMLElement; video: HTMLVideoElement; canvas: HTMLCanvasElement; meta: CenotaphMeta;
  frameSize: () => [number, number]; requested: string; target: string; reduced: boolean; theme?: 'day' | 'night';
  anchor: () => { x: number; y: number; width: number }; onReveal: () => void; onRepaired: () => void;
}) {
  const { video, canvas, meta } = o;
  const ctx = canvas.getContext('2d')!;
  const last = meta.frames.length - 1, filmEnd = last / meta.fps;
  const APPEAR = filmEnd - 2.1;            // the vault is in view: the address starts to come out
  let mode: 'film' | 'hold' = 'film', holdBase = 0, holdStart = 0, fixedCam = false;
  let repairAt = Infinity, revealed = false, repaired = false, raf = 0;

  // ---- The constellation: stars of the typed address, paired with those of the corrected one.
  let stars: Star[] = [], segs: [number, number, 'keep' | 'out' | 'in'][] = [];
  let size = { width: 1, height: 1 };
  function build() {
    const portrait = o.frameSize()[1] > o.frameSize()[0];
    const maxLine = portrait ? 11 : 22;
    const typed = [...o.requested].slice(0, 40).join('');
    const A = layout(typed, maxLine), B = layout(o.target, maxLine);
    size = { width: Math.max(A.width, B.width), height: Math.max(A.height, B.height) };
    stars = []; segs = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const put = (L: typeof A.letters[number], other: typeof A.letters[number] | null, kind: Star['kind'], order: number, side: 'a' | 'b') => {
      const base = stars.length;
      L.g.pts.forEach((p, k) => {
        const here: [number, number] = [L.x + p[0], L.y + p[1]];
        const there: [number, number] | null = other ? [other.x + other.g.pts[k][0], other.y + other.g.pts[k][1]] : null;
        stars.push({ a: side === 'a' ? here : there, b: side === 'b' ? here : there, kind, order: order + k * .02, mag: .7 + rnd() * .6, tw: rnd() * 6.28 });
      });
      L.g.segs.forEach(([p, q]) => segs.push([base + p, base + q, kind]));
    };
    editScript(typed, o.target).forEach((op, n) => {
      if (op.op === 'keep') put(A.letters[op.i!], B.letters[op.j!], 'keep', n, 'a');
      if (op.op === 'sub' || op.op === 'del') put(A.letters[op.i!], null, 'out', n, 'a');
      if (op.op === 'sub' || op.op === 'ins') put(B.letters[op.j!], null, 'in', n, 'b');
    });
  }
  build();

  // ---- Pin the word plane to the vault, as seen from the film's last camera.
  let plane: { C: Vec; r: Vec; u: Vec; s: number; sy: number } | null = null;
  const camAt = (t: number) => {
    const f = Math.min(last, Math.max(0, t * meta.fps)), i = Math.min(last - 1, Math.floor(f)), k = f - i;
    const A = meta.frames[i], B = meta.frames[i + 1];
    const d = A.q[0] * B.q[0] + A.q[1] * B.q[1] + A.q[2] * B.q[2] + A.q[3] * B.q[3], sg = d < 0 ? -1 : 1;
    const q = A.q.map((v, n) => v + (B.q[n] * sg - v) * k) as [number, number, number, number];
    const l = Math.hypot(...q);
    return { p: A.p.map((v, n) => v + (B.p[n] - v) * k) as Vec, q: q.map(v => v / l) as typeof q, lens: A.lens + (B.lens - A.lens) * k };
  };
  function project(P: Vec, cam: ReturnType<typeof camAt>, ax: ReturnType<typeof axes>) {
    const [W, H] = o.frameSize();
    const v = sub(P, cam.p), z = dot(v, ax.fwd);
    if (z <= .1) return null;
    const k = cam.lens / meta.sensor * Math.max(W, H);
    return [W / 2 + dot(v, ax.right) / z * k, H / 2 - dot(v, ax.up) / z * k] as [number, number];
  }
  function pin() {
    const cam = camAt(filmEnd), ax = axes(cam.q), [W, H] = o.frameSize();
    const at = o.anchor(), k = cam.lens / meta.sensor * Math.max(W, H);
    const ray = norm(add(ax.fwd, add(mul(ax.right, (at.x - W / 2) / k), mul(ax.up, (H / 2 - at.y) / k))));
    const c = meta.sphere.c, R = meta.sphere.rin - .15, oc = sub(cam.p, c);
    const b = dot(oc, ray), t = -b + Math.sqrt(b * b - (dot(oc, oc) - R * R));
    const C = add(cam.p, mul(ray, t)), n = norm(sub(C, c));
    // The baseline runs along the one tangent direction that the camera sees as level,
    // so the words read straight even though the vault is seen at a slant.
    const level = cross(sub(C, cam.p), ax.right);
    let r = norm(cross(level, n)); if (dot(r, ax.right) < 0) r = mul(r, -1);
    let u = norm(cross(r, n)); if (dot(u, ax.up) < 0) u = mul(u, -1);
    plane = { C, r, u, s: 1, sy: 1 };
    // Scale the plane so the widest line spans the width the layout asked for.
    const probe = (s: number) => { const L = project(onVault(-size.width / 2, 0, s), cam, ax), Rr = project(onVault(size.width / 2, 0, s), cam, ax); return L && Rr ? Math.hypot(Rr[0] - L[0], Rr[1] - L[1]) : 0; };
    let s = t * at.width / (k * size.width);
    for (let i = 0; i < 3; i++) { const w = probe(s); if (w > 0) s *= at.width / w; }
    plane.s = s;
    // Undo the slant's foreshortening, so letters keep their proportions on screen.
    const O = project(onVault(0, 0), cam, ax), X = project(onVault(1, 0), cam, ax), Y = project(onVault(0, 1), cam, ax);
    if (O && X && Y) plane.sy = Math.min(2.2, Math.hypot(X[0] - O[0], X[1] - O[1]) / Math.max(1e-3, Math.hypot(Y[0] - O[0], Y[1] - O[1])));
  }
  function onVault(x: number, y: number, s = plane!.s): Vec {
    const { C, r, u } = plane!, c = meta.sphere.c;
    const P = add(C, add(mul(r, x * s), mul(u, y * s * plane!.sy)));
    return add(c, mul(norm(sub(P, c)), meta.sphere.rin - .15));
  }

  // ---- Drawing.
  const sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
  { const g = sprite.getContext('2d')!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.12, 'rgba(255,250,240,.95)'); grad.addColorStop(.3, 'rgba(255,225,190,.32)'); grad.addColorStop(1, 'rgba(255,200,150,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64); }
  const tinted = (rgb: string) => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
    g.drawImage(sprite, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = rgb; g.globalAlpha = .55; g.fillRect(0, 0, 64, 64); return c;
  };
  const ember = tinted('#ff6a3a'), cool = tinted('#9fd0ff');
  // By day the vault is lit stone: every star and line gets a soft shadow so it still reads.
  const day = o.theme === 'day';
  const shade = document.createElement('canvas'); shade.width = shade.height = 64;
  { const g = shade.getContext('2d')!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(24,14,6,.9)'); grad.addColorStop(.45, 'rgba(24,14,6,.45)'); grad.addColorStop(1, 'rgba(24,14,6,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64); }
  let dpr = 1, view = { w: 1, h: 1, s: 1, ox: 0, oy: 0 };
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = o.stage.clientWidth, h = o.stage.clientHeight; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const [W, H] = o.frameSize(); const s = Math.max(w / W, h / H);
    view = { w, h, s, ox: (w - W * s) / 2, oy: (h - H * s) / 2 };
    build(); pin();
  }

  function draw(now: number) {
    if (mode === 'film' && (video.ended || video.currentTime >= filmEnd - .04)) { mode = 'hold'; holdBase = filmEnd; holdStart = now; }
    const t = mode === 'film' ? video.currentTime : holdBase + (now - holdStart) / 1000;
    if (!revealed && t >= APPEAR + 1.2) { revealed = true; o.onReveal(); }
    if (repairAt === Infinity && mode === 'hold' && t >= filmEnd + .9) repairAt = t + .2;
    const cam = camAt(fixedCam || mode === 'hold' ? filmEnd : t), ax = axes(cam.q);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, view.w, view.h);
    if (t < APPEAR || !plane) { raf = requestAnimationFrame(draw); return; }

    const m = Math.max(0, t - repairAt) / 2.4;
    const out = ease(m * 1.7), inn = ease(m * 1.7 - .55), slide = ease(m * 1.9 - .35);
    if (!repaired && m >= 1) { repaired = true; o.onRepaired(); }
    const diagnose = repairAt === Infinity ? ease((t - APPEAR - 2.4) / .8) : 1;
    const pts: ([number, number] | null)[] = [], alpha: number[] = [];
    const place = (x: number, y: number) => { const p = project(onVault(x, y), cam, ax); return p ? [p[0] * view.s + view.ox, p[1] * view.s + view.oy] as [number, number] : null; };
    for (const st of stars) {
      const born = ease((t - APPEAR - st.order * .09) / .7);
      let a = st.kind === 'in' ? inn : born * (st.kind === 'out' ? 1 - out : 1);
      const from = st.a ?? st.b!, to = st.b ?? st.a!;
      const k = st.kind === 'keep' ? slide : 0;
      pts.push(place(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k));
      alpha.push(a);
    }
    // Lines first, thin and gold, broken where they meet a star.
    const line = (shadow: boolean) => {
    ctx.globalCompositeOperation = shadow ? 'source-over' : 'lighter';
    ctx.lineWidth = shadow ? 3 : 1;
    for (const [p, q, kind] of segs) {
      const A = pts[p], B = pts[q]; const a = Math.min(alpha[p], alpha[q]); if (!A || !B || a < .01) continue;
      const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), gap = Math.min(L * .3, 6);
      if (L < 1) continue;
      const wrong = kind === 'out' ? diagnose : 0, fresh = kind === 'in' ? 1 - ease(m * 1.2 - .6) : 0;
      ctx.strokeStyle = shadow ? `rgba(30,18,8,${.55 * a})` : wrong ? `rgba(255,${120 - 40 * wrong},${80 - 40 * wrong},${.55 * a})` : fresh ? `rgba(170,215,255,${.6 * a})` : `rgba(255,212,160,${(day ? .7 : .42) * a})`;
      ctx.setLineDash(wrong > .5 ? [3, 4] : []);
      ctx.beginPath(); ctx.moveTo(A[0] + dx / L * gap, A[1] + dy / L * gap); ctx.lineTo(B[0] - dx / L * gap, B[1] - dy / L * gap); ctx.stroke();
    }
    ctx.setLineDash([]);
    };
    if (day) line(true);
    line(false);
    const base = Math.max(4.5, Math.min(12, view.w / 160));
    stars.forEach((st, i) => {
      const P = pts[i], a = alpha[i]; if (!P || a < .01) return;
      const twinkle = .82 + .18 * Math.sin(t * 2.3 + st.tw);
      const wrong = st.kind === 'out' ? diagnose * (.75 + .25 * Math.sin(t * 7 + st.tw)) : 0;
      const fresh = st.kind === 'in' ? 1 - ease(m * 1.2 - .6) : 0;
      const r = base * st.mag * (1 + .25 * fresh) * twinkle;
      if (day) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.drawImage(shade, P[0] - r * 1.5, P[1] - r * 1.5, r * 3, r * 3); ctx.globalCompositeOperation = 'lighter'; }
      ctx.globalAlpha = a * (1 - wrong * .15);
      ctx.drawImage(sprite, P[0] - r, P[1] - r, r * 2, r * 2);
      if (wrong > .01) { ctx.globalAlpha = a * wrong; ctx.drawImage(ember, P[0] - r * 1.2, P[1] - r * 1.2, r * 2.4, r * 2.4); }
      if (fresh > .01) { ctx.globalAlpha = a * fresh; ctx.drawImage(cool, P[0] - r * 1.4, P[1] - r * 1.4, r * 2.8, r * 2.8); }
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (!(repaired && o.reduced)) raf = requestAnimationFrame(draw);
  }

  resize();
  addEventListener('resize', resize);
  if (o.reduced) { mode = 'hold'; holdBase = filmEnd + 60; holdStart = performance.now(); fixedCam = true; repairAt = -Infinity; }
  raf = requestAnimationFrame(draw);

  return {
    /** Jump to the vault. */
    skip() { if (mode === 'film') { try { video.pause(); video.currentTime = Math.max(0, filmEnd - .01); } catch {} mode = 'hold'; holdBase = Math.max(APPEAR + .3, Math.min(video.currentTime || 0, filmEnd)); holdStart = performance.now(); fixedCam = true; } },
    replay() { cancelAnimationFrame(raf); mode = 'film'; fixedCam = false; repairAt = Infinity; revealed = false; repaired = false; video.currentTime = 0; video.play().catch(() => {}); raf = requestAnimationFrame(draw); },
    /** No film at all (blocked autoplay, data saver): hold the last frame and run from there. */
    still() { mode = 'hold'; holdBase = APPEAR; holdStart = performance.now(); fixedCam = true; },
    retarget(target: string) { o.target = target; resize(); },
    resize,
    dispose() { cancelAnimationFrame(raf); removeEventListener('resize', resize); },
  };
}
