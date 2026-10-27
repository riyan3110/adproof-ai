import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHandler, schema} from '../server.mjs';

const IMAGE='data:image/png;base64,'+'A'.repeat(128);
const body={image:IMAGE,product:'Desk Lamp',facts:'Wood frame, 50 cm tall, 5W.',caption:'Wood frame desk lamp'};
const baseAudit={
  score:70,headline:'Audit estimate',summary:'Compare claims with supplied details',
  recommended_caption:'Wood frame lamp',
  issues:[],strengths:[],checks:{claim:70,clarity:70,hierarchy:70,action:70},
  claim_ledger:[]
};
function entry(overrides={}){
  return {
    claim:'Wood frame', origin:'caption',
    assessment:'supported_by_supplied_facts', fact_quote:'Wood frame',
    reason:'The supplied text includes this material', recommended_action:'Keep this supported wording',
    ...overrides
  };
}
async function runAudit(mockAudit,facts=body.facts) {
  let called=0;let prompt;
  const server=http.createServer(createHandler({
    key:'mock-only-key',demoCode:'private-code',
    fetcher:async(url,options)=>{
      called++;
      assert.match(url,/chat\/completions$/);
      prompt=JSON.parse(options.body);
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(mockAudit)}}]}),{status:200});
    }
  }));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const response=await fetch(`http://127.0.0.1:${server.address().port}/api/audit`,{
      method:'POST',
      headers:{'content-type':'application/json','x-demo-code':'private-code'},
      body:JSON.stringify({...body,facts})
    });
    return {status:response.status,data:await response.json(),called,prompt};
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
}

test('Meta structured output explicitly requires per-claim evidence ledger',()=>{
  const ledger=schema.properties.claim_ledger;
  assert.equal(ledger.type,'array');
  assert.equal(ledger.items.additionalProperties,false);
  assert.ok(schema.required.includes('claim_ledger'));
  assert.ok(ledger.items.required.includes('fact_quote'));
});

test('seller-supplied quote is returned with clearly named evidence basis',async()=>{
  const {status,data,called,prompt}=await runAudit({...baseAudit,claim_ledger:[entry()]});
  assert.equal(status,200);
  assert.equal(called,1);
  assert.equal(data.audit.claim_ledger.length,1);
  assert.equal(data.audit.claim_ledger[0].assessment,'supported_by_supplied_facts');
  assert.equal(data.audit.claim_ledger[0].fact_quote,'Wood frame');
  assert.equal(data.audit.evidence_summary.supported_by_supplied_facts,1);
  assert.equal(data.audit.evidence_summary.basis,'seller_supplied_facts_not_independently_verified');
  assert.ok(prompt.messages[1].content.some(x=>x.type==='image_url'),'must use actual multimodal image');
  assert.ok(prompt.messages[1].content[0].text.includes('seller-provided facts themselves are NOT independently verified'));
});

test('fabricated quote cannot be presented as supporting proof',async()=>{
  const {data}=await runAudit({...baseAudit,claim_ledger:[entry({fact_quote:'Gold-plated certified 2026'})]});
  assert.equal(data.audit.claim_ledger[0].assessment,'needs_human_review');
  assert.equal(data.audit.claim_ledger[0].fact_quote,'');
  assert.equal(data.audit.evidence_summary.supported_by_supplied_facts,0);
  assert.equal(data.audit.evidence_summary.needs_human_review,1);
});

test('unverified claims are not mislabeled as lies and unreadable claims stay uncertain',async()=>{
  const audit={...baseAudit,claim_ledger:[
    entry({claim:'Best lamp on Earth',assessment:'unsupported_by_supplied_facts',fact_quote:''}),
    entry({claim:'Tiny text',assessment:'unreadable',fact_quote:''})
  ]};
  const {data}=await runAudit(audit);
  assert.deepEqual(data.audit.claim_ledger.map(x=>x.assessment),['unsupported_by_supplied_facts','unreadable']);
  assert.equal(data.audit.evidence_summary.unsupported_by_supplied_facts,1);
  assert.equal(data.audit.evidence_summary.unreadable,1);
});

test('missing ledger in legacy mocks becomes empty rather than fabricated findings',async()=>{
  const legacy={...baseAudit};delete legacy.claim_ledger;
  const {data}=await runAudit(legacy);
  assert.deepEqual(data.audit.claim_ledger,[]);
  assert.equal(data.audit.evidence_summary.total,0);
});

test('ledger is bounded and strips bogus field types without propagating scores',async()=>{
  const ten=Array.from({length:10},(_,i)=>entry({claim:'Claim '+i,origin:'bad',assessment:'admin_verified',reason:'x'}));
  const {data}=await runAudit({...baseAudit,claim_ledger:ten});
  assert.equal(data.audit.claim_ledger.length,8);
  assert.equal(data.audit.claim_ledger[0].origin,'creative');
  assert.equal(data.audit.claim_ledger[0].assessment,'needs_human_review');
  assert.equal(data.audit.score,70);
});
