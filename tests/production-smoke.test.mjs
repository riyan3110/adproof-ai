import test from 'node:test';
import assert from 'node:assert/strict';
import {smoke,assets} from '../scripts/production-smoke.mjs';
function fixture({stale=false,gate=true,acceptWrong=false}={}){
 const requests=[];
 return {requests,readAsset:async name=>Buffer.from(name),fetcher:async(url,options)=>{
  const route=new URL(url).pathname;requests.push({route,options});
  if(route==='/api/health')return Response.json({ok:true,configured:true,demoGate:gate});
  if(route.startsWith('/api/'))return Response.json({error:'Rejected'},{status:options.headers['x-demo-code']?(acceptWrong?200:403):401});
  const {assets}=await import('../scripts/production-smoke.mjs');
  return new Response(stale?'old-build':assets[route],{headers:{'x-content-type-options':'nosniff'}});
 }};
}
test('release smoke rejects stale HTTP 200 assets before API requests',async()=>{
 const f=fixture({stale:true});await assert.rejects(smoke(f),/do not match/);assert.equal(f.requests.length,1);
});
test('release smoke confirms source hashes and rejection of missing/wrong codes without credentials',async()=>{
 const f=fixture();const report=await smoke(f);
 assert.equal(report.assets.length,Object.keys(assets).length);assert.equal(report.access.length,6);assert.equal(report.paid_model_calls,0);
 assert.equal(report.health.provider_tested,false);
 assert.ok(f.requests.filter(x=>x.options.method==='POST').every(x=>x.options.body==='{}'));
});
test('release smoke stops on absent gate or an accepted synthetic credential',async()=>{
 for(const config of [{gate:false},{acceptWrong:true}]){
  const f=fixture(config);await assert.rejects(smoke(f));
  assert.equal(f.requests.some(x=>x.route==='/api/audit'),false);
 }
});
