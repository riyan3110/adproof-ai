import {normalizeClaim} from './claim-engine.js';

// Conservative guard over two model-selected reports, not independent image
// measurement. It never certifies an edit as safe or visually superior.
const RISK_CATEGORIES=new Set(['Visual','Readability','Consistency']);
const UNSUPPORTED=new Set(['unsupported_by_supplied_facts','contradicted_by_supplied_facts']);

export function reviewRepairCandidate(initial, revised, {originalReferenceSent=false}={}){
  const reasons=[];
  const before=Array.isArray(initial?.claim_ledger)?initial.claim_ledger:[];
  const after=Array.isArray(revised?.claim_ledger)?revised.claim_ledger:[];
  if(!initial || !revised){
    return {status:'review_required',reasons:['Hasil audit sebelum dan sesudah belum lengkap.'],original_reference_sent:originalReferenceSent,basis:'model_selected_observations_not_pixel_certification'};
  }
  const priorCreative=new Set(before.filter(c=>c?.origin==='creative').map(c=>normalizeClaim(c.claim)).filter(Boolean));
  const newlyUnsupported=after.filter(c=>c?.origin==='creative' && UNSUPPORTED.has(c.assessment)
    && normalizeClaim(c.claim) && !priorCreative.has(normalizeClaim(c.claim)));
  if(newlyUnsupported.length){
    reasons.push('Klaim produk pada gambar revisi belum didukung fakta input: '+newlyUnsupported.slice(0,3).map(c=>c.claim).join('; ')+'.');
  }
  const visualFindings=(Array.isArray(revised.issues)?revised.issues:[])
    .filter(i=>RISK_CATEGORIES.has(i?.category) && ['high','medium'].includes(i?.severity));
  if(visualFindings.length){
    reasons.push('Audit revisi masih menemukan potensi masalah visual/struktur/keterbacaan: '+visualFindings.slice(0,2).map(i=>i.title).join('; ')+'.');
  }
  for(const key of ['clarity','hierarchy']){
    const previous=initial.checks?.[key],current=revised.checks?.[key];
    if(Number.isFinite(previous) && Number.isFinite(current) && previous-current>=5){
      reasons.push('Perkiraan skor '+(key==='clarity'?'keterbacaan':'tata letak')+' turun '+(previous-current)+' poin.');
    }
  }
  const suspected=reasons.length>0;
  if(!originalReferenceSent) reasons.push('Gambar asli tidak disertakan dalam audit perbandingan; bentuk dan detail produk belum dapat dibandingkan.');
  if(!suspected)reasons.push('Belum ada bukti cukup untuk menyatakan hasil edit lebih baik: tetap bandingkan bentuk produk, perspektif, tepi, bayangan dan teks secara manual.');
  return {
    status:suspected?'regression_suspected':'review_required',
    reasons,
    original_reference_sent:Boolean(originalReferenceSent),
    basis:'model_selected_observations_not_pixel_certification',
    auto_approved:false,
  };
}
