import gsap from "gsap";
import SplitText from "gsap/SplitText";

// ─────────────────────────────────────────────────────────────────────────────
//  The reveal choreography.
//
//  There are two ways an element gets revealed on this site: split text through
//  this module, and whole blocks through a ScrollTrigger batch on each page.
//  They used to disagree about everything. This module fired the moment one
//  pixel of an element crossed the bottom edge of the screen; the batches fired
//  at "top 88%". So a heading started while it was still off the bottom, then
//  waited out a queue delay of 100ms per element already queued, while the
//  paragraph under it — which enters later — went first. Two rhythms, two
//  durations, and an order that inverted itself depending on scroll speed.
//
//  Now: one trigger line (REVEAL_LINE, the same 88% the batches use), one clock
//  (a wave — everything that crosses the line within WAVE_WINDOW plays as one
//  gesture, in document order, STEP apart), and one motion vocabulary where the
//  travel shrinks from heading to line to block so the eye reads a hierarchy
//  instead of three unrelated moves. `scheduleReveal` is exported so the page
//  batches feed the same wave rather than staggering on their own.
// ─────────────────────────────────────────────────────────────────────────────

/** How far above the bottom edge an element has to be before it counts as seen.
 *  12% == ScrollTrigger's "top 88%", which is what every batch on the site uses. */
const REVEAL_LINE = '0px 0px -12% 0px';

const observer = new IntersectionObserver(intersectCallback, {
  root: null,
  rootMargin: REVEAL_LINE,
  threshold: 0,
})

const map = new WeakMap<HTMLElement, ((entries: IntersectionObserverEntry) => void)[]>();

function intersectCallback(entries: IntersectionObserverEntry[]) {
  entries.forEach(ent => {
    (map.get(ent.target as HTMLElement) || []).forEach(fn => fn(ent))
  })
}

function visibilityObserve(element: HTMLElement, onChange: (entries: IntersectionObserverEntry) => void) {
  const fns = map.get(element) || [];
  fns.push(onChange)
  map.set(element, fns)

  observer.observe(element)
}

function visibilityUnobserve(element: HTMLElement, onChange: (entries: IntersectionObserverEntry) => void) {
  const fns = (map.get(element) || []).filter((fn) => fn !== onChange);

  if (fns.length) {
    map.set(element, fns)
  } else {
    map.delete(element)
    observer.unobserve(element)
  }
}


const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lightweightReveal = !reducedMotion && matchMedia("(max-width: 767px), (pointer: coarse)").matches;

/** Elements crossing the line within this many ms belong to the same gesture. */
const WAVE_WINDOW = 110;
/** The beat between two elements of one gesture. Long enough to read as a
 *  sequence, short enough that a whole section lands inside a second. */
const STEP = 85;
/** No single gesture runs longer than this, however many elements are in it. */
const WAVE_LENGTH = 640;

/** One shared vocabulary. Every reveal on the site is one of these three, and
 *  the travel shrinks down the hierarchy: a heading moves furthest, a line of
 *  body copy less, a block least. */
export const REVEAL = {
  // expo.out, not power3.out. The difference is the tail: expo covers most of
  // the distance in the first third and then glides, which is the deceleration
  // that reads as expensive rather than merely animated. Everything on the
  // site uses this one curve, so two reveals overlapping never look like two
  // different animations that happen to be playing at once.
  ease: "expo.out",
  words: { duration: 1, stagger: 0.05 },
  lines: { duration: 1.05, stagger: 0.07 },
  block: { duration: 1, distance: 26 },
} as const;

let wave: HTMLElement[] = [];
const plays = new WeakMap<HTMLElement, () => void>();
let waveTimer = 0;

const flushWave = () => {
  // Document order, not the order the observer happened to fire in: a heading
  // must lead the paragraph under it even when both cross the line together.
  const ordered = wave.slice().sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
  wave = [];
  // A whole section can cross the line at once — a grid of six tiles, say. At a
  // strict beat that gesture would run for two seconds; clamping the delay
  // instead made everything past the sixth element fire on the same frame,
  // which is a pile-up rather than a cascade. So the beat compresses to fit:
  // few elements get the full step, many share one window.
  const step = Math.min(STEP, WAVE_LENGTH / Math.max(1, ordered.length - 1));

  ordered.forEach((el, index) => {
    const play = plays.get(el);
    if (!play) return;
    plays.delete(el);
    pending.delete(el);
    const delay = Math.round(index * step);
    if (delay === 0) play();
    else setTimeout(play, delay);
  });
};

