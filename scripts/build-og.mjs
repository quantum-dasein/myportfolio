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
    en: { eyebrow: "Case Study / Infrastructure Consulting", title: "Bridge Consult", foot: "+780% ORGANIC SEARCH · ASTRO · THREE.JS · 3 LANGUAGES" },
  },
  {
    file: "case-fidic",
    plate: "fidic.jpg",
    en: { eyebrow: "Case Study / Knowledge Platform", title: "FIDIC.uz", foot: "429 PAGES · 117 ARTICLES · 2 981 TENDERS · 3 LANGUAGES" },
  },
  {
    file: "case-academy",
    plate: "academy.jpg",
    en: { eyebrow: "Case Study / One-page course landing", title: "One page.\nEighteen modules.", foot: "BRIDGE CONSULT ACADEMY · 3 LANGUAGES · 0 THIRD-PARTY SCRIPTS" },
  },

  // ── The Vienna profile: a real DE/EN pair, and the page most likely to be
  //    pasted into a chat by someone recommending him.
  {
    file: "profile-vienna",
    plate: "profile.jpg",
    en: { eyebrow: "Vienna, Austria / International · Remote", title: "Rodion Belousov\nin Vienna.", foot: "WEBSITES · SHOPS · SEO · FROM €690" },
    de: { eyebrow: "Wien, Österreich / International · Remote", title: "Rodion Belousov\nin Wien.", foot: "WEBSITES · SHOPS · SEO · AB 690 €" },
  },

  // ── The commercial pages.
  {
    file: "services",
    plate: "services.jpg",
    en: { eyebrow: "Services & Research / Vienna", title: "What it is,\nand what it costs.", foot: "SIX PROJECT SIZES · STARTING PRICES · FIXED IN A DAY" },
    de: { eyebrow: "Leistungen & Research / Wien", title: "Was es ist —\nund was es kostet.", foot: "SECHS PROJEKTGRÖSSEN · STARTPREISE · IN EINEM TAG FIX" },
  },
  {
    file: "contact",
    plate: "contact.jpg",
    en: { eyebrow: "Contact / Vienna", title: "Tell me\nwhat you need.", foot: "THREE ANSWERS · A FIXED PRICE AND A DATE, USUALLY SAME DAY" },
    de: { eyebrow: "Kontakt / Wien", title: "Sagen Sie mir,\nwas Sie brauchen.", foot: "DREI ANTWORTEN · FESTER PREIS UND TERMIN, MEIST AM SELBEN TAG" },
  },
  {
    file: "websites",
    plate: "websites.jpg",
    en: { eyebrow: "Website Development / Vienna", title: "Live in about\na week.", foot: "UNTERNEHMENS-WEBSITE · FIXER UMFANG · FIXER PREIS · FROM €1,490" },
    de: { eyebrow: "Website erstellen / Wien", title: "In etwa einer\nWoche live.", foot: "UNTERNEHMENS-WEBSITE · FESTER PREIS · IHR EIGENTUM · AB 1.490 €" },
  },

  // ── The niche pages. Each one is written around what that trade is bound by,
  //    so the poster says the thing that trade recognises.
  {
    file: "niche-arztpraxis",
    plate: "arztpraxis.jpg",
    en: { eyebrow: "Website for a medical practice / Vienna", title: "The four questions\nthey came with.", foot: "HOURS · INSURANCE · LOCATION · APPOINTMENT — ABOVE THE FOLD" },
    de: { eyebrow: "Website Arztpraxis / Wien", title: "Die vier Fragen,\nderetwegen sie kommen.", foot: "ZEITEN · KASSE · ANFAHRT · TERMIN — IM ERSTEN BILDSCHIRM" },
  },
  {
    file: "niche-restaurant",
    plate: "restaurant.jpg",
    en: { eyebrow: "Website for a restaurant / Vienna", title: "For someone\noutside, hungry.", foot: "THE MENU AS TEXT · ALLERGENS PER DISH · ONE TAP TO A TABLE" },
    de: { eyebrow: "Website Restaurant / Wien", title: "Für den, der\nhungrig davorsteht.", foot: "KARTE ALS TEXT · ALLERGENE JE GERICHT · EIN TIPP ZUM TISCH" },
  },
  {
    file: "niche-handwerker",
    plate: "handwerker.jpg",
    en: { eyebrow: "Website for tradespeople / Vienna", title: "When the bathroom\nis flooding.", foot: "ONE TAP TO CALL · THE DISTRICTS YOU DRIVE TO · EMERGENCY, ANSWERED" },
    de: { eyebrow: "Website Handwerker / Wien", title: "Wenn das Bad\nunter Wasser steht.", foot: "EIN TIPP ZUM ANRUF · IHRE BEZIRKE · NOTDIENST, BEANTWORTET" },
  },

  // ── Research. These were pointing at raw artefacts: a 1920x874 GitHub
  //    screenshot and a 1179x2556 phone capture of a GA4 chart. Neither is a
  //    1.91:1 card, and the portrait one cropped to a band of grey.
  {
    file: "insight-bridge-growth",
    plate: "insight-growth.jpg",
    en: { eyebrow: "Research / Organic growth", title: "5 to 44 sessions\nin three weeks.", foot: "BRIDGE CONSULT · WHAT A MULTILINGUAL LAUNCH SYSTEM DID TO VISIBILITY" },
    de: { eyebrow: "Research / Organisches Wachstum", title: "Von 5 auf 44\nin drei Wochen.", foot: "BRIDGE CONSULT · WAS EIN MEHRSPRACHIGES LAUNCH-SYSTEM BEWIRKT HAT" },
  },
  {
    file: "insight-fidic-platform",
    plate: "insight-platform.jpg",
    en: { eyebrow: "Research / Content architecture", title: "429 pages\nthat can be found.", foot: "FIDIC.UZ · 117 ARTICLES · 3 LANGUAGES · ONE TYPED CONTENT MODEL" },
    de: { eyebrow: "Research / Content-Architektur", title: "429 Seiten,\ndie gefunden werden.", foot: "FIDIC.UZ · 117 FACHARTIKEL · 3 SPRACHEN · EIN TYPISIERTES MODELL" },
  },
  {
    file: "insight-threejs",
    plate: "insight-threejs.jpg",
    en: { eyebrow: "Research / Real-time 3D", title: "When 3D lifts,\nand when it kills.", foot: "THREE.JS ON MARKETING SITES · MEASURED ON REAL DEVICES" },
    de: { eyebrow: "Research / Echtzeit-3D", title: "Wann 3D hebt —\nund wann es tötet.", foot: "THREE.JS AUF MARKETING-SITES · AUF ECHTEN GERÄTEN GEMESSEN" },
  },
  {
    file: "insight-ai",
    plate: "insight-ai.jpg",
    en: { eyebrow: "Research / AI-assisted development", title: "Speed without\noutsourcing taste.", foot: "USING AI FOR PACE WHILE THE CREATIVE DIRECTION STAYS YOURS" },
    de: { eyebrow: "Research / AI-gestützte Entwicklung", title: "Tempo, ohne den\nGeschmack abzugeben.", foot: "AI FÜR TEMPO NUTZEN — DIE CREATIVE DIRECTION BLEIBT BEI IHNEN" },
  },

  // ── The three remaining practice areas, and the pages that were sharing a
  //    card with a neighbour.
  {
    file: "digital-marketing",
    plate: "marketing.jpg",
    en: { eyebrow: "Digital Marketing / Vienna", title: "Built as one\nsystem.", foot: "POSITIONING · RESEARCH · CONTENT ARCHITECTURE · DISTRIBUTION" },
    de: { eyebrow: "Digital Marketing / Wien", title: "Als ein System\ngebaut.", foot: "POSITIONIERUNG · RESEARCH · CONTENT-ARCHITEKTUR · DISTRIBUTION" },
  },
  {
    file: "technical-seo",
    plate: "seo.jpg",
    en: { eyebrow: "Technical SEO / Vienna", title: "Ambition that\nstill indexes.", foot: "CRAWLABLE ARCHITECTURE · HREFLANG · STRUCTURED DATA · BUDGETS" },
    de: { eyebrow: "Technical SEO / Wien", title: "Anspruch, der\ntrotzdem indexiert.", foot: "CRAWLBARE ARCHITEKTUR · HREFLANG · STRUKTURIERTE DATEN · BUDGETS" },
  },
  {
    file: "creative-development",
    plate: "creative.jpg",
    en: { eyebrow: "Creative Development / Vienna", title: "3D that does not\ncost the vitals.", foot: "ASTRO · THREE.JS · GSAP · HAND-WRITTEN GLSL" },
    de: { eyebrow: "Creative Development / Wien", title: "3D, das die Vitals\nnicht kostet.", foot: "ASTRO · THREE.JS · GSAP · HANDGESCHRIEBENES GLSL" },
  },
  {
    file: "notes",
    plate: "notes.jpg",
    en: { eyebrow: "Engineering notes", title: "What broke,\nand what it cost.", foot: "A RUNNING LOG · INCLUDING TWO CHANGES MEASURED THEN DISCARDED" },
  },
  {
    file: "gallery",
    plate: "gallery.jpg",
    en: { eyebrow: "Archive / 3D & Motion", title: "The work that\ncame before.", foot: "CINEMA 4D · REDSHIFT · AFTER EFFECTS · VIENNA" },
  },
  {
    file: "colophon",
    plate: "colophon.jpg",
    en: { eyebrow: "Colophon / How this site is built", title: "Every decision,\nwritten down.", foot: "ASTRO · THREE.JS · GLSL · WEB AUDIO · AND WHAT WAS CUT" },
  },
];

