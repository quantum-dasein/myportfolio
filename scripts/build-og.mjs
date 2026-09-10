// ─────────────────────────────────────────────────────────────────────────────
//  build-og.mjs — the social cards, one per URL, in that URL's language.
//
//  Why a generator and not thirty-five hand-made images:
//
//  A crawler (WhatsApp, Telegram, LinkedIn, Facebook) fetches the URL, reads the
//  meta tags and never runs JavaScript. It has no idea the site can swap its own
//  language in the browser. So a poster is a property of the URL, not of the
//  visitor — and the only pages that can have a German poster are the ones that
//  already are a German URL. There are twenty-four of those, in twelve pairs.
//  Hand-drawing both halves of twelve pairs and keeping the words in step with
//  the site is not a thing that survives contact with a second copy edit.
//
//  So the art and the words are separated. The art is a plate: a language-free
//  render, black ground, one sculptural object on the right. The words are baked
//  on afterwards in the site's own typeface, from the table below, per language.
//  A pair costs one plate and two lines of text instead of two illustrations,
//  and German never comes back from an image model with mangled diacritics.
//
//  Run it with `npm run og`. It is not part of the build: it writes JPEGs into
//  public/og/ and those get committed, so the deploy stays a static build with
//  no browser in it.
//
//  Adding a plate: drop a 1200x630 JPEG into public/og/plates/ and name it in
//  the `plate` field. Without one a card renders the procedural ground, which is
//  the same black, the same floor grid and the same haze, minus the object.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Playwright is a devDependency here and nothing else on the site needs it, so
// resolve it at call time with a message that says what to install rather than
// a module-not-found stack. PLAYWRIGHT_MODULE covers a global install.
const loadChromium = async () => {
  for (const id of [process.env.PLAYWRIGHT_MODULE, "playwright", "playwright-core"].filter(Boolean)) {
    try { return (await import(id)).chromium; } catch { /* try the next one */ }
  }
  console.error("This script needs Playwright:  npm i -D playwright && npx playwright install chromium");
  process.exit(1);
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "og");
const plateDir = path.join(outDir, "plates");

/** The one place the poster copy lives. `en` and `de` are the two halves of a
 *  localized pair; a card with only `en` belongs to a single-URL page. */
