import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHandler} from '../server.mjs';

const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFUlEQVR4nGO8c+c6AzbAhFV00EoAAAHFAp9IYj1VAAAAAElFTkSuQmCC';
const audit={score:90,headline:'Recorded comparison',summary:'Source already has a restrained minimalist treatment.',recommended_caption:'Reusable bottle, 500 mL.',issues:[],strengths:[],checks:{claim:90,clarity:90,hierarchy:90,action:90},claim_ledger:[]};

test('subtle provider output survives and reaches independent Verify instead of being discarded',async()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const start=source.indexOf('async function performVisualRestyle(settings){');
 const end=source.indexOf('\nasync function performImprove()',start);
 const calls=[],steps=[];
 const state={busy:false,imported:false,configured:true,original:'source',initialAudit:audit,context:{facts:'500 mL bottle',caption:''},history:[],runs:[]};
 const context=vm.createContext({state,Error,Boolean,
  payload:image=>({image}),reportSnapshot:()=>({original:audit}),
  setBusy:value=>{state.busy=value},workStep:value=>steps.push(value),getLanguage:()=> 'en',
  api:async(endpoint,body)=>{calls.push({endpoint,body});return {image:'provider-candidate',model:'muse-image-1.0',provenance:{input_sha256:'input'},repair_metadata:{method:'style_edit_source_reference_no_mask'}}},
  validateCandidateImage:async()=>{},comparePixels:async()=>({changed_sample_fraction:0}),dimensions:async()=>({width:1200,height:1200}),
  updateMetaStatus:()=>{},visualUI:{clear:()=>{}},phase:()=>{},switchView:()=>{},render:()=>{},renderProofStudio:()=>{},persistMilestone:async()=>{},notify:()=>{},
  performAudit:async(image,verify)=>{calls.push({image,verify});state.consistencyReview={status:'validated'}}
 });
 const run=vm.runInContext(source.slice(start,end)+';performVisualRestyle',context);
 await run({style:'minimalist',locks:{product_shape:true}});
 assert.equal(calls.length,2);
 assert.equal(calls[0].endpoint,'/api/improve');
 assert.deepEqual(calls[1],{image:'provider-candidate',verify:true});
 assert.equal(state.revised,'provider-candidate');
 assert.equal(state.history.length,1);
 assert.equal(state.repairMetadata.style_change.subtle_or_unchanged,true);
 assert.ok(steps.includes('Style checked; subtle visual change'));
});

test('style comparison sends the exact preset and source to Spark; invalid targets spend no quota',async()=>{
 const calls=[];
 const server=http.createServer(createHandler({key:'mock-style-test',requireDemoGate:false,fetcher:async(url,opts)=>{
  calls.push({url,payload:JSON.parse(opts.body)});
  return new Response(JSON.stringify({id:'mock-style-audit',model:'muse-spark-1.3',choices:[{message:{content:JSON.stringify(audit)}}]}),{status:200});
 }}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const body={image,referenceImage:image,product:'Nori Bottle',facts:'Reusable bottle, 500 mL.',style_target:'minimalist',consistency:{style:'minimalist'}};
 const post=body=>fetch(base+'/api/audit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  assert.equal((await post(body)).status,200);
  const sent=calls[0].payload.messages[1].content;
  assert.equal(sent.filter(x=>x.type==='image_url').length,2);
  const prompt=sent.find(x=>x.type==='text').text;
  assert.match(prompt,/REQUESTED STYLE COMPARISON: minimalist/);
  assert.match(prompt,/source already matches/);
  assert.match(prompt,/medium Consistency issue/);
  assert.match(prompt,/identical words do not establish preserved typography/);
  assert.match(prompt,/sans-serif source title changed to serif/);
  assert.match(prompt,/Missing|missing/);
  const before=calls.length;
  for(const patch of [{style_target:'unknown'},{style_target:'preserve'},{referenceImage:undefined},{consistency:{style:'cinematic'}},{comparison_mode:'format',format_target:{width:1600,height:900}}])assert.equal((await post({...body,...patch})).status,400);
  assert.equal(calls.length,before);
 }finally{await new Promise(r=>server.close(r))}
});
