// Real Chromium and actual Studio JS; API responses are labelled test fixtures.
// No real credential, Meta request or model-quality claim is involved.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const artifactDir=path.resolve('qa-artifacts/request-lifecycle');
const report={kind:'real_browser_mock_api_not_live_meta',cases:[]};
const audit={score:80,headline:'TEST FIXTURE',summary:'Synthetic browser regression; not Meta output.',
 checks:{claim:80,clarity:80,hierarchy:80,action:80},issues:[],claim_ledger:[],strengths:[],
 text_inventory:{coverage:'complete',lines:['LumaDesk Mini / 5 W'],limitations:''}};
(async()=>{
 await fs.mkdir(artifactDir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [1920,1440,1280,768,390,320]){
   const context=await browser.newContext({viewport:{width,height:1000},locale:'en-US'});
   await context.addInitScript(()=>{
    const active=new Set(),start=window.setInterval.bind(window),stop=window.clearInterval.bind(window);
    window.__testActiveIntervals=active;
    window.setInterval=(fn,...args)=>{const id=start(fn,...args);active.add(id);return id;};
    window.clearInterval=id=>{active.delete(id);return stop(id);};
   });
   const page=await context.newPage(),errors=[];let accessChecks=0,auditCalls=0,completeAudit;
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/health',r=>r.fulfill({json:{configured:true,demoGate:true}}));
   await page.route('**/api/access',r=>{
    accessChecks++;
    return r.request().headers()['x-demo-code']==='SYNTHETIC-TEST-CODE'
     ?r.fulfill({json:{ok:true,access:'verified',modelConfigured:true,providerTested:false}})
     :r.fulfill({status:403,json:{error:'SYNTHETIC rejection'}});
   });
   await page.route('**/api/audit',async r=>{
    auditCalls++;
    assert.equal(r.request().headers()['x-demo-code'],'SYNTHETIC-TEST-CODE');
    await new Promise(resolve=>completeAudit=resolve);
    await r.fulfill({json:{audit,model:'TEST MOCK Spark',report_language:'en'}});
   });
   await page.route('**/api/improve',()=>{throw Error('Unexpected paid-looking image request');});
   await page.goto('http://127.0.0.1:3000/app');
   await page.locator('#languageSelect').selectOption('en');
   await page.locator('#judgeAccessButton').click();
   await page.locator('#judgeAccessCode').fill('SYNTHETIC-WRONG-CODE');
   await page.locator('#judgeAccessForm button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#judgeAccessStatus').textContent.includes('Code rejected'));
   assert.match(await page.locator('#judgeAccessError').textContent(),/Kode salah|Wrong code|incorrect|rejected/i);
   await page.locator('#judgeAccessCode').fill('SYNTHETIC-TEST-CODE');
   await page.locator('#judgeAccessForm button[type=submit]').click();
   await page.locator('#judgeAccessDialog').waitFor({state:'hidden'});
   assert.match(await page.locator('#judgeAccessStatus').textContent(),/Code verified by server/);
   assert.equal(await page.locator('#judgeAccessCode').inputValue(),'');
   await page.reload();
   await page.waitForFunction(()=>document.querySelector('#judgeAccessStatus').textContent.includes('Code verified by server'));
   assert.equal(accessChecks,3,'wrong, correct, and one restoration check only');
   await page.locator('#fileInput').setInputFiles('tests/fixtures/qa-before.png');
   await page.locator('#product').fill('LumaDesk Mini');
   await page.locator('#facts').fill('LumaDesk Mini. Power consumption: 5 watts.');
   await page.locator('#auditButton').click();
   await page.getByText(/Muse Spark checking image · Elapsed \d+ seconds/).waitFor();
   completeAudit();
   await page.waitForFunction(()=>document.querySelector('#auditButton').disabled&&document.querySelector('#downloadReport').disabled===false);
   await page.locator('#liveRepairProgress').filter({hasText:'Audit completed'}).waitFor();
   const activeIntervals=await page.evaluate(()=>window.__testActiveIntervals.size);
   assert.equal(activeIntervals,0,'no progress timer may survive a completed request');
   assert.equal(auditCalls,1,'no duplicate model request');
   const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    outside:[...document.querySelectorAll('body *')].filter(el=>{
     const b=el.getBoundingClientRect();return b.width&&b.height&&b.right>innerWidth+1;
    }).map(el=>({tag:el.tagName,id:el.id,className:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).slice(0,25)}));
   const overflow=layout.scrollWidth>width+1;
   await page.screenshot({path:path.join(artifactDir,`studio-${width}.png`),fullPage:true});
   report.cases.push({width,accessChecks,auditCalls,activeIntervals,overflow,layout,pageErrors:errors,status:overflow?'failed':'passed'});
   assert.equal(overflow,false,'no horizontal overflow: '+JSON.stringify(layout));
   assert.deepEqual(errors,[]);
   await context.close();
  }
 }finally{
  await browser.close();
  await fs.writeFile(path.join(artifactDir,'results.json'),JSON.stringify(report,null,2));
 }
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
