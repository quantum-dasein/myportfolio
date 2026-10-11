/**
 * audit-assets.mjs — proves every local image, video, model and font the built site names exists.
 *
 * Written after a "did you mean" card on the 404 showed a broken image: the Model Room's route
 * pointed at an /og/works/ card that was never generated. Links are covered by audit-links.mjs;
 * this covers what pages load: src/srcset/poster/content of the HTML, the JSON in data attributes,
 * and the paths spelled out in CSS and the bundled scripts.
 *
 * Paths built at runtime (`${base}/file.jpg`) cannot be resolved here and are skipped.
 *
 * Run:  node scripts/audit-assets.mjs        (after `npm run build`)
 * Exits non-zero if anything is missing, so it can gate a deploy.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const DIST = resolve("dist");
const EXT = "(?:jpe?g|png|webp|avif|gif|svg|mp4|webm|glb|gltf|woff2?|mp3|ogg|m4a|ico|pdf)";
const SITE = /https:\/\/rodionbelousov\.studio(\/[\w\-./%@]+?\.EXT)(?![\w])/g;
const LOCAL = /(?<![\w.:/$}])(\/(?!\/)[\w\-./%@]+?\.EXT)(?![\w])/g;
const rx = (r) => new RegExp(r.source.replace("EXT", EXT), "g");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(html|css|js|json|webmanifest|xml)$/.test(entry)) out.push(full);
  }
  return out;
}

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&amp;/g, "&").replace(/\\\//g, "/");
const missing = new Map();
let checked = 0;
for (const file of walk(DIST)) {
  const text = decode(readFileSync(file, "utf8"));
  for (const pattern of [rx(SITE), rx(LOCAL)]) {
    for (const match of text.matchAll(pattern)) {
      const path = decodeURI(match[1]);
      checked++;
      if (existsSync(join(DIST, path))) continue;
      if (!missing.has(path)) missing.set(path, new Set());
      missing.get(path).add(relative(DIST, file).replace(/\\/g, "/"));
    }
  }
}

if (missing.size) {
  console.error(`Asset audit — ${missing.size} missing file(s):`);
  for (const [path, from] of missing) console.error(`  ✗ ${path}  ← ${[...from].slice(0, 3).join(", ")}${from.size > 3 ? ` (+${from.size - 3})` : ""}`);
  process.exit(1);
}
console.log(`Asset audit — ${checked} references checked.\n✓ every image, video, model and font exists.`);
