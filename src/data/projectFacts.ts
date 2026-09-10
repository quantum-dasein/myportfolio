// ─────────────────────────────────────────────────────────────────────────────
//  projectFacts.ts — the numbers this site claims about its own projects.
//
//  These figures are quoted in running prose across three languages, a dozen
//  pages and two schema graphs, so they cannot all be interpolated from here
//  without turning every sentence into a template. This file is the declaration
//  instead: one place to check which value is correct before writing a number.
//
//  It is needed because drift is silent. The FIDIC teaser on /services said
//  "109 routes and 105 expert articles" while every other mention on the site
//  said 429 pages and 117 articles — an early draft nobody updated, and nothing
//  could catch it, because both numbers look plausible on their own page.
//
//  `retired` is the enforced half: `scripts/audit-facts.mjs` fails the build if
//  any of these strings comes back. Each one is a mistake this site made.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectFact {
  /** The number, exactly as it should be written in English prose. */
  value: string;
  /** The same number in German prose, where the separator differs. */
  de?: string;
  /** Where this figure comes from, so the next person can re-derive it rather
   *  than trust it. */
  note: string;
}

export const projectFacts: Record<string, ProjectFact> = {
  fidicPages: {
    value: "429",
    note: "FIDIC.uz — built pages in the platform.",
  },
  fidicArticles: {
    value: "117",
    note: "FIDIC.uz — expert articles across three languages.",
  },
  fidicTools: {
    value: "16",
    note: "FIDIC.uz — contract tools and calculators.",
  },
  fidicClauses: {
    value: "27",
    note: "FIDIC.uz — dissected clauses. Verified against the current public repository README.",
  },
  fidicGlossaryTerms: {
    value: "26",
    note: "FIDIC.uz — glossary terms. Verified against the current public repository README.",
  },
  fidicTenders: {
    value: "2 900+",
    note: "FIDIC.uz — tender records. The pipeline adds to it every morning, so the site says 2 900+ rather than a figure that is wrong by the afternoon.",
  },
  fidicImpressions: {
    value: "17 380",
    de: "17.380",
    note: "FIDIC.uz — Google impressions, 19 Jun – 8 Sep 2026 (82 days). Search Console export, committed at src/data/fidicSearch.ts.",
  },
  fidicClicks: {
    value: "414",
    note: "FIDIC.uz — Google clicks over the same 82 days. CTR 2.4%, average position 9.6.",
  },
  fidicSearchCountries: {
    value: "78",
    note: "FIDIC.uz — countries that produced at least one click. 181 produced at least one impression.",
  },
  bridgeOrganic: {
    value: "+780%",
    note: "Bridge Consult — organic sessions in the first launch window, 5 to 44.",
  },
  academyModules: {
    value: "18",
    note: "Bridge Consult Academy — programme modules on one page.",
  },
  languages: {
    value: "3",
    note: "RU / EN / UZ on both Bridge Consult projects.",
  },
};

/** Strings that must never appear again. Each one was wrong or went stale. */
export const retired: Array<{ text: string; why: string }> = [
  { text: "109 routes", why: "An early FIDIC draft. The platform has 429 pages." },
  { text: "109 Routen", why: "Same, in German." },
  { text: "105 expert articles", why: "An early FIDIC draft. There are 117." },
  { text: "105 Fachartikel", why: "Same, in German." },
  { text: "28 dissected clauses", why: "The current FIDIC.uz repository documents 27." },
  { text: "28 dissected FIDIC clauses", why: "The current FIDIC.uz repository documents 27." },
  { text: "28 aufgeschlüsselte Klauseln", why: "The current FIDIC.uz repository documents 27." },
  { text: "28 aufgeschlüsselte FIDIC-Klauseln", why: "The current FIDIC.uz repository documents 27." },
  { text: "25 glossary terms", why: "The current FIDIC.uz repository documents 26." },
  { text: "25 Glossarbegriffe", why: "The current FIDIC.uz repository documents 26." },
  { text: "Three disciplines", why: "The section lists four." },
  { text: "Drei Disziplinen", why: "Same, in German." },
  { text: "Four disciplines", why: "Video is now a fifth standalone service." },
  { text: "Vier Disziplinen", why: "Same, in German." },
  { text: "one of the three", why: "There are four disciplines." },
  { text: "einer der drei", why: "Same, in German." },
  { text: "Five scenes", why: "Six systems are listed, and two of them are not scenes." },
  { text: "Fünf Szenen", why: "Same, in German." },
  { text: "landing page in three days", why: "The scope picker says 2–4 days." },
  { text: "Landingpage in drei Tagen", why: "Same, in German." },
  { text: "Both live projects", why: "There are three case studies now." },
  { text: "Beide Live-Projekte", why: "Same, in German." },
  { text: "invisible to Google", why: "Google does index text PDFs. The argument is a different one." },
  { text: "für Google unsichtbar", why: "Same, in German." },
  { text: "2 981", why: "A daily-growing archive written as a fixed number. The site says 2 900+." },
  { text: "2.981", why: "Same, in German." },
  { text: "2,981", why: "Same, with a comma." },
  { text: "25 production routes", why: "The build has 36. The audit counts them now." },
  { text: "11 interactive archive sectors", why: "The archive holds 12 works. The number is counted from works.ts now." },
  { text: "11 interaktive Archiv-Sektoren", why: "Same, in German." },
  { text: "Six sizes of job", why: "The scope picker has seven; the film was added." },
  { text: "Sechs Projektgrößen", why: "Same, in German." },
  { text: "SIX PROJECT SIZES", why: "Same, on the social card." },
  { text: "may inform, not advertise", why: "Broader than §53 Ärztegesetz actually says." },
  { text: "dürfen informieren, nicht werben", why: "Same, in German." },
];
