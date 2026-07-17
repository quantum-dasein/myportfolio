// ─────────────────────────────────────────────────────────────────────────────
//  Decode on hover.
//
//  Pointing at a link makes its label re-resolve out of noise — the same gesture
//  the preloader uses when a phase arrives, on the same engine. The site says
//  "text materialises here" in exactly one voice.
//
//  Two things this has to get right:
//   • Scrambled glyphs are wider than the real word (they are all caps), so the
//     label's box is pinned for the duration. Without that, hovering one nav item
//     shoves every other one sideways.
//   • Only real labels decode. Decorative arrows, icons and screen-reader-only
//     text are left alone, and anything longer than a label is left alone too —
//     a paragraph dissolving into noise is a glitch, not a flourish.
// ─────────────────────────────────────────────────────────────────────────────

import { decodeAll, prefersCalm, type DecodeTarget } from "./decode";

const SELECTOR = "sy-head a, sy-head button, sy-footer a, [data-decode]";
/** Past this, it stops reading as a label and starts reading as a bug. */
const MAX_LABEL = 34;
const DURATION = 380;

/** Live decodes, keyed by link, so a re-hover can never stack a second run. */
const running = new WeakMap<HTMLElement, () => void>();

/** The text nodes that carry the visible label. */
function labelNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      // Decorative glyphs (↗), icons and sr-only text are not the label.
      if (!parent || parent.closest('[aria-hidden="true"], svg, .u-sr-only')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const out: Text[] = [];
  while (walker.nextNode()) out.push(walker.currentNode as Text);
  return out;
}

/** Freeze the link's box at its resting size. Returns the undo. */
function pin(el: HTMLElement) {
  const { width } = el.getBoundingClientRect();
  const style = el.style;
  const previous = {
    display: style.display,
    width: style.width,
    boxSizing: style.boxSizing,
    whiteSpace: style.whiteSpace,
  };
  const restore = () => Object.assign(style, previous);
  if (!width) return restore;

  // An inline box ignores width; anything else already accepts one, and
  // overriding e.g. a flex link's display would wreck its layout.
  if (getComputedStyle(el).display === "inline") style.display = "inline-block";
  // getBoundingClientRect measures the border box, so set the same box.
  style.boxSizing = "border-box";
  style.width = `${width}px`;
  style.whiteSpace = "nowrap";
  return restore;
}

function start(el: HTMLElement) {
  if (prefersCalm() || running.has(el)) return;
  if (el.closest("[data-no-decode]")) return;

  const nodes = labelNodes(el);
  if (!nodes.length) return;
  if (nodes.reduce((sum, node) => sum + node.nodeValue!.length, 0) > MAX_LABEL) return;

  const targets: DecodeTarget[] = nodes.map((node) => ({
    text: node.nodeValue!,
    // Write to the node, not the element: a link may hold several label nodes
    // (the wordmark's two halves) and rewriting textContent would fuse them.
    write: (value) => (node.nodeValue = value),
  }));

  const unpin = pin(el);
  running.set(
    el,
    decodeAll(targets, {
      duration: DURATION,
      onDone: () => {
        unpin();
        running.delete(el);
      },
    }),
  );
}

// Delegated, so links rendered later are covered for free.
let hovered: HTMLElement | null = null;
document.addEventListener(
  "pointerover",
  (event) => {
    const el = (event.target as HTMLElement)?.closest<HTMLElement>(SELECTOR) ?? null;
    if (el === hovered) return; // still inside the same link, just over a child
    hovered = el;
    if (el) start(el);
  },
  { passive: true },
);

// Keyboard visitors get the same arrival.
document.addEventListener("focusin", (event) => {
  const el = (event.target as HTMLElement)?.closest<HTMLElement>(SELECTOR);
  if (el) start(el);
});
