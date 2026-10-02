import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base=process.env.TEST_SITE_URL||'http://127.0.0.1:4337';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const errors=[],report=[];
try {
 for(const mobile of [false,true]){
  const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text())});
  const requests=[];p.on('request',r=>requests.push(r.url()));
  await p.goto(base+'/gallery/models/?mrdebug');await p.waitForSelector('[data-model-room][data-state="ready"]',{timeout:90000});await p.waitForSelector('rb-studio-loader',{state:'hidden',timeout:30000});
  await p.waitForFunction(()=>window.__mr.exhibits.shown('plant'),{timeout:90000});
  assert(!requests.some(u=>u.includes('/models/night/')));assert(await p.evaluate(()=>!('secrets' in window.__mr)));
  if(!mobile){
   await p.screenshot({path:'artifacts/new-models/room-entry.png'});
   const placement=await p.evaluate(()=>{const m=window.__mr,c=m.camera;const portal=m.scene.getObjectByName('Central archive portal');c.position.set(0,3.9,10.3);c.lookAt(0,0,4);return {x:portal.position.x,z:portal.position.z,svjGap:Math.hypot(portal.position.x+4.4,portal.position.z-2.6)-2.34-2.75}});
   assert(placement.svjGap>1.2);report.push(placement);await p.waitForTimeout(200);await p.screenshot({path:'artifacts/new-models/room-plan.png'});
  }
  for(const id of ['bronze-woman','waterfall-fountains']){
   await p.getByRole('button',{name:'Model archive',exact:true}).click();assert.equal(await p.locator('[data-catalog-show]').count(),4);
   assert.equal(await p.locator('[data-catalog-enquire]').getAttribute('href'),'/contact/?project=modeling');
   await p.locator(`[data-catalog-show="${id}"]`).click();await p.waitForFunction(id=>window.__mr.archive.activeId()===id,id,{timeout:30000});await p.getByRole('dialog').waitFor({state:'hidden'});
   assert(await p.evaluate(()=>window.__mr.archive.meshes.every(m=>m.geometry.attributes.position.count>0)));
   await p.screenshot({path:`artifacts/new-models/${id}-${mobile?'mobile':'desktop'}.png`});
   assert(requests.some(u=>u.endsWith(`/models/archive/${id}${mobile?'.mobile':''}.glb`)));
  }
  await p.close();
 }
 const p=await browser.newPage();
 for(const [path,label] of [['/contact/','Custom 3D modeling'],['/de/kontakt/','3D-Modellierung nach Maß']]){
  await p.goto(base+path+'?project=modeling');await p.waitForFunction(()=>document.querySelector('#cf-what')?.value==='modeling');
  assert.equal(await p.locator('#cf-what option:checked').textContent(),label);assert.equal(await p.locator('#cf-url').getAttribute('required'),null);
 }
 const res=await p.goto(base+'/gallery/night/');assert.equal(res.status(),404);
 const asset=await p.request.get(base+'/models/night/lida.glb');assert.equal(asset.status(),404);
 assert.deepEqual(errors,[]);await writeFile('artifacts/new-models/additions-report.json',JSON.stringify({report,errors,checks:'Both new models on desktop/mobile; 4 entries; EN/DE contact preselection; removed gift route/assets; portal gap'},null,2));
 console.log('ADDITIONS PASSED',JSON.stringify(report));
}finally{await browser.close()}
