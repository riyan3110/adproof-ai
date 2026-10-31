import test from 'node:test';
import assert from 'node:assert/strict';
import {planOneCorrection,correctionPayload} from '../public/auto-correction.js';

const baseline={issues:[{category:'Claim',severity:'high',evidence:'Save 90%',suggestion:'Remove unsupported claim'}],
 claim_ledger:[{claim:'Save 90%',origin:'creative',assessment:'unsupported_by_supplied_facts',recommended_action:'Remove'}]};
const revised={claim_ledger:[{claim:'Efficient LED consumption',origin:'creative',assessment:'unsupported_by_supplied_facts'}],issues:[]};
const check={status:'failed',risks:[{code:'unsupported_performance_copy',evidence:'Efficient LED consumption'}]};
test('one bounded corrective image and audit only after grounded failure',()=>{
 const plan=planOneCorrection({initial:baseline,verified:revised,consistencyReview:check});
 assert.equal(plan.allowed,true);
 assert.equal(plan.max_extra_image_requests,1);assert.equal(plan.max_extra_audit_requests,1);
 const data=correctionPayload(baseline,plan);
 assert.equal(data.claims[0].claim,'Save 90%');
 assert.match(data.correctionContext[0].evidence,/Efficient/);
 assert.equal(planOneCorrection({initial:baseline,verified:revised,consistencyReview:check,alreadyAttempted:true}).allowed,false);
});
test('clean or incomplete verification NEVER triggers blind expensive image retry',()=>{
 for(const c of [null,undefined,{status:'review_required',risks:[]},{status:'failed',risks:[]}]){
  const plan=planOneCorrection({initial:baseline,verified:{claim_ledger:[],issues:[]},consistencyReview:c});
  assert.equal(plan.allowed,false);
 }
 const plan=planOneCorrection({initial:baseline,verified:null,consistencyReview:check});
 assert.equal(plan.allowed,false);
});
test('visual issue needs explicit evidence, conservative bounded diagnostics',()=>{
 const plan=planOneCorrection({initial:baseline,verified:{claim_ledger:[],issues:[
  {category:'Visual',severity:'high',evidence:'Product base warped'},
  {category:'Visual',severity:'low',evidence:'Unclear'},
  {category:'Other',severity:'high',evidence:'Ignored'}
 ]},consistencyReview:{status:'failed',risks:[]}});
 assert.equal(plan.allowed,true);assert.equal(plan.diagnostics.length,1);
 assert.equal(plan.diagnostics[0].code,'revised_issue');
});
test('limits untrusted model evidence to five short, de-duplicated diagnostics',()=>{
 const plan=planOneCorrection({initial:baseline,verified:{claim_ledger:[],issues:[]},
 consistencyReview:{status:'failed',risks:Array.from({length:20},(_,i)=>({code:'new_claim',evidence:'Claim '+i+'X'.repeat(700)}))}});
 assert.equal(plan.allowed,true);assert.equal(plan.diagnostics.length,5);
 assert.ok(plan.diagnostics.every(x=>x.evidence.length<=240));
});
test('correction payload refuses ungrounded calls and preserves original audit inputs',()=>{
 assert.throws(()=>correctionPayload(baseline,{allowed:false}),/blocked/);
 const plan=planOneCorrection({initial:baseline,verified:revised,consistencyReview:check});
 const p=correctionPayload(baseline,plan);
 assert.equal(p.issues.length,1);
 assert.equal(p.correctionContext.length,2);
});
