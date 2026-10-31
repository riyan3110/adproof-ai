// User-facing, evidence-based repair workflow. This is presentation only:
// no paid provider request, model judgment, approval or export decision here.
const hasValue=x=>typeof x==='string'&&x.trim().length>0;
const snippet=(x,n=100)=>hasValue(x)?x.trim().replace(/\s+/g,' ').slice(0,n):'';
const unsupported=new Set(['unsupported_by_supplied_facts','contradicted_by_supplied_facts']);
const mapLock={product_shape:['bentuk produk','product shape'],colors:['warna produk','product colors'],lighting:['pencahayaan','lighting'],background:['latar gambar','background'],composition:['ukuran atau posisi objek','object size or position'],typography:['tata letak teks','text layout'],branding:['logo dan identitas merek','brand identity']};
const mapRisks={
 unsupported_performance_copy:['klaim kinerja tanpa fakta pendukung','performance claim without supporting facts'],
 unverified_added_text:['teks baru yang belum terverifikasi','unverified added text'],
 removed_text_review:['teks penting yang mungkin hilang','possibly missing required text'],
 unresolved_creative_claim:['klaim yang belum sesuai dengan fakta produk','claim not grounded in product facts'],
 verified_caption_claim_regression:['klaim caption yang belum sesuai fakta','caption claim not grounded in facts'],
 new_claim:['klaim baru yang perlu diperiksa','new claim requiring review'],
};
export function repairJourney(state,{canRepair=false,canRetry=false,language='id'}={}){
 if(!state?.initialAudit)return {visible:false};
 const id=language!=='en',say=(a,b)=>id?a:b;
 const initial=state.initialAudit, after=state.verified, consistency=state.consistencyReview;
 const unsupportedClaim=(initial.claim_ledger||[]).find(c=>c?.origin==='creative'&&unsupported.has(c.assessment)&&hasValue(c.claim));
 const firstIssue=(initial.issues||[]).find(x=>hasValue(x?.title)||hasValue(x?.evidence));
 const target=unsupportedClaim
  ?say('Klaim gambar: ','Image claim: ')+snippet(unsupportedClaim.claim)
  :firstIssue?say('Temuan audit: ','Audit finding: ')+snippet(firstIssue.title||firstIssue.evidence)
  :say('Tidak ada masalah gambar yang jelas untuk diperbaiki.','No clearly evidenced image issue requires repair.');
 const action=unsupportedClaim
  ?say('Koreksi klaim sesuai fakta produk yang dimasukkan.','Correct the claim using supplied product facts.')
  :canRepair?say('Perbaiki bagian yang terdeteksi, pertahankan elemen lain.','Fix the observed issue while preserving unrelated elements.')
  :say('Periksa saran caption tanpa membuat ulang gambar.','Review the caption suggestion without regenerating the image.');
 const local=Boolean(state.repairMetadata?.local_repair);
 const plannedLocal=Boolean(initial.local_text_repair&&!state.revised);
 const method=state.revised
  ?local?say('Area teks diperbaiki secara lokal; perubahan piksel diperiksa terpisah.','Text regions were edited locally; pixel changes are checked separately.')
    :say('Kandidat diedit dari gambar sumber. Bandingkan hasil dan pemeriksaan ulang.','Candidate edited from the source. Compare it with the original and re-audit.')
  :plannedLocal?say('Jika area teks aman, ubah teks lokal tanpa menggambar ulang produk.','When the text region is safe, edit it locally without redrawing the product.')
  :say('AI mencoba revisi terarah, lalu memeriksa ulang hasilnya.','AI attempts a targeted edit and then re-checks the result.');
 const scoreIndependent=say('Skor tinggi saja tidak menyatakan revisi lolos.','A high score alone does not approve the revision.');
 let issue=target, result='',next='',button=null,phase='ready',guidance='';
 if(state.imported){
   phase='saved';result=say('Hasil tersimpan; tidak ada AI yang dipanggil saat pemulihan.','Saved results; no model called during recovery.');
   next=say('Pilih sumber pada bagian Lanjutkan audit untuk mengedit lagi.','Choose a source in Continue audit to edit again.');
 }else if(state.busy){
   phase='processing';result=say('Proses sedang berjalan. Hasil belum boleh dianggap selesai.','Processing. The result is not yet complete.');
   next=say('Pemeriksaan ulang mengikuti proses perbaikan.','Verification follows the repair.');
 }else if(after){
   if(consistency?.status==='validated'&&state.repairReview?.status!=='regression_suspected'){
     phase='passed';result=say('Revisi lolos pemeriksaan otomatis. Periksa gambar sebelum menyimpan.','Revision passed automated checks. Review the image before saving.');
     next=say('Bandingkan Asli dan Revisi, lalu pilih ukuran output.','Compare Original and Revised, then choose an output size.');
     button={action:'compare',label:say('Bandingkan hasil','Compare result')};
   }else{
     phase='blocked';result=say('Revisi belum lolos. Gambar asli dan kandidat tetap tersimpan; ekspor revisi ditahan.','Revision has not passed. Original and candidate are saved; revised export is blocked.');
     const lock=Object.entries(consistency?.locks||{}).find(([,v])=>v?.locked&&['changed','possible_change'].includes(v.status));
     const risk=(consistency?.risks||[]).find(x=>hasValue(x?.code)&&!String(x.code).startsWith('legacy_guard'));
     const detail=lock?say('Yang perlu dipulihkan: ','Restore: ')+(mapLock[lock[0]]?.[id?0:1]||lock[0])
       :risk?say('Yang perlu diperiksa: ','Check: ')+(mapRisks[risk.code]?.[id?0:1]||say('perubahan yang terdeteksi','observed changes'))
       :say('Bandingkan teks, produk, dan posisi elemen dengan sumber.','Compare text, product and layout against the original.');
     guidance=detail;
     next=canRetry
       ?say('Perbaikan tambahan dapat dicoba berdasarkan temuan audit ulang, lalu otomatis diperiksa lagi.','An extra correction can use observed re-audit findings and be checked again.')
       :say('Lihat perbandingan dan rincian konsistensi; jangan gunakan revisi yang belum lolos.','Review comparison and consistency details; do not use an unapproved revision.');
     button=canRetry?{action:'retry',label:say('Coba perbaiki lagi','Try another repair')}
       :{action:'compare',label:say('Bandingkan masalah','Compare issues')};
   }
 }else if(state.revised){
   phase='unverified';result=say('Kandidat revisi tersimpan. Verifikasi belum selesai.','Revised candidate saved. Verification is not complete.');
   next=say('Jalankan pemeriksaan ulang tanpa membuat gambar baru.','Recheck without generating another image.');
   button={action:'verify',label:say('Periksa ulang hasil','Recheck result')};
 }else if(canRepair){
   phase='ready';result=say('Belum diperbaiki.','Not repaired yet.');
   next=say('Klik sekali untuk memperbaiki gambar dan menjalankan pemeriksaan ulang otomatis.','Click once to repair the image and run automatic verification.');
   button={action:'repair',label:say('Perbaiki otomatis','Repair automatically')};
 }else{
   phase='no-image-fix';result=say('Tidak ada perbaikan gambar otomatis yang didukung temuan.','No evidence-grounded automatic image repair is needed.');
   next=say('Periksa caption yang disarankan.','Review the suggested caption.');
   button={action:'caption',label:say('Lihat saran caption','See caption suggestion')};
 }
 if(state.autoCorrection?.attempted&&state.revised&&after){
  guidance=[guidance,say('Satu koreksi tambahan sudah dicoba dalam alur ini.','One extra correction was attempted in this run.')].filter(Boolean).join(' · ');
 }
 return {visible:true,phase,title:say('Dari temuan ke perbaikan','From finding to repair'),
  issue,action,method,result,next,guidance,button,footnote:scoreIndependent};
}
