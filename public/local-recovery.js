// Browser-local recovery of the LAST successfully completed Studio milestone.
// IndexedDB persists a structured clone of report + image data URLs. Never store
// Judge Access credentials, Meta keys, API requests or an in-flight AI result.
// This is private to this browser origin and is NOT server-side backup.
const DB_NAME='adproof-studio-recovery-v1';
const STORE='snapshot';
const KEY='latest';
const VERSION=1;
const MAX_AGE=24*60*60*1000;
const MAX_TOTAL_CHARS=30*1024*1024;

const validImage=value=>typeof value==='string' &&
  /^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/]+=*$/.test(value) &&
  value.length<10*1024*1024;
function validReport(report){
 return report&&typeof report==='object'&&report.app==='AdProof AI' &&
  report.context && typeof report.context.product==='string' &&
  typeof report.context.facts==='string' &&
  typeof report.context.caption==='string' &&
  report.original && Number.isFinite(report.original.score) &&
  (!report.verified||Number.isFinite(report.verified.score));
}
function validSnapshot(record){
 if(!record||record.version!==VERSION||typeof record.savedAt!=='number'||
    record.savedAt>Date.now()+60_000||Date.now()-record.savedAt>MAX_AGE)return false;
 const snap=record.snapshot;
 if(!snap||!validReport(snap.report)||!validImage(snap.original))return false;
 if(snap.revised!==null && !validImage(snap.revised))return false;
 if(snap.revised && !Array.isArray(snap.report.runs))return false;
 if(snap.report.verified&&!snap.revised)return false;
 if(!Array.isArray(snap.history)||snap.history.length>8)return false;
 let text;
 try{text=JSON.stringify(snap.report).length + JSON.stringify(snap.history).length;}catch{return false;}
 return text+snap.original.length+(snap.revised?.length||0)<MAX_TOTAL_CHARS;
}
function openDB(){
 if(typeof indexedDB==='undefined')return Promise.reject(Error('IndexedDB unavailable'));
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,VERSION);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Browser storage unavailable'));
  req.onblocked=()=>reject(Error('Browser storage is blocked'));
 });
}
async function access(mode,verb,value){
 const db=await openDB();
 try{
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,mode);
   const object=tx.objectStore(STORE);
   const req=verb==='get'?object.get(KEY):verb==='put'?object.put(value,KEY):object.delete(KEY);
   let result;
   req.onsuccess=()=>{result=req.result;};
   tx.oncomplete=()=>resolve(result);
   tx.onerror=()=>reject(tx.error||Error('Local recovery storage failed'));
   tx.onabort=()=>reject(tx.error||Error('Local recovery storage aborted'));
  });
 }finally{db.close();}
}
export async function storeRecovery(snapshot){
 const record={version:VERSION,savedAt:Date.now(),snapshot};
 if(!validSnapshot(record))throw Error('Current Studio milestone cannot be saved safely');
 await access('readwrite','put',record);
 return true;
}
export async function retrieveRecovery(){
 const record=await access('readonly','get');
 if(!record)return null;
 if(!validSnapshot(record)){
  await access('readwrite','delete');
  return null;
 }
 return record.snapshot;
}
export async function removeRecovery(){await access('readwrite','delete');}
