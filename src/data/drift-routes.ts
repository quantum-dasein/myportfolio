import { archiveWorks } from './observatory';

/** Every real page the 404 can point a lost visitor to, with the card it shares. */
export interface DriftRoute {
  path: string;
  en: string;
  de: string;
  image: string;
  /** Which language the page is in; 'any' pages suit both. */
  lang: 'en' | 'de' | 'any';
}

const CASE_TITLES: Record<string, string> = { bridge: 'Bridge Consult', fidic: 'FIDIC.uz', academy: 'Bridge Consult Academy' };

const pages: DriftRoute[] = [
  { path: '/', en: 'Studio — home', de: 'Studio — Startseite', image: '/og/rodion-belousov-digital-marketer-creative-developer-vienna.jpg', lang: 'any' },
  { path: '/gallery/', en: 'The Observatory — archive', de: 'The Observatory — Archiv', image: '/og/observatory-hall.jpg', lang: 'any' },
  { path: '/services/', en: 'Services & prices', de: 'Leistungen & Preise', image: '/og/services-en.jpg', lang: 'en' },
  { path: '/de/leistungen/', en: 'Services & prices (German)', de: 'Leistungen & Preise', image: '/og/services-de.jpg', lang: 'de' },
  { path: '/contact/', en: 'Contact — start a project', de: 'Kontakt', image: '/og/contact-en.jpg', lang: 'en' },
  { path: '/de/kontakt/', en: 'Contact (German)', de: 'Kontakt — Projekt starten', image: '/og/contact-de.jpg', lang: 'de' },
  { path: '/work/bridge-consult/', en: 'Bridge Consult — case study', de: 'Bridge Consult — Fallstudie', image: '/og/case-bridge-consult.jpg', lang: 'any' },
  { path: '/work/fidic/', en: 'FIDIC.uz — case study', de: 'FIDIC.uz — Fallstudie', image: '/og/case-fidic.jpg', lang: 'any' },
  { path: '/work/academy/', en: 'Bridge Consult Academy — case study', de: 'Bridge Consult Academy — Fallstudie', image: '/og/case-academy.jpg', lang: 'any' },
  { path: '/work/studio/', en: 'How this site is built', de: 'Wie diese Seite gebaut ist', image: '/og/colophon.jpg', lang: 'any' },
  { path: '/notes/', en: 'Engineering notes', de: 'Engineering-Notizen', image: '/og/notes.jpg', lang: 'any' },
  { path: '/en/rodion-belousov-vienna/', en: 'Profile — Rodion Belousov', de: 'Profil (Englisch)', image: '/og/profile-vienna-en.jpg', lang: 'en' },
  { path: '/de/rodion-belousov-wien/', en: 'Profile (German)', de: 'Profil — Rodion Belousov', image: '/og/profile-vienna-de.jpg', lang: 'de' },
  { path: '/en/website-development-vienna/', en: 'Website development', de: 'Website-Entwicklung (Englisch)', image: '/og/websites-en.jpg', lang: 'en' },
  { path: '/de/website-erstellen-wien/', en: 'Website development (German)', de: 'Website erstellen', image: '/og/websites-de.jpg', lang: 'de' },
  { path: '/en/digital-marketing-vienna/', en: 'Digital marketing', de: 'Digital Marketing (Englisch)', image: '/og/digital-marketing-en.jpg', lang: 'en' },
  { path: '/de/digital-marketing-wien/', en: 'Digital marketing (German)', de: 'Digital Marketing', image: '/og/digital-marketing-de.jpg', lang: 'de' },
  { path: '/en/technical-seo-vienna/', en: 'Technical SEO', de: 'Technisches SEO (Englisch)', image: '/og/technical-seo-en.jpg', lang: 'en' },
  { path: '/de/technical-seo-wien/', en: 'Technical SEO (German)', de: 'Technisches SEO', image: '/og/technical-seo-de.jpg', lang: 'de' },
  { path: '/en/creative-development-vienna/', en: 'Creative development', de: 'Creative Development (Englisch)', image: '/og/creative-development-en.jpg', lang: 'en' },
  { path: '/de/creative-development-wien/', en: 'Creative development (German)', de: 'Creative Development', image: '/og/creative-development-de.jpg', lang: 'de' },
  { path: '/en/3d-animation-video-vienna/', en: '3D animation & video', de: '3D-Animation & Video (Englisch)', image: '/og/motion-en.jpg', lang: 'en' },
  { path: '/de/3d-animation-video-wien/', en: '3D animation & video (German)', de: '3D-Animation & Video', image: '/og/motion-de.jpg', lang: 'de' },
  { path: '/en/website-for-doctors-vienna/', en: 'Websites for doctors', de: 'Websites für Ärzte (Englisch)', image: '/og/niche-arztpraxis-en.jpg', lang: 'en' },
  { path: '/de/website-arztpraxis-wien/', en: 'Websites for doctors (German)', de: 'Website für die Arztpraxis', image: '/og/niche-arztpraxis-de.jpg', lang: 'de' },
  { path: '/en/website-for-restaurants-vienna/', en: 'Websites for restaurants', de: 'Websites für Restaurants (Englisch)', image: '/og/niche-restaurant-en.jpg', lang: 'en' },
  { path: '/de/website-restaurant-wien/', en: 'Websites for restaurants (German)', de: 'Website für Restaurants', image: '/og/niche-restaurant-de.jpg', lang: 'de' },
  { path: '/en/website-for-tradespeople-vienna/', en: 'Websites for tradespeople', de: 'Websites für Handwerker (Englisch)', image: '/og/niche-handwerker-en.jpg', lang: 'en' },
  { path: '/de/website-handwerker-wien/', en: 'Websites for tradespeople (German)', de: 'Website für Handwerker', image: '/og/niche-handwerker-de.jpg', lang: 'de' },
  { path: '/en/insights/bridge-consult-seo-growth/', en: 'Insight — +780% organic growth', de: 'Insight — +780 % organisch (Englisch)', image: '/og/insight-bridge-growth-en.jpg', lang: 'en' },
  { path: '/de/insights/bridge-consult-seo-wachstum/', en: 'Insight — organic growth (German)', de: 'Insight — +780 % organisches Wachstum', image: '/og/insight-bridge-growth-de.jpg', lang: 'de' },
  { path: '/en/insights/fidic-knowledge-platform/', en: 'Insight — a knowledge platform', de: 'Insight — Wissensplattform (Englisch)', image: '/og/insight-fidic-platform-en.jpg', lang: 'en' },
  { path: '/de/insights/fidic-wissensplattform/', en: 'Insight — knowledge platform (German)', de: 'Insight — FIDIC-Wissensplattform', image: '/og/insight-fidic-platform-de.jpg', lang: 'de' },
  { path: '/en/insights/threejs-marketing-websites/', en: 'Insight — Three.js for marketing sites', de: 'Insight — Three.js (Englisch)', image: '/og/insight-threejs-en.jpg', lang: 'en' },
  { path: '/de/insights/threejs-marketing-websites/', en: 'Insight — Three.js (German)', de: 'Insight — Three.js für Marketing-Websites', image: '/og/insight-threejs-de.jpg', lang: 'de' },
  { path: '/en/insights/ai-assisted-creative-development/', en: 'Insight — AI-assisted development', de: 'Insight — KI-gestützte Entwicklung (Englisch)', image: '/og/insight-ai-en.jpg', lang: 'en' },
  { path: '/de/insights/ai-assisted-creative-development/', en: 'Insight — AI-assisted development (German)', de: 'Insight — KI-gestützte Entwicklung', image: '/og/insight-ai-de.jpg', lang: 'de' },
];

export const driftRoutes: DriftRoute[] = [
  ...pages,
  ...archiveWorks.map(work => {
    const title = work.title ?? CASE_TITLES[work.id] ?? work.id;
    return { path: `/gallery/${work.id}/`, en: `${title} — in the archive`, de: `${title} — im Archiv`, // The portal into the Model Room has no generated card (like its own page, see gallery/[work].astro).
    image: work.portalHref ? work.img : `/og/works/${work.id}.jpg`, lang: 'any' as const };
  }),
];
