import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const site = 'https://rodionbelousov.studio';
const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap entries');
const titles = new Set();
const htmlFor = url => readFileSync(join('dist', new URL(url).pathname, 'index.html'), 'utf8');
for (const url of urls) {
  const html = htmlFor(url);
  const canonical = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
  assert.equal(canonical.length, 1, `${url}: one canonical`);
  assert.equal(canonical[0][1], url, `${url}: sitemap matches canonical`);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  assert.ok(title && !titles.has(title), `${url}: unique title`);
  titles.add(title);
  assert.match(html, /<meta name="description" content="[^"]{40,}"/, `${url}: description`);
  assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/, `${url}: indexable`);
  assert.ok(html.includes('<h1'), `${url}: main heading`);
  for (const block of html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) {
    const schema = JSON.parse(block[1]);
    assert.equal(schema['@context'], 'https://schema.org');
  }
  for (const alt of html.matchAll(/<link rel="alternate" hreflang="(en|de-AT)" href="([^"]+)"/g)) {
    assert.ok(urls.includes(alt[2]), `${url}: alternate is indexed`);
    assert.ok(htmlFor(alt[2]).includes(`href="${url}"`), `${url}: reciprocal alternate`);
  }
  for (const image of html.matchAll(/<meta (?:property="og:image"|name="twitter:image") content="([^"]+)"/g)) {
    assert.ok(existsSync(join('dist', new URL(image[1]).pathname)), `${url}: social image exists`);
  }
}
for (const [path, lang, city] of [['/de/rodion-belousov-wien/', 'de-AT', 'Wien'], ['/en/rodion-belousov-vienna/', 'en', 'Vienna']]) {
  const html = htmlFor(site + path);
  assert.match(html, new RegExp(`<html lang="${lang}"`));
  assert.ok(html.includes(`Rodion Belousov`) && html.includes(city));
  assert.ok(html.includes('Siemens') && html.includes('Hochschule Burgenland'));
}
assert.match(readFileSync('dist/404.html', 'utf8'), /noindex/);
assert.ok(readFileSync('dist/robots.txt', 'utf8').includes(`Sitemap: ${site}/sitemap.xml`));
console.log(`SEO audit passed: ${urls.length} URLs, unique metadata, canonicals, hreflang, schema and images.`);
