/**
 * audit-links.mjs — walks the built site and proves every internal link works.
 *
 * Written because "click every button and check" is not a QA strategy: the
 * /de/#contact-cta class of bug (a link to a page that no longer exists, or an
 * anchor that was never on the page) is exactly what a machine should catch.
 *
 * For every .html in dist/ it collects <a href> and checks that:
 *   • the target page actually exists on disk (or is covered by a vercel.json
 *     redirect), and
 *   • any #anchor actually exists as an id on that target page.
 *
 * Run:  node scripts/audit-links.mjs        (after `npm run build`)
 * Exits non-zero if anything is broken, so it can gate a deploy.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, posix } from "node:path";

const DIST = resolve("dist");
const ROOT = resolve(".");

// ── collect every built page ────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

if (!existsSync(DIST)) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

const pages = walk(DIST);

// ── redirects declared for the host are legitimate targets ──────────────────
const redirects = new Set();
const vercelPath = join(ROOT, "vercel.json");
if (existsSync(vercelPath)) {
  try {
    const cfg = JSON.parse(readFileSync(vercelPath, "utf8"));
    for (const r of cfg.redirects ?? []) redirects.add(r.source.replace(/\/$/, "") || "/");
  } catch {
    console.warn("vercel.json present but unreadable — ignoring redirects.");
  }
}

/** url path -> the file on disk Vercel would serve */
function resolveToFile(urlPath) {
  const clean = urlPath.replace(/\/$/, "");
  const candidates = [
    join(DIST, clean, "index.html"),
    join(DIST, `${clean}.html`),
    join(DIST, clean), // assets: /og/x.jpg, /favicon.svg …
  ];
  if (clean === "") candidates.unshift(join(DIST, "index.html"));
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

const idCache = new Map();
/** every id="" available on a built page */
function idsOf(file) {
  if (idCache.has(file)) return idCache.get(file);
  const html = readFileSync(file, "utf8");
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  // <a name=""> still counts as an anchor target
  for (const m of html.matchAll(/<a[^>]+name="([^"]+)"/g)) ids.add(m[1]);
  idCache.set(file, ids);
  return ids;
}

const problems = [];
let checked = 0;

for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const from = page.replace(DIST, "").replace(/\\/g, "/");

  for (const m of html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)) {
    const href = m[1].trim();

    // skip things that are not internal page links
    if (
      !href ||
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:") ||
      href.startsWith("data:")
    ) continue;

    checked++;

    const [rawPath, anchor] = href.split("#");
    // same-page anchor (href="#foo")
    const targetPath = rawPath === "" ? from.replace(/index\.html$/, "") : rawPath;

    if (!targetPath.startsWith("/")) {
      problems.push({ from, href, why: "relative link — expected an absolute path" });
      continue;
    }

    const file = resolveToFile(targetPath);
    const redirected = redirects.has(targetPath.replace(/\/$/, "") || "/");

    if (!file && !redirected) {
      problems.push({ from, href, why: `target page does not exist: ${targetPath}` });
      continue;
    }

    if (anchor && file) {
      if (!idsOf(file).has(anchor)) {
        problems.push({ from, href, why: `#${anchor} does not exist on ${targetPath}` });
      }
    }
  }
}

// ── report ──────────────────────────────────────────────────────────────────
console.log(`\nLink audit — ${pages.length} pages, ${checked} internal links checked.`);

if (!problems.length) {
  console.log("✓ every internal link and anchor resolves.\n");
  process.exit(0);
}

console.error(`\n✗ ${problems.length} broken link(s):\n`);
const byPage = new Map();
for (const p of problems) {
  if (!byPage.has(p.from)) byPage.set(p.from, []);
  byPage.get(p.from).push(p);
}
for (const [page, list] of byPage) {
  console.error(`  ${page}`);
  for (const p of list) console.error(`     ${p.href}  →  ${p.why}`);
}
console.error("");
process.exit(1);
