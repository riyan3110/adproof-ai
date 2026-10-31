import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recognizeSource,ocrLines,locateExactClaim} from '../ocr-localization.mjs';
const image='data:image/webp;base64,'+readFileSync(new URL('./fixtures/lumadesk-photo.webp',import.meta.url)).toString('base64');
test('real OCR locates all source glyphs of LumaDesk multiline claims, without Spark coordinate guesses',async()=>{
 const lines=ocrLines(await recognizeSource(image));
 for(const [text,y0,y1]of [['Save up to 90% Electricity',430,515],['Protect Your Eyes',577,665],['Better Sleep in 7 Days',724,813]]){
  const box=locateExactClaim(text,lines,1254,1254);assert.ok(box,text);
  assert.ok(box.y*1254<=y0&&Math.ceil((box.y+box.height)*1254)>=y1,text+' includes the final glyph row');
  assert.ok(box.x+box.width<.49,'does not reach protected lamp');
 }
 assert.equal(locateExactClaim('Save up to 80% Electricity',lines,1254,1254),null);
 assert.equal(locateExactClaim('Protect Eyes',lines,1254,1254),null);
});
test('duplicate exact OCR occurrences are ambiguous and never guessed',()=>{
 const lines=[{text:'500 mL',box:{x0:5,y0:5,x1:100,y1:20}},{text:'500 mL',box:{x0:5,y0:50,x1:100,y1:70}}];
 assert.equal(locateExactClaim('500 mL',lines,500,500),null);
});
test('localization API corrects the actual bad model rectangle and returns only complete supplied fact lines',async()=>{
 const {createServer}=await import('node:http');const {createHandler}=await import('../server.mjs');
 const report=JSON.parse(readFileSync(new URL('../evidence/live-2026-11-01/lumadesk/initial.json',import.meta.url)));
 const failed=JSON.parse(readFileSync(new URL('../evidence/live-2026-11-01/lumadesk/failed-after-multiline-fix.json',import.meta.url)));
 let calls=0;const server=createServer(createHandler({key:'test-only',requireDemoGate:false,fetcher:async()=>{calls++;return Response.json({choices:[{message:{content:JSON.stringify({local_text_repair:failed.original_plan})}}]});}}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/localize',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({image,product:report.context.product,facts:report.context.facts,audit:report.original})});
  assert.equal(response.status,200);const {plan}=await response.json();assert.equal(plan.coordinates_basis,'source_ocr');assert.equal(calls,1);
  assert.ok((plan.edits[2].box.y+plan.edits[2].box.height)*1254>=813);
  assert.deepEqual(plan.edits.map(e=>e.replacement),['Power consumption: 5 watts','Light color: Warm white (3000K)','Power source: USB 5V']);
 }finally{await new Promise(r=>server.close(r));}
});
