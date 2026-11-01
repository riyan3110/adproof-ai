import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
test('a saved failed candidate can be explicitly reverified without new image generation',async()=>{
 const expression=source.match(/ui\.verify\.disabled=([^;]+);/)[1];
 const state={busy:false,imported:false,revised:'saved-repaired-pixels',verified:{score:93},consistencyReview:{status:'failed'}};
 assert.equal(vm.runInNewContext(expression,{state}),false);
 for(const patch of [{busy:true},{imported:true},{revised:null},{consistencyReview:{status:'validated'}}])
  assert.equal(vm.runInNewContext(expression,{state:{...state,...patch}}),true);
 const start=source.indexOf("ui.verify.addEventListener('click',async()=>{");
 const end=source.indexOf('\n',start);
 const requests=[];let handler;
 const context=vm.createContext({state,ui:{verify:{addEventListener:(event,fn)=>handler=fn}},
  performAudit:async(image,verify)=>requests.push({image,verify}),notify:()=>{}});
 vm.runInContext(source.slice(start,end),context);await handler();
 assert.deepEqual(requests,[{image:'saved-repaired-pixels',verify:true}]);
});
