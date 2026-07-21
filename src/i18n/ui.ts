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
    "meta.title": "Rodion Belousov — Digital Marketing & SEO Specialist in Vienna",
    "meta.description":
      "Rodion Belousov is a digital marketing and SEO specialist in Vienna — strategy, positioning, content and technical SEO that grow organic traffic and convert. Also a creative developer building the premium websites that carry it.",

    // ── Navigation ──────────────────────────────────────────────────────────
    "nav.intro": "Intro",
    "nav.work": "Work",
    "nav.about": "Studio",
    "nav.reel": "Reel",
    "nav.gallery": "Archive",
    "nav.studio": "Studio",
    "nav.services": "Services & Research",
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
    "exp.1.period": "Dec 2024 — Present",
    "exp.1.text":
      "Translated complex infrastructure and FIDIC contract expertise into a premium digital presence — researching international construction projects, shaping feasibility studies and market analysis, then designing and building the Bridge Consult and fidic.uz sites on Astro + Three.js. The collaboration is ongoing.",
    "exp.2.company": "Siemens — Eisenstadt, AT",
    "exp.2.role": "Marketing & Knowledge Management",
    "exp.2.period": "2023 — 2024",
    "exp.2.text":
      "Produced 2D tutorial videos and safety-guideline explainers for SIMATIC WinCC Open Architecture — Siemens' scalable SCADA platform for large, complex control systems — turning high-tech engineering software into clear, watchable learning material for a global audience.",
    "exp.2.link": "Watch the WinCC OA video series",
    "exp.3.company": "Awaken Trees — Vienna",
    "exp.3.role": "Motion & Content, Volunteer",
    "exp.3.period": "2022",
    "exp.3.text":
      "Created an animated explainer for the FMNR reforestation method and a stream of social content — proof that premium visual storytelling can move people toward real-world impact.",
    "exp.3.link": "Watch the film",

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

    // ── Services & Research hub (/services) ─────────────────────────────────
    // hrefs live in the dictionary too, so the language switcher points each
    // card at the matching localized deep-dive without any routing hacks.
    "hero.trust.label": "Proven with",
    "hero.trust.metric": "organic growth",

    // ── Meta case: this very site (/work/studio) ────────────────────────────
    "studio.eyebrow": "Case / 03 — This site",
    "studio.title": "The proof is the page you're on.",
    "studio.lead":
      "Every claim here is testable by scrolling it. No template, no page builder — a hand-built Astro site with five bespoke real-time scenes, two languages, and an ambience that ships as code instead of audio.",
    "studio.metric.1.v": "19",
    "studio.metric.1.l": "production routes",
    "studio.metric.2.v": "02",
    "studio.metric.2.l": "languages, zero routing hacks",
    "studio.metric.3.v": "05",
    "studio.metric.3.l": "bespoke real-time scenes",
    "studio.metric.4.v": "00",
    "studio.metric.4.l": "audio files — the ambience is synthesised",

    "studio.sys.label": "What is actually running",
    "studio.sys.title": "Five scenes, none of them decoration.",
    "studio.sys.1.title": "The sculpture",
    "studio.sys.1.text":
      "The dark-glass form behind the type is raymarched in hand-written GLSL — refraction with per-channel dispersion, a brass fresnel rim, driven by scroll and an inertial cursor.",
    "studio.sys.2.title": "The warp",
    "studio.sys.2.text":
      "Going to the archive isn't a page load, it's a flight. A hyperspace tunnel accelerates into black, navigates, then decelerates out of it on the other side — so the trip reads as one continuous move.",
    "studio.sys.3.title": "The archive",
    "studio.sys.3.text":
      "Onyx-glass portal frames at increasing depth. Scroll flies the camera through them; each project is refracted through the glass until you fly into it and land inside its own world.",
    "studio.sys.4.title": "The case worlds",
    "studio.sys.4.text":
      "Opening Bridge Consult assembles a bridge — deck slabs, pylons and cables in sequence. Opening FIDIC unfolds a contract atlas and turns its pages. Neither one is a modal.",
    "studio.sys.5.title": "The ambience",
    "studio.sys.5.text":
      "The drone and the interface ticks are synthesised with the Web Audio API — three detuned oscillators under a filter that breathes once every twenty seconds. Zero audio files ship.",
    "studio.sys.6.title": "The language system",
    "studio.sys.6.text":
      "Two languages, one home. Copy swaps in place from a dictionary; only genuinely localized content earns its own URL. No locale roots, no redirect traps, no duplicate homepages.",

    "studio.notes.label": "Engineering notes",
    "studio.notes.title": "The parts that were wrong first.",
    "studio.notes.lead":
      "Anyone can show the finished surface. These are the failures underneath it — because knowing why something broke is the actual skill being sold.",
    "studio.notes.1.title": "Mobile pays a different price",
    "studio.notes.1.text":
      "The archive rendered every frame twice: the scene into a render target, then a fullscreen composite for grain and vignette. On a phone GPU that memory bandwidth is the entire budget. It now draws straight to the screen and only spins the composite up while a transition wipe is running.",
    "studio.notes.2.title": "Reduce Motion is not an off switch",
    "studio.notes.2.text":
      "The preloader froze its object with animation-play-state: paused. On any phone with Reduce Motion enabled that read as a broken page — a cube standing still. It now turns slowly instead of dying.",
    "studio.notes.3.title": "The locale trap",
    "studio.notes.3.text":
      "Localized clones of the homepage lived at /en/ and /de/, and the wordmark pointed at them. Switching language on a service page stranded you on a duplicate with no way back. The clones are gone, 301'd to the real home, and locale now applies only to real localized content.",

    "studio.cta.insight": "How the AI-assisted workflow actually works",
    "studio.cta.live": "Open the archive",

    "services.eyebrow": "Services & Research / Vienna",
    "services.title": "Systems, not deliverables.",
    "services.lead":
      "Three disciplines that ship as one launch system — and the research behind why it works. Strategy that survives contact with production, search that survives the design, code that survives the metrics.",
    "services.open": "Open",
    "services.1.title": "Digital Marketing",
    "services.1.text":
      "Positioning, research, content architecture and distribution — built to be measured, maintained and expanded, not to end at a mockup.",
    "services.1.href": "/en/digital-marketing-vienna/",
    "services.2.title": "Technical SEO",
    "services.2.text":
      "Crawlable architecture, multilingual routing, structured data and performance budgets — so visual ambition never becomes an indexing problem.",
    "services.2.href": "/en/technical-seo-vienna/",
    "services.3.title": "Creative Development",
    "services.3.text":
      "Astro, Three.js, GSAP and hand-written GLSL. Real-time 3D and motion that carry the brand without costing the Core Web Vitals.",
    "services.3.href": "/en/creative-development-vienna/",

    "research.label": "Research",
    "research.title": "Receipts, not opinions.",
    "research.1.title": "Bridge Consult — +780% organic",
    "research.1.text": "What a multilingual launch system did to search visibility.",
    "research.1.href": "/en/insights/bridge-consult-seo-growth/",
    "research.2.title": "FIDIC — a knowledge platform",
    "research.2.text": "109 routes and 105 expert articles, structured to be found.",
    "research.2.href": "/en/insights/fidic-knowledge-platform/",
    "research.3.title": "Three.js for marketing sites",
    "research.3.text": "When real-time 3D lifts conversion — and when it quietly kills it.",
    "research.3.href": "/en/insights/threejs-marketing-websites/",
    "research.4.title": "AI-assisted development",
    "research.4.text": "Using AI for velocity without outsourcing creative direction.",
    "research.4.href": "/en/insights/ai-assisted-creative-development/",

    // ── Video bands (type knockout + scroll-scrubbed product film) ──────────
    "reel.type.label": "Cinema 4D / Redshift — product film, rendered in-house",
    "scrub.eyebrow": "Cinema 4D · Redshift / scroll runs the film",
    "scrub.title": "Nothing here was filmed.",
    "scrub.text":
      "No studio. No camera. No product. Light, material and motion built out of nothing, then graded until it reads as real.",

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
    "footer.status": "Available for projects",
    "footer.nav.label": "Navigate",
    "footer.social.label": "Elsewhere",
    "footer.rights": "All rights reserved.",

    // ── 404 — The Event Horizon ─────────────────────────────────────────────
    "404.eyebrow": "Signal // 404",
    "404.title": "Signal lost.",
    "404.subtitle": "You've drifted off course. These coordinates do not exist in the current space.",
    "404.cta": "Return to base",
    "404.scroll": "drift on",
    "404.recover.eyebrow": "Re-establish signal",
    "404.recover.title": "Known coordinates",
    "404.recover.sub": "The route you asked for is off the map — but these are still transmitting. Pick a heading and drift back in.",
    "404.beacon.studio.name": "Studio",
    "404.beacon.studio.desc": "The home signal — where the spatial transit begins.",
    "404.beacon.services.name": "Services & Research",
    "404.beacon.services.desc": "Digital marketing, technical SEO and creative development.",
    "404.beacon.archive.name": "Archive",
    "404.beacon.archive.desc": "The visual record — projects, frames and experiments.",
    "404.beacon.bridge.name": "Bridge Consult",
    "404.beacon.bridge.desc": "From infrastructure expertise to +780% organic demand.",
    "404.beacon.fidic.name": "FIDIC.uz",
    "404.beacon.fidic.desc": "A multilingual operating system for contract knowledge.",
    "404.beacon.meta.name": "How this site is built",
    "404.beacon.meta.desc": "The engineering behind the warp — GLSL, Three.js, GSAP.",
    "404.diag.system": "Operational",
    "404.diag.recovery": "6 beacons in range",
  },

  de: {
    "accessibility.skip-to-content": "Zum Inhalt springen",

    // ── Meta / SEO ──────────────────────────────────────────────────────────
    "meta.title": "Rodion Belousov — Digital-Marketing- & SEO-Spezialist in Wien",
    "meta.description":
      "Rodion Belousov ist Digital-Marketing- und SEO-Spezialist in Wien — Strategie, Positionierung, Content und technisches SEO, das organischen Traffic steigert und konvertiert. Zugleich Creative Developer für die hochwertigen Websites dahinter.",

    // ── Navigation ──────────────────────────────────────────────────────────
    "nav.intro": "Intro",
    "nav.work": "Arbeiten",
    "nav.about": "Studio",
    "nav.reel": "Reel",
    "nav.gallery": "Archiv",
    "nav.studio": "Studio",
    "nav.services": "Leistungen & Research",
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
    "exp.1.period": "Dez 2024 — heute",
    "exp.1.text":
      "Komplexe Infrastruktur- und FIDIC-Vertragsexpertise in eine erstklassige digitale Präsenz übersetzt — Recherche zu internationalen Bauprojekten, Aufbau von Feasibility Studies und Marktanalysen, dann Design und Umsetzung der Websites Bridge Consult und fidic.uz auf Astro + Three.js. Die Zusammenarbeit läuft weiter.",
    "exp.2.company": "Siemens — Eisenstadt, AT",
    "exp.2.role": "Marketing & Wissensmanagement",
    "exp.2.period": "2023 — 2024",
    "exp.2.text":
      "2D-Tutorial-Videos und Safety-Explainer für SIMATIC WinCC Open Architecture produziert — die skalierbare SCADA-Plattform von Siemens für große, komplexe Leitsysteme — und damit hochtechnische Engineering-Software in klares, verständliches Lernmaterial für ein globales Publikum übersetzt.",
    "exp.2.link": "WinCC-OA-Videoserie ansehen",
    "exp.3.company": "Awaken Trees — Wien",
    "exp.3.role": "Motion & Content, ehrenamtlich",
    "exp.3.period": "2022",
    "exp.3.text":
      "Ein animiertes Erklärvideo zur FMNR-Aufforstungsmethode und laufend Social-Content erstellt — der Beweis, dass erstklassiges visuelles Storytelling Menschen zu echter Wirkung bewegt.",
    "exp.3.link": "Film ansehen",

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

    // ── Services & Research hub (/services) ─────────────────────────────────
    "hero.trust.label": "Bewährt bei",
    "hero.trust.metric": "organisches Wachstum",

    // ── Meta case: this very site (/work/studio) ────────────────────────────
    "studio.eyebrow": "Case / 03 — Diese Website",
    "studio.title": "Der Beweis ist die Seite, auf der du gerade bist.",
    "studio.lead":
      "Jede Behauptung hier lässt sich durch Scrollen überprüfen. Kein Template, kein Baukasten — eine handgebaute Astro-Website mit fünf eigenen Echtzeit-Szenen, zwei Sprachen und einer Klangkulisse, die als Code statt als Audio ausgeliefert wird.",
    "studio.metric.1.v": "19",
    "studio.metric.1.l": "produktive Routen",
    "studio.metric.2.v": "02",
    "studio.metric.2.l": "Sprachen, null Routing-Hacks",
    "studio.metric.3.v": "05",
    "studio.metric.3.l": "eigene Echtzeit-Szenen",
    "studio.metric.4.v": "00",
    "studio.metric.4.l": "Audiodateien — die Klangkulisse ist synthetisiert",

    "studio.sys.label": "Was hier tatsächlich läuft",
    "studio.sys.title": "Fünf Szenen, keine davon Dekoration.",
    "studio.sys.1.title": "Die Skulptur",
    "studio.sys.1.text":
      "Die dunkle Glasform hinter der Typografie ist Raymarching in handgeschriebenem GLSL — Refraktion mit Dispersion pro Farbkanal, Messing-Fresnel-Kante, gesteuert von Scroll und einem trägen Cursor.",
    "studio.sys.2.title": "Der Warp",
    "studio.sys.2.text":
      "Der Weg ins Archiv ist kein Seitenaufruf, sondern ein Flug. Ein Hyperraum-Tunnel beschleunigt ins Schwarz, navigiert und bremst auf der anderen Seite wieder heraus — die Reise liest sich als eine durchgehende Bewegung.",
    "studio.sys.3.title": "Das Archiv",
    "studio.sys.3.text":
      "Portalrahmen aus Onyxglas in zunehmender Tiefe. Scrollen fliegt die Kamera hindurch; jedes Projekt wird durchs Glas gebrochen, bis du hineinfliegst und in seiner eigenen Welt landest.",
    "studio.sys.4.title": "Die Case-Welten",
    "studio.sys.4.text":
      "Bridge Consult zu öffnen baut eine Brücke — Fahrbahnplatten, Pylone und Seile der Reihe nach. FIDIC zu öffnen klappt einen Vertragsatlas auf und blättert seine Seiten. Beides ist kein Modal.",
    "studio.sys.5.title": "Die Klangkulisse",
    "studio.sys.5.text":
      "Der Drone-Ton und die Interface-Ticks sind mit der Web Audio API synthetisiert — drei verstimmte Oszillatoren unter einem Filter, der alle zwanzig Sekunden einmal atmet. Es wird keine einzige Audiodatei ausgeliefert.",
    "studio.sys.6.title": "Das Sprachsystem",
    "studio.sys.6.text":
      "Zwei Sprachen, ein Zuhause. Texte werden aus einem Wörterbuch an Ort und Stelle getauscht; nur echt lokalisierte Inhalte bekommen eine eigene URL. Keine Locale-Roots, keine Redirect-Fallen, keine doppelten Startseiten.",

    "studio.notes.label": "Engineering-Notizen",
    "studio.notes.title": "Die Stellen, die zuerst falsch waren.",
    "studio.notes.lead":
      "Die fertige Oberfläche kann jeder zeigen. Das hier sind die Fehler darunter — denn zu wissen, warum etwas kaputtging, ist die eigentliche Fähigkeit, die hier verkauft wird.",
    "studio.notes.1.title": "Mobil zahlt einen anderen Preis",
    "studio.notes.1.text":
      "Das Archiv renderte jeden Frame doppelt: die Szene in ein Render-Target, danach ein Vollbild-Composite für Korn und Vignette. Auf einer Handy-GPU ist diese Speicherbandbreite das gesamte Budget. Jetzt wird direkt auf den Bildschirm gezeichnet, und das Composite läuft nur während eines Übergangs.",
    "studio.notes.2.title": "Reduce Motion ist kein Ausschalter",
    "studio.notes.2.text":
      "Der Preloader fror sein Objekt mit animation-play-state: paused ein. Auf jedem Handy mit aktiviertem Reduce Motion las sich das als kaputte Seite — ein Würfel, der stillsteht. Jetzt dreht er sich langsam, statt zu sterben.",
    "studio.notes.3.title": "Die Locale-Falle",
    "studio.notes.3.text":
      "Unter /en/ und /de/ lagen Klone der Startseite, und die Wortmarke zeigte darauf. Ein Sprachwechsel auf einer Leistungsseite strandete dich auf einem Duplikat ohne Rückweg. Die Klone sind weg, per 301 auf das echte Zuhause umgeleitet, und Locale gilt nur noch für echt lokalisierte Inhalte.",

    "studio.cta.insight": "Wie der AI-assisted Workflow wirklich funktioniert",
    "studio.cta.live": "Archiv öffnen",

    "services.eyebrow": "Leistungen & Research / Wien",
    "services.title": "Systeme, keine Deliverables.",
    "services.lead":
      "Drei Disziplinen, die als ein Launch-System ausgeliefert werden — und die Research dahinter. Strategie, die die Produktion überlebt, Search, das das Design überlebt, Code, der die Metriken überlebt.",
    "services.open": "Öffnen",
    "services.1.title": "Digital Marketing",
    "services.1.text":
      "Positionierung, Research, Content-Architektur und Distribution — messbar, wartbar und ausbaufähig gebaut, statt beim Mockup zu enden.",
    "services.1.href": "/de/digital-marketing-wien/",
    "services.2.title": "Technical SEO",
    "services.2.text":
      "Crawlbare Architektur, mehrsprachiges Routing, strukturierte Daten und Performance-Budgets — damit gestalterischer Anspruch kein Indexierungsproblem wird.",
    "services.2.href": "/de/technical-seo-wien/",
    "services.3.title": "Creative Development",
    "services.3.text":
      "Astro, Three.js, GSAP und handgeschriebenes GLSL. Echtzeit-3D und Motion, die die Marke tragen, ohne die Core Web Vitals zu kosten.",
    "services.3.href": "/de/creative-development-wien/",

    "research.label": "Research",
    "research.title": "Belege statt Meinungen.",
    "research.1.title": "Bridge Consult — +780% organisch",
    "research.1.text": "Was ein mehrsprachiges Launch-System mit der Sichtbarkeit gemacht hat.",
    "research.1.href": "/de/insights/bridge-consult-seo-wachstum/",
    "research.2.title": "FIDIC — eine Wissensplattform",
    "research.2.text": "109 Routen und 105 Fachartikel, strukturiert zum Gefundenwerden.",
    "research.2.href": "/de/insights/fidic-wissensplattform/",
    "research.3.title": "Three.js für Marketing-Websites",
    "research.3.text": "Wann Echtzeit-3D die Conversion hebt — und wann es sie leise killt.",
    "research.3.href": "/de/insights/threejs-marketing-websites/",
    "research.4.title": "AI-assisted Development",
    "research.4.text": "AI für Tempo nutzen, ohne die Creative Direction auszulagern.",
    "research.4.href": "/de/insights/ai-assisted-creative-development/",

    // ── Video bands (type knockout + scroll-scrubbed product film) ──────────
    "reel.type.label": "Cinema 4D / Redshift — Produktfilm, im Haus gerendert",
    "scrub.eyebrow": "Cinema 4D · Redshift / Scrollen spielt den Film",
    "scrub.title": "Hier wurde nichts gefilmt.",
    "scrub.text":
      "Kein Studio. Keine Kamera. Kein Produkt. Licht, Material und Bewegung aus dem Nichts gebaut und so lange gegradet, bis es echt liest.",

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
    "footer.status": "Verfügbar für Projekte",
    "footer.nav.label": "Navigation",
    "footer.social.label": "Anderswo",
    "footer.rights": "Alle Rechte vorbehalten.",

    // ── 404 — Der Ereignishorizont ──────────────────────────────────────────
    "404.eyebrow": "Signal // 404",
    "404.title": "Signal verloren.",
    "404.subtitle": "Du bist vom Kurs abgekommen. Diese Koordinaten existieren nicht im aktuellen Raum.",
    "404.cta": "Zurück zur Basis",
    "404.scroll": "weiter treiben",
    "404.recover.eyebrow": "Signal wiederherstellen",
    "404.recover.title": "Bekannte Koordinaten",
    "404.recover.sub": "Die gesuchte Route ist von der Karte verschwunden — aber diese senden noch. Wähl einen Kurs und treib zurück.",
    "404.beacon.studio.name": "Studio",
    "404.beacon.studio.desc": "Das Heimatsignal — wo der Transit durch den Raum beginnt.",
    "404.beacon.services.name": "Leistungen & Research",
    "404.beacon.services.desc": "Digital Marketing, technisches SEO und Creative Development.",
    "404.beacon.archive.name": "Archiv",
    "404.beacon.archive.desc": "Das visuelle Archiv — Projekte, Frames und Experimente.",
    "404.beacon.bridge.name": "Bridge Consult",
    "404.beacon.bridge.desc": "Von Infrastruktur-Expertise zu +780 % organischer Nachfrage.",
    "404.beacon.fidic.name": "FIDIC.uz",
    "404.beacon.fidic.desc": "Ein mehrsprachiges Betriebssystem für Vertragswissen.",
    "404.beacon.meta.name": "Wie diese Seite gebaut ist",
    "404.beacon.meta.desc": "Die Technik hinter dem Warp — GLSL, Three.js, GSAP.",
    "404.diag.system": "Betriebsbereit",
    "404.diag.recovery": "6 Signale in Reichweite",
  },
} as const;
