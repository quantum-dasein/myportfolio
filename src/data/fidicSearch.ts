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
