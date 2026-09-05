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
    "hero.subtitle": "I'm Rodion Belousov: a digital marketer with creative-development range. I shape positioning, content, SEO, motion and websites into one launch system — and stay accountable for what it does in the market afterwards. The proof is two live platforms in three languages, not a deck.",
    "hero.cta.primary": "View selected work",
    "hero.cta.secondary": "Start a project",
    "hero.scroll": "Scroll",

    // ── About / Approach ────────────────────────────────────────────────────
    "about.label": "Approach",
    "about.title":
      "One operator for the messy space between strategy and launch.",
    "about.text":
      "I work where marketing usually gets fragmented: positioning in one file, content in another, SEO somewhere else, and the website treated like decoration. My edge is connecting the whole chain - market logic, copy, search intent, campaign assets, motion and the final interface - with a Master's focus in International Marketing and Brand Management behind it.",

    // ── The objection, said out loud ────────────────────────────────────────
    // Buyers are already asking it; a site that pretends otherwise reads as
    // either naive or evasive. Answering it first is the only version that
    // converts.
    "objection.label": "The obvious question",
    "objection.title": "\u201cWhy pay you when I could just pay for the model?\u201d",
    "objection.text": "Fair question, and the honest answer is that you can now generate a website. What you cannot generate is someone who knows the subject well enough to catch the answer that is confidently wrong, who decides what not to build, and who is still here in six months when the thing quietly breaks.",
    "objection.1.title": "You can generate a page",
    "objection.1.text": "You cannot generate the judgement that its scope is wrong — that the client needed one verifiable proposition, not eleven more pages.",
    "objection.2.title": "You can generate an article about FIDIC",
    "objection.2.text": "You cannot tell whether it is correct. That takes knowing the clause, the procurement rule and the practice, and it is the reason the platform can be published at all.",
    "objection.3.title": "You can generate a fast site",
    "objection.3.text": "You cannot generate the person who notices, months later, that the home page has started shipping 13 MB of video before anyone scrolls.",
    "objection.cta": "Read what actually broke",
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
      "A solo-built FIDIC knowledge platform: 429 static pages in three languages, 117 expert articles, 16 contract tools and a tender archive that refreshes itself every morning.",
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
    "case.bridge.workflow.title": "What the tooling does not decide.",
    "case.bridge.workflow.text": "Cinema 4D, Three.js, GSAP, an editor with a model in it — the stack is not the argument, because anyone can have the same stack. These four decisions are the work, and none of them come out of a prompt.",
    "case.bridge.workflow.human": "Deciding what to build and what to leave out. Bridge Consult did not need more pages; it needed a proposition an international decision-maker could verify in thirty seconds. Scope is the first and cheapest place to be wrong.",
    "case.bridge.workflow.gemini": "Knowing when an answer is wrong. Infrastructure contracting is full of checkable facts — FIDIC clauses, procurement rules, what a claim actually requires. Generated text is equally confident either way; being able to reject it is the part that took years.",
    "case.bridge.workflow.claude": "Removing what the measurement does not justify. Smooth scroll off on phones, page CSS inlined so a dropped request cannot strip the styling, reveal logic kept outside the bundle. Most of the engineering here was subtraction.",
    "case.bridge.workflow.cursor": "Being the one accountable in six months. The tender pipeline still commits every morning, and someone has to notice when a home page quietly starts shipping 13 MB of video. That is not a deliverable, it is a relationship.",

    "case.fidic.kicker": "Case Study / Knowledge Platform",
    "case.fidic.title": "FIDIC - fidic.uz",
    "case.fidic.subtitle":
      "A fast, premium knowledge platform around FIDIC contract standards - built to make complex authoritative material feel navigable, trustworthy and modern.",
    "case.fidic.role.value": "Solo build: product strategy, content, SEO, code and art direction",
    "case.fidic.scope.value": "3 locales, 429 pages, 117 expert articles, 16 professional tools",
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
    "case.fidic.platform.text": "Designed and shipped solo as a multilingual product, not a brochure: 429 static pages across three languages, 117 expert articles, a nine-book contract atlas, 16 tools and calculators, a certification registry and a serverless AI layer - roughly 48,000 lines of code I own end to end.",
    "case.fidic.metric.routes": "pages in the production build",
    "case.fidic.metric.articles": "expert articles, 39 per language",
    "case.fidic.metric.books": "contract books",
    "case.fidic.metric.tools": "tools and calculators",
    "case.fidic.metric.languages": "complete languages",
    "case.fidic.metric.schema": "schema.org types in the markup",
    "case.fidic.layer.knowledge.title": "Knowledge graph",
    "case.fidic.layer.knowledge.text": "39 articles per language, 28 dissected FIDIC clauses, 25 glossary terms and MDB project cases - one typed content model, three complete languages, no partial translation.",
    "case.fidic.layer.books.title": "Nine-book atlas",
    "case.fidic.layer.books.text": "Red through White Book profiles translate scope, risk and applicability into a visual contract library.",
    "case.fidic.layer.tools.title": "Professional workflows",
    "case.fidic.layer.tools.text": "Contract Map, Claim Readiness, Notice Deadline, risk scoring, the Tender Risk Lab and book selection turn reading into action. Every calculation runs in the browser - nothing a user types is sent anywhere.",
    "case.fidic.layer.calculators.title": "Contract calculators",
    "case.fidic.layer.calculators.text": "Time-bar under Sub-Clause 20.2, EOT and delay, liquidated damages, interim payment under Clause 14 and DAAB timelines - the five models a contract team reruns constantly.",
    "case.fidic.layer.ai.title": "Ask FIDIC layer",
    "case.fidic.layer.ai.text": "Ask FIDIC AI calls the Anthropic Messages API over raw HTTPS, so no SDK ever lands in the client bundle and the site stays fully static. Length and history caps guard a paid public endpoint.",
    "case.fidic.layer.trust.title": "Trust infrastructure",
    "case.fidic.layer.trust.text": "A CLI issues each training certificate into a versioned registry with a QR code; anyone can verify it on a public page. Certificate pages are force-noindexed so personal data never reaches search results.",

    "case.fidic.data.title": "A tender archive that refuses to forget.",
    "case.fidic.data.text": "The World Bank procurement API only ever returns a rolling window - a notice that drops out of the feed is gone for good. So the pipeline never overwrites. Every morning it merges the fresh response into a cumulative archive, and if the upstream fails it exits non-zero instead of quietly saving an empty snapshot.",
    "case.fidic.data.stat.notices": "notices in the archive",
    "case.fidic.data.stat.countries": "countries across Central Asia and the Caucasus",
    "case.fidic.data.stat.depth": "archive depth, first notice onward",
    "case.fidic.data.stat.refresh": "daily unattended refresh, in UTC",
    "case.fidic.data.row.source.title": "Source",
    "case.fidic.data.row.source.text": "The World Bank Procurement Notices API, queried per country and normalised into a single typed dataset.",
    "case.fidic.data.row.schedule.title": "Schedule",
    "case.fidic.data.row.schedule.text": "A GitHub Actions cron job. Every bot commit carries the current open-versus-total count in its message, so the archive's health is readable from the git log alone.",
    "case.fidic.data.row.model.title": "Data model",
    "case.fidic.data.row.model.text": "A cumulative snapshot. The run merges the API response into the stored archive rather than replacing it, so history accumulates instead of eroding.",
    "case.fidic.data.row.publish.title": "Publication",
    "case.fidic.data.row.publish.text": "The refreshed dataset is committed to main, which triggers a rebuild and a targeted IndexNow ping - one summary page plus seven country cuts, in three languages.",

    "case.fidic.perf.title": "Most of the engineering was taking things out.",
    "case.fidic.perf.text": "Four Three.js scenes, smooth scroll, a custom cursor and magnetic buttons all shipped - and then got measured. Whatever cost more than it returned was removed per device, not per opinion.",
    "case.fidic.perf.problem": "What the measurement showed",
    "case.fidic.perf.fix": "What changed",
    "case.fidic.perf.1.problem": "Smooth scroll was hurting LCP on phones.",
    "case.fidic.perf.1.fix": "Lenis stopped loading on mobile entirely. The scroll animation is now a desktop-only affordance.",
    "case.fidic.perf.2.problem": "Cards strobed under a cursor that wasn't even moving.",
    "case.fidic.perf.2.fix": "Hover-state logic rewritten so scrolling can no longer retrigger it.",
    "case.fidic.perf.3.problem": "A dropped request could strip a page of its styling.",
    "case.fidic.perf.3.fix": "Page-level CSS is inlined. A failed asset request can no longer leave a page unstyled.",
    "case.fidic.perf.4.problem": "Tables and cards overflowed on phones.",
    "case.fidic.perf.4.fix": "The tender table rebuilds itself as cards, wide tables gained a scroll indicator, the home page became swipeable rails.",
    "case.fidic.perf.5.problem": "Search returned results that did not match the query.",
    "case.fidic.perf.5.fix": "Relevance logic rewritten and retested against real queries.",
    "case.fidic.perf.principle": "Everything that reveals content - entrance animations, counters - lives in a plain script outside the build bundle. If the bundle never loads, the content is still there. Resilience beats effect.",

    "case.fidic.runtime.title": "Static by default, dynamic only where it earns it.",
    "case.fidic.runtime.text": "429 pages compile to plain HTML with no server in the request path. Three serverless functions carry everything that genuinely has to run at request time.",
    "case.fidic.runtime.1.title": "Anthropic Messages API",
    "case.fidic.runtime.1.text": "Ask FIDIC AI is called over raw HTTPS so the SDK never reaches the client bundle. Request and history caps protect a paid public endpoint.",
    "case.fidic.runtime.2.title": "Telegram Bot API",
    "case.fidic.runtime.2.text": "Leads route straight into a chat. If no bot is configured the function returns non-2xx on purpose and the form falls back to a prefilled mailto, so no enquiry is ever silently lost.",
    "case.fidic.runtime.3.title": "@vercel/og",
    "case.fidic.runtime.3.text": "Social cards generated per headline at 1200x630, with fonts vendored into the function folder so Cyrillic renders correctly instead of dropping to boxes.",
    "case.fidic.runtime.4.title": "IndexNow + Wikidata",
    "case.fidic.runtime.4.text": "A deploy maps changed source files to the public URLs they render and pings only those. The organisation entity is closed off against Wikidata so search engines resolve it unambiguously.",
    "case.fidic.runtime.5.title": "Own tooling",
    "case.fidic.runtime.5.text": "Seven purpose-built scripts: tender collection, changed-URL mapping, IndexNow submission, OG truncation checks, certificate issuing, SEO audits and PDF extraction.",
    "case.fidic.runtime.6.title": "32 schema.org types",
    "case.fidic.runtime.6.text": "Article, TechArticle, DefinedTerm, Course, EducationalOccupationalCredential, Dataset and 26 more - SEO built into the architecture rather than bolted on afterwards.",

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
    "studio.notes.more": "Read the full engineering log",
    "studio.notes.title": "The parts that were wrong first.",
    "studio.notes.lead":
      "Anyone can show the finished surface. These are the failures underneath it — because knowing why something broke is the actual skill being sold.",

    // ── Engineering log ─────────────────────────────────────────────────────
    // Shared source for /notes/ and the excerpt on /work/studio. Entries 1-3
    // are the original three, verbatim; 4-8 came out of later sessions.
    "nav.notes": "Notes",
    "notes.meta.title": "Engineering notes - what broke on this site and why | Rodion Belousov",
    "notes.meta.description": "A running log of real failures on rodionbelousov.studio: a 12.75 MB video nobody asked for, a loading screen that could never end, a codec that lost, an optimisation that cost 42 KB.",
    "notes.kicker": "Engineering log / rodionbelousov.studio",
    "notes.title": "What broke, and what it cost.",
    "notes.lead": "Anyone can show the finished surface, and by now anyone can generate one. This is the part that does not come out of a prompt: the things that were wrong first, how they were found, and the two entries where the right answer was to throw the work away.",
    "notes.count": "entries",
    "notes.measured": "Every number here was measured, not estimated.",
    "notes.outro": "This list only gets longer. That is the point of it.",
    "notes.cta": "See the systems these came out of",

    "note.1.title": "Mobile pays a different price",
    "note.1.text": "The archive rendered every frame twice: the scene into a render target, then a fullscreen composite for grain and vignette. On a phone GPU that memory bandwidth is the entire budget. It now draws straight to the screen and only spins the composite up while a transition wipe is running.",
    "note.2.title": "Reduce Motion is not an off switch",
    "note.2.text": "The preloader froze its object with animation-play-state: paused. On any phone with Reduce Motion enabled that read as a broken page - a cube standing still. It now turns slowly instead of dying.",
    "note.3.title": "The locale trap",
    "note.3.text": "Localized clones of the homepage lived at /en/ and /de/, and the wordmark pointed at them. Switching language on a service page stranded you on a duplicate with no way back. The clones are gone, 301'd to the real home, and locale now applies only to real localized content.",
    "note.4.title": "The film that downloaded before anyone asked for it",
    "note.4.text": "A scroll-scrubbed film shipped with its source and preload=auto written straight into the markup, for a section that starts three screens down the page. Every visitor pulled all 12.75 MB of it from first paint. On a phone on a weak connection the page painted in about a second and then sat there feeling frozen, because the connection stayed saturated for minutes behind it. The source now attaches only as the section approaches, and not at all under Save-Data. Home page transfer went from 12.92 MB to 0.16 MB.",
    "note.5.title": "A loading screen that could never end",
    "note.5.text": "The intro held overflow:hidden and touch-action:none on the document while it played. Every path that released that lock lived inside the animation-frame loop - including the failsafe, which was itself a line of that loop. So anything that stopped the loop left the page painted, readable and permanently unscrollable, recoverable only by reloading. The release now also hangs off a plain timer that fires whether or not a single frame is ever served. Verified by stubbing out requestAnimationFrame entirely.",
    "note.6.title": "Hyphenation only breaks where the dictionary exists",
    "note.6.text": "A case title carried hyphens:auto, added so that long German headings would break cleanly. Android Chrome ships the hyphenation dictionary; desktop Linux mostly does not. So the title split as FIDIC - fi- / dic.uz on a phone, and looked perfect on every machine it was built on. Both halves fit their own line down to 320px, so the space was the only break ever wanted.",
    "note.7.title": "The codec that won on paper",
    "note.7.text": "AV1 was encoded next to H.264 for all three films. It cut the two 1080p30 clips by up to 78% - and came out larger than H.264 on the 60fps one, because a single CRF number does not map to the same quality across codecs. Shipping it meant per-file tuning plus format negotiation in four components, for a win that reverses on one file in three and that iOS largely cannot use. Measured, then dropped.",
    "note.8.title": "The optimisation that cost 42 KB",
    "note.8.text": "Making three.js a dynamic import, so devices that skip the WebGL backdrop could skip the download too. It worked - and the shared chunk grew from 528 KB to 674 KB, because a dynamic import forces the bundler to keep the whole namespace instead of tree-shaking it. That is 42 KB added for every ordinary visitor to save a minority, and it pulled the download forward into the window that decides LCP. Reverted the same hour it was written.",

    "studio.cta.insight": "Where AI helps — and where it is the wrong tool",
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
    "footer.colophon": "How this site is built",
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
    "hero.subtitle": "Ich bin Rodion Belousov: Digital Marketer mit Creative-Development-Reichweite. Ich forme Positionierung, Content, SEO, Motion und Websites zu einem Launch-System — und bleibe danach dafür verantwortlich, was es im Markt tut. Der Beleg sind zwei laufende Plattformen in drei Sprachen, kein Deck.",
    "hero.cta.primary": "Ausgewählte Arbeiten",
    "hero.cta.secondary": "Projekt starten",
    "hero.scroll": "Scrollen",

    // ── About / Approach ────────────────────────────────────────────────────
    "about.label": "Ansatz",
    "about.title": "Ein Operator für den Raum zwischen Strategie und Launch.",
    "about.text":
      "Die meisten Projekte verlieren ihre Schärfe zwischen Business-Idee, Content-Plan und fertiger Website. Ich schließe diese Lücke. Mit Master-Fokus auf International Marketing und Brand Management sowie Erfahrung bei Siemens, im Consulting und in eigenen Builds verbinde ich Marktlogik mit Copy, Search Intent, Kampagnen und Interface.",

    // ── Der Einwand, laut ausgesprochen ─────────────────────────────────────
    "objection.label": "Die naheliegende Frage",
    "objection.title": "\u201eWarum dich bezahlen, wenn ich einfach das Modell bezahlen kann?\u201c",
    "objection.text": "Berechtigte Frage, und die ehrliche Antwort lautet: Eine Website lässt sich heute generieren. Nicht generieren lässt sich jemand, der das Thema gut genug kennt, um die selbstbewusst falsche Antwort zu erkennen, der entscheidet, was nicht gebaut wird, und der in sechs Monaten noch da ist, wenn etwas leise kaputtgeht.",
    "objection.1.title": "Eine Seite lässt sich generieren",
    "objection.1.text": "Nicht generieren lässt sich das Urteil, dass ihr Scope falsch ist — dass der Kunde ein prüfbares Versprechen brauchte und nicht elf weitere Seiten.",
    "objection.2.title": "Ein Artikel über FIDIC lässt sich generieren",
    "objection.2.text": "Ob er stimmt, lässt sich damit nicht sagen. Dafür braucht es die Klausel, die Vergaberegel und die Praxis — und genau deshalb ist die Plattform überhaupt veröffentlichbar.",
    "objection.3.title": "Eine schnelle Seite lässt sich generieren",
    "objection.3.text": "Nicht generieren lässt sich die Person, die Monate später bemerkt, dass die Startseite 13 MB Video ausliefert, bevor überhaupt jemand scrollt.",
    "objection.cta": "Nachlesen, was wirklich kaputtging",
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
      "Eine solo gebaute FIDIC-Wissensplattform: 429 statische Seiten in drei Sprachen, 117 Fachartikel, 16 Vertrags-Tools und ein Tender-Archiv, das sich jeden Morgen selbst aktualisiert.",
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
    "case.bridge.workflow.title": "Was das Werkzeug nicht entscheidet.",
    "case.bridge.workflow.text": "Cinema 4D, Three.js, GSAP, ein Editor mit einem Modell darin — der Stack ist nicht das Argument, denn den gleichen Stack kann jeder haben. Diese vier Entscheidungen sind die Arbeit, und keine davon fällt aus einem Prompt.",
    "case.bridge.workflow.human": "Entscheiden, was gebaut wird und was nicht. Bridge Consult brauchte keine weiteren Seiten, sondern ein Versprechen, das ein internationaler Entscheider in dreißig Sekunden prüfen kann. Der Scope ist die erste und billigste Stelle, an der man falsch liegen kann.",
    "case.bridge.workflow.gemini": "Erkennen, wann eine Antwort falsch ist. Infrastrukturverträge stecken voller prüfbarer Fakten — FIDIC-Klauseln, Vergaberegeln, was eine Claim tatsächlich verlangt. Generierter Text klingt so oder so gleich überzeugt; ihn zurückweisen zu können, ist der Teil, der Jahre gebraucht hat.",
    "case.bridge.workflow.claude": "Entfernen, was die Messung nicht rechtfertigt. Smooth Scroll auf Telefonen aus, Seiten-CSS inline, damit ein abgebrochener Request das Styling nicht abräumt, Reveal-Logik außerhalb des Bundles. Der größere Teil des Engineerings war Weglassen.",
    "case.bridge.workflow.cursor": "Derjenige sein, der in sechs Monaten verantwortlich ist. Die Tender-Pipeline committet weiterhin jeden Morgen, und irgendwer muss merken, wenn eine Startseite still 13 MB Video auszuliefern beginnt. Das ist kein Deliverable, das ist eine Beziehung.",

    "case.fidic.kicker": "Case Study / Wissensplattform",
    "case.fidic.title": "FIDIC - fidic.uz",
    "case.fidic.subtitle":
      "Eine schnelle, hochwertige Wissensplattform rund um FIDIC-Vertragsstandards - gebaut, damit komplexe verbindliche Inhalte navigierbar, vertrauenswürdig und modern wirken.",
    "case.fidic.role.value": "Solo Build: Produktstrategie, Content, SEO, Code und Art Direction",
    "case.fidic.scope.value": "3 Sprachen, 429 Seiten, 117 Fachartikel, 16 Profi-Tools",
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
    "case.fidic.platform.text": "Solo als mehrsprachiges Produkt konzipiert und ausgeliefert, nicht als Broschüre: 429 statische Seiten in drei Sprachen, 117 Fachartikel, ein Atlas aus neun Vertragsbüchern, 16 Tools und Rechner, ein Zertifikatsregister und eine serverlose AI-Ebene - rund 48.000 Zeilen Code in eigener Verantwortung.",
    "case.fidic.metric.routes": "Seiten im Produktions-Build",
    "case.fidic.metric.articles": "Fachartikel, 39 pro Sprache",
    "case.fidic.metric.books": "Vertragsbücher",
    "case.fidic.metric.tools": "Tools und Rechner",
    "case.fidic.metric.languages": "vollständige Sprachen",
    "case.fidic.metric.schema": "schema.org-Typen im Markup",
    "case.fidic.layer.knowledge.title": "Knowledge Graph",
    "case.fidic.layer.knowledge.text": "39 Artikel pro Sprache, 28 aufgeschlüsselte FIDIC-Klauseln, 25 Glossarbegriffe und MDB-Projektfälle - ein typisiertes Content-Modell, drei vollständige Sprachen, keine Teilübersetzung.",
    "case.fidic.layer.books.title": "Atlas aus neun Books",
    "case.fidic.layer.books.text": "Profile vom Red bis White Book übersetzen Scope, Risiko und Einsatzgebiet in eine visuelle Vertragsbibliothek.",
    "case.fidic.layer.tools.title": "Professionelle Workflows",
    "case.fidic.layer.tools.text": "Contract Map, Claim Readiness, Notice Deadline, Risk Scoring, Tender Risk Lab und Book Selector machen aus Wissen konkrete Arbeit. Alle Berechnungen laufen im Browser - Eingaben verlassen das Gerät nicht.",
    "case.fidic.layer.calculators.title": "Vertragsrechner",
    "case.fidic.layer.calculators.text": "Time Bar nach Sub-Clause 20.2, EOT und Delay, Vertragsstrafen, Interim Payment nach Clause 14 und DAAB-Fristen - die fünf Modelle, die ein Vertragsteam ständig neu rechnet.",
    "case.fidic.layer.ai.title": "Ask-FIDIC-Layer",
    "case.fidic.layer.ai.text": "Ask FIDIC AI ruft die Anthropic Messages API über rohes HTTPS auf - so landet kein SDK im Client-Bundle und die Seite bleibt vollständig statisch. Längen- und Verlaufslimits schützen einen kostenpflichtigen öffentlichen Endpunkt.",
    "case.fidic.layer.trust.title": "Trust Infrastructure",
    "case.fidic.layer.trust.text": "Ein CLI-Skript trägt jedes Schulungszertifikat mit QR-Code in ein versioniertes Register ein; prüfen kann es jeder auf einer öffentlichen Seite. Zertifikatsseiten sind zwingend noindex - personenbezogene Daten erreichen den Index nicht.",

    "case.fidic.data.title": "Ein Tender-Archiv, das nichts vergisst.",
    "case.fidic.data.text": "Die Procurement-API der Weltbank liefert immer nur ein gleitendes Fenster - eine Ausschreibung, die herausfällt, ist endgültig weg. Deshalb überschreibt die Pipeline nie. Jeden Morgen führt sie die frische Antwort mit einem kumulativen Archiv zusammen; fällt die Quelle aus, endet der Lauf mit Fehlercode, statt still einen leeren Snapshot zu speichern.",
    "case.fidic.data.stat.notices": "Ausschreibungen im Archiv",
    "case.fidic.data.stat.countries": "Länder in Zentralasien und im Kaukasus",
    "case.fidic.data.stat.depth": "Archivtiefe ab der ersten Ausschreibung",
    "case.fidic.data.stat.refresh": "täglicher unbeaufsichtigter Refresh, in UTC",
    "case.fidic.data.row.source.title": "Quelle",
    "case.fidic.data.row.source.text": "Die World Bank Procurement Notices API, pro Land abgefragt und zu einem einzigen typisierten Datensatz normalisiert.",
    "case.fidic.data.row.schedule.title": "Zeitplan",
    "case.fidic.data.row.schedule.text": "Ein GitHub-Actions-Cronjob. Jeder Bot-Commit trägt den aktuellen Stand offener zu gesamter Ausschreibungen in der Message - der Zustand des Archivs ist allein aus dem Git-Log ablesbar.",
    "case.fidic.data.row.model.title": "Datenmodell",
    "case.fidic.data.row.model.text": "Ein kumulativer Snapshot. Der Lauf führt die API-Antwort mit dem gespeicherten Archiv zusammen, statt es zu ersetzen - Historie wächst, statt zu bröckeln.",
    "case.fidic.data.row.publish.title": "Publikation",
    "case.fidic.data.row.publish.text": "Der aktualisierte Datensatz wird nach main committet, was Rebuild und einen gezielten IndexNow-Ping auslöst - eine Übersichtsseite plus sieben Länderschnitte, in drei Sprachen.",

    "case.fidic.perf.title": "Der größere Teil der Arbeit war Weglassen.",
    "case.fidic.perf.text": "Vier Three.js-Szenen, Smooth Scroll, ein eigener Cursor und magnetische Buttons gingen live - und wurden dann gemessen. Was mehr kostete, als es einbrachte, flog raus: pro Gerät, nicht nach Meinung.",
    "case.fidic.perf.problem": "Was die Messung zeigte",
    "case.fidic.perf.fix": "Was sich geändert hat",
    "case.fidic.perf.1.problem": "Smooth Scroll verschlechterte den LCP auf Telefonen.",
    "case.fidic.perf.1.fix": "Lenis wird auf Mobilgeräten gar nicht mehr geladen. Die Scroll-Animation ist jetzt Desktop-only.",
    "case.fidic.perf.2.problem": "Karten flackerten unter einem Cursor, der sich nicht bewegte.",
    "case.fidic.perf.2.fix": "Die Hover-Logik wurde neu geschrieben, sodass Scrollen sie nicht mehr auslösen kann.",
    "case.fidic.perf.3.problem": "Ein abgebrochener Request konnte eine Seite ohne Styling zurücklassen.",
    "case.fidic.perf.3.fix": "CSS auf Seitenebene wird inline ausgeliefert. Ein fehlgeschlagener Asset-Request kann die Seite nicht mehr entkleiden.",
    "case.fidic.perf.4.problem": "Tabellen und Karten liefen auf Telefonen über.",
    "case.fidic.perf.4.fix": "Die Tender-Tabelle baut sich als Karten neu auf, breite Tabellen bekamen einen Scroll-Indikator, die Startseite wurde zu wischbaren Rails.",
    "case.fidic.perf.5.problem": "Die Suche lieferte Treffer, die nicht zur Anfrage passten.",
    "case.fidic.perf.5.fix": "Die Relevanzlogik wurde neu geschrieben und an echten Suchanfragen nachgeprüft.",
    "case.fidic.perf.principle": "Alles, was Inhalte sichtbar macht - Einblendungen, Zähler - liegt in einem einfachen Skript außerhalb des Build-Bundles. Lädt das Bundle nicht, ist der Inhalt trotzdem da. Ausfallsicherheit schlägt Effekt.",

    "case.fidic.runtime.title": "Statisch als Standard, dynamisch nur, wo es sich lohnt.",
    "case.fidic.runtime.text": "429 Seiten kompilieren zu reinem HTML, ohne Server im Request-Pfad. Drei serverlose Funktionen tragen alles, was wirklich zur Laufzeit passieren muss.",
    "case.fidic.runtime.1.title": "Anthropic Messages API",
    "case.fidic.runtime.1.text": "Ask FIDIC AI wird über rohes HTTPS aufgerufen, damit das SDK nie im Client-Bundle landet. Limits für Anfrage und Verlauf schützen einen kostenpflichtigen öffentlichen Endpunkt.",
    "case.fidic.runtime.2.title": "Telegram Bot API",
    "case.fidic.runtime.2.text": "Leads laufen direkt in einen Chat. Ist kein Bot konfiguriert, antwortet die Funktion bewusst mit non-2xx und das Formular fällt auf ein vorbefülltes mailto zurück - keine Anfrage geht still verloren.",
    "case.fidic.runtime.3.title": "@vercel/og",
    "case.fidic.runtime.3.text": "Social Cards pro Headline in 1200x630, mit Schriften direkt im Funktionsordner, damit Kyrillisch korrekt rendert statt zu Kästchen zu werden.",
    "case.fidic.runtime.4.title": "IndexNow + Wikidata",
    "case.fidic.runtime.4.text": "Ein Deploy bildet geänderte Quelldateien auf die von ihnen gerenderten URLs ab und pingt nur diese. Die Organisations-Entität ist gegen Wikidata geschlossen, damit Suchmaschinen sie eindeutig auflösen.",
    "case.fidic.runtime.5.title": "Eigenes Tooling",
    "case.fidic.runtime.5.text": "Sieben eigens gebaute Skripte: Tender-Sammlung, Changed-URL-Mapping, IndexNow-Übermittlung, OG-Abschneidekontrolle, Zertifikatsausgabe, SEO-Audit und PDF-Extraktion.",
    "case.fidic.runtime.6.title": "32 schema.org-Typen",
    "case.fidic.runtime.6.text": "Article, TechArticle, DefinedTerm, Course, EducationalOccupationalCredential, Dataset und 26 weitere - SEO steckt in der Architektur statt nachträglich obendrauf.",

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
    "studio.notes.more": "Das vollständige Engineering-Log lesen",
    "studio.notes.title": "Die Stellen, die zuerst falsch waren.",
    "studio.notes.lead":
      "Die fertige Oberfläche kann jeder zeigen. Das hier sind die Fehler darunter — denn zu wissen, warum etwas kaputtging, ist die eigentliche Fähigkeit, die hier verkauft wird.",

    // ── Engineering-Log ─────────────────────────────────────────────────────
    "nav.notes": "Notizen",
    "notes.meta.title": "Engineering-Notizen - was auf dieser Seite kaputtging und warum | Rodion Belousov",
    "notes.meta.description": "Ein laufendes Protokoll echter Fehler auf rodionbelousov.studio: ein 12,75-MB-Video, das niemand angefordert hat, ein Ladebildschirm ohne Ende, ein Codec, der verlor, eine Optimierung, die 42 KB kostete.",
    "notes.kicker": "Engineering-Log / rodionbelousov.studio",
    "notes.title": "Was kaputtging - und was es gekostet hat.",
    "notes.lead": "Die fertige Oberfläche kann jeder zeigen, und inzwischen kann sie jeder generieren. Das hier ist der Teil, der nicht aus einem Prompt fällt: die Stellen, die zuerst falsch waren, wie sie gefunden wurden, und die zwei Einträge, bei denen die richtige Antwort war, die Arbeit wegzuwerfen.",
    "notes.count": "Einträge",
    "notes.measured": "Jede Zahl hier ist gemessen, nicht geschätzt.",
    "notes.outro": "Diese Liste wird nur länger. Genau darum geht es.",
    "notes.cta": "Die Systeme ansehen, aus denen das stammt",

    "note.1.title": "Mobil zahlt einen anderen Preis",
    "note.1.text": "Das Archiv renderte jeden Frame doppelt: die Szene in ein Render-Target, danach ein Vollbild-Composite für Korn und Vignette. Auf einer Handy-GPU ist diese Speicherbandbreite das gesamte Budget. Jetzt wird direkt auf den Bildschirm gezeichnet, und das Composite läuft nur während eines Übergangs.",
    "note.2.title": "Reduce Motion ist kein Ausschalter",
    "note.2.text": "Der Preloader fror sein Objekt mit animation-play-state: paused ein. Auf jedem Handy mit aktiviertem Reduce Motion las sich das als kaputte Seite - ein Würfel, der stillsteht. Jetzt dreht er sich langsam, statt zu sterben.",
    "note.3.title": "Die Locale-Falle",
    "note.3.text": "Unter /en/ und /de/ lagen Klone der Startseite, und die Wortmarke zeigte darauf. Ein Sprachwechsel auf einer Leistungsseite strandete dich auf einem Duplikat ohne Rückweg. Die Klone sind weg, per 301 auf das echte Zuhause umgeleitet, und Locale gilt nur noch für echt lokalisierte Inhalte.",
    "note.4.title": "Der Film, der lud, bevor ihn jemand angefordert hat",
    "note.4.text": "Ein scroll-gesteuerter Film stand mit Quelle und preload=auto direkt im Markup - für einen Abschnitt, der drei Bildschirme weiter unten beginnt. Jeder Besucher zog alle 12,75 MB ab dem ersten Frame. Auf einem Telefon mit schwacher Verbindung war die Seite nach etwa einer Sekunde gezeichnet und fühlte sich danach eingefroren an, weil die Leitung minutenlang ausgelastet blieb. Die Quelle wird jetzt erst beim Herannahen angehängt, unter Save-Data gar nicht. Der Transfer der Startseite fiel von 12,92 MB auf 0,16 MB.",
    "note.5.title": "Ein Ladebildschirm, der nie enden konnte",
    "note.5.text": "Das Intro hielt overflow:hidden und touch-action:none auf dem Dokument, solange es lief. Jeder Weg, der diese Sperre löste, lag in der Animation-Frame-Schleife - auch die Notbremse, die selbst eine Zeile dieser Schleife war. Alles, was die Schleife anhielt, hinterließ also eine gezeichnete, lesbare und dauerhaft nicht scrollbare Seite, die nur ein Reload rettete. Die Freigabe hängt jetzt zusätzlich an einem einfachen Timer, der feuert, ob je ein Frame geliefert wird oder nicht. Geprüft, indem requestAnimationFrame komplett stillgelegt wurde.",
    "note.6.title": "Silbentrennung bricht nur dort, wo das Wörterbuch liegt",
    "note.6.text": "Ein Case-Titel trug hyphens:auto, eingeführt, damit lange deutsche Überschriften sauber umbrechen. Android Chrome liefert das Trennwörterbuch mit, Desktop-Linux meist nicht. Also trennte der Titel auf dem Telefon als FIDIC - fi- / dic.uz und sah auf jeder Maschine, auf der er gebaut wurde, perfekt aus. Beide Hälften passen bis 320px in ihre eigene Zeile - das Leerzeichen war immer der einzige gewünschte Umbruch.",
    "note.7.title": "Der Codec, der auf dem Papier gewann",
    "note.7.text": "AV1 wurde für alle drei Filme neben H.264 kodiert. Es verkleinerte die beiden 1080p30-Clips um bis zu 78% - und fiel beim 60-fps-Film größer aus als H.264, weil eine einzelne CRF-Zahl über Codecs hinweg nicht denselben Qualitätspunkt trifft. Es auszuliefern hätte Feintuning pro Datei plus Formataushandlung in vier Komponenten bedeutet, für einen Gewinn, der sich bei einer von drei Dateien umkehrt und den iOS größtenteils nicht nutzen kann. Gemessen, dann verworfen.",
    "note.8.title": "Die Optimierung, die 42 KB kostete",
    "note.8.text": "three.js zu einem dynamischen Import machen, damit Geräte ohne WebGL-Hintergrund auch den Download sparen. Es funktionierte - und der gemeinsame Chunk wuchs von 528 KB auf 674 KB, weil ein dynamischer Import den Bundler zwingt, den gesamten Namespace zu behalten, statt ihn zu tree-shaken. Das sind 42 KB mehr für jeden normalen Besucher, um einer Minderheit etwas zu sparen, und der Download rutschte in genau das Fenster, das den LCP bestimmt. Noch in derselben Stunde zurückgenommen.",

    "studio.cta.insight": "Wo KI hilft — und wo sie das falsche Werkzeug ist",
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
    "footer.colophon": "Wie diese Seite gebaut ist",
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
