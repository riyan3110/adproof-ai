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
    if(url.endsWith('images/edits')) return new Response(JSON.stringify({data:[{b64_json:"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XtyfFAAAAABJRU5ErkJggg=="}]}),{status:200,headers:{'content-type':'application/json'}});
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

test('production mode fails closed with no demo code before Meta is called', async()=>{
  const calls=[];
  const locked=http.createServer(createHandler({fetcher:mockFetcher(calls),key:'mock-test-key',demoCode:'',requireDemoGate:true}));
  await new Promise(resolve=>locked.listen(0,'127.0.0.1',resolve));
  try {
    const base='http://127.0.0.1:'+locked.address().port;
    for(const endpoint of ['/api/audit','/api/improve']){
      const res=await post(base,endpoint,validBody);
      assert.equal(res.status,503);
      assert.match((await res.json()).error,/kode akses server/i);
    }
    assert.equal(calls.length,0,'no billable calls allowed without production gate');
  }finally{await new Promise(resolve=>locked.close(resolve));}
});

test('Judge Access validation distinguishes accepted code from Meta API connectivity without paid calls',async()=>{
 const before=gatedCalls.length;
 const missing=await post(gatedBase,'/api/access',{});
 assert.equal(missing.status,401);
 const invalid=await post(gatedBase,'/api/access',{},'not-the-private-code');
 assert.equal(invalid.status,403);
 const accepted=await post(gatedBase,'/api/access',{},CODE);
 assert.equal(accepted.status,200);
 const json=await accepted.json();
 assert.deepEqual(json,{ok:true,access:'verified',modelConfigured:true,providerTested:false});
 assert.equal(gatedCalls.length,before,'private code checks must never call Meta');
 assert.ok(!JSON.stringify(json).includes(CODE),'no secret in access response');
});

test('Judge Access validation refuses absent server code and limits guessing in an instance',async()=>{
 const fake=http.createServer(createHandler({key:'test-key',demoCode:'',requireDemoGate:true}));
 await new Promise(r=>fake.listen(0,'127.0.0.1',r));
 try {
  const url='http://127.0.0.1:'+fake.address().port;
  const resp=await post(url,'/api/access',{},CODE);
  assert.equal(resp.status,503);
 } finally{await new Promise(r=>fake.close(r));}
 const guarded=http.createServer(createHandler({key:'test-key',demoCode:'private-high-entropy-code',requireDemoGate:true}));
 await new Promise(r=>guarded.listen(0,'127.0.0.1',r));
 try {
  const url='http://127.0.0.1:'+guarded.address().port;
  for(let i=0;i<12;i++)assert.equal((await post(url,'/api/access',{},'wrong')).status,403);
  assert.equal((await post(url,'/api/access',{},'wrong')).status,429);
 }finally{await new Promise(r=>guarded.close(r));}
});
