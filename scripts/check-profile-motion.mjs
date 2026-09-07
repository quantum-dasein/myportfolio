import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

const base = process.env.TEST_URL || 'http://127.0.0.1:4337';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
mkdirSync('artifacts/profile-motion', { recursive: true });
const browser = await puppeteer.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text()); });
  await page.evaluateOnNewDocument(() => sessionStorage.setItem('rb-loader-seen', '1'));
  const jump = async top => {
    await page.evaluate(y => {
      window.__rbLenis?.resize();
      window.__rbLenis?.scrollTo(y, { immediate: true, force: true });
      scrollTo({ top: y, behavior: 'instant' });
    }, top);
  };
  const state = () => page.evaluate(() => {
    const q = selector => document.querySelector(selector);
    const style = (selector, property) => getComputedStyle(q(selector))[property];
    const centre = selector => { const r = q(selector).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
    const send = centre('.pv-send');
    const icon = centre('.pv-send svg');
    return {
      progress: Number(q('.pv').dataset.motionProgress),
      text: [...q('.pv-type-ink').childNodes].map(node => node.nodeType === 3 ? node.textContent : [...node.children].filter(glyph => Number(getComputedStyle(glyph).opacity) > .5).map(glyph => glyph.textContent).join('')).join('').trimEnd(),
      fullText: q('.pv-typed').getAttribute('aria-label'),
      checks: [...document.querySelectorAll('.pv-check-mark')].map(el => parseFloat(getComputedStyle(el).strokeDashoffset)),
      glows: [...document.querySelectorAll('.pv-check')].map(el => parseFloat(getComputedStyle(el).getPropertyValue('--check-glow'))),
      live: Number(style('.pv-live', 'opacity')),
      browser: Number(style('.pv-browser', 'opacity')),
      projects: [...document.querySelectorAll('.pv-projects > div')].map(el => Number(getComputedStyle(el).opacity)),
      complete: q('.pv').classList.contains('is-complete'),
      overflow: document.documentElement.scrollWidth > innerWidth,
      glyphRows: [...document.querySelectorAll('.pv-letter')].map(glyph => glyph.offsetTop),
      iconOffset: Math.hypot(send.x - icon.x, send.y - icon.y),
      textOffset: Math.abs(centre('.pv-typed').y - send.y),
    };
  });
  for (const width of [1440, 393]) {
    await page.setViewport({ width, height: 950, isMobile: width < 1000, hasTouch: width < 1000, deviceScaleFactor: 1 });
    await page.goto(`${base}/de/rodion-belousov-wien/`, { waitUntil: 'networkidle0' });
    await sleep(1800);
    const bounds = await page.$eval('.pv', el => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, height: r.height, viewport: innerHeight }; });
    const at = async progress => {
      await jump(bounds.top - bounds.viewport * .82 + bounds.height * progress);
      await sleep(1400);
      const result = await state();
      assert.ok(Math.abs(result.progress - Math.min(1, Math.max(0, progress))) < .02, `Scrub follows scroll: ${width} ${progress}, actual ${result.progress}`);
      assert.equal(result.overflow, false, `No overflow during motion at ${width}`);
      return result;
    };
    let current = await at(0);
    const reservedRows = current.glyphRows;
    assert.equal(current.text, '');
    assert.equal(current.live, 0);
    assert.ok(current.checks.every(value => value > .99));
    current = await at(.1);
    assert.deepEqual(current.glyphRows, reservedRows, 'Typing preserves every word wrap');
    assert.ok(current.text.length > 0 && current.text.length < current.fullText.length, 'Typing progresses without changing layout');
    current = await at(.42);
    assert.deepEqual(current.glyphRows, reservedRows, 'Completed typing preserves the original line positions');
    assert.ok(current.iconOffset < 1 && current.textOffset < 1, 'Message text and send icon stay centred');
    assert.equal(current.text, current.fullText);
    assert.ok(current.checks[0] < .1 && current.checks[1] > .99, 'Scope confirms one module at a time');
    current = await at(.58);
    assert.ok(current.checks.every(value => value < .01));
    assert.equal(current.live, 0, 'Launch waits for confirmations');
    current = await at(.8);
    assert.ok(current.live > .99, 'Live status appears after browser frame');
    assert.ok(current.projects.every(value => value < .01), 'Projects follow the hero');
    current = await at(1);
    assert.equal(current.complete, true);
    assert.ok(current.projects.every(value => value > .99));
    assert.ok(current.glows.every(value => value > .99), 'Confirmed checks keep a visible glow');
    await page.$$eval('.pv-projects img', images => Promise.all(images.map(image => image.decode())));
    await page.screenshot({ path: `artifacts/profile-motion/completed-${width}.png` });
    current = await at(.1);
    assert.ok(current.text.length < current.fullText.length && current.checks.every(value => value > .99), 'Reverse scroll rewinds the same narrative');

    await at(.45);
    await page.$eval('[data-calm-toggle]', button => button.click());
    await sleep(150);
    current = await state();
    assert.equal(current.text, current.fullText);
    assert.equal(current.browser, 1, 'Calm reveals the complete scene midway');
    assert.equal(await page.$eval('.pv', el => el.classList.contains('is-sequenced')), false);
    assert.equal(await page.$eval('.pf-rows li p', el => getComputedStyle(el).opacity), '1');
    await page.$eval('[data-calm-toggle]', button => button.click());
    await sleep(850);
    assert.ok((await state()).checks[2] > .99, 'Leaving Calm restores the current scroll position');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await sleep(100);
    assert.equal((await state()).browser, 1, 'Reduced motion is applied live');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await sleep(850);

    // Reveal the experience copy while ensuring its rail remains stationary.
    const rowY = await page.$eval('.pf-rows li', row => row.getBoundingClientRect().top + scrollY);
    await jump(rowY - 950 * .86);
    await sleep(450); // Description follows the date, company and role.
    const middle = await page.$eval('.pf-rows li p:last-child', el => Number(getComputedStyle(el).opacity));
    assert.ok(middle > 0 && middle < 1, 'Career description actually animates on entry');
    const dotBefore = await page.$eval('.pf-dot', el => el.getBoundingClientRect().top);
    await sleep(1000);
    const dotAfter = await page.$eval('.pf-dot', el => el.getBoundingClientRect().top);
    assert.ok(Math.abs(dotAfter - dotBefore) < 1, 'Text entrance does not move the timeline rail');
    assert.equal(await page.$eval('.pf-rows li p:last-child', el => getComputedStyle(el).opacity), '1');
    const bottomGroups = ['.pf-cards article:last-child', '.pf-langs:last-child', '.pf-elsewhere', '.pf-outro'];
    for (const selector of bottomGroups) {
      const y = await page.$eval(selector, el => el.getBoundingClientRect().top + scrollY);
      await jump(y - 950 * .6);
      await sleep(1200);
      assert.ok(await page.$eval(selector, el => [el, ...el.children].every(child => Number(getComputedStyle(child).opacity) > .99)), `Bottom content finishes revealing: ${selector}`);
    }
    console.log(`PASS ${width}px: causal scroll sequence, reverse, Calm, reduced motion and copy reveals`);
  }
  await page.goto(`${base}/de/rodion-belousov-wien/#experience`, { waitUntil: 'networkidle0' });
  await sleep(1800);
  let restored = await state();
  assert.equal(restored.text, restored.fullText, 'A direct anchor restores the completed message');
  assert.equal(restored.browser, 1);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1800);
  restored = await state();
  assert.equal(restored.text, restored.fullText, 'Reloading below the scene keeps its message visible');
  // A real wheel event exercises the follower together with desktop Lenis.
  await page.setViewport({ width: 1440, height: 950, isMobile: false, hasTouch: false });
  await page.goto(`${base}/en/rodion-belousov-vienna/`, { waitUntil: 'networkidle0' });
  await sleep(1800);
  const wheelStart = await page.$eval('.pv', el => {
    const rect = el.getBoundingClientRect();
    return rect.top + scrollY - innerHeight * .82 + rect.height * .15;
  });
  await jump(wheelStart);
  await sleep(1400);
  const recording = page.evaluate(() => new Promise(resolve => {
    const samples = [];
    const start = performance.now();
    const sample = time => {
      samples.push(Number(document.querySelector('.pv').dataset.motionProgress));
      if (time - start > 2000) resolve(samples);
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  await page.mouse.wheel({ deltaY: 420 });
  const samples = await recording;
  const jumps = samples.slice(1).map((progress, index) => progress - samples[index]);
  assert.ok(Math.max(...jumps) < .065, 'Large wheel input does not jump through a stage');
  assert.ok(samples.at(-1) - samples[0] > .3, 'Smoothed scene still follows the wheel');
  assert.deepEqual(errors, [], 'No animation errors in browser');
  console.log('All profile motion checks passed.');
} finally { await browser.close(); }
