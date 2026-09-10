import { works } from "./works";
import { projectFacts } from "./projectFacts";

export type SeoLang = "en" | "de";
export type ServiceKey =
  | "websites"
  | "digital-marketing"
  | "technical-seo"
  | "creative-development"
  // The film half of the practice. It existed as nine works in a WebGL gallery
  // and a stack name in a lead paragraph, and nowhere in the service layer —
  // which left the whole site reading as "web developer", a description that
  // fits ten thousand people in this city and describes half the offer.
  | "motion"
  // Niche pages. A Vienna business does not search for "website development" —
  // it searches for "Website Arztpraxis Wien". These are children of `websites`,
  // not a fifth practice area, and each one is written around the constraints
  // that trade actually has. If two of them could swap a noun and still read
  // correctly, they are doorway pages and should be deleted instead.
  | "arztpraxis"
  | "restaurant"
  | "handwerker";
export type InsightKey = "bridge-growth" | "fidic-platform" | "threejs-marketing" | "ai-development";

export interface LocalizedCopy {
  en: string;
  de: string;
}

export interface ServiceContent {
  key: ServiceKey;
  paths: Record<SeoLang, string>;
  title: LocalizedCopy;
  description: LocalizedCopy;
  eyebrow: LocalizedCopy;
  lead: LocalizedCopy;
  capabilities: Array<{ title: LocalizedCopy; text: LocalizedCopy }>;
  proof: Array<{
    value: string;
    label: LocalizedCopy;
    /** Where the figure comes from, or the raw pair behind a percentage. A
     *  number with no provenance is a poster, not evidence. */
    note?: LocalizedCopy;
  }>;
  /** One line under the metric row naming the source and the window. */
  proofNote?: LocalizedCopy;
  /** What the numbers under the proof heading really are. "evidence" means they
   *  came out of a real client launch; "standard" means they are how the work is
   *  built — a one-second LCP measured on this site, zero plugins, one tap to a
   *  phone number. Calling the second kind "evidence from real launches" was a
   *  claim the rows could not back: no doctor's or restaurant's launch produced
   *  them. "production" is the third case: work that was made rather than
   *  launched — films and animation, where "launch" is the wrong noun.
   *  Defaults to "standard", so a new page has to earn a stronger word. */
  proofKind?: "evidence" | "standard" | "production";
  /** Ids from src/data/works.ts to show as playable films. A page that sells
   *  film and shows none of it is the exact weakness these pages are accused
   *  of: text describing work the reader is asked to take on trust. */
  reel?: string[];
  /** Which case studies to show as further reading. A landing-page-sized page
   *  leads with the landing-page case rather than a 429-page platform. */
  cases?: Array<"bridge" | "fidic" | "academy">;
  faq: Array<{ question: LocalizedCopy; answer: LocalizedCopy }>;
  /** Pages worth reading next. Rendered as a link list and, more to the point,
   *  what ties the niche pages to their parent in both directions. */
  siblings?: ServiceKey[];
  /** Which row of the scope table this page is selling. These pages are the
   *  ones that rank, and every one of them ended without a price or a way to
   *  ask for one — the reader had to find the hub, then find their own scope
   *  in it. Naming it here puts the number on the page and carries the choice
   *  into both the picker and the contact form. */
  scope?: "landing" | "site" | "film" | "shop" | "seo" | "platform" | "showreel";
}

const c = (en: string, de: string): LocalizedCopy => ({ en, de });

