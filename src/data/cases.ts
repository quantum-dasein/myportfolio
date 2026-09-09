// ─────────────────────────────────────────────────────────────────────────────
//  cases.ts — what makes each case study its own page.
//
//  CaseStudy.astro used to branch on `isBridge` in sixteen places and carry both
//  projects' SEO copy, metrics and section labels inline. A third case could not
//  be added without editing the component, and adding a fourth would have meant
//  a second nested ternary everywhere. The template is now one shape and this
//  file is the difference between the pages: metadata, an optional measured
//  results block, and which bespoke chapters a case owns.
//
//  A case with none of the optional pieces still renders a complete page —
//  hero, facts, problem/solution/outcome, highlights, process, visual language,
//  next. That is the point: it is what lets a small project have a case study
//  without pretending to be a platform.
// ─────────────────────────────────────────────────────────────────────────────
export type CaseId = "bridge" | "fidic" | "academy";

export interface CaseMetric {
  value: string;
  /** i18n key for the label under the number. */
  key: string;
  /** Small print under the bar — the raw figure behind the percentage. */
  detail: string;
  /** How far the bar fills, as a CSS length. Relative weight, not a percentage
   *  of anything: the bars compare the metrics to each other. */
  fill: string;
}

export interface CaseImpact {
  /** Eyebrow above the heading — where these numbers come from. */
  source: string;
  /** The three i18n keys for heading, paragraph and the line under the bars. */
  titleKey: string;
  textKey: string;
  noteKey: string;
  /** Left and right captions on the proof line under the metrics. */
  proofLabel: string;
  proofTail: string;
  /** Only Bridge has a bespoke WebGL scene behind its numbers. */
  scene?: "bridge";
  metrics: CaseMetric[];
}

export interface CaseConfig {
  id: CaseId;
  /** Path segment under /work/. */
  slug: string;
  image: string;
  stack: string;
  year: string;
  liveUrl?: string;
  nextHref: string;
  /** Corner label inside the hero screen, e.g. "BC / 01". */
  screenIndex: string;
  /** Names printed on the visual-language specimen. */
  specimen: { name: string; moduleB: string; moduleC: string };
  seo: { title: string; description: string; keywords: string[]; about: string[] };
  impact?: CaseImpact;
  /** The long-form chapters that only the two platform cases have. */
  chapters?: Partial<Record<"systemMap" | "buildSystem" | "platform" | "data" | "runtime" | "perf", true>>;
  /** The bespoke WebGL departure and return, and there are exactly two of them:
   *  one drawn for Bridge Consult and one for FIDIC. A case without this uses
   *  the ordinary page transition every other page on the site uses. It must
   *  never fall back to one of the two — borrowing Bridge's animation for a
   *  different project is what this field exists to prevent. */
  warp?: "bridge" | "fidic";
}

