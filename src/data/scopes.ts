// ─────────────────────────────────────────────────────────────────────────────
//  scopes.ts — the seven things someone can buy, in one place.
//
//  Lived inside ProfilePage.astro, which meant the services page could not show
//  prices without restating them. Two pages now render the same picker from
//  this table: /services, where a visitor looking for what things cost actually
//  lands, and the Vienna profile page, which is the German local-search landing.
//
//  Ordered smallest first on purpose. `field` is the share of the lattice that
//  scope lights, so the picture behind the picker scales with the job.
//
//  NOTE (Rodion): the prices are starting prices, not quotes — the promise the
//  process scene makes is that the real number is fixed within a day, once the
//  scope is known. Change them in src/data/pricing.ts; this file only decides
//  which scope shows which one.
// ─────────────────────────────────────────────────────────────────────────────
import { formatPrice, type OfferId } from "./pricing";

export type ScopeLang = "en" | "de";
export interface Localized { en: string; de: string }

const copy = (en: string, de: string): Localized => ({ en, de });
const priceOf = (id: OfferId): Localized => ({ en: formatPrice(id, "en"), de: formatPrice(id, "de") });

export const pickScope = <T,>(value: { en: T; de: T }, lang: ScopeLang): T => value[lang];

export interface Scope {
  id: string;
  label: Localized;
  size: Localized;
  time: Localized;
  /** Share of the lattice this scope lights, 0–1. */
  field: number;
  price?: Localized;
  /** One line naming what the client ends up with. The compact picker on the
   *  profile page shows this instead of the full deliverables list — enough to
   *  make the choice mean something, not enough to be a second services page. */
  outcome: Localized;
  gets: Localized[];
  needs: Localized;
  proof?: { text: Localized; href: Localized | string };
}

