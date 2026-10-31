// Shared deterministic policy. Changes to wording require a preset version bump.
export const POLICY_VERSION='visual-consistency-2';
const style=(label,color,lighting,texture,composition,boundary)=>Object.freeze({label,color,lighting,texture,composition,boundary});
export const STYLES=Object.freeze({
 preserve:style('Auto / Preserve Original','Retain original palette and saturation.','Retain original light direction, exposure and contrast.','Retain original materials and rendering style.','Retain original layout and camera angle.','Only address evidenced defects; do not restyle.'),
 photorealistic:style('Photorealistic','Use plausible photographic colors.','Keep physically coherent light, shadows and reflections.','Use natural material texture; avoid plastic and CGI artifacts.','Keep realistic proportions and photographic perspective.','Never redesign the product to achieve realism.'),
 natural:style('Natural','Use natural colors without excessive saturation or contrast.','Use soft natural illumination when lighting is unlocked.','Keep realistic, unembellished surfaces.','Keep an ordinary believable setting and original placement.','Do not add decorative objects.'),
 studio:style('Studio Product','Use accurate product colors and restrained neutral surroundings.','Use consistent controlled studio illumination when unlocked.','Show faithful material and surface detail.','Prioritize product silhouette; retain locked background and placement.','Never invent product components.'),
 lifestyle:style('Lifestyle','Use balanced everyday environmental colors.','Use plausible ambient light when unlocked.','Keep tactile everyday materials.','Use the existing lived-in context; keep product scale believable.','Do not add people, props, features or use-case promises.'),
 cinematic:style('Cinematic','Use a restrained coherent film palette only where unlocked.','Use directional cinematic contrast only where unlocked.','Keep authentic texture without concealing defects.','Use existing framing; preserve product geometry and perspective.','Do not introduce dramatic objects or unreadable shadows.'),
 luxury:style('Luxury','Use restrained premium colors; avoid garish saturation.','Use elegant controlled illumination only if lighting is unlocked.','Keep refined but faithful material finish.','Keep deliberate spacing without changing product shape.','Never redesign the product for aesthetics.'),
 minimalist:style('Minimalist','Use a restrained palette without recoloring locked elements.','Use clean even illumination when unlocked.','Keep honest surface detail without embellishment.','Favor existing negative space; preserve locked layout.','Do not remove required text, product parts or branding.'),
 editorial:style('Editorial','Use a coherent publication palette while respecting original brand colors.','Use controlled editorial light when unlocked.','Keep detailed authentic material texture.','Use a clear editorial hierarchy within existing composition.','Do not add headlines, publication logos or endorsements.'),
 vibrant:style('Vibrant','Use lively but plausible saturation only where colors are unlocked.','Use clear energetic illumination without clipped highlights.','Keep natural materials without neon surface artifacts.','Keep a readable hierarchy and existing product position.','Do not add stickers, badges, offers or decorative objects.'),
 cgi:style('3D / CGI','Use coherent rendered colors only in unlocked areas.','Use physically coherent rendered lighting when unlocked.','Use a clean 3D rendering treatment without changing materials or geometry facts.','Preserve product structure, perspective and all locked elements.','Do not turn a faithful product into an invented 3D design.'),
 illustration:style('Illustration','Use a coherent illustrated palette only where unlocked.','Use consistent illustrated shading when unlocked.','Use illustrative surface treatment without erasing physical evidence.','Retain recognizable proportions, layout and camera view.','Never simplify away product parts, exact copy or branding.')
});
export const LOCKS=Object.freeze({
 product_shape:['Product Shape','Preserve silhouette, geometry, proportions, parts, connectors and material identity.'],
 colors:['Colors','Preserve product and scene colors, palette and saturation.'],
 lighting:['Lighting','Preserve exposure, light direction, shadows and reflections.'],
 background:['Background','Preserve background objects, surfaces and setting.'],
 composition:['Composition','Preserve layout, position, scale, perspective and camera angle.'],
 typography:['Typography','Preserve all correct text verbatim, font character and placement; change only explicitly identified erroneous copy.'],
 branding:['Branding','Preserve logos, trademarks, labels and brand identity exactly.']
});
export function normalizeSettings(value={}){
 const locksInput=value?.locks&&typeof value.locks==='object'?value.locks:{};
 return {version:POLICY_VERSION,style:Object.hasOwn(STYLES,value?.style)?value.style:'preserve',locks:Object.fromEntries(Object.keys(LOCKS).map(k=>[k,locksInput[k]!==false])),region:normalizeRegion(value?.region)};
}
export function normalizeRegion(r){
 if(!r)return null;
 const {x,y,width,height}=r;
 if(![x,y,width,height].every(Number.isFinite)||x<0||y<0||width<=0||height<=0||x+width>1.000001||y+height>1.000001)throw Error('Invalid repair region / Area perbaikan tidak valid.');
 return {x,y,width,height};
}
export function policyPrompt(value){
 const s=normalizeSettings(value),requested=STYLES[s.style],allLocked=Object.values(s.locks).every(Boolean),p=allLocked?STYLES.preserve:requested;
 return `POLICY ${s.version}. Priority, highest first: product facts and identity; claim safety/no invented specifications; user locks; evidenced repairs; style preferences. Unlocking NEVER authorizes invented product facts, logos or claims. Locked properties override conflicting style instructions; skip a conflicting style treatment.\nLOCK RULES:\n${Object.entries(LOCKS).map(([k,v])=>`${k}: ${s.locks[k]?'ON — '+v[1]:'OFF — changes only if needed for evidenced repair or selected style, within factual integrity.'}`).join('\n')}\nRequested style: ${requested.label}. ${allLocked?"All locks are ON. Style transformation is disabled; retain the source rendering medium and materials. Do not photograph or restage the creative.":"Apply style only where unlocked."}\nSTYLE ${p.label}:\nColor: ${p.color}\nLighting: ${p.lighting}\nTexture: ${p.texture}\nComposition: ${p.composition}\nLimits: ${p.boundary}\n${s.region?`Target rectangle normalized from top-left: ${JSON.stringify(s.region)}. Edit only that rectangle. The application will composite only this rectangle back into the original; keep coordinates and image layout identical.`:'No pixel mask is available. Keep all unrelated areas unchanged. If a local correction cannot be done reliably, preserve that part.'}`;
}
export function hasRepairTarget(a){
 return Boolean(a?.claim_ledger?.some(c=>c?.origin==='creative'&&['unsupported_by_supplied_facts','contradicted_by_supplied_facts'].includes(c.assessment)&&c.recommended_action?.trim())||a?.issues?.some(i=>i?.evidence?.trim()&&i?.suggestion?.trim()&&!/^caption\s*:/i.test(i.evidence.trim())));
}
const str=(x,n=500)=>typeof x==='string'?x.slice(0,n):'';
export function normalizeInspection(value,facts=''){
 if(!value||typeof value!=='object')return null;
 const inventory=v=>({coverage:['complete','partial','unreadable'].includes(v?.coverage)?v.coverage:'unreadable',limitations:str(v?.limitations),lines:Array.isArray(v?.lines)?v.lines.slice(0,128).map(x=>str(x,350)).filter(Boolean):[]});
 const supplied=facts.toLowerCase().replace(/\s+/g,' ');
 return {original_text:inventory(value.original_text),revised_text:inventory(value.revised_text),
  changed_text:Array.isArray(value.changed_text)?value.changed_text.slice(0,128).map(x=>({before:str(x?.before,350),after:str(x?.after,350),evidence:str(x?.evidence)})):[],
  new_claims:Array.isArray(value.new_claims)?value.new_claims.slice(0,128).map(c=>{
   const quote=str(c?.fact_quote,350);const valid=quote.length>=4&&supplied.includes(quote.toLowerCase().replace(/\s+/g,' '));
   return {text:str(c?.text,350),assessment:valid&&c?.assessment==='supported'?'supported':c?.assessment==='unsupported'?'unsupported':'uncertain',fact_quote:valid?quote:'',evidence:str(c?.evidence)};
  }):[],
  visual:Object.fromEntries(Object.keys(LOCKS).map(k=>{
   const v=value.visual?.[k],evidence=str(v?.evidence);
   return [k,{status:evidence&&['preserved','possible_change','changed'].includes(v?.status)?v.status:'unable_to_verify',evidence}];
  }))};
}
const norm=s=>String(s).normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();

