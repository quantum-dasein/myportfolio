// ─────────────────────────────────────────────────────────────────────────────
//  fidicSearch.ts — what fidic.uz did in Google, exported from Search Console.
//
//  Every other number on this site is a count of something built: pages,
//  articles, tools. This is the first one that is a result, and results are the
//  claim a visitor has least reason to believe — so it is kept whole rather
//  than summarised. The daily series below is the export, unedited, and the
//  chart on the case page draws it. Anyone can check the shape against the
//  numbers, and the numbers against the source line.
//
//  Honest about the window: Search Console labels this range "last 6 months",
//  but the property only has data from 19 June 2026, so it is 82 days, and the
//  site says 82 days. A young property that did this in twelve weeks is the
//  more interesting fact anyway.
//
//  What is NOT in it: there was no advertising, no social distribution and no
//  link buying on this project. Search is the only channel it has ever had.
// ─────────────────────────────────────────────────────────────────────────────

/** [date, clicks, impressions] — one row per day, exactly as exported. */
export type SearchDay = [string, number, number];

export const fidicSearchDays: SearchDay[] = [
  ["2026-06-19", 0, 0],
  ["2026-06-20", 3, 8],
  ["2026-06-21", 1, 113],
  ["2026-06-22", 3, 49],
  ["2026-06-23", 3, 56],
  ["2026-06-24", 3, 37],
  ["2026-06-25", 1, 31],
  ["2026-06-26", 2, 34],
  ["2026-06-27", 1, 24],
  ["2026-06-28", 1, 33],
  ["2026-06-29", 2, 43],
  ["2026-06-30", 1, 33],
  ["2026-07-01", 0, 28],
  ["2026-07-02", 1, 41],
  ["2026-07-03", 2, 29],
  ["2026-07-04", 3, 46],
  ["2026-07-05", 2, 45],
  ["2026-07-06", 3, 36],
  ["2026-07-07", 2, 41],
  ["2026-07-08", 4, 81],
  ["2026-07-09", 1, 47],
  ["2026-07-10", 1, 47],
  ["2026-07-11", 1, 26],
  ["2026-07-12", 0, 30],
  ["2026-07-13", 2, 41],
  ["2026-07-14", 3, 43],
  ["2026-07-15", 1, 45],
  ["2026-07-16", 0, 29],
  ["2026-07-17", 0, 23],
  ["2026-07-18", 1, 5],
  ["2026-07-19", 0, 19],
  ["2026-07-20", 1, 21],
  ["2026-07-21", 1, 23],
  ["2026-07-22", 4, 43],
  ["2026-07-23", 1, 19],
  ["2026-07-24", 1, 25],
  ["2026-07-25", 1, 16],
  ["2026-07-26", 2, 36],
  ["2026-07-27", 1, 94],
  ["2026-07-28", 5, 52],
  ["2026-07-29", 2, 70],
  ["2026-07-30", 4, 88],
  ["2026-07-31", 3, 100],
  ["2026-08-01", 4, 74],
  ["2026-08-02", 8, 150],
  ["2026-08-03", 9, 331],
  ["2026-08-04", 13, 347],
  ["2026-08-05", 17, 440],
  ["2026-08-06", 8, 416],
  ["2026-08-07", 10, 321],
  ["2026-08-08", 3, 198],
  ["2026-08-09", 13, 350],
  ["2026-08-10", 10, 706],
  ["2026-08-11", 13, 625],
  ["2026-08-12", 14, 581],
  ["2026-08-13", 10, 502],
  ["2026-08-14", 12, 445],
  ["2026-08-15", 11, 279],
  ["2026-08-16", 6, 583],
  ["2026-08-17", 11, 591],
  ["2026-08-18", 9, 537],
  ["2026-08-19", 11, 489],
  ["2026-08-20", 12, 433],
  ["2026-08-21", 8, 302],
  ["2026-08-22", 3, 292],
  ["2026-08-23", 4, 442],
  ["2026-08-24", 6, 460],
  ["2026-08-25", 9, 386],
  ["2026-08-26", 15, 432],
  ["2026-08-27", 13, 421],
  ["2026-08-28", 6, 345],
  ["2026-08-29", 3, 196],
  ["2026-08-30", 4, 376],
  ["2026-08-31", 9, 396],
  ["2026-09-01", 8, 451],
  ["2026-09-02", 19, 520],
  ["2026-09-03", 9, 386],
  ["2026-09-04", 9, 288],
  ["2026-09-05", 0, 743],
  ["2026-09-06", 3, 204],
  ["2026-09-07", 4, 298],
  ["2026-09-08", 4, 294],
];

/** The summary Search Console shows above the chart, for the same range. */
export const fidicSearch = {
  source: "Google Search Console",
  property: "fidic.uz",
  from: "2026-06-19",
  to: "2026-09-08",
  days: 82,
  clicks: 414,
  impressions: 17380,
  /** Percent, as Search Console rounds it. */
  ctr: 2.4,
  /** Average position across every impression in the range. */
  position: 9.6,
  /** Distinct pages that earned at least one impression, and of those, the
   *  ones that earned at least one click. */
  pagesWithImpressions: 354,
  pagesWithClicks: 118,
  /** Countries with at least one impression, and with at least one click. */
  countries: 181,
  countriesWithClicks: 78,
  /** The last 30 days against the 30 before them — the growth is still steep,
   *  which is worth saying plainly rather than implying a plateau. */
  last30: { clicks: 255, impressions: 13003 },
  previous30: { clicks: 119, impressions: 3475 },
} as const;

