import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewRepairCandidate} from '../public/repair-guard.js';

const claim=(text,origin='creative',assessment='unsupported_by_supplied_facts')=>({claim:text,origin,assessment});
const initial={
 score:35,
 claim_ledger:[claim('Save up to 90% Electricity'),claim('Protect Your Eyes'),claim('LumaDesk Mini','creative','supported_by_supplied_facts')],
 issues:[{title:'Unverified 90 percent energy reduction',category:'Claim',severity:'high'}],
 checks:{claim:20,clarity:90,hierarchy:87,action:70}
};
const revised={
 score:58,
 claim_ledger:[claim('5W Power Consumption','creative','supported_by_supplied_facts'),claim('USB-C Powered'),claim('protect your eyes','caption')],
 issues:[],
 checks:{claim:75,clarity:90,hierarchy:90,action:75}
};

test('real owner lamp example: 35 → 58 points is NOT repair approval when USB-C is invented',()=>{
 const result=reviewRepairCandidate(initial,revised,{originalReferenceSent:true});
 assert.equal(result.status,'regression_suspected');
 assert.equal(result.auto_approved,false);
 assert.match(result.reasons.join(' '),/USB-C Powered/);
 assert.equal(result.original_reference_sent,true);
 assert.ok(!result.reasons.some(x=>/90% electricity/i.test(x)),'caption carryover is not an invented new image defect');
});

test('new high-severity distorted product even with improved total score triggers hold',()=>{
 const result=reviewRepairCandidate(initial,{...revised,claim_ledger:[],issues:[{category:'Visual',severity:'high',title:'Product base appears warped'}]},{originalReferenceSent:true});
 assert.equal(result.status,'regression_suspected');
 assert.match(result.reasons.join(' '),/base appears warped/);
 assert.equal(result.auto_approved,false);
});

test('higher aggregate score but worse layout or readability is not approved',()=>{
 const result=reviewRepairCandidate(initial,{...revised,claim_ledger:[],checks:{...revised.checks,clarity:78,hierarchy:75}},{originalReferenceSent:true});
 assert.equal(result.status,'regression_suspected');
 assert.match(result.reasons.join(' '),/keterbacaan/);
 assert.match(result.reasons.join(' '),/tata letak/);
});

test('a clean model re-audit remains a candidate, NOT automatically verified safe',()=>{
 const result=reviewRepairCandidate(initial,{...revised,claim_ledger:[],issues:[]},{originalReferenceSent:true});
 assert.equal(result.status,'review_required');
 assert.equal(result.auto_approved,false);
 assert.match(result.reasons.join(' '),/belum ada bukti cukup/i);
});

test('missing original comparison or incomplete reports fail closed to review',()=>{
 let result=reviewRepairCandidate(initial,{...revised,claim_ledger:[],issues:[]},{originalReferenceSent:false});
 assert.equal(result.status,'review_required');
 assert.match(result.reasons.join(' '),/tidak disertakan/);
 assert.equal(result.original_reference_sent,false);
 result=reviewRepairCandidate(initial,null,{originalReferenceSent:true});
 assert.equal(result.status,'review_required');
 assert.match(result.reasons[0],/belum lengkap/);
});

test('only unsupported creative details create new-image claim risk; ambiguous model observations remain tentative',()=>{
 const result=reviewRepairCandidate(initial,{...revised,claim_ledger:[
  claim('protect your eyes','caption'),
  claim('USB 5V','creative','supported_by_supplied_facts'),
  claim('unknown connector','creative','needs_human_review')
 ]},{originalReferenceSent:true});
 assert.equal(result.status,'review_required');
 assert.equal(result.auto_approved,false);
 assert.ok(!result.reasons.some(x=>/USB-C/.test(x)));
});

test('malformed or missing model metrics and issue lists never throw or authorize release',()=>{
 const result=reviewRepairCandidate({claim_ledger:[null]}, {score:99,claim_ledger:[null],issues:[null],checks:{}});
 assert.ok(['review_required','regression_suspected'].includes(result.status));
 assert.equal(result.auto_approved,false);
});
