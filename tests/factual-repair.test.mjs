import test from 'node:test';
import assert from 'node:assert/strict';
import {repairCaption,normalizeLocalPlan} from '../public/factual-repair.js';
import {inspectConsistency} from '../public/visual-consistency.js';
import {createAuditPackage,readAuditPackage} from '../public/audit-archive.js';
import {readFileSync} from 'node:fs';
const facts='Product: LumaDesk Mini\nPower consumption: 5 watts\nLight color: Warm white (3000K)\nPower source: USB 5V\nNo verified evidence for health benefits or energy savings.\nWarranty: Not specified';
test('caption removes original savings/health claims and rejects model paraphrase or negation slicing',()=>{
 const result=repairCaption({product:'LumaDesk Mini',facts,original:'Saves 90%, protects eyes and improves sleep.',selections:['Energy-efficient 5W','health benefits','Power consumption: 5 watts','Light color: Warm white (3000K)']});
 assert.equal(result.final,'LumaDesk Mini. Power consumption: 5 watts. Light color: Warm white (3000K)');
 assert.equal(result.original,'Saves 90%, protects eyes and improves sleep.');
 assert.equal(result.verification.status,'passed');
 assert.ok(result.statements.every(x=>facts.split('\n').includes(x.text)&&x.text===x.fact_quote));
});
test('caption fallback keeps full context, decimals, negation and units without additional inference',()=>{
 const r=repairCaption({product:'Bottle',facts:'Capacity: 0.5 L\nNot safe for hot liquids: use cold water only\nWarranty: Not specified',selections:['safe for hot liquids']});
 assert.match(r.final,/Capacity: 0\.5 L/);assert.match(r.final,/Not safe for hot liquids: use cold water only/);assert.doesNotMatch(r.final,/Not specified/);
 assert.equal(r.method,'verbatim_fact_fallback');
 const bounded=repairCaption({product:'Bottle',facts:Array.from({length:10},(_,i)=>'Fact '+i+': '+ 'a'.repeat(300)).join('\n')});assert.ok(bounded.final.length<=900);
});
const box={x:.05,y:.8,width:.4,height:.1},product={x:.4,y:.25,width:.2,height:.45};
const audit={text_inventory:{coverage:'complete',lines:['LumaDesk Mini','90% savings']},issues:[{category:'Claim',evidence:'90% savings',suggestion:'Remove'}],claim_ledger:[{origin:'creative',claim:'90% savings',assessment:'unsupported_by_supplied_facts'}]};
const plan={coverage:'complete',protected_regions:[product],edits:[{before:'90% savings',replacement:'Power consumption: 5 watts',background:'solid',box}]};
test('local plan needs source text, complete factual coverage, disjoint product and genuine supplied replacement',()=>{
 assert.ok(normalizeLocalPlan(plan,audit,facts));
 assert.ok(normalizeLocalPlan({...plan,edits:[{...plan.edits[0],background:'complex'}]},audit,facts));
 for(const edit of [{...plan.edits[0],replacement:'Efficient 5W'},{...plan.edits[0],box:product},{...plan.edits[0],before:'unknown text'},{...plan.edits[0],background:'unknown'}])assert.equal(normalizeLocalPlan({...plan,edits:[edit]},audit,facts),null);
 assert.equal(normalizeLocalPlan({...plan,protected_regions:[]},audit,facts),null);
 assert.equal(normalizeLocalPlan(plan,{...audit,issues:[...audit.issues,{category:'Visual',evidence:'Broken product arm'}]},facts),null);
});
test('complete independent audit plus measured local source preservation allows validation; partial proof fails closed',()=>{
 const inventory={coverage:'complete',lines:['LumaDesk Mini'],limitations:''};
 const initial={text_inventory:inventory,claim_ledger:[]};
 const revised={text_inventory:inventory,claim_ledger:[],issues:[]};
 const local={verified:true,outside_changed_pixels:0,inside_changed_pixels:45};
 const ok=inspectConsistency(initial,revised,{}, {local_repair:local},facts);assert.equal(ok.status,'validated');assert.equal(ok.auto_approved,true);
 assert.ok(Object.values(ok.locks).every(x=>x.status==='preserved'));
 assert.notEqual(inspectConsistency(initial,revised,{},null,facts).status,'validated');
 assert.notEqual(inspectConsistency(initial,{...revised,text_inventory:{...inventory,coverage:'partial'}},{},{local_repair:local},facts).status,'validated');
 const retained={...revised,claim_ledger:[{origin:'creative',claim:'Cures headaches',assessment:'unsupported_by_supplied_facts'}]};
 assert.equal(inspectConsistency(initial,retained,{},{local_repair:local},facts).status,'failed');
});
test('ZIP includes corrected caption + original, preserves budget flag and never restores external approval',async()=>{
 const report=JSON.parse(readFileSync(new URL('../evidence/live-2026-10-31/case-a/audit.json',import.meta.url)));
 report.caption_repair=repairCaption({product:report.context.product,facts:report.context.facts,original:report.context.caption});
 report.auto_correction={attempted:true,status:'still_failed'};
 const bytes=readFileSync(new URL('../evidence/live-2026-10-31/case-a/original.png',import.meta.url));
 const url='data:image/png;base64,'+bytes.toString('base64');
 const p=createAuditPackage({...report,verified:null},url,null);
 assert.ok(p.filenames.includes('caption.txt'));assert.ok(p.filenames.includes('original-caption.txt'));
 const imported=readAuditPackage(new Uint8Array(await p.blob.arrayBuffer()));
 assert.equal(imported.report.caption_repair.final,report.caption_repair.final);
 assert.equal(imported.report.caption_repair.original,report.context.caption);
 assert.equal(imported.report.auto_correction.attempted,true);
 assert.notEqual(imported.report.visual_consistency?.verification?.status,'validated');
});
