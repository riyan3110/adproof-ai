import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const start=source.indexOf('async function verifyArchivedRevision(){');
const end=source.indexOf("\nui.verifyArchived.addEventListener",start);
test('explicit archived comparison keeps original, revision and source audit and invokes only one re-audit',async()=>{
 const state={imported:true,configured:true,busy:false,importing:false,original:'original-pixels',revised:'repaired-pixels',initialAudit:{score:62},verified:{score:93},history:[],runs:[{stage:'initial'}]};
 const ui={product:{readOnly:true},facts:{readOnly:true},caption:{readOnly:true},archiveLanguageNote:{},archiveNotice:{}};
 const calls=[],snap={saved:'failed comparison'};
 const context=vm.createContext({state,ui,reportSnapshot:()=>snap,getLanguage:()=> 'en',notify:()=>{},syncDeck:()=>{},performAudit:async(image,verify)=>calls.push({image,verify,baseline:state.initialAudit.score,original:state.original,imported:state.imported})});
 const run=vm.runInContext(source.slice(start,end)+';verifyArchivedRevision',context);
 assert.equal(calls.length,0,'restoration alone never initiates inference');
 await run();
 assert.deepEqual(calls,[{image:'repaired-pixels',verify:true,baseline:62,original:'original-pixels',imported:false}]);
 assert.equal(state.history[0].report,snap);
 assert.equal(state.history[0].original,'original-pixels');assert.equal(state.history[0].revised,'repaired-pixels');
 assert.equal(state.verified.score,93,'old result remains available if the new request fails');
 await run();assert.equal(calls.length,1,'cannot repeat archive continuation after entering live state');
});
test('missing archive pixels or full history cannot trigger an archived provider request',async()=>{
 for(const patch of [{original:null},{revised:null},{initialAudit:null},{history:Array(8).fill({})},{configured:false},{busy:true},{imported:false}]){
  const state={imported:true,configured:true,original:'o',revised:'r',initialAudit:{score:1},history:[],...patch};let calls=0;
  const context=vm.createContext({state,notify:()=>{},performAudit:async()=>calls++});
  const run=vm.runInContext(source.slice(start,end)+';verifyArchivedRevision',context);await run();assert.equal(calls,0);
 }
});