/** Put a reveal on the shared clock. The page-level ScrollTrigger batches call
 *  this instead of staggering their own elements, so block reveals and split
 *  text belong to one cascade rather than two that happen to overlap. */
export function scheduleReveal(el: HTMLElement, play: () => void) {
  if (plays.has(el) || revealed.has(el)) return;
  revealed.add(el);
  plays.set(el, play);
  wave.push(el);
  // Everything else in this section that is ALREADY past the line joins the
  // same gesture. Without it a section reveals one element per scroll notch —
  // technically staggered, but read as a series of unrelated pops, because the
  // heading has finished and been forgotten by the time the cards below it
  // start. This is what makes a section land as one move.
  for (const neighbour of sceneMates(el)) {
    if (revealed.has(neighbour)) continue;
    const play = pending.get(neighbour);
    if (!play || !pastLine(neighbour)) continue;
    revealed.add(neighbour);
    plays.set(neighbour, play);
    wave.push(neighbour);
  }
  clearTimeout(waveTimer);
  waveTimer = window.setTimeout(flushWave, WAVE_WINDOW);
}

/** Everything already revealed or on its way, so nothing plays twice. */
const revealed = new WeakSet<HTMLElement>();
/** Elements that have registered a reveal but have not crossed the line yet,
 *  so a neighbour crossing first can bring them along. */
const pending = new Map<HTMLElement, () => void>();
const scenes = new WeakMap<HTMLElement, Element>();

/** The block an element belongs to. Sections are the unit a visitor reads. */
const sceneOf = (el: HTMLElement): Element => {
  let scene = scenes.get(el);
  if (!scene) {
    scene = el.closest("section, article, footer, [data-scene]") || document.body;
    scenes.set(el, scene);
  }
  return scene;
};

const sceneMates = (el: HTMLElement): HTMLElement[] => {
  const scene = sceneOf(el);
  const mates: HTMLElement[] = [];
  for (const [candidate] of pending) {
    if (candidate !== el && sceneOf(candidate) === scene) mates.push(candidate);
  }
  return mates;
};

/** Past the same 88% line the observer uses. */
const pastLine = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect();
  return rect.top < innerHeight * 0.88 && rect.bottom > -innerHeight * 0.5;
};

/** Register a reveal that has not been triggered yet, so that when a
 *  neighbour in the same section fires, this one can join that gesture. */
export function registerReveal(el: HTMLElement, play: () => void) {
  if (revealed.has(el)) return;
  pending.set(el, play);
}

const stMap = new WeakMap<HTMLElement, InstanceType<typeof SplitText>>()

function getSt(el: HTMLElement, type: "words" | "lines"): SplitText {
  if (stMap.has(el)) {
    return stMap.get(el)!
  }

  const st = new SplitText(el, {
    aria: "none",
    tag: "span",
    autoSplit: true,
    mask: type,
    wordsClass: "i",
    linesClass: "i",
    onSplit(_st) {
      _st.masks.forEach((m) => {
        (m as HTMLElement).style.overflow = '';
      })

      stMap.set(el, _st)
    },
    type
  });

  stMap.set(el, st)

  return st;
}

const fns = {
  words(el: HTMLElement) {
    getSt(el, "words");

    let lastOut: ReturnType<typeof gsap.to> | null = null

    return {
      in() {
        const st = getSt(el, "words");

        if (lastOut) {
          lastOut.kill();
          lastOut = null
        }

        gsap.fromTo(
          st.words,
          {
            opacity: 1,
            rotate: 4,
            yPercent: 118,
          },
          {
            rotate: 0,
            yPercent: 0,
            ease: REVEAL.ease,
            duration: REVEAL.words.duration,
            stagger: {
              each: REVEAL.words.stagger,
            },
          },
        );
      },
      out(next: () => void) {
        const st = getSt(el, "words");

        lastOut = gsap.to(
          st.words,
          {
            opacity: 0,
            ease: 'power3.out',
            duration: 0.5,
            stagger: {
              each: 0.05,
            },
            onComplete() {
              next()
            },
          },
        );
      },
    };
  },
  lines(el: HTMLElement) {
    getSt(el, "lines");

    let lastOut: ReturnType<typeof gsap.to> | null = null

    return {
      in() {
        const st = getSt(el, "lines");

        if (lastOut) {
          lastOut.kill();
          lastOut = null
        }

        gsap.fromTo(
          st.lines,
          {
            rotateX: 32,
            yPercent: 118,
          },
          {
            rotateX: 0,
            yPercent: 0,
            ease: REVEAL.ease,
            duration: REVEAL.lines.duration,
            stagger: {
              each: REVEAL.lines.stagger,
            },
          },
        );
      },
      out(next: () => void) {
        const st = getSt(el, "lines");

        lastOut = gsap.fromTo(
          st.lines,
          {
            rotateX: 45,
            yPercent: 0,
          },
          {
            rotateX: 0,
            yPercent: -120,
            ease: 'power4.out',
            duration: 0.5,
            stagger: {
              each: 0.05,
            },
            onComplete() {
              next()
            },
          },
        );
      }
    }
  }
}

