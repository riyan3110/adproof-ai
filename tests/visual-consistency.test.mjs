import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {STYLES,LOCKS,POLICY_VERSION,normalizeSettings,policyPrompt,normalizeInspection,inspectConsistency,inspectFormatCandidate,hasRepairTarget} from '../public/visual-consistency.js';
import {outputPlan,assessOutputQuality,pngDensity} from '../public/output-system.js';
import {imageDimensions} from '../consistency-server.mjs';
import {createHandler} from '../server.mjs';
import {createAuditPackage,readAuditPackage} from '../public/audit-archive.js';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XtyfFAAAAABJRU5ErkJggg==';
const issues=[{title:'Unsupported claim',category:'Claim',severity:'high',evidence:'Image says 90% savings',suggestion:'Remove savings claim'}];
const inventory=lines=>({lines,coverage:'complete',limitations:''});
const observation=(extra={})=>normalizeInspection({original_text:inventory(['Lamp','5 W']),revised_text:inventory(['Lamp','5 W']),new_claims:[],changed_text:[],visual:Object.fromEntries(Object.keys(LOCKS).map(k=>[k,{status:'preserved',evidence:'Model sees matching '+k}])),...extra},'Lamp uses 5 W');
let testRemoteId=0;
async function invoke(body,fetcher){let status,data;await createHandler({key:'mock-only',fetcher})({method:'POST',url:'/api/improve',body,headers:{},socket:{remoteAddress:'unit-'+(++testRemoteId)}},{setHeader(){},writeHead(s){status=s;},end(x){data=JSON.parse(x);}});return {status,data};}
const input={image,product:'Lamp',facts:'Lamp uses 5 W',issues};
test('12 style contracts are distinct with all five explicit dimensions; stable versioned digest',()=>{
 assert.equal(Object.keys(STYLES).length,12);const prompts=Object.keys(STYLES).map(style=>policyPrompt({style}));assert.equal(new Set(prompts).size,12);
 for(const p of Object.values(STYLES))for(const key of ['color','lighting','texture','composition','boundary'])assert.ok(p[key].length>25);
 assert.equal(POLICY_VERSION,'visual-consistency-1');
 assert.equal(createHash('sha256').update(JSON.stringify(STYLES)).digest('hex'),'eb49dc7ee7618e9e523fb10c17d469c5d7503bc6740c1d2bd80b24a40fc58cbd');
});
test('every lock changes actual backend payload, is recorded, and lock priority is explicit',async()=>{
 for(const key of Object.keys(LOCKS)){
  let sent;const r=await invoke({...input,consistency:{style:'luxury',locks:{[key]:false}}},async(url,opts)=>{sent=JSON.parse(opts.body);return Response.json({model:'muse-image-1.0',data:[{b64_json:image.split(',')[1]}]});});
  assert.equal(r.status,200);assert.match(sent.prompt,new RegExp(key+': OFF'));assert.ok(sent.prompt.includes('Locked properties override conflicting style'));assert.equal(r.data.repair_metadata.settings.locks[key],false);
  assert.equal(sent.tool_enablement.enable_web_search,false);assert.equal(sent.mask,undefined);assert.deepEqual(r.data.repair_metadata.model_dimensions,{width:1,height:1});
 }
});
test('server rejects empty/caption-only repair and invalid image before paid calls',async()=>{
 for(const body of [{...input,issues:[]},{...input,issues:[{...issues[0],evidence:'Caption: savings'}]},{...input,image:'data:image/png;base64,'+'A'.repeat(128)}]){
  const r=await invoke(body,()=>{throw Error('must not call');});assert.equal(r.status,400);
 }
 assert.equal(hasRepairTarget({issues:[]}),false);
});
test('Energy-efficient LED missed by the eight-claim ledger still fails with a higher score',()=>{
 const revised={score:99,claim_ledger:[],consistency:observation({revised_text:inventory(['Lamp','5 W','Energy-efficient LED']),new_claims:[{text:'Energy-efficient LED',assessment:'unsupported',fact_quote:'',evidence:'Not in facts'}]})};
 const r=inspectConsistency({score:42},revised,{});assert.equal(r.status,'failed');assert.equal(r.auto_approved,false);assert.ok(r.text.added.includes('Energy-efficient LED'));assert.ok(r.risks.some(x=>x.code==='new_claim'));
});
test('new text remains blocked if omitted from new_claims; missing extraction never establishes preservation',()=>{
 const r=inspectConsistency({}, {consistency:observation({revised_text:inventory(['Lamp','5 W','99% Savings'])})},{});assert.equal(r.status,'failed');assert.ok(r.risks.some(x=>x.code==='unverified_added_text'));
 const unknown=inspectConsistency({score:42},{score:99},{});assert.equal(unknown.status,'review_required');assert.equal(unknown.locks.product_shape.status,'unable_to_verify');assert.equal(unknown.coverage,'partial_or_unknown');
});
test('model preserved alone is insufficient; dimensions/color/border changes flag locks',()=>{
 const r=inspectConsistency({}, {consistency:observation()}, {},{identical:false,aspect_delta:.1,mean_color_delta:.2,border_delta:.3,luminance_delta:.2});
 assert.equal(r.locks.product_shape.status,'unable_to_verify');assert.equal(r.locks.composition.status,'changed');assert.equal(r.locks.background.status,'possible_change');assert.equal(r.status,'failed');
 const same=inspectConsistency({}, {consistency:observation()}, {},{identical:true});assert.equal(same.locks.branding.status,'preserved');assert.equal(same.auto_approved,false);
});
test('quote checking and typography preserve source language; region validates bounds',()=>{
 const i=observation({new_claims:[{text:'Menghemat 90%',assessment:'supported',fact_quote:'invented quote'}]});assert.equal(i.new_claims[0].assessment,'uncertain');assert.equal(i.new_claims[0].text,'Menghemat 90%');
 assert.throws(()=>normalizeSettings({region:{x:.8,y:0,width:.3,height:.5}}));assert.deepEqual(normalizeSettings({region:{x:.1,y:.2,width:.3,height:.4}}).region,{x:.1,y:.2,width:.3,height:.4});
});
test('social/website exact output, print physical sizing, safe fit and explicit interpolation',()=>{
 const source={width:1000,height:500};const p=outputPlan(source,{category:'print',width:100,height:50,unit:'cm',ppi:150});assert.equal(p.width,5906);assert.equal(p.height,2953);assert.equal(p.upscaled,true);assert.equal(p.method,'browser_interpolation_no_new_detail');
 const square=outputPlan(source,{category:'social'});assert.equal(square.draw.width,1080);assert.equal(square.draw.height,540);assert.equal(square.draw.y,270);assert.equal(square.fit,'contain');
 assert.equal(outputPlan(source,{category:'website',preset:2}).width,2560);
 assert.throws(()=>outputPlan(source,{category:'print',width:1000,height:500,unit:'cm',ppi:300}));assert.throws(()=>outputPlan(source,{category:'print',width:-5,height:10,ppi:150}));
});
test('PNG dimensions and pHYs metadata are measured rather than claimed',()=>{
 const bytes=Buffer.from(image.split(',')[1],'base64');assert.deepEqual(imageDimensions(bytes),{width:1,height:1});assert.equal(imageDimensions(Buffer.from('not image')),null);
 const out=pngDensity(bytes,150);assert.deepEqual(imageDimensions(out),{width:1,height:1});const p=Buffer.from(out).indexOf('pHYs');assert.ok(p>0);assert.ok(p<Buffer.from(out).indexOf('IDAT'));assert.equal(new DataView(out.buffer).getUint32(p+4),5906);
});
test('new metadata roundtrips ZIP while old archives remain valid; no auth restoration',async()=>{
 const report={app:'AdProof AI',context:{product:'Lamp',facts:'Lamp uses 5 W',caption:''},original:{score:42,issues,claim_ledger:[]},visual_consistency:{settings:{style:'natural',locks:{lighting:false}},repair:{requested_model:'muse-image-1.0',returned_model:null,model_dimensions:{width:1,height:1},api_key:'secret'},verification:inspectConsistency({}, {consistency:observation()},{}),output_requested:{category:'print',width:100,height:50,unit:'cm',ppi:150},output_actual:{actual:{width:5906,height:2953},method:'browser_interpolation_no_new_detail'}}};
 report.visual_consistency.verification.locks.unknown={status:'preserved'};
 report.visual_consistency.verification.measurements={original:null};
 const archive=createAuditPackage(report,image,null);const restored=readAuditPackage(new Uint8Array(await archive.blob.arrayBuffer())).report.visual_consistency;
 assert.equal(restored.settings.style,'natural');assert.equal(restored.settings.locks.lighting,false);assert.equal(restored.output_actual.actual.width,5906);assert.equal(restored.verification.auto_approved,false);assert.equal(restored.repair.api_key,undefined);assert.equal(restored.verification.locks.unknown,undefined);assert.equal(restored.verification.measurements,null);
});

