// @ts-check
import { defineConfig } from "astro/config";


// https://astro.build/config
export default defineConfig({
  site: "https://rodionbelousov.studio",
  scopedStyleStrategy: 'where',
  vite: {
    cacheDir: ".vite",
  },
});
