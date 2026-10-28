// Browser-only integration tests. All model responses are MOCK fixtures.
// Exercises export → refresh → import without any real Meta API calls.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const base=process.env.ADPROOF_TEST_URL||'http://127.0.0.1:3000';
const widths=process.env.ADPROOF_TEST_WIDTHS?process.env.ADPROOF_TEST_WIDTHS.split(',').map(Number):[1920,1440,1280,768,390,320];
const claim=(text,origin='creative',assessment='unsupported_by_supplied_facts')=>({
 claim:text,origin,assessment,reason:'MOCK ONLY',fact_quote:'',
 recommended_action:'MOCK ONLY: inspect creative'
});
const initial={
 score:35,headline:'MOCK initial inspection',summary:'Initial claims remain',
 recommended_caption:'A desk lamp, 5 watts.',
 issues:[{title:'Unverified image claim',category:'Claim',severity:'high',evidence:'Text on image',suggestion:'Remove unsupported statement'}],
 strengths:['Readable image'],checks:{claim:20,clarity:85,hierarchy:82,action:70},
 claim_ledger:[claim('Save up to 90% Electricity'),claim('LumaDesk Mini','creative','supported_by_supplied_facts')]
};
const verified={
 score:58,headline:'MOCK re-audit',summary:'New USB-C unsupported',
 recommended_caption:'A desk lamp, 5 watts.',
 issues:[{title:'Unsupported USB-C',category:'Consistency',severity:'medium',evidence:'USB-C Power',suggestion:'Remove unsupported detail'}],
 strengths:['Good contrast'],checks:{claim:55,clarity:91,hierarchy:87,action:80},
 claim_ledger:[claim('USB-C Powered'),claim('Save up to 90% electricity','caption')]
};
const fixtureImg='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XtyfFAAAAABJRU5ErkJggg==';
const repaired='data:image/png;base64,'+fixtureImg;
const browserOpts={headless:true,args:['--no-sandbox']};
(async()=>{
 const browser=await chromium.launch(browserOpts);
 const summary=[];
 try {
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:960},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let audits=0,images=0;
  await page.route('**/api/health',r=>r.fulfill({json:{ok:true,configured:true,demoGate:false}}));
  await page.route('**/api/audit',async r=>{
   audits++;
   await r.fulfill({json:{audit:audits===1?initial:verified,model:'TEST MOCK Spark',tokens:0,original_reference_sent:audits>1}});
  });
  await page.route('**/api/improve',async r=>{images++;await r.fulfill({json:{image:repaired,model:'TEST MOCK Image'}});});
  await page.goto(base+'/app');
  await page.locator('#connectionText').filter({hasText:'META CONFIGURED'}).waitFor();
  const source=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=720;c.height=490;
    const x=c.getContext('2d');x.fillStyle='#293d32';x.fillRect(0,0,720,490);
    x.fillStyle='#fff';x.font='32px sans-serif';x.fillText('MOCK ARCHIVE SOURCE',45,80);
    return c.toDataURL('image/png');
  });
  await page.locator('#fileInput').setInputFiles({
   name:'mock-source.png',mimeType:'image/png',buffer:Buffer.from(source.split(',')[1],'base64')
  });
  await page.locator('#product').fill('TEST LumaDesk Mini');
  await page.locator('#facts').fill('5 watts, 3000K, USB 5V, ABS plastic');
  await page.locator('#caption').fill('Save up to 90% electricity');
  await page.locator('#auditButton').click();
  await page.locator('#auditPhase').filter({hasText:'AUDIT COMPLETE'}).waitFor();
  await page.locator('#refineButton').click();
  await page.locator('#compareView').waitFor({state:'visible'});
  await page.locator('#verifyButton').click();
  await page.locator('#auditPhase').filter({hasText:'RE-CHECK COMPLETE'}).waitFor();
  assert.equal(audits,2);assert.equal(images,1);
  const originalCanvas=await page.locator('#compareBefore').getAttribute('src');
  assert.ok(originalCanvas.startsWith('data:image/jpeg;base64,'),'uploaded canvas is JPEG');
  assert.equal(await page.locator('#compareAfter').getAttribute('src'),repaired);
  const [zipped]=await Promise.all([page.waitForEvent('download'),page.locator('#downloadPackage').click()]);
  assert.equal(zipped.suggestedFilename(),'adproof-audit-package.zip');
  const zip=await fs.readFile(await zipped.path());
  assert.ok(zip.length>200);
  assert.ok(zip.includes(Buffer.from('audit.json')));
  assert.ok(zip.includes(Buffer.from('original.jpg')));
  assert.ok(zip.includes(Buffer.from('revised.png')));
  const [single]=await Promise.all([page.waitForEvent('download'),page.locator('#downloadImage').click()]);
  assert.equal(single.suggestedFilename(),'adproof-revised.png');
  assert.equal((await fs.readFile(await single.path())).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  // ZIP: new tab/page load restores source, revised image and both real model observations locally.
  await page.reload();
  await page.locator('#connectionText').filter({hasText:'META CONFIGURED'}).waitFor();
  await page.locator('#importReportInput').setInputFiles({name:'saved-audit.zip',mimeType:'application/zip',buffer:zip});
  await page.locator('#archiveRestoreNotice').waitFor({state:'visible'});
  assert.match(await page.locator('#archiveRestoreNotice').textContent(),/READ ONLY/);
  assert.match(await page.locator('#archiveRestoreNotice').textContent(),/No Meta AI call was made/);
  assert.equal(await page.locator('#scoreValue').textContent(),'58');
  assert.equal(await page.locator('#auditButton').isDisabled(),true);
  assert.equal(await page.locator('#refineButton').isDisabled(),true);
  assert.equal(await page.locator('#verifyButton').isDisabled(),true);
  assert.equal(await page.locator('#downloadPackage').isDisabled(),false);
  assert.equal(await page.locator('#compareBefore').getAttribute('src'),originalCanvas);
  assert.equal(await page.locator('#compareAfter').getAttribute('src'),repaired);
  assert.equal(await page.locator('#product').getAttribute('readonly'),'');
  await page.locator('#deckDNA').click();
  assert.ok(await page.locator('.dna-row').count()>0);
  await page.locator('#deckProof').click();
  assert.ok(await page.locator('.proof-node').count()>0);
  assert.equal(audits,2,'import should not send a fresh audit');
  assert.equal(images,1,'import should not regenerate image');
  if(process.env.ADPROOF_SCREENSHOT_DIR){
   await fs.mkdir(process.env.ADPROOF_SCREENSHOT_DIR,{recursive:true});
   await page.screenshot({path:process.env.ADPROOF_SCREENSHOT_DIR+'/archive-zip-'+width+'.png'});
  }
  // Export JSON and import WITHOUT images (older format behavior).
  const [jsonFile]=await Promise.all([page.waitForEvent('download'),page.locator('#downloadReport').click()]);
  const json=await fs.readFile(await jsonFile.path());
  assert.ok(JSON.parse(json).original.score===35);
  await page.reload();
  await page.locator('#importReportInput').setInputFiles({name:'legacy-audit.json',mimeType:'application/json',buffer:json});
  await page.locator('#archiveRestoreNotice').waitFor({state:'visible'});
  assert.match(await page.locator('#archiveRestoreNotice').textContent(),/contains NO original\/revised pixels/);
  assert.equal(await page.locator('#scoreValue').textContent(),'58');
  assert.equal(await page.locator('#downloadPackage').isDisabled(),true);
  assert.equal(await page.locator('#compareView').isVisible(),false);
  await page.locator('#deckDNA').click();
  assert.ok(await page.locator('.dna-row').count()>0);
  await page.locator('#deckDetect').click();
  assert.equal(await page.locator('#xrayImage').getAttribute('src'),null);
  assert.equal(audits,2);assert.equal(images,1);
  const malformed=Buffer.from(zip);malformed[90]^=1;
  await page.locator('#importReportInput').setInputFiles({name:'tampered.zip',mimeType:'application/zip',buffer:malformed});
  await page.locator('#toast').filter({hasText:'Impor tidak berhasil'}).waitFor();
  assert.equal(await page.locator('#scoreValue').textContent(),'58','failed import cannot corrupt active report');
  assert.equal(audits,2);assert.equal(images,1);
  // The next fresh image deliberately exits the archive without carrying stale claims.
  await page.locator('#fileInput').setInputFiles({name:'next-creative.png',mimeType:'image/png',buffer:Buffer.from(source.split(',')[1],'base64')});
  await page.locator('#archiveRestoreNotice').waitFor({state:'hidden'});
  assert.equal(await page.locator('#product').getAttribute('readonly'),null);
  assert.equal(await page.locator('#auditButton').isDisabled(),false);
  assert.equal(await page.locator('#reportContent').isVisible(),false);
  assert.equal(await page.locator('.dna-row').count(),0);
  assert.equal(audits,2);assert.equal(images,1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.deepEqual(errors,[]);
  summary.push({width,json:true,zip:true,pixels_restored:true,legacy_json:true,cost_free_import:true,corruption_rejected:true,no_horizontal_overflow:true});
  await context.close();
 }
 console.log(JSON.stringify({test:'ZIP/JSON local imports · MOCKED Meta only',summary},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
