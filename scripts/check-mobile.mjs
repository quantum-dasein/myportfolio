import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
// Optional visual regression check; requires a local Puppeteer installation.
// Run against `node serve.mjs` after `npm run verify`.
mkdirSync('artifacts/mobile', {recursive:true});
const browser = await puppeteer.launch({headless: true});
const page = await browser.newPage();
await page.setViewport({width:393,height:852,isMobile:true,hasTouch:true,deviceScaleFactor:1});
await page.setExtraHTTPHeaders({'Accept-Language':'de-AT,de;q=0.9'});
const errors = [];
page.on('pageerror', e => errors.push(e.stack));
const base = process.env.TEST_URL || 'http://127.0.0.1:4337';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const state = () => page.evaluate(()=>({y:scrollY,height:document.documentElement.scrollHeight,html:document.documentElement.className,body:document.body.className,overflow:getComputedStyle(document.documentElement).overflow,touch:getComputedStyle(document.documentElement).touchAction,lenis:window.__rbLenis ? {limit:window.__rbLenis.limit,scroll:window.__rbLenis.animatedScroll,stopped:window.__rbLenis.isStopped}:null}));
try {
  await page.goto(base,{waitUntil:'load'});
  await sleep(11000);
  assert.equal((await state()).y, 0, 'Fresh homepage starts at top');
  assert.equal((await state()).lenis, null, 'Touch uses native scroll');
  const cdp=await page.createCDPSession();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:690}]});
  for(let y=670;y>=210;y-=20) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y}]});
    await sleep(16);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await sleep(800);
  assert.ok((await state()).y > 250, 'First-visit touch swipe scrolls');
  console.log('PASS first-visit touch scrolling');
  await page.evaluate(()=>window.rbSetLang?.('de'));
  await page.locator('a[data-case-link][href="/work/bridge-consult"]').click();
  await page.waitForFunction(()=>location.pathname.includes('/work/bridge-consult'));
  await sleep(3500);
  assert.equal((await state()).y, 0, 'Home to Bridge opens at top');
  await page.screenshot({path:'artifacts/mobile/bridge-393.png'});
  await page.locator('[data-case-back]').click();
  await page.waitForFunction(()=>location.pathname === '/');
  await sleep(3000);
  assert.ok((await state()).y > 800, 'Back restores homepage work position');
  await page.locator('a[data-case-link][href="/work/fidic"]').click();
  await page.waitForFunction(()=>location.pathname.includes('/work/fidic'));
  await sleep(2500);
  assert.equal((await state()).y, 0, 'Home to FIDIC opens at top');
  for (const width of [320,375,393,430]) {
    await page.setViewport({width,height:852,isMobile:true,hasTouch:true,deviceScaleFactor:1});
    await sleep(300);
    const title=await page.$eval('.case-title',el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,line:parseFloat(getComputedStyle(el).lineHeight),text:el.textContent,overflow:document.documentElement.scrollWidth > innerWidth}));
    assert.equal(title.text,'FIDIC.uz');
    assert.ok(title.height < title.line * 1.2, `FIDIC fits one line at ${width}`);
    assert.equal(title.overflow,false, `No horizontal overflow at ${width}`);
    await page.screenshot({path:`artifacts/mobile/fidic-${width}.png`});
  }
  console.log('PASS case navigation, return position and 320–430px titles');
  await page.reload({waitUntil:'load'});
  await sleep(2000);
  await page.evaluate(()=>scrollTo(0,600));
  assert.ok((await state()).y>500,'Reload keeps document scrollable');
  await page.goto(base+'/de/rodion-belousov-wien/',{waitUntil:'load'});
  await sleep(2000);
  await page.screenshot({path:'artifacts/mobile/profile-de.png',fullPage:true});
  assert.equal(await page.$eval('html',el=>el.lang),'de-AT');
  await page.locator('[data-lang-route="en"]').click();
  await page.waitForFunction(()=>location.pathname.includes('rodion-belousov-vienna'));
  assert.equal(await page.$eval('html',el=>el.lang),'en');
  console.log('PASS profile language routing');
  await page.setViewport({width:1440,height:900,isMobile:false,hasTouch:false});
  await page.goto(base,{waitUntil:'load'});
  await sleep(1500);
  await page.mouse.wheel({deltaY:700});
  await sleep(1000);
  assert.ok((await state()).y>200,'Desktop wheel scroll');
  console.log('PASS desktop scrolling');
  const noJs=await browser.newPage();
  await noJs.setJavaScriptEnabled(false);
  await noJs.goto(base,{waitUntil:'load'});
  assert.equal(await noJs.$eval('rb-studio-loader',el=>getComputedStyle(el).display),'none');
  assert.equal(await noJs.$eval('.hero-title .line',el=>getComputedStyle(el).opacity),'1');
  await noJs.goto(base+'/de/rodion-belousov-wien/',{waitUntil:'load'});
  assert.ok((await noJs.$eval('main',el=>el.textContent)).includes('Siemens'));
  console.log('PASS content without JavaScript');
  await noJs.close();
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  console.log('Mobile and SEO browser checks passed. Screenshots: artifacts/mobile/');
} finally { await browser.close(); }
