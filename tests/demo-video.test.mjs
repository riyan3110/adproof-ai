import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import http from 'node:http';
import {createHandler} from '../server.mjs';

test('public demo streams real media and byte ranges without provider access',async()=>{
  const bytes=readFileSync(new URL('../public/demo/adproof-ai-demo.mp4',import.meta.url));
  let calls=0;
  const server=http.createServer(createHandler({key:'',demoCode:'private-test-only',requireDemoGate:true,fetcher:async()=>{calls++;throw Error('No provider call allowed')}}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    for(const [route,mime] of [['/demo.html','text/html'],['/demo.css','text/css'],['/demo/adproof-ai-demo.vtt','text/vtt'],['/demo/poster.jpg','image/jpeg']]){
      const response=await fetch(base+route);assert.equal(response.status,200);assert.ok(response.headers.get('content-type').startsWith(mime));assert.ok((await response.arrayBuffer()).byteLength);
    }
    const url=base+'/demo/adproof-ai-demo.mp4';
    const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('content-type'),'video/mp4');assert.equal(Number(head.headers.get('content-length')),bytes.length);assert.equal(head.headers.get('accept-ranges'),'bytes');assert.equal((await head.arrayBuffer()).byteLength,0);
    for(const [range,start,end] of [['bytes=0-1023',0,1023],['bytes=-16',bytes.length-16,bytes.length-1],['bytes=2048-',2048,bytes.length-1]]){
      const response=await fetch(url,{headers:{range}});assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/${bytes.length}`);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes.subarray(start,end+1));
    }
    for(const range of [`bytes=${bytes.length}-`,'bytes=9-3','bytes=-0','bytes=0-1,8-9']){
      const response=await fetch(url,{headers:{range}});assert.equal(response.status,416);assert.equal(response.headers.get('content-range'),`bytes */${bytes.length}`);assert.equal((await response.arrayBuffer()).byteLength,0);
    }
    assert.equal(calls,0);
  }finally{await new Promise(resolve=>server.close(resolve))}
});