const cards = [
  // ── Case studies. These were pointing at the portrait 1086x1448 WebP used on
  //    the page itself: the wrong shape for a 1.91:1 slot, and a format LinkedIn
  //    does not render at all, so those links unfurled with no image.
  {
    file: "case-bridge-consult",
    plate: "bridge.jpg",
    art: "/cases/rodion-belousov-bridge-consult-ai-assisted-web-development-case-study.webp",
    en: {
      eyebrow: "Case Study / Infrastructure Consulting",
      title: "Bridge Consult",
      spec: [["Organic search", "+780%"], ["Stack", "Astro / Three.js"], ["Languages", "RU / EN / UZ"]],
      foot: "POSITIONING · CONTENT ARCHITECTURE · TECHNICAL SEO · BUILD",
    },
  },
  {
    file: "case-fidic",
    plate: "fidic.jpg",
    art: "/cases/rodion-belousov-fidic-uz-contract-knowledge-platform-design.webp",
    en: {
      eyebrow: "Case Study / Knowledge Platform",
      title: "FIDIC.uz",
      spec: [["Pages", "429"], ["Expert articles", "117"], ["Tenders", "2 900+"]],
      foot: "A SOLO-BUILT CONTRACT PLATFORM IN THREE LANGUAGES",
    },
  },
  {
    file: "case-academy",
    plate: "academy.jpg",
    art: "/cases/rodion-belousov-bridge-consult-academy-one-page-course-landing.webp",
    en: {
      eyebrow: "Case Study / One-page course landing",
      title: "One page.\nEighteen modules.",
      spec: [["Modules", "18"], ["Languages", "3"], ["Third-party JS", "0"]],
      foot: "BRIDGE CONSULT ACADEMY · THE SMALL END OF THE SAME PRACTICE",
    },
  },

  // ── The Vienna profile: a real DE/EN pair, and the page most likely to be
  //    pasted into a chat by someone recommending him.
  {
    file: "profile-vienna",
    plate: "profile.jpg",
    en: {
      eyebrow: "Vienna, Austria / International · Remote",
      title: "Rodion Belousov\nin Vienna.",
      spec: [["From", "€590"], ["Reply", "Within a day"], ["Since", "2022"]],
      foot: "WEBSITES · SHOPS · SEO · 3D & FILM",
    },
    de: {
      eyebrow: "Wien, Österreich / International · Remote",
      title: "Rodion Belousov\nin Wien.",
      spec: [["Ab", "590 €"], ["Antwort", "Binnen eines Tages"], ["Seit", "2022"]],
      foot: "WEBSITES · SHOPS · SEO · 3D & FILM",
    },
  },

  // ── The commercial pages.
  {
    file: "services",
    plate: "services.jpg",
    en: {
      eyebrow: "Services & Research / Vienna",
      title: "What it is,\nand what it costs.",
      spec: [["Project sizes", "Seven"], ["From", "€590"], ["Price fixed", "In a day"]],
      foot: "LANDING · WEBSITE · 3D FILM · SHOP · SEO · PLATFORM · SHOWREEL",
    },
    de: {
      eyebrow: "Leistungen & Research / Wien",
      title: "Was es ist —\nund was es kostet.",
      spec: [["Projektgrößen", "Sieben"], ["Ab", "590 €"], ["Preis fix", "In einem Tag"]],
      foot: "LANDING · WEBSITE · 3D-FILM · SHOP · SEO · PLATTFORM · SHOWREEL",
    },
  },
  {
    file: "contact",
    plate: "contact.jpg",
    en: {
      eyebrow: "Contact / Vienna",
      title: "Tell me\nwhat you need.",
      spec: [["Questions", "Three"], ["Answer", "Usually same day"], ["You get", "Price and date"]],
      foot: "WHAT · WHEN · ROUGHLY HOW MUCH — ENOUGH TO QUOTE FROM",
    },
    de: {
      eyebrow: "Kontakt / Wien",
      title: "Sagen Sie mir,\nwas Sie brauchen.",
      spec: [["Fragen", "Drei"], ["Antwort", "Meist am selben Tag"], ["Sie bekommen", "Preis und Termin"]],
      foot: "WAS · WANN · UNGEFÄHR WIE VIEL — GENUG FÜR EIN ANGEBOT",
    },
  },
  {
    file: "websites",
    plate: "websites.jpg",
    en: {
      eyebrow: "Website Development / Vienna",
      title: "Live in about\na week.",
      spec: [["From", "€1,190"], ["Pages", "5–10"], ["Ownership", "Yours"]],
      foot: "FIXED SCOPE · FIXED PRICE · NO BUILDER SUBSCRIPTION",
    },
    de: {
      eyebrow: "Website erstellen / Wien",
      title: "In etwa einer\nWoche live.",
      spec: [["Ab", "1.190 €"], ["Seiten", "5–10"], ["Eigentum", "Ihres"]],
      foot: "FESTER UMFANG · FESTPREIS · KEINE BAUKASTEN-GEBÜHR",
    },
  },
  {
    file: "motion",
    plate: "motion.jpg",
    // The ski film rather than the POS one: this card is the preview every
    // share of the page carries, and a nicotine product is the wrong thing to
    // put on a B2B service page's poster on platforms that restrict it.
    art: "/portfolio/rodion-belousov-ski-snowboard-equipment-3d-product-animation-poster.jpg",
    en: {
      eyebrow: "3D & Motion / Vienna",
      title: "3D animation\nand video.",
      spec: [["From", "€890"], ["Pipeline", "C4D + Redshift"], ["In the archive", "9 works"]],
      foot: "PRODUCT FILM · INTERIORS · EXPLAINERS · WEB LOOPS",
    },
    de: {
      eyebrow: "3D & Motion / Wien",
      title: "3D-Animation\nund Video.",
      spec: [["Ab", "890 €"], ["Pipeline", "C4D + Redshift"], ["Im Archiv", "9 Arbeiten"]],
      foot: "PRODUKTFILM · INTERIEUR · ERKLÄRVIDEO · WEB-LOOPS",
    },
  },

  // ── The niche pages. Each one is written around what that trade is bound by,
  //    so the poster says the thing that trade recognises.
  {
    file: "niche-arztpraxis",
    plate: "arztpraxis.jpg",
    en: {
      eyebrow: "Website for a medical practice / Vienna",
      title: "The four questions\nthey came with.",
      spec: [["Above the fold", "All four"], ["Appointment", "One tap"], ["§53 Ärztegesetz", "Inside it"]],
      foot: "HOURS · INSURANCE · LOCATION · APPOINTMENT",
    },
    de: {
      eyebrow: "Website Arztpraxis / Wien",
      title: "Die vier Fragen,\nderetwegen sie kommen.",
      spec: [["Im ersten Bild", "Alle vier"], ["Termin", "Ein Tipp"], ["§ 53 Ärztegesetz", "Eingehalten"]],
      foot: "ZEITEN · KASSE · ANFAHRT · TERMIN",
    },
  },
  {
    file: "niche-restaurant",
    plate: "restaurant.jpg",
    en: {
      eyebrow: "Website for a restaurant / Vienna",
      title: "For someone\noutside, hungry.",
      spec: [["The menu", "As text"], ["Allergens", "Per dish"], ["A table", "One tap"]],
      foot: "READABLE IN ONE TAP · CHANGEABLE IN A MINUTE · NO PDF",
    },
    de: {
      eyebrow: "Website Restaurant / Wien",
      title: "Für den, der\nhungrig davorsteht.",
      spec: [["Die Karte", "Als Text"], ["Allergene", "Je Gericht"], ["Ein Tisch", "Ein Tipp"]],
      foot: "IN EINEM TIPP LESBAR · IN EINER MINUTE ÄNDERBAR · KEIN PDF",
    },
  },
  {
    file: "niche-handwerker",
    plate: "handwerker.jpg",
    en: {
      eyebrow: "Website for tradespeople / Vienna",
      title: "When the bathroom\nis flooding.",
      spec: [["To call", "One tap"], ["Area", "Your districts"], ["Emergency", "Answered"]],
      foot: "FOUND ON A PHONE, IN A HURRY, BY SOMEONE WITH A PROBLEM",
    },
    de: {
      eyebrow: "Website Handwerker / Wien",
      title: "Wenn das Bad\nunter Wasser steht.",
      spec: [["Anruf", "Ein Tipp"], ["Gebiet", "Ihre Bezirke"], ["Notdienst", "Beantwortet"]],
      foot: "AM HANDY GEFUNDEN, IN EILE, VON JEMANDEM MIT EINEM PROBLEM",
    },
  },

  // ── Research. These were pointing at raw artefacts: a 1920x874 GitHub
  //    screenshot and a 1179x2556 phone capture of a GA4 chart. Neither is a
  //    1.91:1 card, and the portrait one cropped to a band of grey.
  {
    file: "insight-bridge-growth",
    plate: "insight-growth.jpg",
    en: {
      eyebrow: "Research / Organic growth",
      title: "5 to 44 sessions\nin three weeks.",
      spec: [["Organic", "+780%"], ["Window", "3 weeks"], ["Source", "GA4"]],
      foot: "BRIDGE CONSULT · WHAT A MULTILINGUAL LAUNCH SYSTEM DID",
    },
    de: {
      eyebrow: "Research / Organisches Wachstum",
      title: "Von 5 auf 44\nin drei Wochen.",
      spec: [["Organisch", "+780%"], ["Zeitraum", "3 Wochen"], ["Quelle", "GA4"]],
      foot: "BRIDGE CONSULT · WAS EIN MEHRSPRACHIGES LAUNCH-SYSTEM BEWIRKT",
    },
  },
  {
    file: "insight-fidic-platform",
    plate: "insight-platform.jpg",
    en: {
      eyebrow: "Research / Content architecture",
      title: "429 pages\nthat can be found.",
      spec: [["Pages", "429"], ["Articles", "117"], ["Languages", "3"]],
      foot: "FIDIC.UZ · ONE TYPED CONTENT MODEL, THREE LANGUAGES",
    },
    de: {
      eyebrow: "Research / Content-Architektur",
      title: "429 Seiten,\ndie gefunden werden.",
      spec: [["Seiten", "429"], ["Fachartikel", "117"], ["Sprachen", "3"]],
      foot: "FIDIC.UZ · EIN TYPISIERTES CONTENT-MODELL, DREI SPRACHEN",
    },
  },
  {
    file: "insight-threejs",
    plate: "insight-threejs.jpg",
    en: {
      eyebrow: "Research / Real-time 3D",
      title: "When 3D lifts,\nand when it kills.",
      spec: [["Measured on", "Real devices"], ["Budgets", "DPR / textures"], ["Weak hardware", "Opted out"]],
      foot: "THREE.JS ON MARKETING SITES · WHAT IT COSTS AND WHAT IT RETURNS",
    },
    de: {
      eyebrow: "Research / Echtzeit-3D",
      title: "Wann 3D hebt —\nund wann es tötet.",
      spec: [["Gemessen auf", "Echten Geräten"], ["Budgets", "DPR / Texturen"], ["Schwache Geräte", "Ausgenommen"]],
      foot: "THREE.JS AUF MARKETING-SITES · WAS ES KOSTET UND WAS ES BRINGT",
    },
  },
  {
    file: "insight-ai",
    plate: "insight-ai.jpg",
    en: {
      eyebrow: "Research / AI-assisted development",
      title: "Speed without\noutsourcing taste.",
      spec: [["Pace", "AI"], ["Direction", "Human"], ["Accountable", "One person"]],
      foot: "WHAT A CLIENT IS ACTUALLY BUYING WHEN ANYONE CAN GENERATE A SITE",
    },
    de: {
      eyebrow: "Research / AI-gestützte Entwicklung",
      title: "Tempo, ohne den\nGeschmack abzugeben.",
      spec: [["Tempo", "AI"], ["Richtung", "Mensch"], ["Verantwortlich", "Eine Person"]],
      foot: "WAS EIN KUNDE WIRKLICH KAUFT, WENN JEDER EINE SEITE GENERIEREN KANN",
    },
  },

  // ── The remaining practice areas, and the pages that were sharing a card
  //    with a neighbour.
  {
    file: "digital-marketing",
    plate: "marketing.jpg",
    en: {
      eyebrow: "Digital Marketing / Vienna",
      title: "Built as one\nsystem.",
      spec: [["Organic search", "+780%"], ["Pages shipped", "429"], ["Languages", "3"]],
      foot: "POSITIONING · RESEARCH · CONTENT ARCHITECTURE · DISTRIBUTION",
    },
    de: {
      eyebrow: "Digital Marketing / Wien",
      title: "Als ein System\ngebaut.",
      spec: [["Organische Suche", "+780%"], ["Seiten gebaut", "429"], ["Sprachen", "3"]],
      foot: "POSITIONIERUNG · RESEARCH · CONTENT-ARCHITEKTUR · DISTRIBUTION",
    },
  },
  {
    file: "technical-seo",
    plate: "seo.jpg",
    en: {
      eyebrow: "Technical SEO / Vienna",
      title: "Ambition that\nstill indexes.",
      spec: [["Schema types", "32"], ["Hreflang", "3 languages"], ["Pages", "429"]],
      foot: "CRAWLABLE ARCHITECTURE · STRUCTURED DATA · PERFORMANCE BUDGETS",
    },
    de: {
      eyebrow: "Technical SEO / Wien",
      title: "Anspruch, der\ntrotzdem indexiert.",
      spec: [["Schema-Typen", "32"], ["Hreflang", "3 Sprachen"], ["Seiten", "429"]],
      foot: "CRAWLBARE ARCHITEKTUR · STRUKTURIERTE DATEN · BUDGETS",
    },
  },
  {
    file: "creative-development",
    plate: "creative.jpg",
    en: {
      eyebrow: "Creative Development / Vienna",
      title: "3D that does not\ncost the vitals.",
      spec: [["Target", "60 FPS"], ["Shaders", "Hand-written"], ["Weak devices", "CSS instead"]],
      foot: "ASTRO · THREE.JS · GSAP · GLSL · MEASURED ON REAL PHONES",
    },
    de: {
      eyebrow: "Creative Development / Wien",
      title: "3D, das die Vitals\nnicht kostet.",
      spec: [["Zielwert", "60 FPS"], ["Shader", "Handgeschrieben"], ["Schwache Geräte", "CSS stattdessen"]],
      foot: "ASTRO · THREE.JS · GSAP · GLSL · AUF ECHTEN HANDYS GEMESSEN",
    },
  },
  {
    file: "notes",
    plate: "notes.jpg",
    en: {
      eyebrow: "Engineering notes",
      title: "What broke,\nand what it cost.",
      spec: [["Format", "A running log"], ["Includes", "2 reversals"], ["Written", "After the fact"]],
      foot: "A FINISHED SURFACE PROVES LITTLE — THIS IS THE REST OF THE JOB",
    },
  },
  {
    file: "gallery",
    plate: "gallery.jpg",
    art: "/portfolio/rodion-belousov-luxury-interior-lighting-3d-visualization.webp",
    en: {
      eyebrow: "Archive / 3D & Motion",
      title: "The work that\ncame before.",
      spec: [["Works", "9"], ["Films", "3"], ["Tools", "C4D / RS / AE"]],
      foot: "PRODUCT · INTERIOR · ARCHITECTURE · ART DIRECTION · VIENNA",
    },
  },
  {
    file: "colophon",
    plate: "colophon.jpg",
    en: {
      eyebrow: "Colophon / How this site is built",
      title: "Every decision,\nwritten down.",
      spec: [["Stack", "Astro / Three.js"], ["Sound", "Web Audio API"], ["Also listed", "What was cut"]],
      foot: "THE SITE, TAKEN APART BY THE PERSON WHO BUILT IT",
    },
  },
];

