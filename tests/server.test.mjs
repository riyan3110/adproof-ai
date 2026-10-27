import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHandler} from '../server.mjs';

const IMAGE = 'data:image/png;base64,'+'A'.repeat(128);
const SCAN = {
  score:71,headline:'Can be improved',summary:'Clear image with one unsupported claim',recommended_caption:'A desk lamp made from wood.',
  issues:[{id:'i1',title:'Unsupported claim',category:'Claim',severity:'medium',evidence:'Best ever is visible',suggestion:'Remove the superlative.'}],
  strengths:['Good contrast'],checks:{claim:55,clarity:85,hierarchy:75,action:70}
};
const calls=[];
const fetcher=async (url,opts={})=>{
  calls.push({url,opts});
  if(url.endsWith('chat/completions')) return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(SCAN)}}],usage:{total_tokens:123}}),{status:200,headers:{'content-type':'application/json'}});
  if(url.endsWith('images/edits')) return new Response(JSON.stringify({data:[{b64_json:'AAAABBCC'}]}),{status:200,headers:{'content-type':'application/json'}});
  throw Error(`Unexpected URL: ${url}`);
};
let server,base;
test.before(async()=>{server=http.createServer(createHandler({fetcher,key:'mock-test-key'}));await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;});
test.after(async()=>{await new Promise(r=>server.close(r));});

test('public routes and headers',async()=>{
 for(const p of ['/','/app','/docs','/styles.css','/app.js']){
  const res=await fetch(base+p);assert.equal(res.status,200,p);assert.equal(res.headers.get('x-frame-options'),'DENY');
 }
 assert.equal((await (await fetch(base+'/api/health')).json()).configured,true);
});
test('audit invokes real Meta-compatible multimodal endpoint and parses structured output',async()=>{
 const res=await fetch(base+'/api/audit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({image:IMAGE,product:'Lamp',facts:'Wood frame, 50 cm tall, 5W.',caption:'Greatest lamp'})});
 assert.equal(res.status,200);const obj=await res.json();assert.equal(obj.audit.score,71);assert.equal(obj.audit.issues[0].category,'Claim');
 const call=calls.find(x=>x.url.endsWith('chat/completions'));assert.equal(call.opts.headers.Authorization,'Bearer mock-test-key');
 const sent=JSON.parse(call.opts.body);assert.equal(sent.model,'muse-spark-1.3');assert.equal(sent.messages[1].content[1].image_url.url,IMAGE);assert.equal(sent.response_format.json_schema.strict,true);
});
test('image editing uses documented Muse Image endpoint',async()=>{
 const res=await fetch(base+'/api/improve',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({image:IMAGE,product:'Lamp',facts:'Wood frame, 50 cm tall, 5W.',issues:SCAN.issues})});
 assert.equal(res.status,200);assert.equal((await res.json()).image,'data:image/png;base64,AAAABBCC');
 const sent=JSON.parse(calls.find(x=>x.url.endsWith('images/edits')).opts.body);assert.equal(sent.model,'muse-image-1.0');assert.equal(sent.images[0].image_url,IMAGE);
});
test('bad input rejected before API call',async()=>{
 const old=calls.length;
 const res=await fetch(base+'/api/audit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({image:'http://evil',product:'x',facts:'8characters'})});
 assert.equal(res.status,400);assert.equal(calls.length,old);
});
