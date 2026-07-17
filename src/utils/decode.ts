// ─────────────────────────────────────────────────────────────────────────────
//  The decode — scramble, then resolve.
//
//  Built for the preloader, where each phase materialises out of noise instead
//  of hard-swapping the string. That gesture is the studio's signature for "text
//  arriving", so it lives here rather than in the one component that invented it:
//  everything that decodes text decodes it identically.
// ─────────────────────────────────────────────────────────────────────────────

export const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/#*<>·";

/** Motion the visitor asked us to skip — OS-level, or the site's own Calm mode. */
export const prefersCalm = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  document.documentElement.classList.contains("rb-calm");

/** One run of text to resolve, and where to put each frame of it. */
export type DecodeTarget = {
  text: string;
  write: (value: string) => void;
};

export type DecodeOptions = {
  duration?: number;
  glyphs?: string;
  /** Fires exactly once, on completion or cancellation, after the text has settled. */
  onDone?: () => void;
};

/**
 * Resolve every target on one shared clock, so a label split across several
 * nodes reads as a single word decoding rather than a race between fragments.
 * Returns a cancel function that snaps everything to its final text.
 */
export function decodeAll(targets: DecodeTarget[], opts: DecodeOptions = {}): () => void {
  const { duration = 520, glyphs = GLYPHS, onDone } = opts;
  let done = false;
  const settle = () => {
    if (done) return;
    done = true;
    targets.forEach((target) => target.write(target.text));
    onDone?.();
  };

  if (prefersCalm() || !targets.length) {
    settle();
    return () => {};
  }

  let frame = 0;
  const started = performance.now();
  const step = (now: number) => {
    const t = Math.min((now - started) / duration, 1);
    if (t >= 1) {
      settle();
      return;
    }
    targets.forEach(({ text, write }) => {
      // The resolve front sweeps left to right; everything ahead of it is noise.
      const solid = Math.floor(t * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        out += i < solid || text[i] === " "
          ? text[i]
          : glyphs[(Math.random() * glyphs.length) | 0];
      }
      write(out);
    });
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);

  return () => {
    cancelAnimationFrame(frame);
    settle();
  };
}

/** Decode a single element's text content in place. */
export function decode(el: HTMLElement, final: string, opts: DecodeOptions = {}) {
  return decodeAll([{ text: final, write: (value) => (el.textContent = value) }], opts);
}

/**
 * Decode whatever text an element already holds, without touching its markup.
 *
 * `decode(el, el.textContent)` looks equivalent and is not: textContent flattens
 * the element, so a <br> or a <span> inside the label is destroyed the moment the
 * text settles — which is how "DRIFTED<br>INTO" once shipped as "DRIFTEDINTO".
 * Writing to the text nodes themselves leaves the structure alone.
 */
export function decodeText(el: HTMLElement, opts: DecodeOptions = {}) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const targets: DecodeTarget[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.nodeValue?.trim()) continue;
    const text = node.nodeValue;
    targets.push({ text, write: (value) => (node.nodeValue = value) });
  }
  return decodeAll(targets, opts);
}
