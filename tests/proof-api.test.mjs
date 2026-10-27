import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,VERCEL_MAX_BODY} from '../server.mjs';
const input={image:'data:image/png;base64,'+'A'.repeat(128),product:'Lamp',facts:'Wood frame, 5 watts.',caption:''};
const audit={score:60,issues:[null],claim_ledger:[{claim:'Wood frame',origin:'creative',assessment:'supported_by_supplied_facts',fact_quote:'Wood frame',reason:'Input match',recommended_action:'Keep'}]};
async function invoke(fetcher,body=input,route='/api/audit',options={}){
 const handler=createHandler({fetcher,key:'unit-test-only',demoCode:'test-only',maxBody:VERCEL_MAX_BODY,...options});
 let status,data;const headers={};
 const res={setHeader:(k,v)=>headers[k]=v,writeHead:n=>status=n,end:v=>data=JSON.parse(v)};
 await handler({method:'POST',url:route,body,headers:{'x-demo-code':'test-only'},socket:{remoteAddress:'proof-'+Math.random()}},res);
 return {status,data,headers};
}
test('audit snapshot digest binds facts/image/caption without including input or credentials',async()=>{
 const mock=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(audit)}}]}));
 const a=await invoke(mock),b=await invoke(mock,{...input,caption:'New copy'});
 assert.equal(a.status,200);assert.equal(a.data.audit.issues[0].title,'');
 assert.match(a.data.provenance.input_sha256,/^[a-f0-9]{64}$/);
 assert.notEqual(a.data.provenance.input_sha256,b.data.provenance.input_sha256);
 assert.equal(JSON.stringify(a.data.provenance).includes('test-only'),false);
});
test('repair prompt carries bounded claim actions even when generic issues are empty',async()=>{
 let sent;
 const r=await invoke(async(url,opts)=>{sent=JSON.parse(opts.body);return new Response(JSON.stringify({data:[{b64_json:'AAAABBCC'}]}));},{...input,issues:[],claims:[{claim:'Cures fatigue',assessment:'unsupported_by_supplied_facts',recommended_action:'Remove unsupported benefit'}]},'/api/improve');
 assert.equal(r.status,200);assert.match(sent.prompt,/Remove unsupported benefit/);assert.equal(sent.model,'muse-image-1.0');
});
test('provider failures and aborts are explicit, never fake success',async()=>{
 const fail=await invoke(async()=>new Response(JSON.stringify({error:{message:'Service unavailable'}}),{status:503}));assert.equal(fail.status,502);assert.equal(fail.data.audit,undefined);
 const aborted=await invoke(async()=>{const e=new Error('Request expired');e.name='AbortError';throw e;});assert.equal(aborted.status,504);
 const malformed=await invoke(async()=>new Response(JSON.stringify({choices:[{message:{content:'not json'}}]})));assert.equal(malformed.status,500);
});
test('serverless parsed JSON is bounded by UTF-8 bytes before upstream use',async()=>{
 let called=false;const r=await invoke(async()=>{called=true;throw Error('must not run');},{...input,facts:'🙂'.repeat(1100000)});
 assert.equal(r.status,413);assert.equal(called,false);
});
test('provider errors redact configured secrets',async()=>{
 const r=await invoke(async()=>new Response(JSON.stringify({error:{message:'unit-test-only test-only'}}),{status:400}));
 assert.equal(r.status,502);assert.ok(!r.data.error.includes('test-only'));
});
test('signed image downloads are timed and never followed to insecure URLs',async()=>{
 let downloads=0;
 const fetcher=async(url,opts)=>{
  if(url.endsWith('images/edits'))return new Response(JSON.stringify({data:[{url:'https://images.example.test/result.png'}]}));
  downloads++;assert.ok(opts.signal);assert.equal(opts.redirect,'error');return new Response(new Uint8Array([137,80,78,71]),{headers:{'content-type':'image/png'}});
 };
 const ok=await invoke(fetcher,{...input,issues:[]},'/api/improve');assert.equal(ok.status,200);assert.equal(downloads,1);
 const bad=await invoke(async()=>new Response(JSON.stringify({data:[{url:'http://localhost/private'}]})),{...input,issues:[]},'/api/improve');assert.equal(bad.status,500);
});
