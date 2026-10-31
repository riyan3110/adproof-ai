import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {matchesFormatCandidate} from '../public/consistency-ui.js';
import {readAuditJson} from '../public/audit-archive.js';
import {setPreference,t} from '../public/i18n.js';

test('one reviewed 16:9 composition serves every Website size without reusing another source/ratio',()=>{
 const candidate={input:'source-a',width:1600,height:900};
 for(const [width,height] of [[1600,900],[1920,1080],[2560,1440]])assert.equal(matchesFormatCandidate(candidate,'source-a',{category:'website',width,height}),true);
 assert.equal(matchesFormatCandidate(candidate,'source-b',{category:'website',width:1920,height:1080}),false);
 assert.equal(matchesFormatCandidate(candidate,'source-a',{category:'social',width:1080,height:1350}),false);
 assert.equal(matchesFormatCandidate(candidate,'source-a',{category:'print',width:1600,height:900}),true);
 assert.equal(matchesFormatCandidate(null,'source-a',{category:'website',width:1600,height:900}),false);
});

function liveAdapter(api){
 const state={formatHistory:[],runs:[],configured:true,initialAudit:{score:70},context:{},consistency:{}};
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const start=source.indexOf('async function adaptFormat('),end=source.indexOf('\nasync function performImprove',start);
 const context=vm.createContext({state,api,extendFlatBackground:async()=>null,compositeReferenceFrame:async()=>({image:'result',source_pixels_preserved:true}),payload:image=>({image}),validateCandidateImage:async()=>{},compactOriginalReference:async x=>x,
  getLanguage:()=> 'en',setBusy:v=>state.busy=v,updateMetaStatus:()=>{},inspectFormatCandidate:()=>({status:'failed',risks:[{code:'lock_typography',evidence:'Missing required text'}]}),reviewRepairCandidate:()=>({status:'review_required'}),visualUI:{readSettings:()=>({})}});
 return {state,run:vm.runInContext(source.slice(start,end)+';adaptFormat',context)};
}
test('paid image evidence remains exportable when separate audit fails; busy clears',async()=>{
 let calls=0;
 const {state,run}=liveAdapter(async()=>{if(++calls===2)throw Error('Meta timed out');return {image:'image-result',model:'muse-image-1.0',provenance:{provider:'Meta Model API'},repair_metadata:{model_dimensions:{width:1600,height:900}}};});
 await assert.rejects(run('source',{width:1600,height:900}),/timed out/);
 assert.equal(calls,2);assert.equal(state.runs.length,1);assert.equal(state.runs[0].stage,'format_image');
 assert.equal(state.formatHistory[0].status,'error');assert.equal(state.formatHistory[0].image.provider,'Meta Model API');assert.equal(state.busy,false);
});
test('complex print background follows the same Muse image and independent verification path',async()=>{
 const requests=[];
 const {state,run}=liveAdapter(async(path,body)=>{requests.push({path,body});return path==='/api/improve'?{image:'result',model:'muse-image-1.0'}:{audit:{score:70},original_reference_sent:true};});
 const result=await run('source',{width:1240,height:1754,print:true});
 assert.equal(requests.length,2);assert.equal(requests[0].path,'/api/improve');assert.equal(requests[0].body.target.print,true);
 assert.equal(requests[1].body.referenceImage,'source');assert.equal(state.formatHistory[0].status,'failed');
 assert.equal(result.review.status,'failed','print keeps all consistency findings');assert.equal(state.busy,false);
});
test('failed format review and both paid responses survive JSON export, with secrets stripped',async()=>{
 let calls=0;
 const {state,run}=liveAdapter(async()=>++calls===1?{image:'result',model:'muse-image-1.0',provenance:{provider:'Meta Model API'}}:{audit:{score:70},original_reference_sent:true,model:'muse-spark-1.3',tokens:321,provenance:{provider:'Meta Model API'}});
 const result=await run('source',{width:1080,height:1350});
 assert.equal(result.review.status,'failed');assert.equal(state.formatHistory[0].review.risks[0].code,'lock_typography');
 assert.equal(state.runs.length,2);assert.equal(state.runs[1].tokens,321);
 const base=JSON.parse(readFileSync(new URL('../evidence/live-2026-10-31/case-a/audit.json',import.meta.url),'utf8'));
 base.runs=[...state.runs,...state.runs,...state.runs,...state.runs,...state.runs];
 base.visual_consistency.format_history=state.formatHistory;
 base.visual_consistency.format_history[0].api_key='NEVER_EXPORT';
 const restored=readAuditJson(JSON.stringify(base));
 assert.equal(restored.runs.length,10);assert.equal(restored.visual_consistency.format_history[0].status,'failed');
 assert.ok(!JSON.stringify(restored).includes('NEVER_EXPORT'));assert.equal(state.busy,false);
});
test('judge access confirmation translates in Indonesian and returns to English',()=>{
 setPreference('id');assert.equal(t('Access verified ✓'),'Akses terverifikasi ✓');
 assert.ok(t('Enter the private demo code shared with you.').startsWith('Masukkan'));
 setPreference('en');assert.equal(t('Access verified ✓'),'Access verified ✓');setPreference('auto');
});
