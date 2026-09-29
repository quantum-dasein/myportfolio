import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';

// Run after npm run verify. Serves the built 404 with its actual HTTP status.
const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    let file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html' }); res.end(await readFile(resolve(root, '404.html')));
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = process.env.TEST_URL || `http://127.0.0.1:${server.address().port}`;
await mkdir('artifacts/drift', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
const failedAssets = [];
const setup = async (options = {}, expectedContextFailure = false) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, ...options });
  await context.addInitScript(() => { sessionStorage.setItem('rb-loader-seen', '1'); localStorage.setItem('rb-lang', 'en'); });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => {
    const expected = expectedContextFailure && message.text() === 'THREE.WebGLRenderer: Error creating WebGL context.';
    if (!expected && message.type() === 'error' && /THREE|WebGLProgram|Shader Error/.test(message.text())) errors.push(message.text());
  });
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/_vercel/') && /\.(js|css|glb|webp|jpg|woff2)(\?|$)/.test(r.url())) failedAssets.push(r.url()); });
  return page;
};
try {
  const page = await setup();
  const response = await page.goto(base + '/galery/fidik/?driftdebug', { waitUntil: 'networkidle' });
  assert.equal(response.status(), 404);
  await page.locator('[data-drift].is-live').waitFor({ timeout: 45000 });
  await page.waitForTimeout(3500);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  assert.equal(await page.locator('[data-drift-closest-link]').getAttribute('href'), '/gallery/fidic/');
  assert.equal(await page.locator('[data-drift-path]').textContent(), '/galery/fidik/');
  await page.screenshot({ path: 'artifacts/drift/desktop.png' });
  const clip = { x: 880, y: 275, width: 330, height: 310 };
  const firstFrame = await page.screenshot({ path: 'artifacts/drift/horizon-t0.png', clip });
  const time0 = await page.evaluate(() => window.__drift.holeUniforms.uTime.value);
  await page.waitForTimeout(1400);
  const secondFrame = await page.screenshot({ path: 'artifacts/drift/horizon-t1.png', clip });
  const render = await page.evaluate(() => ({
    time: window.__drift.holeUniforms.uTime.value,
    resolution: window.__drift.holeUniforms.uRes.value.x,
    cssWidth: document.querySelector('[data-drift]').clientWidth,
  }));
  assert.ok(render.time - time0 > 1, 'Gas animation advances in real seconds');
  assert.ok(render.resolution >= render.cssWidth, 'Horizon is never upscaled from a subpixel render');
  const a = await sharp(firstFrame).removeAlpha().raw().toBuffer();
  const b = await sharp(secondFrame).removeAlpha().raw().toBuffer();
  let changed = 0;
  for (let p = 0; p < a.length; p += 3) if (Math.abs(a[p]-b[p])+Math.abs(a[p+1]-b[p+1])+Math.abs(a[p+2]-b[p+2]) > 12) changed++;
  const moving = changed / (a.length / 3);
  assert.ok(moving > .025, `Visible gas flow changes pixels, got ${(moving*100).toFixed(1)}%`);
  const glass = await page.locator('.evac').evaluate(el => ({ radius: parseFloat(getComputedStyle(el).borderRadius), height: el.getBoundingClientRect().height, map: !!document.querySelector('[data-glass-map]').getAttribute('href') }));
  assert.ok(glass.radius >= glass.height/2 && glass.map, 'Glass capsule has a generated refraction map');
  await page.locator('.evac').hover();
  await page.waitForTimeout(450);
  await page.locator('.evac').screenshot({ path: 'artifacts/drift/glass-button.png' });
  console.log(`Horizon: ${(moving*100).toFixed(1)}% of crop pixels changed in 1.4 seconds; ${render.resolution}px render for ${render.cssWidth}px viewport.`);
  const astronaut = await page.evaluate(() => {
    const d = window.__drift;
    const p = d.astro.position.clone(); p.y += .72; p.project(d.camera);
    return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2, before: d.astro.position.x };
  });
  await page.mouse.move(astronaut.x, astronaut.y); await page.mouse.down();
  await page.mouse.move(astronaut.x + 110, astronaut.y - 40, { steps: 12 });
  await page.waitForTimeout(180); await page.mouse.up();
  assert.ok(await page.evaluate(before => Math.abs(window.__drift.astro.position.x - before) > .2, astronaut.before), 'Astronaut follows drag');
  await page.locator('[data-distress]').click();
  await page.waitForTimeout(650);
  assert.match(await page.locator('[data-pulse-status]').textContent(), /not alone/);
  await page.screenshot({ path: 'artifacts/drift/pulse.png' });
  await page.locator('.void-scroll').click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: 'artifacts/drift/recovery.png' });
  assert.equal(await page.locator('[data-beacon]').count(), 6);
  await page.evaluate(() => window.rbSetLang?.('de'));
  assert.match(await page.locator('#recover-title').textContent(), /verloren/);
  await page.screenshot({ path: 'artifacts/drift/recovery-de.png' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'artifacts/drift/desktop-de.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'artifacts/drift/desktop-900-de.png' });
  await page.locator('[data-calm-toggle]').click();
  assert.equal(await page.locator('[data-calm-toggle]').getAttribute('aria-pressed'), 'true');
  await page.waitForTimeout(200);
  const stillTime = await page.evaluate(() => window.__drift.holeUniforms.uTime.value);
  await page.waitForTimeout(450);
  assert.equal(await page.evaluate(() => window.__drift.holeUniforms.uTime.value), stillTime, 'Calm holds the horizon still');
  await page.locator('[data-drift-closest-link]').click();
  await page.waitForURL('**/gallery/fidic/');
  await page.close();

  const mobile = await setup({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  await mobile.goto(base + '/galery/fidik/', { waitUntil: 'networkidle' });
  await mobile.locator('[data-drift].is-live').waitFor({ timeout: 45000 });
  await mobile.waitForTimeout(2000);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await mobile.screenshot({ path: 'artifacts/drift/mobile.png' });
  await mobile.evaluate(() => window.scrollTo(0, 270));
  await mobile.waitForTimeout(600);
  await mobile.screenshot({ path: 'artifacts/drift/mobile-scroll.png' });
  await mobile.evaluate(() => window.scrollTo(0, 0));
  await mobile.evaluate(() => window.rbSetLang?.('de'));
  await mobile.screenshot({ path: 'artifacts/drift/mobile-de.png' });
  await mobile.setViewportSize({ width: 320, height: 740 });
  await mobile.waitForTimeout(700);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await mobile.screenshot({ path: 'artifacts/drift/mobile-320.png' });
  await mobile.close();

  const fallback = await setup({}, true);
  await fallback.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type.startsWith('webgl') ? null : get.call(this, type, ...args); };
  });
  await fallback.goto(base + '/galery/fidik/', { waitUntil: 'networkidle' });
  await fallback.locator('[data-drift].is-static').waitFor();
  assert.equal(await fallback.locator('[data-drift-closest-link]').getAttribute('href'), '/gallery/fidic/');
  await fallback.screenshot({ path: 'artifacts/drift/fallback.png' });
  await fallback.close();

  const nojs = await setup({ javaScriptEnabled: false });
  await nojs.goto(base + '/missing/', { waitUntil: 'networkidle' });
  assert.equal(await nojs.locator('[data-beacon]').count(), 6);
  assert.equal(await nojs.locator('.evac').isVisible(), true);
  await nojs.close();
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  assert.deepEqual(failedAssets, [], 'All scene assets load');
  console.log('PASS: 404 status, noindex, typo recovery, astronaut drag, pulse, scroll, Calm navigation, EN/DE, 320–393px, WebGL fallback, no-JS, assets, browser errors.');
} finally { await browser.close(); server.close(); }
