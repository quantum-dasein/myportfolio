# rodionbelousov.studio

The studio site of [Rodion Belousov](https://rodionbelousov.studio) — websites,
technical SEO, and the 3D and film that go on them. Vienna.

Astro, hand-written WebGL, no UI framework. It ships as static HTML: there is no
React, no Vue, no island runtime, and nothing on the page that a visitor did not
need in order to read it.

**Live:** <https://rodionbelousov.studio> · EN / DE

---

## What is in here

| Path | What it is |
|---|---|
| `src/pages/index.astro` | The home page — hero, approach, work, services teaser, contact |
| `src/pages/work/*` | Case studies: Bridge Consult, FIDIC.uz, the Academy landing, and this site |
| `src/pages/[lang]/[service].astro` | The service and location pages, generated per language from `src/data/seo-content.ts` |
| `src/pages/[lang]/insights/[slug].astro` | Long-form articles, same generator |
| `src/pages/services.astro` | Scopes and starting prices, from `src/data/scopes.ts` and `pricing.ts` |
| `src/pages/notes.astro` | The engineering log — including the things that did not work |
| `src/data/` | Every claim the site makes about a project lives here, not in markup |
| `src/i18n/ui.ts` | One flat EN/DE dictionary, serialized to the client for the switcher |
| `src/utils/reveals.ts` | The shared reveal choreography — one line, one curve, one set of distances |
| `scripts/` | The audits, and the social-card generator |

Language is switched in the browser rather than by route: the server renders the
default language, the dictionary ships with the page, and `data-i18n` nodes are
swapped in place. The pages that need to rank separately in German — the service
pages, the profile, `/de/leistungen/`, `/de/kontakt/` — are real routes with
their own canonicals and hreflang.

## The audits

`npm run verify` builds the site and then refuses to pass if it contradicts
itself. This is the part worth stealing:

- **`audit-links.mjs`** — walks every internal link and in-page anchor in the
  built output and resolves it against what is actually on disk. Query strings
  are stripped before matching; a dead `#anchor` fails the same as a dead page.
- **`audit-seo.mjs`** — unique title and description per URL, a canonical that
  agrees with the sitemap, hreflang pairs that point at each other, structured
  data that parses, and an OG image that exists.
- **`audit-facts.mjs`** — the useful one. It holds a list of strings this site
  has been wrong about before, and fails if any of them reappears in either
  language. It also recomputes the route count printed in the colophon from the
  pages on disk, so that number cannot drift. It deliberately does *not* guess
  at numbers by proximity: the first version did, cried wolf, and would have
  been switched off within a week.

```bash
npm run verify        # build + links + seo + facts
npm run audit:links   # individually
npm run audit:seo
npm run audit:facts
```

## Running it

```bash
npm install
npm run dev           # http://localhost:4321
npm run build         # → ./dist
npm run preview
```

Node 22+. `npm run og` regenerates the 1200×630 social cards.

To serve a production build the way the audits and screenshots see it:

```bash
npm run build && node serve.mjs   # http://localhost:4337
```

## Stack

[Astro 7](https://astro.build) · [Three.js](https://threejs.org) ·
[GSAP](https://gsap.com) (ScrollTrigger, SplitText) ·
[Lenis](https://lenis.darkroom.engineering) · PostCSS · Playwright for the
visual checks · deployed on Vercel.

The WebGL is a raymarched GLSL sculpture with refraction and dispersion, plus a
bespoke departure/return transition per platform case study. All of it is behind
a **Calm** toggle and `prefers-reduced-motion`, and none of it blocks the text:
the page is readable before any of it loads, and the case study on this site
([/work/studio](https://rodionbelousov.studio/work/studio/)) shows the transfer
numbers.
