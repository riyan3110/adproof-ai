import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unverifiedPerformanceText,inspectConsistency,impliedThermalDurationText} from '../public/visual-consistency.js';
import {normalizeLocalPlan} from '../public/factual-repair.js';
import {fitReplacementLines} from '../public/output-system.js';

const inventory=lines=>({lines,coverage:'complete'});
const initial={
 score:35,claim_ledger:[{claim:'DINGIN HINGGA 24 JAM',origin:'creative',assessment:'unsupported_by_supplied_facts'}],
 text_inventory:inventory(['DINGIN HINGGA 24 JAM','Lebih lama','ARUNA','600 mL'])};
const facts='Botol stainless steel 600 mL dengan tutup ulir. Tidak ada data pengujian ketahanan suhu atau bukti dingin 24 jam.';
const after={
 score:99,claim_ledger:[],issues:[],text_inventory:inventory(['Lebih lama','ARUNA','600 mL']),
 consistency:{original_text:initial.text_inventory,revised_text:inventory(['Lebih lama','ARUNA','600 mL']),
 new_claims:[],changed_text:[],visual:{}}};

test('thermally contextual longer claim remains unsupported even if a high score calls it a slogan',()=>{
 const text=unverifiedPerformanceText(['Lebih lama.'],facts,initial);
 assert.deepEqual(text,['Lebih lama.']);
 const review=inspectConsistency(initial,after,{},null,facts);
 assert.equal(review.status,'failed');
 assert.equal(review.auto_approved,false);
 assert.ok(review.risks.some(r=>r.code==='unsupported_performance_copy'&&r.evidence==='Lebih lama'));
});
test('subjective longer slogans without thermal context are not automatically condemned',()=>{
 const general={text_inventory:inventory(['Nikmati harimu']),claim_ledger:[]};
 assert.deepEqual(unverifiedPerformanceText(['Bersama lebih lama'],facts,general),[]);
});
test('verbatim source-backed thermal duration prevents unsupported backstop',()=>{
 const proof='Pengujian produk membuktikan minuman tetap dingin hingga 24 jam.';
 assert.deepEqual(unverifiedPerformanceText(['Lebih lama'],proof,initial),[]);
});
test('duration warnings in seller facts do not count as duration evidence',()=>{
 assert.deepEqual(unverifiedPerformanceText(['Lebih lama'],'Tidak tersedia bukti dingin hingga 24 jam',initial),['Lebih lama']);
});
test('the next repair must localize both the explicit and dependent duration text',()=>{
 assert.deepEqual(impliedThermalDurationText(initial,facts),['Lebih lama']);
 const augmented={...initial,issues:[{category:'Claim',evidence:'DINGIN HINGGA 24 JAM'}],
  claim_ledger:[...initial.claim_ledger,
   {claim:'Lebih lama',origin:'creative',assessment:'unsupported_by_supplied_facts'}]};
 const one={coverage:'complete',protected_regions:[{x:.6,y:.2,width:.3,height:.65}],
  edits:[{before:'DINGIN HINGGA 24 JAM',replacement:'',background:'complex',
   box:{x:.1,y:.4,width:.35,height:.06}}]};
 assert.equal(normalizeLocalPlan(one,augmented,facts),null,'cannot approve removal of only one of two coupled claims');
 const both={...one,edits:[...one.edits,
  {before:'Lebih lama',replacement:'',background:'complex',box:{x:.1,y:.22,width:.35,height:.06}}]};
 assert.equal(normalizeLocalPlan(both,augmented,facts)?.edits.length,2);
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(app,/impliedThermalDurationText\(state.initialAudit/);
 assert.match(app,/needsDependentRegions/);
 assert.match(app,/localizationAudit/);
});
test('bounded word-wrap fits all full words and never clips a long token or creates overlapping lines',()=>{
 const ctx={font:'',measureText(text){const size=Number.parseFloat(this.font.match(/(\d+)px/)?.[1])||12;return {width:text.length*size*.52};}};
 const width=200,height=78,text='STAINLESS STEEL 600 mL TUTUP ULIR';
 const fit=fitReplacementLines(ctx,text,width,height,11);
 assert.ok(fit, 'multiline badge text fits');
 assert.ok(fit.lines.length>=2&&fit.lines.length<=4);
 assert.equal(fit.lines.join(' '),text);
 const pad=Math.max(4,Math.min(12,Math.round(Math.min(width,height)*.1)));
 assert.ok(fit.lines.every(line=>(ctx.font=`600 ${fit.size}px Arial`,ctx.measureText(line).width<=width-2*pad)));
 assert.ok(fit.lines.length*fit.lineHeight<=height-2*pad);
 assert.equal(fitReplacementLines(ctx,'UNBREAKABLE_SUPERLONGWORD_WITH_NO_BREAKS',65,24,11),null);
 assert.equal(fitReplacementLines(ctx,'THIS SENTENCE CAN NEVER FIT A SMALL LABEL',40,10,11),null);
});
test('long Muse calls update a measured progress pulse instead of inventing a progress percent',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(app,/const pulse=progressEndpoint\?setInterval/);
 assert.match(app,/Math\.floor\(\(Date\.now\(\)-started\)\/1000\)/);
 assert.match(app,/clearInterval\(pulse\)/);
 assert.doesNotMatch(app,/percentComplete|estimatedSecondsRemaining/);
});