// A narrow, deterministic backstop for measurable or comparative efficiency
// promises that a model's eight-claim sample may miss. This is NOT OCR or
// a general-purpose truth/entailment engine; unknown wording remains manual.
// Only match assertions in model-extracted REVISED image text, never user
// facts or original caption as if they were visible revised pixels.
const PERFORMANCE_COPY=/\b(?:efficient|efficiency|energy[ -]?saving|power[ -]?saving|less electricity|low[ -]?consumption|eco[ -]?friendly|efisien|efisiensi|hemat (?:energi|listrik)|ramah lingkungan)\b/i;
const DENIAL=/\b(?:no|not|without|unverified|unsupported|unproven|tidak|belum|tanpa|bukan|tak|non)\b/i;
export function unverifiedPerformanceText(lines,facts=''){
 const statements=String(facts).split(/[\n.!?;]/).map(s=>s.trim()).filter(Boolean);
 const evidenced=statements.some(s=>PERFORMANCE_COPY.test(s)&&!DENIAL.test(s));
 if(evidenced)return [];
 return (Array.isArray(lines)?lines:[]).filter(s=>typeof s==='string'&&PERFORMANCE_COPY.test(s)).slice(0,12);
}
export function inspectConsistency(initial,revised,settings,measurements=null,facts=''){
 const s=normalizeSettings(settings),i=revised?.consistency;
 const original=i?.original_text||initial?.text_inventory;
 const next=i?.revised_text||revised?.text_inventory;
 const oldLines=original?.lines||[],newLines=next?.lines||[];
 const added=newLines.filter(x=>!oldLines.some(y=>norm(x)===norm(y)));
 const removed=oldLines.filter(x=>!newLines.some(y=>norm(x)===norm(y)));
 const risks=[];
 // A model can mark a claim as supported just because 5W or LED appears
 // in the supplied facts. That does not establish an "efficient" promise.
 for(const text of unverifiedPerformanceText(newLines,facts)){
  risks.push({code:'unsupported_performance_copy',evidence:text});
 }
 // If text extraction is partial, missing a phrase here is not proof of safety.
 const coverage=original?.coverage==='complete'&&next?.coverage==='complete'&&oldLines.length<128&&newLines.length<128?'model_reports_complete':'partial_or_unknown';
 const locks=Object.fromEntries(Object.keys(LOCKS).map(k=>{
  const observation=i?.visual?.[k];
  // Model-only "preserved" is insufficient to certify a lock. Exact byte identity
  // is the only automated preserved outcome; otherwise human comparison remains.
  let status=measurements?.identical===true?'preserved':observation?.status==='preserved'?'unable_to_verify':observation?.status||'unable_to_verify';
  let evidence=observation?.evidence||'';
  if(status==='unable_to_verify'&&observation?.status==='preserved')evidence+=' [Model reports preserved; no independent pixel/semantic proof.]';
  if(measurements?.aspect_delta>0.02&&k==='composition'){status='changed';evidence+=' Aspect ratio changed >2%.';}
  if((k==='colors'&&measurements?.mean_color_delta>0.08)||(k==='lighting'&&measurements?.luminance_delta>0.08)||(k==='background'&&measurements?.border_delta>0.12)){
   if(status!=='changed')status='possible_change';evidence+=' Coarse pixel comparison crossed review threshold.';
  }
  if(s.locks[k]&&['changed','possible_change'].includes(status))risks.push({code:'lock_'+k,evidence});
  return [k,{locked:s.locks[k],status,evidence}];
 }));
 for(const claim of i?.new_claims||[])if(claim.assessment!=='supported')risks.push({code:'new_claim',evidence:claim.text});
 // Every newly observed text line must be accounted for, beyond the eight-claim ledger.
 for(const line of added){
  const classified=i?.new_claims?.find(c=>norm(c.text)===norm(line));
  if(!classified||classified.assessment!=='supported')risks.push({code:'unverified_added_text',evidence:line});
 }
 const unexplainedRemoval=removed.filter(line=>!initial?.claim_ledger?.some(c=>c.origin==='creative'&&['unsupported_by_supplied_facts','contradicted_by_supplied_facts'].includes(c.assessment)&&norm(c.claim)===norm(line)));
 if(s.locks.typography&&unexplainedRemoval.length)risks.push({code:'removed_text_review',evidence:unexplainedRemoval.join('; ').slice(0,700)});
 const unresolved=Object.values(locks).some(x=>x.locked&&x.status==='unable_to_verify');
 return {version:POLICY_VERSION,status:risks.length?'failed':'review_required',auto_approved:false,coverage,locks,text:{added,removed,changed:i?.changed_text||[],limitations:[original?.limitations,next?.limitations].filter(Boolean)},risks,measurements,
  limitations:['Model text extraction is not exhaustive OCR; added/removed are observations, not certified pixel edits.',...(unresolved?['Some locks could not be independently verified.']:[])]};
}

