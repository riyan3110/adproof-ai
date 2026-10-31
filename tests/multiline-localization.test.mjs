import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {observedTextGroup,normalizeLocalPlan,inventoryDelta} from '../public/factual-repair.js';
import {inspectConsistency} from '../public/visual-consistency.js';
import {createHandler} from '../server.mjs';

const report=JSON.parse(readFileSync(new URL('../evidence/live-2026-11-01/lumadesk/initial.json',import.meta.url)));
const audit=report.original;
const names=['Save up to 90% Electricity','Protect Your Eyes','Better Sleep in 7 Days'];
const plan={coverage:'complete',protected_regions:[{x:.49,y:.19,width:.49,height:.65}],
 edits:names.map((before,index)=>({before,replacement:'',background:'complex',
  box:{x:.18,y:.34+index*.115,width:.29,height:.09}}))};

test('actual live LumaDesk inventory can localize all three multiline assertions without losing source binding',()=>{
 assert.equal(audit.text_inventory.coverage,'complete');
 for(const text of names){
  assert.equal(audit.text_inventory.lines.includes(text),false,'live OCR split this assertion');
  assert.equal(observedTextGroup(text,audit.text_inventory.lines),true);
 }
 const normalized=normalizeLocalPlan(plan,audit,report.context.facts);
 assert.equal(normalized.edits.length,3);
 assert.deepEqual(normalized.edits.map(e=>e.before),names);
});

test('multiline matching preserves whole source words, order, amounts and negation',()=>{
 const lines=['No verified','90% electricity savings','Protect','Your Eyes','Better Sleep','in 7 Days'];
 assert.equal(observedTextGroup('No verified 90% electricity savings',lines),true);
 assert.equal(observedTextGroup('90% electricity savings',lines),true);
 // A complete distinct OCR line is allowed, but a substring of that line is not.
 assert.equal(observedTextGroup('90% electricity',lines),false);
 assert.equal(observedTextGroup('Protect Your Eyes',lines),true);
 for(const text of ['Protect Eyes','Your Eyes Protect','Protect Better Sleep','Better Sleep in 8 Days','verified 90% electricity savings']){
  assert.equal(observedTextGroup(text,lines),false,text);
 }
});

test('correctly grouped text still cannot cross product rectangles, invent replacements or omit a factual target',()=>{
 assert.equal(normalizeLocalPlan({...plan,edits:plan.edits.slice(0,2)},audit,report.context.facts),null);
 assert.equal(normalizeLocalPlan({...plan,edits:[{...plan.edits[0],box:plan.protected_regions[0]},...plan.edits.slice(1)]},audit,report.context.facts),null);
 assert.equal(normalizeLocalPlan({...plan,edits:[{...plan.edits[0],replacement:'Energy-efficient LED'},...plan.edits.slice(1)]},audit,report.context.facts),null);
});

test('Verify recognizes removal of complete multiline erroneous claims instead of rejecting their individual source lines',()=>{
 const discarded=new Set(['Save up to','90% Electricity','Protect','Your Eyes','Better Sleep','in 7 Days']);
 const text={...audit.text_inventory,lines:audit.text_inventory.lines.filter(line=>!discarded.has(line))};
 const revised={issues:[],claim_ledger:[],text_inventory:text,consistency:{
  original_text:audit.text_inventory,revised_text:text,new_claims:[],changed_text:[],visual:{}}};
 const proof={local_repair:{verified:true,outside_changed_pixels:0,inside_changed_pixels:300}};
 const checked=inspectConsistency(audit,revised,{},proof,report.context.facts);
 assert.equal(checked.status,'validated',JSON.stringify(checked.risks));
 const withoutBrand={...text,lines:text.lines.filter(line=>line!=='LumaDesk Mini')};
 const bad=inspectConsistency(audit,{...revised,text_inventory:withoutBrand,consistency:{...revised.consistency,revised_text:withoutBrand}},{},proof,report.context.facts);
 assert.equal(bad.status,'failed');
 assert.ok(bad.risks.some(r=>r.code==='removed_text_review'&&r.evidence.includes('LumaDesk Mini')));
});

test('line wrapping alone is not new copy; changing a number, order or negation remains a real content change',()=>{
 assert.deepEqual(inventoryDelta(['Nori Bottle','Capacity: 500 mL'],['Nori','Bottle','Capacity:','500 mL']).added,[]);
 assert.deepEqual(inventoryDelta(['Nori','Bottle','Capacity:','500 mL'],['Nori Bottle','Capacity: 500 mL']).removed,[]);
 for(const [before,after] of [
  [['Capacity: 500 mL'],['Capacity:','350 mL']],
  [['Not safe for hot liquids'],['safe for hot liquids']],
  [['Nori Bottle'],['Bottle Nori']]
 ]){
  const change=inventoryDelta(before,after);assert.ok(change.added.length);assert.ok(change.removed.length);
 }
});

test('a supported new fact can wrap across visual lines without hiding extra unsupported copy',()=>{
 const original={text_inventory:{coverage:'complete',lines:['Lamp']},claim_ledger:[]};
 const text={coverage:'complete',lines:['Lamp','Power consumption:','5 watts']};
 const revised={text_inventory:text,claim_ledger:[],issues:[],consistency:{
  original_text:original.text_inventory,revised_text:text,visual:{},
  new_claims:[{text:'Power consumption: 5 watts',assessment:'supported',fact_quote:'Power consumption: 5 watts'}]}};
 const proof={local_repair:{verified:true,outside_changed_pixels:0,inside_changed_pixels:100}};
 assert.equal(inspectConsistency(original,revised,{},proof,report.context.facts).status,'validated');
 const extra={...text,lines:[...text.lines,'90% savings']};
 const unsafe=inspectConsistency(original,{...revised,text_inventory:extra,consistency:{...revised.consistency,revised_text:extra}},{},proof,report.context.facts);
 assert.equal(unsafe.status,'failed');
 assert.ok(unsafe.risks.some(r=>r.code==='unverified_added_text'&&r.evidence==='90% savings'));
});

test('localize endpoint accepts the whole-line plan from Spark in one call and retains genuine provenance shape',async()=>{
 let sent,calls=0,status,response;
 const handler=createHandler({key:'MOCK-META-MULTILINE-TEST',requireDemoGate:false,fetcher:async(url,options)=>{
  calls++;sent=JSON.parse(options.body);
  return Response.json({model:'mock-muse-spark',id:'test-response',choices:[{message:{content:JSON.stringify({local_text_repair:plan})}}]});
 }});
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFUlEQVR4nGO8c+c6AzbAhFV00EoAAAHFAp9IYj1VAAAAAElFTkSuQmCC';
 await handler({method:'POST',url:'/api/localize',headers:{},socket:{remoteAddress:'multiline-test'},body:{...report.context,image,audit}},
  {setHeader(){},writeHead(s){status=s;},end(s){response=JSON.parse(s);}});
 assert.equal(status,200);
 assert.equal(calls,1);
 assert.equal(response.plan.edits.length,3);
 assert.equal(response.requires_manual_region,false);
 assert.match(sent.messages[1].content[0].text,/WHOLE CONSECUTIVE/);
 assert.equal(response.provenance.returned_model,'mock-muse-spark');
});
