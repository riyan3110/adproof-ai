// Development-only browser regression. All AI responses are fixtures, never live Meta proof.
// Requires Playwright installed outside the zero-dependency production runtime.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const base=process.env.ADPROOF_TEST_URL||'http://127.0.0.1:3000';
const claim=(text,status,quote='',action='Review this wording')=>({claim:text,origin:'creative',assessment:status,fact_quote:quote,reason:'TEST FIXTURE: compare supplied facts',recommended_action:action});
const initial={score:50,headline:'TEST FIXTURE initial',summary:'Browser regression fixture',recommended_caption:'Wood frame, 5 watts.',issues:[{title:'Unproven benefit',category:'Claim',severity:'high',evidence:'TEST fixture observation',suggestion:'Remove guarantee'}],checks:{claim:40,clarity:60,hierarchy:60,action:50},claim_ledger:[claim('Wood frame','supported_by_supplied_facts','Wood frame'),claim('Guaranteed better sleep','unsupported_by_supplied_facts'),claim('Warm desk light for reading','needs_human_review')]};
const after={...initial,headline:'TEST FIXTURE re-audit',claim_ledger:[claim('Wood frame','supported_by_supplied_facts','Wood frame'),claim('Warm desk light for reading indoors','needs_human_review'),claim('5 watts','supported_by_supplied_facts','5 watts')]};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
 const errors=[];const expectedGateRejections=[];const summary=[];
 try{
 for(const width of [1920,1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'){if(m.text().includes('401 (Unauthorized)')&&m.location().url.endsWith('/api/audit'))expectedGateRejections.push(m.text());else errors.push(m.text());}});
  let audits=0,edits=0,png,requests=[];
  await page.route('**/api/health',r=>r.fulfill({json:{configured:true,demoGate:true}}));
  await page.route('**/api/audit',async r=>{
   if(r.request().headers()['x-demo-code']!=='browser-test-only')return r.fulfill({status:401,json:{error:'Test requires code'}});
   const body=r.request().postDataJSON();requests.push(body);audits++;
   await r.fulfill({json:{audit:audits===1?initial:after,model:'TEST MOCK Spark',tokens:0}});
  });
  await page.route('**/api/improve',async r=>{assert.equal(r.request().headers()['x-demo-code'],'browser-test-only');assert.equal(r.request().postDataJSON().claims.length,3);edits++;await r.fulfill({json:{image:png,model:'TEST MOCK Image'}});});
  await page.goto(base+'/app');await page.locator('#connectionText').filter({hasText:'META CONFIGURED'}).waitFor();
  assert.equal(await page.locator('#proofWorkspace').isVisible(),true);
  assert.equal(await page.locator('#constellationEmpty').isVisible(),true);
  assert.equal(await page.locator('#evolutionEmpty').isVisible(),true);
  assert.equal(await page.locator('#constellationResults').isVisible(),false);
  assert.equal(await page.locator('#evolutionResults').isVisible(),false);
  assert.equal(await page.locator('.deck-module').count(),3);
  assert.equal(await page.locator('#deckProofState').textContent(),'Awaiting observed claims');
  const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(await overflow(),false,`empty overflow ${width}`);
  png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=400;const x=c.getContext('2d');x.fillStyle='#1d2733';x.fillRect(0,0,600,400);x.fillStyle='#cbf68b';x.font='28px sans-serif';x.fillText('TEST FIXTURE · NOT META OUTPUT',25,80);x.fillStyle='white';x.fillText('Wood frame / Guaranteed better sleep',25,150);return c.toDataURL('image/png')});
  await page.locator('#fileInput').setInputFiles({name:'browser-test-fixture.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});
  await page.locator('#product').fill('TEST lamp');await page.locator('#facts').fill('Wood frame, 5 watts.');
  await page.locator('#auditButton').click();await page.locator('#judgeAccessDialog').waitFor({state:'visible'});await page.locator('#judgeAccessCode').fill('browser-test-only');await page.locator('#judgeAccessForm button[type=submit]').click();
  await page.locator('#proofWorkspace').waitFor({state:'visible'});assert.equal(audits,1);
  assert.equal(await page.locator('.dna-row').count(),3);assert.ok(await page.locator('.proof-edge').count()>0);
  await page.locator('#claimEvidenceList button').nth(1).click();assert.match(await page.locator('#xrayClaim').textContent(),/Guaranteed/);
  await page.locator('.proof-node').first().focus();await page.keyboard.press('Enter');
  await page.locator('#refineButton').click();await page.locator('#compareView').waitFor({state:'visible'});assert.equal(edits,1);
  let chooser=false;page.on('filechooser',()=>{chooser=true});await page.locator('#compareRange').focus();await page.keyboard.press('ArrowRight');assert.equal(chooser,false);
  await page.locator('#verifyButton').click();await page.locator('#auditPhase').filter({hasText:'RE-CHECK COMPLETE'}).waitFor();
  assert.equal(audits,2);assert.equal(requests[0].facts,requests[1].facts);assert.equal(requests[0].caption,requests[1].caption);
  assert.match(await page.locator('#evolutionList').textContent(),/Not re-detected/);assert.match(await page.locator('#evolutionList').textContent(),/Possible wording change/);assert.match(await page.locator('#evolutionList').textContent(),/Newly detected/);
  await page.locator('.dna-row summary').first().click();await page.locator('.dna-row[open] button').first().click();assert.equal(await page.locator('#proofStage').inputValue(),'initial');
  if(await overflow()){console.log('OVERFLOW',width,await page.evaluate(()=>[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,id:e.id,cls:typeof e.className==='string'?e.className:'svg',right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.right>innerWidth+1).slice(0,30)));if(process.env.ADPROOF_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.ADPROOF_SCREENSHOT_DIR}/overflow-${width}.png`,fullPage:true});}
  assert.equal(await overflow(),false,`result overflow ${width}`);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#downloadReport').click()]);const report=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(report.claim_evolution.entries.length,4);assert.ok(report.proof_constellation.initial.edges.length);assert.equal(JSON.stringify(report).includes('browser-test-only'),false);
  if(process.env.ADPROOF_SCREENSHOT_DIR){await fs.mkdir(process.env.ADPROOF_SCREENSHOT_DIR,{recursive:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${process.env.ADPROOF_SCREENSHOT_DIR}/studio-${width}.png`,fullPage:true});}
  await page.locator('#facts').fill('Changed wood frame facts');assert.equal(await page.locator('#proofWorkspace').isVisible(),true);
  assert.equal(await page.locator('#constellationEmpty').isVisible(),true);
  assert.equal(await page.locator('#evolutionEmpty').isVisible(),true);
  assert.equal(await page.locator('#constellationResults').isVisible(),false);
  assert.equal(await page.locator('#evolutionResults').isVisible(),false);
  assert.equal(await page.locator('#reportContent').isVisible(),false);assert.equal(await page.locator('#viewRevised').isDisabled(),true);
  await page.evaluate(async()=>{const {renderProofStudio}=await import('/proof-studio.js');renderProofStudio({before:{claim_ledger:[]},after:null,facts:''})});assert.match(await page.locator('#proofNodeTitle').textContent(),/No claim/);assert.equal(await page.locator('.proof-node').count(),0);
  await page.evaluate(async()=>{const {renderProofStudio}=await import('/proof-studio.js');renderProofStudio({before:{claim_ledger:[{claim:'<img src=x onerror=alert(1)>',origin:'creative',assessment:'needs_human_review'}]},after:{},facts:''})});assert.equal(await page.locator('#proofWorkspace img').count(),0);assert.match(await page.locator('#evolutionNote').textContent(),/Incomplete/);
  summary.push({width,audits,edits,overflow:false,export:true,input_invalidation:true});await context.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({test:'MOCKED browser flow, not live Meta',summary,consoleErrors:errors,expectedGateRejections:expectedGateRejections.length},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
