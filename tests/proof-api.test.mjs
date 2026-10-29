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

test('Verify re-audit sends original reference as second image in SAME Muse Spark request',async()=>{
 const seen=[];
 const mock=async(url,opts)=>{
  seen.push({url,payload:JSON.parse(opts.body)});
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(audit)}}]}));
 };
 const reference='data:image/jpeg;base64,'+'A'.repeat(128);
 const body={...input,referenceImage:reference};
 const out=await invoke(mock,body);
 assert.equal(out.status,200);
 assert.equal(out.data.original_reference_sent,true);
 assert.equal(seen.length,1,'do not add another paid inference');
 const blocks=seen[0].payload.messages[1].content;
 assert.equal(blocks[1].image_url.url,input.image);
 assert.equal(blocks[2].image_url.url,reference);
 assert.match(blocks[0].text,/REVISED creative/);
 assert.match(blocks[0].text,/DOWNSAMPLED REFERENCE/);
 assert.match(blocks[0].text,/material observed regressions/);
 assert.ok(!JSON.stringify(out.data).includes(reference),'comparison reference must not be returned');
});

test('initial audit has one image and never claims a visual before/after comparison',async()=>{
 let sent;
 const result=await invoke(async(url,opts)=>{sent=JSON.parse(opts.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(audit)}}]}));});
 assert.equal(result.status,200);
 assert.equal(result.data.original_reference_sent,false);
 assert.equal(sent.messages[1].content.length,2);
 assert.match(sent.messages[1].content[0].text,/No original reference is provided/);
});

test('invalid comparison reference is rejected before any paid Meta call',async()=>{
 let called=0;
 for(const reference of ['data:image/gif;base64,'+'A'.repeat(128),'https://other.host/image.jpg','data:image/jpeg;base64,'+'A'.repeat(520000)]){
  const result=await invoke(async()=>{called++;throw Error('paid call must be blocked')},{...input,referenceImage:reference});
  assert.equal(result.status,400);
  assert.match(result.data.error,/Referensi gambar asli/);
 }
 assert.equal(called,0);
});

test('repair instruction preserves geometry and rejects invented USB-C connections',async()=>{
 let sent;
 const out=await invoke(async(url,opts)=>{
  sent=JSON.parse(opts.body);
  return new Response(JSON.stringify({data:[{b64_json:"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XtyfFAAAAABJRU5ErkJggg=="}]}));
 },{...input,issues:[{title:'Unverified claim',suggestion:'Remove it'}],claims:[]},'/api/improve');
 assert.equal(out.status,200);
 assert.match(sent.prompt,/PRESERVE FIRST/);
 assert.match(sent.prompt,/USB 5V does NOT prove USB-C/);
 assert.match(sent.prompt,/retain that part instead of forcing a repair/i);
 assert.match(sent.prompt,/CANDIDATE, not an approved result/);
});


test('English Meta report uses the selected output language but keeps original quotes untouched',async()=>{
 let sent=null,calls=0;
 const source=async(url,opts)=>{calls++;sent=JSON.parse(opts.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(audit)}}]}));};
 const output=await invoke(source,{...input,language:'en',caption:'Lampu 5W · hemat listrik'});
 assert.equal(output.status,200);
 assert.equal(output.data.report_language,'en');
 assert.equal(output.data.provenance.report_language,'en');
 assert.equal(calls,1,'language selection must reuse the existing model request');
 const prompt=sent.messages[1].content[0].text;
 assert.match(prompt,/strictly in English/);
 assert.match(prompt,/Do NOT translate quoted ad claims/);
 assert.match(prompt,/Recommended caption must match the original advertisement\/caption language/);
 assert.match(prompt,/Lampu 5W/,'input copy should not be rewritten before model inference');
 assert.equal(sent.messages[1].content.length,2);
});
test('Indonesian Meta report has explicit Indonesian language while old clients keep legacy Indonesian',async()=>{
 for(const body of [{...input,language:'id'},input]){
  let sent;
  const response=await invoke(async(url,opts)=>{
   sent=JSON.parse(opts.body);
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(audit)}}]}));
  },body);
  assert.equal(response.status,200);
  assert.equal(response.data.report_language,'id');
  assert.match(sent.messages[1].content[0].text,/strictly in Bahasa Indonesia/);
 }
});
test('unrecognized language is rejected before paid upstream',async()=>{
 let upstream=0;
 for(const language of ['es',null,24,{},'EN','id-ID','anything<script>']){
  const result=await invoke(async()=>{upstream++;throw Error('Unexpected model call');},{...input,language});
  assert.equal(result.status,400);
  assert.match(result.data.error,/Bahasa laporan tidak didukung/);
 }
 assert.equal(upstream,0);
});
test('repair retains original advertising language regardless of locale',async()=>{
 let prompt=null;
 const response=await invoke(async(url,opts)=>{
  prompt=JSON.parse(opts.body).prompt;
  return new Response(JSON.stringify({data:[{b64_json:"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XtyfFAAAAABJRU5ErkJggg=="}]}));
 },{...input,language:'en',issues:[],claims:[]},'/api/improve');
 assert.equal(response.status,200);
 assert.match(prompt,/Preserve the ORIGINAL LANGUAGE/);
 assert.match(prompt,/do not translate the advertisement/);
 assert.match(prompt,/PRESERVE FIRST/);
});

test('audit records returned model separately from request and leaves absent IDs unknown',async()=>{
 const result=await invoke(async()=>Response.json({model:'muse-spark-1.3-202610',id:'chatcmpl-provider-123',choices:[{message:{content:JSON.stringify(audit)}}]}));
 assert.equal(result.data.model,'muse-spark-1.3-202610');
 assert.equal(result.data.provenance.requested_model,'muse-spark-1.3');
 assert.equal(result.data.provenance.returned_model,result.data.model);
 assert.equal(result.data.provenance.response_id,'chatcmpl-provider-123');
 const missing=await invoke(async()=>Response.json({choices:[{message:{content:JSON.stringify(audit)}}]}));
 assert.equal(missing.data.provenance.returned_model,null);
 assert.equal(missing.data.provenance.response_id,null);
});

test('repair provenance binds output bytes and inputs for base64 and downloaded images',async()=>{
 const image=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
 const {createHash}=await import('node:crypto');
 const expected=createHash('sha256').update(image).digest('hex');
 for(const signed of [false,true]){
  const fetcher=async url=>url.endsWith('images/edits')?Response.json({id:'image-provider-123',model:'muse-image-1.0',data:[signed?{url:'https://images.example.test/result.png'}:{b64_json:image.toString('base64')}]}):new Response(image);
  const before=await invoke(fetcher,{...input,issues:[]},'/api/improve');
  const after=await invoke(fetcher,{...input,facts:'Different factual product context',issues:[]},'/api/improve');
  assert.equal(before.status,200);
  assert.equal(before.data.provenance.stage,'repair');
  assert.equal(before.data.provenance.response_id,'image-provider-123');
  assert.equal(before.data.provenance.output_sha256,expected);
  assert.notEqual(before.data.provenance.input_sha256,after.data.provenance.input_sha256);
  assert.equal(JSON.stringify(before.data.provenance).includes(input.facts),false);
 }
});

test('provenance does not echo credentials inserted in provider identity fields',async()=>{
 const result=await invoke(async()=>Response.json({id:'unit-test-only',model:'test-only',choices:[{message:{content:JSON.stringify(audit)}}]}));
 assert.equal(result.data.provenance.response_id,null);
 assert.equal(result.data.provenance.returned_model,null);
 assert.equal(JSON.stringify(result.data.provenance).includes('test-only'),false);
});
