import test from 'node:test';
import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {createAuditPackage,readAuditPackage,readAuditJson,openAuditFile,fromImageDataUrl,toImageDataUrl,sniffImageMime} from '../public/audit-archive.js';

const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XtyfFAAAAABJRU5ErkJggg==';
const original='data:image/png;base64,'+png;
const jpg=Uint8Array.from([255,216,255,224,0,16,74,70,73,70,0,1,2,3,255,217]);
const revised='data:image/webp;base64,'+Buffer.from(jpg).toString('base64'); // deliberately wrong declared MIME
const claim=(text,origin='creative',assessment='unsupported_by_supplied_facts')=>({claim:text,origin,assessment,reason:'Saved observation',recommended_action:'Review',fact_quote:''});
const initial={
 score:35,headline:'Visual needs review',summary:'Unsupported claims',
 recommended_caption:'5W lamp',checks:{claim:20,clarity:88,hierarchy:82,action:78},
 claim_ledger:[claim('Save up to 90% Electricity'),claim('LumaDesk Mini','creative','supported_by_supplied_facts')],
 issues:[{id:'1',title:'Unverified promise',category:'Claim',severity:'high',evidence:'Image and caption',suggestion:'Remove'}]
};
const verified={
 ...initial,score:58,headline:'Visual improved, but claims remain',
 claim_ledger:[claim('USB-C Powered'),claim('Save up to 90% electricity','caption')],
 issues:[{id:'2',title:'Unsupported connector',category:'Consistency',severity:'medium',evidence:'USB-C in image',suggestion:'Remove USB-C'}],
};
const oldReport={
 app:'AdProof AI',date:'2026-10-28T10:10:47.881Z',product:'LumaDesk Mini — LED Desk Lamp',
 context:{product:'LumaDesk Mini — LED Desk Lamp',facts:'Power source: USB 5V\nPower consumption: 5 watts',caption:'Save up to 90% electricity'},
 original:initial,verified,runs:[{stage:'initial',model:'muse-spark-1.3',tokens:7432,provenance:{provider:'Meta Model API',input_sha256:'a'.repeat(64)}}],
 claim_evolution:{entries:[{before:{claim:'old'},after:null,status:'not_redetected'}]},
 proof_constellation:{initial:{nodes:[]}},caption_scope:'Caption unchanged',
 repair_review:{status:'regression_suspected',auto_approved:false,reasons:['USB-C unsupported']},
 disclaimer:'Saved owner run'
};

test('old AdProof JSON import preserves original/verified observations without images and no auth secrets',async()=>{
 const file=new File([JSON.stringify({...oldReport,MODEL_API_KEY:'NEVER_COPY',DEMO_ACCESS_CODE:'NEVER_COPY'})],'adproof-audit.json',{type:'application/json'});
 const unpacked=await openAuditFile(file);
 assert.equal(unpacked.hasImages,false);
 assert.equal(unpacked.original,null);
 assert.equal(unpacked.revised,null);
 assert.equal(unpacked.report.original.score,35);
 assert.equal(unpacked.report.verified.score,58);
 assert.equal(unpacked.report.original.claim_ledger[0].claim,'Save up to 90% Electricity');
 assert.equal(unpacked.report.verified.claim_ledger[0].claim,'USB-C Powered');
 assert.equal(unpacked.report.context.caption,oldReport.context.caption);
 assert.ok(!JSON.stringify(unpacked.report).includes('NEVER_COPY'));
});

test('ZIP package restores BOTH images + original saved audit, preserving original analysis',async()=>{
 const {blob,filenames}=createAuditPackage(oldReport,original,revised);
 assert.equal(blob.type,'application/zip');
 assert.deepEqual(filenames,['audit.json','original.png','revised.jpg']);
 const output=readAuditPackage(new Uint8Array(await blob.arrayBuffer()));
 assert.equal(output.hasImages,true);
 assert.equal(output.report.original.score,35);
 assert.equal(output.report.verified.score,58);
 assert.deepEqual(output.report.repair_review.reasons,['USB-C unsupported']);
 assert.equal(output.original,original);
 assert.equal(fromImageDataUrl(output.revised).mime,'image/jpeg');
 assert.equal(output.report.archive_artifacts.original,'original.png');
 assert.equal(output.report.archive_artifacts.revised,'revised.jpg');
 const imported=await openAuditFile(new File([blob],'adproof-package.zip',{type:'application/zip'}));
 assert.equal(imported.report.context.product,oldReport.context.product);
});

