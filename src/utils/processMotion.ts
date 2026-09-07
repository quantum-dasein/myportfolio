import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** One reversible scroll narrative. Layout and path measurement stay independent
 * of animated transforms, so resizing midway never changes the composition. */
export function setupProcessMotion(root: HTMLElement) {
  const q = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const qa = (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector));
  const ink = q(".pv-type-ink");
  const message = ink.textContent || "";
  const letters = Array.from(message);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = matchMedia("(min-width: 1041px) and (pointer: fine)");
  let context: gsap.Context | undefined;
  let cleanup = () => {};

  const configure = () => {
    cleanup();
    context?.revert();
    root.classList.remove("is-sequenced", "is-complete");
    ink.textContent = message;
    if (reduced.matches || document.documentElement.classList.contains("rb-calm")) {
      root.dataset.motionProgress = "1";
      return;
    }

    context = gsap.context(() => {
      root.classList.add("is-sequenced");
      const clock = { typed: 0, energy: 0, end: 0 };
      const path = q<SVGPathElement>(".pv-filament");
      const traveller = q<SVGCircleElement>(".pv-traveller");
      const strands = qa("[data-flow-strand]");
      const fronts = qa(".pv-front-strand");
      let length = 1;
      let scopeStop = .4;
      let launchStop = .85;
      let lastCount = -1;
      let lastProgress = -1;
      let refreshFrame = 0;
      const drawEnergy = () => {
        const phase = clock.energy;
        const progress = phase <= 1 ? phase * scopeStop
          : phase <= 2 ? scopeStop + (phase - 1) * (launchStop - scopeStop)
          : launchStop + (phase - 2) * (1 - launchStop);
        const point = path.getPointAtLength(Math.min(1, Math.max(0, progress)) * length);
        traveller.setAttribute("cx", String(point.x));
        traveller.setAttribute("cy", String(point.y));
        strands.forEach((strand) => { strand.style.strokeDashoffset = String(1000 * (1 - progress)); });
        fronts.forEach((strand) => { strand.style.strokeDashoffset = String(1000 * (1 - Math.min(1, Math.max(0, phase - 1)))); });
      };
      const measure = () => {
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
      gsap.set(strands.concat(fronts), { strokeDasharray: "1000", strokeDashoffset: 1000 });
      gsap.set(".pv-step", { opacity: 0, y: 14 });
      gsap.set(".pv-step > span", { opacity: .4 });
      gsap.set(".pv-caption", { opacity: 0, y: 8 });
      gsap.set(".pv-message", { opacity: .08, scale: .96 });
      gsap.set(".pv-sheet", { opacity: .08, y: 10, scale: .975 });
      gsap.set(".pv-browser", { opacity: .06, y: 8 });
      gsap.set(".pv-row", { opacity: .55, y: 6 });
      gsap.set(".pv-row-copy i", { scaleX: 0 });
      gsap.set(".pv-row-icon", { opacity: .4 });
      gsap.set(".pv-check-ring, .pv-check-mark", { strokeDashoffset: 1 });
      gsap.set(".pv-frame rect", { strokeDashoffset: 1 });
      gsap.set(".pv-chrome, .pv-nav, .pv-live, .pv-site-kicker, .pv-site-hero > p, .pv-site-link, .pv-sphere, .pv-projects > div, .pv-terminus", { opacity: 0 });
      gsap.set(".pv-projects > div", { y: 10 });
      gsap.set(".pv-site-hero > p", { y: 9, clipPath: "inset(0 0 100% 0)" });
      gsap.set(".pv-sphere", { scale: .92 });

      ink.textContent = "";
      const render = () => {
          const count = Math.round(clock.typed);
          if (lastCount !== count) { ink.textContent = letters.slice(0, count).join(""); lastCount = count; }
          drawEnergy();
          const progress = timeline.progress();
          root.classList.toggle("is-complete", progress > .985);
          const rounded = Math.round(progress * 1000) / 1000;
          if (rounded !== lastProgress) { root.dataset.motionProgress = String(rounded); lastProgress = rounded; }
      };
      const timeline = gsap.timeline({ paused: true, defaults: { ease: "power2.out" }, onUpdate: render });
      timeline.to(clock, { end: 1, duration: 100, ease: "none" }, 0)
        .to(".pv-write .pv-step", { opacity: 1, y: 0, duration: 5 }, 0)
        .to(".pv-write .pv-step > span", { opacity: 1, duration: 6 }, 0)
        .to(".pv-message", { opacity: 1, scale: 1, duration: 7 }, 2)
        .set(".pv-type-ink", { "--caret": 1 }, 5)
        .to(clock, { typed: letters.length, duration: 10, ease: `steps(${letters.length})` }, 5)
        .to(".pv-type-ink", { "--caret": 0, duration: .5, repeat: 3, yoyo: true }, 15)
        .set(".pv-type-ink", { "--caret": 0 }, 18)
        .to(".pv-send", { scale: .94, boxShadow: "0 0 20px #d5e6ff66", duration: 1.5 }, 17)
        .to(".pv-send svg", { x: 2.5, y: -1.5, duration: 2 }, 17)
        .to(".pv-send", { scale: 1, duration: 2.5 }, 18.5)
        .fromTo(".pv-shockwave", { scale: 1, opacity: .6 }, { scale: 2.1, opacity: 0, duration: 5, immediateRender: false }, 18)
        .to(".pv-write .pv-caption", { opacity: 1, y: 0, duration: 5 }, 17)
        .to(traveller, { opacity: 1, duration: 1 }, 19)
        .to(clock, { energy: 1, duration: 9, ease: "power1.inOut" }, 19)
        .to(traveller, { opacity: 0, duration: 2 }, 27)
        .to(".pv-write .pv-step > span", { opacity: .45, duration: 5 }, 26)
        .to(".pv-scope .pv-step", { opacity: 1, y: 0, duration: 5 }, 25)
        .to(".pv-scope .pv-step > span", { opacity: 1, duration: 5 }, 25)
        .to(".pv-sheet", { opacity: 1, scale: 1, y: 0, duration: 7 }, 27)
        .fromTo(".pv-sheet", { "--reflection": .1, "--light-x": "0%" }, { "--reflection": .9, "--light-x": "100%", duration: 8, immediateRender: false }, 27);

      qa(".pv-row").forEach((row, index) => {
        const at = 33 + index * 8;
        timeline.to(row, { opacity: 1, y: 0, duration: 4 }, at)
          .fromTo(row, { "--row-sheen": "-110%" }, { "--row-sheen": "110%", duration: 6, immediateRender: false }, at)
          .to(row.querySelectorAll(".pv-row-copy i"), { scaleX: 1, duration: 3.5, stagger: .6 }, at + 1)
          .to(row.querySelector(".pv-row-icon"), { opacity: 1, duration: 3 }, at + 2)
          .to(row.querySelector(".pv-check-ring"), { strokeDashoffset: 0, duration: 2, ease: "none" }, at + 3)
          .to(row.querySelector(".pv-check-mark"), { strokeDashoffset: 0, duration: 1.5, ease: "none" }, at + 5);
      });
      timeline.to(".pv-sheet", { "--reflection": .25, duration: 3 }, 55)
        .to(".pv-sheet", { "--reflection": 1, duration: 2, repeat: 1, yoyo: true }, 58)
        .to(".pv-scope .pv-caption", { opacity: 1, y: 0, duration: 4 }, 56)
        .to(traveller, { opacity: 1, duration: 1 }, 61)
        .to(clock, { energy: 2, duration: 9, ease: "power1.inOut" }, 61)
        .to(traveller, { opacity: 0, duration: 2 }, 69)
        .to(".pv-scope .pv-step > span", { opacity: .5, duration: 6 }, 64)
        .to(".pv-launch .pv-step", { opacity: 1, y: 0, duration: 5 }, 67)
        .to(".pv-launch .pv-step > span", { opacity: 1, duration: 5 }, 67)
        .to(".pv-browser", { opacity: 1, y: 0, duration: 6 }, 69)
        .to(".pv-frame rect", { strokeDashoffset: 0, duration: 7, ease: "power1.inOut" }, 69)
        .to(".pv-chrome, .pv-nav", { opacity: 1, duration: 3, stagger: 1 }, 73)
        .to(".pv-live", { opacity: 1, duration: 2 }, 77)
        .to(".pv-site-kicker", { opacity: 1, duration: 3 }, 78)
        .to(".pv-site-hero > p", { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: 5 }, 79)
        .to(".pv-site-link", { opacity: 1, duration: 3 }, 82)
        .to(".pv-sphere", { opacity: 1, scale: 1, duration: 8 }, 81)
        .to(".pv-projects > div", { opacity: 1, y: 0, duration: 4, stagger: 2 }, 85)
        .to(".pv-launch .pv-caption", { opacity: 1, y: 0, duration: 4 }, 91)
        .to(traveller, { opacity: 1, duration: 1 }, 93)
        .to(clock, { energy: 3, duration: 5, ease: "power1.inOut" }, 93)
        .to(".pv-terminus", { opacity: 1, duration: 3 }, 96)
        .to(traveller, { opacity: 0, duration: 1 }, 99);

      root.addEventListener("pv:geometry", measure);
      measure();
      // Attach only after all steps exist. A restored/deep-linked scroll can
      // otherwise render an empty timeline at its end before typing is added.
      ScrollTrigger.create({
        animation: timeline, trigger: root, start: "top 82%", end: "bottom 82%", scrub: .55,
        // Refresh restores visual tweens with callbacks suppressed. Synchronise
        // the typed text and SVG traveller after that restored render as well.
        onRefresh: () => { cancelAnimationFrame(refreshFrame); refreshFrame = requestAnimationFrame(render); },
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
        gsap.set(root, { "--pointer-x": "0%", "--pointer-y": "0%", "--pointer-reflection": 0 });
        const fieldX = gsap.quickTo(q(".pv-field"), "x", { duration: 1.2 });
        const fieldY = gsap.quickTo(q(".pv-field"), "y", { duration: 1.2 });
        const dustX = gsap.quickTo(q(".pv-dust"), "x", { duration: 1 });
        const dustY = gsap.quickTo(q(".pv-dust"), "y", { duration: 1 });
        const reflect = gsap.quickTo(root, "--pointer-reflection", { duration: .8 });
        const glintX = gsap.quickTo(root, "--pointer-x", { duration: .9 });
        const glintY = gsap.quickTo(root, "--pointer-y", { duration: .9 });
        const reset = () => {
          tilts.forEach((tilt) => { tilt.x(0); tilt.y(0); });
          fieldX(0); fieldY(0); dustX(0); dustY(0); reflect(0); glintX(0); glintY(0);
        };
        root.addEventListener("pointerleave", reset);
        pointerCleanup = () => root.removeEventListener("pointerleave", reset);
        return (event: PointerEvent) => {
          if (!root.classList.contains("is-visible") || event.pointerType === "touch") return;
          const rect = root.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width * 2 - 1;
          const y = (event.clientY - rect.top) / rect.height * 2 - 1;
          tilts.forEach((tilt, i) => { const max = i === 1 ? 2.5 : 2; tilt.x(-y * max); tilt.y(x * max); });
          fieldX(x * 5); fieldY(y * 4); dustX(x * 9); dustY(y * 8); reflect(.5); glintX(x * 18); glintY(y * 16);
        };
      })() : null;
      if (move) root.addEventListener("pointermove", move, { passive: true });
      cleanup = () => {
        cancelAnimationFrame(refreshFrame);
        root.removeEventListener("pv:geometry", measure);
        if (move) root.removeEventListener("pointermove", move);
        pointerCleanup();
        ink.textContent = message;
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