test('explicit AI reframe asks Muse for target aspect and records actual native size, not invented HD pixels',async()=>{
 const original=Buffer.from(image.split(',')[1],'base64');
 const mock=Buffer.from(original);mock.writeUInt32BE(9,16);mock.writeUInt32BE(16,20);
 let sent;
 const response=await invoke({...input,issues:[],mode:'reframe',target:{width:1080,height:1920}},async(url,opts)=>{
  sent=JSON.parse(opts.body);
  return Response.json({model:'muse-image-1.0',data:[{b64_json:mock.toString('base64')}]});
 });
 assert.equal(response.status,200);
 assert.equal(sent.size,'1080x1920');
 assert.match(sent.prompt,/Extend or rebuild ONLY surrounding scene/);
 assert.match(sent.prompt,/do not add flat blank margins/);
 assert.equal(response.data.repair_metadata.method,'reference_image_ai_recomposition_no_mask');
 assert.deepEqual(response.data.repair_metadata.model_dimensions,{width:9,height:16});
 assert.equal(response.data.repair_metadata.exact_pixels_promised,false);
 assert.equal(response.data.repair_metadata.requested_ratio,'1080x1920');
});
test('AI reframe rejects fake dimensions or unsupported format before a paid call',async()=>{
 for(const target of [{width:9000,height:1000},{width:1,height:1},null]){
  const out=await invoke({...input,issues:[],mode:'reframe',target},()=>{throw Error('must not call paid API');});
  assert.equal(out.status,400);
 }
 const out=await invoke({...input,issues:[],mode:'reframe',target:{width:1600,height:900}},async()=>Response.json({data:[{b64_json:image.split(',')[1]}]}));
 assert.equal(out.status,502,'provider returning wrong ratio must not pass as edge-to-edge output');
});
test('format adaptation still blocks unsupported new copy but does not flag intentional canvas extension itself',()=>{
 const baseline={score:50,claim_ledger:[],text_inventory:inventory(['Lamp','5 W'])};
 const after={score:85,claim_ledger:[],consistency:observation()};
 const r=inspectFormatCandidate(baseline,after,{});
 assert.equal(r.status,'review_required');
 assert.equal(r.auto_approved,false);
 assert.equal(r.original_locks.composition,true);
 assert.equal(r.locks.composition.locked,false);
 const unsafe=inspectFormatCandidate(baseline,{...after,consistency:observation({revised_text:inventory(['Lamp','5 W','90% savings'])})},{});
 assert.equal(unsafe.status,'failed');
 assert.ok(unsafe.risks.some(x=>x.code==='unverified_added_text'));
});

