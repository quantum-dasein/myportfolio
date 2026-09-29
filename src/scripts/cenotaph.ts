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
export function glyph(ch: string): Glyph {
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
export function editScript(a: string, b: string) {
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
export function layout(text: string, maxLine: number) {
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
type Cam = { p: Vec; q: [number, number, number, number]; lens: number };
type Anchor = { x: number; y: number; width: number };
export type CenotaphEvent = 'reveal' | 'star' | 'repaired' | 'apple-hit' | 'apple-bounce' | 'visitor' | 'open';

/** One constellation: letters laid out in glyph units, pinned to the vault on its own plane. */
class Word {
  stars: Star[] = []; segs: [number, number, Star['kind']][] = [];
  width = 1; plane: { C: Vec; r: Vec; u: Vec; s: number; sy: number } | null = null;
  box: [number, number, number, number] | null = null;
  constructor(public from: string, public to: string, public maxLine: number) { this.build(); }
  build() {
    const A = layout(this.from, this.maxLine), B = layout(this.to, this.maxLine);
    this.width = Math.max(A.width, B.width); this.stars = []; this.segs = [];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const put = (L: typeof A.letters[number], other: typeof A.letters[number] | null, kind: Star['kind'], order: number, side: 'a' | 'b') => {
      const base = this.stars.length;
      L.g.pts.forEach((p, k) => {
        const here: [number, number] = [L.x + p[0], L.y + p[1]];
        const there: [number, number] | null = other ? [other.x + other.g.pts[k][0], other.y + other.g.pts[k][1]] : null;
        this.stars.push({ a: side === 'a' ? here : there, b: side === 'b' ? here : there, kind, order: order + k * .02, mag: .75 + rnd() * .55, tw: rnd() * 6.28 });
      });
      L.g.segs.forEach(([p, q]) => this.segs.push([base + p, base + q, kind]));
    };
    editScript(this.from, this.to).forEach((op, n) => {
      if (op.op === 'keep') put(A.letters[op.i!], B.letters[op.j!], 'keep', n, 'a');
      if (op.op === 'sub' || op.op === 'del') put(A.letters[op.i!], null, 'out', n, 'a');
      if (op.op === 'sub' || op.op === 'ins') put(B.letters[op.j!], null, 'in', n, 'b');
    });
  }
}

export function mountCenotaph(o: {
  stage: HTMLElement; video: HTMLVideoElement; canvas: HTMLCanvasElement; meta: CenotaphMeta & { fig?: Vec };
  frameSize: () => [number, number]; requested: string; target: string; reduced: boolean; theme?: 'day' | 'night';
  anchor: () => Anchor; onReveal: () => void; onRepaired: () => void;
  /** Faint constellations of other pages, written after the repair; each opens its page. */
  sections?: () => { text: string; href: string; label: string; anchor: Anchor }[];
  visitorAnchor?: () => Anchor;
  /** No correction to make (the Newton egg): the word stays as typed. */
  still?: boolean;
  onEvent?: (e: CenotaphEvent, detail?: unknown) => void;
  onOpen?: (href: string) => void;
}) {
  const { video, canvas, meta } = o;
  const ctx = canvas.getContext('2d')!;
  const last = meta.frames.length - 1, filmEnd = last / meta.fps;
  const APPEAR = filmEnd - 2.1;            // the vault is in view: the address starts to come out
  const FIG: Vec = meta.fig ?? [3.4, -23.5, 0];
  const emit = (e: CenotaphEvent, d?: unknown) => o.onEvent?.(e, d);
  let mode: 'film' | 'hold' = 'film', holdBase = 0, holdStart = 0, fixedCam = false;
  let repairAt = Infinity, revealed = false, repaired = false, repairedAt = Infinity, raf = 0;
  let lit = 0;                             // how many corrected stars have come on (for the chimes)

  const portrait = () => o.frameSize()[1] > o.frameSize()[0];
  const typed = [...o.requested].slice(0, 40).join('');
  let main = new Word(typed, o.still ? typed : o.target, portrait() ? 11 : 22);
  let extras: { word: Word; href: string; label: string; anchor: Anchor }[] = [];
  let visitor: { n: number; P: Vec | null } | null = null;
  let hover: string | null = null;

  // ---- Camera and projection.
  const camAt = (t: number): Cam => {
    const f = Math.min(last, Math.max(0, t * meta.fps)), i = Math.min(last - 1, Math.floor(f)), k = f - i;
    const A = meta.frames[i], B = meta.frames[i + 1];
    const d = A.q[0] * B.q[0] + A.q[1] * B.q[1] + A.q[2] * B.q[2] + A.q[3] * B.q[3], sg = d < 0 ? -1 : 1;
    const q = A.q.map((v, n) => v + (B.q[n] * sg - v) * k) as Cam['q'];
    const l = Math.hypot(...q);
    return { p: A.p.map((v, n) => v + (B.p[n] - v) * k) as Vec, q: q.map(v => v / l) as Cam['q'], lens: A.lens + (B.lens - A.lens) * k };
  };
  function project(P: Vec, cam: Cam, ax: ReturnType<typeof axes>) {
    const [W, H] = o.frameSize();
    const v = sub(P, cam.p), z = dot(v, ax.fwd);
    if (z <= .1) return null;
    const k = cam.lens / meta.sensor * Math.max(W, H);
    return [W / 2 + dot(v, ax.right) / z * k, H / 2 - dot(v, ax.up) / z * k] as [number, number];
  }
  /** The point on the vault seen through a pixel of the last frame. */
  function vaultAt(px: number, py: number) {
    const cam = camAt(filmEnd), ax = axes(cam.q), [W, H] = o.frameSize(), k = cam.lens / meta.sensor * Math.max(W, H);
    const ray = norm(add(ax.fwd, add(mul(ax.right, (px - W / 2) / k), mul(ax.up, (H / 2 - py) / k))));
    const c = meta.sphere.c, R = meta.sphere.rin - .15, oc = sub(cam.p, c);
    const b = dot(oc, ray), t = -b + Math.sqrt(b * b - (dot(oc, oc) - R * R));
    return { P: add(cam.p, mul(ray, t)), t, k, cam, ax };
  }
  function onVault(w: Word, x: number, y: number, s = w.plane!.s): Vec {
    const { C, r, u, sy } = w.plane!, c = meta.sphere.c;
    const P = add(C, add(mul(r, x * s), mul(u, y * s * sy)));
    return add(c, mul(norm(sub(P, c)), meta.sphere.rin - .15));
  }
  function pin(w: Word, at: Anchor) {
    const { P: C, t, k, cam, ax } = vaultAt(at.x, at.y);
    const c = meta.sphere.c, n = norm(sub(C, c));
    // The baseline runs along the one tangent direction the camera sees as level,
    // so the words read straight even though the vault is seen at a slant.
    const level = cross(sub(C, cam.p), ax.right);
    let r = norm(cross(level, n)); if (dot(r, ax.right) < 0) r = mul(r, -1);
    let u = norm(cross(r, n)); if (dot(u, ax.up) < 0) u = mul(u, -1);
    w.plane = { C, r, u, s: 1, sy: 1 };
    const probe = (s: number) => { const L = project(onVault(w, -w.width / 2, 0, s), cam, ax), R = project(onVault(w, w.width / 2, 0, s), cam, ax); return L && R ? Math.hypot(R[0] - L[0], R[1] - L[1]) : 0; };
    let s = t * at.width / (k * w.width);
    for (let i = 0; i < 3; i++) { const got = probe(s); if (got > 0) s *= at.width / got; }
    w.plane.s = s;
    // Undo the slant's foreshortening, so letters keep their proportions on screen.
    const O = project(onVault(w, 0, 0), cam, ax), X = project(onVault(w, 1, 0), cam, ax), Y = project(onVault(w, 0, 1), cam, ax);
    if (O && X && Y) w.plane.sy = Math.min(2.2, Math.hypot(X[0] - O[0], X[1] - O[1]) / Math.max(1e-3, Math.hypot(Y[0] - O[0], Y[1] - O[1])));
  }

  // ---- Drawing kit: crisp cores, a small halo, fine lines.
  const day = o.theme === 'day';
  const halo = document.createElement('canvas'); halo.width = halo.height = 64;
  { const g = halo.getContext('2d')!, grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,236,205,.55)'); grad.addColorStop(.35, 'rgba(255,214,165,.16)'); grad.addColorStop(1, 'rgba(255,200,150,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64); }
  const GOLD = day ? [255, 226, 176] : [255, 218, 170], EMBER = [255, 104, 64], COOL = [176, 214, 255];
  const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mixc = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  let dpr = 1, view = { w: 1, h: 1, s: 1, ox: 0, oy: 0 };
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = o.stage.clientWidth, h = o.stage.clientHeight; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const [W, H] = o.frameSize(); const s = Math.max(w / W, h / H);
    view = { w, h, s, ox: (w - W * s) / 2, oy: (h - H * s) / 2 };
    main.maxLine = portrait() ? 11 : 22; main.build(); pin(main, o.anchor());
    extras = (o.sections?.() ?? []).map(sec => { const word = new Word(sec.text, sec.text, 30); pin(word, sec.anchor); return { word, ...sec }; });
    if (visitor && o.visitorAnchor) { const at = o.visitorAnchor(); visitor.P = vaultAt(at.x, at.y).P; }
  }
  const toView = (p: [number, number] | null) => p ? [p[0] * view.s + view.ox, p[1] * view.s + view.oy] as [number, number] : null;

  function drawWord(w: Word, cam: Cam, ax: ReturnType<typeof axes>, t: number, st8: { born: (s: Star) => number; out: number; inn: number; slide: number; diagnose: number; fresh: number; fade: number; bright: number; small?: boolean }) {
    const pts: ([number, number] | null)[] = [], alpha: number[] = [];
    for (const s of w.stars) {
      const a = (s.kind === 'in' ? st8.inn : st8.born(s) * (s.kind === 'out' ? 1 - st8.out : 1)) * st8.fade;
      const from = s.a ?? s.b!, to = s.b ?? s.a!, k = s.kind === 'keep' ? st8.slide : 0;
      pts.push(toView(project(onVault(w, from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k), cam, ax)));
      alpha.push(a);
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(p => { if (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } });
    w.box = isFinite(x0) ? [x0, y0, x1, y1] : null;
    const unit = Math.max(.8, Math.min(1.6, view.w / 1100)) * (st8.small ? .86 : 1);
    // Lines: a dark underlay by day, then a fine gold stroke broken where it meets a star.
    ctx.lineCap = 'round';
    for (const pass of day ? [0, 1] : [1]) {
      ctx.globalCompositeOperation = pass ? 'lighter' : 'source-over';
      ctx.lineWidth = (pass ? 1.15 : 2.8) * unit * (.9 + .25 * st8.bright);
      for (const [p, q, kind] of w.segs) {
        const A = pts[p], B = pts[q]; const a = Math.min(alpha[p], alpha[q]); if (!A || !B || a < .01) continue;
        const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy); if (L < 1) continue;
        const gap = Math.min(L * .28, 4.5 * unit);
        const wrong = kind === 'out' ? st8.diagnose : 0, fresh = kind === 'in' ? st8.fresh : 0;
        const col = mixc(mixc(GOLD, EMBER, wrong), COOL, fresh);
        ctx.strokeStyle = pass ? rgba(col, (day ? .9 : .66) * a * (.7 + .3 * st8.bright)) : `rgba(22,13,6,${.5 * a})`;
        ctx.setLineDash(wrong > .5 ? [2.5 * unit, 3.5 * unit] : []);
        ctx.beginPath(); ctx.moveTo(A[0] + dx / L * gap, A[1] + dy / L * gap); ctx.lineTo(B[0] - dx / L * gap, B[1] - dy / L * gap); ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    // Stars: a sharp core, a small halo, and a four-point glint on the brightest.
    w.stars.forEach((s, i) => {
      const P = pts[i], a = alpha[i]; if (!P || a < .01) return;
      const tw = .85 + .15 * Math.sin(t * 2.1 + s.tw);
      const wrong = s.kind === 'out' ? st8.diagnose * (.75 + .25 * Math.sin(t * 7 + s.tw)) : 0;
      const fresh = s.kind === 'in' ? st8.fresh : 0;
      const col = mixc(mixc([255, 250, 240], EMBER, wrong * .8), COOL, fresh * .7);
      const core = Math.max(1.1, Math.min(2.8, 1.7 * unit * s.mag)) * (1 + .3 * fresh + .25 * st8.bright);
      if (day) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a * (st8.small ? .45 : .6); ctx.fillStyle = '#160d06'; ctx.beginPath(); ctx.arc(P[0], P[1], core + 1.4 * unit, 0, 6.283); ctx.fill(); }
      ctx.globalCompositeOperation = 'lighter';
      const hr = core * (day ? 3.2 : 4.6) * tw;
      if (!st8.small) { ctx.globalAlpha = a * (day ? .5 : .8); ctx.drawImage(halo, P[0] - hr, P[1] - hr, hr * 2, hr * 2); }
      ctx.globalAlpha = a; ctx.fillStyle = rgba(col, 1); ctx.beginPath(); ctx.arc(P[0], P[1], core, 0, 6.283); ctx.fill();
      if (!st8.small && (s.mag > 1.12 || fresh > .3)) {
        const g = core * 3.4 * tw; ctx.strokeStyle = rgba(col, .55 * a); ctx.lineWidth = .8;
        ctx.beginPath(); ctx.moveTo(P[0] - g, P[1]); ctx.lineTo(P[0] + g, P[1]); ctx.moveTo(P[0], P[1] - g); ctx.lineTo(P[0], P[1] + g); ctx.stroke();
      }
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // ---- The apple: Newton's, dropped from the top of the vault onto the visitor's helmet.
  type Apple = { p: Vec; v: Vec; spin: number; rot: number; rest: boolean; hits: number };
  const apples: Apple[] = [];
  const HELMET = (): Vec => [FIG[0], FIG[1], 1.72], AR = .23;
  function dropApple() {
    if (apples.length > 6) apples.shift();
    apples.push({ p: [FIG[0] + .06 + Math.random() * .06, FIG[1] - .05, 24], v: [0, 0, 0], spin: 0, rot: Math.random() * 6, rest: false, hits: 0 });
  }
  function stepApples(dt: number) {
    for (const a of apples) {
      if (a.rest) continue;
      a.v[2] -= 9.81 * dt;
      a.p = add(a.p, mul(a.v, dt));
      const hc = HELMET(), d = sub(a.p, hc), dist = Math.hypot(...d);
      if (dist < .22 + AR && dot(a.v, d) < 0) {
        const n = mul(d, 1 / dist), vn = dot(a.v, n);
        a.v = add(sub(a.v, mul(n, 1.4 * vn)), [.45, -.2, 0]);
        a.p = add(hc, mul(n, .22 + AR)); a.spin = 7; a.hits++;
        emit(a.hits === 1 ? 'apple-hit' : 'apple-bounce');
      }
      if (a.p[2] < AR) {
        a.p[2] = AR;
        if (a.v[2] < -1.2) { a.v[2] *= -.38; a.v[0] *= .7; a.v[1] *= .7; emit('apple-bounce'); }
        else { a.v[2] = 0; a.v[0] *= Math.pow(.25, dt); a.v[1] *= Math.pow(.25, dt); if (Math.hypot(a.v[0], a.v[1]) < .03) a.rest = true; }
        a.spin = Math.hypot(a.v[0], a.v[1]) / AR;
      }
      a.rot += a.spin * dt;
    }
  }
  function drawApples(cam: Cam, ax: ReturnType<typeof axes>) {
    for (const a of apples) {
      const P = toView(project(a.p, cam, ax)), E = toView(project(add(a.p, mul(ax.right, AR)), cam, ax));
      const F = toView(project([a.p[0], a.p[1], .01], cam, ax)), FE = toView(project([a.p[0] + AR, a.p[1], .01], cam, ax));
      if (!P || !E) continue;
      const r = Math.max(3, Math.hypot(E[0] - P[0], E[1] - P[1]));
      if (F && FE) { // contact shadow
        const sr = Math.hypot(FE[0] - F[0], FE[1] - F[1]) * 1.3, k = Math.max(0, 1 - a.p[2] / 6);
        ctx.globalAlpha = .45 * k; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(F[0], F[1], sr, sr * .35, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(a.rot);
      const g = ctx.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.05);
      g.addColorStop(0, '#ff6a4f'); g.addColorStop(.5, '#cf2a1f'); g.addColorStop(1, '#6a0f0b');
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(0, -r * .72);
      ctx.bezierCurveTo(r * .55, -r * 1.12, r * 1.18, -r * .55, r * .98, r * .2);
      ctx.bezierCurveTo(r * .82, r * .9, r * .3, r * 1.05, 0, r * .9);
      ctx.bezierCurveTo(-r * .3, r * 1.05, -r * .82, r * .9, -r * .98, r * .2);
      ctx.bezierCurveTo(-r * 1.18, -r * .55, -r * .55, -r * 1.12, 0, -r * .72);
      ctx.fill();
      ctx.strokeStyle = '#4a2c14'; ctx.lineWidth = Math.max(1, r * .12); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -r * .7); ctx.quadraticCurveTo(r * .08, -r * 1.05, r * .2, -r * 1.3); ctx.stroke();
      ctx.fillStyle = '#4f9a3c'; ctx.beginPath(); ctx.ellipse(r * .5, -r * 1.12, r * .38, r * .16, -.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-r * .42, -r * .35, r * .16, r * .26, -.5, 0, 6.283); ctx.fill();
      ctx.restore();
    }
  }

  // ---- Loop.
  let prev = performance.now();
  function draw(now: number) {
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    if (mode === 'film' && (video.ended || video.currentTime >= filmEnd - .04)) { mode = 'hold'; holdBase = filmEnd; holdStart = now; }
    const t = mode === 'film' ? video.currentTime : holdBase + (now - holdStart) / 1000;
    if (!revealed && t >= APPEAR + 1.2) { revealed = true; o.onReveal(); emit('reveal'); }
    if (repairAt === Infinity && mode === 'hold' && t >= filmEnd + .9) repairAt = t + .2;
    const cam = camAt(fixedCam || mode === 'hold' ? filmEnd : t), ax = axes(cam.q);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, view.w, view.h);
    stepApples(dt);
    if (t >= APPEAR && main.plane) {
      const m = Math.max(0, t - repairAt) / 2.4;
      if (!repaired && m >= 1) { repaired = true; repairedAt = t; o.onRepaired(); emit('repaired'); }
      const inn = ease(m * 1.7 - .55);
      const nIn = main.stars.filter(s => s.kind === 'in').length;
      while (nIn && lit < Math.floor(inn * nIn)) { lit++; emit('star', lit); }
      drawWord(main, cam, ax, t, {
        born: s => ease((t - APPEAR - s.order * .09) / .7), out: ease(m * 1.7), inn, slide: ease(m * 1.9 - .35),
        diagnose: repairAt === Infinity ? ease((t - APPEAR - 2.4) / .8) : 1, fresh: 1 - ease(m * 1.2 - .6), fade: 1, bright: 0,
      });
      // After the repair: the other pages come out faintly, and the visitor's own star.
      const after = t - repairedAt;
      extras.forEach((ex, i) => {
        const on = hover === ex.href;
        drawWord(ex.word, cam, ax, t, { born: s => ease((after - .6 - i * .5 - s.order * .05) / .8), out: 0, inn: 1, slide: 0, diagnose: 0, fresh: 0, fade: 1, bright: on ? 1 : .35, small: true });
        if (ex.word.box && after > 1.2 + i * .5) {
          const [x0, , x1, y1] = ex.word.box, a = Math.min(1, (after - 1.2 - i * .5) / .8) * (on ? 1 : .85);
          ctx.font = `600 ${Math.round(11.5 * Math.max(.9, Math.min(1.3, view.w / 1300)))}px Inter, system-ui, sans-serif`;
          (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0.18em';
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillStyle = day ? `rgba(22,13,6,${.55 * a})` : `rgba(0,0,0,${.5 * a})`; ctx.fillText(ex.label, (x0 + x1) / 2 + 1, y1 + 11);
          ctx.fillStyle = `rgba(255,232,200,${.9 * a})`; ctx.fillText(ex.label, (x0 + x1) / 2, y1 + 10);
        }
      });
      if (visitor?.P && after > 1.2) {
        const P = toView(project(visitor.P, cam, ax));
        if (P) {
          const a = ease((after - 1.2) / 1.2), pulse = 1 + .3 * Math.sin(t * 2.4);
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
          const hr = 30 * pulse; ctx.drawImage(halo, P[0] - hr, P[1] - hr, hr * 2, hr * 2); ctx.drawImage(halo, P[0] - hr * .5, P[1] - hr * .5, hr, hr);
          ctx.fillStyle = '#f2f7ff'; ctx.beginPath(); ctx.arc(P[0], P[1], 3.6, 0, 6.283); ctx.fill();
          ctx.strokeStyle = 'rgba(210,230,255,.85)'; ctx.lineWidth = 1.2;
          const g = 20 * pulse; ctx.beginPath(); ctx.moveTo(P[0] - g, P[1]); ctx.lineTo(P[0] + g, P[1]); ctx.moveTo(P[0], P[1] - g); ctx.lineTo(P[0], P[1] + g); ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
          ctx.font = '600 13px Inter, system-ui, sans-serif'; (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0.14em';
          // Near the right edge the number reads to the left of its star.
          const left = P[0] > view.w * .7, dx = left ? -24 : 24;
          ctx.textAlign = left ? 'right' : 'left'; ctx.textBaseline = 'middle';
          const label = `№ ${visitor.n.toLocaleString('de-AT')}`;
          ctx.fillStyle = `rgba(0,0,0,${.55 * a})`; ctx.fillText(label, P[0] + dx + 1, P[1] + 1);
          ctx.fillStyle = `rgba(226,238,255,${a})`; ctx.fillText(label, P[0] + dx, P[1]);
          ctx.globalAlpha = 1;
          if (a > .05 && !visitorShown) { visitorShown = true; emit('visitor'); }
        }
      }
    }
    drawApples(cam, ax);
    const busy = !(repaired && o.reduced) || apples.some(a => !a.rest);
    raf = busy ? requestAnimationFrame(draw) : 0;
  }
  let visitorShown = false;
  const wake = () => { if (!raf) { prev = performance.now(); raf = requestAnimationFrame(draw); } };

  // ---- Pointer: the faint constellations open their pages; the astronaut catches an apple.
  const local = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * view.w / r.width, (e.clientY - r.top) * view.h / r.height]; };
  const astronautHit = (x: number, y: number) => {
    if (mode !== 'hold') return false;
    const cam = camAt(filmEnd), ax = axes(cam.q);
    const A = toView(project([FIG[0], FIG[1], .1], cam, ax)), B = toView(project([FIG[0], FIG[1], 1.95], cam, ax));
    if (!A || !B) return false;
    const w = Math.abs(A[1] - B[1]) * .32;
    return x > A[0] - w && x < A[0] + w && y > B[1] && y < A[1];
  };
  const hitSection = (x: number, y: number) => {
    if (!repaired) return null;
    for (const ex of extras) { const b = ex.word.box; if (b && x > b[0] - 14 && x < b[2] + 14 && y > b[1] - 14 && y < b[3] + 30) return ex.href; }
    return null;
  };
  canvas.addEventListener('pointermove', e => {
    const [x, y] = local(e); const h = hitSection(x, y);
    if (h !== hover) hover = h;
    canvas.style.cursor = h || astronautHit(x, y) ? 'pointer' : '';
  });
  canvas.addEventListener('pointerleave', () => { hover = null; canvas.style.cursor = ''; });
  canvas.addEventListener('click', e => {
    const [x, y] = local(e); const h = hitSection(x, y);
    if (h) { emit('open', h); o.onOpen?.(h); return; }
    if (astronautHit(x, y)) { dropApple(); wake(); }
  });

  resize();
  addEventListener('resize', resize);
  if (o.reduced) { mode = 'hold'; holdBase = filmEnd + 60; holdStart = performance.now(); fixedCam = true; repairAt = -Infinity; }
  raf = requestAnimationFrame(draw);

  return {
    /** Jump to the vault. */
    skip() { if (mode === 'film') { try { video.pause(); video.currentTime = Math.max(0, filmEnd - .01); } catch {} mode = 'hold'; holdBase = Math.max(APPEAR + .3, Math.min(video.currentTime || 0, filmEnd)); holdStart = performance.now(); fixedCam = true; } },
    replay() { cancelAnimationFrame(raf); mode = 'film'; fixedCam = false; repairAt = Infinity; repairedAt = Infinity; revealed = false; repaired = false; lit = 0; visitorShown = false; video.currentTime = 0; video.play().catch(() => {}); raf = requestAnimationFrame(draw); },
    /** No film at all (blocked autoplay, data saver): hold the last frame and run from there. */
    still() { mode = 'hold'; holdBase = APPEAR; holdStart = performance.now(); fixedCam = true; },
    retarget(target: string) { o.target = target; main = new Word(typed, o.still ? typed : target, portrait() ? 11 : 22); resize(); },
    visitor(n: number) { visitor = { n, P: null }; resize(); wake(); },
    dropApple() { dropApple(); wake(); },
    resize,
    dispose() { cancelAnimationFrame(raf); removeEventListener('resize', resize); },
  };
}
