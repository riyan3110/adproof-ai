import {buildEvolution, buildConstellation} from './claim-engine.js';
const $=id=>document.getElementById(id);
const labels={pending:'Awaiting re-audit',retained:'Retained',still_problematic:'Still problematic',uncertain:'Review needed',changed_candidate:'Possible wording change',not_redetected:'Not in re-audit list',newly_detected:'First seen in re-audit',cross_source_observed:'Recorded in another source',ambiguous:'Ambiguous match'};
const assessmentLabels={supported_by_supplied_facts:'Supported by input',unsupported_by_supplied_facts:'Not supported by input',contradicted_by_supplied_facts:'Conflicts with input',needs_human_review:'Human review needed',unreadable:'Unreadable'};
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
function svg(tag,attrs,text){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;}
let context=null, selectedStage='initial', selectedNode=null, detailNode=null, currentView='xray';
const viewTitles={xray:'Inspect the source.',constellation:'Follow the evidence.',evolution:'Trace every change.'};
export function activateProofView(view,focus=false){
 if(!Object.hasOwn(viewTitles,view))return;
 currentView=view;
 for(const key of Object.keys(viewTitles))$(key+'Workspace').hidden=key!==view;
 for(const button of document.querySelectorAll('[data-proof-view]'))button.setAttribute('aria-pressed',String(button.dataset.proofView===view));
 $('proofHeading').textContent=viewTitles[view];
 if(context&&view==='xray'&&$('xrayResults').hidden){const first=buildConstellation(activeAudit(),context.facts).nodes.find(n=>n.type==='claim');if(first){selectedNode=first.id;detailNode=null;renderGraph();}}
 if(context&&view==='constellation')renderGraph();
 if(focus){$('proofWorkspace').scrollIntoView({block:'start',behavior:'auto'});$('proofHeading').focus({preventScroll:true});}
}
for(const button of document.querySelectorAll('[data-proof-view]'))button.addEventListener('click',()=>activateProofView(button.dataset.proofView,true));
$('xrayToGraph').onclick=()=>activateProofView('constellation',true);
$('proofToXray').onclick=()=>activateProofView('xray',true);
function clearXray(message=false){
 $('xrayEmpty').querySelector('strong').textContent=message?'No readable claim selected.':'A claim needs context.';
 $('xrayEmpty').querySelector('p').textContent=message?'This audit has no selected claim to inspect. An empty or incomplete ledger does not prove that claims are absent.':'Run an audit, then select a claim to inspect its source, evidence status and repair recommendation.';
 $('xrayPanel').hidden=true;$('xrayResults').hidden=true;$('xrayEmpty').hidden=false;
 $('xrayImage').removeAttribute('src');$('xrayCaption').textContent='';$('xrayClaimSelect').replaceChildren();
 for(const id of ['xrayClaim','xrayTitle','xrayStatus','xrayReason','xrayEvidence','xrayAction'])$(id).textContent='';
}