export const cases: Record<CaseId, CaseConfig> = {
  bridge: {
    id: "bridge",
    slug: "bridge-consult",
    image: "/cases/rodion-belousov-bridge-consult-ai-assisted-web-development-case-study.webp",
    stack: "Astro / Three.js / GSAP",
    year: "2026",
    liveUrl: "https://www.bridgeconsult.uz/EN/index.html",
    nextHref: "/work/fidic",
    screenIndex: "BC / 01",
    specimen: { name: "BRIDGE CONSULT", moduleB: "NOIR GLASS", moduleC: "CHROME SIGNAL" },
    seo: {
      title: "Bridge Consult Case Study | SEO & Astro by Rodion Belousov",
      description:
        "How Rodion Belousov built Bridge Consult's multilingual Astro and Three.js website, technical SEO system and 780% organic search growth.",
      keywords: [
        "Bridge Consult case study",
        "Astro case study",
        "Three.js website",
        "technical SEO Austria",
        "multilingual website development",
        "AI-assisted web development",
      ],
      about: ["Infrastructure consulting", "Technical SEO", "Astro", "Three.js", "Multilingual content"],
    },
    impact: {
      source: "GA4 / EARLY LAUNCH SIGNAL",
      titleKey: "case.bridge.impact.title",
      textKey: "case.bridge.impact.text",
      noteKey: "case.bridge.impact.note",
      proofLabel: "GA4 / VERIFIED LAUNCH WINDOW",
      proofTail: "BASELINE -> WEEK 03",
      scene: "bridge",
      metrics: [
        { value: "+780%", key: "case.bridge.metric.organic", detail: "5 -> 44", fill: "100%" },
        { value: "+626.67%", key: "case.bridge.metric.users", detail: "109", fill: "82%" },
        { value: "+645.69%", key: "case.bridge.metric.events", detail: "865", fill: "88%" },
        { value: "04", key: "case.bridge.metric.markets", detail: "UZ / US / AT / PL", fill: "64%" },
      ],
    },
    chapters: { systemMap: true, buildSystem: true },
    warp: "bridge",
  },

  fidic: {
    id: "fidic",
    slug: "fidic",
    image: "/cases/rodion-belousov-fidic-uz-contract-knowledge-platform-design.webp",
    stack: "Astro / MDX / Serverless",
    year: "2026",
    liveUrl: "https://fidic.uz",
    nextHref: "/work/academy",
    screenIndex: "FIDIC / 02",
    specimen: { name: "FIDIC.UZ", moduleB: "CONTRACT ATLAS", moduleC: "FIDIC GOLD" },
    seo: {
      title: "FIDIC.uz Case Study | Content, SEO & Astro by Rodion Belousov",
      description:
        "Inside Rodion Belousov's solo build of FIDIC.uz: 429 static pages, 117 expert articles, 16 contract tools and a self-refreshing World Bank tender archive.",
      keywords: [
        "FIDIC knowledge platform",
        "FIDIC SEO",
        "Astro content platform",
        "technical SEO case study",
        "multilingual content architecture",
        "contract management tools",
        "World Bank tender data pipeline",
      ],
      about: [
        "FIDIC contracts",
        "Knowledge management",
        "Technical SEO",
        "Astro",
        "Content architecture",
        "Data pipelines",
      ],
    },
    chapters: { platform: true, data: true, runtime: true, perf: true },
    warp: "fidic",
  },

  // The small one, and the reason the template had to be generalised. Two case
  // studies about 429-page platforms tell a business that needs five pages it is
  // the wrong size of client. This is the same craft at one page, and the
  // numbers on it are the ones that matter at that size: how little it ships.
  academy: {
    id: "academy",
    slug: "academy",
    image: "/cases/rodion-belousov-bridge-consult-academy-one-page-course-landing.webp",
    stack: "Astro / CSS",
    year: "2026",
    liveUrl: "https://www.bridgeconsult.uz/academy/",
    nextHref: "/work/bridge-consult",
    screenIndex: "ACADEMY / 03",
    specimen: { name: "BRIDGE ACADEMY", moduleB: "EDITORIAL SERIF", moduleC: "DESERT LIGHT" },
    seo: {
      title: "One-page course landing | Bridge Consult Academy by Rodion Belousov",
      description:
        "A single-page course landing in three languages with eighteen modules, built in Astro and shipped with no third-party JavaScript at all. The small end of the same practice.",
      keywords: [
        "one page website case study",
        "landing page development Vienna",
        "Astro landing page",
        "multilingual landing page",
        "course landing page",
        "fast website no javascript",
      ],
      about: ["Landing page design", "Astro", "Multilingual content", "Web performance", "Editorial typography"],
    },
    impact: {
      source: "MEASURED ON THE LIVE PAGE",
      titleKey: "case.academy.impact.title",
      textKey: "case.academy.impact.text",
      noteKey: "case.academy.impact.note",
      proofLabel: "LIVE / bridgeconsult.uz/academy",
      proofTail: "ONE PAGE",
      metrics: [
        { value: "00", key: "case.academy.metric.scripts", detail: "NO THIRD-PARTY JS", fill: "100%" },
        { value: "18", key: "case.academy.metric.modules", detail: "ON ONE PAGE", fill: "76%" },
        { value: "03", key: "case.academy.metric.languages", detail: "RU / EN / UZ", fill: "58%" },
        { value: "13", key: "case.academy.metric.sections", detail: "SCROLL CHAPTERS", fill: "66%" },
      ],
    },
  },
};
