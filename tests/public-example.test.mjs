import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import http from 'node:http';
import {createHandler} from '../server.mjs';
import {loadRecordedExample} from '../public/public-example.js';

const bytes=readFileSync(new URL('../public/examples/aruna-verified.zip',import.meta.url));
test('the local Node server serves both new public assets with correct MIME and no provider access',async()=>{
 let calls=0;
 const server=http.createServer(createHandler({key:'',demoCode:'private-test-only',requireDemoGate:true,fetcher:async()=>{calls++;throw Error('No provider call allowed')}}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const module=await fetch(base+'/public-example.js');assert.equal(module.status,200);assert.match(module.headers.get('content-type'),/javascript/);
  const archive=await fetch(base+'/examples/aruna-verified.zip');assert.equal(archive.status,200);assert.equal(archive.headers.get('content-type'),'application/zip');
  assert.deepEqual(Buffer.from(await archive.arrayBuffer()),bytes);assert.equal(calls,0);
 }finally{await new Promise(r=>server.close(r))}
});
test('public example restores genuine saved pixels and evidence without any paid endpoint or inherited credentials',async()=>{
 const calls=[];
 const archive=await loadRecordedExample(async(url,options)=>{calls.push({url,options});return new Response(bytes)});
 assert.deepEqual(calls,[{url:'/examples/aruna-verified.zip',options:{credentials:'omit'}}]);
 assert.equal(archive.report.original.score,62);assert.equal(archive.report.verified.score,92);
 assert.ok(archive.original.startsWith('data:image/'));assert.ok(archive.revised.startsWith('data:image/'));
 assert.equal(archive.history.length,2);
 assert.equal(archive.report.visual_consistency.verification.status,'review_required','opening old evidence cannot approve a new revision');
 assert.equal(archive.report.visual_consistency.verification.auto_approved,false);
 assert.ok(archive.report.runs.some(r=>r.provenance?.response_id));
});
test('public example rejects missing, invalid and oversized media before restoring a session',async()=>{
 for(const response of [new Response('missing',{status:404}),new Response('invalid'),new Response('small',{headers:{'content-length':String(3*1024*1024)}}),new Response(new Uint8Array(2*1024*1024+1))])await assert.rejects(loadRecordedExample(async()=>response));
});
test('example entry cannot overwrite current work and failed loading leaves the source untouched',async()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const start=source.indexOf('async function openRecordedExample(){'),end=source.indexOf("\n$('#openVerifiedExample')",start);
 for(const patch of [{original:'unsaved'}, {busy:true},{importing:true}]){
  const state={original:null,busy:false,importing:false,...patch};let loads=0;
  const context=vm.createContext({state,notify:()=>{},loadRecordedExample:async()=>{loads++;throw Error('must not load')}});
  await vm.runInContext(source.slice(start,end)+';openRecordedExample',context)();assert.equal(loads,0);assert.equal(state.original,patch.original||null);
 }
 const state={original:null,busy:false,importing:false};let restores=0;
 const context=vm.createContext({state,notify:()=>{},syncDeck:()=>{},loadRecordedExample:async()=>{throw Error('network unavailable')},restoreAuditSnapshot:()=>restores++});
 await vm.runInContext(source.slice(start,end)+';openRecordedExample',context)();assert.equal(restores,0);assert.equal(state.original,null);assert.equal(state.importing,false);
});
