import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import http from 'node:http';
import {createHandler} from '../server.mjs';

const PNG='iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFUlEQVR4nGO8c+c6AzbAhFV00EoAAAHFAp9IYj1VAAAAAElFTkSuQmCC';
const image='data:image/png;base64,'+PNG;
const makeBody=(style='cinematic',locks={})=>({
 image,product:'ARUNA Drinkware',facts:'Stainless steel drinkware with 600 mL capacity.',
 caption:'Bawa segarnya. Setiap hari.',mode:'restyle',claims:[],issues:[],
 consistency:{style,locks:{product_shape:true,branding:true,typography:true,composition:true,
  colors:false,lighting:false,background:false,...locks}}
});
const server=calls=>http.createServer(createHandler({
 key:'mock-provider-test',requireDemoGate:false,
 fetcher:async(url,req)=>{
  const payload=JSON.parse(req.body);calls.push({url,payload});
  return new Response(JSON.stringify({model:'muse-image-1.0',
   data:[{b64_json:PNG}]}),{status:200,headers:{'Content-Type':'application/json'}});
 }
}));
async function start(server){await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port;}
async function post(url,body){const r=await fetch(url+'/api/improve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}

test('style button triggers actual Muse Image edit, not an inert dropdown or mock image',async()=>{
 const calls=[],s=server(calls),base=await start(s);
 try{
  const res=await post(base,makeBody());
  assert.equal(res.status,200,JSON.stringify(res.data));
  assert.equal(res.data.model,'muse-image-1.0');
  assert.equal(res.data.repair_metadata.method,'style_edit_source_reference_no_mask');
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/images\/edits/);
  assert.equal(calls[0].payload.model,'muse-image-1.0');
  assert.match(calls[0].payload.prompt,/RESTYLE ONLY/);
  assert.match(calls[0].payload.prompt,/Cinematic/);
  assert.match(calls[0].payload.prompt,/product geometry/);
  assert.match(calls[0].payload.prompt,/typography: ON/);
 }finally{await new Promise(r=>s.close(r));}
});
test('style mode cannot silently bypass protected core locks or apply preserved style',async()=>{
 const calls=[],s=server(calls),base=await start(s);
 try{
  for(const request of [
    makeBody('preserve'),
    makeBody('cinematic',{branding:false}),
    makeBody('cinematic',{product_shape:false}),
    makeBody('cinematic',{typography:false}),
    makeBody('cinematic',{composition:false}),
    makeBody('cinematic',{colors:true,lighting:true,background:true})
  ]){
   const r=await post(base,request);
   assert.equal(r.status,400,r.data.error);
  }
  assert.equal(calls.length,0,'invalid styled requests never spend Meta quota');
 }finally{await new Promise(r=>s.close(r));}
});
test('studio provides one explicit paid style action and real progress, not a disabled promise',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../public/consistency-ui.js',import.meta.url),'utf8');
 assert.match(app,/applyStyle:performVisualRestyle/);
 assert.match(app,/mode:'restyle'/);
 assert.match(app,/await performAudit\(state.revised,true\)/);
 assert.match(app,/changed_sample_fraction<\.01/);
 assert.match(ui,/applyVisualStyle/);
 assert.match(ui,/Terapkan gaya/);
 assert.match(ui,/applyStyle\(adjusted\)/);
 assert.match(app,/workStep\(getLanguage\(\)==='id'\?'Menentukan area teks'/);
 assert.match(app,/Memverifikasi hasil/);
 assert.doesNotMatch(ui,/e\.disabled=state\.busy\|\|state\.imported\|\|!!state\.revised/);
});
