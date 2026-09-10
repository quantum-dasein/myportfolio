// ─────────────────────────────────────────────────────────────────────────────
//  audit-facts.mjs — fails when the site contradicts itself about its own work.
//
//  Runs against the BUILT output, not the source, so it sees what a visitor sees
//  in both languages, including anything assembled at build time. It checks one
//  thing, exactly: strings that were wrong or have gone stale must
//  not appear in the built site, in either language.
//
//  It deliberately does NOT try to verify numbers by proximity. That was the
//  first design and it flagged "5–10 Seiten" and a section index "03" as
//  contradictions while a real one sat two lines away. An audit that cries wolf
//  gets switched off, and then it protects nothing. Naming the exact wrong
//  string is duller and it works: every entry in `retired` is a mistake this
//  site actually made.
//
//  src/data/projectFacts.ts stays as the human-readable declaration of which
//  figure is correct, so there is one place to look before writing a number.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

// The data module is TypeScript; this script is plain Node. Rather than add a
// loader for two exported constants, read them out of the source directly.
const source = readFileSync(path.join(root, "src", "data", "projectFacts.ts"), "utf8");

const declared = [...source.matchAll(/(\w+): \{\s*value: "([^"]+)"/g)].length;

const retired = [...source.matchAll(/\{ text: "([^"]+)", why: "([^"]+)" \}/g)]
  .map(([, text, why]) => ({ text, why }));

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(path.join(dir, entry.name))
      : entry.name.endsWith(".html")
        ? [path.join(dir, entry.name)]
        : [],
  );

const pages = walk(dist);
const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ");

const failures = [];

// ── The one number the build itself knows ────────────────────────────────────
// The colophon prints a route count. It said 25 while the site had grown past
// thirty, and nothing could catch that: the value and its label are separate
// elements, so grepping for "25 production routes" finds nothing even though
// the page says exactly that. Here the two are read from the DOM and compared
// with the pages actually on disk.
const routeCount = pages.filter((file) => {
  const rel = path.relative(dist, file);
  return !rel.startsWith("404") && !rel.startsWith("google");
}).length;

for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const printed = html.match(/<strong[^>]*data-i18n="studio\.metric\.1\.v"[^>]*>(\d+)<\/strong>/);
  if (!printed) continue;
  const claimed = Number(printed[1]);
  if (claimed !== routeCount) {
    failures.push(
      `/${path.relative(dist, path.dirname(file)).replace(/\\/g, "/")}\n` +
      `    route count: the colophon says ${claimed}, the build produced ${routeCount}\n` +
      `    Update studio.metric.1.v in src/i18n/ui.ts (both languages).`,
    );
  }
}

for (const file of pages) {
  const url = "/" + path.relative(dist, path.dirname(file)).replace(/\\/g, "/");
  const text = strip(readFileSync(file, "utf8"));

  for (const { text: needle, why } of retired) {
    if (text.includes(needle)) failures.push(`${url}\n    retired: "${needle}"\n    ${why}`);
  }
}

const unique = [...new Set(failures)];
if (unique.length) {
  console.error(`\nFact audit failed — ${unique.length} contradiction(s):\n`);
  for (const line of unique) console.error("  " + line + "\n");
  console.error("Fix the page, or update src/data/projectFacts.ts if the number really changed.\n");
  process.exit(1);
}

console.log(
  `Fact audit passed: ${pages.length} pages clear of ${retired.length} retired strings ` +
  `(${declared} figures declared, ${routeCount} routes counted).`,
);
