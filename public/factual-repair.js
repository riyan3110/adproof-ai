// Shared source-bound repairs. Model selections never authorize invented copy.
export const REPAIR_VERSION='source-bound-1';
const clean=s=>typeof s==='string'?s.trim():'';
const norm=s=>clean(s).normalize('NFKC').replace(/\s+/g,' ').toLowerCase();
// OCR inventories contain visual lines, while the factual ledger contains
// complete assertions. Match only whole, consecutive source lines. Never use
// fuzzy words/substrings: numbers, negation and non-adjacent text must agree.
export function observedTextSpans(text,lines){
 const target=norm(text),source=(Array.isArray(lines)?lines:[]).map(norm);
 const spans=[];
 if(!target)return spans;
 for(let start=0;start<source.length;start++){
  let group='';
  for(let end=start;end<Math.min(source.length,start+8);end++){
   if(!source[end])break;
   group+=(group?' ':'')+source[end];
   if(group===target){spans.push({start,end:end+1});break;}
   if(group.length>=target.length)break;
  }
 }
 return spans;
}
export const observedTextGroup=(text,lines)=>observedTextSpans(text,lines).length>0;
// Compare content independently of the model's visual line wrapping. A match
// still requires exactly the same complete source words in the same order.
export function inventoryDelta(original,revised){
 const preserved=(lines,reference)=>{
  const keep=new Set();
  lines.forEach((line,index)=>{if(observedTextGroup(line,reference))keep.add(index);});
  for(const line of reference)for(const span of observedTextSpans(line,lines)){
   for(let index=span.start;index<span.end;index++)keep.add(index);
  }
  return keep;
 };
 const oldLines=Array.isArray(original)?original:[],newLines=Array.isArray(revised)?revised:[];
 const oldKeep=preserved(oldLines,newLines),newKeep=preserved(newLines,oldLines);
 const removedIndices=oldLines.map((_,index)=>index).filter(index=>!oldKeep.has(index));
 const addedIndices=newLines.map((_,index)=>index).filter(index=>!newKeep.has(index));
 return {removed:removedIndices.map(index=>oldLines[index]),added:addedIndices.map(index=>newLines[index]),removedIndices,addedIndices};
}
export function factLines(facts){
 return String(facts||'').split(/\r?\n/).map(s=>s.replace(/^\s*[-*•]\s*/, '').trim()).filter(s=>s&&s.length<=350);
}
const unavailable=/\b(?:not specified|not provided|not verified|no verified|unverified|unknown|unspecified|belum|tidak (?:ada|diketahui|disebutkan)|tanpa bukti)\b/i;
const directive=/\b(?:ignore|disregard|instructions?|system prompt|abaikan|instruksi)\b/i;
export function repairCaption({product='',facts='',original='',selections=[]}={}){
 const available=factLines(facts).filter(s=>!unavailable.test(s)&&!directive.test(s));
 // Select complete source lines, not arbitrary substrings that can drop negation.
 const selected=[...new Set((Array.isArray(selections)?selections:[]).map(clean))]
  .filter(s=>available.includes(s)).slice(0,5);
 const chosen=selected.length?selected:available.slice(0,5);
 const title=clean(product).slice(0,130);
 let parts=chosen.filter(s=>!/^product\s*:/i.test(s)&&norm(s)!==norm(title))
  .map(source=>({text:source,fact_quote:source}));
 while([title,...parts.map(x=>x.text)].join('. ').length>900)parts.pop();
 const final=[title,...parts.map(x=>x.text)].filter(Boolean).join('. ');
 return {version:REPAIR_VERSION,original:String(original),final,status:'source_bound',
  method:selected.length?'meta_selected_verbatim_facts':'verbatim_fact_fallback',
  product_identity:title,statements:parts,verification:{status:'passed',basis:'complete_source_lines_and_exact_rendered_values',
   unsupported_sentences:0},basis:'seller_supplied_facts_not_independently_verified'};
}
// Fail closed when the independent Muse Spark re-audit disagrees with the
// source-bound caption. Previously the Studio overwrote these findings with
// 'source_bound' and could therefore incorrectly approve a revised image.
export function reviewRepairedCaption(repair,reaudit){
 const invalid=(Array.isArray(reaudit?.claim_ledger)?reaudit.claim_ledger:[])
  .filter(c=>c?.origin==='caption'&&
   ['unsupported_by_supplied_facts','contradicted_by_supplied_facts'].includes(c?.assessment));
 const issues=[...new Set(invalid.map(c=>clean(c.claim)).filter(Boolean))].slice(0,8);
 const sourceBound=repair?.status==='source_bound'&&repair?.verification?.status==='passed'
  &&typeof repair?.final==='string'&&repair.final.trim().length>0;
 return {status:issues.length?'failed':sourceBound?'source_bound':'unverified',
  unchanged:false,issues,model_observed_unsupported:invalid.length,
  scope:'Source-bound facts and only the model-selected caption claims; no exhaustive external truth certification.'};
}
export function validBox(b){return !!b&&['x','y','width','height'].every(k=>Number.isFinite(b[k]))&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0&&b.x+b.width<=1&&b.y+b.height<=1;}
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
export function normalizeLocalPlan(plan,audit,facts){
 if(!plan||plan.coverage!=='complete'||!Array.isArray(plan.edits)||!plan.edits.length||plan.edits.length>8)return null;
 const protectedRegions=(plan.protected_regions||[]).filter(validBox);
 if(!protectedRegions.length)return null;
 const sourceLines=audit?.text_inventory?.lines||[];
 const lines=factLines(facts);
 const bad=(audit?.claim_ledger||[]).filter(c=>c.origin==='creative'&&['unsupported_by_supplied_facts','contradicted_by_supplied_facts','unreadable'].includes(c.assessment));
 const edits=[];
 for(const e of plan.edits){
  if(!validBox(e?.box)||e.box.width*e.box.height>.16||!['solid','complex'].includes(e.background)||!clean(e.before)||e.before.length>350)return null;
  if(protectedRegions.some(b=>overlaps(e.box,b))||edits.some(x=>overlaps(e.box,x.box)))return null;
  if(!observedTextGroup(e.before,sourceLines))return null;
  const target=bad.some(c=>norm(c.claim)===norm(e.before))||(audit.issues||[]).some(i=>['Claim','Readability'].includes(i.category)&&norm(i.evidence).includes(norm(e.before)));
  if(!target)return null;
  // Replacement text is an entire supplied fact line (or deletion). No paraphrase.
  const replacement=clean(e.replacement);
  if(replacement&&!lines.includes(replacement))return null;
  edits.push({before:e.before,replacement,background:e.background,box:{...e.box}});
 }
 // Every evidenced creative claim/issue must be accounted for; otherwise use
 // the existing bounded image-model path, not an incomplete text repair.
 if(bad.some(c=>!edits.some(e=>norm(e.before)===norm(c.claim))))return null;
 if(edits.reduce((area,e)=>area+e.box.width*e.box.height,0)>.3)return null;
 if((audit.issues||[]).some(i=>!/^caption\s*:/i.test(i.evidence||'')&&
  (!['Claim','Readability'].includes(i.category)||!edits.some(e=>norm(i.evidence).includes(norm(e.before))))))return null;
 return {version:REPAIR_VERSION,coverage:'complete',edits,protected_regions:protectedRegions};
}


// For a copy-only defect, never replace the whole photograph merely because
// the first audit did not return coordinates. Run a bounded localization pass.
export function isTextOnlyRepair(audit){
 const issues=Array.isArray(audit?.issues)?audit.issues:[];
 const claims=Array.isArray(audit?.claim_ledger)?audit.claim_ledger:[];
 const bad=claims.filter(c=>c?.origin==='creative'&&['unsupported_by_supplied_facts','contradicted_by_supplied_facts'].includes(c.assessment));
 if(!bad.length||!issues.every(i=>['Claim','Readability'].includes(i?.category)))return false;
 return issues.length>0;
}
