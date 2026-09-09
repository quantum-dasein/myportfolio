// @ts-check
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

// Vercel bills Deployment Storage on the build output, and every deploy —
// production and every branch preview — stores its own copy. The three
// portfolio films are 31 MB of a 43 MB dist/, so they dominate that bill while
// being byte-identical in every deploy.
//
// When PUBLIC_MEDIA_BASE_URL is set, src/utils/media.ts already points the page
// at that origin, so the local copies are dead weight in the output. Drop them
// after the build rather than making anyone keep a .vercelignore in sync with
// the env var — one switch, both effects.
//
// Unset (local dev, or a deploy with no CDN configured) nothing is removed and
// the films are served from /public exactly as before.
function dropExternallyHostedMedia() {
  return {
    name: "drop-externally-hosted-media",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        if (!process.env.PUBLIC_MEDIA_BASE_URL?.trim()) return;
        const target = new URL("portfolio/video/", dir);
        await rm(fileURLToPath(target), { recursive: true, force: true });
        logger.info("portfolio/video/ left out of the build — served from PUBLIC_MEDIA_BASE_URL");
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: "https://rodionbelousov.studio",
  scopedStyleStrategy: 'where',
  integrations: [dropExternallyHostedMedia()],
  vite: {
    cacheDir: ".vite",
  },
});
