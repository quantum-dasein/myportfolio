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

/** A phone is a small screen, not a different website.
 *
 *  Touch used to get a flat opacity fade in place of the split reveal: one
 *  gesture, 900ms long, for all 84 reveals on the site, while a desktop got
 *  masked words rising off a stagger. That is the whole distance between the
 *  two reading as the same piece of work, and it was paid on the device most
 *  visitors actually arrive on. Touch plays the same choreography now.
 *
 *  What a phone gets instead of a cheaper animation is a shorter one. The same
 *  heading sets as three lines on a desktop and five on a phone, so an
 *  unchanged per-word stagger buys a tail half again as long on the device with
 *  the least patience for it — every value below is tightened for touch and the
 *  tail is capped outright by `stagger()`. The compositor hint costs nothing at
 *  rest either: reveals.css holds it only while the element is playing.
 *
 *  The flat fade is not gone. It is what CALM means now — a reader asking for
 *  less motion, rather than a guess made from the width of their screen. */
const touch = matchMedia("(max-width: 767px), (pointer: coarse)").matches;
const calmReveal = !reducedMotion && document.documentElement.classList.contains("rb-calm");

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
  words: { duration: touch ? 0.58 : 0.66, stagger: touch ? 0.026 : 0.032, tail: touch ? 0.3 : 0.52 },
  lines: { duration: touch ? 0.62 : 0.7, stagger: touch ? 0.038 : 0.05, tail: touch ? 0.32 : 0.6 },
  block: { duration: 0.62, distance: 20 },
} as const;

/** Keeps the rhythm until the tail gets long, then compresses to fit it.
 *
 *  `each` on its own is what left a twelve-line paragraph on a 390px screen
 *  still arriving after the reader had scrolled past the end of it. `tail` is
 *  the longest the last piece may wait; below that nothing changes. */
const stagger = (count: number, each: number, tail: number) => ({
  each: count > 1 ? Math.min(each, tail / (count - 1)) : each,
});

/** The pieces are promoted for the length of the tween and not one frame
 *  longer. A standing `will-change` on every word of every heading is hundreds
 *  of compositor layers a phone holds for a page it has finished animating —
 *  which is the part of this that was genuinely worth optimising. */
function markPlaying(el: HTMLElement, tween: ReturnType<typeof gsap.to>) {
  el.classList.add("is-playing");
  tween.eventCallback("onComplete", () => el.classList.remove("is-playing"));
  return tween;
}

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

        markPlaying(
          el,
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
              stagger: stagger(st.words.length, REVEAL.words.stagger, REVEAL.words.tail),
            },
          ),
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

        markPlaying(
          el,
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
              stagger: stagger(st.lines.length, REVEAL.lines.stagger, REVEAL.lines.tail),
            },
          ),
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

    if (calmReveal) {
      let animation: Animation | null = null;
      const revealIn = () => {
        animation?.cancel();
        elem.classList.add("is-in");
        animation = elem.animate(
          [
            { opacity: 0, transform: "translate3d(0, 1.15rem, 0)" },
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
          ],
          // expo.out as a bezier — the same curve the split reveals use, so CALM
          // reads as the same site with the volume down rather than a different
          // one. 620ms, not 900: this is the whole gesture now, where on the
          // split path most of that time is the stagger arriving.
          { duration: 620, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "both" },
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
        // This is the one path that hides its element up front, so it is the one
        // that can lose it. An observer only reports a change, and a fast flick
        // can carry a heading from below the line to above the viewport between
        // two callbacks — no intersection is ever reported and the copy stays at
        // opacity 0 for the rest of the visit. Anything that ends up behind the
        // reader is shown outright: the same rule the split path uses for
        // scrolling back to something it never performed.
        elem.style.opacity = "0";
        const onLightVisibility = (entry: IntersectionObserverEntry) => {
          if (!entry.isIntersecting) {
            if (entry.boundingClientRect.bottom > 0) return;
            visibilityUnobserve(elem, onLightVisibility);
            scheduleReveal(elem, () => {
              elem.classList.add("is-in");
              elem.style.opacity = "";
            });
            return;
          }
          visibilityUnobserve(elem, onLightVisibility);
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
