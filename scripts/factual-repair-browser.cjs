// Real Chromium pixels / mocked Meta reports. NEVER live model evidence.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const outDir=path.resolve('qa-artifacts/source-bound');
const facts='Product: LumaDesk Mini\nPower consumption: 5 watts\nLight color: Warm white (3000K)\nPower source: USB 5V\nNo verified evidence for savings or health benefits.';
const inventory=lines=>({lines,coverage:'complete',limitations:''});
const oldLines=['QA TEST — FICTIONAL PRODUCT','LumaDesk Mini / 5 W','90% savings'];
const newLines=['QA TEST — FICTIONAL PRODUCT','LumaDesk Mini / 5 W','Power consumption: 5 watts'];
const originalAudit={score:50,headline:'MOCK Meta report — source-bound repair test',summary:'TEST ONLY',recommended_caption:'UNTRUSTED Efficient LED',strengths:[],checks:{claim:20,clarity:80,hierarchy:80,action:80},
 text_inventory:inventory(oldLines),claim_ledger:[{claim:'90% savings',origin:'creative',assessment:'unsupported_by_supplied_facts',fact_quote:'',recommended_action:'Remove unsupported savings',reason:'Not in supplied facts'}],
 issues:[{title:'Unsupported savings',category:'Claim',severity:'high',evidence:'90% savings',suggestion:'Replace with supplied power consumption'}],
 local_text_repair:{coverage:'complete',protected_regions:[{x:.42,y:.2,width:.16,height:.52}],edits:[{before:'90% savings',replacement:'Power consumption: 5 watts',box:{x:.05,y:.835,width:.4,height:.1}}]}};
const revisedAudit={...originalAudit,score:90,headline:'MOCK independent re-audit — no observed defect',issues:[],claim_ledger:[],text_inventory:inventory(newLines),local_text_repair:null,
 consistency:{original_text:inventory(oldLines),revised_text:inventory(newLines),changed_text:[],new_claims:[{text:'Power consumption: 5 watts',assessment:'supported',fact_quote:'Power consumption: 5 watts',evidence:'Visible exact fact'}],visual:{}}};
