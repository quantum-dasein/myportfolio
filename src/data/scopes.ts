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
    // The one-page case, which is exactly this scope at full size. It was the
    // only row on the table with no piece of work behind it while a matching
    // case study sat two clicks away.
    proof: { text: copy("One page, eighteen modules — Bridge Consult Academy", "Eine Seite, achtzehn Module — Bridge Consult Academy"), href: "/work/academy/" },
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
  // Video starts with the ordinary job people actually ask for — one short or
  // reel cut from existing footage — and keeps the full 3D production as the
  // ceiling rather than making it look like the minimum engagement.
  {
    id: "film",
    price: priceOf("film"),
    outcome: copy("One finished video, cut for where people will watch it.", "Ein fertiges Video, geschnitten für den Ort, an dem es gesehen wird."),
    label: copy("Shorts, reels & video", "Shorts, Reels & Video"),
    size: copy("Editing, motion or full 3D", "Schnitt, Motion oder komplettes 3D"),
    time: copy("From 1 day", "Ab 1 Tag"),
    field: 0.33,
    gets: [
      copy("Clean editing from footage you already have — pacing, colour, sound and the parts that should be cut", "Sauberer Schnitt aus vorhandenem Material — Rhythmus, Farbe, Ton und alles, was raus muss"),
      copy("Captions, on-screen type and simple motion for a short, reel or paid social ad", "Untertitel, Typo und einfache Motion für Short, Reel oder Social Ad"),
      copy("The versions the channel needs — 9:16, 1:1, 16:9, web loop and a clean master", "Die Fassungen für den Kanal — 9:16, 1:1, 16:9, Web-Loop und sauberer Master"),
      copy("2D explainers or full Cinema 4D and Redshift production when the idea needs more", "2D-Erklärvideo oder komplette Cinema-4D- und Redshift-Produktion, wenn die Idee mehr braucht"),
    ],
    needs: copy("The footage or idea and where it will run. For 3D, drawings, CAD, photographs or dimensions are enough to start.", "Material oder Idee und der Zielkanal. Für 3D reichen Zeichnungen, CAD, Fotos oder Maße als Start."),
    proof: { text: copy("Video, motion and 3D work", "Video-, Motion- und 3D-Arbeiten"), href: copy("/en/3d-animation-video-vienna/", "/de/3d-animation-video-wien/") },
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
    proof: { text: copy("+780% organic search — Bridge Consult", "+780 % organische Suche — Bridge Consult"), href: "/work/bridge-consult/" },
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
    proof: { text: copy("429 pages, 3 languages, 2 900+ tenders — FIDIC.uz", "429 Seiten, 3 Sprachen, 2 900+ Ausschreibungen — FIDIC.uz"), href: "/work/fidic/" },
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
    proof: { text: copy("This site, taken apart", "Diese Website, auseinandergenommen"), href: "/work/studio/" },
  },
];
