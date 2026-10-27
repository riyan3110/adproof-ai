import {renderProofStudio, resetProofStudio, proofReport, openClaimInspector} from './proof-studio.js';
const $ = (selector) => document.querySelector(selector);
const ui = {
  file:$('#fileInput'),drop:$('#dropzone'),browse:$('#browseButton'),replace:$('#newCreative'),empty:$('#emptyCanvas'),image:$('#creativeImage'),name:$('#fileName'),
  originalTab:$('#viewOriginal'), revisedTab:$('#viewRevised'), compareTab:$('#viewCompare'),
  compare:$('#compareView'),before:$('#compareBefore'),after:$('#compareAfter'), beforeWrap:$('#compareBeforeWrap'),bar:$('#compareBar'),range:$('#compareRange'),
  form:$('#projectForm'),product:$('#product'),facts:$('#facts'),caption:$('#caption'),auditButton:$('#auditButton'),auditText:$('#auditButtonText'),
  auditPhase:$('#auditPhase'),reportEmpty:$('#reportEmpty'),reportContent:$('#reportContent'),scoreRing:$('#scoreRing'),scoreValue:$('#scoreValue'),scoreHeadline:$('#scoreHeadline'),scoreSummary:$('#scoreSummary'),
  breakdown:$('#breakdown'), issues:$('#issuesList'), count:$('#issueCount'),suggested:$('#suggestedCaption'),copyCaption:$('#copyCaption'),
  claimPanel:$('#claimEvidencePanel'), claimList:$('#claimEvidenceList'),claimCount:$('#claimEvidenceCount'),
  refine:$('#refineButton'),verify:$('#verifyButton'),downloadReport:$('#downloadReport'),downloadImage:$('#downloadImage'),
  scan:$('#scanOverlay'),toast:$('#toast'),connection:$('#connection'),connectionText:$('#connectionText'),
  accessButton:$('#judgeAccessButton'),accessDialog:$('#judgeAccessDialog'),accessForm:$('#judgeAccessForm'),accessInput:$('#judgeAccessCode'),accessHint:$('#judgeAccessHint'),accessCancel:$('#judgeAccessCancel')
};
const state={original:null,originalFilename:null,revised:null,audit:null,initialAudit:null,verified:null,view:'original',busy:false,configured:false,demoGate:false,phase:0,context:null,runs:[]};
let toastTimer=null;
const canAct=()=>!!state.original && !!ui.product.value.trim() && ui.facts.value.trim().length>=8 && state.configured;
// A private judge code can be entered before testing or when the backend returns 401/403.
// It is stored in sessionStorage only, never as a URL parameter or a public token.
const demoKey='adproof-demo-code';
const getCode=()=>{try{return sessionStorage.getItem(demoKey)||'';}catch{return '';}};
const setCode=(v)=>{try{if(v)sessionStorage.setItem(demoKey,v);else sessionStorage.removeItem(demoKey);}catch{} if(ui.accessButton)ui.accessButton.textContent=v?'Code entered':'Judge access';};
function openJudgeDialog(message='Enter the private demo code shared with you.') {
  return new Promise(resolve=>{
    if(!ui.accessDialog || typeof ui.accessDialog.showModal!=='function' || ui.accessDialog.open){
      notify('Cannot open access dialog. Try again in a supported browser.',true);resolve(false);return;
    }
    ui.accessDialog.returnValue='';
    ui.accessHint.textContent=message;
    ui.accessInput.value='';
    ui.accessDialog.addEventListener('close',()=>{ui.accessInput.value='';resolve(ui.accessDialog.returnValue==='saved');},{once:true});
    ui.accessDialog.showModal();
    ui.accessInput.focus();
  });
}
ui.accessButton.addEventListener('click',()=>{void openJudgeDialog();});
ui.accessForm.addEventListener('submit',event=>{
  event.preventDefault();
  const code=ui.accessInput.value.trim();
  if(!code){ui.accessInput.focus();return;}
  setCode(code);
  ui.accessInput.value='';
  ui.accessDialog.close('saved');
  notify('Access code entered for this tab. It will be verified on the next AI request.');
});
ui.accessCancel.addEventListener('click',()=>ui.accessDialog.close('cancelled'));
function notify(message,error=false){ui.toast.textContent=message;ui.toast.classList.toggle('error',error);ui.toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.hidden=true,5100);}
function phase(n){state.phase=n; document.querySelectorAll('.stage').forEach((el,i)=>{el.classList.toggle('active',i===n);el.classList.toggle('complete',i<n);});}
function setBusy(b,label='Run audit'){state.busy=b;ui.auditButton.disabled=b;ui.refine.disabled=b;ui.verify.disabled=b;ui.auditText.textContent=b?label:'Run audit';ui.scan.hidden=!b;ui.drop.setAttribute('aria-busy',String(b));for(const field of [ui.product,ui.facts,ui.caption])field.disabled=b;}
function resetAudit(){resetProofStudio();state.context=null;state.runs=[];state.audit=null;state.initialAudit=null;state.verified=null;state.revised=null;ui.reportEmpty.hidden=false;ui.reportContent.hidden=true;ui.auditPhase.textContent='AWAITING INPUT';ui.refine.hidden=false;ui.verify.hidden=true;ui.downloadImage.hidden=true;ui.revisedTab.disabled=true;ui.compareTab.disabled=true;phase(0);}
async function api(endpoint,data,retried=false){
 const timeoutMs=endpoint==='/api/improve'?125000:80000;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 let r,result;
 try {
  const headers={'content-type':'application/json'};
  const code=getCode();if(code)headers['x-demo-code']=code;
  r=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(data),signal:controller.signal});
  result=await r.json().catch(()=>({}));
 }catch(e){
  if(e?.name==='AbortError')throw Error('Permintaan kedaluwarsa. Silakan coba lagi.');
  throw e;
 }finally{clearTimeout(timer);}
 if(r.status===401||r.status===403){
  setCode('');
  if(!retried){
   const provided=await openJudgeDialog(r.status===403?'That code was not accepted. Enter the judge code again.':'Live Meta AI requires a private demo code. Enter it to continue.');
   if(provided)return api(endpoint,data,true);
  }
 }
 if(!r.ok)throw Error(result.error || 'Server request failed.');
 return result;
}
function isImage(file){return file&&['image/jpeg','image/png','image/webp'].includes(file.type);}
async function prepareImage(file){
 if(!isImage(file))throw Error('Gunakan PNG, JPG, atau WebP.');
 if(file.size>6*1024*1024)throw Error('Gambar maksimal 6 MB.');
 const objectUrl=URL.createObjectURL(file);
 try {
   const image=new Image();image.decoding='async';image.src=objectUrl;await image.decode();
   // Keep the JSON request under Vercel Hobby's 4.5 MB limit: bound
   // pixels, then step quality down until the payload fits (~3.6 MB cap
   // leaves headroom for product facts and JSON overhead).
   const CAP=3.6*1024*1024;
   let scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));
   for(const quality of [.82,.72,.62,.5]){
     const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
     const ctx=canvas.getContext('2d');if(!ctx)throw Error('Browser tidak mendukung Canvas.');
     ctx.drawImage(image,0,0,canvas.width,canvas.height);
     const data=canvas.toDataURL('image/jpeg',quality);
     if(data.length<=CAP)return data;
     scale*=.8;
   }
   throw Error('Gambar masih terlalu besar setelah kompresi. Gunakan gambar yang lebih kecil.');
 } finally {URL.revokeObjectURL(objectUrl);}
}
async function upload(file){if(state.busy)return;try{const data=await prepareImage(file);state.original=data;state.originalFilename=file.name;resetAudit();ui.empty.hidden=true;ui.name.textContent=file.name.toUpperCase();ui.replace.disabled=false;ui.originalTab.disabled=false;switchView('original');notify('Creative ready.');}catch(e){notify(e.message,true);}}
function switchView(view){
 if(view!=='original'&&!state.revised)return;
 state.view=view;
 for(const [key,el] of [['original',ui.originalTab],['revised',ui.revisedTab],['compare',ui.compareTab]]){el.classList.toggle('selected',key===view);el.setAttribute('aria-selected',String(key===view));}
 ui.empty.hidden=!!state.original;
 ui.compare.hidden=view!=='compare';
 ui.image.hidden=!state.original||view==='compare';
 if(view==='original')ui.image.src=state.original||'';
 if(view==='revised')ui.image.src=state.revised||'';
 if(view==='compare'){ui.before.src=state.original;ui.after.src=state.revised;setCompare(Number(ui.range.value));}
}
function setCompare(value){ui.beforeWrap.style.clipPath=`inset(0 ${100-value}% 0 0)`;ui.bar.style.left=`${value}%`;}
function inputContext(){return {product:ui.product.value.trim(),facts:ui.facts.value.trim(),caption:ui.caption.value.trim()};}
function payload(image){return {image,...(state.context||inputContext())};}
function el(tag,cl,text){const e=document.createElement(tag);if(cl)e.className=cl;if(text!==undefined)e.textContent=text;return e;}
function renderClaimEvidence(a, verified=false){
 const ledger=Array.isArray(a.claim_ledger)?a.claim_ledger.slice(0,8):[];
 ui.claimPanel.hidden=ledger.length===0;
 ui.claimList.replaceChildren();
 if(!ledger.length)return;
 const labels={
  supported_by_supplied_facts:['SUPPORTED BY INPUT','supported'],
  unsupported_by_supplied_facts:['NOT IN INPUT','unsupported'],
  contradicted_by_supplied_facts:['CONFLICTS WITH INPUT','contradicted'],
  unreadable:['UNREADABLE','uncertain'],
  needs_human_review:['REVIEW NEEDED','uncertain']
 };
 ui.claimCount.textContent=`${ledger.length} CLAIM${ledger.length===1?'':'S'} · ${verified?'RE-CHECK':'INITIAL'}`;
 for(const [index,item] of ledger.entries()){
  const mapped=labels[item.assessment]||labels.needs_human_review;
  const card=el('article','claim-evidence-item');
  const top=el('div','claim-evidence-top');
  const source=el('span','claim-evidence-source',item.origin==='caption'?'CAPTION':item.origin==='creative'?'CREATIVE':'SOURCE UNCERTAIN');
  const status=el('span',`claim-evidence-status ${mapped[1]}`,mapped[0]);
  top.append(source,status);
  const claim=el('p','claim-evidence-claim',String(item.claim||''));
  card.append(top,claim);
  if(item.fact_quote){
   const quote=el('div','claim-evidence-fact');
   quote.append(el('span','claim-evidence-kicker','INPUT FACT'),el('q','',String(item.fact_quote)));
   card.append(quote);
  }
  if(item.reason)card.append(el('p','claim-evidence-detail',String(item.reason)));
  if(item.recommended_action)card.append(el('p','claim-evidence-action',String(item.recommended_action)));
  const inspect=el('button','text-button','Inspect claim ↗');inspect.type='button';inspect.addEventListener('click',()=>openClaimInspector(index,verified?'revised':'initial'));card.append(inspect);
  ui.claimList.append(card);
 }
}

