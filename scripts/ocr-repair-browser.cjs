// Actual OCR and Chromium raster pixels; no Meta inference in this regression.
const {chromium}=require('playwright');const fs=require('node:fs/promises');const assert=require('node:assert/strict');
(async()=>{
 const {recognizeSource,refineOcrPlan}=await import('../ocr-localization.mjs');
 const report=JSON.parse(await fs.readFile('evidence/live-2026-11-01/lumadesk/initial.json','utf8'));
 const source='data:image/webp;base64,'+(await fs.readFile('tests/fixtures/lumadesk-photo.webp')).toString('base64');
 const targets=['Save up to 90% Electricity','Protect Your Eyes','Better Sleep in 7 Days'];
 const replacements=['Power consumption: 5 watts','Light color: Warm white (3000K)','Power source: USB 5V'];
 const guessed={coverage:'complete',protected_regions:[{x:.508,y:.214,width:.407,height:.626}],edits:targets.map((before,i)=>({before,replacement:replacements[i],background:'complex',box:{x:.18,y:.337+i*.107,width:.27,height:.07}}))};
 const plan=refineOcrPlan(guessed,await recognizeSource(source),1254,1254);assert.ok(plan);plan.coordinates_basis='source_ocr';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:3000/app');
  const out=await page.evaluate(async({source,plan})=>{const m=await import('/output-system.js');const repair=await m.repairTextLocally(source,plan);const frame=await m.prepareFormatReference(source,{width:1240,height:1754});return {repair,frame:{...frame,image:undefined},sourceSize:await m.dimensions(source)};},{source,plan});
  assert.ok(out.repair);assert.equal(out.repair.pixel_proof.outside_changed_pixels,0);assert.ok(out.repair.pixel_proof.inside_changed_pixels>1000);
  assert.equal(out.frame.dimensions.width,1254);assert.equal(out.frame.dimensions.height,1774);assert.ok(out.frame.source_rect.y>0);
  await fs.mkdir('qa-artifacts/ocr',{recursive:true});await fs.writeFile('qa-artifacts/ocr/lumadesk-repaired.png',Buffer.from(out.repair.image.split(',')[1],'base64'));
  await fs.writeFile('qa-artifacts/ocr/pixel-proof.json',JSON.stringify({...out.repair,image:undefined},null,2));
  const after=await recognizeSource(out.repair.image);for(const phrase of ['90%','Your Eyes','7 Days'])assert.ok(!after.text.includes(phrase),'old claim removed: '+phrase);
  for(const phrase of ['5 watts','Warm white','3000K','USB 5V'])assert.ok(after.text.includes(phrase),'readable exact fact: '+phrase);
  console.log(JSON.stringify({ocr:'actual local engine',meta_calls:0,old_claims_removed:targets,source_pixels:out.repair.pixel_proof,framed_reference:out.frame}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
