import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('checking output after failed/missing adaptation never repeats a paid model request',async()=>{
 const source=readFileSync(new URL('../public/consistency-ui.js',import.meta.url),'utf8');
 const start=source.indexOf("q('#prepareOutput').addEventListener('click',async()=>{");
 const end=source.indexOf('\n return {sync,',start);
 const handler=source.slice(start,end);
 for(const failed of [false,true]){
  let run,calls=0;const notices=[];
  const controls=new Map();
  const q=selector=>{
   if(!controls.has(selector))controls.set(selector,{disabled:false,addEventListener:(event,fn)=>{run=fn;}});
   return controls.get(selector);
  };
  const context=vm.createContext({q,generation:0,state:{busy:false},
   options:()=>({source:'original',category:'website'}),originalAllowed:()=>true,candidateAllowed:()=>false,
   source:()=> 'source',exportSource:()=> 'source',dimensions:async()=>({width:1600,height:1600}),
   outputPlan:()=>({width:1600,height:900,aspect_changed:true}),usableFormat:()=>false,
   formatCandidate:failed?{review:{status:'failed'}}:null,
   adaptFormat:async()=>{calls++;throw Error('Unexpected paid request');},
   renderOutput:async()=>{throw Error('Unverified candidate must not export');},
   say:en=>en,notify:message=>notices.push(message)});
  vm.runInContext(handler,context);await run();await run();
  assert.equal(calls,0);
  assert.equal(notices.length,2);
  assert.ok(notices.every(x=>x.includes('Adapt the composition with AI')));
  assert.equal(q('#prepareOutput').disabled,false);
 }
});
