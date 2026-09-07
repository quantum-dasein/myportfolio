import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

// Optional browser regression check: run after npm run verify and node serve.mjs.
const base = process.env.TEST_URL || 'http://127.0.0.1:4337';
mkdirSync('artifacts/profile', { recursive: true });
const browser = await puppeteer.launch({ headless: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(() => sessionStorage.setItem('rb-loader-seen', '1'));
  for (const [lang, slug] of [['en', 'rodion-belousov-vienna'], ['de', 'rodion-belousov-wien']]) {
    for (const width of [1672, 1440, 1100, 1024, 768, 393, 320]) {
      await page.setViewport({ width, height: 950, isMobile: width < 1050, hasTouch: width < 1050, deviceScaleFactor: 1 });
      await page.goto(`${base}/${lang}/${slug}/`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      await pause(1800); // Allow the site's entry transition and scroll restoration to settle.
      await page.$eval('.pf-process', el => {
        const top = el.getBoundingClientRect().top + scrollY;
        window.__rbLenis?.resize();
        window.__rbLenis?.scrollTo(top, { immediate: true, force: true });
        scrollTo({ top, behavior: 'instant' });
      });
      await pause(600);
      await page.waitForFunction(() => [...document.querySelectorAll('.pv-projects img')].every(img => img.complete && img.naturalWidth > 0));
      await page.$$eval('.pv-projects img', images => Promise.all(images.map(img => img.decode())));
      const scene = await page.evaluate(() => {
        const r = el => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width }; };
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          stage: r(document.querySelector('.pv-stage')),
          objects: [...document.querySelectorAll('[data-flow-object]')].map(r),
          captions: [...document.querySelectorAll('.pv-caption')].map(el => ({ ...r(el), text: el.textContent.trim() })),
          images: [...document.querySelectorAll('.pv-projects img')].every(img => img.complete && img.naturalWidth > 0),
          language: document.documentElement.lang,
        };
      });
      assert.equal(scene.overflow, false, `No page overflow: ${lang} ${width}`);
      assert.equal(scene.images, true, `Preview images load: ${lang} ${width}`);
      assert.equal(scene.language, lang === 'de' ? 'de-AT' : 'en');
      assert.ok(scene.objects.every(r => r.left >= 0 && r.right <= width), `Objects fit: ${lang} ${width}`);
      assert.ok(scene.captions.every(r => r.bottom <= scene.stage.bottom + 1), `Captions stay inside scene: ${lang} ${width}`);
      if (width > 1040) {
        assert.ok(scene.objects[1].width > scene.objects[0].width && scene.objects[1].width > scene.objects[2].width, 'Scope is the largest object');
        assert.ok(scene.objects.slice(1).every((r, i) => r.left > scene.objects[i].right), 'Desktop objects do not overlap');
      } else {
        assert.ok(scene.objects.slice(1).every((r, i) => r.top > scene.captions[i].bottom), 'Mobile stages do not overlap');
      }
      if ([1672, 393, 320].includes(width)) {
        const clip = await page.$eval('.pf-process', el => { const r = el.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: r.height }; });
        await page.screenshot({ path: `artifacts/profile/process-${lang}-${width}.png`, clip, captureBeyondViewport: true });
      }
      console.log(`PASS process layout: ${lang} ${width}px`);
    }
  }

  // Sample between nodes, after the last node, then reverse to the first.
  const centres = await page.$$eval('.pf-dot', dots => dots.map(dot => { const r = dot.getBoundingClientRect(); return r.top + scrollY + r.height / 2; }));
  const careerAt = async position => {
    await page.evaluate(y => scrollTo({ top: y - innerHeight * .64, behavior: 'instant' }), position);
    await pause(150);
    return page.$$eval('.pf-rows li', items => items.map(el => ({ reached: el.classList.contains('is-reached'), progress: Number(el.style.getPropertyValue('--career-progress')) })));
  };
  let timeline = await careerAt((centres[0] + centres[1]) / 2);
  assert.ok(Math.abs(timeline[0].progress - .5) < .015, 'Career rail follows viewport halfway');
  assert.deepEqual(timeline.map(r => r.reached), [true, false, false]);
  timeline = await careerAt(centres.at(-1) + 10);
  assert.deepEqual(timeline.map(r => r.reached), [true, true, true]);
  assert.equal(await page.$eval('.pf-rows li:last-child .pf-track', el => getComputedStyle(el).display), 'none', 'No rail beyond final node');
  const alignment = await page.$$eval('.pf-rows li', items => items.slice(0, -1).map((item, i) => {
    const rail = item.querySelector('.pf-track').getBoundingClientRect();
    const next = items[i + 1].querySelector('.pf-dot').getBoundingClientRect();
    return Math.abs(rail.bottom - (next.top + next.height / 2));
  }));
  assert.ok(alignment.every(delta => delta < 1), 'Rail ends at the next node centre');
  timeline = await careerAt(centres[0] - 15);
  assert.deepEqual(timeline.map(r => r.reached), [false, false, false], 'Nodes reverse when scrolling up');
  assert.equal(timeline[0].progress, 0);
  console.log('PASS reversible career timeline and exact endpoints');

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  assert.equal(await page.$eval('.pv-pulse', el => getComputedStyle(el).animationName), 'none');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.evaluate(() => document.documentElement.classList.add('rb-calm'));
  assert.equal(await page.$eval('.pv-pulse', el => getComputedStyle(el).animationName), 'none');
  console.log('PASS reduced motion and Calm mode');

  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.rbSetLang('de'));
  const profileLink = 'a[data-lang-href-de="/de/rodion-belousov-wien/"]';
  assert.equal(await page.$eval(profileLink, el => el.getAttribute('href')), '/de/rodion-belousov-wien/');
  await page.locator(profileLink).click();
  await page.waitForFunction(() => location.pathname === '/de/rodion-belousov-wien/');
  assert.equal(await page.$eval('html', el => el.lang), 'de-AT');
  await page.goto(`${base}/en/rodion-belousov-vienna/`, { waitUntil: 'networkidle0' });
  assert.equal(await page.evaluate(() => localStorage.getItem('rb-lang')), 'de', 'Direct EN link preserves saved language');
  await page.goto(base, { waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('html', el => el.lang), 'de-AT');
  await page.locator('a[data-i18n="footer.colophon"]').click();
  await page.waitForFunction(() => location.pathname.includes('/work/studio'));
  assert.equal(await page.$eval('html', el => el.lang), 'de-AT');
  console.log('PASS German footer navigation and saved language');

  await page.setJavaScriptEnabled(false);
  await page.goto(`${base}/de/rodion-belousov-wien/`, { waitUntil: 'load' });
  assert.equal(await page.$$eval('.pv-node', nodes => nodes.filter(el => getComputedStyle(el).opacity === '1').length), 3);
  assert.ok((await page.$eval('[data-career-timeline]', el => el.textContent)).includes('Siemens'));
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  console.log('PASS readable content without JavaScript; all profile checks passed');
} finally {
  await browser.close();
}
