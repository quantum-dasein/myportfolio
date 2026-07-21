export type SeoLang = "en" | "de";
export type ServiceKey = "digital-marketing" | "technical-seo" | "creative-development";
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
  proof: Array<{ value: string; label: LocalizedCopy }>;
  faq: Array<{ question: LocalizedCopy; answer: LocalizedCopy }>;
}

const c = (en: string, de: string): LocalizedCopy => ({ en, de });

export const serviceContent: Record<ServiceKey, ServiceContent> = {
  "digital-marketing": {
    key: "digital-marketing",
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
      { title: c("Positioning and research", "Positionierung und Research"), text: c("Market framing, audience logic and a clear editorial proposition before production begins.", "Marktrahmen, Zielgruppenlogik und ein klares redaktionelles Versprechen vor dem Produktionsstart.") },
      { title: c("Content and distribution", "Content und Distribution"), text: c("Multilingual information architecture, landing pages, case studies and channel-ready assets.", "Mehrsprachige Informationsarchitektur, Landingpages, Case Studies und kanalfähige Assets.") },
      { title: c("Web and measurement", "Web und Messbarkeit"), text: c("Astro builds, technical SEO, analytics events and launch feedback loops in one delivery.", "Astro-Builds, Technical SEO, Analytics-Events und Launch-Feedback-Loops in einer Auslieferung.") },
    ],
    proof: [
      { value: "+780%", label: c("organic-search sessions after the Bridge Consult launch", "Organic-Search-Sitzungen nach dem Bridge-Consult-Launch") },
      { value: "109", label: c("production routes in the FIDIC knowledge platform", "produktive Routen in der FIDIC-Wissensplattform") },
      { value: "RU / EN / UZ", label: c("multilingual content and routing system", "mehrsprachiges Content- und Routing-System") },
    ],
    faq: [
      { question: c("What does a digital marketing project include?", "Was umfasst ein Digital-Marketing-Projekt?"), answer: c("Depending on the goal: positioning, research, content architecture, SEO, website production, analytics and launch optimization.", "Je nach Ziel: Positionierung, Research, Content-Architektur, SEO, Website-Produktion, Analytics und Launch-Optimierung.") },
      { question: c("Do you also implement the website?", "Setzt du die Website auch technisch um?"), answer: c("Yes. I build with Astro, TypeScript, GSAP and Three.js, using AI-assisted engineering where it improves speed without outsourcing creative direction.", "Ja. Ich arbeite mit Astro, TypeScript, GSAP und Three.js und nutze AI-assisted Engineering dort, wo es Tempo bringt, ohne die Creative Direction auszulagern.") },
    ],
  },
  "technical-seo": {
    key: "technical-seo",
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
      { title: c("Indexation architecture", "Indexierungsarchitektur"), text: c("Canonicals, hreflang, robots directives, XML sitemaps and stable URL systems.", "Canonicals, hreflang, Robots-Direktiven, XML-Sitemaps und stabile URL-Systeme.") },
      { title: c("Semantic evidence", "Semantische Belege"), text: c("Person, Service, Article, FAQ, Video and Breadcrumb structured data aligned with visible content.", "Person-, Service-, Article-, FAQ-, Video- und Breadcrumb-Daten passend zum sichtbaren Inhalt.") },
      { title: c("Performance and rendering", "Performance und Rendering"), text: c("SSR/static HTML, image discipline, JavaScript budgets and WebGL isolation for reliable Core Web Vitals.", "SSR/statisches HTML, Bilddisziplin, JavaScript-Budgets und WebGL-Isolation für verlässliche Core Web Vitals.") },
    ],
    proof: [
      { value: "+780%", label: c("organic-search growth in the early Bridge launch window", "Organic-Search-Wachstum im frühen Bridge-Launch-Fenster") },
      { value: "105", label: c("expert articles structured for the FIDIC platform", "für die FIDIC-Plattform strukturierte Fachartikel") },
      { value: "3", label: c("languages with explicit routing and search signals", "Sprachen mit explizitem Routing und Search-Signalen") },
    ],
    faq: [
      { question: c("Is technical SEO only a one-time audit?", "Ist Technical SEO nur ein einmaliges Audit?"), answer: c("No. The strongest result is an implementation system: templates, checks and publishing rules that keep future pages crawlable.", "Nein. Das stärkste Ergebnis ist ein Umsetzungssystem aus Templates, Checks und Publishing-Regeln, das auch künftige Seiten crawlbar hält.") },
      { question: c("Can a Three.js site rank?", "Kann eine Three.js-Website ranken?"), answer: c("Yes, when the WebGL experience enhances server-rendered semantic content instead of replacing it.", "Ja, wenn das WebGL-Erlebnis serverseitig gerenderten semantischen Content ergänzt, statt ihn zu ersetzen.") },
    ],
  },
  "creative-development": {
    key: "creative-development",
    paths: { en: "/en/creative-development-vienna/", de: "/de/creative-development-wien/" },
    title: c("Creative Development in Vienna with marketing intent.", "Creative Development in Wien mit Marketing-Intention."),
    description: c(
      "Creative development in Vienna combining Astro, Three.js, GSAP, Cinema 4D, Redshift and motion design with measurable marketing outcomes.",
      "Creative Development in Wien mit Astro, Three.js, GSAP, Cinema 4D, Redshift und Motion Design für messbare Marketing-Ergebnisse.",
    ),
    eyebrow: c("Creative Development / Vienna", "Creative Development / Wien"),
    lead: c(
      "I use motion and spatial interaction to clarify a positioning, not to hide it. The craft stack spans code, Cinema 4D, Redshift, After Effects, Premiere Pro and Photoshop.",
      "Ich nutze Motion und räumliche Interaktion, um eine Positionierung zu schärfen, nicht um sie zu verdecken. Der Craft-Stack reicht von Code bis Cinema 4D, Redshift, After Effects, Premiere Pro und Photoshop.",
    ),
    capabilities: [
      { title: c("Spatial web", "Spatial Web"), text: c("Three.js scenes, shader-led transitions, interactive archives and motion systems built around usable HTML.", "Three.js-Szenen, shaderbasierte Übergänge, interaktive Archive und Motion-Systeme rund um nutzbares HTML.") },
      { title: c("3D and motion", "3D und Motion"), text: c("Cinema 4D and Redshift visualization, After Effects compositing and Premiere Pro editing.", "Cinema-4D- und Redshift-Visualisierung, After-Effects-Compositing und Premiere-Pro-Schnitt.") },
      { title: c("Production engineering", "Production Engineering"), text: c("Responsive components, performance budgets, accessibility and SEO integrated into the visual system.", "Responsive Components, Performance-Budgets, Accessibility und SEO direkt im visuellen System.") },
    ],
    proof: [
      { value: "11", label: c("interactive archive sectors", "interaktive Archiv-Sektoren") },
      { value: "60 FPS", label: c("target for motion and WebGL experiences", "Zielwert für Motion- und WebGL-Erlebnisse") },
      { value: "C4D + RS", label: c("Cinema 4D and Redshift production pipeline", "Cinema-4D- und Redshift-Produktionspipeline") },
    ],
    faq: [
      { question: c("Is creative development the same as 3D design?", "Ist Creative Development dasselbe wie 3D Design?"), answer: c("No. It connects concept, interface, motion and engineering. 3D is one tool inside a broader digital system.", "Nein. Es verbindet Konzept, Interface, Motion und Engineering. 3D ist ein Werkzeug innerhalb eines größeren digitalen Systems.") },
      { question: c("Can the experience remain accessible and fast?", "Kann das Erlebnis zugänglich und schnell bleiben?"), answer: c("Yes. Reduced-motion modes, semantic HTML, responsive art direction and strict rendering budgets are part of the build.", "Ja. Reduced-Motion-Modi, semantisches HTML, responsive Art Direction und klare Rendering-Budgets gehören zum Build.") },
    ],
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
      { title: c("The business problem", "Das Business-Problem"), text: c("Bridge Consult needed to turn dense FIDIC, feasibility and infrastructure experience into immediate authority for international decision-makers.", "Bridge Consult musste dichte FIDIC-, Feasibility- und Infrastruktur-Erfahrung in unmittelbare Autorität für internationale Entscheider übersetzen.") },
      { title: c("The system", "Das System"), text: c("Positioning, RU/EN/UZ information architecture, Astro templates, structured search layers and a Three.js project experience were designed as one product.", "Positionierung, RU/EN/UZ-Informationsarchitektur, Astro-Templates, strukturierte Search-Layer und eine Three.js-Projektwelt wurden als ein Produkt gestaltet.") },
      { title: c("The signal", "Das Signal"), text: c("The early GA4 comparison showed 44 organic-search sessions versus a baseline of five: a 780 percent increase. It is an early signal, not a lifetime forecast, and is presented with its measurement context.", "Der frühe GA4-Vergleich zeigte 44 Organic-Search-Sitzungen gegenüber einer Baseline von fünf: ein Plus von 780 Prozent. Das ist ein frühes Signal, keine Langzeitprognose, und wird mit seinem Messkontext gezeigt.") },
    ],
    relatedService: "technical-seo",
  },
  "fidic-platform": {
    key: "fidic-platform",
    paths: { en: "/en/insights/fidic-knowledge-platform/", de: "/de/insights/fidic-wissensplattform/" },
    title: c("FIDIC.uz: designing a contract knowledge operating system", "FIDIC.uz: ein Betriebssystem für Vertragswissen gestalten"),
    description: c("How a multilingual FIDIC platform combines 109 routes, 105 expert articles, contract books, tools and technical SEO.", "Wie eine mehrsprachige FIDIC-Plattform 109 Routen, 105 Fachartikel, Vertragsbücher, Tools und Technical SEO verbindet."),
    dek: c("The challenge was not another brochure, but a navigable professional platform for dense infrastructure-contract knowledge.", "Die Aufgabe war keine weitere Broschüre, sondern eine navigierbare professionelle Plattform für dichtes Infrastruktur-Vertragswissen."),
    sections: [
      { title: c("Content as product architecture", "Content als Produktarchitektur"), text: c("Contract books, clauses, certifications, calculators and expert articles require distinct user journeys while sharing a consistent knowledge model.", "Vertragsbücher, Klauseln, Zertifikate, Rechner und Fachartikel brauchen eigene User Journeys und zugleich ein konsistentes Wissensmodell.") },
      { title: c("Search at platform scale", "Search auf Plattformniveau"), text: c("Stable routes, canonical rules, schema, internal linking and sitemap generation make the growing library understandable to both users and crawlers.", "Stabile Routen, Canonical-Regeln, Schema, interne Verlinkung und Sitemap-Generierung machen die wachsende Bibliothek für Nutzer und Crawler verständlich.") },
      { title: c("Solo delivery with AI assistance", "Solo-Auslieferung mit AI-Assistenz"), text: c("Creative direction and final decisions remained human. Specialized AI tools accelerated research, code review and repetitive engineering inside a controlled repository workflow.", "Creative Direction und finale Entscheidungen blieben menschlich. Spezialisierte AI-Tools beschleunigten Research, Code Review und wiederholbares Engineering in einem kontrollierten Repository-Workflow.") },
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
      { title: c("HTML remains the source of truth", "HTML bleibt die Quelle der Wahrheit"), text: c("Core messages, links and evidence should remain server-rendered. WebGL enhances the interface instead of becoming the only place where meaning exists.", "Kernbotschaften, Links und Belege bleiben serverseitig gerendert. WebGL erweitert das Interface, statt der einzige Ort für Bedeutung zu sein.") },
      { title: c("Motion needs a job", "Motion braucht eine Aufgabe"), text: c("Use camera movement to show hierarchy, shaders to support transitions and 3D objects to embody the subject. Decorative load without meaning is removed.", "Kamerabewegung zeigt Hierarchie, Shader tragen Übergänge und 3D-Objekte verkörpern das Thema. Dekorative Last ohne Bedeutung wird entfernt.") },
      { title: c("Performance is art direction", "Performance ist Art Direction"), text: c("DPR caps, texture budgets, visibility pausing, reduced-motion behavior and isolated rendering layers shape the final aesthetic as much as materials do.", "DPR-Caps, Texture-Budgets, Visibility-Pausing, Reduced-Motion-Verhalten und isolierte Rendering-Layer prägen die Ästhetik genauso wie Materialien.") },
    ],
    relatedService: "creative-development",
  },
  "ai-development": {
    key: "ai-development",
    paths: { en: "/en/insights/ai-assisted-creative-development/", de: "/de/insights/ai-assisted-creative-development/" },
    title: c("AI-assisted development without outsourcing the vision", "AI-assisted Development, ohne die Vision auszulagern"),
    description: c("A transparent workflow for combining human creative direction with Claude, Codex, Cursor and Gemini in production web development.", "Ein transparenter Workflow, der menschliche Creative Direction mit Claude, Codex, Cursor und Gemini in produktiver Webentwicklung verbindet."),
    dek: c("AI becomes a serious production multiplier only when the human owner controls the brief, repository, evidence and final quality bar.", "AI wird erst dann zum ernsthaften Produktionshebel, wenn der menschliche Owner Briefing, Repository, Belege und Qualitätsmaßstab kontrolliert."),
    sections: [
      { title: c("Human ownership", "Menschliche Ownership"), text: c("Positioning, visual language, prioritization and final acceptance stay with the creator. The system is judged on the shipped result, not the prompt transcript.", "Positionierung, visuelle Sprache, Priorisierung und finale Abnahme bleiben beim Creator. Bewertet wird das ausgelieferte Ergebnis, nicht das Prompt-Protokoll.") },
      { title: c("Specialized copilots", "Spezialisierte Copilots"), text: c("Gemini supports strategic exploration, Claude and Codex handle deep engineering passes, and Cursor accelerates repository-level implementation. Each output is reviewed in context.", "Gemini unterstützt strategische Exploration, Claude und Codex übernehmen tiefe Engineering-Pässe, Cursor beschleunigt die Umsetzung im Repository-Kontext. Jedes Ergebnis wird geprüft.") },
      { title: c("Evidence over mythology", "Belege statt Mythologie"), text: c("Build logs, public repositories, analytics context and live URLs make the workflow auditable. AI claims without shipped evidence are avoided.", "Build-Logs, öffentliche Repositories, Analytics-Kontext und Live-URLs machen den Workflow nachvollziehbar. AI-Behauptungen ohne ausgelieferte Belege werden vermieden.") },
    ],
    relatedService: "digital-marketing",
  },
};

export const pick = (value: LocalizedCopy, lang: SeoLang) => value[lang];