const font = readFileSync(path.join(root, "public", "rb-space.woff2")).toString("base64");

const plateFor = (name) => {
  if (!name) return null;
  const file = path.join(plateDir, name);
  if (!existsSync(file)) return null;
  return readFileSync(file).toString("base64");
};

// `art` is different from `plate`: a plate is a full-bleed 1200x630 composition
// made for the card, while art is an image the site already owns — a case
// screenshot, a film poster — dissolved into the right side. It is only used
// where showing that picture is honest: a case study's card showing that case,
// and the film pages showing their own films. A service page does not get a
// client's screenshot; that reads as sharing the client's site.
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const artFor = (relative) => {
  if (!relative) return null;
  const file = path.join(root, "public", relative.replace(/^\//, ""));
  if (!existsSync(file)) return null;
  const type = MIME[path.extname(file).toLowerCase()];
  if (!type) return null;
  return `data:${type};base64,${readFileSync(file).toString("base64")}`;
};

const escape = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// German compounds are long and the object lives on the right, so the size has
// to come from the longest LINE rather than the total length: "Eine
// Unternehmens-Website," is one line that must not run under the sculpture.
const titleSize = (title) => {
  const longest = Math.max(...title.split("\n").map((line) => line.length));
  if (longest <= 16) return 72;
  if (longest <= 22) return 64;
  if (longest <= 28) return 56;
  return 48;
};

// A deterministic scatter, so a card looks the same every time it is rebuilt
// and a diff of public/og/ stays honest about what actually changed.
const stars = (() => {
  let seed = 8675309;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  return Array.from({ length: 54 }, () => {
    const x = (rnd() * 100).toFixed(2);
    const y = (rnd() * 100).toFixed(2);
    const size = (rnd() * 2.2 + 0.6).toFixed(2);
    const alpha = (rnd() * 0.5 + 0.12).toFixed(2);
    return `<i style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;opacity:${alpha}"></i>`;
  }).join("");
})();

const template = ({ eyebrow, title, foot, spec = [] }, plate, lang, art) => `<!doctype html>
<meta charset="utf-8">
<style>
  @font-face { font-family: 'RB Space'; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900; font-display: block; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    position: relative; overflow: hidden;
    background: radial-gradient(ellipse 90% 70% at 22% 8%, #0d1014, #030405 62%);
    font-family: 'RB Space', system-ui, sans-serif;
    color: #f4f6f9;
  }
  /* A hand-made plate wins over everything procedural below it. Without one the
     card still gets a composed picture rather than an empty black rectangle,
     which is what these looked like before: a headline on a void. */
  .plate {
    position: absolute; inset: 0;
    background: ${plate ? `#000 url(data:image/jpeg;base64,${plate}) center/cover no-repeat` : "transparent"};
  }

  /* ── The object ───────────────────────────────────────────────────────────
     The site's own chrome form, rebuilt in gradients: a dark sphere lit from
     the upper left with a bright rim, a horizon reflection across its middle
     and a soft bloom behind it. */
  .orb {
    position: absolute; right: -92px; top: 50%;
    width: 512px; height: 512px; margin-top: -256px;
    border-radius: 50%;
    background:
      /* the specular, small and hard — a big soft blob reads as a lamp, not chrome */
      radial-gradient(circle at 33% 23%, rgba(255,255,255,.98) 0 2.2%, rgba(255,255,255,.30) 5.5%, transparent 15%),
      radial-gradient(ellipse 20% 9% at 57% 16%, rgba(255,255,255,.22), transparent 70%),
      /* the horizon the sphere is standing in */
      linear-gradient(180deg, transparent 46%, rgba(206,224,244,.20) 51%, rgba(206,224,244,.04) 55%, transparent 60%),
      /* bounce off the floor grid below it */
      radial-gradient(ellipse 62% 30% at 50% 93%, rgba(148,174,206,.26), transparent 70%),
      /* the body has to sit clearly above the page's own black or the sphere
         disappears and only its highlights float there */
      radial-gradient(circle at 38% 30%, #424b55 0%, #222831 38%, #10141a 72%, #0a0d11 100%);
    box-shadow:
      inset 0 0 120px rgba(0,0,0,.66),
      0 54px 140px rgba(0,0,0,.9),
      0 0 90px rgba(150,180,215,.10);
    ${plate || art ? "display: none;" : ""}
  }
  /* Rim light: bright where the key is, a colder trace where the floor throws
     light back up. Masked to a ring so it only touches the silhouette. */
  .orb::after {
    content: ""; position: absolute; inset: 0; border-radius: 50%;
    background: linear-gradient(212deg, rgba(255,255,255,.72) 0 16%, rgba(255,255,255,.06) 42% 58%, rgba(174,199,226,.38) 94%);
    -webkit-mask-image: radial-gradient(circle at 50% 50%, transparent 0 96.4%, #000 96.4%);
  }
  .bloom {
    position: absolute; right: -30px; top: 50%;
    width: 720px; height: 720px; margin-top: -360px;
    background: radial-gradient(circle at 50% 50%, rgba(178,198,222,.16), transparent 62%);
    ${plate ? "opacity:.4;" : ""}
  }

  /* The site's own picture of the thing the card is about, dissolved into the
     ground from the right so it never turns into a pasted rectangle. */
  .art {
    position: absolute; right: 0; top: 0; bottom: 0; width: 58%;
    background: ${art ? `url(${art}) center/cover no-repeat` : "none"};
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 34%, #000 88%, transparent),
      linear-gradient(180deg, transparent, #000 16%, #000 84%, transparent);
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
    opacity: .92;
  }

  .stars { position: absolute; inset: 0; }
  .stars i { position: absolute; display: block; border-radius: 50%; background: #dfe7f2; }

  .floor {
    position: absolute; inset: 56% 0 0;
    background:
      repeating-linear-gradient(to right, rgba(255,255,255,.07) 0 1px, transparent 1px 74px),
      repeating-linear-gradient(to bottom, rgba(255,255,255,.07) 0 1px, transparent 1px 46px);
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 34%, transparent);
    transform: perspective(520px) rotateX(64deg);
    transform-origin: top center;
    opacity: ${plate ? ".26" : ".62"};
  }
  /* The text column sits left; this is what guarantees its contrast whatever is
     behind it. */
  .scrim {
    position: absolute; inset: 0;
    background: linear-gradient(100deg, #030405 0 24%, rgba(3,4,5,.9) 42%, rgba(3,4,5,.42) 60%, transparent 82%);
  }

  /* ── The frame ────────────────────────────────────────────────────────────
     Four corner ticks and a hairline. It is what makes a card read as a made
     object rather than a screenshot of a paragraph. */
  .frame { position: absolute; inset: 26px; border: 1px solid rgba(244,246,249,.10); }
  .frame span { position: absolute; width: 13px; height: 13px; border: 0 solid rgba(244,246,249,.55); }
  .frame span:nth-child(1) { left: -1px; top: -1px; border-left-width: 1px; border-top-width: 1px; }
  .frame span:nth-child(2) { right: -1px; top: -1px; border-right-width: 1px; border-top-width: 1px; }
  .frame span:nth-child(3) { left: -1px; bottom: -1px; border-left-width: 1px; border-bottom-width: 1px; }
  .frame span:nth-child(4) { right: -1px; bottom: -1px; border-right-width: 1px; border-bottom-width: 1px; }

  .card { position: absolute; inset: 0; padding: 58px 66px; display: flex; flex-direction: column; }
  .top { display: flex; align-items: center; justify-content: space-between; }
  .badge {
    width: 58px; height: 58px; border-radius: 50%;
    display: grid; place-items: center;
    border: 1px solid rgba(244,246,249,.42);
    background: radial-gradient(circle at 32% 28%, rgba(255,255,255,.22), rgba(255,255,255,.02) 62%);
    font-size: 19px; font-weight: 500; letter-spacing: .06em;
  }
  .lang {
    padding: 7px 14px; border: 1px solid rgba(244,246,249,.22); border-radius: 100px;
    font-size: 12px; letter-spacing: .2em; color: rgba(244,246,249,.62);
  }

  /* Hard left column. Every plate is composed with its object right of this. */
  .body { margin-top: auto; max-width: 640px; }
  .eyebrow {
    font-size: 16px; font-weight: 400; letter-spacing: .22em; text-transform: uppercase;
    color: rgba(244,246,249,.58);
  }
  h1 {
    margin: 20px 0 22px;
    font-size: ${titleSize(title)}px;
    font-weight: 500; line-height: 1.02; letter-spacing: -.025em;
    white-space: pre-line;
  }
  .rule { width: 76px; height: 1px; background: rgba(244,246,249,.34); }

  /* The row that carries the actual information. Three facts, labelled — the
     difference between a poster and a quote graphic. */
  .spec { display: flex; gap: 40px; margin: 22px 0 20px; }
  .spec > div { position: relative; padding-left: 15px; }
  .spec > div::before {
    content: ""; position: absolute; left: 0; top: 3px; bottom: 3px; width: 1px;
    background: rgba(244,246,249,.24);
  }
  .spec dt {
    font-size: 11.5px; letter-spacing: .2em; text-transform: uppercase;
    color: rgba(244,246,249,.44);
  }
  .spec dd { margin-top: 6px; font-size: 21px; font-weight: 500; letter-spacing: -.01em; }
  .foot {
    font-size: 14px; font-weight: 400; letter-spacing: .17em; text-transform: uppercase;
    color: rgba(244,246,249,.46);
  }
  .mark {
    position: absolute; right: 66px; bottom: 58px;
    font-size: 13px; letter-spacing: .14em; color: rgba(244,246,249,.42);
  }
</style>
<div class="plate"></div>
<div class="art"></div>
<div class="floor"></div>
<div class="stars">${stars}</div>
<div class="bloom"></div>
<div class="orb"></div>
<div class="scrim"></div>
<div class="frame"><span></span><span></span><span></span><span></span></div>
<div class="card">
  <div class="top">
    <div class="badge">RB</div>
    <div class="lang">${lang.toUpperCase()}</div>
  </div>
  <div class="body">
    <div class="eyebrow">${escape(eyebrow)}</div>
    <h1>${escape(title)}</h1>
    <div class="rule"></div>
    ${spec.length ? `<dl class="spec">${spec.map(([k, v]) => `<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join("")}</dl>` : ""}
    <div class="foot">${escape(foot)}</div>
  </div>
  <div class="mark">rodionbelousov.studio</div>
</div>`;

mkdirSync(plateDir, { recursive: true });

const chromium = await loadChromium();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const page = await context.newPage();

let written = 0;
let missingPlates = new Set();

for (const card of cards) {
  for (const lang of ["en", "de"]) {
    const copy = card[lang];
    if (!copy) continue;
    const plate = plateFor(card.plate);
    const art = artFor(card.art);
    if (card.plate && !plate) missingPlates.add(card.plate);
    // A single-language card keeps the bare name so its filename stays stable;
    // a pair is suffixed, because both halves have to exist side by side.
    const name = card.de ? `${card.file}-${lang}` : card.file;
    await page.setContent(template(copy, plate, lang, art), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(outDir, `${name}.jpg`), type: "jpeg", quality: 86 });
    written++;
    console.log(`  ${name}.jpg`.padEnd(34) + (plate ? `plate: ${card.plate}` : art ? `art: ${card.art}` : "procedural ground"));
  }
}

await browser.close();
console.log(`\n${written} card(s) written to public/og/`);
if (missingPlates.size) {
  console.log(`\nNo plate yet for: ${[...missingPlates].join(", ")}`);
  console.log(`Drop 1200x630 JPEGs with those names into public/og/plates/ and run again.`);
}
