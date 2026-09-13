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

/** A phone is a small screen, not a different website — but it is also a
 *  different scroll. Lenis damps the desktop wheel; a phone flings the page
 *  under your thumb at several times that speed, and every number below was set
 *  against the slow one. Same curve, same distance, same trigger, and the two
 *  do not read alike: what settles visibly on a desktop is already finished by
 *  the time it clears the bottom edge of a phone. The values that follow are
 *  the ones that differ, and nothing here changes what a desktop does. */
const touch = matchMedia("(max-width: 767px), (pointer: coarse)").matches;

/** Where a reveal starts, measured up from the bottom edge. Touch starts a
 *  little sooner so the longer travel below has somewhere to happen: at a flick
 *  the element is still moving as it arrives in the middle of the screen,
 *  instead of landing before you have seen it. */
const REVEAL_LINE = touch ? '0px 0px -5% 0px' : '0px 0px -12% 0px';

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

/** Touch used to get a flat opacity fade in place of the split reveal — one
 *  900ms gesture for all 84 reveals on the site. That fade is not gone: it is
 *  what CALM means now, which is a reader asking for less motion rather than a
 *  guess made from the width of their screen. */
const calmReveal = !reducedMotion && document.documentElement.classList.contains("rb-calm");

/** One shared vocabulary. Every reveal on the site is one of these three, and
 *  the travel shrinks down the hierarchy: a heading moves furthest, a line of
 *  body copy less, a block least.
 *
 *  Short on purpose. A second-long expo tail looks luxurious in isolation and
 *  sluggish on a page you are scrolling through, because the text is still
 *  settling when your eye has already moved on. */
export const REVEAL = {
  // On a desktop, the same curve the CSS transitions use (--ease-out-expo), so
  // a card lifting under the cursor and a heading arriving are the same hand.
  //
  // expo.out is 49% resolved 60ms in and 89% by 200ms. Under a damped wheel
  // that front-loading reads as authority — the page answers the moment you ask.
  // Under a thumb it reads as nothing at all: the element clears the trigger
  // line and has finished before it is far enough up the screen to look at, so
  // every block, image and card on a phone simply existed, fully arrived, the
  // instant it appeared. power2.out spends its travel evenly instead — half the
  // distance at the halfway mark rather than nine tenths of it — which is the
  // difference between something arriving and something having arrived.
  ease: touch ? "power2.out" : "expo.out",
  words: { duration: touch ? 0.92 : 0.66, stagger: touch ? 0.045 : 0.032, tail: touch ? 0.5 : 0.52 },
  lines: { duration: touch ? 0.95 : 0.7, stagger: touch ? 0.055 : 0.05, tail: touch ? 0.55 : 0.6 },
  // Blocks: the whole composition — every card, figure, row and button on the
  // site moves on these three numbers. 26px of rise is a tenth of a phone
  // screen's width and reads as a twitch at speed; the travel is set in CSS
  // from --rb-rise so one value covers every component, and GSAP animates from
  // whatever it finds there.
  block: { duration: touch ? 1 : 0.62, distance: touch ? 44 : 28, stagger: touch ? 0.1 : 0.06 },
  // Where a ScrollTrigger block reveal starts, and how wide a window counts as
  // one wave. A longer window on touch is what makes a section arrive as a
  // composition rather than as elements that each happen to be moving: at a
  // flick, neighbours that cross the line 140ms apart still belong to the same
  // stagger instead of being dealt two separate hands.
  start: touch ? "top 96%" : "top 88%",
  batchInterval: touch ? 0.14 : 0.1,
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