export const serviceContent: Record<ServiceKey, ServiceContent> = {
  // Deliberately first. The premium tracks below describe work most of this
  // market does not buy — Vienna runs on straightforward business sites, built
  // quickly. Leading with only the interactive/3D offer reads as "not for
  // ordinary jobs" and turns away the majority of real demand. This is the same
  // craft at a smaller scope, and the German path targets the query people
  // actually type ("website erstellen wien") rather than an industry term.
  websites: {
    key: "websites",
    scope: "site",
    proofKind: "standard",
    cases: ["academy", "bridge"],
    paths: { en: "/en/website-development-vienna/", de: "/de/website-erstellen-wien/" },
    title: c("A business website, live in about a week.", "Eine Unternehmens-Website, in etwa einer Woche live."),
    description: c(
      "Fast, well-built business websites in Vienna: fixed scope, fixed price, live in about a week. Static builds that load quickly, need no plugins and belong to you.",
      "Schnelle, saubere Unternehmens-Websites in Wien: fester Umfang, fester Preis, in etwa einer Woche live. Statisch gebaut, schnell geladen, ohne Plugins — und sie gehört Ihnen.",
    ),
    // The eyebrow becomes the <title>, so it carries the phrase people search.
    eyebrow: c("Website Development / Vienna", "Website erstellen / Wien"),
    lead: c(
      "Most businesses do not need an award entry. They need a clear, fast site that says what they do, ranks for their own name and does not turn into a maintenance bill. Fixed scope, fixed price, agreed before anything starts.",
      "Die meisten Unternehmen brauchen keinen Award-Beitrag. Sie brauchen eine klare, schnelle Website, die sagt, was sie tun, für den eigenen Namen rankt und nicht zur Wartungsrechnung wird. Fester Umfang, fester Preis — vereinbart, bevor irgendetwas beginnt.",
    ),
    capabilities: [
      { title: c("One week, not one quarter", "Eine Woche, kein Quartal"), text: c("A three-to-six page business site typically goes live within a week of the content being ready. That is possible because the build is static and there is no CMS to configure, no theme to fight and no plugin stack to reconcile — the time goes into the pages themselves.", "Eine Unternehmens-Website mit drei bis sechs Seiten geht in der Regel innerhalb einer Woche live, sobald die Inhalte stehen. Möglich ist das, weil statisch gebaut wird: kein CMS zu konfigurieren, kein Theme zu bändigen, kein Plugin-Stack abzugleichen — die Zeit fließt in die Seiten selbst.") },
      { title: c("It is yours, not rented", "Sie gehört Ihnen, nicht gemietet"), text: c("A page builder charges monthly for the right to keep your own site online, and you leave the design behind if you ever move. This is plain HTML and CSS on your own domain. You can host it anywhere, hand it to any developer, and nothing stops working because a subscription lapsed.", "Ein Baukasten verlangt monatlich dafür, dass Ihre eigene Seite online bleiben darf — und beim Wechsel lassen Sie das Design zurück. Hier ist es schlichtes HTML und CSS auf Ihrer Domain. Sie können überall hosten, es jedem Entwickler übergeben, und nichts hört auf zu funktionieren, weil ein Abo ausläuft.") },
      { title: c("Fast because there is nothing to load", "Schnell, weil es nichts zu laden gibt"), text: c("No builder runtime, no jQuery, no cookie-banner script fighting a page-speed plugin. Pages are prebuilt and served as files, which is why they open immediately on a phone on mobile data — the case most template sites quietly fail.", "Keine Baukasten-Runtime, kein jQuery, kein Cookie-Banner-Skript im Streit mit einem Page-Speed-Plugin. Seiten sind vorgebaut und werden als Dateien ausgeliefert — deshalb öffnen sie sofort auf dem Telefon im Mobilfunknetz, dem Fall, an dem die meisten Template-Seiten still scheitern.") },
      { title: c("Findable from day one", "Ab Tag eins auffindbar"), text: c("Correct titles and descriptions, structured data, a real sitemap, German and English where you need both, and a Google Business Profile that matches the site. Local search is usually the whole game for a Vienna business, and it is included rather than sold as a second project.", "Korrekte Titles und Descriptions, strukturierte Daten, eine echte Sitemap, Deutsch und Englisch wo nötig, und ein Google-Unternehmensprofil, das zur Website passt. Lokale Suche ist für ein Wiener Unternehmen meist das ganze Spiel — sie ist enthalten und wird nicht als zweites Projekt verkauft.") },
      { title: c("Room to grow later", "Platz, später zu wachsen"), text: c("The same foundation carries a booking flow, a second language, a blog or an interactive product page when the business needs one. Starting simple does not mean starting over — the platforms in the case studies began exactly here.", "Dieselbe Grundlage trägt später einen Buchungsflow, eine zweite Sprache, einen Blog oder eine interaktive Produktseite. Einfach anzufangen heißt nicht, neu anfangen zu müssen — die Plattformen in den Case Studies haben genau hier begonnen.") },
    ],
    proof: [
      { value: "~1 week", label: c("from finished content to live site", "von fertigem Inhalt bis zur Live-Seite"), note: c("5–10 pages · from €1,190", "5–10 Seiten · ab 1.190 €") },
      { value: "1.0s", label: c("largest contentful paint, measured on this site", "Largest Contentful Paint, auf dieser Website gemessen"), note: c("static build, no CMS in the request path", "statischer Build, kein CMS im Request-Pfad") },
      { value: "0", label: c("plugins, licences or monthly builder fees", "Plugins, Lizenzen oder monatliche Baukastengebühren"), note: c("hosting and domain stay in your own accounts", "Hosting und Domain bleiben in Ihren eigenen Konten") },
    ],
    proofNote: c(
      "These describe how the work is built rather than what one client's launch returned: the timing is what a finished-content project takes, and the load time was measured on this site, which is the one build whose internals are public.",
      "Das beschreibt, wie hier gebaut wird — nicht, was der Launch eines bestimmten Kunden gebracht hat: Der Zeitrahmen gilt für ein Projekt mit fertigen Inhalten, und die Ladezeit wurde auf dieser Website gemessen, dem einen Build, dessen Innereien öffentlich sind.",
    ),
    faq: [
      { question: c("How much does a website cost?", "Was kostet eine Website?"), answer: c("A small business site is quoted as one fixed number before work starts, based on the number of pages and whether the text and photos already exist. No hourly surprises. Larger builds with booking, shops or a second language are quoted separately, and you always see the number first.", "Eine kleine Unternehmens-Website wird vor Beginn mit einer festen Zahl angeboten — abhängig von der Seitenzahl und davon, ob Texte und Fotos schon existieren. Keine Stundenüberraschungen. Größere Projekte mit Buchung, Shop oder zweiter Sprache werden separat kalkuliert, und Sie sehen immer zuerst die Zahl.") },
      { question: c("Why not just use Tilda, Wix or WordPress?", "Warum nicht einfach Tilda, Wix oder WordPress?"), answer: c("For a weekend project they are fine. For a business they have a running cost: a monthly fee to keep your own site online, a design you cannot take with you, and a page that carries the builder's JavaScript whether you use it or not. WordPress adds updates, plugin conflicts and a security surface. A static site removes all of that and is usually cheaper over two years.", "Für ein Wochenendprojekt sind sie in Ordnung. Für ein Unternehmen haben sie laufende Kosten: eine Monatsgebühr, damit die eigene Seite online bleibt, ein Design, das man nicht mitnehmen kann, und eine Seite, die das JavaScript des Baukastens mitschleppt. WordPress bringt Updates, Plugin-Konflikte und eine Angriffsfläche dazu. Eine statische Seite entfernt das alles und ist über zwei Jahre meist günstiger.") },
      { question: c("Can I edit the text myself afterwards?", "Kann ich die Texte danach selbst ändern?"), answer: c("Yes. Small edits are part of the handover and usually take minutes. If you expect to publish regularly — a blog, news, listings — say so up front and a simple editor gets built in, rather than bolting a CMS on afterwards.", "Ja. Kleine Änderungen gehören zur Übergabe und dauern meist Minuten. Wenn Sie regelmäßig veröffentlichen wollen — Blog, News, Angebote — sagen Sie es vorab, dann wird ein einfacher Editor eingebaut, statt nachträglich ein CMS anzuflanschen.") },
      { question: c("What do you need from me to start?", "Was brauchen Sie von mir für den Start?"), answer: c("What you do, who it is for, and any text and photos you already have. If the text does not exist yet, writing it is part of the job — that is the marketing half of this practice, and it is usually where a site actually gets won or lost.", "Was Sie tun, für wen, und alle vorhandenen Texte und Fotos. Wenn der Text noch nicht existiert, gehört das Schreiben dazu — das ist die Marketing-Hälfte dieser Arbeit und meist die Stelle, an der eine Website tatsächlich gewonnen oder verloren wird.") },
      { question: c("Do you work in German?", "Arbeiten Sie auf Deutsch?"), answer: c("German C2 and English C1, so the site can ship in either or both. A bilingual site is built properly here — real separate pages with the right language signals, not a flag icon that machine-translates the page.", "Deutsch C2 und Englisch C1 — die Website kann in einer oder beiden Sprachen erscheinen. Zweisprachig wird hier richtig gebaut: echte getrennte Seiten mit korrekten Sprachsignalen, nicht ein Flaggen-Icon, das die Seite maschinell übersetzt.") },
    ],
    siblings: ["arztpraxis", "restaurant", "handwerker"],
  },
  "digital-marketing": {
    key: "digital-marketing",
    scope: "site",
    proofKind: "evidence",
    cases: ["bridge", "fidic"],
    paths: { en: "/en/digital-marketing-vienna/", de: "/de/digital-marketing-wien/" },
    title: c("Digital Marketing in Vienna, built as one system.", "Digital Marketing in Wien, als ein System gebaut."),
    description: c(
      "Digital marketing strategy, content, SEO and web development in Vienna by Rodion Belousov. See real multilingual launches and measurable organic growth.",
      "Digital-Marketing-Strategie, Content, SEO und Webentwicklung in Wien von Rodion Belousov. Mit mehrsprachigen Launches und messbarem organischem Wachstum.",
    ),
    eyebrow: c("Digital Marketing / Vienna", "Digital Marketing / Wien"),
    lead: c(
      "I connect positioning, content architecture, search and implementation. The result is not a campaign that ends at the mockup, but a launch system that can be measured, maintained and expanded.",
      "Ich verbinde Positionierung, Content-Architektur, Search und Umsetzung. So entsteht keine Kampagne, die beim Mockup endet, sondern ein Launch-System, das messbar, wartbar und ausbaufähig ist.",
    ),
    capabilities: [
      { title: c("Positioning and research", "Positionierung und Research"), text: c("Market framing, audience logic and a clear editorial proposition, settled before anything becomes visual. For Bridge Consult that meant deciding the site did not need more pages — it needed one proposition an international decision-maker could verify in thirty seconds. Scope is the first and cheapest place to be wrong, and the only place a mistake is still free to fix.", "Marktrahmen, Zielgruppenlogik und ein klares redaktionelles Versprechen — geklärt, bevor irgendetwas visuell wird. Bei Bridge Consult hieß das: Die Website brauchte keine weiteren Seiten, sondern ein Versprechen, das ein internationaler Entscheider in dreißig Sekunden prüfen kann. Der Scope ist die erste und billigste Stelle, an der man falsch liegen kann.") },
      { title: c("Content architecture", "Content-Architektur"), text: c("Information architecture that survives growth: categories held as neutral keys and translated on output, articles typed against a schema so a missing field fails the build instead of the page. FIDIC.uz runs 117 expert articles across three languages on that model — adding a language does not mean touching a template.", "Informationsarchitektur, die Wachstum übersteht: Kategorien als neutrale Keys, erst bei der Ausgabe übersetzt; Artikel gegen ein Schema typisiert, sodass ein fehlendes Feld den Build bricht statt die Seite. FIDIC.uz trägt auf diesem Modell 117 Fachartikel in drei Sprachen — eine Sprache mehr bedeutet kein Template anzufassen.") },
      { title: c("Search as a system", "Search als System"), text: c("Crawlable routes, canonical rules, hreflang clusters and structured data designed in from the start rather than retrofitted. Thirty-two distinct schema.org types across the FIDIC platform, and a sitemap that carries priorities and change dates so a crawler can tell what actually moved.", "Crawlbare Routen, Canonical-Regeln, hreflang-Cluster und strukturierte Daten von Anfang an mitgedacht statt nachgerüstet. Zweiunddreißig verschiedene schema.org-Typen auf der FIDIC-Plattform und eine Sitemap mit Prioritäten und Änderungsdaten, damit ein Crawler erkennt, was sich wirklich bewegt hat.") },
      { title: c("Build and delivery", "Build und Auslieferung"), text: c("Astro static builds with a serverless layer only where something genuinely has to run at request time. No CMS to babysit, no plugin stack to patch, and a deploy that publishes in seconds — which is what makes iterating on copy and search cheap enough to actually do.", "Astro-Static-Builds mit einer serverlosen Ebene nur dort, wo wirklich etwas zur Laufzeit passieren muss. Kein CMS zu betreuen, kein Plugin-Stack zu flicken, ein Deploy in Sekunden — genau das macht das Nachschärfen von Copy und Search billig genug, um es tatsächlich zu tun.") },
      { title: c("Measurement and iteration", "Messung und Iteration"), text: c("Core Web Vitals collected from real visitors, split by device, plus Search Console exports read as a work list rather than a dashboard. Titles and descriptions get rewritten from query data, not from intuition — and the launch is where measurement starts, not where the project ends.", "Core Web Vitals von echten Besuchern, nach Gerät getrennt, dazu Search-Console-Exporte, gelesen als Arbeitsliste statt als Dashboard. Titles und Descriptions werden aus Query-Daten überarbeitet, nicht aus dem Bauch — und der Launch ist der Anfang der Messung, nicht das Ende des Projekts.") },
    ],
    proof: [
      { value: "+780%", label: c("organic-search sessions after the Bridge Consult launch", "Organic-Search-Sitzungen nach dem Bridge-Consult-Launch"), note: c("5 → 44 · first three weeks", "5 → 44 · erste drei Wochen") },
      { value: "429", label: c("static pages in the FIDIC knowledge platform", "statische Seiten in der FIDIC-Wissensplattform"), note: c("117 of them expert articles", "davon 117 Fachartikel") },
      { value: "RU / EN / UZ", label: c("multilingual content and routing system", "mehrsprachiges Content- und Routing-System"), note: c("one dictionary, no half-translated page", "ein Wörterbuch, keine halb übersetzte Seite") },
    ],
    proofNote: c(
      "The first figure is GA4 on the Bridge Consult property, comparing the three weeks after launch with the three before it — a small base, stated as a base rather than a trend. The other two are counts of what was built and are checkable on the live sites.",
      "Die erste Zahl stammt aus GA4 der Bridge-Consult-Property und vergleicht die drei Wochen nach dem Launch mit den drei davor — eine kleine Ausgangsbasis, die hier als Basis benannt und nicht als Trend verkauft wird. Die anderen beiden sind Auszählungen des Gebauten und auf den Live-Seiten überprüfbar.",
    ),
    faq: [
      { question: c("What does a digital marketing project include?", "Was umfasst ein Digital-Marketing-Projekt?"), answer: c("Depending on the goal: positioning and market research, content architecture, technical SEO, the website itself, analytics and the iteration after launch. The point of running them together is that they stop contradicting each other — the positioning survives contact with production, and the search structure survives the design.", "Je nach Ziel: Positionierung und Marktrecherche, Content-Architektur, Technical SEO, die Website selbst, Analytics und die Iteration nach dem Launch. Der Sinn, das zusammen zu führen: Sie widersprechen sich nicht mehr — die Positionierung übersteht die Produktion, die Search-Struktur übersteht das Design.") },
      { question: c("Do you also implement the website?", "Setzen Sie die Website auch technisch um?"), answer: c("Yes, and that is usually the point. Strategy that is handed to someone else to build tends to arrive diluted. I work in Astro, TypeScript, GSAP and Three.js, which means the decision about what a page has to say and the decision about how it loads are made by the same person.", "Ja, und genau darin liegt meist der Sinn. Strategie, die jemand anderes umsetzt, kommt verdünnt an. Ich arbeite mit Astro, TypeScript, GSAP und Three.js — die Entscheidung, was eine Seite sagen muss, und die Entscheidung, wie sie lädt, trifft dieselbe Person.") },
      { question: c("How long until it shows in search?", "Wie lange dauert es bis zur Sichtbarkeit in der Suche?"), answer: c("Indexing is Google's call and nobody can promise a date. What is controllable is everything before that: a crawlable structure, pages substantial enough to be worth indexing, a submitted sitemap and internal links that give new pages a path. On Bridge Consult the first measurable organic movement came inside the launch window; on a new domain it is realistically weeks, not days.", "Die Indexierung entscheidet Google, ein Datum kann niemand zusagen. Steuerbar ist alles davor: eine crawlbare Struktur, Seiten mit genug Substanz, um indexiert zu werden, eine eingereichte Sitemap und interne Links, die neuen Seiten einen Weg geben. Bei Bridge Consult kam die erste messbare organische Bewegung im Launch-Fenster; auf einer neuen Domain sind es realistisch Wochen, nicht Tage.") },
      { question: c("Do you work in German and English?", "Arbeiten Sie auf Deutsch und Englisch?"), answer: c("Both, and the multilingual part is built rather than bolted on. German C2, English C1, Russian native. On FIDIC.uz the interface lives in a single dictionary of 513 keys per language, so no component can lose a translation and no page can quietly ship half-localised.", "Beides, und der mehrsprachige Teil ist gebaut statt angeklebt. Deutsch C2, Englisch C1, Russisch Muttersprache. Auf FIDIC.uz liegt das Interface in einem einzigen Wörterbuch mit 513 Keys pro Sprache — so kann keine Komponente eine Übersetzung verlieren und keine Seite halb lokalisiert live gehen.") },
      { question: c("Do you work with existing sites?", "Arbeiten Sie auch an bestehenden Websites?"), answer: c("Often, and it usually starts with a measurement rather than a redesign. A crawl plus a Search Console export tends to name the real problem quickly — thin pages that were never worth indexing, a canonical pointing somewhere unintended, or a home page shipping megabytes nobody asked for. Rebuilding is a decision made after that, not before.", "Häufig, und es beginnt meist mit einer Messung statt mit einem Redesign. Ein Crawl plus ein Search-Console-Export benennt das eigentliche Problem schnell — dünne Seiten, die nie indexierungswürdig waren, ein Canonical, das woanders hinzeigt, oder eine Startseite, die Megabytes ausliefert, die niemand angefordert hat. Neu bauen ist eine Entscheidung danach, nicht davor.") },
    ],
  },
  "technical-seo": {
    key: "technical-seo",
    scope: "seo",
    proofKind: "evidence",
    cases: ["bridge", "fidic"],
    paths: { en: "/en/technical-seo-vienna/", de: "/de/technical-seo-wien/" },
    title: c("Technical SEO in Vienna for sites that need to scale.", "Technical SEO in Wien für Websites, die skalieren müssen."),
    description: c(
      "Technical SEO in Vienna: crawlable Astro architecture, multilingual hreflang, schema, sitemaps, performance and content systems backed by real case studies.",
      "Technical SEO in Wien: crawlbare Astro-Architektur, mehrsprachiges hreflang, Schema, Sitemaps, Performance und Content-Systeme mit echten Case Studies.",
    ),
    eyebrow: c("Technical SEO / Vienna", "Technical SEO / Wien"),
    lead: c(
      "Search visibility starts in the architecture. I combine crawlable server-rendered pages, clean language routing, structured data and editorial systems so design ambition does not become an indexing problem.",
      "Sichtbarkeit beginnt in der Architektur. Ich verbinde crawlbare serverseitige Seiten, sauberes Sprachrouting, strukturierte Daten und redaktionelle Systeme, damit gestalterischer Anspruch nicht zum Indexierungsproblem wird.",
    ),
    capabilities: [
      { title: c("Crawlable architecture", "Crawlbare Architektur"), text: c("Routes that resolve without redirect chains, a trailing-slash policy applied once so no URL exists in two forms, and a sitemap generated from the build rather than maintained by hand. On FIDIC.uz that is 429 static pages a crawler can reach without guessing.", "Routen ohne Redirect-Ketten, eine einmal angewandte Trailing-Slash-Regel, damit keine URL in zwei Formen existiert, und eine Sitemap, die aus dem Build entsteht statt von Hand gepflegt zu werden. Auf FIDIC.uz sind das 429 statische Seiten, die ein Crawler ohne Raten erreicht.") },
      { title: c("Multilingual signals", "Mehrsprachige Signale"), text: c("Complete hreflang clusters and a canonical on every page, with the deliberate exceptions documented rather than accidental — a Georgian landing page on FIDIC.uz is kept out of the three-language cluster on purpose, so it cannot send search engines a contradictory signal about which version serves whom.", "Vollständige hreflang-Cluster und ein Canonical auf jeder Seite, mit dokumentierten statt zufälligen Ausnahmen — eine georgische Landingpage auf FIDIC.uz bleibt bewusst außerhalb des Drei-Sprachen-Clusters, damit sie Suchmaschinen kein widersprüchliches Signal darüber sendet, welche Version wem dient.") },
      { title: c("Structured data", "Strukturierte Daten"), text: c("Schema that describes what the page actually is: Article, TechArticle, FAQPage, DefinedTerm, Course, EducationalOccupationalCredential, Dataset and twenty-five more across the FIDIC platform. Entities are closed off against Wikidata so an organisation resolves to one thing rather than a name a search engine has to disambiguate.", "Schema, das beschreibt, was die Seite wirklich ist: Article, TechArticle, FAQPage, DefinedTerm, Course, EducationalOccupationalCredential, Dataset und fünfundzwanzig weitere auf der FIDIC-Plattform. Entitäten werden gegen Wikidata geschlossen, damit eine Organisation eindeutig auflöst statt ein Name zu bleiben, den eine Suchmaschine erst zuordnen muss.") },
      { title: c("Performance budgets", "Performance-Budgets"), text: c("Core Web Vitals treated as a constraint on the design, not a report after it — a budget agreed before the first component, and measured on real devices rather than a laptop. Regressions are found the same way: this site publishes every one it has had, with the number that caught it.", "Core Web Vitals als Randbedingung des Designs, nicht als Bericht danach — ein Budget, das vor der ersten Komponente feststeht und auf echten Geräten gemessen wird, nicht auf einem Laptop. Regressionen werden genauso gefunden: Diese Website veröffentlicht jede einzelne, mit der Zahl, die sie aufgedeckt hat.") },
      { title: c("Indexing and diagnosis", "Indexierung und Diagnose"), text: c("Reading Search Console as a work list. \"Discovered — currently not indexed\" is not a submission problem and resubmitting will not clear it; it means Google looked and declined, which is a content and authority question. Naming which of the two is actually wrong is most of the job.", "Die Search Console als Arbeitsliste lesen. \"Gefunden — zurzeit nicht indexiert\" ist kein Einreichungsproblem, und erneutes Einreichen löst es nicht; es heißt, Google hat hingesehen und abgelehnt — eine Frage von Inhalt und Autorität. Zu benennen, welches von beiden tatsächlich fehlt, ist der größte Teil der Arbeit.") },
    ],
    proof: [
      { value: "+780%", label: c("organic-search growth in the early Bridge launch window", "Organic-Search-Wachstum im frühen Bridge-Launch-Fenster"), note: c("5 → 44 sessions · GA4", "5 → 44 Sitzungen · GA4") },
      { value: "117", label: c("expert articles structured for the FIDIC platform", "für die FIDIC-Plattform strukturierte Fachartikel"), note: c("inside 429 built pages", "innerhalb von 429 gebauten Seiten") },
      { value: "3", label: c("languages with explicit routing and search signals", "Sprachen mit explizitem Routing und Search-Signalen"), note: c("hreflang clusters, not a translate widget", "hreflang-Cluster, kein Übersetzungs-Widget") },
    ],
    proofNote: c(
      "The growth figure is GA4 on a small base in a launch window, which is what it is called here rather than a trend. The counts are of pages and articles that exist and can be opened.",
      "Die Wachstumszahl kommt aus GA4, auf kleiner Basis in einem Launch-Fenster — und wird hier genau so genannt, nicht als Trend. Die Auszählungen betreffen Seiten und Artikel, die existieren und sich öffnen lassen.",
    ),
    faq: [
      { question: c("What does technical SEO actually change?", "Was verändert Technical SEO konkret?"), answer: c("It removes the reasons a search engine cannot or will not use a page: broken canonicals, redirect chains, duplicate URLs, missing structured data, pages too slow to be worth ranking. It does not create demand for content nobody wants — it makes sure content people do want is reachable, understood and fast.", "Es beseitigt die Gründe, aus denen eine Suchmaschine eine Seite nicht nutzen kann oder will: kaputte Canonicals, Redirect-Ketten, doppelte URLs, fehlende strukturierte Daten, zu langsame Seiten. Es erzeugt keine Nachfrage nach Inhalten, die niemand sucht — es sorgt dafür, dass gesuchte Inhalte erreichbar, verständlich und schnell sind.") },
      { question: c("My pages are \"discovered but not indexed\". What now?", "Meine Seiten sind \"gefunden, zurzeit nicht indexiert\". Was jetzt?"), answer: c("Do not resubmit them. That status means Google already found the URLs — discovery is not the bottleneck — crawled or assessed them, and decided they were not worth the index. In practice it is almost always thin pages: a couple of hundred words of generic copy that a million other sites also have. The fix is substance and internal linking, not another submission.", "Nicht erneut einreichen. Der Status heißt, dass Google die URLs bereits gefunden hat — Discovery ist nicht der Engpass —, sie geprüft und als nicht indexierungswürdig eingestuft hat. In der Praxis sind es fast immer dünne Seiten: ein paar hundert Wörter generischer Text, den eine Million andere Seiten auch haben. Die Lösung ist Substanz und interne Verlinkung, nicht eine weitere Einreichung.") },
      { question: c("Does a Three.js site rank?", "Kann eine Three.js-Website ranken?"), answer: c("Yes, if the meaning lives in HTML and the WebGL is an enhancement on top. Every claim on this site is server-rendered text; the 3D layer loads after paint and is skipped entirely on Save-Data and low-memory devices. A canvas that is the only place content exists is the version that does not rank.", "Ja, wenn die Bedeutung im HTML liegt und WebGL nur eine Ergänzung darüber ist. Jede Aussage auf dieser Website ist serverseitig gerenderter Text; die 3D-Ebene lädt nach dem Paint und entfällt bei Save-Data und speicherarmen Geräten ganz. Nicht rankt die Variante, in der das Canvas der einzige Ort ist, an dem Inhalt existiert.") },
      { question: c("How do you handle German and English versions?", "Wie handhaben Sie deutsche und englische Versionen?"), answer: c("Only genuinely localised content earns its own URL. Interface strings swap in place from a dictionary, so there is no duplicate homepage at a locale root — which is exactly the trap that once stranded visitors on this site with no way back. Where two real versions exist, they carry full hreflang and a canonical each.", "Nur echt lokalisierte Inhalte bekommen eine eigene URL. Interface-Strings werden aus einem Wörterbuch getauscht, es gibt also keine doppelte Startseite unter einem Locale-Root — genau die Falle, die auf dieser Website einmal Besucher ohne Rückweg stranden ließ. Wo zwei echte Versionen existieren, tragen sie vollständiges hreflang und je ein Canonical.") },
      { question: c("What do you need to start?", "Was brauchen Sie für den Start?"), answer: c("Search Console access and the site itself. A crawl plus the coverage and query exports usually names the real problem within an hour — and it is frequently not the one that was expected. The output is a prioritised list with the measurement next to each item, not a hundred-page audit.", "Search-Console-Zugang und die Website selbst. Ein Crawl plus die Abdeckungs- und Query-Exporte benennen das eigentliche Problem meist innerhalb einer Stunde — und es ist oft nicht das erwartete. Das Ergebnis ist eine priorisierte Liste mit der Messung neben jedem Punkt, kein hundertseitiges Audit.") },
    ],
  },
  "creative-development": {
    key: "creative-development",
    scope: "showreel",
    proofKind: "standard",
    cases: ["bridge", "fidic"],
    reel: ["lake-como-interior-film"],
    paths: { en: "/en/creative-development-vienna/", de: "/de/creative-development-wien/" },
    title: c("Creative development that still loads fast.", "Creative Development, das trotzdem schnell lädt."),
    description: c(
      "Creative development in Vienna: bespoke WebGL, hand-written GLSL and motion built in Astro, Three.js and GSAP — and measured on a mid-range phone before it ships.",
      "Creative Development in Wien: eigene WebGL-Szenen, handgeschriebenes GLSL und Motion in Astro, Three.js und GSAP — vor dem Launch auf einem Mittelklasse-Handy gemessen.",
    ),
    eyebrow: c("Creative Development / Vienna", "Creative Development / Wien"),
    lead: c(
      "The bespoke WebGL on this site — the object in the hero, an archive you fly through, two case openings drawn for their own projects — while the page you are reading still hits a one-second LCP. That is the discipline: motion that argues for the brand, cut the moment it costs more than it returns.",
      "Die eigenen WebGL-Szenen auf dieser Website — das Objekt im Hero, ein Archiv, durch das Sie fliegen, zwei Case-Öffnungen, für ihr jeweiliges Projekt gezeichnet — während die Seite, die Sie gerade lesen, trotzdem einen LCP von einer Sekunde erreicht. Das ist die Disziplin: Motion, die für die Marke argumentiert — und die fliegt, sobald sie mehr kostet als sie bringt.",
    ),
    capabilities: [
      { title: c("Real-time and WebGL", "Real-time und WebGL"), text: c("Three.js and hand-written GLSL where the subject genuinely benefits — a raymarched glass form behind the type, a bridge that assembles itself as its case study opens, a contract atlas that unfolds. Four scenes on FIDIC.uz, each loaded only on the page that uses it and only once the browser is idle.", "Three.js und handgeschriebenes GLSL dort, wo das Thema wirklich profitiert — eine raymarchte Glasform hinter der Typografie, eine Brücke, die sich beim Öffnen ihrer Case Study zusammensetzt, ein Vertragsatlas, der sich aufblättert. Vier Szenen auf FIDIC.uz, jede nur auf ihrer Seite geladen und erst, wenn der Browser Leerlauf hat.") },
      { title: c("Motion with a job", "Motion mit Aufgabe"), text: c("Camera movement that shows hierarchy, transitions that carry you between two states instead of interrupting them, scroll that is scrubbed rather than autoplayed past you. Anything decorative that cannot answer what it is for gets cut — which on this site meant most of the first draft.", "Kamerabewegung, die Hierarchie zeigt; Übergänge, die zwischen zwei Zuständen tragen, statt sie zu unterbrechen; Scroll, der gescrubbt wird statt an dir vorbeizulaufen. Was dekorativ ist und nicht beantworten kann, wofür es da ist, fliegt raus — auf dieser Website war das der größte Teil des ersten Entwurfs.") },
      { title: c("Performance as art direction", "Performance als Art Direction"), text: c("DPR caps, texture budgets, adaptive frame rates, pausing when the tab is hidden, and opting constrained devices out entirely — Save-Data, two gigabytes of memory or two cores get the CSS background instead. The aesthetic is shaped by these limits as much as by the materials.", "DPR-Caps, Texture-Budgets, adaptive Frameraten, Pause bei verborgenem Tab und ein vollständiger Opt-out für schwache Geräte — Save-Data, zwei Gigabyte Speicher oder zwei Kerne bekommen den CSS-Hintergrund. Die Ästhetik wird von diesen Grenzen genauso geprägt wie von den Materialien.") },
      { title: c("Accessible by default", "Zugänglich von Haus aus"), text: c("prefers-reduced-motion respected properly — which means slowing a thing down, not freezing it, because a paused object reads as a broken page. Content stays in the document, keyboard paths stay intact, and everything that reveals content lives outside the bundle so a failed script cannot hide the page.", "prefers-reduced-motion richtig umgesetzt — also verlangsamen statt einfrieren, denn ein angehaltenes Objekt liest sich als kaputte Seite. Inhalte bleiben im Dokument, Tastaturwege intakt, und alles, was Inhalte einblendet, liegt außerhalb des Bundles, damit ein fehlgeschlagenes Skript die Seite nicht verbergen kann.") },
      { title: c("Shipped, then maintained", "Ausgeliefert, dann gepflegt"), text: c("The interesting work starts after launch. This site keeps a public engineering log of what broke, how it was found and what it measured — including the changes that were measured and then thrown away. Read it before hiring anyone, including me.", "Die interessante Arbeit beginnt nach dem Launch. Diese Website führt ein öffentliches Engineering-Log darüber, was kaputtging, wie es gefunden wurde und was es gemessen hat — inklusive der Änderungen, die gemessen und dann verworfen wurden. Lesen Sie es, bevor Sie jemanden beauftragen, mich eingeschlossen.") },
    ],
    proof: [
      // Counted, not typed. It said 11 for as long as the archive had eleven
      // works in it; adding the Academy case made that a stale number nobody
      // would have caught, because it is plausible either way — which is the
      // whole failure mode this file's numbers are prone to.
      { value: String(works.length), label: c("interactive archive sectors", "interaktive Archiv-Sektoren"), note: c("three case portals and nine 3D works", "drei Case-Portale und neun 3D-Arbeiten") },
      { value: "60 FPS", label: c("target for motion and WebGL experiences", "Zielwert für Motion- und WebGL-Erlebnisse"), note: c("measured on a mid-range phone, not a workstation", "auf einem Mittelklasse-Handy gemessen, nicht auf einer Workstation") },
      { value: "~3 s", label: c("before the WebGL chunk starts downloading at all", "bis der WebGL-Chunk überhaupt zu laden beginnt"), note: c("well past the window that decides LCP", "weit nach dem Fenster, das den LCP entscheidet") },
    ],
    proofNote: c(
      "These are measurements of this site, not of a client launch — it is the one build whose internals can be opened and checked, which is why the engineering log is public. The 3D layer here is deliberately the last thing to load and the first thing a weak device is excused from.",
      "Das sind Messungen dieser Website, nicht eines Kunden-Launches — es ist der eine Build, dessen Innereien sich öffnen und prüfen lassen, weshalb das Engineering-Log öffentlich ist. Die 3D-Ebene lädt hier bewusst zuletzt und ist das Erste, worauf ein schwaches Gerät verzichten darf.",
    ),
    faq: [
      { question: c("Does 3D hurt performance and SEO?", "Schadet 3D der Performance und dem SEO?"), answer: c("It does when it is the only place content exists, or when it loads before the page is readable. Handled properly it costs almost nothing at first paint: the meaning is server-rendered HTML, the 3D layer arrives after, and constrained devices skip it entirely. Measured on this site, the WebGL chunk starts downloading about three seconds in — well past the window that decides LCP.", "Ja, wenn es der einzige Ort ist, an dem Inhalt existiert, oder wenn es lädt, bevor die Seite lesbar ist. Richtig gemacht kostet es beim ersten Paint fast nichts: Die Bedeutung ist serverseitig gerendertes HTML, die 3D-Ebene kommt danach, schwache Geräte lassen sie ganz aus. Auf dieser Website beginnt der WebGL-Chunk erst nach rund drei Sekunden zu laden — weit nach dem Fenster, das den LCP bestimmt.") },
      { question: c("When is Three.js the wrong choice?", "Wann ist Three.js die falsche Wahl?"), answer: c("When the subject is not spatial. A pricing table, a booking flow, a documentation site — none of them get clearer in 3D, and the budget buys more as content or speed. It earns its place when a system needs to be explorable, when a transition should read as one continuous move, or when the object itself is the product.", "Wenn das Thema nicht räumlich ist. Eine Preistabelle, ein Buchungsflow, eine Doku-Website — keines davon wird in 3D klarer, und das Budget bringt als Inhalt oder Tempo mehr. Es verdient seinen Platz, wenn ein System erkundbar sein muss, wenn ein Übergang als eine durchgehende Bewegung lesen soll, oder wenn das Objekt selbst das Produkt ist.") },
      { question: c("What do you build with?", "Womit bauen Sie?"), answer: c("Astro for the document, TypeScript throughout, GSAP and ScrollTrigger for timeline work, Lenis for desktop wheel smoothing, Three.js and raw GLSL for the real-time layer, and the Web Audio API for the ambience, which is not fetched at all until a visitor turns sound on. Static output on Vercel, with serverless functions only where something has to run per request.", "Astro für das Dokument, durchgehend TypeScript, GSAP und ScrollTrigger für Timeline-Arbeit, Lenis für Wheel-Smoothing am Desktop, Three.js und rohes GLSL für die Echtzeit-Ebene, und die Web Audio API für die Klangkulisse, die erst geladen wird, wenn jemand den Ton einschaltet. Statische Ausgabe auf Vercel, serverlose Funktionen nur dort, wo etwas pro Request laufen muss.") },
      { question: c("Can you work with an existing brand?", "Können Sie mit einer bestehenden Marke arbeiten?"), answer: c("Yes — most of this work is translating a brand that already exists into motion and space without contradicting it. Bridge Consult had a positioning and a visual identity; the job was to give it a digital surface that read as the same company, not a different one wearing its logo.", "Ja — der größte Teil dieser Arbeit ist, eine bestehende Marke in Bewegung und Raum zu übersetzen, ohne ihr zu widersprechen. Bridge Consult hatte Positionierung und visuelle Identität; die Aufgabe war eine digitale Oberfläche, die als dieselbe Firma liest — nicht als eine andere mit fremdem Logo.") },
      { question: c("How is a project like this run?", "Wie läuft so ein Projekt ab?"), answer: c("Scope first, in writing, including what is deliberately not being built. Then a working page rather than a mockup, because a static comp cannot tell you whether a transition feels right or what it costs on a phone. Then measurement, and a list of what to cut. Every case study here was built and shipped solo, so there is no handover where the intent gets lost.", "Zuerst der Scope, schriftlich, inklusive dessen, was bewusst nicht gebaut wird. Dann eine funktionierende Seite statt eines Mockups, denn ein statischer Entwurf sagt weder, ob sich ein Übergang richtig anfühlt, noch was er auf einem Telefon kostet. Dann Messung und eine Liste dessen, was gestrichen wird. Alle Case Studies hier entstanden solo — es gibt keine Übergabe, bei der die Absicht verloren geht.") },
    ],
    siblings: ["motion", "websites"],
  },

  // ── Motion, 3D and video ──────────────────────────────────────────────────
  //  Written last and it should have been written first. Nine finished 3D works
  //  sat in a WebGL archive a visitor had to go looking for, two years of video
  //  production at Siemens sat in a CV row, and the service layer mentioned
  //  Cinema 4D once, in a subordinate clause. So the site sold a web developer,
  //  of which Vienna has thousands, instead of the thing that is actually rare:
  //  the film and the page it lives on made by the same person, which is the
  //  seam where this work normally falls apart.
  motion: {
    key: "motion",
    scope: "film",
    proofKind: "production",
    // The two cases whose sites carry motion of their own — a background film
    // on one, CSS-only motion on the other. Not FIDIC: it is a text platform.
    cases: ["bridge", "academy"],
    reel: ["squidz-pos-display", "lake-como-interior-film", "alpine-equipment-product-film", "fidic-osh-first-meeting"],
    paths: { en: "/en/3d-animation-video-vienna/", de: "/de/3d-animation-video-wien/" },
    title: c("Video, reels and 3D animation in Vienna.", "Video, Reels und 3D-Animation in Wien."),
    description: c(
      "Shorts, reels, video editing, 2D explainers and 3D animation in Vienna by Rodion Belousov — from one vertical edit to a complete Cinema 4D production.",
      "Shorts, Reels, Videoschnitt, 2D-Erklärvideos und 3D-Animation in Wien von Rodion Belousov — vom einzelnen Hochformat-Schnitt bis zur kompletten Cinema-4D-Produktion.",
    ),
    eyebrow: c("Video, Reels & 3D / Vienna", "Video, Reels & 3D / Wien"),
    lead: c(
      "One clean reel from footage you already have. A batch of shorts with captions and motion. A technical explainer, a product film before the product exists, or the ten seconds behind a website hero. Start with the useful version; 3D is available when the idea needs it, not imposed on every job.",
      "Ein sauberes Reel aus vorhandenem Material. Eine Reihe Shorts mit Untertiteln und Motion. Ein technisches Erklärvideo, ein Produktfilm vor dem fertigen Produkt oder die zehn Sekunden hinter einem Website-Hero. Starten Sie mit der sinnvollen Version; 3D ist verfügbar, wenn die Idee es braucht — nicht als Pflicht für jeden Auftrag.",
    ),
    capabilities: [
      {
        title: c("One short or reel, properly finished", "Ein Short oder Reel, sauber fertiggestellt"),
        text: c(
          "Send the footage and the destination. I cut the pace, remove what drags, clean the colour and sound, add captions and on-screen type, and deliver the vertical, square or horizontal versions the channel needs. It can be one video; there is no batch minimum and no requirement to turn it into a campaign.",
          "Schicken Sie Material und Zielkanal. Ich setze den Rhythmus, entferne Längen, bereinige Farbe und Ton, ergänze Untertitel und Typo und liefere Hoch-, Quadrat- oder Querformat. Es kann bei einem Video bleiben; es gibt keine Mindestmenge und keinen Zwang, daraus eine Kampagne zu machen.",
        ),
      },
      {
        title: c("Product film without the product", "Produktfilm ohne Produkt"),
        text: c(
          "Camera moves a real shoot cannot afford, on an object that may not be manufactured yet. Modelled and lit in Cinema 4D, rendered in Redshift, cut in After Effects and Premiere. A different colourway, a new pack size or another end frame is a re-render overnight rather than a second studio day — which is why this is often cheaper than the photography it replaces, not the luxury version of it.",
          "Kamerafahrten, die sich ein realer Dreh nicht leisten kann — an einem Objekt, das vielleicht noch gar nicht produziert ist. Modelliert und ausgeleuchtet in Cinema 4D, gerendert in Redshift, geschnitten in After Effects und Premiere. Eine andere Farbvariante, eine neue Packungsgröße oder ein anderes Endbild ist ein Re-Render über Nacht statt ein zweiter Studiotag — deshalb ist das oft günstiger als die Fotografie, die es ersetzt, und nicht deren Luxusversion.",
        ),
      },
      {
        title: c("Interiors and architecture, before they exist", "Interieur und Architektur, bevor es sie gibt"),
        text: c(
          "A room, a facade or an event set lit with real light logic, so the atmosphere can be approved months before anyone commits money to it. The Lake Como interior film and the Obsidian Residence study in the archive were both built that way: one continuous camera move, materials that behave like the real ones, and a decision made from something you can watch rather than from a moodboard.",
          "Ein Raum, eine Fassade oder ein Event-Set mit echter Lichtlogik ausgeleuchtet, damit die Atmosphäre freigegeben werden kann, Monate bevor jemand Geld dafür bindet. Der Lake-Como-Interieurfilm und die Obsidian-Residence-Studie im Archiv sind genau so entstanden: eine durchgehende Kamerafahrt, Materialien, die sich wie die echten verhalten, und eine Entscheidung, die man an etwas Ansehbarem trifft statt an einem Moodboard.",
        ),
      },
      {
        title: c("Making a technical subject watchable", "Ein technisches Thema ansehbar machen"),
        text: c(
          "Two years of it at Siemens: 2D tutorial and safety-guideline videos for SIMATIC WinCC Open Architecture — a SCADA platform for large control systems — turned into material a global audience actually watches. Before that, an animated explainer for the FMNR reforestation method for Awaken Trees in Vienna. The animation is never the hard part. Deciding what to leave out, and in which order the rest arrives, is.",
          "Zwei Jahre davon bei Siemens: 2D-Tutorial- und Safety-Videos für SIMATIC WinCC Open Architecture — eine SCADA-Plattform für große Leitsysteme — in Material verwandelt, das ein globales Publikum tatsächlich ansieht. Davor ein animiertes Erklärvideo zur FMNR-Aufforstungsmethode für Awaken Trees in Wien. Die Animation ist nie der schwierige Teil. Zu entscheiden, was weggelassen wird und in welcher Reihenfolge der Rest kommt, schon.",
        ),
      },
      {
        title: c("Motion that survives the web", "Motion, die das Web übersteht"),
        text: c(
          "A film that makes a page slow has cost more than it earned. So: loops encoded twice and held behind a poster frame, muted autoplay that stands down for Save-Data and reduced-motion, vertical and square cuts taken from the same master, and — where a video would be the heavier answer — the same movement done in WebGL or plain CSS instead. The films on this site do not download at all until you ask for one.",
          "Ein Film, der eine Seite langsam macht, hat mehr gekostet als eingebracht. Also: Loops doppelt encodiert und hinter einem Posterframe gehalten, stummer Autoplay, der bei Save-Data und reduzierter Bewegung zurücktritt, Hoch- und Quadratformate aus demselben Master — und dort, wo ein Video die schwerere Antwort wäre, dieselbe Bewegung in WebGL oder purem CSS. Die Filme auf dieser Website laden überhaupt erst, wenn Sie einen davon anfordern.",
        ),
      },
      {
        title: c("One pipeline, one owner", "Eine Pipeline, ein Verantwortlicher"),
        text: c(
          "Brief, boards, look development, render, cut, and the page it ends up on — one person the whole way, so there is no version of this where the film team and the web team blame each other for the same second of loading. Delivery is whatever the destination needs: a master, a web loop, social crops, and a poster frame identical to the first frame so nothing flashes when it starts.",
          "Briefing, Boards, Look-Entwicklung, Render, Schnitt und die Seite, auf der es landet — durchgehend eine Person. Es gibt also keine Variante, in der Filmteam und Webteam sich dieselbe Ladesekunde gegenseitig zuschieben. Geliefert wird, was das Ziel braucht: ein Master, ein Web-Loop, Social-Formate und ein Posterframe, das exakt dem ersten Bild entspricht, damit beim Start nichts blitzt.",
        ),
      },
    ],
    proof: [
      { value: "09", label: c("3D works in the public archive — six stills, three films", "3D-Arbeiten im öffentlichen Archiv — sechs Stills, drei Filme") },
      { value: "SIEMENS", label: c("two years of 2D tutorial and safety video for WinCC OA", "zwei Jahre 2D-Tutorial- und Safety-Video für WinCC OA") },
      { value: "C4D + RS", label: c("Cinema 4D and Redshift, cut in After Effects and Premiere", "Cinema 4D und Redshift, geschnitten in After Effects und Premiere") },
    ],
    faq: [
      {
        question: c("Can you just edit one reel?", "Können Sie auch nur ein Reel schneiden?"),
        answer: c(
          "Yes. A straightforward edit from supplied footage starts at €190 and can be delivered from one working day, depending on length and the state of the material. Captions, simple motion and the required aspect ratios are scoped before the edit, so the small job stays small.",
          "Ja. Ein klarer Schnitt aus geliefertem Material startet bei 190 € und kann — je nach Länge und Material — ab einem Arbeitstag geliefert werden. Untertitel, einfache Motion und die benötigten Formate werden vor dem Schnitt festgelegt, damit der kleine Auftrag klein bleibt.",
        ),
      },
      {
        question: c("Do I need a finished product or a built room?", "Brauche ich ein fertiges Produkt oder einen gebauten Raum?"),
        answer: c(
          "No, and that is usually the reason to do it in 3D at all. Drawings, CAD, a packaging dieline, photographs or plain dimensions are enough to build from. It is the one way to have the film before the thing exists — which is what a launch, a crowdfunding page or an investor meeting normally needs it for.",
          "Nein — und genau das ist meist der Grund, es überhaupt in 3D zu machen. Zeichnungen, CAD, eine Packungs-Stanzform, Fotos oder schlicht Maße reichen als Grundlage. Es ist der einzige Weg, den Film vor der Sache zu haben — und genau dafür braucht ihn ein Launch, eine Crowdfunding-Seite oder ein Investorentermin normalerweise.",
        ),
      },
      {
        question: c("Do you shoot live action too?", "Drehen Sie auch mit Kamera?"),
        answer: c(
          "No camera crew, and I would rather say so than sell it. What is made here is 3D and 2D animation, plus editing, grading, titling and sound assembly on footage you already have or that someone else shoots. If a project genuinely needs a shoot, that is a separate supplier and I will say so at the scope stage rather than after the invoice.",
          "Kein Kamerateam — und das sage ich lieber, als es zu verkaufen. Gemacht wird hier 3D- und 2D-Animation, dazu Schnitt, Grading, Typo und Tonmontage auf Material, das Sie bereits haben oder das jemand anderes dreht. Wenn ein Projekt wirklich einen Dreh braucht, ist das ein eigener Dienstleister — und das sage ich beim Scope, nicht nach der Rechnung.",
        ),
      },
      {
        question: c("What do I actually get delivered?", "Was bekomme ich am Ende geliefert?"),
        answer: c(
          "A master in full resolution, plus the cuts the destination needs: a muted web loop encoded for the page, 9:16 and 1:1 versions for social, and a poster frame that matches frame one. If it is going on a site I build, it arrives wired in — preloaded lazily, standing down on slow connections, with a still image underneath for anyone who never gets the video.",
          "Einen Master in voller Auflösung, dazu die Schnitte, die das Ziel braucht: einen stummen Web-Loop für die Seite encodiert, 9:16- und 1:1-Fassungen für Social und ein Posterframe, das dem ersten Bild entspricht. Geht es auf eine Website von mir, kommt es fertig eingebaut — spät geladen, bei langsamen Verbindungen zurücktretend, mit einem Standbild darunter für alle, die das Video nie bekommen.",
        ),
      },
      {
        question: c("How long does a film take?", "Wie lange dauert ein Film?"),
        answer: c(
          "A short product or loop piece with one object and a handful of moves is days rather than weeks. An explainer that has to teach something — script, storyboard, animation, sound — is closer to two to four weeks, and most of that time is approvals rather than rendering. You get the fixed number and the date before it starts, like everything else here.",
          "Ein kurzes Produkt- oder Loop-Stück mit einem Objekt und wenigen Bewegungen dauert Tage statt Wochen. Ein Erklärvideo, das etwas vermitteln muss — Skript, Storyboard, Animation, Ton — liegt eher bei zwei bis vier Wochen, und der größere Teil davon sind Freigaben, nicht Rendern. Die fixe Zahl und den Termin bekommen Sie vorher, wie bei allem anderen hier.",
        ),
      },
      {
        question: c("Can the film and the website be one job?", "Können Film und Website ein Auftrag sein?"),
        answer: c(
          "That is the version worth buying. The page is designed around what the film does and the film is cut to what the page can carry, so the hero does not wait on a 40 MB file and the vertical cut exists before the campaign asks for it. Split across two suppliers, this is exactly where the argument starts — and the visitor pays for it in loading time.",
          "Das ist die Variante, die sich lohnt. Die Seite wird um das gebaut, was der Film tut, und der Film auf das geschnitten, was die Seite tragen kann — so wartet der Hero nicht auf eine 40-MB-Datei, und das Hochformat existiert, bevor die Kampagne danach fragt. Auf zwei Dienstleister verteilt beginnt genau hier der Streit — und bezahlt wird er von Besuchern in Ladezeit.",
        ),
      },
    ],
    siblings: ["creative-development", "websites"],
  },

  // ── Niche pages ───────────────────────────────────────────────────────────
  //  Written around what each trade is actually bound by, because that is the
  //  part a template agency gets wrong and the part the client can verify.

  arztpraxis: {
    key: "arztpraxis",
    scope: "site",
    proofKind: "standard",
    cases: ["academy", "bridge"],
    paths: { en: "/en/website-for-doctors-vienna/", de: "/de/website-arztpraxis-wien/" },
    title: c(
      "A practice website that answers the question patients came with.",
      "Eine Praxis-Website, die beantwortet, weswegen Patienten gekommen sind.",
    ),
    description: c(
      "Websites for medical practices in Vienna: opening hours, Kassenvertrag or Wahlarzt and how to book, readable on a phone in seconds. Built within the advertising limits of the Ärztegesetz.",
      "Websites für Arztpraxen in Wien: Ordinationszeiten, Kassenvertrag oder Wahlarzt und wie man einen Termin bekommt — am Handy in Sekunden lesbar. Gebaut innerhalb der Werbeschranken des Ärztegesetzes.",
    ),
    eyebrow: c("Website for a medical practice / Vienna", "Website Arztpraxis / Wien"),
    lead: c(
      "Nearly everyone arriving on a practice website wants one of four things: when you are open, whether you take their insurance, where you are, and how to get an appointment. Most practice sites in Vienna hide at least two of those behind a PDF. This one puts all four above the fold and stays inside what the Ärztegesetz permits a doctor to say.",
      "Fast alle, die auf einer Praxis-Website landen, wollen eines von vier Dingen: wann Sie offen haben, ob Sie ihre Kasse nehmen, wo Sie sind und wie man einen Termin bekommt. Die meisten Wiener Praxis-Websites verstecken mindestens zwei davon in einem PDF. Diese stellt alle vier nach oben — und bleibt in dem, was das Ärztegesetz einem Arzt zu sagen erlaubt.",
    ),
    capabilities: [
      {
        title: c("Hours as text, not as a PDF", "Ordinationszeiten als Text, nicht als PDF"),
        text: c(
          "Opening hours are the single most requested thing on a practice site and the thing most often published as a scan. A search engine cannot read a scan, a phone renders it at 30% zoom, and a screen reader gets nothing. Written as real text with opening-hours structured data, the hours can show up in the search result itself — which is where a patient standing on the street actually looks.",
          "Ordinationszeiten sind das meistgesuchte Element einer Praxis-Website und das am häufigsten als Scan veröffentlichte. Eine Suchmaschine kann einen Scan nicht lesen, ein Handy zeigt ihn auf 30 % verkleinert, ein Screenreader bekommt gar nichts. Als echter Text mit Opening-Hours-Markup können die Zeiten direkt im Suchergebnis erscheinen — dort, wo ein Patient auf der Straße tatsächlich nachsieht.",
        ),
      },
      {
        title: c("Kassenvertrag or Wahlarzt, said plainly", "Kassenvertrag oder Wahlarzt, klar gesagt"),
        text: c(
          "This is the question that decides whether someone calls, and the one most sites answer somewhere on page three. It belongs in the first screen, in the words patients use — which ÖGK, BVAEB or SVS contracts you hold, or that you are a Wahlarzt and what reimbursement usually looks like. Being direct about it costs you the calls you were never going to convert and wins the ones you were.",
          "Das ist die Frage, die darüber entscheidet, ob jemand anruft — und die, die die meisten Websites irgendwo auf Seite drei beantworten. Sie gehört in den ersten Bildschirm, in den Worten der Patienten: welche Verträge mit ÖGK, BVAEB oder SVS bestehen, oder dass Sie Wahlarzt sind und wie die Rückerstattung üblicherweise aussieht. Diese Klarheit kostet Sie die Anrufe, aus denen ohnehin nichts geworden wäre.",
        ),
      },
      {
        title: c("Inside §53 Ärztegesetz", "Innerhalb von § 53 Ärztegesetz"),
        text: c(
          "The limits are narrower than most agencies assume, and narrower than \u201cno advertising\u201d: §53 Ärztegesetz bars information that is unfactual, untrue or damaging to the standing of the profession, and the Ärztekammer\u2019s guidance is stricter again on comparative claims and on patient testimonials used as promotion. In practice that rules out superlatives and a before-and-after gallery sold as a result, and it leaves a great deal: what you treat, how you work, which methods, which languages, which contracts. Being specific persuades better than a superlative anyway. Where a claim sits on the line, the Kammer will tell you in a phone call — that is their answer to give, not mine.",
          "Die Grenzen sind enger, als die meisten Agenturen annehmen — und zugleich enger gefasst als „keine Werbung“: § 53 Ärztegesetz untersagt unsachliche, unwahre oder das Standesansehen beeinträchtigende Information, und die Richtlinien der Ärztekammer sind bei Vergleichen und bei als Werbung eingesetzten Patientenstimmen noch strenger. Praktisch fallen damit Superlative und die als Ergebnis verkaufte Vorher-Nachher-Galerie weg — und es bleibt sehr viel: was Sie behandeln, wie Sie arbeiten, welche Methoden, welche Sprachen, welche Verträge. Genauigkeit überzeugt ohnehin mehr als ein Superlativ. Wo eine Aussage auf der Kippe steht, sagt Ihnen das die Kammer in einem Telefonat — das ist ihre Auskunft, nicht meine.",
        ),
      },
      {
        title: c("Health data kept off the form", "Gesundheitsdaten bleiben aus dem Formular"),
        text: c(
          "An appointment request is not the place for symptoms. Health data is a special category under the DSGVO, and a free-text box inviting people to describe their complaint quietly turns your website into a system that processes it. The request form asks for a name, a way to reach them and a preferred time, and nothing that would make the practice liable for storing a diagnosis on a hosting provider.",
          "Eine Terminanfrage ist nicht der Ort für Symptome. Gesundheitsdaten sind eine besondere Kategorie nach DSGVO, und ein Freitextfeld, das zur Beschwerdenbeschreibung einlädt, macht Ihre Website still zu einem System, das solche Daten verarbeitet. Das Anfrageformular fragt nach Name, Erreichbarkeit und Wunschzeit — und nach nichts, wofür die Praxis eine Diagnose bei einem Hoster gespeichert verantworten müsste.",
        ),
      },
      {
        title: c("Found in your district, not in general", "Gefunden in Ihrem Bezirk, nicht im Allgemeinen"),
        text: c(
          "Nobody searches for 'general practitioner Austria'. They search for the specialty and the district — Hausarzt 1070, Kinderarzt Floridsdorf — usually on a phone, usually within about a kilometre. That means a Google Business Profile that matches the site exactly, correct medical-practice structured data, and the district named on the page rather than implied by the address in the footer.",
          "Niemand sucht „Allgemeinmediziner Österreich“. Gesucht wird nach Fach und Bezirk — Hausarzt 1070, Kinderarzt Floridsdorf — meist am Handy, meist im Umkreis von etwa einem Kilometer. Das heißt: ein Google-Unternehmensprofil, das exakt zur Website passt, korrektes MedicalClinic-Markup und der Bezirk auf der Seite benannt, statt ihn aus der Adresse im Footer zu erahnen.",
        ),
      },
    ],
    proof: [
      { value: "4", label: c("questions answered before a patient scrolls", "Fragen beantwortet, bevor ein Patient scrollt") },
      { value: "1.0s", label: c("largest contentful paint, measured on this site", "Largest Contentful Paint, auf dieser Website gemessen") },
      { value: "0", label: c("plugins to keep updated, and no monthly builder fee", "Plugins zu aktualisieren, keine monatliche Baukastengebühr") },
    ],
    faq: [
      {
        question: c("What may a practice website say under Austrian law?", "Was darf eine Praxis-Website nach österreichischem Recht sagen?"),
        answer: c(
          "It may inform: your specialty, training, methods, hours, insurance contracts, languages, accessibility and how to reach you. It may not advertise comparatively or with superlatives, and patient testimonials used as promotion are a risk. In practice this is a smaller limit than it sounds — being concrete about what you treat and how you work is more convincing than a superlative anyway.",
          "Sie darf informieren: Fachgebiet, Ausbildung, Methoden, Zeiten, Kassenverträge, Sprachen, Barrierefreiheit und Erreichbarkeit. Sie darf nicht vergleichend oder superlativisch werben, und als Werbung eingesetzte Patientenstimmen sind ein Risiko. In der Praxis ist das eine kleinere Einschränkung, als es klingt — konkret zu sagen, was Sie behandeln und wie Sie arbeiten, überzeugt ohnehin mehr als ein Superlativ.",
        ),
      },
      {
        question: c("Can patients book online?", "Können Patienten online buchen?"),
        answer: c(
          "Yes, in one of two ways. If you already use a system such as a practice-management booking tool, the site links into it so nothing is duplicated. If you do not, a simple request form sends a name, a phone number and a preferred window to your inbox, and your assistant confirms by phone as they do today. Real-time booking into a practice calendar is a bigger project and is quoted separately.",
          "Ja, auf zwei Wegen. Nutzen Sie bereits ein System, etwa ein Terminmodul Ihrer Praxissoftware, verlinkt die Website dorthin, damit nichts doppelt geführt wird. Falls nicht, schickt ein einfaches Anfrageformular Name, Telefonnummer und Wunschzeitraum an Ihr Postfach, und Ihre Assistenz bestätigt telefonisch wie bisher. Echtzeit-Buchung in den Praxiskalender ist ein größeres Projekt und wird separat kalkuliert.",
        ),
      },
      {
        question: c("Does the site have to be accessible?", "Muss die Website barrierefrei sein?"),
        answer: c(
          "Build it as if yes, then check whether you are actually covered. The Barrierefreiheitsgesetz has applied in Austria since mid-2025, but to a defined list of services, and it exempts micro-enterprises — under ten people and under two million in turnover — which most single-doctor practices are. So the honest answer is that it often does not bind you, and that a practice whose patients are disproportionately older or impaired has an obvious reason anyway. Contrast, keyboard operation, real headings and text that scales are built in from the start here, because retrofitting them later costs several times more. If you need certainty about the legal side, that is a question for the Wirtschaftskammer or a lawyer.",
          "Bauen Sie es, als wäre die Antwort ja — und prüfen Sie dann, ob Sie überhaupt erfasst sind. Das Barrierefreiheitsgesetz gilt in Österreich seit Mitte 2025, aber für eine definierte Liste von Dienstleistungen, und es nimmt Kleinstunternehmen aus — unter zehn Beschäftigte und unter zwei Millionen Umsatz, was auf die meisten Einzelpraxen zutrifft. Ehrlich ist also: Oft bindet es Sie nicht — und eine Praxis mit überdurchschnittlich vielen älteren oder beeinträchtigten Patienten hat trotzdem einen offensichtlichen Grund. Kontrast, Tastaturbedienung, echte Überschriften und skalierbarer Text sind hier von Anfang an eingebaut, weil Nachrüsten ein Vielfaches kostet. Für Rechtssicherheit ist die Wirtschaftskammer oder ein Anwalt zuständig.",
        ),
      },
      {
        question: c("We already have a website. Is it worth replacing?", "Wir haben schon eine Website. Lohnt der Austausch?"),
        answer: c(
          "Send the address and you get an honest answer, including 'keep it'. The usual findings are hours locked in a PDF, no mobile layout, the insurance question unanswered, and a contact form that has been silently failing for months. If those are the problems, replacing is cheaper than repairing — the pages are the work, and there are rarely many of them.",
          "Schicken Sie die Adresse, Sie bekommen eine ehrliche Antwort — auch „behalten“. Die üblichen Befunde: Zeiten in einem PDF eingesperrt, kein mobiles Layout, die Kassenfrage unbeantwortet und ein Kontaktformular, das seit Monaten still ins Leere läuft. Wenn das die Probleme sind, ist Ersetzen günstiger als Reparieren — die Arbeit sind die Seiten, und viele sind es selten.",
        ),
      },
    ],
    siblings: ["websites", "handwerker", "restaurant"],
  },

  restaurant: {
    key: "restaurant",
    scope: "site",
    proofKind: "standard",
    cases: ["academy", "bridge"],
    paths: { en: "/en/website-for-restaurants-vienna/", de: "/de/website-restaurant-wien/" },
    title: c(
      "A restaurant website built for someone standing outside, hungry.",
      "Eine Restaurant-Website für jemanden, der hungrig davor steht.",
    ),
    description: c(
      "Websites for restaurants and cafés in Vienna: the menu as real text, hours, address and reservation on the first screen. Allergen information handled properly, and a menu search engines can actually read.",
      "Websites für Restaurants und Cafés in Wien: die Karte als echter Text, Öffnungszeiten, Adresse und Reservierung auf dem ersten Bildschirm. Allergeninformation sauber gelöst, und eine Karte, die Suchmaschinen wirklich lesen können.",
    ),
    eyebrow: c("Website for a restaurant / Vienna", "Website Restaurant / Wien"),
    lead: c(
      "A restaurant site has one job and about eight seconds to do it: show what is on the menu, what it costs, whether you are open and how to get a table. It is looked at on a phone, one-handed, often on mobile data outside your door. Everything that does not serve that moment is decoration you are paying for.",
      "Eine Restaurant-Website hat eine Aufgabe und rund acht Sekunden dafür: zeigen, was auf der Karte steht, was es kostet, ob offen ist und wie man einen Tisch bekommt. Angesehen wird sie am Handy, einhändig, oft im Mobilfunknetz direkt vor Ihrer Tür. Alles, was diesem Moment nicht dient, ist Dekoration, für die Sie zahlen.",
    ),
    capabilities: [
      {
        title: c("The menu as text, not as a PDF", "Die Karte als Text, nicht als PDF"),
        text: c(
          "A PDF menu is the most common and most expensive mistake in this trade. It downloads instead of opening, renders at unreadable size on a phone, and is a dead end for the thing that matters: Google does index text PDFs, but what it can rank is a document, not a dish sitting on a page you can update in a minute, tie allergen data to, and measure. Written as real pages, the menu is readable in one tap, changeable in a minute, and eligible to appear in search results and on your Google Business Profile.",
          "Eine PDF-Karte ist der häufigste und teuerste Fehler dieser Branche. Sie lädt herunter statt zu öffnen, erscheint am Handy in unleserlicher Größe, und ist eine Sackgasse für das Entscheidende: Google indexiert Text-PDFs durchaus — ranken kann es aber ein Dokument, nicht ein Gericht auf einer Seite, die Sie in einer Minute ändern, mit Allergendaten verknüpfen und messen können. Als echte Seiten gebaut, ist die Karte mit einem Tipp lesbar, in einer Minute änderbar und kann in Suchergebnissen und im Google-Unternehmensprofil erscheinen.",
        ),
      },
      {
        title: c("Allergens without a legal headache", "Allergene ohne Rechtsproblem"),
        text: c(
          "Austrian law requires the fourteen allergen groups to be declared, and doing it as a footnote nobody can map to a dish satisfies nobody — least of all the guest with a real allergy who then does not book. Each dish carries its own codes, kept in the same place you edit prices, so updating a recipe updates the declaration instead of leaving the two to drift apart.",
          "Die österreichische Allergenverordnung verlangt die Deklaration der vierzehn Allergengruppen, und eine Fußnote, die niemand einem Gericht zuordnen kann, hilft niemandem — am wenigsten dem Gast mit echter Allergie, der dann nicht reserviert. Jedes Gericht trägt seine eigenen Codes, gepflegt an derselben Stelle wie die Preise, sodass eine geänderte Rezeptur die Deklaration mitändert statt beides auseinanderlaufen zu lassen.",
        ),
      },
      {
        title: c("Reservations where you already take them", "Reservierung dort, wo Sie sie schon annehmen"),
        text: c(
          "If you run OpenTable, Quandoo, resmio or a table book by phone, the site sends people into that — one obvious button, working on a phone, no second system to check at service. Nobody needs another inbox during a Friday dinner rush. If you take reservations by phone only, the number is a tap-to-call, which on a phone is the whole feature.",
          "Wenn Sie OpenTable, Quandoo, resmio oder ein Reservierungsbuch am Telefon führen, schickt die Website die Gäste genau dorthin — ein eindeutiger Button, funktionierend am Handy, kein zweites System, das im Service kontrolliert werden muss. Niemand braucht ein weiteres Postfach im Freitagabendgeschäft. Nehmen Sie nur telefonisch an, ist die Nummer ein Tap-to-Call — am Handy ist das die ganze Funktion.",
        ),
      },
      {
        title: c("Photographs that load before they are scrolled past", "Fotos, die laden, bevor man vorbeiscrollt"),
        text: c(
          "In this trade the pictures are the argument, and they are also what makes most restaurant sites unusable on mobile data. Images are served in modern formats at the size the device actually needs, so a gallery that used to weigh eight megabytes weighs a few hundred kilobytes and appears immediately. The food still looks like the food.",
          "In dieser Branche sind die Bilder das Argument — und zugleich das, was die meisten Restaurant-Websites im Mobilfunknetz unbrauchbar macht. Bilder werden in modernen Formaten und in genau der Größe ausgeliefert, die das Gerät braucht: Eine Galerie, die acht Megabyte wog, wiegt ein paar hundert Kilobyte und ist sofort da. Das Essen sieht weiterhin aus wie das Essen.",
        ),
      },
      {
        title: c("Found by the dish, not just by the name", "Gefunden über das Gericht, nicht nur über den Namen"),
        text: c(
          "People who already know your name will find you anyway. The traffic worth having comes from someone searching for a dish and a district, or looking at Google Maps at half past seven. That means a Google Business Profile that agrees with the site, restaurant and menu structured data, the district in the copy, and hours that are correct on the days everyone else forgets to update.",
          "Wer Ihren Namen kennt, findet Sie ohnehin. Der Traffic, der zählt, kommt von jemandem, der nach Gericht und Bezirk sucht oder um halb acht auf Google Maps schaut. Das heißt: ein Google-Unternehmensprofil, das mit der Website übereinstimmt, Restaurant- und Menü-Markup, der Bezirk im Text und Öffnungszeiten, die auch an den Tagen stimmen, an denen alle anderen das Aktualisieren vergessen.",
        ),
      },
    ],
    proof: [
      { value: "1 tap", label: c("from landing on the site to reading the menu", "von der Startseite bis zur gelesenen Karte") },
      { value: "1.0s", label: c("largest contentful paint, measured on this site", "Largest Contentful Paint, auf dieser Website gemessen") },
      { value: "0", label: c("PDFs between a guest and a price", "PDFs zwischen Gast und Preis") },
    ],
    faq: [
      {
        question: c("Can we change the menu ourselves?", "Können wir die Karte selbst ändern?"),
        answer: c(
          "Yes — that is the point of not using a PDF. Dishes, prices and allergen codes live in one editable list, and a change is live in minutes without a designer. If you change the menu daily or seasonally, say so before the build and the editing side is designed around that rhythm rather than bolted on.",
          "Ja — genau darum keine PDF. Gerichte, Preise und Allergencodes liegen in einer editierbaren Liste, eine Änderung ist in Minuten live, ohne Designer. Wenn Sie täglich oder saisonal wechseln, sagen Sie es vor dem Bau: Dann wird die Redaktionsseite um diesen Rhythmus herum entworfen statt nachträglich angeflanscht.",
        ),
      },
      {
        question: c("Do we need a delivery or ordering system?", "Brauchen wir ein Liefer- oder Bestellsystem?"),
        answer: c(
          "Usually not on your own site. Lieferando and its competitors already own that search, and building a parallel ordering flow rarely pays for itself for a single location. What does pay is being unmistakably findable and reservable, plus a clean link to whatever delivery platform you already use. If you want to take orders directly to avoid the commission, that is a shop project and is quoted as one.",
          "Meist nicht auf der eigenen Website. Lieferando und Mitbewerber besitzen diese Suche bereits, und ein paralleler Bestellprozess rechnet sich für einen einzelnen Standort selten. Was sich rechnet: unverwechselbar auffindbar und reservierbar zu sein, dazu ein sauberer Link auf die Lieferplattform, die Sie ohnehin nutzen. Wollen Sie direkt bestellen lassen, um die Provision zu sparen, ist das ein Shop-Projekt und wird als solches kalkuliert.",
        ),
      },
      {
        question: c("We have good photos already. Does that save time?", "Wir haben schon gute Fotos. Spart das Zeit?"),
        answer: c(
          "It saves the largest single delay. In this trade the photographs are most of the persuasion, and waiting on a shoot is usually what stretches a one-week build into a month. Send what you have — phone photos in good daylight are often enough to launch with, and can be replaced later without rebuilding anything.",
          "Es spart die größte Einzelverzögerung. In dieser Branche sind die Fotos der überwiegende Teil der Überzeugung, und das Warten auf ein Shooting dehnt einen Ein-Wochen-Bau meist auf einen Monat. Schicken Sie, was da ist — Handyfotos bei gutem Tageslicht reichen oft für den Start und lassen sich später ersetzen, ohne etwas neu zu bauen.",
        ),
      },
      {
        question: c("How fast can it be live?", "Wie schnell kann sie live sein?"),
        answer: c(
          "About a week from the point the menu and the photographs exist, because the build is static and there is no CMS to configure. A single-page site with the menu, hours, address and a reservation link can go live in two to four days if you need something standing before a weekend.",
          "Etwa eine Woche ab dem Moment, in dem Karte und Fotos vorliegen — der Bau ist statisch, es gibt kein CMS zu konfigurieren. Eine einseitige Website mit Karte, Zeiten, Adresse und Reservierungslink kann in zwei bis vier Tagen live sein, wenn vor einem Wochenende etwas stehen muss.",
        ),
      },
    ],
    siblings: ["websites", "arztpraxis", "handwerker"],
  },

  handwerker: {
    key: "handwerker",
    scope: "site",
    proofKind: "standard",
    cases: ["academy", "bridge"],
    paths: { en: "/en/website-for-tradespeople-vienna/", de: "/de/website-handwerker-wien/" },
    title: c(
      "A trades website for the customer whose bathroom is flooding.",
      "Eine Handwerker-Website für den Kunden, dessen Bad gerade unter Wasser steht.",
    ),
    description: c(
      "Websites for tradespeople in Vienna: phone number that dials on one tap, the districts you cover, whether you do emergencies, and proof you are a real Meisterbetrieb. Built to be found from a phone.",
      "Websites für Handwerksbetriebe in Wien: Telefonnummer, die mit einem Tipp wählt, die Bezirke, die Sie abdecken, ob Sie Notdienst machen — und der Nachweis, dass Sie ein echter Meisterbetrieb sind. Gebaut, um vom Handy aus gefunden zu werden.",
    ),
    eyebrow: c("Website for tradespeople / Vienna", "Website Handwerker / Wien"),
    lead: c(
      "Most of your customers find you at the worst moment of their week, on a phone, searching for your trade and their district. They are not reading. They are looking for a number to call and a reason to believe you will pick up. A trades website that gets those two things right beats a beautiful one that buries them.",
      "Die meisten Ihrer Kunden finden Sie im schlechtesten Moment ihrer Woche, am Handy, mit einer Suche nach Ihrem Gewerk und ihrem Bezirk. Sie lesen nicht. Sie suchen eine Nummer zum Anrufen und einen Grund zu glauben, dass jemand abhebt. Eine Handwerker-Website, die diese zwei Dinge richtig macht, schlägt eine schöne, die sie vergräbt.",
    ),
    capabilities: [
      {
        title: c("The number dials on one tap", "Die Nummer wählt mit einem Tipp"),
        text: c(
          "It sounds trivial until you watch someone try to copy a phone number out of an image on a wet screen. The number sits in the first screen and in a bar that stays reachable while scrolling, and tapping it dials — no copying, no dialler app, no second page. On a phone this is the single highest-value element on the whole site.",
          "Klingt banal, bis man jemandem zusieht, der auf einem nassen Display eine Telefonnummer aus einem Bild abzutippen versucht. Die Nummer steht im ersten Bildschirm und in einer Leiste, die beim Scrollen erreichbar bleibt — ein Tipp wählt. Kein Abtippen, keine Telefon-App, keine zweite Seite. Am Handy ist das das wertvollste einzelne Element der ganzen Website.",
        ),
      },
      {
        title: c("The districts you actually drive to", "Die Bezirke, in die Sie wirklich fahren"),
        text: c(
          "'Vienna and surroundings' costs you calls in both directions: people inside your area are not sure you mean them, and people outside it waste your time. Naming the districts and the towns beyond the city limits you genuinely serve does two things at once — it answers the question and it puts the exact words people search into the page.",
          "„Wien und Umgebung“ kostet Sie Anrufe in beide Richtungen: Leute in Ihrem Gebiet sind nicht sicher, ob Sie sie meinen, und Leute außerhalb kosten Sie Zeit. Die Bezirke und die Umlandgemeinden zu benennen, die Sie tatsächlich bedienen, erledigt zwei Dinge auf einmal — es beantwortet die Frage und bringt genau die gesuchten Wörter auf die Seite.",
        ),
      },
      {
        title: c("Emergency service, answered before it is asked", "Notdienst, beantwortet bevor gefragt wird"),
        text: c(
          "If you take emergency calls, say when and roughly what a call-out costs — the fear of an unknown night surcharge is what makes people ring the next number instead. If you do not, say that too. Either answer is better than the silence that makes a panicking customer keep scrolling down the search results.",
          "Wenn Sie Notdienst machen, sagen Sie wann und was ein Ausrücken ungefähr kostet — die Angst vor einem unbekannten Nachtzuschlag ist der Grund, warum Leute stattdessen die nächste Nummer wählen. Wenn Sie keinen machen, sagen Sie auch das. Jede der beiden Antworten ist besser als das Schweigen, das einen Kunden in Panik weiter durch die Suchergebnisse scrollen lässt.",
        ),
      },
      {
        title: c("Proof you are a real business", "Nachweis, dass Sie ein echter Betrieb sind"),
        text: c(
          "This trade competes against people who take a deposit and disappear, so the customer is checking whether you exist. Gewerbeberechtigung and Meisterbetrieb status, the firm's full name and Firmenbuch number, insurance, how long you have been trading, and photographs of finished jobs with the district named. Concrete, verifiable things — not a stock photo of a smiling man in overalls.",
          "Dieses Gewerbe konkurriert mit Leuten, die eine Anzahlung nehmen und verschwinden — der Kunde prüft also, ob es Sie gibt. Gewerbeberechtigung und Meisterbetrieb, vollständiger Firmenwortlaut und Firmenbuchnummer, Versicherung, wie lange Sie tätig sind, und Fotos fertiger Arbeiten mit genanntem Bezirk. Konkrete, überprüfbare Dinge — kein Stockfoto eines lächelnden Mannes im Overall.",
        ),
      },
      {
        title: c("A quote request that is worth answering", "Eine Anfrage, die das Antworten wert ist"),
        text: c(
          "A blank 'your message' box produces one-line enquiries you have to phone back twice to price. Asking the four things you would ask on the phone anyway — trade, district, what happened, and whether it is urgent — means the request that reaches you can usually be answered with a real number, or ruled out before you drive across town for nothing.",
          "Ein leeres Feld „Ihre Nachricht“ produziert Einzeiler, für die Sie zweimal zurückrufen müssen, um einen Preis zu nennen. Die vier Dinge zu fragen, die Sie am Telefon ohnehin fragen — Gewerk, Bezirk, was passiert ist und ob es dringend ist — heißt, dass die Anfrage meist mit einer echten Zahl beantwortet werden kann oder ausscheidet, bevor Sie umsonst quer durch die Stadt fahren.",
        ),
      },
    ],
    proof: [
      { value: "1 tap", label: c("from a search result to your phone ringing", "vom Suchergebnis bis Ihr Telefon klingelt") },
      { value: "1.0s", label: c("largest contentful paint, measured on this site", "Largest Contentful Paint, auf dieser Website gemessen") },
      { value: "0", label: c("monthly builder fees, and nothing to update", "monatliche Baukastengebühren, nichts zu aktualisieren") },
    ],
    faq: [
      {
        question: c("Is a website worth it if most work comes by recommendation?", "Lohnt eine Website, wenn das meiste über Empfehlung kommt?"),
        answer: c(
          "Recommendation is how you get named; the website is where the person checks you before calling. Someone handed your name still searches it, and finding nothing — or a dead 2012 page — costs you the job you had already won. It is also what makes a Google Business Profile work, and that profile is what puts you in the map results where the emergency searches happen.",
          "Über Empfehlung werden Sie genannt; auf der Website wird geprüft, bevor angerufen wird. Wer Ihren Namen bekommen hat, sucht ihn trotzdem — und nichts zu finden oder eine tote Seite von 2012, kostet Sie den Auftrag, den Sie schon hatten. Die Website ist außerdem das, was ein Google-Unternehmensprofil erst wirken lässt, und dieses Profil bringt Sie in die Kartenergebnisse, wo die Notfallsuchen stattfinden.",
        ),
      },
      {
        question: c("How many pages do we need?", "Wie viele Seiten brauchen wir?"),
        answer: c(
          "Usually four to six: what you do, the trades in detail, your area, proof of finished work, contact, and the Impressum. More than that is rarely read. If you cover several trades that people search separately — plumbing and heating, say — each gets its own page, because those are separate searches and one combined page ranks for neither.",
          "Meist vier bis sechs: was Sie tun, die Leistungen im Detail, Ihr Gebiet, Referenzen, Kontakt und das Impressum. Mehr wird selten gelesen. Decken Sie mehrere Gewerke ab, nach denen getrennt gesucht wird — etwa Installation und Heizung —, bekommt jedes eine eigene Seite: Das sind getrennte Suchen, und eine kombinierte Seite rankt für keine davon.",
        ),
      },
      {
        question: c("We have no photos of our work.", "Wir haben keine Fotos unserer Arbeiten."),
        answer: c(
          "Start taking them with a phone from tomorrow — before, during and after, with the customer's permission. They are the most persuasive thing on a trades website and they cost nothing. The site launches with what exists and the gallery grows; waiting for a photographer is the most common reason a build sits unfinished for months.",
          "Fangen Sie ab morgen an, welche mit dem Handy zu machen — vorher, währenddessen, nachher, mit Einverständnis des Kunden. Sie sind das überzeugendste Element einer Handwerker-Website und kosten nichts. Die Website startet mit dem, was da ist, und die Galerie wächst; auf einen Fotografen zu warten ist der häufigste Grund, warum ein Projekt monatelang unfertig liegen bleibt.",
        ),
      },
      {
        question: c("Do you also do the Google Business Profile?", "Machen Sie auch das Google-Unternehmensprofil?"),
        answer: c(
          "Yes, and for this trade it usually matters more than the website itself, because the map results sit above the ordinary ones. Categories, service area, hours, photographs and the details matched exactly to the site, so the two reinforce each other instead of contradicting each other. The profile stays in your own account.",
          "Ja — und in diesem Gewerbe zählt es meist mehr als die Website selbst, weil die Kartenergebnisse über den gewöhnlichen stehen. Kategorien, Einzugsgebiet, Zeiten, Fotos und Angaben exakt auf die Website abgestimmt, damit sich beide verstärken statt zu widersprechen. Das Profil bleibt in Ihrem eigenen Konto.",
        ),
      },
    ],
    siblings: ["websites", "arztpraxis", "restaurant"],
  },
};

