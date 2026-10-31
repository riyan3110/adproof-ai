import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectConsistency} from '../public/visual-consistency.js';
import {describeRepairNotice} from '../public/repair-notice.js';

const report=JSON.parse(readFileSync(new URL('../evidence/live-2026-11-01/nori/styled.json',import.meta.url)));
const original=report.original,revised=report.verified,settings=report.visual_consistency.repair.settings;
const source=report.runs.find(r=>r.stage==='initial').provenance;
const verification=report.runs.find(r=>r.stage==='reaudit').provenance;
const measured=()=>({...report.visual_consistency.verification.measurements,independent_review:{
 reference_sent:true,provider:verification.provider,stage:verification.stage,source_response_id:source.response_id,
 response_id:verification.response_id,input_sha256:verification.input_sha256}});
const check=(after=revised,measurements=measured())=>inspectConsistency(original,after,settings,measurements,report.context.facts);

test('actual complete Nori comparison can reach output without pretending to preserve source pixels',()=>{
 const result=check();
 assert.equal(result.status,'validated',JSON.stringify(result.risks));
 assert.equal(result.validation_basis,'independent_meta_comparison');
 assert.equal(result.auto_approved,false,'AI comparison is not exact pixel approval');
 for(const lock of Object.values(result.locks))if(lock.locked)assert.equal(lock.status,'preserved_by_model');
 const notice=describeRepairNotice(report.repair_review,result,'id');
 assert.match(notice.text,/siap diekspor/);assert.match(notice.text,/bukan jaminan piksel identik/);
 assert.doesNotMatch(notice.text,/Area di luar koreksi tetap terjaga/);
});

test('a score or model preserved statement without an independent reference/receipt cannot enable generative export',()=>{
 const noProof={...measured()};delete noProof.independent_review;
 assert.equal(check({...revised,score:100},noProof).status,'review_required');
 for(const changes of [
  {reference_sent:false},{provider:'other provider'},{stage:'audit'},
  {source_response_id:null},{response_id:source.response_id},{response_id:null},{input_sha256:'unbound'}
 ]){
  const m=measured();Object.assign(m.independent_review,changes);
  assert.equal(check(revised,m).status,'review_required',JSON.stringify(changes));
 }
});

test('independent receipts do not waive changed locks, partial text, visual defects, new claims or wrong aspect',()=>{
 const copy=()=>structuredClone(revised);
 let after=copy();after.consistency.visual.product_shape.status='changed';
 assert.equal(check(after).status,'failed');
 after=copy();after.consistency.revised_text.coverage='partial';
 assert.notEqual(check(after).status,'validated');
 after=copy();after.issues.push({category:'Readability',severity:'high',evidence:'Unreadable label'});
 assert.notEqual(check(after).status,'validated');
 after=copy();after.consistency.new_claims.push({text:'24 hour insulation',assessment:'unsupported',evidence:'No duration fact'});
 assert.equal(check(after).status,'failed');
 const m=measured();m.aspect_delta=.2;
 assert.equal(check(revised,m).status,'failed');
});

test('exact source-pixel validation remains a different basis from independent AI checking',()=>{
 const m=measured();m.local_repair={verified:true,outside_changed_pixels:0,inside_changed_pixels:50};
 m.mean_color_delta=0;m.luminance_delta=0;m.border_delta=0;
 const result=check(revised,m);
 assert.equal(result.status,'validated');assert.equal(result.validation_basis,'source_pixel_comparison');
 assert.equal(result.auto_approved,true);
});
