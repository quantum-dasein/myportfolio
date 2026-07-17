import type { APIRoute } from "astro";
import { works } from "../data/works";
import { insightContent, serviceContent } from "../data/seo-content";

const site = "https://rodionbelousov.studio";
// Build date, not a hardcode: every deploy tells crawlers the content moved.
const lastmod = new Date().toISOString().slice(0, 10);

function url(path: string, priority: string, changefreq: string, extras = "") {
  return `<url><loc>${site}${path}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority>${extras}</url>`;
}

function localizedUrl(path: string, alternate: string, lang: "en" | "de", priority = "0.8") {
  const otherLang = lang === "en" ? "de-AT" : "en";
  return url(path, priority, "monthly", `<xhtml:link rel="alternate" hreflang="${lang === "de" ? "de-AT" : "en"}" href="${site}${path}"/><xhtml:link rel="alternate" hreflang="${otherLang}" href="${site}${alternate}"/><xhtml:link rel="alternate" hreflang="x-default" href="${site}${lang === "en" ? path : alternate}"/>`);
}

export const GET: APIRoute = () => {
  const galleryMedia = works.map((work) => {
    const image = `<image:image><image:loc>${site}${work.img}</image:loc><image:title>${work.title ?? work.hrefLabel}</image:title></image:image>`;
    if (!work.video) return image;
    return `${image}<video:video><video:thumbnail_loc>${site}${work.img}</video:thumbnail_loc><video:title>${work.title}</video:title><video:description>3D animation created by Rodion Belousov with Cinema 4D, Redshift and Adobe creative tools.</video:description><video:content_loc>${site}${work.video}</video:content_loc><video:publication_date>${lastmod}</video:publication_date><video:family_friendly>yes</video:family_friendly></video:video>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${Object.values(serviceContent).flatMap((service) => [localizedUrl(service.paths.en, service.paths.de, "en"), localizedUrl(service.paths.de, service.paths.en, "de")]).join("\n")}
${Object.values(insightContent).flatMap((insight) => [localizedUrl(insight.paths.en, insight.paths.de, "en", "0.75"), localizedUrl(insight.paths.de, insight.paths.en, "de", "0.75")]).join("\n")}
${url("/", "1.0", "weekly", `<image:image><image:loc>${site}/cases/rodion-belousov-bridge-consult-ai-assisted-web-development-case-study.webp</image:loc><image:title>Rodion Belousov Digital Marketer and Creative Developer Vienna</image:title></image:image>`)}
${url("/services", "0.9", "monthly")}
${url("/work/bridge-consult", "0.9", "monthly", `<image:image><image:loc>${site}/cases/rodion-belousov-bridge-consult-ai-assisted-web-development-case-study.webp</image:loc><image:title>Bridge Consult SEO and Astro case study</image:title></image:image>`)}
${url("/work/fidic", "0.9", "monthly", `<image:image><image:loc>${site}/cases/rodion-belousov-fidic-uz-contract-knowledge-platform-design.webp</image:loc><image:title>FIDIC.uz content platform and technical SEO case study</image:title></image:image>`)}
${url("/work/studio", "0.8", "monthly", `<image:image><image:loc>${site}/og/rodion-belousov-digital-marketer-creative-developer-vienna.jpg</image:loc><image:title>How rodionbelousov.studio is built: Astro, Three.js, GLSL and Web Audio</image:title></image:image>`)}
${url("/gallery", "0.8", "monthly", galleryMedia)}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