function render(a,verified=false){
 ui.reportEmpty.hidden=true;ui.reportContent.hidden=false;
 ui.auditPhase.textContent=verified?'RE-CHECK COMPLETE':'AUDIT COMPLETE';
 ui.scoreRing.style.setProperty('--score',String(a.score)); ui.scoreValue.textContent=String(a.score);
 ui.scoreHeadline.textContent=a.headline || 'Creative reviewed';
 ui.scoreSummary.textContent=a.summary || '';
 ui.breakdown.replaceChildren();
 for(const [label,key] of [['Claims','claim'],['Clarity','clarity'],['Layout','hierarchy'],['Action','action']]){
  const metric=el('div','metric');metric.append(el('span','',label),el('b','',String(a.checks?.[key]??'--')));ui.breakdown.append(metric);
 }
 renderClaimEvidence(a,verified);
 ui.count.textContent=`${String(a.issues.length).padStart(2,'0')} ISSUES`;
 ui.issues.replaceChildren();
 if(!a.issues.length)ui.issues.append(el('p','no-issues','No clear issues detected. Review manually before publishing.'));
 for(const issue of a.issues){
  const wrapper=el('div','issue');const button=el('button','issue-top');button.type='button';button.setAttribute('aria-expanded','false');
  const dot=el('span',`severity-dot ${issue.severity}`);const title=el('span','issue-title',issue.title);const cat=el('span','issue-cat',issue.category);const arrow=el('span','issue-chevron','+');button.append(dot,title,cat,arrow);
  const details=el('div','issue-details');details.hidden=true;const evidence=el('p','',issue.evidence);const suggestion=el('p');suggestion.append(el('strong','','Fix: '),document.createTextNode(issue.suggestion));details.append(evidence,suggestion);
  button.addEventListener('click',()=>{details.hidden=!details.hidden;button.setAttribute('aria-expanded',String(!details.hidden));arrow.textContent=details.hidden?'+':'−';});
  wrapper.append(button,details);ui.issues.append(wrapper);
 }
 ui.suggested.textContent=a.recommended_caption||'Belum ada saran caption.';
 if(verified && state.initialAudit) ui.scoreSummary.textContent=`${a.summary || ''} · Score ${a.score>=state.initialAudit.score?'+':''}${a.score-state.initialAudit.score} vs original.`;
 ui.refine.hidden=verified;
 ui.verify.hidden=!state.revised || verified;
 ui.downloadImage.hidden=!state.revised;
}
async function performAudit(image,verify=false){
 if(!state.configured)throw Error('Hubungkan MODEL_API_KEY di server terlebih dahulu.');
 setBusy(true,verify?'Verifying…':'Analyzing…');
 try{
  if(!verify){resetAudit();switchView('original');state.context=inputContext();}
  const out=await api('/api/audit',payload(image));state.audit=out.audit;state.runs.push({stage:verify?'reaudit':'initial',model:out.model,tokens:out.tokens,provenance:out.provenance||null});
  if(verify){state.verified=out.audit;phase(3);}else{state.initialAudit=out.audit;state.verified=null;phase(1);}
  render(out.audit,verify);renderProofStudio({before:state.initialAudit,after:state.verified,facts:state.context.facts,onInspect:stage=>switchView(stage==='revised'?'revised':'original')});notify(verify?'Re-audit complete. Review claim changes and uncertainty.':'AI audit completed.');
 }finally{setBusy(false);}
}
async function performImprove(){
 if(!state.audit || !state.original)throw Error('Jalankan audit dulu.');
 setBusy(true,'Refining…');
 try{
  const out=await api('/api/improve',{...payload(state.original),issues:state.initialAudit.issues,claims:state.initialAudit.claim_ledger});
  state.verified=null;state.runs=state.runs.filter(r=>r.stage==='initial');state.runs.push({stage:'repair',model:out.model,provenance:out.provenance||null});state.revised=out.image;renderProofStudio({before:state.initialAudit,after:null,facts:state.context.facts,onInspect:()=>switchView('original')});ui.revisedTab.disabled=false;ui.compareTab.disabled=false;ui.verify.hidden=false;ui.downloadImage.hidden=false;phase(2);switchView('compare');notify('Gambar baru sudah dibuat oleh Meta Muse Image. Periksa sebelum digunakan.');
 }finally{setBusy(false);}
}
function download(data,name,type){const blob=data instanceof Blob?data:new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);}
for(const field of [ui.product,ui.facts,ui.caption])field.addEventListener('input',()=>{if(state.context&&!state.busy){resetAudit();switchView('original');notify('Input changed. Run a fresh audit to keep evidence consistent.');}});
ui.form.addEventListener('submit',async e=>{e.preventDefault();if(!state.original){notify('Unggah gambar iklan terlebih dahulu.',true);return;}if(state.busy)return;try{await performAudit(state.original)}catch(e){notify(e.message,true);}});
ui.refine.addEventListener('click',async()=>{if(state.busy)return;try{await performImprove();}catch(e){notify(e.message,true);}});
ui.verify.addEventListener('click',async()=>{if(state.busy||!state.revised)return;try{await performAudit(state.revised,true);}catch(e){notify(e.message,true);}});
ui.copyCaption.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(ui.suggested.textContent);notify('Caption copied.');}catch{notify('Clipboard tidak tersedia.',true);}});
ui.downloadReport.addEventListener('click',()=>{if(!state.audit)return;const report={app:'AdProof AI',date:new Date().toISOString(),product:state.context?.product,context:state.context,caption_scope:'The supplied caption is unchanged in both audits; image repair does not edit external caption text.',runs:state.runs,...proofReport(),original:state.initialAudit,verified:state.verified,disclaimer:'AI-estimated guidance. Human review required.'};download(JSON.stringify(report,null,2),'adproof-audit.json','application/json');});
ui.downloadImage.addEventListener('click',()=>{if(!state.revised)return;const [header,b64]=state.revised.split(',');const mime=header.match(/data:(.*?);/)?.[1]||'image/webp';const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));download(new Blob([bytes],{type:mime}),`adproof-revised.${mime.includes('png')?'png':mime.includes('jpeg')?'jpg':'webp'}`,mime);});
ui.browse.addEventListener('click',e=>{e.stopPropagation();ui.file.click();});ui.replace.addEventListener('click',()=>ui.file.click());ui.drop.addEventListener('click',e=>{if(e.target.closest('button,input')||state.busy||state.view==='compare')return;ui.file.click();});ui.drop.addEventListener('keydown',e=>{if(e.target===ui.drop&&(e.key==='Enter'||e.key===' ')){e.preventDefault();ui.file.click();}});
ui.file.addEventListener('change',async e=>{const f=e.target.files?.[0];if(f)await upload(f);ui.file.value='';});
for(const evt of ['dragenter','dragover'])ui.drop.addEventListener(evt,e=>{e.preventDefault();ui.drop.classList.add('dragging');});for(const evt of ['dragleave','drop'])ui.drop.addEventListener(evt,e=>{e.preventDefault();ui.drop.classList.remove('dragging');});ui.drop.addEventListener('drop',e=>{if(e.dataTransfer?.files?.[0])upload(e.dataTransfer.files[0]);});
ui.originalTab.addEventListener('click',()=>switchView('original'));ui.revisedTab.addEventListener('click',()=>switchView('revised'));ui.compareTab.addEventListener('click',()=>switchView('compare'));ui.range.addEventListener('input',e=>setCompare(Number(e.target.value)));
fetch('/api/health').then(r=>r.json()).then(info=>{state.configured=!!info.configured;state.demoGate=!!info.demoGate;ui.accessButton.hidden=!state.demoGate;setCode(getCode());ui.connection.classList.add(state.configured?'ready':'missing');ui.connectionText.textContent=state.configured?'META CONFIGURED':'API NOT SET';if(!state.configured)notify('Untuk audit real-time, konfigurasi MODEL_API_KEY di server.',true);}).catch(()=>{ui.connection.classList.add('missing');ui.connectionText.textContent='SERVER OFFLINE';});
// Sticky mobile CTA: mirrors the main audit submit without duplicating logic.
const stickyAudit=$('#stickyAudit');const stickyLabel=$('#stickyLabel');
if(stickyAudit){stickyAudit.addEventListener('click',()=>{ui.form.requestSubmit();});
 const syncSticky=()=>{stickyAudit.disabled=ui.auditButton.disabled;if(stickyLabel)stickyLabel.textContent=state.busy?'Working…':!state.original?'Add a creative to begin':state.audit?'Audit ready — refine or verify below':'Ready when your creative + facts are set';};
 new MutationObserver(syncSticky).observe(ui.auditButton,{attributes:true,attributeFilter:['disabled']});
 ui.form.addEventListener('input',syncSticky);syncSticky();
// Keep tab semantics in sync for assistive tech.
for(const [key,tab] of [['original',ui.originalTab],['revised',ui.revisedTab],['compare',ui.compareTab]])tab.addEventListener('click',()=>{for(const t of [ui.originalTab,ui.revisedTab,ui.compareTab])t.setAttribute('aria-selected',String(t===tab));});}
