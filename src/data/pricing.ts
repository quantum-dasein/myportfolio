// ─────────────────────────────────────────────────────────────────────────────
//  pricing.ts — the starting prices, in one place.
//
//  Two things read these: the scope picker on the profile page, which shows
//  them, and the ProfessionalService offer catalogue in the Layout's schema,
//  which tells search engines the same numbers. Structured data that disagrees
//  with the visible page is worse than none at all, so neither side owns the
//  values — this file does.
//
//  They are starting prices, not quotes. The promise made everywhere else on
//  the site is that the real number is fixed within a day, once scope is known.
//  They sit deliberately under a Vienna agency (3–8k for a small business site)
//  and under a mid-level local freelancer.
// ─────────────────────────────────────────────────────────────────────────────
export type OfferId = "landing" | "site" | "shop" | "seo" | "platform" | "showreel";

export interface Offer {
  /** Starting price in euro, excluding VAT. */
  from: number;
  /** A recurring offer is priced per month rather than per project. */
  monthly?: true;
}

export const pricing: Record<OfferId, Offer> = {
  landing: { from: 690 },
  site: { from: 1490 },
  shop: { from: 2900 },
  seo: { from: 490, monthly: true },
  platform: { from: 4900 },
  showreel: { from: 3900 },
};

/** German writes 1.490 € and English €1,490 — the number is the same either
 *  way, so the separator and the symbol's side are all that differ. */
export function formatPrice(id: OfferId, lang: "en" | "de"): string {
  const { from, monthly } = pricing[id];
  const digits = new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-US").format(from);
  const amount = lang === "de" ? `${digits} €` : `€${digits}`;
  if (!monthly) return amount;
  return lang === "de" ? `${amount} / Monat` : `${amount} / month`;
}
