// Local, dependency-free AdProof audit archive. ZIP files use STORED entries
// (no compression); only our known archive entries are accepted on import.
// No server, model request, credentials or persistent browser storage.
const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});
const MAX_ARCHIVE=18*1024*1024;
const MAX_IMAGE=7*1024*1024;
const MAX_REPORT=2*1024*1024;
const FORMATS={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
const EXT_MIME={png:'image/png',jpg:'image/jpeg',webp:'image/webp'};
const u16=(v,n,x)=>v.setUint16(n,x,true);
const u32=(v,n,x)=>v.setUint32(n,x>>>0,true);
function assert(ok,msg){if(!ok)throw Error(msg);}
function view(buf){return new DataView(buf.buffer,buf.byteOffset,buf.byteLength);}
function zipCrc(bytes){
 let crc=0xffffffff;
 for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
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
function safeReportData(source){
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
 return {app,date:typeof date==='string'?date:null,product:typeof product==='string'?product.slice(0,130):ctx.product,
  context:{product:ctx.product,facts:ctx.facts,caption:ctx.caption},caption_scope:typeof caption_scope==='string'?caption_scope.slice(0,350):'The supplied caption is unchanged in both audits.',
  runs:Array.isArray(runs)?runs.slice(0,5).map(r=>({stage:String(r?.stage||'').slice(0,24),model:String(r?.model||'').slice(0,70),tokens:Number.isFinite(r?.tokens)?r.tokens:null,provenance:r?.provenance&&typeof r.provenance==='object'?{provider:String(r.provenance.provider||'').slice(0,90),model:String(r.provenance.model||'').slice(0,90),stage:String(r.provenance.stage||'').slice(0,24),completed_at:String(r.provenance.completed_at||'').slice(0,60),input_sha256:String(r.provenance.input_sha256||'').slice(0,64)}:null})):[],
  original,verified:verified||null,repair_review:repair_review&&typeof repair_review==='object'?repair_review:null,
  disclaimer:typeof disclaimer==='string'?disclaimer.slice(0,350):'Imported archive; not a new model verification.',
  archive_artifacts:archive_artifacts&&typeof archive_artifacts==='object'?archive_artifacts:null};
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
export function createAuditPackage(report,originalDataUrl,revisedDataUrl){
 const validated=safeReportData(report);
 assert(originalDataUrl,'Paket lengkap membutuhkan gambar asli. Unggah ulang gambar asli untuk membuat paket.');
 const original=fromImageDataUrl(originalDataUrl);
 const revised=revisedDataUrl?fromImageDataUrl(revisedDataUrl):null;
 const assets={original:'original.'+original.extension,revised:revised?'revised.'+revised.extension:null};
 const json={...validated,archive_format_version:1,archive_artifacts:assets,
  archive_note:'Local saved snapshot; import does not repeat or authenticate a Meta model call.'};
 const jsonBytes=encoder.encode(JSON.stringify(json,null,2));
 assert(jsonBytes.length<=MAX_REPORT,'Laporan JSON terlalu besar untuk paket.');
 const entries=[{name:'audit.json',bytes:jsonBytes},{name:assets.original,bytes:original.bytes}];
 if(revised)entries.push({name:assets.revised,bytes:revised.bytes});
 const blob=zipStored(entries);
 assert(blob.size<=MAX_ARCHIVE,'Paket ZIP melebihi batas ukuran.');
 return {blob,filenames:entries.map(e=>e.name)};
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
 assert(count===v.getUint16(eocd+8,true)&&count>=2&&count<=3,'Isi paket ZIP tidak sesuai format AdProof.');
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
  assert(name==='audit.json'||/^(original|revised)\.(png|jpg|webp)$/.test(name),'Paket ZIP berisi nama file tak dikenal.');
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
 assert(jsonBytes.length<=MAX_REPORT,'Laporan JSON dalam paket terlalu besar.');
 const report=readAuditJson(decoder.decode(jsonBytes));
 const artifacts=report.archive_artifacts;
 assert(artifacts&&typeof artifacts==='object'&&typeof artifacts.original==='string','Paket tidak mencantumkan gambar asli.');
 const originalBytes=entries.get(artifacts.original);
 assert(originalBytes,'Gambar asli tidak ditemukan dalam paket.');
 const original=toImageDataUrl(originalBytes);
 assert(artifacts.original==='original.'+original.extension,'Ekstensi gambar asli tidak sesuai format sebenarnya.');
 let revised=null;
 if(artifacts.revised!=null){
  assert(typeof artifacts.revised==='string','Nama gambar revisi tidak valid.');
  const revisedBytes=entries.get(artifacts.revised);
  assert(revisedBytes,'Gambar revisi tidak ditemukan dalam paket.');
  revised=toImageDataUrl(revisedBytes);
  assert(artifacts.revised==='revised.'+revised.extension,'Ekstensi gambar revisi tidak sesuai format sebenarnya.');
 }
 assert(entries.size===(revised?3:2),'Isi paket tidak sesuai daftar gambar laporan.');
 if(report.verified)assert(revised,'Audit ulang harus memiliki gambar revisi dalam paket.');
 return {report,original:original.dataUrl,revised:revised?.dataUrl||null,hasImages:true};
}
export async function openAuditFile(file){
 assert(file&&typeof file.arrayBuffer==='function','Pilih laporan .json atau paket .zip.');
 assert(file.size<=MAX_ARCHIVE,'Arsip melebihi 18 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.length>=4&&bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===3&&bytes[3]===4)
  return readAuditPackage(bytes);
 assert(file.name?.toLowerCase().endsWith('.json'),'File bukan laporan JSON atau paket ZIP.');
 return {report:readAuditJson(decoder.decode(bytes)),original:null,revised:null,hasImages:false};
}
