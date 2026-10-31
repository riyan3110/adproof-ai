// Shared source-bound repairs. Model selections never authorize invented copy.
export const REPAIR_VERSION='source-bound-1';
const clean=s=>typeof s==='string'?s.trim():'';
const norm=s=>clean(s).normalize('NFKC').replace(/\s+/g,' ').toLowerCase();
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
  if(!sourceLines.some(s=>norm(s)===norm(e.before)))return null;
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
