import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
function runtime(fetcher){
 const timeouts=new Set(),intervals=new Map(),steps=[],messages=[],codes=[],statuses=[];
 let sequence=0;
 const ui={accessButton:{},accessSubmit:{},accessError:{hidden:false}};
 const context=vm.createContext({AbortController,Date,ui,state:{busy:true},accessCheckGeneration:0,
  setTimeout:()=>{const id=++sequence;timeouts.add(id);return id;},clearTimeout:id=>timeouts.delete(id),
  setInterval:fn=>{const id=++sequence;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id),
  fetch:fetcher,setCode:code=>codes.push(code),getCode:()=> 'SYNTHETIC-TEST-CODE',
  setAccessStatus:(...s)=>statuses.push(s),showCodeError:m=>messages.push(m),notify:m=>messages.push(m),
  getLanguage:()=> 'en',workStep:(...s)=>steps.push(s),openJudgeDialog:async()=>false});
 const access=source.slice(source.indexOf('async function verifyCode('),source.indexOf('function openJudgeDialog('));
 const api=source.slice(source.indexOf('async function api('),source.indexOf('function isImage('));
 vm.runInContext(access+'\n'+api,context);
 return {context,ui,timeouts,intervals,steps,messages,codes,statuses};
}

test('browser accepts a successful access response and releases its timer without a progress variable',async()=>{
 const r=runtime(async()=>Response.json({ok:true,access:'verified'}));
 assert.equal(await r.context.verifyCode('SYNTHETIC-TEST-CODE'),true);
 assert.deepEqual(r.codes,['SYNTHETIC-TEST-CODE']);
 assert.equal(r.ui.accessError.hidden,true);
 assert.equal(r.ui.accessSubmit.disabled,false);
 assert.equal(r.timeouts.size,0);
 assert.equal(r.intervals.size,0);
});

test('incorrect access is identified as an incorrect code rather than a fake connection failure',async()=>{
 const r=runtime(async()=>Response.json({error:'test rejection'},{status:403}));
 assert.equal(await r.context.verifyCode('SYNTHETIC-WRONG-CODE'),false);
 assert.equal(r.statuses.at(-1)[0],'Code rejected');
 assert.match(r.messages.at(-1),/Kode salah/);
 assert.equal(r.timeouts.size,0);
 assert.equal(r.ui.accessButton.disabled,false);
});

test('a saved code can be restored; a stale access response cannot replace the newer session',async()=>{
 const replies=[];
 const r=runtime(()=>new Promise(resolve=>replies.push(resolve)));
 const older=r.context.verifyCode('OLDER-SYNTHETIC-CODE',{restoring:true});
 const newer=r.context.verifyCode('NEWER-SYNTHETIC-CODE',{restoring:true});
 replies[1](Response.json({ok:true,access:'verified'}));
 assert.equal(await newer,true);
 replies[0](Response.json({error:'old test failure'},{status:403}));
 assert.equal(await older,false);
 assert.deepEqual(r.codes,['NEWER-SYNTHETIC-CODE']);
 assert.equal(r.timeouts.size,0);
});

test('measured progress stops after every successful request and cannot overwrite the next stage',async()=>{
 let reply;
 const r=runtime(()=>new Promise(resolve=>reply=resolve));
 const pending=r.context.api('/api/improve',{image:'TEST-ONLY'});
 assert.equal(r.intervals.size,1);
 for(const tick of r.intervals.values())tick();
 assert.match(r.steps.at(-1)[1],/^Elapsed \d+ seconds$/);
 reply(Response.json({image:'TEST-RESULT'}));
 assert.equal((await pending).image,'TEST-RESULT');
 assert.equal(r.intervals.size,0);
 assert.equal(r.timeouts.size,0);
 const completed=r.steps.length;
 for(const tick of r.intervals.values())tick();
 assert.equal(r.steps.length,completed);
 const next=r.context.api('/api/audit',{});
 for(const tick of r.intervals.values())tick();
 assert.equal(r.steps.at(-1)[0],'Muse Spark checking image');
 reply(Response.json({audit:{score:50}}));
 await next;
 assert.equal(r.intervals.size,0);
});

test('network failures, provider errors and aborts all release progress without replaying paid calls',async()=>{
 for(const scenario of ['network','upstream','abort']){
  let calls=0;
  const r=runtime(async()=>{
   calls++;
   if(scenario==='upstream')return Response.json({error:'TEST provider unavailable'},{status:502});
   const e=new Error('TEST network failure');if(scenario==='abort')e.name='AbortError';throw e;
  });
  await assert.rejects(()=>r.context.api('/api/improve',{}));
  assert.equal(calls,1,scenario);
  assert.equal(r.timeouts.size,0,scenario);
  assert.equal(r.intervals.size,0,scenario);
 }
});
