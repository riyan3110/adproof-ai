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
  assert.equal(await page.locator('#repairJourney').getAttribute('data-phase'),'ready');
  assert.match(await page.locator('#repairJourneyIssue').textContent(),/90% savings/);
  assert.equal(await page.locator('#repairJourneyButton').getAttribute('data-action'),'repair');
  assert.match(await page.locator('#suggestedCaption').textContent(),/Power consumption: 5 watts/);
  assert.doesNotMatch(await page.locator('#suggestedCaption').textContent(),/Efficient|Saves 90|protects eyes/);
  await page.locator('#repairJourneyButton').click();
  await page.waitForFunction(()=>document.querySelector('#consistencyResult h3')?.textContent.includes('Consistency validated'));
  await page.waitForFunction(()=>document.querySelector('#repairJourney')?.dataset.phase==='passed');
  assert.equal(await page.locator('#repairJourney').getAttribute('data-phase'),'passed');
  assert.equal(await page.locator('#repairJourneyButton').getAttribute('data-action'),'compare');
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
   // A generated surrounding frame cannot redraw reference pixels or upscale them.
   const frameCanvas=document.createElement('canvas');frameCanvas.width=1600;frameCanvas.height=900;const fctx=frameCanvas.getContext('2d');fctx.fillStyle='#e9e8de';fctx.fillRect(0,0,1600,900);
   const restored=await output.compositeReferenceFrame(revised,frameCanvas.toDataURL());
   if(!restored.source_pixels_preserved||restored.source_upscaled)throw Error('Reference frame drift');
   fctx.fillStyle='#ff0000';fctx.fillRect(0,0,1600,900);let rejected=false;try{await output.compositeReferenceFrame(revised,frameCanvas.toDataURL())}catch{rejected=true;}if(!rejected)throw Error('Visible scene seam was not rejected');
   const printSource=await output.extendFlatBackground(revised,{width:1240,height:1754});
   const print=await output.renderOutput(printSource.image,{category:'print',width:210,height:297,unit:'mm',ppi:150},{allowInterpolation:true,aiAdapted:true});
   return {proof,original:await imageBytes(original),revised:await imageBytes(revised),transitions,print:{metadata:print.metadata,bytes:[...new Uint8Array(await print.blob.arrayBuffer())]},source_dimensions:{width:source.naturalWidth,height:source.naturalHeight}};
  });
  // Actual browser canvas test: a complex photo-like scene includes a
  // uniform badge. A multiline replacement must stay inside the badge
  // without altering protected product pixels or relying on Muse glyphs.
  const badgeProof=await page.evaluate(async()=>{
    const out=await import('/output-system.js');
    const c=document.createElement('canvas');c.width=600;c.height=600;const ctx=c.getContext('2d');
    const gr=ctx.createLinearGradient(0,0,600,600);
    gr.addColorStop(0,'#0f3022');gr.addColorStop(.5,'#728663');gr.addColorStop(1,'#2d4033');
    ctx.fillStyle=gr;ctx.fillRect(0,0,600,600);
    for(let i=0;i<50;i++){ctx.fillStyle='rgba(255,255,255,0.05)';ctx.fillRect((i*83)%600,(i*67)%600,15,15);}
    ctx.fillStyle='#deded2';ctx.fillRect(390,110,140,370);
    ctx.fillStyle='#f4dda1';ctx.fillRect(24,230,320,100);
    // Keep the source glyphs inside the badge with a real background margin.
    // At 24px Linux Arial fallback touches its right edge, correctly failing
    // the production perimeter check. Do not weaken that pixel protection.
    ctx.font='bold 20px Arial';ctx.fillStyle='#152b23';ctx.fillText('DINGIN HINGGA 24 JAM',39,282);
    const original=c.toDataURL('image/png');
    const plan={edits:[{background:'complex',before:'DINGIN HINGGA 24 JAM',
      replacement:'STAINLESS STEEL 600 mL TUTUP ULIR',
      box:{x:24/600,y:230/600,width:320/600,height:100/600}}],
      protected_regions:[{x:390/600,y:110/600,width:140/600,height:370/600}]};
    const result=await out.repairTextLocally(original,plan);
    if(!result)return {success:false};
    const proof=await out.verifyLocalPixels(original,result.image,result.pixel_proof.rectangles);
    const layoutCtx=c.getContext('2d');
    const layout=out.fitReplacementLines(layoutCtx,plan.edits[0].replacement,320,100,10);
    return {success:true,proof,layout,method:result.method};
  });
  assert.equal(badgeProof.success,true,'uniform local badge is repairable even in a complex scene');
  assert.equal(badgeProof.proof.outside_changed_pixels,0);
  assert.ok(badgeProof.proof.inside_changed_pixels>0);
  assert.equal(badgeProof.layout.lines.join(' '),'STAINLESS STEEL 600 mL TUTUP ULIR');
  assert.ok(badgeProof.layout.lines.length>1);
  assert.equal(badgeProof.method,'source_pixels_with_deterministic_text');
  // Adversarial complex background: the image model changes EVERYTHING,
  // including the bottle, while the source-pixel compositor must only accept
  // the localized text patch. This checks decoded pixels, not AI assertions.
  const complex=await page.evaluate(async()=>{
    const {compositePlannedRegions,verifyLocalPixels}=await import('/output-system.js');
    const c=document.createElement('canvas');c.width=600;c.height=600;
    const x=c.getContext('2d');const g=x.createLinearGradient(0,0,600,600);
    g.addColorStop(0,'#234931');g.addColorStop(.5,'#be9980');g.addColorStop(1,'#293d5b');
    x.fillStyle=g;x.fillRect(0,0,600,600);
    for(let j=0;j<90;j++){x.fillStyle='rgba(224,241,151,0.14)';x.beginPath();x.ellipse((j*117)%600,(j*139)%600,9+(j%5)*4,12+(j%7)*3,0,0,Math.PI*2);x.fill();}
    x.fillStyle='#d1d2c4';x.fillRect(380,150,122,310);
    x.fillStyle='#3d5349';x.fillRect(382,145,118,27);
    x.font='bold 24px Arial';x.fillStyle='white';x.fillText('24 HOUR CLAIM',45,220);
    const original=c.toDataURL('image/png');
    x.fillStyle='#f30';x.fillRect(0,0,600,600); // intentionally destroys product+background
    x.fillStyle='#dde2d3';x.fillRect(48,183,205,70);
    x.font='18px Arial';x.fillStyle='#12372a';x.fillText('600 mL',52,222);
    const candidate=c.toDataURL('image/png');
    const plan={coverage:'complete',protected_regions:[{x:.61,y:.23,width:.26,height:.56}],
      edits:[{before:'24 HOUR CLAIM',replacement:'600 mL',background:'complex',box:{x:.06,y:.29,width:.41,height:.15}}]};
    const result=await compositePlannedRegions(original,candidate,plan);
    const proof=await verifyLocalPixels(original,result.image,result.pixel_proof.rectangles);
    const [a,b]=await Promise.all([original,result.image].map(async img=>{
      const i=new Image();i.src=img;await i.decode();const canvas=document.createElement('canvas');canvas.width=600;canvas.height=600;const cx=canvas.getContext('2d');cx.drawImage(i,0,0);return cx.getImageData(0,0,600,600).data;
    }));
    let bottleDiff=0,borderDiff=0;
    for(let y=150;y<460;y++)for(let xx=380;xx<502;xx++){
      const k=(y*600+xx)*4;if(a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2])bottleDiff++;
    }
    for(let y=0;y<600;y++)for(let xx=0;xx<600;xx++){
      const k=(y*600+xx)*4;if((y===0||xx===0||y===599||xx===599)&&(a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2]))borderDiff++;
    }
    let rejected=false;
    try{await compositePlannedRegions(original,candidate,{...plan,edits:[{...plan.edits[0],box:{x:.63,y:.3,width:.19,height:.12}}]});}catch{rejected=true;}
    return {proof,bottleDiff,borderDiff,rejected,method:result.method};
  });
  assert.equal(complex.proof.outside_changed_pixels,0);
  assert.ok(complex.proof.inside_changed_pixels>0);
  assert.equal(complex.bottleDiff,0);
  assert.equal(complex.borderDiff,0);
  assert.equal(complex.rejected,true);
  assert.equal(complex.method,'feathered_text_regions_source_locked');
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
  // End-to-end: no localized box in the first audit. The actual Studio
  // requests a bounded Spark localization, then a Muse candidate, and
  // automatically re-audits. A deliberately destroyed full-frame candidate
  // must not replace source pixels around the text.
  const fresh=await browser.newContext({viewport:{width:1200,height:900}});
  const complexPage=await fresh.newPage();
  let locCalls=0,editCalls=0,complexAudits=0;
  const allText=['DINGIN HINGGA 24 JAM','ARUNA','600 mL'];
  const complexPlan={coverage:'complete',protected_regions:[{x:.62,y:.2,width:.3,height:.58}],
    edits:[{before:'DINGIN HINGGA 24 JAM',replacement:'',background:'complex',box:{x:.07,y:.30,width:.44,height:.16}}]};
  const firstAudit={score:30,headline:'MOCK initial',summary:'TEST ONLY',checks:{claim:30,clarity:70,hierarchy:70,action:70},
    issues:[{category:'Claim',severity:'high',title:'Unsupported temperature duration',evidence:'DINGIN HINGGA 24 JAM',suggestion:'Remove duration'}],
    claim_ledger:[{origin:'creative',claim:'DINGIN HINGGA 24 JAM',assessment:'unsupported_by_supplied_facts',recommended_action:'Remove duration'}],
    text_inventory:inventory(allText),local_text_repair:null};
  const subsequent={...firstAudit,score:80,headline:'MOCK localized re-audit',issues:[],claim_ledger:[],
    text_inventory:inventory(['ARUNA','600 mL']),
    consistency:{original_text:inventory(allText),revised_text:inventory(['ARUNA','600 mL']),
      changed_text:[],new_claims:[],visual:{}}};
  await complexPage.route('**/api/health',r=>r.fulfill({json:{ok:true,configured:true,demoGate:false}}));
  await complexPage.route('**/api/localize',r=>{locCalls++;return r.fulfill({json:{plan:complexPlan,model:'MOCK Spark localization',tokens:0,requires_manual_region:false}});});
  await complexPage.route('**/api/audit',r=>{complexAudits++;const comparison=!!r.request().postDataJSON().referenceImage;
    return r.fulfill({json:{audit:comparison?subsequent:firstAudit,model:'MOCK Spark audit',original_reference_sent:comparison,report_language:'id'}});});
  let damagedCandidate='';
  await complexPage.route('**/api/improve',r=>{editCalls++;return r.fulfill({json:{image:damagedCandidate,model:'MOCK damaged Muse output',repair_metadata:{method:'mock_full_frame_distortion'}}});});
  await complexPage.goto('http://127.0.0.1:3000/app');
  const sources=await complexPage.evaluate(()=>{
    const c=document.createElement('canvas');c.width=500;c.height=500;const x=c.getContext('2d');
    const grad=x.createLinearGradient(0,0,500,500);grad.addColorStop(0,'#123927');grad.addColorStop(.5,'#82977d');grad.addColorStop(1,'#284a3d');
    x.fillStyle=grad;x.fillRect(0,0,500,500);
    for(let i=0;i<100;i++){x.fillStyle='rgba(226,255,215,.1)';x.beginPath();x.arc((i*109)%500,(i*79)%500,8+(i%13),0,Math.PI*2);x.fill();}
    x.fillStyle='#dedfd3';x.fillRect(330,120,110,300);
    x.fillStyle='#24382a';x.fillRect(332,104,106,25);
    x.fillStyle='white';x.font='bold 18px Arial';x.fillText('DINGIN HINGGA 24 JAM',45,192);
    const original=c.toDataURL('image/png');
    x.fillStyle='#ff2712';x.fillRect(0,0,500,500);
    const damaged=c.toDataURL('image/png');
    return {original,damaged};
  });
  damagedCandidate=sources.damaged;
  await complexPage.locator('#fileInput').setInputFiles({name:'complex-ad.png',mimeType:'image/png',buffer:Buffer.from(sources.original.split(',')[1],'base64')});
  await complexPage.locator('#product').fill('ARUNA');
  await complexPage.locator('#facts').fill('ARUNA is a stainless steel bottle with 600 mL capacity and screw cap.');
  await complexPage.locator('#auditButton').click();
  await complexPage.waitForFunction(()=>document.querySelector('#refineButton')&&!document.querySelector('#refineButton').disabled);
  await complexPage.locator('#refineButton').click();
  await complexPage.waitForFunction(()=>document.querySelector('#repairJourney')?.dataset.phase==='passed');
  const restored=await complexPage.evaluate(async()=>{
    const {verifyLocalPixels}=await import('/output-system.js');
    const a=document.querySelector('#compareBefore').src,b=document.querySelector('#compareAfter').src;
    const proof=await verifyLocalPixels(a,b,[{x:35,y:150,width:220,height:80}]);
    const decoded=async url=>{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,c.width,c.height).data;};
    const [x,y]=await Promise.all([decoded(a),decoded(b)]);let protectedDiff=0;
    for(let py=120;py<420;py++)for(let px=330;px<440;px++){
      const i=(py*500+px)*4;if(x[i]!==y[i]||x[i+1]!==y[i+1]||x[i+2]!==y[i+2])protectedDiff++;
    }
    return {proof,protectedDiff};
  });
  assert.equal(locCalls,1);assert.equal(editCalls,1);assert.equal(complexAudits,2);
  assert.equal(restored.proof.outside_changed_pixels,0);
  assert.ok(restored.proof.inside_changed_pixels>0);
  assert.equal(restored.protectedDiff,0);
  await fs.writeFile(path.join(outDir,'complex-source-pixel-lock-proof.json'),JSON.stringify({evidence_type:'real_chromium_pixels_with_mock_meta_reports',locCalls,editCalls,complexAudits,...restored},null,2));
  await fresh.close();

  assert.deepEqual(errors,[]);
  const caption=await page.locator('#suggestedCaption').textContent();
  await fs.writeFile(path.join(outDir,'caption.txt'),caption);
  await fs.writeFile(path.join(outDir,'results.json'),JSON.stringify({evidence_type:'real_chromium_pixels_with_mock_meta_reports',live_meta_calls:0,audits,imageCalls,caption,finalCaptionSent,...checks},null,2));
  console.log(JSON.stringify({status:'PASS',live_meta_calls:0,audits,imageCalls,proof:checks.proof,ratios:checks.transitions.map(x=>({from:x.from,to:x.to,actual:x.metadata.actual})),output:outDir}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
