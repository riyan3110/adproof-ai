// Local, dependency-free AdProof audit archive. ZIP files use STORED entries
// (no compression); only our known archive entries are accepted on import.
// No server, model request, credentials or persistent browser storage.
const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});
const MAX_ARCHIVE=48*1024*1024;
const MAX_HISTORY=8;
const MAX_IMAGE=7*1024*1024;
const MAX_REPORT=2*1024*1024;
const FORMATS={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
const EXT_MIME={png:'image/png',jpg:'image/jpeg',webp:'image/webp'};
const u16=(v,n,x)=>v.setUint16(n,x,true);
const u32=(v,n,x)=>v.setUint32(n,x>>>0,true);
function assert(ok,msg){if(!ok)throw Error(msg);}
function view(buf){return new DataView(buf.buffer,buf.byteOffset,buf.byteLength);}
const CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{
 let crc=n;
 for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 return crc>>>0;
});
function zipCrc(bytes){
 let crc=0xffffffff;
 for(const byte of bytes)crc=(crc>>>8)^CRC_TABLE[(crc^byte)&255];
 return (crc^0xffffffff)>>>0;
}
export function sniffImageMime(bytes){
 if(bytes.length>=8 && bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71 && bytes[4]===13 && bytes[5]===10 && bytes[6]===26 && bytes[7]===10)return 'image/png';
 if(bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255)return 'image/jpeg';
 if(bytes.length>=12 && String.fromCharCode(...bytes.subarray(0,4))==='RIFF' && String.fromCharCode(...bytes.subarray(8,12))==='WEBP')return 'image/webp';
 return null;
}
export function fromImageDataUrl(value){
 assert(typeof value==='string','Data gambar tidak valid.');
 const match=/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/]+={0,2})$/.exec(value);
 assert(match,'Format data gambar harus PNG, JPG, atau WebP.');
 assert(match[2].length<MAX_IMAGE*1.4,'Gambar melebihi batas paket.');
 let binary;
 try{binary=atob(match[2]);}catch{throw Error('Data gambar tidak dapat dibaca.');}
 assert(binary.length>0&&binary.length<=MAX_IMAGE,'Ukuran gambar tidak valid.');
 const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));
 const mime=sniffImageMime(bytes);
 assert(mime,'File gambar tidak berformat PNG, JPEG atau WebP.');
 // Byte signature, not the claimed MIME string, determines the extension.
 return {bytes,mime,extension:FORMATS[mime]};
}
export function toImageDataUrl(bytes){
 assert(bytes instanceof Uint8Array && bytes.length>0 && bytes.length<=MAX_IMAGE,'Ukuran gambar arsip tidak valid.');
 const mime=sniffImageMime(bytes);
 assert(mime,'Arsip mengandung gambar yang tidak dikenali.');
 let encoded='';
 for(let i=0;i<bytes.length;i+=16384)encoded+=String.fromCharCode(...bytes.subarray(i,i+16384));
 return {dataUrl:'data:'+mime+';base64,'+btoa(encoded),mime,extension:FORMATS[mime]};
}
function safeReportData(source,{withHistory=true}={}){
 assert(source&&typeof source==='object'&&!Array.isArray(source),'Laporan audit harus berupa objek JSON.');
 assert(source.app==='AdProof AI','Ini bukan laporan AdProof AI yang dapat dipulihkan.');
 const context=source.context;
 assert(context&&typeof context==='object'&&
  typeof context.product==='string'&&context.product.length<=130&&
  typeof context.facts==='string'&&context.facts.length<=2500&&
  typeof context.caption==='string'&&context.caption.length<=1000,
  'Informasi produk/fakta/caption pada laporan tidak valid.');
 const checkAudit=(a)=>{
  if(a==null)return false;
  assert(a&&typeof a==='object'&&!Array.isArray(a)&&
    Number.isFinite(a.score)&&a.score>=0&&a.score<=100&&
    Array.isArray(a.issues)&&a.issues.length<=7&&
    Array.isArray(a.claim_ledger)&&a.claim_ledger.length<=8,
    'Data audit tidak lengkap atau formatnya tidak dikenal.');
  for(const item of a.issues)assert(item&&typeof item==='object'&&typeof item.title==='string'&&typeof item.category==='string'&&typeof item.evidence==='string'&&typeof item.suggestion==='string','Temuan audit tidak valid.');
  for(const c of a.claim_ledger)assert(c&&typeof c==='object'&&typeof c.claim==='string'&&typeof c.origin==='string'&&typeof c.assessment==='string','Data klaim audit tidak valid.');
  return true;
 };
 assert(checkAudit(source.original),'Audit awal tidak ditemukan.');
 if(source.verified!=null)checkAudit(source.verified);
 // Never read or restore untrusted stored auth keys, user-supplied script,
 // externally supplied proof graph edges or cached model "ready" flags.
 const {app,date,product,context:ctx,caption_scope,runs,original,verified,repair_review,disclaimer,archive_artifacts}=source;
 const result={
  app,date:typeof date==='string'?date:null,product:typeof product==='string'?product.slice(0,130):ctx.product,
  context:{product:ctx.product,facts:ctx.facts,caption:ctx.caption},
  caption_scope:typeof caption_scope==='string'?caption_scope.slice(0,350):'The supplied caption is unchanged in both audits.',
  runs:Array.isArray(runs)?runs.slice(0,8).map(r=>({
   stage:String(r?.stage||'').slice(0,32),model:String(r?.model||'').slice(0,70),
   tokens:Number.isFinite(r?.tokens)?r.tokens:null,
   origin:r?.origin==='saved_archive'?'saved_archive':null,
   provenance:r?.provenance&&typeof r.provenance==='object'?{
    provider:String(r.provenance.provider||'').slice(0,90),model:String(r.provenance.model||'').slice(0,90),
    stage:String(r.provenance.stage||'').slice(0,24),completed_at:String(r.provenance.completed_at||'').slice(0,60),
    input_sha256:String(r.provenance.input_sha256||'').slice(0,64)
   }:null
  })):[],
  original,verified:verified||null,
  repair_review:repair_review&&typeof repair_review==='object'?{
   status:repair_review.status==='regression_suspected'?'regression_suspected':'review_required',
   reasons:Array.isArray(repair_review.reasons)?repair_review.reasons.slice(0,8).map(x=>String(x).slice(0,400)):[],
   original_reference_sent:repair_review.original_reference_sent===true,
   basis:'model_selected_observations_not_pixel_certification',
   auto_approved:false
  }:null,
  disclaimer:typeof disclaimer==='string'?disclaimer.slice(0,350):'Imported archive; not a new model verification.',
  archive_artifacts:archive_artifacts&&typeof archive_artifacts==='object'?archive_artifacts:null
 };
 if(withHistory&&source.archive_history!==undefined){
  assert(Array.isArray(source.archive_history)&&source.archive_history.length<=MAX_HISTORY,'Riwayat audit terlalu banyak atau tidak valid.');
  result.archive_history=source.archive_history.map(item=>{
   assert(item&&typeof item==='object'&&['original','revised'].includes(item.from),'Sumber riwayat tidak valid.');
   const report=safeReportData(item.report,{withHistory:false});
   const assets=item.assets;
   assert(assets==null||(typeof assets==='object'&&typeof assets.original==='string'&&(assets.revised==null||typeof assets.revised==='string')),'Referensi gambar riwayat tidak valid.');
   return {from:item.from,report,assets:assets?{
    original:String(assets.original).slice(0,96),
    revised:assets.revised==null?null:String(assets.revised).slice(0,96)
   }:null};
  });
 }
 return result;
}
export function readAuditJson(text){
 assert(typeof text==='string'&&encoder.encode(text).length<=MAX_REPORT,'Ukuran laporan JSON terlalu besar.');
 let data;try{data=JSON.parse(text);}catch{throw Error('File laporan JSON tidak valid.');}
 return safeReportData(data);
}
function zipStored(entries){
 const locals=[],centrals=[];
 let offset=0,totalCentral=0;
 for(const entry of entries){
  const name=encoder.encode(entry.name),bytes=entry.bytes;
  assert(name.length<=100&&bytes.length<=MAX_IMAGE,'File arsip terlalu besar.');
  const crc=zipCrc(bytes);
  const local=new Uint8Array(30+name.length);let v=view(local);
  u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x0800);u16(v,8,0);u32(v,14,crc);
  u32(v,18,bytes.length);u32(v,22,bytes.length);u16(v,26,name.length);local.set(name,30);
  locals.push(local,bytes);
  const central=new Uint8Array(46+name.length);v=view(central);
  u32(v,0,0x02014b50);u16(v,4,20);u16(v,6,20);u16(v,8,0x0800);u16(v,10,0);
  u32(v,16,crc);u32(v,20,bytes.length);u32(v,24,bytes.length);u16(v,28,name.length);
  u32(v,42,offset);central.set(name,46);centrals.push(central);
  totalCentral+=central.length;offset+=local.length+bytes.length;
 }
 const end=new Uint8Array(22),dv=view(end);
 u32(dv,0,0x06054b50);u16(dv,8,entries.length);u16(dv,10,entries.length);
 u32(dv,12,totalCentral);u32(dv,16,offset);
 return new Blob([...locals,...centrals,end],{type:'application/zip'});
}
export function createAuditPackage(report,originalDataUrl,revisedDataUrl,history=[]){
 const validated=safeReportData(report);
 assert(Array.isArray(history)&&history.length<=MAX_HISTORY,'Batas riwayat tercapai. Simpan arsip sebelum memulai putaran tambahan.');
 assert(originalDataUrl,'Paket lengkap membutuhkan gambar asli.');
 const original=fromImageDataUrl(originalDataUrl);
 const revised=revisedDataUrl?fromImageDataUrl(revisedDataUrl):null;
 const assets={original:'original.'+original.extension,revised:revised?'revised.'+revised.extension:null};
 const entries=[{name:assets.original,bytes:original.bytes}];
 if(revised)entries.push({name:assets.revised,bytes:revised.bytes});
 const archive_history=history.map((item,i)=>{
  assert(item&&['original','revised'].includes(item.from),'Jenis sumber putaran tidak valid.');
  assert(item.original,'Gambar sumber riwayat '+(i+1)+' tidak tersedia. Riwayat tidak boleh dihapus.');
  const safe=safeReportData(item.report,{withHistory:false});
  const old=fromImageDataUrl(item.original),next=item.revised?fromImageDataUrl(item.revised):null;
  if(safe.verified)assert(next,'Riwayat yang sudah diverifikasi harus menyertakan gambar revisi.');
  const prefix='history/round'+String(i+1).padStart(2,'0')+'-';
  const names={original:prefix+'original.'+old.extension,revised:next?prefix+'revised.'+next.extension:null};
  entries.push({name:names.original,bytes:old.bytes});
  if(next)entries.push({name:names.revised,bytes:next.bytes});
  return {from:item.from,report:safe,assets:names};
 });
 const json={...validated,archive_format_version:2,archive_artifacts:assets,archive_history,
  archive_note:'Saved previous rounds. Import is not a fresh model run or Meta-signed evidence.'};
 const jsonBytes=encoder.encode(JSON.stringify(json,null,2));
 assert(jsonBytes.length<=MAX_REPORT,'JSON riwayat melebihi batas ukuran.');
 const blob=zipStored([{name:'audit.json',bytes:jsonBytes},...entries]);
 assert(blob.size<=MAX_ARCHIVE,'Paket melebihi 48 MB. Riwayat tidak dihapus; simpan arsip lama dan kurangi ukuran gambar.');
 return {blob,filenames:['audit.json',...entries.map(e=>e.name)]};
}
function unzipStored(input){
 assert(input instanceof Uint8Array&&input.length>22&&input.length<=MAX_ARCHIVE,'File ZIP tidak valid atau terlalu besar.');
 const v=view(input);let eocd=-1;
 for(let i=input.length-22;i>=Math.max(0,input.length-65557);i--){
  if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===input.length){eocd=i;break;}
 }
 assert(eocd>=0,'Format ZIP tidak dikenali.');
 assert(v.getUint16(eocd+4,true)===0&&v.getUint16(eocd+6,true)===0,'ZIP multi-disk tidak didukung.');
 const count=v.getUint16(eocd+10,true), size=v.getUint32(eocd+12,true), start=v.getUint32(eocd+16,true);
 assert(count===v.getUint16(eocd+8,true)&&count>=2&&count<=3+2*MAX_HISTORY,'Isi paket ZIP tidak sesuai format AdProof.');
 assert(start+size===eocd,'Struktur ZIP tidak valid.');
 const output=new Map();let off=start;
 for(let i=0;i<count;i++){
  assert(off+46<=eocd&&v.getUint32(off,true)===0x02014b50,'Daftar file ZIP rusak.');
  const flags=v.getUint16(off+8,true),method=v.getUint16(off+10,true);
  const crc=v.getUint32(off+16,true),compressed=v.getUint32(off+20,true),raw=v.getUint32(off+24,true);
  const n=v.getUint16(off+28,true),extra=v.getUint16(off+30,true),comment=v.getUint16(off+32,true);
  const localOffset=v.getUint32(off+42,true);
  assert((flags&~0x0800)===0&&method===0&&raw===compressed&&raw<=MAX_IMAGE,'ZIP harus berisi file tanpa kompresi dan enkripsi.');
  assert(off+46+n+extra+comment<=eocd,'Nama file ZIP tidak lengkap.');
  let name;try{name=decoder.decode(input.subarray(off+46,off+46+n));}catch{throw Error('Nama file ZIP rusak.');}
  assert(name==='audit.json'||/^(original|revised)\.(png|jpg|webp)$/.test(name)||/^history\/round0[1-8]-(original|revised)\.(png|jpg|webp)$/.test(name),'Paket ZIP berisi nama file tak dikenal.');
  assert(!output.has(name),'Paket ZIP mengandung file ganda.');
  assert(localOffset+30<=start&&v.getUint32(localOffset,true)===0x04034b50,'Data file ZIP rusak.');
  const localFlags=v.getUint16(localOffset+6,true),localMethod=v.getUint16(localOffset+8,true),
   localN=v.getUint16(localOffset+26,true),localExtra=v.getUint16(localOffset+28,true);
  assert(localFlags===flags&&localMethod===method,'Header ZIP tidak cocok.');
  const localName=decoder.decode(input.subarray(localOffset+30,localOffset+30+localN));
  assert(localName===name,'Nama file ZIP tidak cocok.');
  const dataStart=localOffset+30+localN+localExtra;
  assert(dataStart+raw<=start,'Ukuran file ZIP tidak valid.');
  const bytes=input.subarray(dataStart,dataStart+raw);
  assert(zipCrc(bytes)===crc,'Pemeriksaan integritas file ZIP gagal.');
  output.set(name,bytes);
  off+=46+n+extra+comment;
 }
 assert(off===eocd&&output.has('audit.json'),'File laporan tidak ditemukan di paket ZIP.');
 return output;
}
export function readAuditPackage(bytes){
 const entries=unzipStored(bytes),jsonBytes=entries.get('audit.json');
 assert(jsonBytes.length<=MAX_REPORT,'Laporan JSON dalam ZIP terlalu besar.');
 const report=readAuditJson(decoder.decode(jsonBytes));
 const artifacts=report.archive_artifacts;
 assert(artifacts&&typeof artifacts==='object'&&typeof artifacts.original==='string','Gambar sumber tidak terdaftar.');
 const unpackImage=(name,prefix)=>{
  assert(typeof name==='string','Nama gambar arsip tidak valid.');
  const bytes=entries.get(name);
  assert(bytes,'File gambar arsip tidak ditemukan: '+prefix);
  const image=toImageDataUrl(bytes);
  assert(name===prefix+'.'+image.extension,'Ekstensi tidak sesuai format gambar sebenarnya.');
  return image.dataUrl;
 };
 const original=unpackImage(artifacts.original,'original');
 const revised=artifacts.revised==null?null:unpackImage(artifacts.revised,'revised');
 if(report.verified)assert(revised,'Audit ulang memerlukan gambar revisi.');
 let expected=revised?3:2;
 const history=(report.archive_history||[]).map((item,i)=>{
  const prefix='history/round'+String(i+1).padStart(2,'0')+'-';
  assert(item.assets&&typeof item.assets==='object','Referensi gambar riwayat tidak ada.');
  const old=unpackImage(item.assets.original,prefix+'original');
  const next=item.assets.revised==null?null:unpackImage(item.assets.revised,prefix+'revised');
  if(item.report.verified)assert(next,'Riwayat yang diverifikasi memerlukan gambar revisi.');
  expected+=next?2:1;
  return {from:item.from,report:item.report,original:old,revised:next};
 });
 assert(entries.size===expected,'Isi paket tidak cocok dengan daftar riwayat.');
 return {report,original,revised,history,hasImages:true};
}
export async function openAuditFile(file){
 assert(file&&typeof file.arrayBuffer==='function','Pilih laporan .json atau paket .zip.');
 assert(file.size<=MAX_ARCHIVE,'Arsip melebihi 48 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.length>=4&&bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===3&&bytes[3]===4)
  return readAuditPackage(bytes);
 assert(file.name?.toLowerCase().endsWith('.json'),'File bukan laporan JSON atau paket ZIP.');
 const report=readAuditJson(decoder.decode(bytes));
 return {report,original:null,revised:null,history:(report.archive_history||[]).map(item=>({from:item.from,report:item.report,original:null,revised:null})),hasImages:false};
}
