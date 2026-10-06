import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base=process.env.TEST_SITE_URL||'http://127.0.0.1:4344';
const out='artifacts/model-archive-check';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const report=[], errors=[];
async function room(options={}){
 const page=await browser.newPage({locale:'en-US',viewport:{width:1440,height:1000},reducedMotion:'reduce',...options});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text())});
 await page.goto(base+'/gallery/models/?mrdebug');
 await page.waitForSelector('[data-model-room][data-state="ready"]',{timeout:90000});
 await page.waitForSelector('rb-studio-loader',{state:'hidden',timeout:20000});
 return page;
}
try{
 const p=await room();const gym=p.locator('[data-catalog-show="gym-equipment-03"]'), pool=p.locator('[data-catalog-show="pool-18"]');const requests=[];p.on('request',r=>requests.push(r.url()));
 assert.equal(await p.evaluate(()=>window.__mr.archive.activeId()),null);
 await p.getByRole('button',{name:'Model archive',exact:true}).click();
 await p.getByRole('dialog').waitFor();
 assert(await p.locator('.mr-catalog').evaluate(e=>e.matches(':modal')),'Archive must sit above the site navigation and make the background inert');
 await p.keyboard.press('Shift+Tab');
 assert(await p.locator('[data-catalog-order]').evaluate(e=>e===document.activeElement),'Keyboard focus stays inside the catalogue');
 await p.keyboard.press('Tab');
 assert(await p.locator('[data-catalog-close]').evaluate(e=>e===document.activeElement));
 await p.screenshot({path:out+'/catalog-desktop.png'});
 assert(!requests.some(u=>u.includes('/models/archive/')&&u.endsWith('.glb')),'Catalogue must not download 3D assets');
 const search=p.locator('[data-catalog-search]');await search.fill('not-a-model');
 assert.equal(await p.locator('[data-catalog-show]').count(),0);await search.fill('gym');
 assert.equal(await p.locator('[data-catalog-show]').count(),1);
 await p.getByRole('button',{name:'Show in room',exact:false}).click();
 await p.waitForFunction(()=>window.__mr.archive.activeId()==='gym-equipment-03',{timeout:30000});
 await p.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(await p.locator('[data-model-room]').getAttribute('data-mode'),'inspect');
 assert((await p.locator('[data-mr-cap-title]').innerText()).includes('Gym equipment 03'));
 await p.screenshot({path:out+'/gym-desktop.png'});
 await p.getByRole('button',{name:'Wireframe',exact:true}).click();
 assert(await p.evaluate(()=>window.__mr.archive.meshes.every(m=>(Array.isArray(m.material)?m.material:[m.material]).every(a=>a.wireframe))));
 await p.getByRole('button',{name:'Wireframe',exact:true}).click();
 await p.waitForFunction(()=>window.__mr.exhibits.shown('plant'),{timeout:90000});
 await p.getByRole('button',{name:'Model archive',exact:true}).click();
 assert.equal(await p.locator('[data-catalog-show]').count(),8);
 assert.equal(await p.locator('.mr-catalog').evaluate(e=>getComputedStyle(e).fontFamily),await p.locator('[data-model-room]').evaluate(e=>getComputedStyle(e).fontFamily));
 await pool.click();await p.waitForFunction(()=>window.__mr.archive.activeId()==='pool-18');await p.getByRole('dialog').waitFor({state:'hidden'});
 assert(await p.evaluate(()=>{const b=window.__mr.archive.colliders[0];return b.min.x<0&&b.max.x>0&&b.min.z<8&&b.max.z>8}),'The selected work occupies the central portal');
 await p.screenshot({path:out+'/pool-desktop.png'});
 await p.getByRole('button',{name:'Model archive',exact:true}).click();await gym.click();await p.getByRole('dialog').waitFor({state:'hidden'});

 async function clear(){await p.getByRole('button',{name:'Model archive',exact:true}).click();await p.getByRole('button',{name:'Clear stage',exact:true}).click();await p.waitForFunction(()=>window.__mr.archive.activeId()===null);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
 await clear();
 const baseline=await p.evaluate(()=>({...window.__mr.renderer.info.memory}));
 for(let i=0;i<3;i++){
  await (i%2?gym:pool).click();await p.waitForFunction(()=>window.__mr.archive.activeId()!==null);await p.getByRole('dialog').waitFor({state:'hidden'});await clear();
  console.log('memory cycle',i,await p.evaluate(()=>({...window.__mr.renderer.info.memory})));
 }
 const after=await p.evaluate(()=>({...window.__mr.renderer.info.memory}));
 assert(after.geometries<=baseline.geometries+1,`Geometry leak: ${JSON.stringify({baseline,after})}`);
 assert(after.textures<=baseline.textures+1,`Texture leak: ${JSON.stringify({baseline,after})}`);
 report.push({desktop:'Catalogue, search, lazy load, inspection, wireframe, repeated load/dispose passed',baseline,after});
 // Keep current room usable after a failed request; a retry can subsequently succeed.
 await p.route('**/models/archive/gym-equipment-03.glb',r=>r.fulfill({status:503,body:'Unavailable'}));
 await gym.click();await p.waitForFunction(()=>document.querySelector('[data-catalog-status]')?.textContent?.includes('could not load'));
 assert.equal(await p.evaluate(()=>window.__mr.archive.activeId()),null);
 await p.unroute('**/models/archive/gym-equipment-03.glb');
 await gym.click();await p.waitForFunction(()=>window.__mr.archive.activeId()!==null);await p.getByRole('dialog').waitFor({state:'hidden'});
 await clear();
 // Closing the dialog cancels a pending download. A late response cannot attach a model.
 let started;const sent=new Promise(r=>started=r);
 await p.route('**/models/archive/gym-equipment-03.glb',async r=>{started();await new Promise(r=>setTimeout(r,700));await r.continue().catch(()=>{});});
 await gym.click();await sent;await p.keyboard.press('Escape');await p.waitForTimeout(1000);
 assert.equal(await p.evaluate(()=>window.__mr.archive.activeId()),null);await p.unroute('**/models/archive/gym-equipment-03.glb');
 // Latest selection wins even if a different model is still downloading.
 await p.route('**/models/archive/gym-equipment-03.glb',async r=>{await new Promise(r=>setTimeout(r,900));await r.continue().catch(()=>{});});
 await p.getByRole('button',{name:'Model archive',exact:true}).click();await gym.click();await pool.click();
 await p.waitForFunction(()=>window.__mr.archive.activeId()==='pool-18');await p.getByRole('dialog').waitFor({state:'hidden'});await p.waitForTimeout(1000);
 assert(await p.evaluate(()=>window.__mr.archive.activeId()==='pool-18'&&window.__mr.archive.meshes.every(m=>m.userData.exhibit==='pool-18')));
 await p.unroute('**/models/archive/gym-equipment-03.glb');
 report.push('Failure/retry, cancellation and latest selection wins passed');
 await p.close();
 const phone=await room({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const urls=[];phone.on('request',r=>urls.push(r.url()));
 await phone.getByRole('button',{name:'Model archive',exact:true}).click();await phone.screenshot({path:out+'/catalog-mobile.png'});
 assert((await phone.locator('#mr-catalog-title').innerText()).includes('from my'),'Mobile heading preserves word spacing');
 assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await phone.locator('[data-catalog-show="pool-18"]').click();await phone.waitForFunction(()=>window.__mr.archive.activeId()!==null,{timeout:30000});
 assert(urls.some(u=>u.endsWith('pool-18.mobile.glb')));assert(!urls.some(u=>u.endsWith('/pool-18.glb')));
 await phone.screenshot({path:out+'/pool-mobile.png'});await phone.close();report.push('390px catalogue and mobile GLB passed');
 const animated=await room({reducedMotion:'no-preference'});
 await animated.getByRole('button',{name:'Model archive',exact:true}).click();await animated.locator('[data-catalog-show="pool-18"]').click();await animated.waitForFunction(()=>window.__mr.archive.activeId()!==null,{timeout:30000});
 await animated.waitForTimeout(450);await animated.screenshot({path:out+'/green-reveal.png'});
 await animated.waitForTimeout(1600);await animated.screenshot({path:out+'/pool-animated.png'});
 await animated.close();assert.deepEqual(errors,[]);
 await writeFile(out+'/report.json',JSON.stringify({report,errors},null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
