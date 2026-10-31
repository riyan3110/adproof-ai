import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHandler} from '../server.mjs';
import {isTextOnlyRepair,normalizeLocalPlan} from '../public/factual-repair.js';

const IMAGE='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFUlEQVR4nGO8c+c6AzbAhFV00EoAAAHFAp9IYj1VAAAAAElFTkSuQmCC';
const facts='ARUNA Drinkware is a stainless steel bottle, 600 mL, screw cap.';
const audit={text_inventory:{coverage:'complete',lines:['DINGIN HINGGA 24 JAM','ARUNA','600 mL']},
 issues:[{category:'Claim',severity:'high',title:'Unverified duration',evidence:'DINGIN HINGGA 24 JAM',suggestion:'Remove unsupported duration'}],
 claim_ledger:[{origin:'creative',claim:'DINGIN HINGGA 24 JAM',assessment:'unsupported_by_supplied_facts',recommended_action:'Delete'}]};
const plan={coverage:'complete',
 protected_regions:[{x:.62,y:.18,width:.3,height:.66}],
 edits:[{before:'DINGIN HINGGA 24 JAM',replacement:'',background:'complex',box:{x:.08,y:.32,width:.40,height:.12}}]};
const server=(answer,watch)=>http.createServer(createHandler({
 key:'mock-meta-localizer',requireDemoGate:false,
 fetcher:async(url,options)=>{
  assert.match(url,/chat\/completions/);
  const request=JSON.parse(options.body);watch.push(request);
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({local_text_repair:answer})}}],usage:{total_tokens:42}}),{status:200});
 }
}));
const start=async s=>{await new Promise(r=>s.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+s.address().port};
const body={image:IMAGE,product:'ARUNA Drinkware',facts,caption:'Bawa segarnya setiap hari',audit};

test('Meta Spark text localizer returns only normalized safe rectangles and never edits pixels',async()=>{
 assert.equal(isTextOnlyRepair(audit),true);
 const calls=[],s=server(plan,calls),base=await start(s);
 try{
  const response=await fetch(base+'/api/localize',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal(response.status,200);const d=await response.json();
  assert.equal(d.plan.edits.length,1);assert.equal(d.plan.edits[0].background,'complex');
  assert.equal(d.plan.edits[0].replacement,'');
  assert.equal(d.requires_manual_region,false);
  assert.equal(d.provenance.stage,'localize');
  assert.equal(calls.length,1);
  assert.match(calls[0].messages[1].content[0].text,/do not redraw the image/i);
  assert.equal(calls[0].response_format.json_schema.strict,true);
 }finally{await new Promise(r=>s.close(r));}
});

test('invalid boxes and product intersections fail closed without returning a dangerous plan',async()=>{
 const broken={...plan,edits:[{...plan.edits[0],box:{x:.64,y:.25,width:.2,height:.1}}]};
 assert.equal(normalizeLocalPlan(broken,audit,facts),null);
 const calls=[],s=server(broken,calls),base=await start(s);
 try{
  const res=await fetch(base+'/api/localize',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal(res.status,200);const x=await res.json();assert.equal(x.plan,null);
  assert.equal(x.requires_manual_region,true);
 }finally{await new Promise(r=>s.close(r));}
});

test('non-copy visual issues never get silently reclassified as text-only',()=>{
 assert.equal(isTextOnlyRepair({...audit,issues:[...audit.issues,{category:'Visual',evidence:'Malformed product silhouette'}]}),false);
});