/**
 * Format adaptation intentionally extends the scene / changes the canvas ratio.
 * Those two differences cannot be judged as ordinary "preserve composition"
 * regressions. All product/claim/typography/brand locks remain conservative.
 * A model-only inspection never authorizes automatic approval.
 */
export function inspectFormatCandidate(baseline,adapted,settings,facts=''){
 const normalized=normalizeSettings(settings);
 const adaptedLocks={...normalized.locks,background:false,composition:false};
 const check=inspectConsistency(baseline,adapted,{...normalized,locks:adaptedLocks},null,facts);
 const observedIssues=(Array.isArray(adapted?.issues)?adapted.issues:[])
  .filter(x=>['Visual','Readability','Consistency'].includes(x?.category)&&['high','medium'].includes(x?.severity));
 if(observedIssues.length){
  check.status='failed';
  check.risks.push(...observedIssues.map(x=>({code:'format_visual_issue',evidence:String(x?.title||'Visible regression').slice(0,200)})));
 }
 check.format_relayout=true;
 check.exempt_from_lock_comparison=['background_extension','canvas_aspect_ratio'];
 check.original_locks={...normalized.locks};
 check.auto_approved=false;
 check.limitations.push('Expected scene extension and canvas ratio changes are not preservation proof. Inspect product edges, copy and logos at 100%.');
 return check;
}
