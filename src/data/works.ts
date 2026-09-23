// ─────────────────────────────────────────────────────────────────────────────
//  works.ts — single source of truth for the WebGL gallery.
//
//  Shared by Gallery3D (builds the textured planes) and Overlays (fills the
//  detail panel when the camera flies into a work). `img` points at a texture
//  in /public — swap these for real Behance thumbnails, or a poster + `video`
//  path to upgrade a plane to a VideoTexture (see Gallery3D notes).
// ─────────────────────────────────────────────────────────────────────────────
export const BEHANCE =
  "https://www.behance.net/gallery/146849483/Meine-3D-Projekte";

export interface Work {
  id: string;
  img: string;
  video?: string; // optional .mp4 → becomes a VideoTexture
  /** A separate 9:16 cut of the same film, played in the viewer on phones held upright. */
  mobileVideo?: string;
  mobileImg?: string;
  /** 16:9 unless stated. A reel shot on location is a phone file, and a 9:16
   *  card cannot share a row with landscape ones without towering over them —
   *  so the vertical ones get their own strip. */
  ratio?: "vertical";
  type: "case" | "reel";
  /** static proper-noun title (reel) OR i18n key (case, via kTitle) */
  title?: string;
  kTitle?: string;
  kCat: string;
  kText?: string;
  href: string;
  hrefLabel: string;
  musicCredit?: { title: string; artist: string; url: string; license: string; licenseUrl: string };
  detail?: {
    tools: string;
    en: string;
    de: string;
  };
}

