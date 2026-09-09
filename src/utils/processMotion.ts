import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** One reversible scroll narrative. Layout and path measurement stay independent
 * of animated transforms, so resizing midway never changes the composition. */
export function setupProcessMotion(root: HTMLElement) {
  const q = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const qa = <T extends Element = HTMLElement>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
  const ink = q(".pv-type-ink");
  const message = ink.textContent || "";
  // Lay out the complete sentence once. Revealing glyphs preserves word wraps
  // and the input's vertical centre throughout typing and reverse scrolling.
  const fragment = document.createDocumentFragment();
  for (const token of message.split(/(\s+)/)) {
    if (/^\s*$/.test(token)) { fragment.append(document.createTextNode(token)); continue; }
    const word = document.createElement("span");
    word.className = "pv-word";
    for (const letter of Array.from(token)) {
      const glyph = document.createElement("span");
      glyph.className = "pv-letter";
      glyph.textContent = letter;
      word.append(glyph);
    }
    fragment.append(word);
  }
  ink.replaceChildren(fragment);
  const glyphs = Array.from(ink.querySelectorAll<HTMLElement>(".pv-letter"));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = matchMedia("(min-width: 1041px) and (pointer: fine)");
  let context: gsap.Context | undefined;
  let cleanup = () => {};

  const configure = () => {
    cleanup();
    context?.revert();
    root.classList.remove("is-sequenced", "is-complete");
    // Glyph opacity is written by the render callback, so restore it explicitly
    // after GSAP's revert (including live switches to Calm/reduced motion).
    glyphs.forEach((glyph) => { glyph.style.opacity = "1"; glyph.classList.remove("is-caret"); });
    ink.style.setProperty("--caret", "0");
    if (reduced.matches || document.documentElement.classList.contains("rb-calm")) {
      root.classList.add("is-complete");
      return;
    }

    context = gsap.context(() => {
      root.classList.add("is-sequenced");
      const clock = { typed: 0, energy: 0, end: 0 };
      const path = q<SVGPathElement>(".pv-filament");
      const traveller = q<SVGCircleElement>(".pv-traveller");
      // The stacked layout draws the current as three spans instead of one bundle
      // (see the geometry in ProcessFlow.astro). Each span owns exactly one unit of
      // `clock.energy`, which is also how the timeline already moves: 0→1 write to
      // scope, 1→2 scope to launch, 2→3 launch to terminus. So the span that is
      // filling is the only one written to, and the only one whose box goes dirty.
      const spans = qa<SVGPathElement>("[data-flow-segment]");
      const segmented = matchMedia("(max-width: 1040px), (pointer: coarse)").matches && spans.length === 3;
      const strands = segmented ? [] : qa<SVGPathElement>("[data-flow-strand]");
      const scrubbed = segmented ? spans : strands;
      const spanLengths = [1, 1, 1];
      const spanOffsets = ["", "", ""];
      const fronts = qa(".pv-front-strand");
      let length = 1;
      let scopeStop = .4;
      let launchStop = .85;
      let lastTyped = -1;
      let revealedGlyphs = 0;
      let lastCaret = -1;
      let lastEnergy = -1;
      let lastComplete = false;
      let refreshFrame = 0;
      const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
      const drawEnergy = () => {
        const phase = clock.energy;
        if (phase === lastEnergy) return;
        lastEnergy = phase;
        if (segmented) {
          for (let i = 0; i < 3; i++) {
            const offset = String(1000 * (1 - clamp01(phase - i)));
            // A span that is already full or still empty must not be written to:
            // an unchanged value still marks its box dirty for the next frame.
            if (spanOffsets[i] === offset) continue;
            spanOffsets[i] = offset;
            spans[i].style.strokeDashoffset = offset;
          }
          const index = Math.min(2, Math.max(0, Math.floor(phase)));
          const point = spans[index].getPointAtLength(clamp01(phase - index) * spanLengths[index]);
          traveller.setAttribute("cx", String(point.x));
          traveller.setAttribute("cy", String(point.y));
        } else {
          const progress = phase <= 1 ? phase * scopeStop
            : phase <= 2 ? scopeStop + (phase - 1) * (launchStop - scopeStop)
            : launchStop + (phase - 2) * (1 - launchStop);
          const point = path.getPointAtLength(clamp01(progress) * length);
          traveller.setAttribute("cx", String(point.x));
          traveller.setAttribute("cy", String(point.y));
          strands.forEach((strand) => { strand.style.strokeDashoffset = String(1000 * (1 - progress)); });
        }
        fronts.forEach((strand) => { strand.style.strokeDashoffset = String(1000 * (1 - clamp01(phase - 1))); });
      };
      const measure = () => {
        lastEnergy = -1;
        spanOffsets[0] = spanOffsets[1] = spanOffsets[2] = "";
        if (segmented) {
          // Each span already ends where the next begins, so there is nothing to
          // search for — the two 200-step nearest-point scans below are a wide
          // layout problem only.
          spans.forEach((span, i) => { spanLengths[i] = span.getTotalLength() || 1; });
          drawEnergy();
          return;
        }
        length = path.getTotalLength() || 1;
        const nearest = (name: string) => {
          const node = q(`.pv-${name}`);
          const object = q(`[data-flow-object="${name}"]`);
          const x = node.offsetLeft + object.offsetLeft + object.offsetWidth * .5;
          const y = node.offsetTop + object.offsetTop + object.offsetHeight * .55;
          let best = Infinity;
          let at = 0;
          for (let i = 0; i <= 200; i++) {
            const point = path.getPointAtLength(length * i / 200);
            const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
            if (distance < best) { best = distance; at = i / 200; }
          }
          return at;
        };
        scopeStop = nearest("scope");
        launchStop = nearest("launch");
        drawEnergy();
      };
      gsap.set([...scrubbed, ...fronts], { strokeDasharray: "1000", strokeDashoffset: 1000 });
      gsap.set(".pv-step", { opacity: 0, y: 7 });
      gsap.set(".pv-step > span", { opacity: .75 });
      gsap.set(".pv-caption", { opacity: 0, y: 8 });
      gsap.set(".pv-message", { opacity: .28, scale: .995 });
      gsap.set(".pv-sheet", { opacity: .24, y: 5, scale: .995 });
      gsap.set(".pv-browser", { opacity: .26, y: 4 });
      gsap.set(glyphs, { opacity: 0 });
      gsap.set(".pv-check", { "--check-glow": 0 });
      gsap.set(".pv-row", { opacity: .68, y: 6 });
      gsap.set(".pv-row-copy i", { scaleX: 0 });
      gsap.set(".pv-row-icon", { opacity: .4 });
      gsap.set(".pv-check-ring, .pv-check-mark", { strokeDashoffset: 1 });
      gsap.set(".pv-frame rect", { strokeDashoffset: 1 });
      gsap.set(".pv-chrome, .pv-nav, .pv-live, .pv-site-kicker, .pv-site-hero > p, .pv-site-link, .pv-sphere, .pv-projects > div, .pv-terminus", { opacity: 0 });
      gsap.set(".pv-projects > div", { y: 5 });
      gsap.set(".pv-site-hero > p", { y: 4 });
      gsap.set(".pv-sphere", { scale: .98 });

      const render = () => {
          if (lastTyped !== clock.typed) {
            const typed = Math.max(0, Math.min(glyphs.length, clock.typed));
            const whole = Math.floor(typed);
            if (whole > revealedGlyphs) {
              for (let index = revealedGlyphs; index < whole; index++) glyphs[index].style.opacity = "1";
            } else if (whole < revealedGlyphs) {
              for (let index = whole; index < revealedGlyphs; index++) glyphs[index].style.opacity = "0";
            }
            if (glyphs[whole]) glyphs[whole].style.opacity = String(typed - whole);
            revealedGlyphs = whole;
            const caret = Math.min(glyphs.length - 1, whole);
            if (caret !== lastCaret) {
              glyphs[lastCaret]?.classList.remove("is-caret");
              glyphs[caret]?.classList.add("is-caret");
              lastCaret = caret;
            }
            lastTyped = clock.typed;
          }
          drawEnergy();
          // `is-complete` gates the finished-state animations. Toggling it per
          // frame invalidated the whole scene's style for a value that changes
          // exactly once; the old `data-motion-progress` written alongside it
          // was read by nothing at all.
          const complete = timeline.progress() > .985;
          if (complete !== lastComplete) { root.classList.toggle("is-complete", complete); lastComplete = complete; }
      };
      const timeline = gsap.timeline({ paused: true, defaults: { ease: "power2.out" }, onUpdate: render });
      timeline.to(clock, { end: 1, duration: 100, ease: "none" }, 0)
        .to(".pv-write .pv-step", { opacity: 1, y: 0, duration: 6 }, 0)
        .to(".pv-write .pv-step > span", { opacity: 1, duration: 5 }, 0)
        .to(".pv-message", { opacity: 1, scale: 1, duration: 8 }, 1)
        .set(".pv-type-ink", { "--caret": 1 }, 5)
        .to(clock, { typed: glyphs.length, duration: 13, ease: "none" }, 4)
        .to(".pv-type-ink", { "--caret": 0, duration: .5, repeat: 3, yoyo: true }, 15)
        .set(".pv-type-ink", { "--caret": 0 }, 18)
        .to(".pv-send", { scale: .985, boxShadow: "0 0 16px #d5e6ff44", duration: 3 }, 16)
        .to(".pv-send", { scale: 1, duration: 4 }, 19)
        .fromTo(".pv-shockwave", { scale: 1, opacity: .3 }, { scale: 1.65, opacity: 0, duration: 8, immediateRender: false }, 18)
        .to(".pv-write .pv-caption", { opacity: 1, y: 0, duration: 5 }, 17)
        .to(traveller, { opacity: 1, duration: 1 }, 19)
        .to(clock, { energy: 1, duration: 9, ease: "power1.inOut" }, 19)
        .to(traveller, { opacity: 0, duration: 2 }, 27)
        .to(".pv-write .pv-step > span", { opacity: .82, duration: 9 }, 26)
        .to(".pv-scope .pv-step", { opacity: 1, y: 0, duration: 5 }, 25)
        .to(".pv-scope .pv-step > span", { opacity: 1, duration: 5 }, 25)
        .to(".pv-sheet", { opacity: 1, scale: 1, y: 0, duration: 9 }, 25)
        .fromTo(".pv-sheet", { "--reflection": .1 }, { "--reflection": .55, duration: 6, immediateRender: false }, 27);

      qa(".pv-row").forEach((row, index) => {
        const at = 33 + index * 8;
        timeline.to(row, { opacity: 1, y: 0, duration: 5 }, at)
          .fromTo(row, { "--row-sheen": "-110%" }, { "--row-sheen": "110%", duration: 6, immediateRender: false }, at)
          .to(row.querySelectorAll(".pv-row-copy i"), { scaleX: 1, duration: 3.5, stagger: .6 }, at + 1)
          .to(row.querySelector(".pv-row-icon"), { opacity: 1, duration: 3 }, at + 2)
          .to(row.querySelector(".pv-check-ring"), { strokeDashoffset: 0, duration: 3, ease: "none" }, at + 3)
          .to(row.querySelector(".pv-check-mark"), { strokeDashoffset: 0, duration: 3, ease: "none" }, at + 5)
          .to(row.querySelector(".pv-check"), { "--check-glow": 1, duration: 5 }, at + 5);
      });
      timeline.to(".pv-sheet", { "--reflection": .25, duration: 3 }, 55)
        .to(".pv-sheet", { "--reflection": .6, duration: 4, repeat: 1, yoyo: true }, 56)
        .to(".pv-scope .pv-caption", { opacity: 1, y: 0, duration: 4 }, 56)
        .to(traveller, { opacity: 1, duration: 1 }, 61)
        .to(clock, { energy: 2, duration: 9, ease: "power1.inOut" }, 61)
        .to(traveller, { opacity: 0, duration: 2 }, 69)
        .to(".pv-scope .pv-step > span", { opacity: .82, duration: 10 }, 64)
        .to(".pv-launch .pv-step", { opacity: 1, y: 0, duration: 5 }, 67)
        .to(".pv-launch .pv-step > span", { opacity: 1, duration: 5 }, 67)
        .to(".pv-browser", { opacity: 1, y: 0, duration: 8 }, 67)
        .to(".pv-frame rect", { strokeDashoffset: 0, duration: 7, ease: "power1.inOut" }, 69)
        .to(".pv-chrome, .pv-nav", { opacity: 1, duration: 6, stagger: 1 }, 71)
        .to(".pv-live", { opacity: 1, duration: 5 }, 75)
        .to(".pv-site-kicker", { opacity: 1, duration: 5 }, 73)
        .to(".pv-site-hero > p", { opacity: 1, y: 0, duration: 7 }, 74)
        .to(".pv-site-link", { opacity: 1, duration: 5 }, 79)
        .to(".pv-sphere", { opacity: 1, scale: 1, duration: 9 }, 73)
        .to(".pv-projects > div", { opacity: 1, y: 0, duration: 6, stagger: 2 }, 80)
        .to(".pv-launch .pv-caption", { opacity: 1, y: 0, duration: 4 }, 91)
        .to(traveller, { opacity: 1, duration: 1 }, 93)
        .to(clock, { energy: 3, duration: 5, ease: "power1.inOut" }, 93)
        .to(".pv-terminus", { opacity: 1, duration: 3 }, 96)
        .to(traveller, { opacity: 0, duration: 1 }, 99);

      root.addEventListener("pv:geometry", measure);
      measure();
      let initialized = false;
      // Lenis already smooths the desktop wheel, while touch devices provide
      // native momentum. Binding the narrative directly avoids a second
      // animation loop that used to chase the scroll position and look laggy.
      ScrollTrigger.create({
        animation: timeline,
        trigger: root,
        start: "top 82%",
        end: "bottom 82%",
        scrub: true,
        onRefresh: (trigger) => {
          cancelAnimationFrame(refreshFrame);
          refreshFrame = requestAnimationFrame(() => {
            if (!initialized) {
              timeline.progress(trigger.progress);
              initialized = true;
            }
            render();
          });
        },
      });

      // Pointer transforms live on the parent nodes, never on scroll-animated
      // glass. This avoids competing tweens and keeps the spline anchored.
      const move: ((event: PointerEvent) => void) | null = desktop.matches ? (() => {
        const nodes = qa(".pv-node");
        const tilts = nodes.map((node) => ({
          x: gsap.quickTo(node, "rotationX", { duration: .85, ease: "power3.out" }),
          y: gsap.quickTo(node, "rotationY", { duration: .85, ease: "power3.out" }),
        }));
        gsap.set(nodes, { transformPerspective: 1400 });
        gsap.set(root, { "--pointer-reflection": 0 });
        const fieldX = gsap.quickTo(q(".pv-field"), "x", { duration: 1.2 });
        const fieldY = gsap.quickTo(q(".pv-field"), "y", { duration: 1.2 });
        const dustX = gsap.quickTo(q(".pv-dust"), "x", { duration: 1 });
        const dustY = gsap.quickTo(q(".pv-dust"), "y", { duration: 1 });
        const reflect = gsap.quickTo(root, "--pointer-reflection", { duration: .8 });
        let pointerFrame = 0;
        let pointerClientX = 0;
        let pointerClientY = 0;
        const applyPointer = () => {
          pointerFrame = 0;
          const rect = root.getBoundingClientRect();
          const x = (pointerClientX - rect.left) / rect.width * 2 - 1;
          const y = (pointerClientY - rect.top) / rect.height * 2 - 1;
          tilts.forEach((tilt, i) => { const max = i === 0 ? .5 : i === 1 ? 1.2 : 1; tilt.x(-y * max); tilt.y(x * max); });
          fieldX(x * 5); fieldY(y * 4); dustX(x * 9); dustY(y * 8); reflect(.35);
        };
        const reset = () => {
          cancelAnimationFrame(pointerFrame);
          pointerFrame = 0;
          tilts.forEach((tilt) => { tilt.x(0); tilt.y(0); });
          fieldX(0); fieldY(0); dustX(0); dustY(0); reflect(0);
        };
        root.addEventListener("pointerleave", reset);
        pointerCleanup = () => {
          cancelAnimationFrame(pointerFrame);
          root.removeEventListener("pointerleave", reset);
        };
        return (event: PointerEvent) => {
          if (!root.classList.contains("is-visible") || event.pointerType === "touch") return;
          pointerClientX = event.clientX;
          pointerClientY = event.clientY;
          if (!pointerFrame) pointerFrame = requestAnimationFrame(applyPointer);
        };
      })() : null;
      if (move) root.addEventListener("pointermove", move, { passive: true });
      cleanup = () => {
        cancelAnimationFrame(refreshFrame);
        root.removeEventListener("pv:geometry", measure);
        if (move) root.removeEventListener("pointermove", move);
        pointerCleanup();
      };
    }, root);
  };
  let pointerCleanup = () => {};
  configure();
  reduced.addEventListener("change", configure);
  desktop.addEventListener("change", configure);
  window.addEventListener("rb:calmchange", configure);
  return () => {
    cleanup(); context?.revert();
    reduced.removeEventListener("change", configure);
    desktop.removeEventListener("change", configure);
    window.removeEventListener("rb:calmchange", configure);
  };
}