test('quality assessment distinguishes actual native pixels from interpolation and never certifies print',()=>{
 const social=assessOutputQuality(outputPlan({width:3000,height:3000},{category:'social',preset:0}));
 assert.equal(social.status,'native_pixels_sufficient');assert.equal(social.needs_interpolation,false);
 assert.equal(social.detail_added_by_ai,false);assert.equal(social.print_certified,false);
 const small=assessOutputQuality(outputPlan({width:540,height:540},{category:'social',preset:0}));
 assert.equal(small.status,'interpolated_not_native_detail');assert.equal(small.enlargement_factor,2);
 const draft=assessOutputQuality(outputPlan({width:1000,height:500},{category:'print',width:100,height:50,unit:'cm',ppi:150}));
 assert.equal(draft.status,'print_draft_only');assert.equal(draft.native_source_ppi,25);
 assert.equal(draft.max_native_print_mm.width_mm,169);
 assert.equal(draft.print_certified,false);
 const native=assessOutputQuality(outputPlan({width:6000,height:3000},{category:'print',width:100,height:50,unit:'cm',ppi:150}));
 assert.equal(native.status,'print_pixels_sufficient_manual_review');assert.equal(native.needs_interpolation,false);
 assert.equal(native.print_certified,false);
 const mismatched=assessOutputQuality(outputPlan({width:6000,height:6000},{category:'print',width:100,height:50,unit:'cm',ppi:150}));
 assert.equal(mismatched.contains_padding,true);
 assert.equal(mismatched.status,'print_draft_only');
});