(async()=>{
 await fs.mkdir(outDir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let audits=0,imageCalls=0,finalCaptionSent=null;
  await page.route('**/api/health',r=>r.fulfill({json:{ok:true,configured:true,demoGate:false}}));
  await page.route('**/api/improve',r=>{imageCalls++;return r.fulfill({status:500,json:{error:'No image generation permitted in deterministic test'}});});
  await page.route('**/api/audit',r=>{audits++;const body=r.request().postDataJSON();if(body.referenceImage)finalCaptionSent=body.caption;return r.fulfill({json:{audit:body.referenceImage?(audits>2?{...revisedAudit,consistency:{...revisedAudit.consistency,original_text:inventory(newLines),new_claims:[]}}:revisedAudit):originalAudit,model:'MOCK SPARK — NOT LIVE',tokens:0,original_reference_sent:!!body.referenceImage,report_language:'en'}});});
  await page.goto('http://127.0.0.1:3000/app');
  await page.locator('#languageSelect').selectOption('en');
  await page.locator('#fileInput').setInputFiles('evidence/live-2026-10-31/case-a/original.png');
  await page.locator('#product').fill('LumaDesk Mini');await page.locator('#facts').fill(facts);await page.locator('#caption').fill('Saves 90%, protects eyes and improves sleep.');
  await page.locator('#auditButton').click();await page.locator('#refineButton').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('#refineButton').disabled);
  assert.match(await page.locator('#suggestedCaption').textContent(),/Power consumption: 5 watts/);
  assert.doesNotMatch(await page.locator('#suggestedCaption').textContent(),/Efficient|Saves 90|protects eyes/);
  await page.locator('#refineButton').click();
  await page.waitForFunction(()=>document.querySelector('#consistencyResult h3')?.textContent.includes('Consistency validated'));
  assert.equal(audits,2);assert.equal(imageCalls,0);
  assert.match(finalCaptionSent,/5 watts/);assert.doesNotMatch(finalCaptionSent,/Saves 90|protects eyes|improves sleep/);
  const downloadEvent=page.waitForEvent('download');await page.locator('#downloadPackage').click();
  await (await downloadEvent).saveAs(path.join(outDir,'luma-local-repair.zip'));
  // Decode actual source and result, compare ALL pixels outside the repair,
  // exercise all three required ratio transitions, and verify export bytes.
  const checks=await page.evaluate(async()=>{
   const output=await import('/output-system.js');
   const original=document.querySelector('#compareBefore').src,revised=document.querySelector('#compareAfter').src;
   const proof=await output.verifyLocalPixels(original,revised,[{x:60,y:668,width:480,height:80}]);
   const imageBytes=async data=>[...Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0))];
   const source=await output.decodeImage(revised);
   const transitions=[];
   for(const [from,to] of [[[1,1],[16,9]],[[1,1],[9,16]],[[16,9],[1,1]]]){
    const c=document.createElement('canvas');c.width=from[0]*100;c.height=from[1]*100;
    const ctx=c.getContext('2d');ctx.fillStyle='#e9e8de';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#234b3d';ctx.fillRect(c.width*.35,c.height*.3,c.width*.3,c.height*.4);
    const adapted=await output.extendFlatBackground(c.toDataURL(),{width:to[0]*100,height:to[1]*100});
    if(!adapted?.source_pixels_preserved)throw Error('Source pixel loss during ratio adaptation');
    const category=to[0]===16?'website':'social',preset=to[0]===16?0:to[1]===16?2:0;
    const png=await output.renderOutput(adapted.image,{category,preset},{allowInterpolation:true,aiAdapted:true});
    const bytes=[...new Uint8Array(await png.blob.arrayBuffer())];
    transitions.push({from:from.join(':'),to:to.join(':'),metadata:png.metadata,bytes});
   }
   const printSource=await output.extendFlatBackground(revised,{width:1240,height:1754});
   const print=await output.renderOutput(printSource.image,{category:'print',width:210,height:297,unit:'mm',ppi:150},{allowInterpolation:true,aiAdapted:true});
   return {proof,original:await imageBytes(original),revised:await imageBytes(revised),transitions,print:{metadata:print.metadata,bytes:[...new Uint8Array(await print.blob.arrayBuffer())]},source_dimensions:{width:source.naturalWidth,height:source.naturalHeight}};
  });
  assert.equal(checks.proof.outside_changed_pixels,0);assert.ok(checks.proof.inside_changed_pixels>0);
  await fs.writeFile(path.join(outDir,'luma-revised.png'),Buffer.from(checks.revised));
  for(const x of checks.transitions){assert.deepEqual(x.metadata.actual,{width:x.metadata.width,height:x.metadata.height});assert.equal(x.metadata.padding,'none');await fs.writeFile(path.join(outDir,`${x.from.replace(':','x')}-to-${x.to.replace(':','x')}.png`),Buffer.from(x.bytes));delete x.bytes;}
  assert.deepEqual(checks.print.metadata.actual,{width:1240,height:1754});
  await fs.writeFile(path.join(outDir,'a4-150ppi.png'),Buffer.from(checks.print.bytes));delete checks.print.bytes;
  delete checks.original;delete checks.revised;
  // Exercise normal export without the removed manual-review checkbox.
  await page.locator('#outputCategory').selectOption('website');
  await page.locator('#allowInterpolation').check();
  await page.locator('#prepareOutput').click();
  await page.waitForFunction(()=>!document.querySelector('#downloadImage').disabled);
  const imageDownload=page.waitForEvent('download');await page.locator('#downloadImage').click();
  const uiPath=path.join(outDir,'ui-export-1600x900.png');
  await (await imageDownload).saveAs(uiPath);
  const actual=await fs.readFile(uiPath);assert.equal(actual.readUInt32BE(16),1600);assert.equal(actual.readUInt32BE(20),900);
  const exportedPixels=await page.evaluate(async data=>{
   const {decodeImage}=await import('/output-system.js');const exported=await decodeImage(data),preview=document.querySelector('#outputPreview');await preview.decode();
   const read=img=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
   const x=read(exported),y=read(preview);return {preview_matches_export:x.every((v,i)=>v===y[i]),all_opaque:x.every((v,i)=>i%4!==3||v===255),dimensions:{width:exported.naturalWidth,height:exported.naturalHeight}};
  },'data:image/png;base64,'+actual.toString('base64'));
  assert.equal(exportedPixels.preview_matches_export,true);assert.equal(exportedPixels.all_opaque,true);checks.exportedPixels=exportedPixels;
  assert.equal(imageCalls,0);assert.equal(audits,3,'one re-audit for extension, no new image generation');
  assert.deepEqual(errors,[]);
  const caption=await page.locator('#suggestedCaption').textContent();
  await fs.writeFile(path.join(outDir,'caption.txt'),caption);
  await fs.writeFile(path.join(outDir,'results.json'),JSON.stringify({evidence_type:'real_chromium_pixels_with_mock_meta_reports',live_meta_calls:0,audits,imageCalls,caption,finalCaptionSent,...checks},null,2));
  console.log(JSON.stringify({status:'PASS',live_meta_calls:0,audits,imageCalls,proof:checks.proof,ratios:checks.transitions.map(x=>({from:x.from,to:x.to,actual:x.metadata.actual})),output:outDir}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
