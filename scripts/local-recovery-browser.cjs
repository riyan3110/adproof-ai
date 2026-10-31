// Browser regression: interruption after a paid-looking Audit/Repair response must
// recover the already received result WITHOUT repeating any provider request.
// ALL API responses are TEST FIXTURES; this does not call Meta or Baseten.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:3000/app';
const initial={
  score:42,headline:'TEST unsupported ad claim',summary:'TEST FIXTURE',
  recommended_caption:'A desk light, 5 watts.',
  strengths:['Recognizable product'],
  issues:[{title:'Unsupported savings',category:'Claim',severity:'high',evidence:'90% savings in creative',suggestion:'Remove unsupported claim'}],
  checks:{claim:20,clarity:84,hierarchy:90,action:88},
  claim_ledger:[
    {claim:'LumaDesk Mini',origin:'creative',assessment:'supported_by_supplied_facts',fact_quote:'LumaDesk Mini',reason:'test',recommended_action:'Retain'},
    {claim:'Save 90% energy',origin:'creative',assessment:'unsupported_by_supplied_facts',fact_quote:'',reason:'TEST fixture',recommended_action:'Remove unsupported claim'}
  ]
};
const revisedAudit={
  ...initial,score:83,headline:'TEST verified',issues:[],
  claim_ledger:initial.claim_ledger.slice(0,1)
};
const getSaved=async page=>page.evaluate(()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open('adproof-studio-recovery-v1');
  req.onsuccess=()=>{
    const db=req.result,tx=db.transaction('snapshot','readonly');
    const read=tx.objectStore('snapshot').get('latest');
    read.onsuccess=()=>{db.close();resolve(read.result||null)};
    read.onerror=()=>{db.close();reject(read.error)};
  };
  req.onerror=()=>reject(req.error);
}));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:920},acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let audits=0,repairs=0;
  await page.route('**/api/health',r=>r.fulfill({json:{ok:true,configured:true,demoGate:false}}));
  await page.route('**/api/audit',r=>{
   audits++;
   return r.fulfill({json:{audit:audits===1?initial:revisedAudit,model:'MOCK SPARK',tokens:0,original_reference_sent:audits>1,report_language:'en'}});
  });
  let repaired;
  await page.route('**/api/improve',r=>{
   repairs++;
   return r.fulfill({json:{image:repaired,model:'MOCK IMAGE',repair_metadata:{model_dimensions:{width:900,height:600}}}});
  });
  await page.goto(base);
  await page.waitForFunction(()=>document.querySelector('#connectionText')?.textContent==='META CONFIGURED');
  // Only this code is saved as a session-secret; it must never appear in recovery.
  await page.evaluate(()=>sessionStorage.setItem('adproof-demo-code','SECRET-DO-NOT-SAVE'));
  const [original,revised]=await page.evaluate(()=>{
   const make=color=>{const c=document.createElement('canvas');c.width=900;c.height=600;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,c.width,c.height);x.fillStyle='white';x.font='36px sans-serif';x.fillText('TEST CREATIVE',40,120);return c.toDataURL('image/png')};
   return [make('#204b31'),make('#245c39')];
  });
  repaired=revised;
  await page.locator('#fileInput').setInputFiles({name:'test-recovery.png',mimeType:'image/png',buffer:Buffer.from(original.split(',')[1],'base64')});
  await page.locator('#product').fill('LumaDesk Mini');
  await page.locator('#facts').fill('LumaDesk Mini is a 5 watts desk light.');
  await page.locator('#auditButton').click();
  await page.locator('#auditPhase').filter({hasText:'AUDIT COMPLETE'}).waitFor();
  await page.waitForFunction(async()=>{
    const req=indexedDB.open('adproof-studio-recovery-v1');
    return await new Promise(resolve=>{
     req.onsuccess=()=>{
      const db=req.result,tx=db.transaction('snapshot');
      const read=tx.objectStore('snapshot').get('latest');
      read.onsuccess=()=>{db.close();resolve(!!read.result?.snapshot?.report?.original)};
      read.onerror=()=>{db.close();resolve(false)};
     };
     req.onerror=()=>resolve(false);
    });
  });
  let saved=await getSaved(page);
  assert.equal(saved.snapshot.report.original.score,42);
  assert.equal(saved.snapshot.revised,null);
  assert.equal(JSON.stringify(saved).includes('SECRET-DO-NOT-SAVE'),false,'private access code leaked into backup');
  assert.equal(audits,1);
  await page.locator('#refineButton').click();
  await page.locator('#compareView').waitFor({state:'visible'});
  await page.waitForFunction(async()=>{
    const req=indexedDB.open('adproof-studio-recovery-v1');
    return await new Promise(resolve=>{
      req.onsuccess=()=>{
       const db=req.result,tx=db.transaction('snapshot');
       const read=tx.objectStore('snapshot').get('latest');
       read.onsuccess=()=>{db.close();resolve(Boolean(read.result?.snapshot?.revised))};
       read.onerror=()=>{db.close();resolve(false)};
      };req.onerror=()=>resolve(false);
    });
  });
  assert.equal(audits,1);
  assert.equal(repairs,1);
  await page.reload();
  await page.locator('#archiveRestoreNotice').filter({hasText:'LOCAL RECOVERY'}).waitFor();
  assert.equal(await page.locator('#compareView').isVisible(),true,'repaired image must survive refresh');
  assert.equal(await page.locator('#verifyButton').isEnabled(),true,'Verify must resume from repaired state');
  assert.equal(await page.locator('#refineButton').isEnabled(),true,'Repair still available only when explicitly clicked');
  assert.equal(audits,1,'refresh must not redo audit');
  assert.equal(repairs,1,'refresh must not redo repair');
  assert.equal(await page.locator('#localRecoveryBar').isVisible(),true);
  assert.equal(await page.locator('#archiveContinueActions').isVisible(),false,'recovered LIVE session must not be read only');
  await page.locator('#verifyButton').click();
  await page.locator('#auditPhase').filter({hasText:'RE-CHECK COMPLETE'}).waitFor();
  await page.waitForFunction(async()=>{
    const r=indexedDB.open('adproof-studio-recovery-v1');
    return await new Promise(resolve=>{
      r.onsuccess=()=>{
       const db=r.result,tx=db.transaction('snapshot');
       const got=tx.objectStore('snapshot').get('latest');
       got.onsuccess=()=>{db.close();resolve(Boolean(got.result?.snapshot?.report?.verified))};
       got.onerror=()=>{db.close();resolve(false)};
      };r.onerror=()=>resolve(false);
    });
  });
  assert.equal(audits,2);
  await page.reload();
  await page.locator('#archiveRestoreNotice').filter({hasText:'LOCAL RECOVERY'}).waitFor();
  assert.equal(await page.locator('#scoreValue').textContent(),'83');
  assert.equal(await page.locator('#verifyButton').isDisabled(),true);
  assert.equal(audits,2,'recovered verified result must not call Meta again');
  assert.equal(repairs,1);
  // User-controlled deletion must stop future automatic restore.
  await page.locator('#clearLocalRecovery').click();
  await page.waitForFunction(async()=>{
   const req=indexedDB.open('adproof-studio-recovery-v1');
   return await new Promise(resolve=>{
     req.onsuccess=()=>{
       const db=req.result,tx=db.transaction('snapshot');
       const got=tx.objectStore('snapshot').get('latest');
       got.onsuccess=()=>{db.close();resolve(!got.result)};
       got.onerror=()=>{db.close();resolve(false)};
     };req.onerror=()=>resolve(false);
   });
  });
  await page.reload();
  assert.equal(await page.locator('#fileName').textContent(),'NO CREATIVE SELECTED');
  assert.equal(await page.locator('#reportEmpty').isVisible(),true);
  assert.equal(audits,2);
  assert.equal(repairs,1);
  assert.deepEqual(errors,[]);
  console.log('PASS: browser-only recovery for audit, repair, verify, reload, clear; private code excluded; no repeated paid requests. MODEL RESPONSES MOCKED.');
 }finally{await browser.close();}
})().catch(e=>{console.error('FAIL: '+e.stack);process.exitCode=1;});
