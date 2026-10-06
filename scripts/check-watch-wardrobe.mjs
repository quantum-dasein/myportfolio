import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
await mkdir('artifacts/watch-wardrobe',{recursive:true});
const base=process.env.TEST_SITE_URL||'http://127.0.0.1:4337';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const report=[],errors=[];
try{
 for(const mobile of [false,true]){
  const p=await browser.newPage({locale:'en-US',viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text())});
  const requests=[];p.on('request',r=>requests.push(r.url()));
  await p.goto(base+'/gallery/models/?mrdebug');await p.waitForSelector('[data-model-room][data-state="ready"]',{timeout:90000});await p.waitForSelector('rb-studio-loader',{state:'hidden',timeout:30000});
  await p.waitForFunction(()=>window.__mr.exhibits.shown('plant'),{timeout:90000});
  assert(!requests.some(u=>/citizen-eco-drive|bedroom-wardrobe-3/.test(u)&&u.endsWith('.glb')));
  for(const id of ['citizen-eco-drive','bedroom-wardrobe-3']){
   await p.getByRole('button',{name:'Model archive',exact:true}).click();
   await p.locator(`[data-catalog-show="${id}"]`).scrollIntoViewIfNeeded();
   await p.locator(`[data-catalog-show="${id}"]`).locator('..').locator('..').locator('img').evaluate(async img=>{await img.decode()});
   if(id==='citizen-eco-drive')await p.screenshot({path:`artifacts/watch-wardrobe/catalog-${mobile?'mobile':'desktop'}.png`});
   await p.locator(`[data-catalog-show="${id}"]`).click();await p.waitForFunction(id=>window.__mr.archive.activeId()===id,id,{timeout:45000});await p.getByRole('dialog').waitFor({state:'hidden'});
   await p.waitForTimeout(1500);
   const stats=await p.evaluate(()=>{const a=window.__mr.archive;return {id:a.activeId(),info:a.info(),meshes:a.meshes.map(m=>({vertices:m.geometry.attributes.position.count,texture:!!m.material.map,material:m.material.name})),camera:window.__mr.camera.position.toArray()}});
   assert(stats.meshes.length>0);assert(stats.meshes.every(m=>m.vertices>0));assert(stats.meshes.some(m=>m.texture));
   assert(requests.some(u=>u.endsWith(`/models/archive/${id}${mobile?'.mobile':''}.glb`)));
   assert(!requests.some(u=>u.endsWith(`/models/archive/${id}${mobile?'':'.mobile'}.glb`)));
   report.push({mobile,...stats});await p.screenshot({path:`artifacts/watch-wardrobe/${id}-${mobile?'mobile':'desktop'}.png`});
  }
  await p.close();
 }
 assert.deepEqual(errors,[]);await writeFile('artifacts/watch-wardrobe/browser-report.json',JSON.stringify({report,errors},null,2));console.log('PAIR PASSED',report.map(x=>({mobile:x.mobile,id:x.id,meshes:x.meshes.length})));
}finally{await browser.close()}
