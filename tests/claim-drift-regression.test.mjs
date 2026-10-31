import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unverifiedPerformanceText,inspectConsistency,inspectFormatCandidate} from '../public/visual-consistency.js';
import {reviewRepairCandidate,reviewUnchangedCaption} from '../public/repair-guard.js';

const facts = 'Product: LumaDesk Mini\nPower consumption: 5 watts\nLight color: Warm white (3000K)\nPower source: USB 5V\nNo verified evidence of percentage energy savings, eye protection or medical benefit.';
const inventory=(lines=[])=>({coverage:'complete',lines,limitations:''});
const before={score:42,text_inventory:inventory(['LumaDesk Mini','Save up to 90% Electricity']),claim_ledger:[
 {claim:'Save up to 90% Electricity',origin:'creative',assessment:'unsupported_by_supplied_facts'},
 {claim:'Protect Your Eyes',origin:'caption',assessment:'unsupported_by_supplied_facts'},
 {claim:'Guaranteed better sleep in just 7 days',origin:'caption',assessment:'unsupported_by_supplied_facts'}
],checks:{claim:20,clarity:85,hierarchy:90}};
const after=(lines)=>({score:92,text_inventory:inventory(lines),claim_ledger:[
 {claim:'5 Watts Power',origin:'creative',assessment:'supported_by_supplied_facts',fact_quote:'5 watts'}
],issues:[],checks:{claim:94,clarity:88,hierarchy:90}});

test('5W is not evidence for efficient LED consumption; model score increase must not clear unsupported copy',()=>{
 const r=inspectConsistency(before,after(['5 Watts Power','Efficient LED consumption']),{},null,facts);
 assert.equal(r.status,'failed');
 assert.ok(r.risks.some(x=>x.code==='unsupported_performance_copy' && /Efficient/.test(x.evidence)));
 assert.equal(r.auto_approved,false);
});
test('marketing performance claim persists even if it was in both images',()=>{
 const prior={...before,text_inventory:inventory(['Energy Efficient LED'])};
 const r=inspectConsistency(prior,after(['Energy Efficient LED']),{},null,facts);
 assert.equal(r.status,'failed');
});
test('model eight-claim cap cannot erase image performance words surfaced only by inspection.new_claims',()=>{
 const newer=after(['5 Watts']);
 newer.consistency={original_text:inventory(['5 Watts']),revised_text:inventory(['5 Watts']),
  new_claims:[{text:'Efficient LED consumption',assessment:'supported',fact_quote:'5 watts'}]};
 const r=inspectConsistency(before,newer,{},null,facts);
 assert.equal(r.status,'failed');
 assert.ok(r.risks.some(x=>x.code==='unsupported_performance_copy'));
});
test('numeric power, neutral warm white and USB 5V facts do not themselves trigger unsupported performance',()=>{
 assert.deepEqual(unverifiedPerformanceText(['5 Watts Power','Warm White 3000K','USB 5V'],facts),[]);
 assert.equal(inspectConsistency(before,after(['5 Watts Power','Warm White 3000K','USB 5V']),{},null,facts).status,'review_required');
});
test('positive explicit supplier efficiency statement does not count as third-party proof but can avoid unsupported warning',()=>{
 assert.deepEqual(unverifiedPerformanceText(['Energy efficient LED'], 'The lamp is energy efficient; seller-supplied assertion.'),[]);
 assert.deepEqual(unverifiedPerformanceText(['Energy efficient LED'], 'No verified evidence the lamp is energy efficient.'),['Energy efficient LED']);
});
test('format adaptation also blocks invented efficiency, independent of higher AI score',()=>{
 const r=inspectFormatCandidate(before,after(['Efficient LED consumption']),{},facts);
 assert.equal(r.status,'failed');
 assert.ok(r.risks.some(x=>x.code==='unsupported_performance_copy'));
});
test('caption remains unchanged and explicitly unsafe to publish when audit finds unsupported caption claims',()=>{
 const caption='Save up to 90% electricity and protect your eyes. Guaranteed better sleep in 7 days!';
 const s=reviewUnchangedCaption(before,after(['5 Watts Power']),caption);
 assert.equal(s.status,'needs_human_review');
 assert.equal(s.unchanged,true);
 assert.match(s.issues.join(' '),/Protect Your Eyes/);
 assert.match(s.issues.join(' '),/better sleep/i);
 const r=reviewRepairCandidate(before,after(['5 Watts Power']),{originalReferenceSent:true,caption,language:'en'});
 assert.equal(r.caption_review.status,'needs_human_review');
 assert.equal(r.auto_approved,false);
 assert.equal(r.status,'review_required','unchanged external caption is not image pixel regression');
});
test('repair prompt explicitly rejects efficiency claims inferred from wattage',()=>{
 const s=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(s,/5W proves only power consumption/);
 assert.match(s,/Do not paraphrase wattage into efficiency/);
 const client=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(client,/captionSafetyNotice/);
 assert.match(client,/inspectConsistency\(state.initialAudit,out.audit,state.repairMetadata\?\.settings\|\|state.consistency,measurements,state.context\?\.facts\|\|''\)/);
});
