// Actual Studio/Chromium replaying the recorded genuine Nori reports/images.
// No fresh Meta call: replay coverage is not live inference evidence.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const fixture='evidence/live-2026-11-01/nori';
(async()=>{
 const report=JSON.parse(await fs.readFile(fixture+'/styled.json','utf8'));
 const revised='data:image/webp;base64,'+(await fs.readFile(fixture+'/revised.webp')).toString('base64');
 const run=stage=>report.runs.find(r=>r.stage===stage);
 const out='qa-artifacts/style-replay';await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000},locale:'en-US',acceptDownloads:true});
   const page=await context.newPage(),errors=[];let audits=0,images=0;
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/health',r=>r.fulfill({json:{configured:true,demoGate:false}}));
   await page.route('**/api/audit',r=>{
    audits++;const comparing=!!r.request().postDataJSON().referenceImage;
    return r.fulfill({json:{audit:comparing?report.verified:report.original,
     model:run(comparing?'reaudit':'initial').model,provenance:run(comparing?'reaudit':'initial').provenance,
     report_language:'id',original_reference_sent:comparing}});
   });
   await page.route('**/api/improve',r=>{
    images++;const body=r.request().postDataJSON();assert.equal(body.mode,'restyle');
    assert.equal(body.consistency.style,'cinematic');assert.equal(body.consistency.locks.product_shape,true);
    return r.fulfill({json:{image:revised,model:run('visual_style').model,
     provenance:run('visual_style').provenance,repair_metadata:report.visual_consistency.repair}});
   });
   await page.goto('http://127.0.0.1:3000/app');
   await page.locator('#fileInput').setInputFiles(fixture+'/original.png');
   await page.locator('#product').fill(report.context.product);await page.locator('#facts').fill(report.context.facts);
   await page.locator('#caption').fill(report.context.caption);
   await page.locator('#auditButton').click();
   await page.waitForFunction(()=>!document.querySelector('#downloadReport').disabled);
   await page.locator('#visualStyle').selectOption('cinematic');await page.locator('#applyVisualStyle').click();
   await page.waitForFunction(()=>document.querySelector('#repairJourney').dataset.phase==='passed');
   assert.equal(audits,2);assert.equal(images,1);
   for(const tab of ['viewRevised','viewCompare'])assert.equal(await page.locator('#'+tab).isEnabled(),true);
   assert.equal(await page.locator('#viewCompare').getAttribute('aria-selected'),'true');
   assert.match(await page.locator('#consistencyResult h3').textContent(),/Meta AI comparison passed/);
   assert.doesNotMatch(await page.locator('#repairGuardNotice').textContent(),/Areas outside the correction remained unchanged/);
   assert.equal(await page.locator('#outputSource').inputValue(),'revised','style export must default to the styled result');
   // Interface refresh must not silently switch the main canvas back to original.
   await page.locator('#deckProof').click();await page.locator('#viewCompare').click();
   await page.locator('#languageSelect').selectOption('id');
   assert.equal(await page.locator('#viewCompare').getAttribute('aria-selected'),'true');
   assert.match(await page.locator('#consistencyResult h3').textContent(),/Perbandingan Meta AI lolos/);
   await page.locator('#viewOriginal').click();await page.locator('#viewRevised').click();await page.locator('#viewCompare').click();
   await page.locator('#prepareOutput').click();await page.locator('#outputPreview').waitFor({state:'visible'});
   await page.waitForFunction(()=>!document.querySelector('#downloadImage').disabled);
   const pngPromise=page.waitForEvent('download');await page.locator('#downloadImage').click();
   const png=await pngPromise;const pngPath=path.join(out,`nori-styled-${width}.png`);await png.saveAs(pngPath);
   const bytes=await fs.readFile(pngPath);assert.equal(bytes.readUInt32BE(16),1080);assert.equal(bytes.readUInt32BE(20),1080);
   const corners=await page.evaluate(async()=>{
    const color=async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);return [...x.getImageData(0,0,1,1).data];};
    return {original:await color(document.querySelector('#compareBefore').src),exported:await color(document.querySelector('#outputPreview').src)};
   });
   assert.ok(corners.exported.slice(0,3).reduce((sum,v,k)=>sum+Math.abs(v-corners.original[k]),0)>30,'download must contain the new textured background, not original flat artwork');
   assert.equal(corners.exported[3],255);
   const jsonPromise=page.waitForEvent('download');await page.locator('#downloadReport').click();
   const exported=JSON.parse(await fs.readFile(await (await jsonPromise).path(),'utf8'));
   assert.equal(exported.visual_consistency.output_actual.source,'revised');
   assert.equal(exported.visual_consistency.verification.validation_basis,'independent_meta_comparison');
   assert.equal(exported.visual_consistency.verification.auto_approved,false);
   assert.equal(audits,2,'view, language and PNG preparation must not repeat model calls');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(out,`studio-${width}.png`),fullPage:true});
   results.push({width,audits,images,export:1080,corners,errors,passed:true});await context.close();
  }
 }finally{await browser.close();}
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({kind:'recorded_meta_replay_not_fresh_inference',results},null,2));
 console.log(JSON.stringify({kind:'recorded_meta_replay_not_fresh_inference',results}));
})().catch(e=>{console.error(e);process.exitCode=1;});