/** Queries this ranks for. Generic terms in a niche of a few thousand
 *  specialists worldwide — "daab" and "eot" are FIDIC contract vocabulary, not
 *  long-tail phrases invented to be winnable. */
export const fidicQueries = [
  { term: "fidic", impressions: 200, position: 8.1 },
  { term: "daab", impressions: 208, position: 5.8 },
  { term: "фидик", impressions: 33, position: 5.7 },
  { term: "eot", impressions: 144, position: 5.8 },
  { term: "daab fidic", impressions: 52, position: 7.5 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
//  Copy, in both languages, built from the numbers above.
//
//  The case page renders in English and swaps language in the browser, so every
//  string in the block needs a dictionary key — otherwise a German visitor gets
//  a German page with one English chart in the middle of it. The strings are
//  assembled here rather than typed into src/i18n/ui.ts so that a number never
//  exists in two places: change the export above and the sentences follow.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  de: ["Jän", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"],
} as const;

/** "8 Sep" / "8. Sep" — the day and month of an ISO date, in either language. */
export const fidicDate = (iso: string, lang: "en" | "de") => {
  const [, month, day] = iso.split("-");
  const name = MONTHS[lang][Number(month) - 1];
  return lang === "de" ? `${Number(day)}. ${name}` : `${Number(day)} ${name}`;
};

const fidicNum = (value: number, lang: "en" | "de") => value.toLocaleString(lang === "de" ? "de-DE" : "en-US");

const impMax = Math.max(...fidicSearchDays.map((d) => d[2]));
const clickMax = Math.max(...fidicSearchDays.map((d) => d[1]));
const peakIndex = fidicSearchDays.reduce((best, day, i) => (day[1] > fidicSearchDays[best][1] ? i : best), 0);
const peakDay = fidicSearchDays[peakIndex];
const midDay = fidicSearchDays[Math.floor(fidicSearchDays.length / 2)][0];

/** The one day the chart marks, and where on the chart it sits. Exported so the
 *  component does not recompute the maximum it is already labelling. */
export const fidicSearchPeak = { index: peakIndex, clicks: peakDay[1], date: peakDay[0], impMax, clickMax } as const;

const copy = (lang: "en" | "de") => {
  const n = (value: number) => fidicNum(value, lang);
  const d = (iso: string) => fidicDate(iso, lang);
  const en = lang === "en";
  return {
    "search.source": `${fidicSearch.source} · ${fidicSearch.property} · ${d(fidicSearch.from)} – ${d(fidicSearch.to)} 2026`,
    "search.headline": en
      ? "Eighty-two days of search, and nothing else."
      : "Zweiundachtzig Tage Suche — und sonst nichts.",
    "search.lede": en
      ? "No advertising, no social posts, no bought links. Every visit below arrived because a page answered a question someone typed into Google — in a field with a few thousand specialists in it worldwide."
      : "Keine Werbung, keine Social-Posts, keine gekauften Links. Jeder Besuch unten kam, weil eine Seite eine Frage beantwortet hat, die jemand bei Google eingetippt hat — in einem Feld mit weltweit wenigen tausend Fachleuten.",
    "search.alt": en
      ? `Daily Google search impressions and clicks for ${fidicSearch.property} between ${fidicSearch.from} and ${fidicSearch.to}: ${n(fidicSearch.impressions)} impressions and ${n(fidicSearch.clicks)} clicks in total.`
      : `Tägliche Google-Impressionen und -Klicks für ${fidicSearch.property} zwischen ${fidicSearch.from} und ${fidicSearch.to}: insgesamt ${n(fidicSearch.impressions)} Impressionen und ${n(fidicSearch.clicks)} Klicks.`,
    "search.scale.from": d(fidicSearch.from),
    "search.scale.mid": d(midDay),
    "search.scale.to": d(fidicSearch.to),
    "search.key.impressions": en ? `Impressions · peak ${n(impMax)}` : `Impressionen · Spitze ${n(impMax)}`,
    "search.key.clicks": en ? `Clicks · peak ${n(clickMax)}` : `Klicks · Spitze ${n(clickMax)}`,
    "search.peak": en
      ? `${peakDay[1]} clicks · ${d(peakDay[0])}`
      : `${peakDay[1]} Klicks · ${d(peakDay[0])}`,
    "search.fig.impressions.v": n(fidicSearch.impressions),
    "search.fig.impressions": en ? "search impressions" : "Impressionen in der Suche",
    "search.fig.clicks.v": n(fidicSearch.clicks),
    "search.fig.clicks": en ? "clicks" : "Klicks",
    "search.fig.pages.v": n(fidicSearch.pagesWithClicks),
    "search.fig.pages": en ? "pages that earned a click" : "Seiten mit mindestens einem Klick",
    "search.fig.countries.v": n(fidicSearch.countriesWithClicks),
    "search.fig.countries": en ? "countries" : "Länder",
    "search.growth": en
      ? `Still climbing: ${n(fidicSearch.last30.impressions)} impressions in the last thirty days against ${n(fidicSearch.previous30.impressions)} in the thirty before them.`
      : `Weiter steigend: ${n(fidicSearch.last30.impressions)} Impressionen in den letzten dreißig Tagen gegenüber ${n(fidicSearch.previous30.impressions)} in den dreißig davor.`,
    "search.queries": en ? "Ranking for" : "Rankt für",
  };
};

export const fidicSearchCopy = { en: copy("en"), de: copy("de") };
