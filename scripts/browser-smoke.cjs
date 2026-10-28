// Browser regression only. All model responses are explicitly labelled fixtures.
// Optional development Playwright; no production dependency or live AI request.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const base=process.env.ADPROOF_TEST_URL||'http://127.0.0.1:3000';
const claim=(text,status,quote='',origin='creative')=>({claim:text,origin,assessment:status,fact_quote:quote,reason:'TEST FIXTURE: compare supplied facts',recommended_action:'Review this wording against product records'});
const initial={score:50,headline:'TEST FIXTURE initial',summary:'Browser regression fixture — not Meta output',recommended_caption:'Wood frame, 5 watts.',issues:[{title:'Unproven benefit',category:'Claim',severity:'high',evidence:'TEST fixture observation',suggestion:'Remove guarantee'}],checks:{claim:40,clarity:60,hierarchy:60,action:50},claim_ledger:[claim('Wood frame','supported_by_supplied_facts','Wood frame'),claim('Guaranteed better sleep','unsupported_by_supplied_facts'),claim('Warm desk light for reading','needs_human_review'),claim('Caption with unsupported promise','needs_human_review','','caption')]};
const after={...initial,headline:'TEST FIXTURE re-audit',claim_ledger:[claim('Wood frame','supported_by_supplied_facts','Wood frame'),claim('Warm desk light for reading indoors','needs_human_review'),claim('5 watts','supported_by_supplied_facts','5 watts'),initial.claim_ledger[3]]};
const widths=process.env.ADPROOF_TEST_WIDTHS?process.env.ADPROOF_TEST_WIDTHS.split(',').map(Number):[1920,1440,1280,768,390,320];
async function screenshot(page,name,fullPage=false){if(process.env.ADPROOF_SCREENSHOT_DIR){await fs.mkdir(process.env.ADPROOF_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:`${process.env.ADPROOF_SCREENSHOT_DIR}/${name}.png`,fullPage});}}
(async()=>{
 const launch={headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']};
 if(process.env.ADPROOF_TEST_PROXY){const p=new URL(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);launch.proxy={server:p.origin,username:decodeURIComponent(p.username),password:decodeURIComponent(p.password)};}
 const browser=await chromium.launch(launch);
 const errors=[],expectedRejections=[],summary=[];let failureChecks=false;
 try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',ignoreHTTPSErrors:process.env.ADPROOF_TEST_PROXY==='1'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'){if((/401 \(Unauthorized\)/.test(m.text())&&m.location().url.endsWith('/api/audit'))||(failureChecks&&/\/api\/(audit|improve)$/.test(m.location().url)))expectedRejections.push(m.text());else errors.push(m.text());}});
  let audits=0,edits=0,png,repaired,requests=[];
  await page.route('**/api/health',r=>r.fulfill({json:{configured:true,demoGate:true}}));
  await page.route('**/api/audit',async r=>{
   if(r.request().headers()['x-demo-code']!=='browser-test-only')return r.fulfill({status:401,json:{error:'Test requires code'}});
   requests.push(r.request().postDataJSON());audits++;
   await r.fulfill({json:{audit:audits===1?initial:after,model:'TEST MOCK Spark',tokens:0}});
  });
  await page.route('**/api/improve',async r=>{assert.equal(r.request().headers()['x-demo-code'],'browser-test-only');assert.equal(r.request().postDataJSON().claims.length,4);edits++;await r.fulfill({json:{image:repaired,model:'TEST MOCK Image'}});});
  if(process.env.ADPROOF_PREVIEW_ACCESS_FILE)await page.goto((await fs.readFile(process.env.ADPROOF_PREVIEW_ACCESS_FILE,'utf8')).trim());
  await page.goto(base+'/app');await page.locator('#connectionText').filter({hasText:'META CONFIGURED'}).waitFor();
  const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(await overflow(),false,`empty overflow ${width}`);
  assert.equal(await page.locator('.deck-module').count(),3);
  for(const id of ['xrayEmpty','constellationEmpty','evolutionEmpty','reportEmpty']){
    assert.equal(await page.locator('#'+id+' .pending-demo-disclaimer').count(),1,'all explanatory empty states must be labelled as non-model visuals');
  }
  assert.equal(await page.locator('.report-wireframe').isVisible(),true);
  await page.locator('#exploreProofButton').click();
  assert.equal(await page.locator('#constellationEmpty').isVisible(),true);
  assert.equal(await page.locator('#deckProof').getAttribute('aria-pressed'),'true');
  for(const [module,panel] of [['deckProof','constellationEmpty'],['deckDNA','evolutionEmpty'],['deckDetect','xrayEmpty']]){await page.locator('#'+module).click();assert.equal(await page.locator('#'+panel).isVisible(),true);assert.equal(await page.locator('#'+module).getAttribute('aria-pressed'),'true');}
  assert.equal(await page.locator('#refineButton').isDisabled(),true);assert.equal(await page.locator('#downloadReport').isDisabled(),true);
  await page.evaluate(()=>scrollTo(0,0));await screenshot(page,`empty-${width}`);
  assert.equal(await page.locator('.studio-nav').evaluate(nav=>[...nav.querySelectorAll('a,button')].filter(e=>e.getBoundingClientRect().height).some(e=>e.getBoundingClientRect().bottom>nav.getBoundingClientRect().bottom+1)),false,'header controls must remain inside header');
  const canvasY=await page.locator('#dropzone').evaluate(e=>e.getBoundingClientRect().y);
  if(width>=1280)assert.ok(canvasY<400,'canvas must be in the first desktop viewport');
  // Every module name must fit; whole names remain readable, including 320px.
  assert.equal(await page.locator('.deck-module strong').evaluateAll(es=>es.some(e=>e.scrollWidth>e.clientWidth+1)),false);
  [png,repaired]=await page.evaluate(()=>[false,true].map(revised=>{const c=document.createElement('canvas');c.width=900;c.height=600;const x=c.getContext('2d');x.fillStyle=revised?'#263d31':'#282336';x.fillRect(0,0,900,600);x.fillStyle='#c7fa8c';x.font='24px sans-serif';x.fillText('BROWSER TEST FIXTURE — NOT META OUTPUT',40,55);x.fillStyle='#f0eee4';x.font='bold 46px sans-serif';x.fillText('Test desk lamp',40,180);x.font='27px sans-serif';x.fillText(revised?'Wood frame · 5 watts':'Guaranteed better sleep',40,250);x.strokeStyle='#9687be';x.lineWidth=6;x.beginPath();x.moveTo(650,400);x.lineTo(650,270);x.lineTo(730,190);x.stroke();x.fillStyle='#b8dd8b';x.beginPath();x.ellipse(740,200,50,25,.5,0,Math.PI*2);x.fill();return c.toDataURL('image/png')}));
  await page.locator('#fileInput').setInputFiles({name:'browser-test-fixture.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});
  await page.locator('#product').fill('TEST lamp');await page.locator('#facts').fill('Wood frame, 5 watts.');await page.locator('#caption').fill('Caption with unsupported promise');
  await page.locator('#auditButton').click();await page.locator('#judgeAccessDialog').waitFor({state:'visible'});await page.locator('#judgeAccessCode').fill('browser-test-only');await page.locator('#judgeAccessForm button[type=submit]').click();
  await page.locator('#auditPhase').filter({hasText:'AUDIT COMPLETE'}).waitFor();assert.equal(audits,1);
  assert.equal(await page.locator('.report-wireframe').isVisible(),false,'illustration must disappear once actual audit results arrive');
  assert.equal(await page.locator('.dna-row').count(),4);
  await page.locator('#claimEvidenceList button').nth(1).click();assert.match(await page.locator('#xrayClaim').textContent(),/Guaranteed/);assert.equal(await page.locator('#xrayClaimSelect').inputValue(),'1');
  // Select caption in X-Ray, then navigate to the same graph claim and back.
  await page.locator('#xrayClaimSelect').selectOption('3');assert.equal(await page.locator('#xrayCaption').textContent(),'Caption with unsupported promise');
  await page.locator('#xrayClaimSelect').selectOption('0');await page.locator('#xrayToGraph').click();
  assert.equal(await page.locator('.proof-selector[aria-pressed=true]').textContent(),'CLAIM · Wood frame');
  assert.ok(await page.locator('.proof-edge').count()>0);
  await page.locator('.proof-node.type-quote').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.proof-node.type-quote').getAttribute('aria-pressed'),'true');
  const selectedDetail=await page.locator('#proofNodeDetail').textContent();
  await page.setViewportSize({width:width-1,height:1000});await page.waitForTimeout(160);await page.setViewportSize({width,height:1000});await page.waitForTimeout(160);
  assert.equal(await page.locator('#proofNodeDetail').textContent(),selectedDetail,'resize preserves selected evidence');
  await page.locator('#proofWorkspace').scrollIntoViewIfNeeded();await screenshot(page,`graph-${width}`);
  await page.locator('#proofToXray').click();assert.equal(await page.locator('#xrayClaim').textContent(),'Wood frame');
  await page.locator('#deckProof').click();await page.locator('.proof-selector').filter({hasText:'FINDING'}).click();assert.equal(await page.locator('#proofToXray').isDisabled(),true);await page.locator('#deckDetect').click();assert.equal(await page.locator('#xrayClaimSelect').inputValue(),'0');
  // Report groups are independent of active inspection mode.
  await page.locator('[data-report-view=findings]').click();await page.locator('.issue-top').click();assert.equal(await page.locator('.issue-details').isVisible(),true);
  await page.locator('[data-report-view=caption]').click();assert.equal(await page.locator('#suggestedCaption').isVisible(),true);await page.locator('[data-report-view=claims]').click();
  if(width<761){assert.match(await page.locator('#stickyAudit').textContent(),/Repair/);await page.locator('#stickyAudit').click();}else await page.locator('#refineButton').click();
  await page.locator('#compareView').waitFor({state:'visible'});assert.equal(edits,1);
  assert.equal(await page.locator('#compareAfter').getAttribute('src'),repaired);
  let chooser=false;page.on('filechooser',()=>{chooser=true});await page.locator('#compareRange').focus();await page.keyboard.press('ArrowRight');assert.equal(chooser,false);
  if(width<761){assert.match(await page.locator('#stickyAudit').textContent(),/Verify/);await page.locator('#stickyAudit').click();}else await page.locator('#verifyButton').click();
  await page.locator('#auditPhase').filter({hasText:'RE-CHECK COMPLETE'}).waitFor();assert.equal(audits,2);assert.equal(requests[0].facts,requests[1].facts);assert.equal(requests[0].caption,requests[1].caption);assert.equal(requests[1].image,repaired);
  await page.locator('#deckDNA').click();assert.match(await page.locator('#evolutionList').textContent(),/Not re-detected/);assert.match(await page.locator('#evolutionList').textContent(),/Possible wording change/);
  await page.locator('.dna-row summary').first().click();await screenshot(page,`dna-${width}`);
  await page.locator('.dna-row[open] button').first().click();assert.equal(await page.locator('#proofStage').inputValue(),'initial');assert.notEqual(await page.locator('#xrayImage').getAttribute('src'),repaired);
  await page.locator('#deckDNA').click();await page.locator('.dna-row[open] button').nth(1).click();assert.equal(await page.locator('#proofStage').inputValue(),'revised');assert.equal(await page.locator('#xrayImage').getAttribute('src'),repaired);
  await screenshot(page,`xray-${width}`);
  for(let i=0;i<4;i++){await page.locator('.proof-modebar [data-proof-view=constellation]').click();await page.locator('.proof-modebar [data-proof-view=xray]').click();}
  assert.equal(await page.locator('#xrayClaim').textContent(),'Wood frame');assert.equal(audits,2);assert.equal(edits,1);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#downloadReport').click()]);const report=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(report.claim_evolution.entries.length,5);assert.ok(report.proof_constellation.initial.edges.length);assert.equal(JSON.stringify(report).includes('browser-test-only'),false);
  assert.equal(await overflow(),false,`result overflow ${width}`);
  const memory=await page.evaluate(()=>({heapBytesApprox:performance.memory?.usedJSHeapSize??null,domElements:document.querySelectorAll('*').length}));assert.ok(memory.domElements<1500);
  await page.locator('#facts').fill('Changed wood frame facts');assert.equal(await page.locator('#xrayEmpty').isVisible(),true);assert.equal(await page.locator('#xrayImage').getAttribute('src'),null);assert.equal(await page.locator('#compareAfter').getAttribute('src'),null);assert.equal(await page.locator('.proof-node').count(),0);assert.equal(await page.locator('.dna-row').count(),0);assert.equal(await page.locator('#reportContent').isVisible(),false);assert.equal(await page.locator('#downloadReport').isDisabled(),true);
  await page.evaluate(async()=>{const {renderProofStudio}=await import('/proof-studio.js');renderProofStudio({before:{claim_ledger:[]},after:null,facts:''})});assert.equal(await page.locator('.proof-node').count(),0);
  await page.evaluate(async()=>{const {renderProofStudio}=await import('/proof-studio.js');renderProofStudio({before:{claim_ledger:[{claim:'<img src=x onerror=alert(1)>',origin:'creative',assessment:'needs_human_review'}]},after:{},facts:''})});assert.equal(await page.locator('#proofWorkspace img[src=x]').count(),0);assert.match(await page.locator('#evolutionNote').textContent(),/Incomplete/);
  if(width===1440){
   failureChecks=true;
   await page.reload();await page.locator('#connectionText').filter({hasText:'META CONFIGURED'}).waitFor();
   await page.locator('#fileInput').setInputFiles({name:'error-test-fixture.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});
   await page.locator('#product').fill('TEST lamp');await page.locator('#facts').fill('Wood frame, 5 watts.');
   // Malformed success must not advance the cycle or enable export.
   await page.route('**/api/audit',r=>r.fulfill({json:{audit:{headline:'Malformed fixture'}}}));
   await page.locator('#auditButton').click();await page.locator('#toast').filter({hasText:'incomplete'}).waitFor();
   assert.equal(await page.locator('#reportContent').isVisible(),false);assert.equal(await page.locator('#downloadReport').isDisabled(),true);
   await page.route('**/api/audit',r=>r.fulfill({json:{audit:initial,model:'TEST MOCK Spark'}}));
   await page.locator('#auditButton').click();await page.locator('#auditPhase').filter({hasText:'AUDIT COMPLETE'}).waitFor();
   await page.route('**/api/improve',r=>r.fulfill({status:502,json:{error:'TEST provider failed'}}));
   await page.locator('#refineButton').click();await page.locator('#toast').filter({hasText:'TEST provider failed'}).waitFor();
   assert.equal(await page.locator('#reportContent').isVisible(),true);assert.equal(await page.locator('#verifyButton').isDisabled(),true);assert.equal(await page.locator('#refineButton').isDisabled(),false);
   await page.route('**/api/improve',r=>r.fulfill({json:{image:repaired,model:'TEST MOCK Image'}}));
   await page.locator('#refineButton').click();await page.locator('#compareView').waitFor({state:'visible'});
   await page.route('**/api/audit',r=>r.fulfill({status:504,json:{error:'TEST upstream timeout'}}));
   await page.locator('#verifyButton').click();await page.locator('#toast').filter({hasText:'TEST upstream timeout'}).waitFor();
   assert.equal(await page.locator('#verifyButton').isDisabled(),false);assert.equal(await page.locator('#compareAfter').getAttribute('src'),repaired);
   assert.equal(await page.locator('#deckDNAState').textContent(),'Repair ready · run re-audit');
   // Exercise the browser's actual AbortController deadline with a stalled response.
   await page.clock.install();await page.route('**/api/audit',()=>{});
   await page.locator('#verifyButton').click();await page.clock.fastForward(81000);
   await page.locator('#toast').filter({hasText:'kedaluwarsa'}).waitFor();assert.equal(await page.locator('#verifyButton').isDisabled(),false);
   failureChecks=false;
  }
  summary.push({width,canvasY,audits,edits,overflow:false,selection_linked:true,export:true,input_invalidation:true,error_recovery:width===1440,...memory});await context.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({test:'MOCKED browser flow, not live Meta',summary,consoleErrors:errors,expectedGateRejections:expectedRejections.length},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
