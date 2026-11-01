import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectFormatCandidate} from '../public/visual-consistency.js';

const report=JSON.parse(readFileSync(new URL('../evidence/live-2026-11-01/nori/styled.json',import.meta.url)));
const source=report.runs.find(r=>r.stage==='initial').provenance;
const audit=report.runs.find(r=>r.stage==='reaudit').provenance;
const measured=()=>({...report.visual_consistency.verification.measurements,
 original:{width:1600,height:1600},revised:{width:2048,height:1152},aspect_delta:.4375,
 requested_format:{width:1600,height:900},independent_review:{reference_sent:true,provider:audit.provider,
 stage:audit.stage,source_response_id:source.response_id,response_id:audit.response_id,input_sha256:audit.input_sha256}});
const check=(after=report.verified,m=measured())=>inspectFormatCandidate(report.original,after,report.visual_consistency.repair.settings,report.context.facts,m);

test('format comparison measures target aspect without pretending original layout/pixels are unchanged',()=>{
 const result=check();
 assert.equal(result.status,'validated',JSON.stringify(result.risks));
 assert.equal(result.validation_basis,'independent_meta_comparison');
 assert.equal(result.auto_approved,false);
 assert.equal(result.measurements.source_aspect_delta,.4375);
 assert.equal(result.measurements.aspect_delta,0);
 assert.equal(result.measurements.aspect_comparison,'requested_format');
 assert.equal(result.original_locks.composition,true);
});
test('new aspect does not waive wrong target geometry, missing evidence, copy or product defects',()=>{
 let m=measured();m.revised={width:1000,height:1000};assert.notEqual(check(report.verified,m).status,'validated');
 m=measured();delete m.independent_review;assert.notEqual(check(report.verified,m).status,'validated');
 m=measured();m.requested_format=null;assert.notEqual(check(report.verified,m).status,'validated');
 for(const mutate of [
  x=>x.consistency.visual.product_shape.status='changed',
  x=>x.consistency.revised_text.coverage='partial',
  x=>x.consistency.revised_text.lines.push('Cold for 24 hours'),
  x=>x.issues.push({category:'Readability',severity:'high',title:'Unreadable small copy',evidence:'Text too small'})
 ]){const after=structuredClone(report.verified);mutate(after);assert.notEqual(check(after).status,'validated');}
});