export function resetProofStudio(){
 context=null;selectedNode=null;detailNode=null;selectedStage='initial';clearXray();
 // Keep the actual verification modules visible, but never leave a stale audit
 // graph or claim lineage on screen after inputs change.
 $('proofWorkspace').hidden=false;$('xrayPanel').hidden=true;
 $('constellationEmpty').hidden=false;$('evolutionEmpty').hidden=false;
 $('constellationResults').hidden=true;$('evolutionResults').hidden=true;
 $('proofStage').disabled=true;$('proofStage').value='initial';
 $('proofStage').options[1].disabled=true;
 $('proofNodeList').replaceChildren();$('constellation').replaceChildren();
 $('evolutionList').replaceChildren();$('proofToXray').disabled=true;
 for(const id of ['proofNodeTitle','proofNodeDetail','proofNodeSource','evolutionNote'])$(id).textContent='';
 $('proofCount').textContent='NO OBSERVATIONS';$('evolutionCount').textContent='AWAITING COMPARISON';
}
export function renderProofStudio(next){
 context=next;selectedStage=next.after?'revised':'initial';selectedNode=null;detailNode=null;
 $('proofWorkspace').hidden=false;
 $('constellationEmpty').hidden=true;$('evolutionEmpty').hidden=true;
 $('constellationResults').hidden=false;$('evolutionResults').hidden=false;
 $('proofStage').disabled=false;$('proofStage').value=selectedStage;$('proofStage').options[1].disabled=!next.after;
 $('proofStage').onchange=()=>{selectedStage=$('proofStage').value;selectedNode=null;detailNode=null;renderGraph();};
 renderGraph();renderEvolution();
}
function activeAudit(){return selectedStage==='revised'?context.after:context.before;}
function inspectClaim(index){
 const claim=activeAudit()?.claim_ledger?.[index];if(!claim)return;
 $('xrayPanel').hidden=false;$('xrayEmpty').hidden=true;$('xrayResults').hidden=false;
 const select=$('xrayClaimSelect');select.replaceChildren();
 for(const [i,item] of (activeAudit().claim_ledger||[]).entries()){if(!item||typeof item.claim!=='string')continue;const option=make('option','',`${i+1}. ${item.claim}`);option.value=String(i);select.append(option);}
 select.value=String(index);select.onchange=()=>openClaimInspector(Number(select.value),selectedStage,false);
 const sourceImage=selectedStage==='revised'?context.revisedImage:context.originalImage;
 $('xrayImage').hidden=!sourceImage;if(sourceImage)$('xrayImage').src=sourceImage;else $('xrayImage').removeAttribute('src');
 $('xrayImageLabel').textContent=`${selectedStage==='revised'?'REVISED':'ORIGINAL'} IMAGE${claim.origin==='caption'?' · CAPTION CONTEXT':''}`;
 $('xrayCaption').hidden=claim.origin!=='caption';$('xrayCaption').textContent=claim.origin==='caption'?(context.caption||'Caption source was not supplied.') : '';

 $('xrayTitle').textContent=`${selectedStage==='revised'?'Revised':'Original'} · ${claim.origin==='caption'?'caption':claim.origin==='creative'?'image':'source uncertain'} claim ${index+1}`;
 $('xrayClaim').textContent=claim.claim;$('xrayReason').textContent=claim.reason||'No explanation returned.';
 $('xrayEvidence').textContent=claim.fact_quote?`Input excerpt: “${claim.fact_quote}”`:'No validated input excerpt.';
 $('xrayStatus').textContent=assessmentLabels[claim.assessment]||assessmentLabels.needs_human_review;
 $('xrayAction').textContent=claim.recommended_action||'Review the source manually.';
 context.onInspect?.(selectedStage);
}
function renderGraph(){
 const audit=activeAudit(),graph=buildConstellation(audit,context.facts);
 context.graph=graph;
 const list=$('proofNodeList');list.replaceChildren();
 const claimNodes=graph.nodes.filter(n=>n.type==='claim');
 const issueNodes=graph.nodes.filter(n=>n.type==='issue');
 $('proofCount').textContent=`${claimNodes.length} claims · ${graph.edges.length} traced links`;
 if(!selectedNode||!graph.nodes.some(n=>n.id===selectedNode))selectedNode=claimNodes[0]?.id||issueNodes[0]?.id||graph.nodes[0]?.id;
 for(const node of [...claimNodes,...issueNodes]){
  const b=make('button','proof-selector',`${node.type==='claim'?'CLAIM':'FINDING'} · ${node.label}`);b.type='button';b.setAttribute('aria-pressed',String(node.id===selectedNode));
  b.title=node.label;b.onclick=()=>{selectedNode=node.id;detailNode=null;renderGraph();list.querySelector('[aria-pressed=true]')?.focus({preventScroll:true});};list.append(b);
 }
 const root=(claimNodes.length||issueNodes.length)?graph.nodes.find(n=>n.id===selectedNode):null;
 if(!root){$('constellation').replaceChildren();$('proofNodeTitle').textContent='No claim relationships available';$('proofNodeDetail').textContent='An empty ledger is not proof that the creative contains no claims.';$('proofNodeSource').textContent='';clearXray(true);$('proofToXray').disabled=true;return;}
 // Use direct recorded links, plus a quote's explicit source. No inferred claim-to-issue links.
 const direct=new Set([root.id]);
 for(const e of graph.edges)if(e.from===root.id)direct.add(e.to);else if(e.to===root.id)direct.add(e.from);
 for(const e of graph.edges)if(direct.has(e.from)&&graph.nodes.find(n=>n.id===e.to)?.type==='fact_source')direct.add(e.to);
 const nodes=graph.nodes.filter(n=>direct.has(n.id));
 const edges=graph.edges.filter(e=>direct.has(e.from)&&direct.has(e.to));
 const canvas=$('constellation');canvas.replaceChildren();const width=canvas.getBoundingClientRect().width;const narrow=width>0&&width<500,medium=width>=500&&width<800;canvas.setAttribute('viewBox',narrow?'0 0 360 340':medium?'0 0 600 340':'0 0 920 300');
 const title=svg('title',{},'Selected claim or finding and its explicitly traced evidence');canvas.append(title);
 const positions=new Map();const groups=new Map();
 for(const node of nodes){const col=node.id===root.id?2:node.type==='quote'?1:node.type==='fact_source'||node.type==='facts'?0:/action|recommendation|suggestion/.test(node.type)?4:3;const group=groups.get(col)||[];group.push(node);groups.set(col,group);}
 for(const [col,group]of groups)group.forEach((node,i)=>positions.set(node.id,narrow?{x:col===2?180:col===0||col===3?88:272,y:(col<2?55:col===2?170:285)+i*90}:medium?{x:col<2?100:col===2?300:500,y:(col===0||col===3?80:col===2?170:260)+i*90}:{x:92+col*184,y:150+(i-(group.length-1)/2)*108}));
 for(const edge of edges){const a=positions.get(edge.from),b=positions.get(edge.to);canvas.append(svg('path',{d:`M ${a.x} ${a.y} C ${(a.x+b.x)/2} ${a.y}, ${(a.x+b.x)/2} ${b.y}, ${b.x} ${b.y}`,class:'proof-edge'}));}
 const showDetail=node=>{ detailNode=node.id;$('proofNodeTitle').textContent=node.label;$('proofNodeDetail').textContent=node.detail||'No additional detail.';const links=graph.edges.filter(e=>e.from===node.id||e.to===node.id);$('proofNodeSource').textContent=`Source: ${node.source||'audit'}${links.length?' · '+links.map(e=>e.relation).join(' / '):''}`;for(const e of canvas.querySelectorAll('[data-node]')){e.classList.toggle('selected',e.dataset.node===node.id);e.setAttribute('aria-pressed',String(e.dataset.node===node.id));}};
 for(const node of nodes){const p=positions.get(node.id);const g=svg('g',{transform:`translate(${p.x} ${p.y})`,class:`proof-node type-${node.type}`,tabindex:'0',role:'button','aria-label':`${node.type}: ${node.label}`,'data-node':node.id});
  g.append(svg('rect',{x:-78,y:-38,width:156,height:76,rx:16}));g.append(svg('text',{x:0,y:-20,class:'node-kind'},node.type.replaceAll('_',' ').toUpperCase()));
  const label=assessmentLabels[node.label]||String(node.label||'');const chunks=label.match(/.{1,19}(?:\s|$)|.{1,19}/g)||[''];chunks.slice(0,2).forEach((part,i)=>g.append(svg('text',{x:0,y:i*15,class:'node-label'},part.trim()+(i===1&&chunks.length>2?'…':''))));
  g.append(svg('title',{},label));g.onclick=()=>showDetail(node);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showDetail(node);}};canvas.append(g);
 }
 showDetail(nodes.find(n=>n.id===detailNode)||root);
 const index=claimNodes.findIndex(n=>n.id===root.id);if(index>=0)inspectClaim(Number(root.source.match(/\[(\d+)\]/)?.[1]??index));else clearXray(true);$('proofToXray').disabled=index<0;
}
function renderEvolution(){
 const evolution=buildEvolution(context.before,context.after);context.evolution=evolution;
 const list=$('evolutionList');list.replaceChildren();
 $('evolutionCount').textContent=context.after?`${evolution.entries.length} trajectories · ${evolution.sample_limited?'sampled claims':'model observations'}`:'Awaiting revised-image audit';
 $('evolutionNote').textContent=!context.after?'Run Repair, then re-audit the actual revised image.':
   !evolution.complete?'Incomplete claim data. Matching is provisional; inspect both audits.':
   evolution.sample_limited?'Limited view: each audit supplies at most 8 selected claims. Missing from the list does NOT mean missing from the image or caption. Same wording may appear across both sources.':
   'This compares selected audit observations, not exhaustive image text. Missing from a list does not prove removal; inspect both image and caption.';
 if(!evolution.entries.length){list.append(make('p','proof-empty','No claims returned for comparison. This does not prove the absence of claims.'));return;}
 for(const [i,item]of evolution.entries.entries()){
  const row=make('details',`dna-row status-${item.status}`);const summary=make('summary');
  const statusText=item.status==='cross_source_observed'
    ? `Also in ${item.after?.origin==='caption'?'caption':'image'}`
    : labels[item.status]||'Review needed';
  summary.append(make('span','dna-number',String(i+1).padStart(2,'0')),make('span','dna-label',item.before?.claim||item.after?.claim||'Unreadable claim'),make('span','dna-status',statusText));
  if(item.status==='cross_source_observed'){
    summary.append(make('span','dna-origin-shift',`${item.before?.origin==='caption'?'CAPTION':'IMAGE'} → ${item.after?.origin==='caption'?'CAPTION':'IMAGE'}`));
  }
  const stages=make('div','dna-stages');
  for(const [name,claim,index,stage]of [['INITIAL',item.before,item.before_index,'initial'],['RE-AUDIT',item.after,item.after_index,'revised']]){
   const card=make('div','dna-stage');card.append(make('small','',`${name}${claim?.origin?' · '+(claim.origin==='caption'?'CAPTION':claim.origin==='creative'?'IMAGE':'SOURCE UNKNOWN'):''}`),make('p','',claim?.claim||'No matched observation'),make('span','',claim?assessmentLabels[claim.assessment]||'Human review needed':'Not evidence of removal'));
   if(claim?.fact_quote)card.append(make('q','',claim.fact_quote));
   if(claim){const b=make('button','text-button','Inspect source ↗');b.type='button';b.onclick=()=>openClaimInspector(index,stage);card.append(b);}
   stages.append(card);
  }
  row.append(summary,stages,make('p','dna-explanation',item.explanation||'Review both observations manually.'));list.append(row);
 }
}
export function proofReport(){return context?{claim_evolution:context.evolution,proof_constellation:{initial:buildConstellation(context.before,context.facts),revised:context.after?buildConstellation(context.after,context.facts):null},evidence_basis:'seller_supplied_facts_not_independently_verified'}:{};}

export function openClaimInspector(index,stage,focus=true){
 if(!context||!['initial','revised'].includes(stage)||!Number.isInteger(index))return;
 if(!((stage==='revised'?context.after:context.before)?.claim_ledger?.[index]))return;
 selectedStage=stage;detailNode=null;const graph=buildConstellation(activeAudit(),context.facts);
 selectedNode=graph.nodes.find(n=>n.type==='claim'&&n.source===`claim_ledger[${index}].claim`)?.id;
 $('proofStage').value=stage;renderGraph();activateProofView('xray',focus);
}

let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(context&&currentView==='constellation')renderGraph();},100);});
