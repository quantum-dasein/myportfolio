import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Reveal copy, not timeline rows: the career rail must never move away from
 * its nodes. Content is visible in SSR and when motion is switched off. */
export function setupProfileMotion(root: HTMLElement) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let context: gsap.Context | undefined;
  let removeFocus = () => {};
  const configure = () => {
    removeFocus();
    context?.revert();
    if (reduced.matches || document.documentElement.classList.contains("rb-calm")) return;
    context = gsap.context(() => {
      const groups = new Map<HTMLElement, HTMLElement[]>();
      root.querySelectorAll<HTMLElement>(".pf-rows li").forEach((row) => {
        groups.set(row, Array.from(row.querySelectorAll<HTMLElement>(".pf-period, h3, p")));
      });
      root.querySelectorAll<HTMLElement>(".pf-cards article, .pf-elsewhere").forEach((group) => {
        groups.set(group, Array.from(group.children) as HTMLElement[]);
      });
      const outro = root.querySelector<HTMLElement>(".pf-outro");
      if (outro) groups.set(outro, Array.from(outro.querySelectorAll<HTMLElement>(":scope > p, .pf-actions > a")));
      root.querySelectorAll<HTMLElement>("[data-reveal], .pf-idx, .pf-kicker").forEach((element) => {
        if (![...groups.keys()].some((group) => group === element || group.contains(element))) groups.set(element, [element]);
      });
      const animations: { trigger: HTMLElement; tween: gsap.core.Tween }[] = [];
      groups.forEach((targets, trigger) => {
        // A reload/deep link must not hide content already above the visitor.
        if (trigger.getBoundingClientRect().bottom < 0) return;
        const tween = gsap.fromTo(targets, { opacity: 0, y: 18 }, {
          opacity: 1, y: 0, duration: .85, ease: "power3.out", stagger: .09,
          scrollTrigger: { trigger, start: "top 89%", once: true },
        });
        animations.push({ trigger, tween });
      });
      const onFocus = (event: FocusEvent) => {
        if (!(event.target instanceof Element)) return;
        animations.forEach(({ trigger, tween }) => {
          if (trigger.contains(event.target as Element)) tween.progress(1);
        });
      };
      root.addEventListener("focusin", onFocus);
      removeFocus = () => root.removeEventListener("focusin", onFocus);
    }, root);
  };
  configure();
  reduced.addEventListener("change", configure);
  window.addEventListener("rb:calmchange", configure);
  const refresh = () => ScrollTrigger.refresh();
  document.fonts.ready.then(refresh);
  return () => {
    removeFocus(); context?.revert();
    reduced.removeEventListener("change", configure);
    window.removeEventListener("rb:calmchange", configure);
  };
}
