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
 const r=await invoke(async(url,opts)=>{sent=JSON.parse(opts.body);return new Response(JSON.stringify({data:[{b64_json:"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XtyfFAAAAABJRU5ErkJggg=="}]}));},{...input,issues:[],claims:[{claim:'Cures fatigue',assessment:'unsupported_by_supplied_facts',recommended_action:'Remove unsupported benefit'}]},'/api/improve');
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
  downloads++;assert.ok(opts.signal);assert.equal(opts.redirect,'error');return new Response(new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]),{headers:{'content-type':'application/octet-stream'}});
 };
 const ok=await invoke(fetcher,{...input,issues:[]},'/api/improve');assert.equal(ok.status,200);assert.equal(downloads,1);assert.ok(ok.data.image.startsWith('data:image/png;base64,'));
 const bad=await invoke(async()=>new Response(JSON.stringify({data:[{url:'http://localhost/private'}]})),{...input,issues:[]},'/api/improve');assert.equal(bad.status,500);
});

test('malformed base64 or signed image responses are rejected before browser delivery',async()=>{
 const body={...input,issues:[]};
 const invalid=await invoke(async()=>new Response(JSON.stringify({data:[{b64_json:Buffer.from('not a real image').toString('base64')}]})),body,'/api/improve');
 assert.equal(invalid.status,502);
 assert.match(invalid.data.error,/format yang tidak didukung/i);
 let downloads=0;
 const invalidURL=await invoke(async(url,opts)=>{
  if(url.endsWith('images/edits'))return new Response(JSON.stringify({data:[{url:'https://images.example.test/signed'}]}));
  downloads++;
  assert.ok(opts.signal);
  return new Response('<html>Not an image</html>',{headers:{'content-type':'image/png'}});
 },body,'/api/improve');
 assert.equal(invalidURL.status,502);
 assert.equal(downloads,1);
 assert.match(invalidURL.data.error,/bukan PNG, JPEG, atau WebP/i);
});

test('Muse Image JPEG and WebP base64 outputs use their actual MIME signatures',async()=>{
 const body={...input,issues:[]};
 const jpg=Buffer.from([255,216,255,224,0,12,74,70,73,70,0,0]);
 const webp=Buffer.from('RIFF'+'xxxx'+'WEBP'+'VP8 ','ascii');
 for(const [bytes,mime] of [[jpg,'jpeg'],[webp,'webp']]){
  const result=await invoke(async()=>new Response(JSON.stringify({data:[{b64_json:bytes.toString('base64')}]})),body,'/api/improve');
  assert.equal(result.status,200);
  assert.ok(result.data.image.startsWith('data:image/'+mime+';base64,'),mime);
 }
});
