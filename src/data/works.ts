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
  type: "case" | "reel";
  /** static proper-noun title (reel) OR i18n key (case, via kTitle) */
  title?: string;
  kTitle?: string;
  kCat: string;
  kText?: string;
  href: string;
  hrefLabel: string;
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
    href: "/work/bridge-consult",
    hrefLabel: "Bridge Consult",
  },
  {
    id: "fidic",
    img: "/cases/rodion-belousov-fidic-uz-contract-knowledge-platform-design.webp",
    type: "case",
    kTitle: "work.2.title",
    kCat: "work.2.tag",
    kText: "work.2.text",
    href: "/work/fidic",
    hrefLabel: "fidic.uz ↗",
  },
  {
    id: "obsidian-residence",
    img: "/portfolio/rodion-belousov-luxury-interior-lighting-3d-visualization.webp",
    type: "reel",
    title: "Obsidian Residence",
    kCat: "gallery.1.cat",
    href: BEHANCE,
    hrefLabel: "Behance ↗",
  },
  {
    id: "modular-lounge",
    img: "/portfolio/rodion-belousov-modern-sectional-sofa-3d-render.webp",
    type: "reel",
    title: "Modular Lounge",
    kCat: "gallery.4.cat",
    href: BEHANCE,
    hrefLabel: "Behance ↗",
  },
  {
    id: "media-wall",
    img: "/portfolio/rodion-belousov-custom-tv-media-wall-3d-visualization.webp",
    type: "reel",
    title: "Media Wall System",
    kCat: "gallery.1.cat",
    href: BEHANCE,
    hrefLabel: "Behance ↗",
  },
  {
    id: "olive-still-life",
    img: "/portfolio/rodion-belousov-decorative-console-styling-3d-render.webp",
    type: "reel",
    title: "Olive Still Life",
    kCat: "gallery.4.cat",
    href: BEHANCE,
    hrefLabel: "Behance ↗",
  },
  {
    id: "classical-facade",
    img: "/portfolio/rodion-belousov-classical-residential-facade-3d-visualization.webp",
    type: "reel",
    title: "Classical Facade Study",
    kCat: "gallery.5.cat",
    href: BEHANCE,
    hrefLabel: "Behance ↗",
  },
  {
    id: "nocturne-ceremony",
    img: "/portfolio/rodion-belousov-luxury-wedding-pergola-3d-visualization.webp",
    type: "reel",
    title: "Nocturne Ceremony",
    kCat: "gallery.4.cat",
    href: BEHANCE,
    hrefLabel: "Behance ↗",
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
];
