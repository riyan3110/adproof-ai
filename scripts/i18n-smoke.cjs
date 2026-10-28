// Multilingual Proofroom integration: all model responses in this test are MOCK.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const base=process.env.ADPROOF_TEST_URL||'http://127.0.0.1:3000';
const widths=(process.env.ADPROOF_TEST_WIDTHS||'1920,1440,1280,768,390,320').split(',').map(Number);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XtyfFAAAAABJRU5ErkJggg==','base64');
const claim={claim:'Save 90% electricity',origin:'creative',assessment:'unsupported_by_supplied_facts',
 reason:'Claim needs proof',fact_quote:'',recommended_action:'Remove unsupported claim'};
const audit=language=>({score:57,headline:language==='id'?'Audit dalam Bahasa Indonesia':'Audit in English',
 summary:language==='id'?'Klaim perlu ditinjau.':'Claim needs review.',
 recommended_caption:'LumaDesk Mini — 5W LED desk lamp.',checks:{claim:40,clarity:80,hierarchy:83,action:76},
 issues:[{title:language==='id'?'Klaim tidak didukung':'Unsupported claim',category:'Claim',
 severity:'medium',evidence:'Save 90% electricity',suggestion:language==='id'?'Hapus klaim.':'Remove claim.'}],
 strengths:[],claim_ledger:[claim]});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const summary=[];
 try{
  for(const width of widths){
   for(const [browserLocale,expected] of [['id-ID','id'],['en-US','en']]){
    const context=await browser.newContext({viewport:{width,height:920},locale:browserLocale,acceptDownloads:true,reducedMotion:'reduce'});
    const page=await context.newPage();const errors=[];page.on('pageerror',err=>errors.push(err.message));
    let calls=0,lastLanguage='';
    await page.route('**/api/health',r=>r.fulfill({json:{ok:true,configured:true,demoGate:false}}));
    await page.route('**/api/audit',r=>{
     const payload=r.request().postDataJSON();
     lastLanguage=payload.language;calls++;
     return r.fulfill({json:{audit:audit(lastLanguage),model:'TEST MOCK Spark',tokens:15,report_language:lastLanguage}});
    });
    await page.route('**/api/improve',r=>{throw Error('Repair must not run on locale changes');});
    await page.goto(base+'/app');
    await page.locator('#languageSelect').waitFor();
    assert.equal(await page.locator('#languageSelect').inputValue(),'auto');
    assert.equal(await page.evaluate(()=>document.documentElement.lang),expected);
    assert.match(await page.locator('label[for="product"]').textContent(),expected==='id'?/Nama produk/:/Product name/);
    assert.match(await page.locator('#browseButton').textContent(),expected==='id'?/Pilih gambar/:/Choose creative/);
    // Manual overrides take effect without touching model or uploaded pixels.
    const other=expected==='id'?'en':'id';
    await page.locator('#languageSelect').selectOption(other);
    assert.equal(await page.evaluate(()=>document.documentElement.lang),other);
    assert.match(await page.locator('label[for="product"]').textContent(),other==='id'?/Nama produk/:/Product name/);
    assert.equal(calls,0);
    await page.locator('#languageSelect').selectOption('auto');
    assert.equal(await page.evaluate(()=>document.documentElement.lang),expected);
    // Upload a valid fixture and verify the request carries the chosen locale.
    await page.locator('#fileInput').setInputFiles({name:'lamp.png',mimeType:'image/png',buffer:png});
    await page.locator('#product').fill('LumaDesk Mini');
    await page.locator('#facts').fill('Power: 5W, USB 5V. Indoor desk use.');
    await page.locator('#caption').fill('Save 90% electricity!');
    await page.locator('#auditButton').click();
    await page.locator('#auditPhase').filter({hasText:expected==='id'?'AUDIT SELESAI':'AUDIT COMPLETE'}).waitFor();
    assert.equal(calls,1);
    assert.equal(lastLanguage,expected);
    assert.equal(await page.locator('#scoreHeadline').textContent(),audit(expected).headline);
    // Changing UI locale never alters model evidence or reruns Meta.
    await page.locator('#languageSelect').selectOption(other);
    assert.equal(await page.locator('#scoreHeadline').textContent(),audit(expected).headline);
    assert.equal(await page.locator('#claimEvidenceList .claim-evidence-claim').first().textContent(),claim.claim);
    assert.equal(calls,1);
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#downloadReport').click()]);
    const saved=JSON.parse(await fs.readFile(await download.path(),'utf8'));
    assert.equal(saved.report_language,expected);
    assert.equal(saved.original.headline,audit(expected).headline);
    // A historical report remains exactly as originally audited, in its original language.
    await page.reload();
    const archived={...saved,report_language:'id',original:{...saved.original,headline:'Visual akurat, caption mengandung klaim tak didukung'},verified:null};
    await page.locator('#importReportInput').setInputFiles({
     name:'saved-report.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archived))
    });
    await page.locator('#archiveLanguageNote').waitFor({state:'visible'});
    assert.equal(await page.locator('#scoreHeadline').textContent(),'Visual akurat, caption mengandung klaim tak didukung');
    assert.equal(calls,1,'archive import must not call Meta');
    await page.locator('#languageSelect').selectOption('en');
    assert.match(await page.locator('#archiveLanguageNote').textContent(),/Saved report language: Bahasa Indonesia/);
    assert.equal(await page.locator('#scoreHeadline').textContent(),'Visual akurat, caption mengandung klaim tak didukung');
    assert.equal(calls,1,'changing UI locale must not call Meta');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    assert.equal(overflow,false,'horizontal overflow '+width+' '+browserLocale);
    assert.deepEqual(errors,[]);
    summary.push({width,browserLocale,auto:expected,manual_switch:true,meta_requests:1,model_report_language:lastLanguage,historic_unchanged:true,overflow:false});
    await context.close();
   }
  }
  console.log(JSON.stringify({test:'Auto multilingual UI + Meta language + saved reports · MOCK ONLY',summary},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