export interface InsightContent {
  key: InsightKey;
  paths: Record<SeoLang, string>;
  title: LocalizedCopy;
  /** Optional shorter title for the <title>/OG tag when the headline itself
      exceeds Google's ~60-char display width. Falls back to `title`. */
  seoTitle?: LocalizedCopy;
  description: LocalizedCopy;
  dek: LocalizedCopy;
  sections: Array<{ title: LocalizedCopy; text: LocalizedCopy }>;
  relatedService: ServiceKey;
}

export const insightContent: Record<InsightKey, InsightContent> = {
  "bridge-growth": {
    key: "bridge-growth",
    paths: { en: "/en/insights/bridge-consult-seo-growth/", de: "/de/insights/bridge-consult-seo-wachstum/" },
    title: c("Bridge Consult: from infrastructure expertise to organic demand", "Bridge Consult: von Infrastruktur-Expertise zu organischer Nachfrage"),
    seoTitle: c("Bridge Consult: infrastructure expertise to organic demand", "Bridge Consult: Infrastruktur-Expertise zu Nachfrage"),
    description: c("A practical case study on positioning, multilingual Astro development, Three.js and early organic-search growth for Bridge Consult.", "Case Study über Positionierung, mehrsprachige Astro-Entwicklung, Three.js und frühes Organic-Search-Wachstum für Bridge Consult."),
    dek: c("A solo launch built in one month connected brand, multilingual content, technical SEO and an interactive project universe.", "Ein Solo-Launch in einem Monat verband Marke, mehrsprachigen Content, Technical SEO und ein interaktives Projektuniversum."),
    sections: [
      { title: c("The business problem", "Das Business-Problem"), text: c("Bridge Consult needed to turn dense FIDIC, feasibility and infrastructure experience into immediate authority for international decision-makers. The expertise was real and largely invisible: it lived in project documents and in people's heads, not anywhere a prospective client could find it. The brief was not more pages — it was one proposition that could be verified in thirty seconds by someone who already knows the subject and has no patience for marketing language.", "Bridge Consult musste dichte FIDIC-, Feasibility- und Infrastruktur-Erfahrung in unmittelbare Autorität für internationale Entscheider übersetzen. Die Expertise war real und weitgehend unsichtbar: Sie lag in Projektunterlagen und in Köpfen, nicht dort, wo ein potenzieller Kunde sie findet. Die Aufgabe war nicht mehr Seiten — sondern ein Versprechen, das jemand mit Fachwissen und ohne Geduld für Marketingsprache in dreißig Sekunden prüfen kann.") },
      { title: c("Positioning before production", "Positionierung vor Produktion"), text: c("Scope was settled in writing first, including what would deliberately not be built. In infrastructure consulting the buyer is usually technical, so the site had to lead with verifiable specifics — the standards, the institutions, the project types — rather than adjectives. Everything that could not be checked by a reader was cut before it reached a layout, which is the cheapest possible moment to remove it.", "Der Scope wurde zuerst schriftlich geklärt, inklusive dessen, was bewusst nicht gebaut wird. In der Infrastrukturberatung ist der Käufer meist technisch, die Website musste also mit prüfbaren Spezifika führen — Standards, Institutionen, Projekttypen — statt mit Adjektiven. Alles, was ein Leser nicht nachprüfen kann, flog raus, bevor es ein Layout erreichte: der billigstmögliche Zeitpunkt.") },
      { title: c("Multilingual as architecture", "Mehrsprachigkeit als Architektur"), text: c("Three markets meant the language system had to be structural rather than a translation pass at the end. Interface strings live in one dictionary, content that is genuinely localised gets its own URL with a canonical and full hreflang, and nothing else does. That distinction is what prevents the classic failure: duplicate homepages at locale roots competing with each other for the same query.", "Drei Märkte bedeuteten, dass das Sprachsystem strukturell sein musste statt ein Übersetzungsdurchgang am Ende. Interface-Strings liegen in einem Wörterbuch; echt lokalisierte Inhalte bekommen eine eigene URL mit Canonical und vollständigem hreflang, sonst nichts. Diese Unterscheidung verhindert den klassischen Fehler: doppelte Startseiten unter Locale-Roots, die um dieselbe Query konkurrieren.") },
      { title: c("The interactive layer, and its budget", "Die interaktive Ebene und ihr Budget"), text: c("A Three.js project universe lets a visitor rotate through eight infrastructure nodes instead of reading a list. It earns its place because the subject is spatial — projects in places — but it is held to a budget: the meaning is server-rendered HTML underneath, the scene loads after first paint, and it is skipped entirely on constrained devices. A canvas that is the only place content exists is a canvas that does not rank.", "Ein Three.js-Projektuniversum lässt Besucher durch acht Infrastrukturknoten rotieren, statt eine Liste zu lesen. Es verdient seinen Platz, weil das Thema räumlich ist — Projekte an Orten —, unterliegt aber einem Budget: Die Bedeutung ist darunter serverseitig gerendertes HTML, die Szene lädt nach dem ersten Paint, auf schwachen Geräten entfällt sie ganz. Ein Canvas als einziger Ort des Inhalts ist ein Canvas, das nicht rankt.") },
      { title: c("The signal", "Das Signal"), text: c("The early GA4 comparison showed 44 organic-search sessions against a baseline of five: a 780 percent increase, alongside roughly sixfold growth in users and events, across four markets. It is an early signal from a launch window, not a lifetime forecast, and it is presented here with that context rather than as a headline. A small base makes large percentages easy; what matters is that the direction was measured rather than assumed.", "Der frühe GA4-Vergleich zeigte 44 Organic-Search-Sitzungen gegenüber einer Baseline von fünf: ein Plus von 780 Prozent, dazu etwa sechsfaches Wachstum bei Nutzern und Events, über vier Märkte. Das ist ein frühes Signal aus einem Launch-Fenster, keine Langzeitprognose, und wird hier mit diesem Kontext gezeigt statt als Schlagzeile. Eine kleine Basis macht große Prozentwerte leicht; entscheidend ist, dass die Richtung gemessen und nicht angenommen wurde.") },
      { title: c("What carried over", "Was übertragbar blieb"), text: c("The content model, the language system and the search structure were reused almost intact on FIDIC.uz a few weeks later, which is the real test of whether an architecture was designed or improvised. The second platform reached 429 pages across three languages on the same foundation, without the templates needing to know how many languages existed.", "Content-Modell, Sprachsystem und Search-Struktur wurden wenige Wochen später auf FIDIC.uz nahezu unverändert wiederverwendet — der eigentliche Test, ob eine Architektur entworfen oder improvisiert war. Die zweite Plattform erreichte auf derselben Grundlage 429 Seiten in drei Sprachen, ohne dass die Templates wissen mussten, wie viele Sprachen existieren.") },
    ],
    relatedService: "technical-seo",
  },
  "fidic-platform": {
    key: "fidic-platform",
    paths: { en: "/en/insights/fidic-knowledge-platform/", de: "/de/insights/fidic-wissensplattform/" },
    title: c("FIDIC.uz: designing a contract knowledge operating system", "FIDIC.uz: ein Betriebssystem für Vertragswissen gestalten"),
    description: c("How a multilingual FIDIC platform combines 429 pages, 117 expert articles, contract books, tools and technical SEO.", "Wie eine mehrsprachige FIDIC-Plattform 429 Seiten, 117 Fachartikel, Vertragsbücher, Tools und Technical SEO verbindet."),
    dek: c("The challenge was not another brochure, but a navigable professional platform for dense infrastructure-contract knowledge.", "Die Aufgabe war keine weitere Broschüre, sondern eine navigierbare professionelle Plattform für dichtes Infrastruktur-Vertragswissen."),
    sections: [
      { title: c("Content as product architecture", "Content als Produktarchitektur"), text: c(`Contract books, clauses, glossary terms, certification material and expert articles each need their own user journey while sharing one knowledge model. The data layer is typed TypeScript rather than a CMS: every clause, term and quiz question holds all three language variants in its own structure, so a missing translation fails the build instead of shipping a half-empty page. 117 articles, ${projectFacts.fidicClauses.value} dissected clauses and ${projectFacts.fidicGlossaryTerms.value} glossary terms sit on that model.`, `Vertragsbücher, Klauseln, Glossarbegriffe, Zertifizierungsmaterial und Fachartikel brauchen je eigene User Journeys bei einem gemeinsamen Wissensmodell. Die Datenebene ist typisiertes TypeScript statt eines CMS: Jede Klausel, jeder Begriff und jede Testfrage hält alle drei Sprachvarianten in der eigenen Struktur — eine fehlende Übersetzung bricht den Build, statt eine halbleere Seite auszuliefern. 117 Artikel, ${projectFacts.fidicClauses.de ?? projectFacts.fidicClauses.value} aufgeschlüsselte Klauseln und ${projectFacts.fidicGlossaryTerms.de ?? projectFacts.fidicGlossaryTerms.value} Glossarbegriffe liegen auf diesem Modell.`) },
      { title: c("Tools, not just reading", "Werkzeuge statt nur Lesestoff"), text: c("The distinguishing part is not the articles, it is sixteen working tools that calculate rather than describe: a 28-day time-bar under Sub-Clause 20.2, extension-of-time and delay models, liquidated damages against the cap, interim payment under Clause 14, DAAB procedural timelines, a claim-readiness questionnaire scored across twelve checkpoints. Every calculation runs in the browser, so nothing a user types about a live dispute leaves their device.", "Das Unterscheidende sind nicht die Artikel, sondern sechzehn funktionierende Werkzeuge, die rechnen statt beschreiben: die 28-Tage-Frist nach Sub-Clause 20.2, EOT- und Delay-Modelle, Vertragsstrafen gegen die Obergrenze, Interim Payment nach Clause 14, DAAB-Verfahrensfristen, ein Claim-Readiness-Fragebogen mit Punktwertung über zwölf Kontrollpunkte. Alle Berechnungen laufen im Browser — nichts, was ein Nutzer über einen laufenden Streit eingibt, verlässt sein Gerät.") },
      { title: c("A data layer that maintains itself", "Eine Datenebene, die sich selbst pflegt"), text: c("A daily job merges World Bank procurement notices into a cumulative archive of more than 2,900 records across eight countries, back to 2019. The upstream API only ever returns a rolling window, so a notice that drops out of the feed is gone for good — which is why the pipeline merges rather than overwrites, and exits non-zero on an upstream failure instead of quietly saving an empty snapshot. Each bot commit carries the current open-versus-total count, so the archive's health is readable from the git log alone.", "Ein täglicher Job führt Ausschreibungen der Weltbank zu einem kumulativen Archiv von mehr als 2.900 Einträgen aus acht Ländern zusammen, zurück bis 2019. Die Quell-API liefert immer nur ein gleitendes Fenster — eine herausgefallene Ausschreibung ist endgültig weg. Deshalb führt die Pipeline zusammen statt zu überschreiben und endet bei einem Ausfall mit Fehlercode, statt still einen leeren Snapshot zu speichern. Jeder Bot-Commit trägt den Stand offener zu gesamter Ausschreibungen — der Zustand des Archivs ist allein aus dem Git-Log ablesbar.") },
      { title: c("Search at platform scale", "Search auf Plattformniveau"), text: c("429 static pages need structure a crawler can reason about: stable routes with a single trailing-slash policy, a canonical everywhere, complete hreflang clusters, and thirty-two distinct schema.org types describing what each page actually is. One deliberate exception is documented — a Georgian landing page is kept out of the three-language cluster on purpose, so it cannot send a contradictory signal about which version serves whom.", "429 statische Seiten brauchen eine Struktur, mit der ein Crawler umgehen kann: stabile Routen mit einer einzigen Trailing-Slash-Regel, überall ein Canonical, vollständige hreflang-Cluster und zweiunddreißig verschiedene schema.org-Typen, die beschreiben, was eine Seite wirklich ist. Eine bewusste Ausnahme ist dokumentiert: Eine georgische Landingpage bleibt absichtlich außerhalb des Drei-Sprachen-Clusters, damit sie kein widersprüchliches Signal darüber sendet, welche Version wem dient.") },
      { title: c("Trust that has to be verifiable", "Vertrauen, das prüfbar sein muss"), text: c("Training certificates are issued by a CLI script into a versioned registry with a QR code, and anyone can verify one on a public page. Certificate pages are force-noindexed so personal data never reaches search results, and verification is built to stay reachable independently of the rest of the site — someone holding a document should not depend on the portal's publication status to prove they hold it.", "Schulungszertifikate werden per CLI-Skript in ein versioniertes Register mit QR-Code eingetragen, prüfen kann sie jeder auf einer öffentlichen Seite. Zertifikatsseiten sind zwingend noindex, damit personenbezogene Daten nie in Suchergebnisse geraten, und die Prüfung bleibt unabhängig vom Rest der Website erreichbar — wer ein Dokument hält, sollte für den Nachweis nicht vom Veröffentlichungsstatus des Portals abhängen.") },
      { title: c("Performance as an editing decision", "Performance als Redaktionsentscheidung"), text: c("Four Three.js scenes, smooth scroll and a custom cursor shipped, then got measured. Smooth scroll was dropped on mobile because it cost LCP, page CSS was inlined so a failed request cannot strip a page of styling, and reveal logic was moved outside the build bundle so content survives a broken asset. The tender table rebuilds itself as cards on a phone. Most of the engineering was subtraction.", "Vier Three.js-Szenen, Smooth Scroll und ein eigener Cursor gingen live und wurden dann gemessen. Smooth Scroll fiel auf Mobilgeräten weg, weil er LCP kostete; Seiten-CSS wird inline ausgeliefert, damit ein fehlgeschlagener Request keine Seite entkleidet; die Reveal-Logik liegt außerhalb des Build-Bundles, damit Inhalte ein defektes Asset überleben. Die Tender-Tabelle baut sich auf dem Telefon als Karten neu auf. Der größte Teil des Engineerings war Weglassen.") },
      { title: c("Solo delivery with AI assistance", "Solo-Auslieferung mit AI-Assistenz"), text: c("Creative direction, scope and final acceptance stayed human, and on subject-matter work that is not a preference but a requirement: a generated paragraph about a FIDIC clause reads exactly as confident when it is wrong, so the model drafts and domain knowledge decides. Roughly 48,000 lines of code across 2,512 versioned files, shipped and maintained by one person.", "Creative Direction, Scope und finale Abnahme blieben menschlich — bei Fachinhalten ist das keine Vorliebe, sondern Voraussetzung: Ein generierter Absatz über eine FIDIC-Klausel klingt genauso überzeugt, wenn er falsch ist. Das Modell liefert den Entwurf, entschieden wird mit Fachwissen. Rund 48.000 Zeilen Code über 2.512 versionierte Dateien, ausgeliefert und gepflegt von einer Person.") },
    ],
    relatedService: "digital-marketing",
  },
  "threejs-marketing": {
    key: "threejs-marketing",
    paths: { en: "/en/insights/threejs-marketing-websites/", de: "/de/insights/threejs-marketing-websites/" },
    title: c("When Three.js improves a marketing website", "Wann Three.js eine Marketing-Website verbessert"),
    description: c("A practical framework for using Three.js, WebGL and motion without sacrificing accessibility, SEO or performance.", "Ein praktisches Framework für Three.js, WebGL und Motion ohne Verlust von Accessibility, SEO oder Performance."),
    dek: c("Spatial interaction earns its place when it makes a proposition clearer, a system more explorable or a transition more memorable.", "Räumliche Interaktion verdient ihren Platz, wenn sie ein Angebot klarer, ein System erkundbarer oder einen Übergang erinnerbarer macht."),
    sections: [
      { title: c("HTML remains the source of truth", "HTML bleibt die Quelle der Wahrheit"), text: c("Core messages, links and evidence stay server-rendered. WebGL enhances the interface; it is never the only place meaning exists. The practical test is simple: disable JavaScript and see whether the page still makes its argument. If it does not, the site has traded its search visibility for an effect — and search engines are not the only ones affected, because that is also what a visitor on a failing connection gets.", "Kernbotschaften, Links und Belege bleiben serverseitig gerendert. WebGL erweitert das Interface, es ist nie der einzige Ort, an dem Bedeutung existiert. Der praktische Test ist einfach: JavaScript abschalten und prüfen, ob die Seite ihr Argument noch macht. Wenn nicht, hat die Website ihre Sichtbarkeit gegen einen Effekt getauscht — und betroffen sind nicht nur Suchmaschinen, denn genau das bekommt auch ein Besucher mit schlechter Verbindung.") },
      { title: c("Motion needs a job", "Motion braucht eine Aufgabe"), text: c("Camera movement should show hierarchy, shaders should support a transition, a 3D object should embody the subject. Bridge Consult assembles a bridge as its case study opens; FIDIC unfolds a contract atlas. Neither is a modal, and neither is decoration — each one is the subject of the page, moving. Anything that cannot answer what it is for gets removed, which on this site meant most of the first draft.", "Kamerabewegung soll Hierarchie zeigen, Shader sollen einen Übergang tragen, ein 3D-Objekt soll das Thema verkörpern. Bridge Consult setzt beim Öffnen seiner Case Study eine Brücke zusammen, FIDIC blättert einen Vertragsatlas auf. Keines ist ein Modal, keines ist Dekoration — jedes ist das Thema der Seite in Bewegung. Was nicht beantworten kann, wofür es da ist, fliegt raus; auf dieser Website war das der größte Teil des ersten Entwurfs.") },
      { title: c("Performance is art direction", "Performance ist Art Direction"), text: c("DPR caps, texture budgets, adaptive frame rates, pausing when the tab is hidden and isolated rendering layers shape the final aesthetic as much as materials do. Constrained devices are opted out entirely: Save-Data, two gigabytes of memory or two hardware threads get the CSS background instead of a WebGL context, which is what a WebGL failure would leave them with anyway — so there is no second code path to maintain.", "DPR-Caps, Texture-Budgets, adaptive Frameraten, Pause bei verborgenem Tab und isolierte Rendering-Layer prägen die Ästhetik genauso wie Materialien. Schwache Geräte werden ganz ausgenommen: Save-Data, zwei Gigabyte Speicher oder zwei Hardware-Threads bekommen den CSS-Hintergrund statt eines WebGL-Kontexts — also das, was ihnen ein WebGL-Fehler ohnehin hinterließe. Es gibt keinen zweiten Codepfad zu pflegen.") },
      { title: c("The mobile GPU is a different budget", "Die Handy-GPU ist ein anderes Budget"), text: c("A desktop-comfortable scene can be unusable on a phone for reasons that never show up in a local test. This site rendered every frame twice in its archive — the scene into a render target, then a fullscreen composite for grain and vignette — and on a phone GPU that memory bandwidth is the entire budget. It now draws straight to the screen and only spins the composite up during a transition wipe.", "Eine am Desktop bequeme Szene kann auf einem Telefon unbrauchbar sein, aus Gründen, die im lokalen Test nie auftauchen. Diese Website renderte im Archiv jeden Frame doppelt — die Szene in ein Render-Target, dann ein Vollbild-Composite für Korn und Vignette — und auf einer Handy-GPU ist diese Speicherbandbreite das gesamte Budget. Jetzt wird direkt auf den Bildschirm gezeichnet, das Composite läuft nur während eines Übergangs.") },
      { title: c("Reduced motion is not an off switch", "Reduced Motion ist kein Ausschalter"), text: c("Respecting prefers-reduced-motion means slowing something down, not freezing it. This site paused its preloader object with animation-play-state, and on any phone with Reduce Motion enabled that read as a broken page — a cube standing still. It now turns slowly instead of dying. Accessibility settings describe a preference about movement, not a request for a stopped interface.", "prefers-reduced-motion zu respektieren heißt verlangsamen, nicht einfrieren. Diese Website hielt ihr Preloader-Objekt mit animation-play-state an, und auf jedem Telefon mit aktiviertem Reduce Motion las sich das als kaputte Seite — ein stillstehender Würfel. Jetzt dreht er sich langsam, statt zu sterben. Accessibility-Einstellungen beschreiben eine Vorliebe zu Bewegung, nicht den Wunsch nach einem angehaltenen Interface.") },
      { title: c("Load it late, or not at all", "Spät laden — oder gar nicht"), text: c("The three.js runtime is around 132 KB compressed and half a megabyte to parse, so when it loads matters as much as whether. Measured on this site it starts downloading roughly three seconds in, well past the window that decides LCP. Going further than that is not automatically better — the obvious next optimisation made the bundle larger, which is the sort of thing only a measurement tells you.", "Die three.js-Runtime ist rund 132 KB komprimiert und ein halbes Megabyte zum Parsen — wann sie lädt, zählt so viel wie ob. Auf dieser Website beginnt der Download nach etwa drei Sekunden, weit nach dem Fenster, das den LCP bestimmt. Weiterzugehen ist nicht automatisch besser: Die naheliegende nächste Optimierung machte das Bundle größer — so etwas verrät nur eine Messung.") },
    ],
    relatedService: "creative-development",
  },
  "ai-development": {
    key: "ai-development",
    paths: { en: "/en/insights/ai-assisted-creative-development/", de: "/de/insights/ai-assisted-creative-development/" },
    title: c("AI-assisted development without outsourcing the vision", "AI-assisted Development, ohne die Vision auszulagern"),
    description: c("Where AI actually helps in production web development, where it is the wrong tool, and which decisions stay with the person who signs off the result.", "Wo KI in produktiver Webentwicklung wirklich hilft, wo sie das falsche Werkzeug ist, und welche Entscheidungen bei der Person bleiben, die das Ergebnis verantwortet."),
    dek: c("AI becomes a serious production multiplier only when the human owner controls the brief, repository, evidence and final quality bar.", "AI wird erst dann zum ernsthaften Produktionshebel, wenn der menschliche Owner Briefing, Repository, Belege und Qualitätsmaßstab kontrolliert."),
    sections: [
      { title: c("Human ownership", "Menschliche Ownership"), text: c("Positioning, visual language, prioritisation and final acceptance stay with the creator. The system is judged on the shipped result, not the prompt transcript. The decision that matters most is also the one least visible in any output: what not to build. A model will happily produce eleven more pages; deciding the client needed one verifiable proposition instead is the part that changes the outcome.", "Positionierung, visuelle Sprache, Priorisierung und finale Abnahme bleiben beim Creator. Bewertet wird das ausgelieferte Ergebnis, nicht das Prompt-Protokoll. Die wichtigste Entscheidung ist zugleich die in keinem Output sichtbare: was nicht gebaut wird. Ein Modell produziert bereitwillig elf weitere Seiten; zu entscheiden, dass der Kunde stattdessen ein prüfbares Versprechen braucht, verändert das Ergebnis.") },
      { title: c("Where it is the wrong tool", "Wo sie das falsche Werkzeug ist"), text: c("Anywhere the answer has to be checkably true. A generated paragraph about a FIDIC clause reads exactly as confident when it is wrong as when it is right, so on subject-matter work the model drafts and the domain knowledge decides. Being able to reject an answer is the part that took years to acquire, and it is the part that does not transfer to whoever holds the subscription.", "Überall dort, wo die Antwort nachprüfbar stimmen muss. Ein generierter Absatz über eine FIDIC-Klausel klingt genauso überzeugt, wenn er falsch ist, wie wenn er stimmt — bei Fachinhalten liefert das Modell den Entwurf, entschieden wird mit Fachwissen. Eine Antwort zurückweisen zu können, ist der Teil, der Jahre gebraucht hat, und der Teil, der nicht auf den übergeht, der das Abo besitzt.") },
      { title: c("Evidence over mythology", "Belege statt Mythologie"), text: c("Build logs, public repositories, analytics context and live URLs make the workflow auditable. The engineering log goes further and records the changes that were measured and then thrown away, which is the harder half to show. Tooling does not produce that record; being accountable for the result does.", "Build-Logs, öffentliche Repositories, Analytics-Kontext und Live-URLs machen den Workflow nachvollziehbar. Das Engineering-Log geht weiter und hält auch die Änderungen fest, die gemessen und dann verworfen wurden — die schwerer zu zeigende Hälfte. Dieses Protokoll erzeugt kein Werkzeug, sondern die Verantwortung für das Ergebnis.") },
      { title: c("The review loop is the work", "Die Prüfschleife ist die Arbeit"), text: c("Generated code is reviewed in repository context, against a running site, on real devices — not read once and accepted. The findings that matter most tend to come from measurement rather than reading, because the expensive mistakes are invisible in a diff: they are about what the page does on a phone, not what the code says.", "Generierter Code wird im Repository-Kontext geprüft, gegen eine laufende Website, auf echten Geräten — nicht einmal gelesen und abgenickt. Die wichtigsten Funde kommen meist aus Messung statt Lektüre, denn die teuren Fehler sind im Diff unsichtbar: Es geht darum, was die Seite auf einem Telefon tut, nicht was der Code sagt.") },
      // Deliberately not the home page's version of this argument. That one is
      // the short objection every visitor arrives with; this is the long form,
      // and restating it word for word made two pages read as one paste.
      { title: c("What a client is actually buying", "Was ein Kunde tatsächlich kauft"), text: c("Not production capacity — that is cheap now and getting cheaper. What a rate buys is judgement under uncertainty: which of two plausible answers survives contact with a real Search Console export, which requested feature to argue against, and what to do at the point where the generated version is ninety per cent right and the last ten per cent is the part that fails in production. It also buys someone reachable in six months, which no model currently is. A generated site is a snapshot; a maintained one is an operation, and the gap between them opens months after launch.", "Nicht Produktionskapazität — die ist inzwischen billig und wird billiger. Ein Honorar kauft Urteilsvermögen unter Unsicherheit: welche von zwei plausiblen Antworten den Abgleich mit einem echten Search-Console-Export übersteht, gegen welchen gewünschten Baustein zu argumentieren ist, und was zu tun ist an dem Punkt, an dem die generierte Fassung zu neunzig Prozent stimmt und die letzten zehn Prozent genau der Teil sind, der in der Produktion bricht. Und es kauft jemanden, der in sechs Monaten erreichbar ist — was derzeit auf kein Modell zutrifft. Eine generierte Website ist eine Momentaufnahme, eine gepflegte ist ein Betrieb; der Abstand öffnet sich Monate nach dem Launch.") },
    ],
    relatedService: "digital-marketing",
  },

};

export const pick = (value: LocalizedCopy, lang: SeoLang) => value[lang];

