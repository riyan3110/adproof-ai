// Deterministic budget guard for one follow-up Muse Image edit after an
// independently completed Muse Spark re-audit. Never infer success from scores.
const TEXT_RISKS=new Set(['unsupported_performance_copy','new_claim','unverified_added_text','removed_text_review','unresolved_creative_claim']);
const DIAGNOSTIC_LIMIT=5;
const str=(x,n)=>typeof x==='string'?x.trim().slice(0,n):'';
export function planOneCorrection({initial,verified,consistencyReview,repairReview,alreadyAttempted=false}={}){
 if(alreadyAttempted||!initial||!verified||consistencyReview?.status!=='failed')
  return {allowed:false,reason:'no_grounded_failed_comparison_or_budget_exhausted'};
 const findings=[];
 for(const item of consistencyReview.risks||[]){
  const code=str(item?.code,45),evidence=str(item?.evidence,240);
  if(!evidence)continue;
  if(TEXT_RISKS.has(code)||code.startsWith('lock_')){
   findings.push({code,evidence});
  }
 }
 for(const claim of verified.claim_ledger||[]){
  if(claim?.origin!=='creative'||!['unsupported_by_supplied_facts','contradicted_by_supplied_facts'].includes(claim?.assessment))continue;
  const evidence=str(claim.claim,240);
  if(evidence)findings.push({code:'revised_claim',evidence});
 }
 for(const issue of verified.issues||[]){
  if(!['high','medium'].includes(issue?.severity)||!['Visual','Readability','Consistency','Claim'].includes(issue?.category))continue;
  const evidence=str(issue?.evidence,240);
  if(evidence)findings.push({code:'revised_issue',evidence});
 }
 const unique=[];
 for(const x of findings){
  if(unique.some(y=>y.code===x.code&&y.evidence.toLowerCase()===x.evidence.toLowerCase()))continue;
  unique.push(x);
  if(unique.length===DIAGNOSTIC_LIMIT)break;
 }
 if(!unique.length)return {allowed:false,reason:'no_specific_correction_target'};
 return {allowed:true,max_extra_image_requests:1,max_extra_audit_requests:1,diagnostics:unique,
  source:'original_image',reason:'specific_observed_regression'};
}
export function correctionPayload(baseline,plan){
 if(!plan?.allowed)throw Error('Unsubstantiated automatic correction was blocked.');
 return {
  issues:(Array.isArray(baseline?.issues)?baseline.issues:[]).slice(0,7),
  claims:(Array.isArray(baseline?.claim_ledger)?baseline.claim_ledger:[]).slice(0,8),
  correctionContext:plan.diagnostics
 };
}
