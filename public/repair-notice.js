// Concise, evidence-aware Studio status. Detailed model observations remain in
// the audit and consistency report; never concatenate untrusted model prose
// into the prominent notice or imply a product is dangerous.
export function describeRepairNotice(repairReview, consistencyReview, language='id'){
  const id=language!=='en';
  const regression=repairReview?.status==='regression_suspected';
  if(consistencyReview?.status==='validated'&&!regression){
    if(consistencyReview.validation_basis==='independent_meta_comparison')return {level:'review',text:id
      ?'Perbandingan Meta AI selesai tanpa temuan penghambat. Hasil siap diekspor; ini bukan jaminan piksel identik.'
      :'Meta AI comparison completed without blocking findings. Output is available; this is not an exact-pixel guarantee.'};
    return {level:'review',text:id
      ?'Pemeriksaan otomatis selesai. Area di luar koreksi tetap terjaga.'
      :'Automatic checks completed. Areas outside the correction remained unchanged.'};
  }
  if(regression||consistencyReview?.status==='failed'){
    return {level:'warning',text:id
      ?'Revisi belum lolos pemeriksaan konsistensi. Ekspor revisi ditahan. Lihat rincian perubahan di bagian Pemeriksaan konsistensi.'
      :'The revision has not passed consistency checks. Revised export remains blocked. See the Consistency checks for details.'};
  }
  return {level:'review',text:id
    ?'Pemeriksaan konsistensi belum lengkap. Ekspor revisi ditahan sampai hasilnya dapat diverifikasi.'
    :'Consistency checks are incomplete. Revised export stays blocked until the result can be verified.'};
}