export const scopes: Scope[] = [
  {
    id: "landing",
    price: priceOf("landing"),
    outcome: copy("One focused page, live and measurable.", "Eine fokussierte Seite, live und messbar."),
    label: copy("Landing page", "Landingpage"),
    size: copy("One page, one action", "Eine Seite, eine Handlung"),
    time: copy("2–4 days", "2–4 Tage"),
    field: 0.09,
    gets: [
      copy("One page written around a single action — call, booking or form", "Eine Seite rund um eine einzige Handlung — Anruf, Buchung oder Formular"),
      copy("Form or booking wired to your inbox, with spam handling", "Formular oder Buchung an Ihr Postfach angebunden, inklusive Spam-Schutz"),
      copy("Analytics and conversion tracking installed and verified", "Analytics und Conversion-Tracking eingerichtet und geprüft"),
      copy("Hosting, domain and certificate set up in your own accounts", "Hosting, Domain und Zertifikat in Ihren eigenen Konten eingerichtet"),
    ],
    needs: copy("Your text and images, or an hour on a call for me to write them.", "Ihre Texte und Bilder — oder eine Stunde Gespräch, damit ich sie schreibe."),
  },
  {
    id: "site",
    price: priceOf("site"),
    outcome: copy("A site that ranks for your own name and stays yours.", "Eine Website, die für Ihren Namen rankt — und Ihnen gehört."),
    label: copy("Business website", "Unternehmens-Website"),
    size: copy("5–10 pages", "5–10 Seiten"),
    time: copy("About a week", "Etwa eine Woche"),
    field: 0.24,
    gets: [
      copy("5–10 pages, structured so each one can rank on its own", "5–10 Seiten, so strukturiert, dass jede einzeln ranken kann"),
      copy("German and English, without a second site to maintain", "Deutsch und Englisch, ohne eine zweite Website zu pflegen"),
      copy("On-page SEO, sitemap and Search Console handed over working", "On-Page-SEO, Sitemap und Search Console funktionsfähig übergeben"),
      copy("Editable yourself where you need it — no monthly builder fee", "Selbst editierbar, wo Sie es brauchen — keine monatliche Baukasten-Gebühr"),
    ],
    needs: copy("Finished content, or a list of what the site has to say.", "Fertige Inhalte — oder eine Liste dessen, was die Website sagen soll."),
    proof: { text: copy("What that looks like", "Wie das aussieht"), href: copy("/en/website-development-vienna/", "/de/website-erstellen-wien/") },
  },
  // The film. It is here because the site was selling six web products while
  // three finished 3D films sat in the archive with no way to order one — so
  // anyone who wanted the thing had to guess whether it was even on offer.
  {
    id: "film",
    price: priceOf("film"),
    outcome: copy("A film of the thing, before the thing exists.", "Ein Film der Sache, bevor es die Sache gibt."),
    label: copy("3D film or animation", "3D-Film oder Animation"),
    size: copy("Product, interior or explainer", "Produkt, Interieur oder Erklärvideo"),
    time: copy("1–2 weeks", "1–2 Wochen"),
    field: 0.33,
    gets: [
      copy("Modelled, lit and rendered in Cinema 4D and Redshift — from drawings, CAD or photographs", "Modelliert, ausgeleuchtet und gerendert in Cinema 4D und Redshift — aus Zeichnungen, CAD oder Fotos"),
      copy("Cut, graded and titled in After Effects and Premiere, sound assembled", "Geschnitten, gegradet und betitelt in After Effects und Premiere, Ton montiert"),
      copy("A master plus the cuts the destination needs — web loop, 9:16, 1:1", "Ein Master plus die Fassungen, die das Ziel braucht — Web-Loop, 9:16, 1:1"),
      copy("Encoded and built into the page, if the page is one of mine", "Encodiert und in die Seite eingebaut, wenn die Seite von mir ist"),
    ],
    needs: copy("What it has to show, plus any drawings, CAD or photographs. If none exist, dimensions are enough to start.", "Was gezeigt werden soll — dazu Zeichnungen, CAD-Daten oder Fotos. Wenn es nichts davon gibt, reichen Maße für den Start."),
    proof: { text: copy("Films and 3D work", "Filme und 3D-Arbeiten"), href: copy("/en/3d-animation-video-vienna/", "/de/3d-animation-video-wien/") },
  },
  {
    id: "shop",
    price: priceOf("shop"),
    outcome: copy("A checkout that works on a phone, VAT included.", "Ein Checkout, der am Handy funktioniert — USt inklusive."),
    label: copy("Online shop", "Online-Shop"),
    size: copy("Catalogue and checkout", "Katalog und Checkout"),
    time: copy("2–3 weeks", "2–3 Wochen"),
    field: 0.42,
    gets: [
      copy("Product catalogue, cart and a checkout that works on a phone", "Produktkatalog, Warenkorb und ein Checkout, der auf dem Handy funktioniert"),
      copy("Payment, Austrian VAT and shipping rules configured", "Zahlung, österreichische USt und Versandregeln konfiguriert"),
      copy("Order and dispatch emails, plus a stock view you can run", "Bestell- und Versandmails, dazu eine Bestandsansicht, die Sie selbst bedienen"),
      copy("Product pages built to be found, not just to be browsed", "Produktseiten, die gefunden werden — nicht nur durchgeblättert"),
    ],
    needs: copy("Your products, prices and shipping rules. I will tell you honestly if a hosted platform is the better buy for your case.", "Ihre Produkte, Preise und Versandregeln. Ich sage Ihnen ehrlich, wenn eine gehostete Plattform für Ihren Fall die bessere Wahl ist."),
  },
  {
    id: "seo",
    price: priceOf("seo"),
    outcome: copy("The fixes made, not a PDF listing them.", "Die Fixes umgesetzt — kein PDF, das sie auflistet."),
    label: copy("SEO & content", "SEO & Content"),
    size: copy("On a site that already exists", "Für eine bestehende Website"),
    time: copy("First findings in 2 weeks", "Erste Ergebnisse in 2 Wochen"),
    field: 0.58,
    gets: [
      copy("Technical crawl, then the fixes actually made — not a PDF of them", "Technischer Crawl, dann die Fixes tatsächlich umgesetzt — kein PDF davon"),
      copy("Content plan built from what people in your market search for", "Content-Plan auf Basis dessen, wonach Ihr Markt tatsächlich sucht"),
      copy("Indexing, Core Web Vitals and rankings tracked over time", "Indexierung, Core Web Vitals und Rankings laufend verfolgt"),
      copy("Reporting you can read without a marketing degree", "Reporting, das Sie ohne Marketing-Abschluss lesen können"),
    ],
    needs: copy("Access to the site, Search Console and analytics.", "Zugang zur Website, zur Search Console und zu Analytics."),
    proof: { text: copy("+780% organic search — Bridge Consult", "+780 % organische Suche — Bridge Consult"), href: "/work/bridge-consult" },
  },
  {
    id: "platform",
    price: priceOf("platform"),
    outcome: copy("A system your team can still run in year two.", "Ein System, das Ihr Team auch im zweiten Jahr bedient."),
    label: copy("Web app or platform", "Web-App oder Plattform"),
    size: copy("Live data, accounts, admin", "Live-Daten, Accounts, Verwaltung"),
    time: copy("From 4 weeks", "Ab 4 Wochen"),
    field: 0.78,
    gets: [
      copy("A data model that survives the second year, not just the launch", "Ein Datenmodell, das auch das zweite Jahr überlebt — nicht nur den Launch"),
      copy("Admin, roles and an editing workflow your team can actually run", "Verwaltung, Rollen und ein Redaktions-Workflow, den Ihr Team wirklich bedient"),
      copy("Integrations and scheduled jobs against live sources", "Integrationen und geplante Jobs gegen echte Datenquellen"),
      copy("Multi-language handled in the routing, not bolted on afterwards", "Mehrsprachigkeit im Routing gelöst, nicht nachträglich angeflanscht"),
    ],
    needs: copy("A conversation about what the thing has to do before anyone writes code.", "Ein Gespräch darüber, was das System leisten muss, bevor irgendjemand Code schreibt."),
    proof: { text: copy("429 pages, 3 languages, 2 981 tenders — FIDIC.uz", "429 Seiten, 3 Sprachen, 2 981 Ausschreibungen — FIDIC.uz"), href: "/work/fidic" },
  },
  {
    id: "showreel",
    price: priceOf("showreel"),
    outcome: copy("Real-time 3D that a mid-range phone survives.", "Echtzeit-3D, das ein Mittelklasse-Handy aushält."),
    label: copy("Showreel-grade build", "Showreel-Niveau"),
    size: copy("3D, WebGL, custom motion", "3D, WebGL, eigene Motion"),
    time: copy("From 3 weeks", "Ab 3 Wochen"),
    field: 1,
    gets: [
      copy("Real-time 3D and hand-written shaders, not a stock template", "Echtzeit-3D und handgeschriebene Shader, kein Stock-Template"),
      copy("Motion designed as a system, so it holds together page to page", "Motion als System entworfen, damit es über Seiten hinweg zusammenhält"),
      copy("Every effect measured, and cut on devices where it costs more than it gives", "Jeder Effekt gemessen — und dort entfernt, wo er mehr kostet als er bringt"),
      copy("Fast on a mid-range phone, or it does not ship", "Schnell auf einem Mittelklasse-Handy, sonst geht es nicht live"),
    ],
    needs: copy("A reason for it. If the effect will not earn its weight, I will say so and build the simpler thing.", "Einen Grund dafür. Wenn der Effekt sein Gewicht nicht wert ist, sage ich das und baue die einfachere Variante."),
    proof: { text: copy("This site, taken apart", "Diese Website, auseinandergenommen"), href: "/work/studio" },
  },
];
