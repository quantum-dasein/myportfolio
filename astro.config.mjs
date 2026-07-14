// @ts-check
import {
  defineConfig,
  fontProviders,
} from "astro/config";


// https://astro.build/config
export default defineConfig({
  scopedStyleStrategy: 'where',
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Space Grotesk",
      cssVariable: "--font-display",
      weights: ["300 700"],
    },
    {
      provider: fontProviders.google(),
      name: "Inter",
      cssVariable: "--font-inter",
      weights: ["100 900"],
    },
  ],
});