const font = readFileSync(path.join(root, "public", "rb-space.woff2")).toString("base64");

const plateFor = (name) => {
  if (!name) return null;
  const file = path.join(plateDir, name);
  if (!existsSync(file)) return null;
  return readFileSync(file).toString("base64");
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

const template = ({ eyebrow, title, foot }, plate) => `<!doctype html>
<meta charset="utf-8">
<style>
  @font-face { font-family: 'RB Space'; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900; font-display: block; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    position: relative; overflow: hidden;
    background: #000;
    font-family: 'RB Space', system-ui, sans-serif;
    color: #f4f6f9;
  }
  /* The plate carries the object. Without one the card still gets the ground it
     would have had — same black, same floor, same haze — just no sculpture. */
  .plate {
    position: absolute; inset: 0;
    background: ${plate ? `#000 url(data:image/jpeg;base64,${plate}) center/cover no-repeat` : "transparent"};
  }
  .floor {
    position: absolute; inset: 52% 0 0;
    background:
      repeating-linear-gradient(to right, rgba(255,255,255,.055) 0 1px, transparent 1px 74px),
      repeating-linear-gradient(to bottom, rgba(255,255,255,.055) 0 1px, transparent 1px 46px);
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 38%, transparent);
    transform: perspective(520px) rotateX(62deg);
    transform-origin: top center;
    opacity: ${plate ? ".28" : ".6"};
  }
  .haze {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 70% 52% at 76% 44%, rgba(214,222,232,.10), transparent 70%);
  }
  /* Text sits on the left half; every plate is composed to keep that side clear.
     The scrim is what guarantees contrast even if a plate is brighter there. */
  .scrim {
    position: absolute; inset: 0;
    background: linear-gradient(100deg, #000 0 26%, rgba(0,0,0,.86) 44%, rgba(0,0,0,.28) 62%, transparent 78%);
  }
  .card { position: absolute; inset: 0; padding: 64px 72px; display: flex; flex-direction: column; }
  .badge {
    width: 62px; height: 62px; border-radius: 50%;
    display: grid; place-items: center;
    border: 1px solid rgba(244,246,249,.42);
    background: radial-gradient(circle at 32% 28%, rgba(255,255,255,.20), rgba(255,255,255,.02) 62%);
    font-size: 20px; font-weight: 500; letter-spacing: .06em;
  }
  /* Hard left column. Every plate is composed with its object right of this. */
  .body { margin-top: auto; max-width: 620px; }
  .eyebrow {
    font-size: 17px; font-weight: 400; letter-spacing: .22em; text-transform: uppercase;
    color: rgba(244,246,249,.56);
  }
  h1 {
    margin: 24px 0 26px;
    font-size: ${titleSize(title)}px;
    font-weight: 500; line-height: 1.02; letter-spacing: -.025em;
    white-space: pre-line;
  }
  .foot {
    font-size: 15px; font-weight: 400; letter-spacing: .17em; text-transform: uppercase;
    color: rgba(244,246,249,.46);
  }
  .rule { width: 76px; height: 1px; margin-bottom: 26px; background: rgba(244,246,249,.34); }
</style>
<div class="plate"></div>
<div class="floor"></div>
<div class="haze"></div>
<div class="scrim"></div>
<div class="card">
  <div class="badge">RB</div>
  <div class="body">
    <div class="eyebrow">${escape(eyebrow)}</div>
    <h1>${escape(title)}</h1>
    <div class="rule"></div>
    <div class="foot">${escape(foot)}</div>
  </div>
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
    if (card.plate && !plate) missingPlates.add(card.plate);
    // A single-language card keeps the bare name so its filename stays stable;
    // a pair is suffixed, because both halves have to exist side by side.
    const name = card.de ? `${card.file}-${lang}` : card.file;
    await page.setContent(template(copy, plate), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(outDir, `${name}.jpg`), type: "jpeg", quality: 86 });
    written++;
    console.log(`  ${name}.jpg`.padEnd(34) + (plate ? `plate: ${card.plate}` : "procedural ground"));
  }
}

await browser.close();
console.log(`\n${written} card(s) written to public/og/`);
if (missingPlates.size) {
  console.log(`\nNo plate yet for: ${[...missingPlates].join(", ")}`);
  console.log(`Drop 1200x630 JPEGs with those names into public/og/plates/ and run again.`);
}
