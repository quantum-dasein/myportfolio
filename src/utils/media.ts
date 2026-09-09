// ─────────────────────────────────────────────────────────────────────────────
//  media.ts — where the heavy files live.
//
//  Everything under /public is copied into dist/ on every build, and Vercel
//  bills Deployment Storage on dist/. The three portfolio films are 31 MB of a
//  43 MB build, so each deploy — production and every preview — parks another
//  31 MB of identical video in storage.
//
//  Setting PUBLIC_MEDIA_BASE_URL points those files at an external origin
//  (Cloudflare R2, Vercel Blob, any CDN) instead. Left unset, paths stay
//  local and the site behaves exactly as before, which is what `npm run dev`
//  wants.
//
//  The var must be set in the Vercel project as well: PUBLIC_ vars are inlined
//  at build time, not read at runtime.
// ─────────────────────────────────────────────────────────────────────────────
const base = (import.meta.env.PUBLIC_MEDIA_BASE_URL ?? "").trim().replace(/\/+$/, "");

/** Root-relative media path → absolute CDN URL when a base is configured. */
export function mediaUrl(path: string): string {
  if (!base || /^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Absolute URL for sitemaps and structured data, CDN-aware. */
export function absoluteMediaUrl(path: string, site: string): string {
  const resolved = mediaUrl(path);
  return /^https?:\/\//i.test(resolved) ? resolved : `${site}${resolved}`;
}
