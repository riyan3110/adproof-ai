import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHandler} from '../server.mjs';

// NOTE: the mocked upstream fetcher below is used ONLY in these automated
// tests. Production code always calls the real Meta Model API via fetch.
const IMAGE = 'data:image/png;base64,'+'A'.repeat(128);
const SCAN = {
  score:71,headline:'Can be improved',summary:'Clear image with one unsupported claim',recommended_caption:'A desk lamp made from wood.',
  issues:[{id:'i1',title:'Unsupported claim',category:'Claim',severity:'medium',evidence:'Best ever is visible',suggestion:'Remove the superlative.'}],
  strengths:['Good contrast'],checks:{claim:55,clarity:85,hierarchy:75,action:70}
};
const CODE = 'test-demo-code-123';
const validBody = {image:IMAGE,product:'Lamp',facts:'Wood frame, 50 cm tall, 5W.',caption:'A lamp'};

function mockFetcher(calls) {
  return async (url,opts={})=>{
    calls.push({url,opts});
    if(url.endsWith('chat/completions')) return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(SCAN)}}],usage:{total_tokens:123}}),{status:200,headers:{'content-type':'application/json'}});
    if(url.endsWith('images/edits')) return new Response(JSON.stringify({data:[{b64_json:'AAAABBCC'}]}),{status:200,headers:{'content-type':'application/json'}});
    throw Error(`Unexpected URL: ${url}`);
  };
}

let gated, open, gatedBase, openBase;
const gatedCalls = [];
const openCalls = [];
test.before(async()=>{
  gated=http.createServer(createHandler({fetcher:mockFetcher(gatedCalls),key:'mock-test-key',demoCode:CODE}));
  open=http.createServer(createHandler({fetcher:mockFetcher(openCalls),key:'mock-test-key'}));
  await new Promise(r=>gated.listen(0,'127.0.0.1',r));
  await new Promise(r=>open.listen(0,'127.0.0.1',r));
  gatedBase=`http://127.0.0.1:${gated.address().port}`;
  openBase=`http://127.0.0.1:${open.address().port}`;
});
test.after(async()=>{await new Promise(r=>gated.close(r));await new Promise(r=>open.close(r));});

const post=(base,path,body,code)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(code?{'x-demo-code':code}:{})},body:JSON.stringify(body)});

test('health reports gate status without leaking the code',async()=>{
  const g=await (await fetch(gatedBase+'/api/health')).json();
  assert.equal(g.demoGate,true);
  assert.ok(!JSON.stringify(g).includes(CODE),'health must not leak the code');
  const o=await (await fetch(openBase+'/api/health')).json();
  assert.equal(o.demoGate,false);
});

test('missing code is rejected without invoking upstream Meta fetcher',async()=>{
  const before=gatedCalls.length;
  for(const p of ['/api/audit','/api/improve']) {
    const body = p==='/api/audit' ? validBody : {...validBody,issues:SCAN.issues};
    const res=await post(gatedBase,p,body);
    assert.equal(res.status,401,p);
    assert.match((await res.json()).error,/kode akses/i);
  }
  assert.equal(gatedCalls.length,before,'no upstream call on missing code');
});

test('invalid code is rejected safely without invoking upstream',async()=>{
  const before=gatedCalls.length;
  const res=await post(gatedBase,'/api/audit',validBody,'wrong-code');
  assert.equal(res.status,403);
  const err=(await res.json()).error;
  assert.match(err,/kode akses/i);
  assert.ok(!err.includes(CODE),'error must not echo the secret');
  assert.equal(gatedCalls.length,before,'no upstream call on invalid code');
});

test('authorized calls reach the API layer with correct code',async()=>{
  const r1=await post(gatedBase,'/api/audit',validBody,CODE);
  assert.equal(r1.status,200);
  assert.equal((await r1.json()).audit.score,71);
  const r2=await post(gatedBase,'/api/improve',{...validBody,issues:SCAN.issues},CODE);
  assert.equal(r2.status,200);
  assert.ok((await r2.json()).image.startsWith('data:image/'));
  assert.ok(gatedCalls.some(x=>x.url.endsWith('chat/completions')));
  assert.ok(gatedCalls.some(x=>x.url.endsWith('images/edits')));
});

test('endpoints stay open for local dev when gate is unset',async()=>{
  const res=await post(openBase,'/api/audit',validBody);
  assert.equal(res.status,200);
  assert.equal((await res.json()).audit.score,71);
  assert.ok(openCalls.some(x=>x.url.endsWith('chat/completions')));
});
