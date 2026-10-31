// Non-billable checks only. Never accepts a real judge code or calls a model.
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export const assets={
  '/':'index.html','/app':'app.html','/docs':'docs.html',
  '/styles.css':'styles.css','/studio.css':'studio.css','/app.js':'app.js',
  '/i18n.js':'i18n.js','/local-recovery.js':'local-recovery.js','/claim-engine.js':'claim-engine.js',
  '/proof-studio.js':'proof-studio.js','/repair-guard.js':'repair-guard.js',
  '/audit-archive.js':'audit-archive.js','/visual-consistency.js':'visual-consistency.js','/output-system.js':'output-system.js','/consistency-ui.js':'consistency-ui.js'
};
const hash=value=>createHash('sha256').update(value).digest('hex');
export async function smoke({origin='https://adproof-ai.vercel.app',fetcher=fetch,readAsset=name=>readFile(path.join(root,'public',name))}={}){
  const url=new URL(origin);
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Use a plain origin without credentials or query parameters.');
  const report={checked_at:new Date().toISOString(),origin:url.origin,paid_model_calls:0,assets:[],access:[]};
  for(const [route,file] of Object.entries(assets)){
    const res=await fetcher(new URL(route,url),{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});
    if(res.status!==200)throw Error(`${route}: HTTP ${res.status}`);
    const actual=hash(Buffer.from(await res.arrayBuffer()));
    const expected=hash(await readAsset(file));
    if(actual!==expected)throw Error(`${route}: deployed bytes do not match checked-out source`);
    if(res.headers.get('x-content-type-options')!=='nosniff')throw Error(`${route}: missing nosniff header`);
    report.assets.push({path:route,status:200,sha256:actual,source_match:true});
  }
  const health=await fetcher(new URL('/api/health',url),{redirect:'error',signal:AbortSignal.timeout(20000)});
  const data=await health.json();
  if(health.status!==200||data.ok!==true||data.configured!==true||data.demoGate!==true)throw Error('Production health or private paid-access gate is not ready');
  report.health={status:health.status,configured:data.configured,demoGate:data.demoGate,textModel:data.textModel,imageModel:data.imageModel,provider_tested:false};
  const wrong=`noncredential-smoke-${randomUUID()}`;
  // Confirm the synthetic value is rejected before using it on paid routes.
  for(const route of ['/api/access','/api/audit','/api/improve'])for(const supplied of [false,true]){
    const res=await fetcher(new URL(route,url),{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',...(supplied?{'x-demo-code':wrong}:{})},body:'{}'});
    const expected=supplied?403:401;
    if(res.status!==expected)throw Error(`${route}: ${supplied?'invalid':'missing'} code returned ${res.status}, expected ${expected}`);
    const payload=await res.json();
    if(typeof payload.error!=='string')throw Error(`${route}: missing safe error response`);
    report.access.push({path:route,credential:supplied?'invalid':'missing',status:res.status});
  }
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  smoke({origin:process.env.ADPROOF_TEST_URL||undefined}).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
