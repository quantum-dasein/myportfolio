import gsap from "gsap";
import SplitText from "gsap/SplitText";

// ─────────────────────────────────────────────────────────────────────────────
//  The reveal choreography.
//
//  One rule: an element crosses the line, it plays. No queue, no waiting for
//  neighbours, no shared clock — every millisecond between "I can see it" and
//  "it moved" reads as lag, and stacking elements into scheduled gestures was
//  worse than the problem it solved.
//
//  What is shared is the three things that made the old version look like two
//  different websites arguing: the line (88% of the viewport, the same point
//  every ScrollTrigger on the site uses — this module used to fire at the very
//  bottom edge, so a heading started while it was still off screen and the
//  paragraph under it could overtake it), the curve, and the distances, which
//  shrink from heading to line to block so the eye reads a hierarchy.
// ─────────────────────────────────────────────────────────────────────────────

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

/** One shared vocabulary. Every reveal on the site is one of these three, and
 *  the travel shrinks down the hierarchy: a heading moves furthest, a line of
 *  body copy less, a block least.
 *
 *  Short on purpose. A second-long expo tail looks luxurious in isolation and
 *  sluggish on a page you are scrolling through, because the text is still
 *  settling when your eye has already moved on. */
export const REVEAL = {
  // The same curve the CSS transitions use (--ease-out-expo), so a card
  // lifting under the cursor and a heading arriving are the same hand.
  ease: "expo.out",
  words: { duration: 0.66, stagger: 0.032 },
  lines: { duration: 0.7, stagger: 0.05 },
  block: { duration: 0.62, distance: 20 },
} as const;

/** Play a reveal. Kept as a named export because several pages hand their own
 *  block animation in — one entry point means one place decides whether an
 *  element has already been revealed. */
const revealed = new WeakSet<HTMLElement>();

export function scheduleReveal(el: HTMLElement, play: () => void) {
  if (revealed.has(el)) return;
  revealed.add(el);
  play();
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
