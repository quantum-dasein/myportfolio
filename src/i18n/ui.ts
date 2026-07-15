// ─────────────────────────────────────────────────────────────────────────────
//  i18n dictionary — rodionbelousov.studio
//  Single source of truth for every string on the site, in EN + DE.
//  Used server-side by `useTranslations()` and serialized to the client
//  (window.__I18N__) so the language switcher can swap copy instantly.
//  Keys are flat + namespaced ("section.field") so both the Astro markup and
//  the client-side swapper can reference them via `data-i18n="<key>"`.
// ─────────────────────────────────────────────────────────────────────────────

export const languages = {
  en: "English",
  de: "Deutsch",
};

export const defaultLang = "en";

export const ui = {
  en: {
    "accessibility.skip-to-content": "Skip to content",

    // ── Meta / SEO ──────────────────────────────────────────────────────────
    "meta.title": "Rodion Belousov - Digital Marketer & Creative Developer",
    "meta.description":
      "Rodion Belousov is a digital marketer and creative developer building positioning, content, SEO and premium web experiences for brands that need to convert.",

    // ── Navigation ──────────────────────────────────────────────────────────
    "nav.intro": "Intro",
    "nav.work": "Work",
    "nav.about": "Studio",
    "nav.reel": "Reel",
    "nav.gallery": "Archive",
    "nav.studio": "Studio",
    "nav.contact": "Contact",
    "nav.cta": "Start a project",
    "lang.en": "EN",
    "lang.de": "DE",
    "lang.switch": "Switch language",

    // ── Hero ────────────────────────────────────────────────────────────────
    "hero.status": "Available for select projects · 2026",
    "hero.eyebrow": "Digital Marketer · Creative Developer",
    "hero.title.1": "Marketing that moves,",
    "hero.title.2": "websites that convert.",
    "hero.subtitle":
      "I'm Rodion Belousov: a digital marketer with creative-development range. I shape positioning, content, SEO, motion and websites into one launch system - so the idea does not die between strategy, visuals and execution.",
    "hero.cta.primary": "View selected work",
    "hero.cta.secondary": "Start a project",
    "hero.scroll": "Scroll",

    // ── About / Approach ────────────────────────────────────────────────────
    "about.label": "Approach",
    "about.title":
      "One operator for the messy space between strategy and launch.",
    "about.text":
      "I work where marketing usually gets fragmented: positioning in one file, content in another, SEO somewhere else, and the website treated like decoration. My edge is connecting the whole chain - market logic, copy, search intent, campaign assets, motion and the final interface - with a Master's focus in International Marketing and Brand Management behind it.",
    "about.pillar.1.title": "Marketing Strategy",
    "about.pillar.1.text":
      "Offer logic, audience insight, positioning and narrative - the strategic spine before anything becomes visual.",
    "about.pillar.2.title": "Content & SEO",
    "about.pillar.2.text":
      "Landing pages, expert articles, social assets, search structure and publishing systems that turn expertise into demand.",
    "about.pillar.3.title": "Creative Development",
    "about.pillar.3.text":
      "Astro, Three.js, GSAP and motion craft when the brand needs a digital surface that feels alive and still sells.",

    // ── Experience ──────────────────────────────────────────────────────────
    "exp.label": "Career",
    "exp.title": "Where I've built.",
    "exp.1.company": "Bridge Consult — Remote",
    "exp.1.role": "Marketing, Research & Web",
    "exp.1.period": "Dec 2024 — Oct 2025",
    "exp.1.text":
      "Translated complex infrastructure and FIDIC contract expertise into a premium digital presence — researching international construction projects, shaping feasibility studies and market analysis, then designing and building the Bridge Consult and fidic.uz sites on Astro + Three.js.",
    "exp.2.company": "Siemens — Eisenstadt, AT",
    "exp.2.role": "Marketing & Knowledge Management",
    "exp.2.period": "2023 — 2024",
    "exp.2.text":
      "Produced videos and motion graphics across marketing channels and aligned internal and external communication — reports, presentations and campaign assets — inside a global engineering brand.",
    "exp.3.company": "Awaken Trees — Vienna",
    "exp.3.role": "Motion & Content, Volunteer",
    "exp.3.period": "2022",
    "exp.3.text":
      "Created an animated explainer for the FMNR reforestation method and a stream of social content — proof that premium visual storytelling can move people toward real-world impact.",

    // ── Education ───────────────────────────────────────────────────────────
    "edu.label": "Education",
    "edu.title": "The marketing foundation behind the craft.",
    "edu.1.degree": "M.A. International Business Relations",
    "edu.1.school":
      "Hochschule Burgenland — Applied Business Law & International Marketing",
    "edu.1.period": "2025 — present",
    "edu.2.degree": "B.A. International Business Relations",
    "edu.2.school":
      "Hochschule Burgenland — Marketing, E-Commerce & Accounting",
    "edu.2.period": "2021 — 2025",
    "edu.3.degree": "Advanced Bridging Programme",
    "edu.3.school": "Hochschule Burgenland",
    "edu.3.period": "2020 — 2021",
    "edu.langs.label": "Languages",
    "edu.langs.value":
      "German C2 · English C1 · Russian native · Czech A2–B1",
    "edu.stack.label": "Toolkit",
    "edu.stack.value":
      "Marketing strategy · Content systems · SEO · Analytics · Astro · Three.js · GSAP · Cinema 4D · Redshift · After Effects · Premiere Pro · Photoshop",

    // ── Selected Work (teaser — immersive cases land next) ───────────────────
    "work.label": "Selected Work",
    "work.title": "Two marketing builds. One standard: premium.",
    "work.text":
      "Two digital systems I conceived and built solo: strategy, content, technical SEO and Astro front-end from one hand, with Claude, Cursor and Codex as my AI toolchain.",
    "work.1.tag": "Astro · GSAP · Technical SEO",
    "work.1.title": "Bridge Consult",
    "work.1.role": "Solo build · Strategy, code & SEO",
    "work.1.year": "2026",
    "work.1.text":
      "Positioning, content architecture, Astro/GSAP code and technical SEO built into one premium corporate system for an international construction consultancy.",
    "work.2.tag": "Astro · Content · Technical SEO",
    "work.2.title": "FIDIC — fidic.uz",
    "work.2.role": "Solo build · Content, code & SEO",
    "work.2.year": "2026",
    "work.2.text":
      "A solo-built FIDIC knowledge platform combining search architecture, scalable content, Astro engineering and a premium motion system.",
    "work.cta": "Open project",
    "work.more": "Full immersive case studies — next.",

    // Case studies
    "case.back": "Back to selected work",
    "case.next": "Next case",
    "case.visit": "Visit live site",
    "case.role": "Role",
    "case.stack": "Stack",
    "case.year": "Year",
    "case.scope": "Scope",
    "case.problem": "Challenge",
    "case.solution": "System",
    "case.outcome": "Outcome",
    "case.highlights": "Highlights",
    "case.process": "Build logic",
    "case.visual": "Visual language",
    "case.bridge.kicker": "Case Study / Infrastructure Consulting",
    "case.bridge.title": "Bridge Consult",
    "case.bridge.subtitle":
      "A solo-built digital growth system for a Central Asian infrastructure consultancy: positioning, multilingual content, technical SEO and an interactive project universe shipped in one month.",
    "case.bridge.role.value": "Solo build: strategy, content, SEO, code and art direction",
    "case.bridge.scope.value": "3 locales, publishing system, lead generation, WebGL universe",
    "case.bridge.problem.text":
      "Bridge Consult works where infrastructure, FIDIC and high-stakes contract engineering meet. The old digital presence could not carry that authority across international contractors, public clients and development-bank projects. The challenge was not decoration; it was turning complex expertise into immediate trust in three languages.",
    "case.bridge.solution.text":
      "I designed and shipped the entire system solo: positioning, information architecture, RU/EN/UZ content, Astro templates, structured search layers, performance work and motion direction. A custom Three.js universe turns eight real infrastructure references into an explorable proof layer instead of another static project list.",
    "case.bridge.outcome.text":
      "Within the early launch window, Organic Search sessions grew from 5 to 44, active users reached 109 and the site recorded 865 events across Uzbekistan, the United States, Austria and Poland. The result is a working acquisition and publishing system, not a portfolio mockup.",
    "case.bridge.highlight.1": "Converted technical consulting language into a clear premium narrative.",
    "case.bridge.highlight.2": "Created a modular content structure for services, expertise and project intelligence.",
    "case.bridge.highlight.3": "Balanced cinematic motion with a conservative B2B trust signal.",
    "case.bridge.mantra": "Precision over noise.",
    "case.bridge.process.1": "Discovery - extracted the hard business signals: FIDIC, feasibility, market analysis, project research.",
    "case.bridge.process.2": "Architecture - shaped the site around credibility, scan speed and direct contact intent.",
    "case.bridge.process.3": "Build - shipped Astro 6, multilingual routing, automated sitemap logic, technical SEO and a custom Three.js project universe.",
    "case.bridge.visual.text":
      "Warm taupe, graphite and off-white; Inter for operational clarity, Playfair Display for editorial authority; generous whitespace, restrained motion and a cinematic Three.js project universe. The result feels like a contemporary infrastructure consultancy, not a generic corporate template.",

    "case.bridge.impact.title": "From launch to measurable demand.",
    "case.bridge.impact.text":
      "The website was not treated as a visual exercise. Content, technical SEO and the Astro build were designed as one acquisition system - then validated with real GA4 signals in the first launch window.",
    "case.bridge.impact.note":
      "Real GA4 launch data, translated into a live spatial model. Percentages compare the measured period with the preceding baseline; the original analytics export remains part of the project record.",
    "case.bridge.metric.organic": "Organic Search sessions",
    "case.bridge.metric.users": "Active users",
    "case.bridge.metric.events": "Event count",
    "case.bridge.metric.markets": "International markets",
    "case.bridge.system.title": "What was actually built.",
    "case.bridge.system.text": "Bridge Consult and fidic.uz were shipped as two connected launches in one focused month of 2026. Under the visual layer sits a reusable content, search and publishing architecture.",
    "case.bridge.system.positioning.title": "Authority, translated",
    "case.bridge.system.positioning.text": "FIDIC, claims, delay analysis and infrastructure advisory were shaped into a premium market narrative for international decision-makers.",
    "case.bridge.system.content.title": "One system, three languages",
    "case.bridge.system.content.text": "Russian, English and Uzbek routes share a consistent information architecture without flattening the meaning of specialist content.",
    "case.bridge.system.search.title": "Search as infrastructure",
    "case.bridge.system.search.text": "Canonical logic, hreflang, structured data, generated sitemaps and editorial content create a foundation for compounding organic discovery.",
    "case.bridge.system.universe.title": "Proof you can explore",
    "case.bridge.system.universe.text": "Eight infrastructure references live inside a custom draggable Three.js universe with project detail layers and resilient fallbacks.",
    "case.bridge.workflow.title": "One vision. Several specialist copilots.",
    "case.bridge.workflow.text":
      "The strategy, visual direction and final decisions stayed human. AI accelerated research and engineering, while every system was reviewed, shaped and shipped in repository context.",
    "case.bridge.workflow.human": "Original art direction, 3D assets and motion craft - designed by hand for a premium infrastructure brand.",
    "case.bridge.workflow.gemini": "Analytical sparring for structure drafts, presentation logic and the content framework.",
    "case.bridge.workflow.claude": "Architecture support for Astro, Three.js, automation and multilingual routing.",
    "case.bridge.workflow.cursor": "Repository-aware implementation, debugging and performance work with Cursor and Codex.",

    "case.fidic.kicker": "Case Study / Knowledge Platform",
    "case.fidic.title": "FIDIC - fidic.uz",
    "case.fidic.subtitle":
      "A fast, premium knowledge platform around FIDIC contract standards - built to make complex authoritative material feel navigable, trustworthy and modern.",
    "case.fidic.role.value": "Solo build: product strategy, content, SEO, code and art direction",
    "case.fidic.scope.value": "3 locales, 109 routes, 105 articles, 15 professional tools",
    "case.fidic.problem.text":
      "FIDIC content is dense by nature. The challenge was to avoid the usual legal-document fatigue and build a platform where users can enter through clarity: contract logic, learning paths, article structure and trust-first navigation.",
    "case.fidic.solution.text":
      "The platform uses a disciplined information architecture with cinematic surfaces: high-contrast sections, controlled scroll rhythm, motion cues and a dark spatial atmosphere. The content stays readable, search-ready and scalable, while the interface signals that this is not a basic archive - it is a premium professional resource.",
    "case.fidic.outcome.text":
      "FIDIC.uz becomes a credible digital home for contract-standard knowledge in the region: fast, structured, memorable and ready to scale into articles, explainers, education modules and expert-led content.",
    "case.fidic.highlight.1": "Turned complex contract standards into a navigable digital system.",
    "case.fidic.highlight.2": "Built an experience that feels authoritative without feeling static.",
    "case.fidic.highlight.3": "Prepared the platform for long-form content, SEO and expert publishing.",
    "case.fidic.mantra": "Clarity over density.",
    "case.fidic.process.1": "Map - grouped heavy topics into clearer user-facing entry points.",
    "case.fidic.process.2": "Frame - designed the interface around trust, hierarchy and momentum.",
    "case.fidic.process.3": "Ship - implemented the front-end with Astro, animation timing and performance discipline.",
    "case.fidic.visual.text":
      "Blueprint & Brass: deep ink surfaces, brass signals, monospaced technical labels, editorial grids and the color-coded Rainbow Book library. Dense contract knowledge becomes a navigable professional operating system rather than a legal-document archive.",
    "case.fidic.platform.title": "A contract knowledge operating system.",
    "case.fidic.platform.text": "Designed and shipped solo as a multilingual product, not a brochure: 109 Astro routes, 105 expert articles, nine contract books, professional tools, calculators, certification flows and an AI-assisted knowledge layer.",
    "case.fidic.metric.routes": "production routes",
    "case.fidic.metric.articles": "expert articles",
    "case.fidic.metric.books": "contract books",
    "case.fidic.metric.tools": "tools and calculators",
    "case.fidic.metric.languages": "complete languages",
    "case.fidic.layer.knowledge.title": "Knowledge graph",
    "case.fidic.layer.knowledge.text": "Clauses, glossary terms, expert articles and MDB cases connect specialist contract knowledge through structured, searchable content.",
    "case.fidic.layer.books.title": "Nine-book atlas",
    "case.fidic.layer.books.text": "Red through White Book profiles translate scope, risk and applicability into a visual contract library.",
    "case.fidic.layer.tools.title": "Professional workflows",
    "case.fidic.layer.tools.text": "Contract Map, Claim Readiness, Notice Deadline, risk scoring, tender labs and book selection turn reading into action.",
    "case.fidic.layer.calculators.title": "Contract calculators",
    "case.fidic.layer.calculators.text": "Time-bar, delay, damages, interim payment and DAAB timeline models make recurring commercial decisions faster.",
    "case.fidic.layer.ai.title": "Ask FIDIC layer",
    "case.fidic.layer.ai.text": "A serverless AI endpoint, search index and lead-routing layer connect expert content with direct user intent.",
    "case.fidic.layer.trust.title": "Trust infrastructure",
    "case.fidic.layer.trust.text": "Certificate issue and verification, multilingual metadata, OG generation, schema and sitemaps make authority machine-readable.",

    // ── Motion & 3D gallery ─────────────────────────────────────────────────
    "gallery.label": "Behance Showcase",
    "gallery.title": "Visual systems that support the message.",
    "gallery.text":
      "Selected Cinema 4D and Redshift renders, After Effects motion, Premiere Pro edits and Photoshop visuals - the craft layer I use when a marketing system needs atmosphere.",
    "gallery.cta": "View full gallery on Behance",
    "gallery.hint": "Drag to explore · Click to enter",
    "preloader.label": "Calibrating the void",
    "gallery.1.cat": "3D Product",
    "gallery.2.cat": "Motion",
    "gallery.3.cat": "Simulation",
    "gallery.4.cat": "Art Direction",
    "gallery.5.cat": "Generative",
    "gallery.6.cat": "Motion",

    // ── Portal to the 3D archive ────────────────────────────────────────────
    "portal.eyebrow": "The Archive",
    "portal.title": "Enter the archive.",
    "portal.text":
      "A dark spatial archive of visual experiments, campaign assets and web fragments. Fly through.",
    "portal.cta": "Enter the archive",
    "portal.back": "Studio",

    // ── Contact ─────────────────────────────────────────────────────────────
    "contact.label": "Contact",
    "contact.title": "Let's build something worth remembering.",
    "contact.text":
      "Available for selected marketing, content, SEO and premium web projects. Tell me what you're launching.",
    "contact.email": "rodionbelousov@protonmail.com",
    "contact.behance.label": "Behance - Creative Archive",
    "contact.location": "Vienna, Austria",
    "contact.cta": "Start a project",

    // ── Footer ──────────────────────────────────────────────────────────────
    "footer.cta.eyebrow": "Available for selected launches",
    "footer.cta.title": "Marketing, content, SEO and web - built as one system.",
    "footer.cta.button": "Start a project",
    "footer.tagline": "Digital Marketer · Creative Developer · Vienna",
    "footer.rights": "All rights reserved.",
  },

  de: {
    "accessibility.skip-to-content": "Zum Inhalt springen",

    // ── Meta / SEO ──────────────────────────────────────────────────────────
    "meta.title": "Rodion Belousov - Digital Marketer & Creative Developer",
    "meta.description":
      "Rodion Belousov ist Digital Marketer und Creative Developer für Positionierung, Content, SEO und hochwertige Websites, die verkaufen.",

    // ── Navigation ──────────────────────────────────────────────────────────
    "nav.intro": "Intro",
    "nav.work": "Arbeiten",
    "nav.about": "Studio",
    "nav.reel": "Reel",
    "nav.gallery": "Archiv",
    "nav.studio": "Studio",
    "nav.contact": "Kontakt",
    "nav.cta": "Projekt starten",
    "lang.en": "EN",
    "lang.de": "DE",
    "lang.switch": "Sprache wechseln",

    // ── Hero ────────────────────────────────────────────────────────────────
    "hero.status": "Verfügbar für ausgewählte Projekte · 2026",
    "hero.eyebrow": "Digital Marketer · Creative Developer",
    "hero.title.1": "Marketing, das sich bewegt,",
    "hero.title.2": "Websites, die verkaufen.",
    "hero.subtitle":
      "Ich bin Rodion Belousov: Digital Marketer mit Creative-Development-Range. Ich verbinde Positionierung, Content, SEO, Motion und Websites zu einem Launch-System - damit eine Idee nicht zwischen Strategie, Visuals und Umsetzung stirbt.",
    "hero.cta.primary": "Ausgewählte Arbeiten",
    "hero.cta.secondary": "Projekt starten",
    "hero.scroll": "Scrollen",

    // ── About / Approach ────────────────────────────────────────────────────
    "about.label": "Ansatz",
    "about.title": "Ein Operator für den Raum zwischen Strategie und Launch.",
    "about.text":
      "Die meisten Projekte verlieren ihre Schärfe zwischen Business-Idee, Content-Plan und fertiger Website. Ich schließe diese Lücke. Mit Master-Fokus auf International Marketing und Brand Management sowie Erfahrung bei Siemens, im Consulting und in eigenen Builds verbinde ich Marktlogik mit Copy, Search Intent, Kampagnen und Interface.",
    "about.pillar.1.title": "Marketing-Strategie",
    "about.pillar.1.text":
      "Angebotslogik, Zielgruppenverständnis, Positionierung und Narrativ - die strategische Wirbelsäule, bevor etwas visuell wird.",
    "about.pillar.2.title": "Content & SEO",
    "about.pillar.2.text":
      "Landingpages, Fachartikel, Social Assets, Suchstruktur und Publishing-Systeme, die Expertise in Nachfrage verwandeln.",
    "about.pillar.3.title": "Creative Development",
    "about.pillar.3.text":
      "Astro, Three.js und GSAP, wenn ein Projekt eine hochwertige digitale Oberfläche braucht - schnell, einprägsam und an Marketingziele gebunden.",

    // ── Experience ──────────────────────────────────────────────────────────
    "exp.label": "Werdegang",
    "exp.title": "Wo ich gebaut habe.",
    "exp.1.company": "Bridge Consult — Remote",
    "exp.1.role": "Marketing, Research & Web",
    "exp.1.period": "Dez 2024 — Okt 2025",
    "exp.1.text":
      "Komplexe Infrastruktur- und FIDIC-Vertragsexpertise in eine erstklassige digitale Präsenz übersetzt — Recherche zu internationalen Bauprojekten, Aufbau von Feasibility Studies und Marktanalysen, dann Design und Umsetzung der Websites Bridge Consult und fidic.uz auf Astro + Three.js.",
    "exp.2.company": "Siemens — Eisenstadt, AT",
    "exp.2.role": "Marketing & Wissensmanagement",
    "exp.2.period": "2023 — 2024",
    "exp.2.text":
      "Videos und Motion Graphics für verschiedene Marketingkanäle produziert und interne wie externe Kommunikation abgestimmt — Berichte, Präsentationen und Kampagnen-Assets — innerhalb einer globalen Engineering-Marke.",
    "exp.3.company": "Awaken Trees — Wien",
    "exp.3.role": "Motion & Content, ehrenamtlich",
    "exp.3.period": "2022",
    "exp.3.text":
      "Ein animiertes Erklärvideo zur FMNR-Aufforstungsmethode und laufend Social-Content erstellt — der Beweis, dass erstklassiges visuelles Storytelling Menschen zu echter Wirkung bewegt.",

    // ── Education ───────────────────────────────────────────────────────────
    "edu.label": "Ausbildung",
    "edu.title": "Das Marketing-Fundament hinter dem Handwerk.",
    "edu.1.degree": "M.A. Internationale Wirtschaftsbeziehungen",
    "edu.1.school":
      "Hochschule Burgenland — Angewandtes Wirtschaftsrecht & Internationales Marketing",
    "edu.1.period": "2025 — heute",
    "edu.2.degree": "B.A. Internationale Wirtschaftsbeziehungen",
    "edu.2.school":
      "Hochschule Burgenland — Marketing, E-Commerce & Rechnungswesen",
    "edu.2.period": "2021 — 2025",
    "edu.3.degree": "Advanced Bridging Programme",
    "edu.3.school": "Hochschule Burgenland",
    "edu.3.period": "2020 — 2021",
    "edu.langs.label": "Sprachen",
    "edu.langs.value":
      "Deutsch C2 · Englisch C1 · Russisch Muttersprache · Tschechisch A2–B1",
    "edu.stack.label": "Toolkit",
    "edu.stack.value":
      "Marketingstrategie · Content-Systeme · SEO · Analytics · Astro · Three.js · GSAP · Cinema 4D · Redshift · After Effects · Premiere Pro · Photoshop",

    // ── Selected Work (teaser — immersive cases land next) ───────────────────
    "work.label": "Ausgewählte Arbeiten",
    "work.title": "Zwei Marketing-Builds. Ein Standard: erstklassig.",
    "work.text":
      "Zwei digitale Systeme, die ich solo konzipiert und gebaut habe: Strategie, Content, Technical SEO und Astro-Frontend aus einer Hand - mit Claude, Cursor und Codex als AI-Toolchain.",
    "work.1.tag": "Astro · GSAP · Technical SEO",
    "work.1.title": "Bridge Consult",
    "work.1.role": "Solo Build · Strategie, Code & SEO",
    "work.1.year": "2026",
    "work.1.text":
      "Positionierung, Content-Architektur, Astro/GSAP-Code und Technical SEO als ein Premium-System für ein internationales Bauberatungsunternehmen.",
    "work.2.tag": "Astro · Content · Technical SEO",
    "work.2.title": "FIDIC — fidic.uz",
    "work.2.role": "Solo Build · Content, Code & SEO",
    "work.2.year": "2026",
    "work.2.text":
      "Eine solo gebaute FIDIC-Wissensplattform, die Search-Architektur, skalierbaren Content, Astro-Engineering und ein hochwertiges Motion-System verbindet.",
    "work.cta": "Projekt öffnen",
    "work.more": "Vollständige immersive Case Studies — als Nächstes.",

    // Case Studies
    "case.back": "Zurück zu den Arbeiten",
    "case.next": "Nächster Case",
    "case.visit": "Live-Site besuchen",
    "case.role": "Rolle",
    "case.stack": "Stack",
    "case.year": "Jahr",
    "case.scope": "Umfang",
    "case.problem": "Herausforderung",
    "case.solution": "System",
    "case.outcome": "Ergebnis",
    "case.highlights": "Highlights",
    "case.process": "Build-Logik",
    "case.visual": "Visuelle Sprache",
    "case.bridge.kicker": "Case Study / Infrastruktur-Consulting",
    "case.bridge.title": "Bridge Consult",
    "case.bridge.subtitle":
      "Ein solo gebautes digitales Growth-System für eine zentralasiatische Infrastrukturberatung: Positionierung, mehrsprachiger Content, Technical SEO und eine interaktive Projektwelt in einem Monat umgesetzt.",
    "case.bridge.role.value": "Solo Build: Strategie, Content, SEO, Code und Art Direction",
    "case.bridge.scope.value": "3 Sprachen, Publishing-System, Leads, WebGL-Universum",
    "case.bridge.problem.text":
      "Bridge Consult arbeitet an der Schnittstelle von Infrastruktur, FIDIC und anspruchsvollem Contract Engineering. Der alte digitale Auftritt konnte diese Autorität gegenüber internationalen Auftragnehmern, öffentlichen Kunden und Entwicklungsbank-Projekten nicht transportieren. Die Aufgabe war nicht Dekoration, sondern komplexe Expertise in drei Sprachen sofort vertrauenswürdig zu machen.",
    "case.bridge.solution.text":
      "Ich habe das gesamte System solo konzipiert und ausgeliefert: Positionierung, Informationsarchitektur, RU/EN/UZ-Content, Astro-Templates, strukturierte Search-Layer, Performance und Motion Direction. Eine eigene Three.js-Welt macht acht reale Infrastrukturreferenzen als interaktiven Proof erfahrbar, statt sie in einer statischen Projektliste zu verstecken.",
    "case.bridge.outcome.text":
      "Im frühen Launch-Fenster stiegen Organic-Search-Sitzungen von 5 auf 44, 109 aktive Nutzer erzeugten 865 Events und der Traffic kam aus Usbekistan, den USA, Österreich und Polen. Das Ergebnis ist ein arbeitendes Akquisitions- und Publishing-System, kein Portfolio-Mockup.",
    "case.bridge.highlight.1": "Technische Consulting-Sprache in ein klares Premium-Narrativ übersetzt.",
    "case.bridge.highlight.2": "Modulare Struktur für Services, Expertise und Projektintelligenz geschaffen.",
    "case.bridge.highlight.3": "Cinematic Motion mit konservativen B2B-Vertrauenssignalen balanciert.",
    "case.bridge.mantra": "Präzision statt Rauschen.",
    "case.bridge.process.1": "Discovery - harte Business-Signale extrahiert: FIDIC, Feasibility, Marktanalyse, Projektrecherche.",
    "case.bridge.process.2": "Architektur - die Site auf Glaubwürdigkeit, Scan-Speed und Kontaktintention ausgerichtet.",
    "case.bridge.process.3": "Build - Astro 6, mehrsprachiges Routing, automatisierte Sitemap-Logik, Technical SEO und eine eigene Three.js-Projektwelt ausgeliefert.",
    "case.bridge.visual.text":
      "Warmes Taupe, Graphit und Off-White; Inter für operative Klarheit, Playfair Display für redaktionelle Autorität; viel Weißraum, kontrollierte Motion und eine filmische Three.js-Projektwelt. Das Ergebnis positioniert Bridge Consult als zeitgemäße Infrastrukturberatung. Kein generisches Corporate-Template.",

    "case.bridge.impact.title": "Vom Launch zu messbarer Nachfrage.",
    "case.bridge.impact.text":
      "Die Website wurde nicht als reine Visual-Uebung gebaut. Content, Technical SEO und der Astro-Build funktionieren als ein Akquisitionssystem - validiert durch echte GA4-Signale im ersten Launch-Fenster.",
    "case.bridge.impact.note":
      "Echte GA4-Launch-Daten, übersetzt in ein räumliches Live-Modell. Die Prozentwerte vergleichen den Messzeitraum mit der vorherigen Baseline; der originale Analytics-Export bleibt im Projektnachweis erhalten.",
    "case.bridge.metric.organic": "Organic-Search-Sitzungen",
    "case.bridge.metric.users": "Aktive Nutzer",
    "case.bridge.metric.events": "Event Count",
    "case.bridge.metric.markets": "Internationale Märkte",
    "case.bridge.system.title": "Was tatsächlich gebaut wurde.",
    "case.bridge.system.text": "Bridge Consult und fidic.uz entstanden als zwei verbundene Launches in einem fokussierten Monat 2026. Unter der visuellen Ebene arbeitet eine wiederverwendbare Content-, Search- und Publishing-Architektur.",
    "case.bridge.system.positioning.title": "Autorität, übersetzt",
    "case.bridge.system.positioning.text": "FIDIC, Claims, Delay Analysis und Infrastrukturberatung wurden zu einem hochwertigen Marktnarrativ für internationale Entscheider geformt.",
    "case.bridge.system.content.title": "Ein System, drei Sprachen",
    "case.bridge.system.content.text": "Russische, englische und usbekische Routen teilen eine konsistente Informationsarchitektur, ohne Fachinhalte sprachlich zu verflachen.",
    "case.bridge.system.search.title": "Search als Infrastruktur",
    "case.bridge.system.search.text": "Canonicals, hreflang, strukturierte Daten, generierte Sitemaps und redaktioneller Content schaffen die Basis für nachhaltige organische Sichtbarkeit.",
    "case.bridge.system.universe.title": "Proof zum Erkunden",
    "case.bridge.system.universe.text": "Acht Infrastrukturreferenzen leben in einer eigenen, dragbaren Three.js-Welt mit Projekt-Details und robusten Fallbacks.",
    "case.bridge.workflow.title": "Eine Vision. Mehrere spezialisierte Copilots.",
    "case.bridge.workflow.text":
      "Strategie, visuelle Richtung und finale Entscheidungen blieben menschlich. KI beschleunigte Research und Engineering, waehrend jedes System im Repository-Kontext geprueft, geformt und ausgeliefert wurde.",
    "case.bridge.workflow.human": "Art Direction, 3D-Assets und Motion Craft - von Hand fuer eine hochwertige Infrastrukturmarke gestaltet.",
    "case.bridge.workflow.gemini": "Analytischer Sparringspartner fuer Struktur-Drafts, Praesentationslogik und Content-Framework.",
    "case.bridge.workflow.claude": "Architektur-Support fuer Astro, Three.js, Automatisierung und mehrsprachiges Routing.",
    "case.bridge.workflow.cursor": "Repository-nahe Umsetzung, Debugging und Performance-Arbeit mit Cursor und Codex.",

    "case.fidic.kicker": "Case Study / Wissensplattform",
    "case.fidic.title": "FIDIC - fidic.uz",
    "case.fidic.subtitle":
      "Eine schnelle, hochwertige Wissensplattform rund um FIDIC-Vertragsstandards - gebaut, damit komplexe verbindliche Inhalte navigierbar, vertrauenswürdig und modern wirken.",
    "case.fidic.role.value": "Solo Build: Produktstrategie, Content, SEO, Code und Art Direction",
    "case.fidic.scope.value": "3 Sprachen, 109 Routen, 105 Fachartikel, 15 Profi-Tools",
    "case.fidic.problem.text":
      "FIDIC-Inhalte sind von Natur aus dicht. Die Herausforderung war, die typische Legal-Document-Müdigkeit zu vermeiden und eine Plattform zu bauen, in die Nutzer über Klarheit einsteigen: Vertragslogik, Lernpfade, Artikelstruktur und trust-first Navigation.",
    "case.fidic.solution.text":
      "Die Plattform nutzt eine disziplinierte Informationsarchitektur mit filmischen Oberflächen: kontrastreiche Sektionen, kontrollierter Scroll-Rhythmus, Motion Cues und eine dunkle räumliche Atmosphäre. Der Content bleibt lesbar, suchbereit und skalierbar, während das Interface signalisiert: Das ist kein simples Archiv, sondern eine hochwertige professionelle Ressource.",
    "case.fidic.outcome.text":
      "FIDIC.uz wird zu einem glaubwürdigen digitalen Zuhause für Wissen zu Vertragsstandards in der Region: schnell, strukturiert, einprägsam und bereit für Artikel, Explainer, Education-Module und Expert Content.",
    "case.fidic.highlight.1": "Komplexe Vertragsstandards in ein navigierbares digitales System übersetzt.",
    "case.fidic.highlight.2": "Eine Erfahrung gebaut, die autoritativ wirkt, ohne statisch zu sein.",
    "case.fidic.highlight.3": "Die Plattform für Longform Content, SEO und Expertenpublishing vorbereitet.",
    "case.fidic.mantra": "Klarheit statt Dichte.",
    "case.fidic.process.1": "Map - schwere Themen in klare user-facing Einstiege gruppiert.",
    "case.fidic.process.2": "Frame - Interface um Vertrauen, Hierarchie und Momentum gestaltet.",
    "case.fidic.process.3": "Ship - Frontend mit Astro, Animation Timing und Performance-Disziplin umgesetzt.",
    "case.fidic.visual.text":
      "Blueprint & Brass: tiefe Ink-Flächen, Messing-Signale, technische Mono-Labels, redaktionelle Raster und die farbcodierte Rainbow-Book-Bibliothek. Dichtes Vertragswissen wird zum navigierbaren professionellen Betriebssystem statt zu einem juristischen Dokumentenarchiv.",
    "case.fidic.platform.title": "Ein Betriebssystem für Vertragswissen.",
    "case.fidic.platform.text": "Solo als mehrsprachiges Produkt konzipiert und ausgeliefert, nicht als Broschüre: 109 Astro-Routen, 105 Fachartikel, neun Vertragsbücher, professionelle Tools, Rechner, Zertifikatsprozesse und eine AI-gestützte Wissensebene.",
    "case.fidic.metric.routes": "produktive Routen",
    "case.fidic.metric.articles": "Fachartikel",
    "case.fidic.metric.books": "Vertragsbücher",
    "case.fidic.metric.tools": "Tools und Rechner",
    "case.fidic.metric.languages": "vollständige Sprachen",
    "case.fidic.layer.knowledge.title": "Knowledge Graph",
    "case.fidic.layer.knowledge.text": "Clauses, Glossar, Fachartikel und MDB Cases verbinden Vertragswissen als strukturierte, durchsuchbare Content-Architektur.",
    "case.fidic.layer.books.title": "Atlas aus neun Books",
    "case.fidic.layer.books.text": "Profile vom Red bis White Book übersetzen Scope, Risiko und Einsatzgebiet in eine visuelle Vertragsbibliothek.",
    "case.fidic.layer.tools.title": "Professionelle Workflows",
    "case.fidic.layer.tools.text": "Contract Map, Claim Readiness, Notice Deadline, Risk Scoring, Tender Labs und Book Selector machen aus Wissen konkrete Arbeit.",
    "case.fidic.layer.calculators.title": "Vertragsrechner",
    "case.fidic.layer.calculators.text": "Time Bar, Delay, Damages, Interim Payment und DAAB Timeline beschleunigen wiederkehrende kommerzielle Entscheidungen.",
    "case.fidic.layer.ai.title": "Ask-FIDIC-Layer",
    "case.fidic.layer.ai.text": "Ein serverloser AI-Endpunkt, Search Index und Lead Routing verbinden Fachcontent direkt mit der Nutzerintention.",
    "case.fidic.layer.trust.title": "Trust Infrastructure",
    "case.fidic.layer.trust.text": "Zertifikate, Verifikation, mehrsprachige Metadaten, OG-Generierung, Schema und Sitemaps machen Autorität maschinenlesbar.",

    // ── Motion & 3D gallery ─────────────────────────────────────────────────
    "gallery.label": "Behance Showcase",
    "gallery.title": "Visuelle Systeme, die Marken spürbar machen.",
    "gallery.text":
      "Ausgewählte Cinema-4D- und Redshift-Renderings, After-Effects-Motion, Premiere-Pro-Edits und Photoshop-Visuals - die Craft-Ebene, wenn ein Marketing-System Atmosphäre braucht.",
    "gallery.cta": "Ganze Galerie auf Behance ansehen",
    "gallery.hint": "Ziehen zum Entdecken · Klick zum Eintreten",
    "preloader.label": "Kalibriere die Leere",
    "gallery.1.cat": "3D-Produkt",
    "gallery.2.cat": "Motion",
    "gallery.3.cat": "Simulation",
    "gallery.4.cat": "Art Direction",
    "gallery.5.cat": "Generativ",
    "gallery.6.cat": "Motion",

    // ── Portal to the 3D archive ────────────────────────────────────────────
    "portal.eyebrow": "Das Archiv",
    "portal.title": "Betritt das Archiv.",
    "portal.text":
      "Ein dunkles räumliches Archiv aus visuellen Experimenten, Campaign Assets und Web-Fragmenten. Flieg hindurch.",
    "portal.cta": "Ins Archiv eintreten",
    "portal.back": "Studio",

    // ── Contact ─────────────────────────────────────────────────────────────
    "contact.label": "Kontakt",
    "contact.title": "Bauen wir etwas, das man nicht vergisst.",
    "contact.text":
      "Verfügbar für ausgewählte Marketing-, Content-, SEO- und Premium-Web-Projekte. Erzähl mir, was du launchst.",
    "contact.email": "rodionbelousov@protonmail.com",
    "contact.behance.label": "Behance - Creative Archive",
    "contact.location": "Wien, Österreich",
    "contact.cta": "Projekt starten",

    // ── Footer ──────────────────────────────────────────────────────────────
    "footer.cta.eyebrow": "Verfügbar für ausgewählte Launches",
    "footer.cta.title": "Marketing, Content, SEO und Web - als ein System gebaut.",
    "footer.cta.button": "Projekt starten",
    "footer.tagline": "Digital Marketer · Creative Developer · Wien",
    "footer.rights": "Alle Rechte vorbehalten.",
  },
} as const;