export const works: Work[] = [
  {
    id: "bridge",
    img: "/cases/rodion-belousov-bridge-consult-ai-assisted-web-development-case-study.webp",
    type: "case",
    kTitle: "work.1.title",
    kCat: "work.1.tag",
    kText: "work.1.text",
    href: "/work/bridge-consult/",
    hrefLabel: "Bridge Consult",
  },
  {
    id: "fidic",
    img: "/cases/rodion-belousov-fidic-uz-contract-knowledge-platform-design.webp",
    type: "case",
    kTitle: "work.2.title",
    kCat: "work.2.tag",
    kText: "work.2.text",
    href: "/work/fidic/",
    hrefLabel: "fidic.uz",
  },
  {
    id: "academy",
    img: "/cases/rodion-belousov-bridge-consult-academy-one-page-course-landing.webp",
    type: "case",
    kTitle: "work.3.title",
    kCat: "work.3.tag",
    kText: "work.3.text",
    href: "/work/academy/",
    hrefLabel: "Academy",
  },
  {
    id: "obsidian-residence",
    img: "/portfolio/rodion-belousov-luxury-interior-lighting-3d-visualization.webp",
    type: "reel",
    title: "Obsidian Residence",
    kCat: "gallery.1.cat",
    href: BEHANCE,
    hrefLabel: "Behance",
    detail: {
      tools: "CINEMA 4D / REDSHIFT",
      en: "A noir interior study built around a single warm light source — dark stone, soft shadow falloff and furniture staged like sculpture in a quiet, cinematic room.",
      de: "Eine Noir-Interieurstudie um eine einzige warme Lichtquelle — dunkler Stein, weiche Schattenverläufe und Möbel, inszeniert wie Skulpturen in einem ruhigen, filmischen Raum.",
    },
  },
  {
    id: "modular-lounge",
    img: "/portfolio/rodion-belousov-modern-sectional-sofa-3d-render.webp",
    type: "reel",
    title: "Modular Lounge",
    kCat: "gallery.4.cat",
    href: BEHANCE,
    hrefLabel: "Behance",
    detail: {
      tools: "CINEMA 4D / REDSHIFT",
      en: "A sectional sofa rendered as a product hero: fabric shading, daylight balance and composition tuned so the piece reads instantly in a furniture-catalogue context.",
      de: "Ein Ecksofa als Produkt-Hero gerendert: Stoff-Shading, Tageslichtbalance und Komposition so abgestimmt, dass das Objekt im Katalogkontext sofort lesbar ist.",
    },
  },
  {
    id: "media-wall",
    img: "/portfolio/rodion-belousov-custom-tv-media-wall-3d-visualization.webp",
    type: "reel",
    title: "Media Wall System",
    kCat: "gallery.1.cat",
    href: BEHANCE,
    hrefLabel: "Behance",
    detail: {
      tools: "CINEMA 4D / REDSHIFT",
      en: "A custom wood-and-black media wall visualized for a real interior decision: true material contrast, correct proportions and lighting that sells the built result before it exists.",
      de: "Eine maßgefertigte Media Wall in Holz und Schwarz, visualisiert für eine reale Einrichtungsentscheidung: echte Materialkontraste, korrekte Proportionen und Licht, das das Ergebnis vorab verkauft.",
    },
  },
  {
    id: "olive-still-life",
    img: "/portfolio/rodion-belousov-decorative-console-styling-3d-render.webp",
    type: "reel",
    title: "Olive Still Life",
    kCat: "gallery.4.cat",
    href: BEHANCE,
    hrefLabel: "Behance",
    detail: {
      tools: "CINEMA 4D / REDSHIFT",
      en: "An art-direction still life in olive and brass: console styling, controlled color palette and prop rhythm composed like an editorial photograph, entirely in 3D.",
      de: "Ein Art-Direction-Stillleben in Oliv und Messing: Konsolen-Styling, kontrollierte Farbpalette und Prop-Rhythmus — komponiert wie eine Editorial-Fotografie, komplett in 3D.",
    },
  },
  {
    id: "classical-facade",
    img: "/portfolio/rodion-belousov-classical-residential-facade-3d-visualization.webp",
    type: "reel",
    title: "Classical Facade Study",
    kCat: "gallery.5.cat",
    href: BEHANCE,
    hrefLabel: "Behance",
    detail: {
      tools: "CINEMA 4D / REDSHIFT",
      en: "An architectural exterior study of a classical residential facade — ornament, stone and daylight handled with restraint so the building's proportions carry the image.",
      de: "Eine architektonische Außenstudie einer klassischen Wohnfassade — Ornament, Stein und Tageslicht zurückhaltend geführt, damit die Proportionen des Gebäudes das Bild tragen.",
    },
  },
  {
    id: "nocturne-ceremony",
    img: "/portfolio/rodion-belousov-luxury-wedding-pergola-3d-visualization.webp",
    type: "reel",
    title: "Nocturne Ceremony",
    kCat: "gallery.4.cat",
    href: BEHANCE,
    hrefLabel: "Behance",
    detail: {
      tools: "CINEMA 4D / REDSHIFT",
      en: "A candlelit wedding pergola staged at night: event design previsualized with real lighting logic, so the atmosphere can be approved long before the first candle is lit.",
      de: "Eine kerzenbeleuchtete Hochzeitspergola bei Nacht: Eventdesign mit realer Lichtlogik previsualisiert, damit die Atmosphäre lange vor der ersten Kerze freigegeben werden kann.",
    },
  },
  {
    id: "squidz-pos-display",
    img: "/portfolio/rodion-belousov-squidz-pos-display-3d-animation-poster.webp",
    video: "/portfolio/video/rodion-belousov-squidz-pos-display-3d-animation.mp4",
    type: "reel",
    title: "Squidz POS Display",
    kCat: "gallery.4.cat",
    href: BEHANCE,
    hrefLabel: "PLAY REEL",
    detail: {
      tools: "CINEMA 4D / REDSHIFT / AFTER EFFECTS / PREMIERE PRO",
      en: "A retail POS film where packaging, display architecture and camera rhythm turn a product system into a spatial brand moment.",
      de: "Ein Retail-POS-Film, in dem Packaging, Display-Architektur und Kamerarhythmus ein Produktsystem in einen räumlichen Markenmoment verwandeln.",
    },
  },
  {
    id: "lake-como-interior-film",
    img: "/portfolio/rodion-belousov-lake-como-minimalist-interior-3d-animation-poster.webp",
    video: "/portfolio/video/rodion-belousov-lake-como-minimalist-interior-3d-animation.mp4",
    type: "reel",
    title: "Lake Como Interior Film",
    kCat: "gallery.1.cat",
    href: BEHANCE,
    hrefLabel: "PLAY FILM",
    detail: {
      tools: "CINEMA 4D / REDSHIFT / AFTER EFFECTS / PREMIERE PRO",
      en: "A quiet architectural film built around daylight, material restraint and a continuous camera journey through a Lake Como interior.",
      de: "Ein ruhiger Architekturfilm über Tageslicht, Materialdisziplin und eine kontinuierliche Kamerafahrt durch ein Interieur am Comer See.",
    },
  },
  {
    id: "alpine-equipment-product-film",
    img: "/portfolio/rodion-belousov-ski-snowboard-equipment-3d-product-animation-poster.jpg",
    video: "/portfolio/video/rodion-belousov-ski-snowboard-equipment-3d-product-animation.mp4",
    type: "reel",
    title: "Alpine Equipment Product Film",
    kCat: "gallery.1.cat",
    href: BEHANCE,
    hrefLabel: "PLAY FILM",
    detail: {
      tools: "CINEMA 4D / REDSHIFT / AFTER EFFECTS / PHOTOSHOP",
      en: "A product-motion study that stages ski and snowboard equipment as sculptural objects through controlled light, color and mechanical choreography.",
      de: "Eine Product-Motion-Studie, die Ski- und Snowboard-Equipment mit kontrolliertem Licht, Farbe und mechanischer Choreografie als skulpturale Objekte inszeniert.",
    },
  },
  {
    id: "refurbed-product-ecosystem-concept",
    img: "/portfolio/rodion-belousov-refurbed-product-ecosystem-concept-poster.webp",
    video: "/portfolio/video/rodion-belousov-refurbed-product-ecosystem-concept-scored.mp4",
    type: "reel",
    title: "Refurbed — Product Ecosystem (Concept)",
    kCat: "gallery.8.cat",
    href: "/portfolio/video/rodion-belousov-refurbed-product-ecosystem-concept-scored.mp4",
    hrefLabel: "PLAY FILM",
    detail: {
      tools: "CINEMA 4D / AFTER EFFECTS",
      en: "An independent concept film for Refurbed: laptops, phones and tablets move through colourful workspaces, product stages and a playful children's room. 3D scene design, camera animation and screen compositing in Cinema 4D and After Effects. Self-initiated spec work; not commissioned by or affiliated with Refurbed.",
      de: "Ein unabhängiger Konzeptfilm für Refurbed: Laptops, Smartphones und Tablets in farbenfrohen Arbeitswelten, auf Produktpodesten und in einem verspielten Kinderzimmer. 3D-Szenengestaltung, Kameraanimation und Screen-Compositing in Cinema 4D und After Effects. Freies Konzeptprojekt; kein Auftrag von oder Zusammenarbeit mit Refurbed.",
    },
  },
  {
    id: "fidic-osh-first-meeting",
    img: "/portfolio/rodion-belousov-fidic-osh-first-meeting-event-reel-cover.webp",
    video: "/portfolio/video/rodion-belousov-fidic-osh-first-meeting-event-reel.mp4",
    ratio: "vertical",
    type: "reel",
    title: "FIDIC OSH — First Meeting",
    kCat: "gallery.7.cat",
    href: "https://t.me/fidicuzb",
    hrefLabel: "PLAY REEL",
    detail: {
      tools: "ON LOCATION / PREMIERE PRO",
      en: "The first FIDIC OSH meeting in Tashkent, June 2026 — contract managers, engineers and claims specialists around one table, and the session that started the FIDIC Club. Filmed and cut on the day, in the format the client actually publishes in: vertical, captioned, under a minute.",
      de: "Das erste FIDIC-OSH-Treffen in Taschkent, Juni 2026 — Vertragsmanager, Ingenieure und Claims-Spezialisten an einem Tisch, und die Sitzung, aus der der FIDIC Club entstand. Am selben Tag gedreht und geschnitten, im Format, in dem der Kunde tatsächlich publiziert: vertikal, untertitelt, unter einer Minute.",
    },
  },
  {
    id: "summer-school-georgia-2026",
    img: "/portfolio/rodion-belousov-bridge-consult-georgia-summer-school-2026-cover.webp",
    video: "/portfolio/video/rodion-belousov-bridge-consult-georgia-summer-school-2026.mp4",
    ratio: "vertical",
    type: "reel",
    title: "Summer School Georgia 2026",
    kCat: "gallery.7.cat",
    href: "https://t.me/fidicuzb",
    hrefLabel: "PLAY REEL",
    musicCredit: {
      title: "Felicity", artist: "Scott Buckley", url: "https://www.scottbuckley.com.au/",
      license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
    detail: {
      tools: "ON LOCATION / PREMIERE PRO",
      en: "Bridge Consult's Summer School in Georgia, 2026 — a vertical event film connecting Borjomi's landscape with workshops, delay analysis, group discussions and the people behind the programme.",
      de: "Bridge Consults Summer School in Georgien, 2026 — ein vertikaler Eventfilm, der Bordschomis Landschaft mit Workshops, Verzögerungsanalysen, Gruppendiskussionen und den Menschen hinter dem Programm verbindet.",
    },
  },
  {
    id: "tarjima-live-lecture-translation",
    img: "/portfolio/rodion-belousov-tarjima-live-lecture-translation-poster.webp",
    video: "/portfolio/video/rodion-belousov-tarjima-live-lecture-translation.mp4",
    mobileImg: "/portfolio/rodion-belousov-tarjima-live-lecture-translation-vertical-poster.webp",
    mobileVideo: "/portfolio/video/rodion-belousov-tarjima-live-lecture-translation-vertical.mp4",
    type: "reel",
    title: "Tarjima — Live Lecture Translation",
    kCat: "gallery.9.cat",
    href: "/cases/rodion-belousov-tarjima-live-lecture-translation-case-study.pdf",
    hrefLabel: "CASE STUDY",
    musicCredit: {
      title: "A Kind Of Hope", artist: "Scott Buckley", url: "https://www.scottbuckley.com.au/library/a-kind-of-hope/",
      license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
    detail: {
      tools: "WEB SPEECH API / CLAUDE / VERCEL EDGE / UPSTASH REDIS / ZOOM CAPTIONS",
      en: "A live translation system for BRIDGE Consult Academy's online courses. The lecturer speaks Russian; attendees read Uzbek subtitles within seconds — in the Zoom call or on their phone, with nothing to install. Speech is recognised in the lecturer's browser, cut into short fragments and translated against the company's own 92-term contract glossary. Designed and built in twelve days, in production since September 2026.",
      de: "Ein Live-Übersetzungssystem für die Online-Kurse der BRIDGE Consult Academy. Der Dozent spricht Russisch; die Teilnehmenden lesen innerhalb von Sekunden usbekische Untertitel — im Zoom-Call oder auf dem Handy, ohne Installation. Die Sprache wird im Browser des Dozenten erkannt, in kurze Fragmente geteilt und mit dem firmeneigenen Glossar aus 92 Vertragsbegriffen übersetzt. In zwölf Tagen entworfen und gebaut, seit September 2026 im Einsatz.",
    },
  },
];