test('signature wins over extension or wrongly declared MIME during single-image export',()=>{
 const parsed=fromImageDataUrl(revised);
 assert.equal(parsed.mime,'image/jpeg');
 assert.equal(parsed.extension,'jpg');
 assert.equal(sniffImageMime(parsed.bytes),'image/jpeg');
 assert.equal(toImageDataUrl(parsed.bytes).extension,'jpg');
 assert.equal(fromImageDataUrl(original).extension,'png');
 assert.throws(()=>fromImageDataUrl('data:image/png;base64,'+Buffer.from('not a real image').toString('base64')),/tidak berformat/i);
});

test('pre-repair package with only original and initial report also roundtrips',async()=>{
 const report={...oldReport,verified:null,repair_review:null};
 const {blob,filenames}=createAuditPackage(report,original,null);
 assert.deepEqual(filenames,['audit.json','original.png']);
 const output=readAuditPackage(new Uint8Array(await blob.arrayBuffer()));
 assert.equal(output.report.verified,null);
 assert.equal(output.revised,null);
});

test('tampered ZIP payload is rejected by CRC and does not produce model output',async()=>{
 const {blob}=createAuditPackage(oldReport,original,revised);
 const bytes=new Uint8Array(await blob.arrayBuffer());
 bytes[85]^=1;
 assert.throws(()=>readAuditPackage(bytes),/integritas|JSON tidak valid|ZIP tidak valid/i);
});

test('ZIP traversal filenames, duplicates and unknown files are rejected',async()=>{
 const {blob}=createAuditPackage(oldReport,original,revised);
 const bytes=new Uint8Array(await blob.arrayBuffer());
 const marker=Buffer.from('audit.json'),bad=Buffer.from('../evil.tx');
 const at=Buffer.from(bytes).lastIndexOf(marker);
 assert.ok(at>0);bytes.set(bad,at);
 assert.throws(()=>readAuditPackage(bytes),/nama file tak dikenal|Nama file ZIP tidak cocok/i);
});

test('reject unsupported ZIP compression without decompressing untrusted bytes',async()=>{
 const {blob}=createAuditPackage(oldReport,original,revised);
 const bytes=new Uint8Array(await blob.arrayBuffer());
 const central=bytes.findIndex((b,i)=>i+3<bytes.length&&b===0x50&&bytes[i+1]===0x4b&&bytes[i+2]===0x01&&bytes[i+3]===0x02);
 assert.ok(central>0);
 bytes[central+10]=8;bytes[central+11]=0;
 assert.throws(()=>readAuditPackage(bytes),/tanpa kompresi/i);
});

test('invalid report cannot be imported or converted to ZIP',()=>{
 assert.throws(()=>readAuditJson('{"app":"AdProof AI"}'),/Informasi produk/i);
 assert.throws(()=>readAuditJson('{broken'),/JSON tidak valid/i);
 assert.throws(()=>readAuditJson(JSON.stringify({...oldReport,original:{...initial,claim_ledger:Array(9).fill(claim('x'))}})),/tidak lengkap/i);
 assert.throws(()=>createAuditPackage(oldReport,null,revised),/gambar asli/i);
});

test('ZIP package never includes access codes or model credential fields from malicious reports',async()=>{
 const {blob}=createAuditPackage({...oldReport,MODEL_API_KEY:'SECRET_CANNOT_LEAK',DEMO_ACCESS_CODE:'SECRET_CANNOT_LEAK'},original,revised);
 const bytes=Buffer.from(await blob.arrayBuffer());
 assert.equal(bytes.includes(Buffer.from('SECRET_CANNOT_LEAK')),false);
});

test('file upload has a finite size cap before expensive parsing',async()=>{
 const huge=new File([new Uint8Array(18*1024*1024+1)],'bad.zip');
 await assert.rejects(()=>openAuditFile(huge),/18 MB/);
});

test('read JSON-only reports with a single initial audit, where verified is absent',()=>{
 const data=readAuditJson(JSON.stringify({...oldReport,verified:null,runs:[]}));
 assert.equal(data.original.score,35);
 assert.equal(data.verified,null);
});