function onVisibilityChange(ent: IntersectionObserverEntry) {
  const el = ent.target as HTMLElement;

  if (ent.isIntersecting) {
    const fn = el.dataset.syReveal as keyof typeof fns | undefined;
    // Scrolling back up to something never seen: show it, do not perform it.
    const movingBack = (window.scrollDirection ?? 1) < 0 && window.scrollY > 2;

    if (movingBack) {
      if (fn === "words") {
        gsap.set(getSt(el, "words").words, { opacity: 1, rotate: 0, yPercent: 0 });
      } else if (fn === "lines") {
        gsap.set(getSt(el, "lines").lines, { opacity: 1, rotateX: 0, yPercent: 0 });
      }
      el.classList.add("is-in");
      visibilityUnobserve(el, onVisibilityChange);
      return;
    }

    visibilityUnobserve(el, onVisibilityChange);
    scheduleReveal(el, splitPlay(el));
  }
}

/** The split is done at play time, not at registration: splitting every heading
 *  and paragraph on a long page up front costs a layout pass per element for
 *  work most visitors never scroll to. */
const splitPlay = (el: HTMLElement) => () => {
  const fn = el.dataset.syReveal as keyof typeof fns | undefined;
  const inFn = fn && fns[fn] ? fns[fn](el).in : undefined;
  el.classList.add("is-in");
  inFn && inFn();
};

document.fonts.ready.then(() => {
  document.querySelectorAll<HTMLHtmlElement>("[data-sy-reveal]").forEach((elem) => {
    if (reducedMotion) {
      elem.classList.add("is-in");
      return;
    }

    if (lightweightReveal) {
      let animation: Animation | null = null;
      const revealIn = () => {
        animation?.cancel();
        elem.classList.add("is-in");
        animation = elem.animate(
          [
            { opacity: 0, transform: "translate3d(0, 1.15rem, 0)" },
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
          ],
          // expo.out as a bezier — the same curve the desktop reveals use, so a
          // phone gets a cheaper animation on an identical rhythm.
          { duration: 900, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "both" },
        );
      };
      const revealOut = () => {
        animation?.cancel();
        animation = elem.animate(
          [
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
            { opacity: 0, transform: "translate3d(0, -.75rem, 0)" },
          ],
          { duration: 260, easing: "ease-in", fill: "both" },
        );
        animation.finished.then(() => elem.classList.remove("is-in")).catch(() => {});
      };

      if (elem.hasAttribute('data-sy-reveal-manual')) {
        elem.addEventListener('reveal-in', revealIn);
        elem.addEventListener('reveal-out', revealOut);
      } else {
        elem.style.opacity = "0";
        registerReveal(elem, revealIn);
        const onLightVisibility = (entry: IntersectionObserverEntry) => {
          if (!entry.isIntersecting) return;
          visibilityUnobserve(elem, onLightVisibility);
          // Same wave, same beat as everything else — a phone gets a cheaper
          // animation, not a different rhythm.
          scheduleReveal(elem, revealIn);
        };
        visibilityObserve(elem, onLightVisibility);
      }

      return;
    }

    if (elem.hasAttribute('data-sy-reveal-manual')) {
      const _fn = elem.dataset.syReveal as keyof typeof fns | undefined;
      const fn = _fn && fns[_fn] && fns[_fn](elem);

      elem.addEventListener('reveal-in', () => {
        fn && fn.in()
        elem.classList.add("is-in");
      });

      elem.addEventListener('reveal-out', () => {
        if (fn) {
          fn.out(() => {
            elem.classList.remove("is-in");
          });
        } else {
          elem.classList.remove("is-in");
        }
      });

    } else {
      registerReveal(elem, splitPlay(elem));
      visibilityObserve(elem, onVisibilityChange);
    }
  });
})

export function manualRevealIn(elem: HTMLElement) {
  elem.dispatchEvent(new Event('reveal-in'));
}

export function manualRevealOut(elem: HTMLElement) {
  elem.dispatchEvent(new Event('reveal-out'));
}
