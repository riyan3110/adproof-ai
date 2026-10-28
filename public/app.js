import {renderProofStudio, resetProofStudio, proofReport, openClaimInspector, activateProofView, refreshProofLanguage} from './proof-studio.js';
import {reviewRepairCandidate} from './repair-guard.js';
import {createAuditPackage,fromImageDataUrl,openAuditFile} from './audit-archive.js';
import {loadPreference,setPreference,getPreference,getLanguage,t,applyLanguage,observeDynamicLabels,onBrowserLanguageChange} from './i18n.js';
const $ = (selector) => document.querySelector(selector);
const ui = {
  language:$('#languageSelect'),file:$('#fileInput'),drop:$('#dropzone'),browse:$('#browseButton'),replace:$('#newCreative'),empty:$('#emptyCanvas'),image:$('#creativeImage'),name:$('#fileName'),
  originalTab:$('#viewOriginal'), revisedTab:$('#viewRevised'), compareTab:$('#viewCompare'),
  compare:$('#compareView'),before:$('#compareBefore'),after:$('#compareAfter'), beforeWrap:$('#compareBeforeWrap'),bar:$('#compareBar'),range:$('#compareRange'),
  form:$('#projectForm'),product:$('#product'),facts:$('#facts'),caption:$('#caption'),auditButton:$('#auditButton'),auditText:$('#auditButtonText'),
  auditPhase:$('#auditPhase'),reportEmpty:$('#reportEmpty'),reportContent:$('#reportContent'),repairNotice:$('#repairGuardNotice'),scoreRing:$('#scoreRing'),scoreValue:$('#scoreValue'),scoreHeadline:$('#scoreHeadline'),scoreSummary:$('#scoreSummary'),
  breakdown:$('#breakdown'), issues:$('#issuesList'), count:$('#issueCount'),suggested:$('#suggestedCaption'),copyCaption:$('#copyCaption'),
  claimPanel:$('#claimEvidencePanel'), claimList:$('#claimEvidenceList'),claimCount:$('#claimEvidenceCount'),
  refine:$('#refineButton'),verify:$('#verifyButton'),downloadReport:$('#downloadReport'),downloadImage:$('#downloadImage'),downloadPackage:$('#downloadPackage'),importReportButton:$('#importReportButton'),importReportStart:$('#importReportStart'),importReportInput:$('#importReportInput'),archiveNotice:$('#archiveRestoreNotice'),archiveLanguageNote:$('#archiveLanguageNote'),continueActions:$('#archiveContinueActions'),continueOriginal:$('#continueFromOriginal'),continueRevised:$('#continueFromRevised'),historyPanel:$('#archiveHistoryPanel'),historySummary:$('#archiveHistorySummary'),historyList:$('#archiveHistoryList'),
  scan:$('#scanOverlay'),toast:$('#toast'),connection:$('#connection'),connectionText:$('#connectionText'),
  accessButton:$('#judgeAccessButton'),accessDialog:$('#judgeAccessDialog'),accessForm:$('#judgeAccessForm'),accessInput:$('#judgeAccessCode'),accessHint:$('#judgeAccessHint'),accessCancel:$('#judgeAccessCancel'),accessSubmit:$('#judgeAccessForm button[type=submit]'),accessError:$('#judgeAccessError'),accessStatus:$('#judgeAccessStatus'),providerStatus:$('#metaProviderStatus')
};
loadPreference();
const state={reportLanguage:null,original:null,originalFilename:null,revised:null,audit:null,initialAudit:null,verified:null,view:'original',busy:false,configured:false,demoGate:false,phase:0,context:null,runs:[],repairReview:null,imported:false,importing:false,archivedReport:null,history:[],continuedFrom:null,accessVerified:false,sparkResponded:false,imageResponded:false,reauditResponded:false};
let toastTimer=null;
function renderSavedLanguageNotice(){
 if(!state.imported){ui.archiveLanguageNote.hidden=true;ui.archiveLanguageNote.textContent='';return;}
 const saved=state.reportLanguage;
 const current=getLanguage();
 const name=saved==='id'?'Bahasa Indonesia':saved==='en'?'English':null;
 const first=name
  ?(current==='id'?'Bahasa laporan tersimpan: ':'Saved report language: ')+name+'. '
  :(current==='id'?'Bahasa laporan lama tidak dicatat. ':'This legacy report did not record its language. ');
 const detail=current==='id'
  ?'Mengganti bahasa antarmuka tidak menerjemahkan atau mengaudit ulang laporan lama. Audit AI baru mengikuti bahasa yang kamu pilih.'
  :'Switching interface language does not translate or rerun historical model output. New AI audits follow your selected language.';
 ui.archiveLanguageNote.hidden=false;
 ui.archiveLanguageNote.textContent=first+detail;
}
function applySelectedLanguage(){
 refreshProofLanguage();
 syncDeck();syncSticky();
 applyLanguage();
 renderSavedLanguageNotice();
}
const canAct=()=>!!state.original && !!ui.product.value.trim() && ui.facts.value.trim().length>=8 && state.configured;
// Avoid costly, potentially destructive regeneration when the audit has no
// evidence-grounded image issue. Caption-only fixes belong to the caption.
function hasImageRepairTarget(a){
 const creativeClaim=Array.isArray(a?.claim_ledger)&&a.claim_ledger.some(c=>
   c?.origin==='creative'&&['unsupported_by_supplied_facts','contradicted_by_supplied_facts'].includes(c.assessment)&&String(c.recommended_action||'').trim());
 const imageIssue=Array.isArray(a?.issues)&&a.issues.some(i=>
   String(i?.evidence||'').trim()&&String(i?.suggestion||'').trim()&&
   !/^caption\s*:/i.test(String(i.evidence||'').trim()));
 return Boolean(creativeClaim||imageIssue);
}

// Access verification checks the server's demo gate WITHOUT charging the Meta API.
// Being verified for Judge Access does not imply a live model has responded.
const demoKey='adproof-demo-code';
let accessCheckGeneration=0;
const getCode=()=>{try{return sessionStorage.getItem(demoKey)||'';}catch{return '';}};
function setAccessStatus(label,kind) {
 ui.accessStatus.textContent=label;
 ui.accessStatus.dataset.state=kind;
}
function setCode(code) {
 try{if(code)sessionStorage.setItem(demoKey,code);else sessionStorage.removeItem(demoKey);}catch{}
 state.accessVerified=!!code;
 ui.accessButton.textContent=code?'Access verified ✓':'Judge access';
 if(code)setAccessStatus('Code verified by server ✓','verified');
 else setAccessStatus('Code not verified','missing');
}
function updateMetaStatus() {
 const label=!state.configured?'API key not configured'
  :state.reauditResponded?'Full audit → repair → re-audit responded'
  :state.imageResponded?(state.sparkResponded?'Muse Spark and Muse Image responded · Re-audit pending':'Muse Image responded · Spark baseline restored from archive')
  :state.sparkResponded?'Muse Spark responded · Muse Image not tested'
  :'API key configured · Models not tested';
 ui.providerStatus.textContent=label;
 ui.providerStatus.dataset.state=state.reauditResponded?'verified':state.sparkResponded?'partial':state.configured?'pending':'invalid';
 ui.connection.classList.toggle('ready',state.configured);
 ui.connection.classList.toggle('missing',!state.configured);
 ui.connectionText.textContent=!state.configured?'API NOT SET'
  :state.reauditResponded?'META FLOW TESTED'
  :state.imageResponded?'META MODELS RESPONDED'
  :state.sparkResponded?'SPARK RESPONDED':'META CONFIGURED';
}
function showCodeError(message) {
 ui.accessError.textContent=message;
 ui.accessError.hidden=false;
}
async function verifyCode(code,{restoring=false}={}) {
 const generation=++accessCheckGeneration;
 setAccessStatus('Checking code on server…','checking');
 ui.accessButton.disabled=true;
 ui.accessSubmit.disabled=true;
 ui.accessSubmit.textContent='Checking…';
 try{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  let res,reply;
  try{
   res=await fetch('/api/access',{method:'POST',headers:{'x-demo-code':code},signal:controller.signal});
   reply=await res.json().catch(()=>({}));
  }finally{clearTimeout(timer);}
  if(generation!==accessCheckGeneration)return false;
  if(res.ok && reply.ok===true && reply.access==='verified') {
   setCode(code);
   ui.accessError.hidden=true;
   return true;
  }
  setCode('');
  const error=res.status===403?'Kode salah. Periksa dan masukkan ulang.'
   :res.status===401?'Kode belum diterima server.'
   :res.status===429?'Terlalu banyak percobaan. Coba lagi sebentar.'
   :reply.error||'Tidak dapat memverifikasi kode sekarang.';
  setAccessStatus(res.status===403?'Code rejected':res.status===429?'Check limited':'Verification unavailable','invalid');
  if(!restoring)showCodeError(error);
  else notify('Kode tersimpan tidak dapat diverifikasi. Masukkan ulang melalui Judge access.',true);
  return false;
 }catch(e){
  if(generation!==accessCheckGeneration)return false;
  setCode('');
  setAccessStatus('Verification unavailable','invalid');
  if(!restoring)showCodeError('Koneksi verifikasi gagal. Periksa jaringan dan coba lagi.');
  return false;
 }finally{
  if(generation===accessCheckGeneration) {
   ui.accessButton.disabled=false;
   ui.accessSubmit.disabled=false;
   ui.accessSubmit.textContent='Verify code ↗';
  }
 }
}
function openJudgeDialog(message='Enter the private demo code shared with you.') {
 return new Promise(resolve=>{
  if(!ui.accessDialog || typeof ui.accessDialog.showModal!=='function' || ui.accessDialog.open){
   notify('Cannot open access dialog. Try again in a supported browser.',true);resolve(false);return;
  }
  ui.accessDialog.returnValue='';
  ui.accessHint.textContent=message;
  ui.accessInput.value='';
  ui.accessError.hidden=true;
  ui.accessDialog.addEventListener('close',()=>{ui.accessInput.value='';resolve(ui.accessDialog.returnValue==='saved');},{once:true});
  ui.accessDialog.showModal();
  ui.accessInput.focus();
 });
}
ui.accessButton.addEventListener('click',()=>{void openJudgeDialog();});
ui.accessForm.addEventListener('submit',async event=>{
 event.preventDefault();
 const code=ui.accessInput.value.trim();
 if(!code){ui.accessInput.focus();return;}
 const verified=await verifyCode(code);
 if(verified){
  ui.accessInput.value='';
  ui.accessDialog.close('saved');
  notify('Judge Access verified by server. Meta models are tested only when you run an audit.');
 }
});
ui.accessCancel.addEventListener('click',()=>ui.accessDialog.close('cancelled'));
function notify(message,error=false){ui.toast.textContent=t(message);ui.toast.classList.toggle('error',error);ui.toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.hidden=true,5100);}
function syncDeck(){
 const current=state.phase, ready=!!state.original;
 const ledger=state.verified?.claim_ledger??state.initialAudit?.claim_ledger;
 const count=Array.isArray(ledger)?ledger.length:0;
 const put=(id,text)=>{const node=document.getElementById(id);if(node)node.textContent=text;};
 put('deckPhase',state.imported?'IMPORTED ARCHIVE · READ ONLY':state.continuedFrom?'CONTINUED FROM ARCHIVE · LIVE REPAIR':state.busy?'META AI PROCESSING':!ready?'AWAITING CREATIVE':['READY TO AUDIT','INITIAL AUDIT COMPLETE','REPAIR GENERATED','RE-AUDIT COMPLETE'][current]);
 put('deckDetectState',current>0?(count?count+' observed claim'+(count===1?'':'s')+' · inspect':'No readable claims reported'):ready?'Image loaded · start audit':'Upload creative to start');
 put('deckProofState',current>0?'Inspect traced evidence links':'Awaiting observed claims');
 put('deckDNAState',current===3?'View claim trajectories':current===2?'Repair ready · run re-audit':'Awaiting comparison');
 ui.refine.disabled=state.busy||state.imported||!state.initialAudit||!!state.verified||!hasImageRepairTarget(state.initialAudit);
 ui.verify.disabled=state.busy||state.imported||!state.revised||!!state.verified;
 ui.downloadReport.disabled=state.busy||!state.audit;ui.downloadImage.disabled=state.busy||!state.revised;ui.downloadPackage.disabled=state.busy||!state.audit||!state.original;ui.importReportButton.disabled=state.busy||state.importing;ui.auditButton.disabled=state.busy||state.imported;
 ui.continueActions.hidden=!state.imported||!state.original;
 ui.continueOriginal.disabled=state.busy||state.importing||!state.imported||!state.original||state.history.length>=8;
 ui.continueRevised.disabled=state.busy||state.importing||!state.imported||!state.verified||!state.revised||state.history.length>=8;
 renderArchiveHistory();
 put('pipelineHint',state.imported?'Imported archive · choose Original or Revised to continue editing without re-auditing the saved image.':state.busy?'Processing with Meta. Please keep this tab open.':!ready?'Upload your creative and add product facts.':current===0?'Add facts, then run the initial audit.':current===1?'Inspect the evidence, then repair the creative.':current===2?'Compare both images, then verify the revision.':'Re-audit complete, NOT approved. Compare both images and review possible defects before use.');
 put('exportState',state.imported?(state.original?'Saved audit restored locally. Choose a source to resume; no Meta request until you press Repair or Verify.':'JSON report restored without source images; continue editing requires a ZIP containing images.'):current===3?'Both audits, risk warnings and claim trajectories. Candidate image needs manual review.':current>0?'Initial observations available. Re-audit completes the comparison.':'Run an audit to create a report.');

 for(const [id,active] of [['deckDetect',current>=1],['deckProof',current>=1],['deckDNA',current===3]]){
  const item=document.getElementById(id);if(item)item.classList.toggle('has-result',active);
 }
}
function renderArchiveHistory(){
 const rounds=state.history||[];
 ui.historyPanel.hidden=rounds.length===0;
 ui.historySummary.textContent='Previous audit rounds · '+rounds.length+' saved';
 ui.historyList.replaceChildren();
 for(const [i,round] of rounds.entries()){
  const entry=document.createElement('li');
  const initial=round.report?.original?.score;
  const verified=round.report?.verified?.score;
  const choice=round.from==='revised'?'revised image':'original image';
  entry.textContent='Round '+(i+1)+': '+(Number.isFinite(initial)?initial+'/100':'unscored')+
    (Number.isFinite(verified)?' → '+verified+'/100':'')+
    ' · continued from '+choice+
    (round.original?' · images retained':' · report only');
  ui.historyList.append(entry);
 }
}
function phase(n){state.phase=n; document.querySelectorAll('.stage').forEach((el,i)=>{el.classList.toggle('active',i===n);el.classList.toggle('complete',i<n);});syncDeck();}
function setBusy(b,label='Run audit'){state.busy=b;ui.auditButton.disabled=b;ui.refine.disabled=b;ui.verify.disabled=b;ui.auditText.textContent=b?label:'Run audit';ui.scan.hidden=!b;ui.drop.setAttribute('aria-busy',String(b));for(const field of [ui.product,ui.facts,ui.caption])field.disabled=b;syncDeck();}
function resetAudit({preserveHistory=false}={}){resetProofStudio();state.reportLanguage=null;ui.archiveLanguageNote.hidden=true;ui.archiveLanguageNote.textContent='';if(!preserveHistory)state.history=[];state.continuedFrom=null;state.imported=false;state.archivedReport=null;ui.archiveNotice.hidden=true;ui.archiveNotice.textContent='';for(const field of [ui.product,ui.facts,ui.caption])field.readOnly=false;state.context=null;state.runs=[];state.repairReview=null;state.audit=null;state.initialAudit=null;state.verified=null;state.revised=null;ui.repairNotice.hidden=true;ui.repairNotice.textContent='';ui.reportEmpty.hidden=false;ui.reportContent.hidden=true;ui.auditPhase.textContent='AWAITING INPUT';ui.refine.hidden=false;ui.verify.hidden=false;ui.downloadImage.hidden=false;ui.revisedTab.disabled=true;ui.compareTab.disabled=true;for(const image of [ui.before,ui.after])image.removeAttribute('src');phase(0);selectReportView('claims');}
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
  setAccessStatus('Code rejected by AI endpoint','invalid');
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
// Compare using a compact original in the EXISTING re-audit request.
// Failure to prepare the image prevents a paid verification attempt.
async function compactOriginalReference(dataUrl){
  if(typeof dataUrl!=='string'||!dataUrl.startsWith('data:image/'))throw Error('Gambar asli tidak tersedia untuk dibandingkan.');
  const img=new Image();img.decoding='async';img.src=dataUrl;
  try{await img.decode();}catch{throw Error('Gambar asli tidak dapat dibaca untuk verifikasi.');}
  const maxDim=420,scale=Math.min(1,maxDim/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('Browser tidak mendukung pembandingan gambar.');
  context.drawImage(img,0,0,canvas.width,canvas.height);
  for(const quality of [.66,.5,.35]){
    const sample=canvas.toDataURL('image/jpeg',quality);
    if(sample.length<320_000)return sample;
  }
  throw Error('Referensi gambar asli terlalu besar untuk pemeriksaan. Gunakan gambar sumber yang lebih kecil.');
}
async function upload(file){if(state.busy||state.importing)return;try{const data=await prepareImage(file);resetAudit();state.original=data;state.originalFilename=file.name;ui.empty.hidden=true;ui.name.textContent=file.name.toUpperCase();ui.replace.disabled=false;ui.originalTab.disabled=false;switchView('original');notify('Creative ready.');}catch(e){notify(e.message,true);}}
function switchView(view){
 if(view!=='original'&&!state.revised)return;
 state.view=view;$('#canvasSourceLabel').textContent=view==='compare'?'ORIGINAL / REVISED':view==='revised'?'REVISED SOURCE':'ORIGINAL SOURCE';
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
function payload(image){return {image,language:getLanguage(),...(state.context||inputContext())};}
function el(tag,cl,text){const e=document.createElement(tag);if(cl)e.className=cl;if(text!==undefined)e.textContent=text;return e;}
function renderClaimEvidence(a, verified=false){
 const ledger=Array.isArray(a.claim_ledger)?a.claim_ledger.slice(0,8):[];
 ui.claimPanel.hidden=ledger.length===0;
 ui.claimList.replaceChildren();
 $('#noClaimNotice').hidden=ledger.length>0;
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
 const issues=Array.isArray(a.issues)?a.issues:[];ui.count.textContent=`${String(issues.length).padStart(2,'0')} ISSUES`;
 ui.issues.replaceChildren();
 if(!issues.length)ui.issues.append(el('p','no-issues','No clear issues detected. Review manually before publishing.'));
 for(const issue of issues){
  const wrapper=el('div','issue');const button=el('button','issue-top');button.type='button';button.setAttribute('aria-expanded','false');
  const dot=el('span',`severity-dot ${issue.severity}`);const title=el('span','issue-title',issue.title);const cat=el('span','issue-cat',issue.category);const arrow=el('span','issue-chevron','+');button.append(dot,title,cat,arrow);
  const details=el('div','issue-details');details.hidden=true;const evidence=el('p','',issue.evidence);const suggestion=el('p');suggestion.append(el('strong','','Fix: '),document.createTextNode(issue.suggestion));details.append(evidence,suggestion);
  button.addEventListener('click',()=>{details.hidden=!details.hidden;button.setAttribute('aria-expanded',String(!details.hidden));arrow.textContent=details.hidden?'+':'−';});
  wrapper.append(button,details);ui.issues.append(wrapper);
 }
 ui.suggested.textContent=a.recommended_caption||'Belum ada saran caption.';
 if(verified && state.initialAudit) ui.scoreSummary.textContent=`${a.summary || ''} · Estimated score ${a.score>=state.initialAudit.score?'+':''}${a.score-state.initialAudit.score} vs original. A higher score is NOT proof the image improved.`;
  ui.repairNotice.hidden=!verified;
  if(verified){
    const risk=state.repairReview;
    ui.repairNotice.dataset.level=risk?.status==='regression_suspected'?'warning':'review';
    const heading=risk?.status==='regression_suspected'
      ? '⚠️ POSSIBLE REPAIR REGRESSION · DO NOT AUTO-APPROVE'
      : '⚠️ CANDIDATE ONLY · MANUAL REVIEW REQUIRED';
    ui.repairNotice.textContent=heading+' — '+(risk?.reasons||['Compare original and revised before using.']).join(' ');
  }
 ui.refine.hidden=false;
 ui.verify.hidden=false;
 ui.downloadImage.hidden=false;
}
async function performAudit(image,verify=false){
 if(state.imported)throw Error('Arsip bersifat read-only. Unggah gambar baru untuk menjalankan audit.');
 if(!state.configured)throw Error('Hubungkan MODEL_API_KEY di server terlebih dahulu.');
 setBusy(true,verify?'Verifying…':'Analyzing…');
 try{
  if(!verify){resetAudit({preserveHistory:state.history.length>0});switchView('original');state.context=inputContext();}
  const auditPayload={...payload(image)};
   if(verify)auditPayload.referenceImage=await compactOriginalReference(state.original);
   const out=await api('/api/audit',auditPayload);
   if(!out.audit||typeof out.audit!=='object'||!Number.isFinite(out.audit.score))throw Error('Audit response is incomplete. Please retry.');
   state.sparkResponded=true;if(verify)state.reauditResponded=true;state.reportLanguage=out.report_language||getLanguage();updateMetaStatus();state.audit=out.audit;state.runs.push({stage:verify?'reaudit':'initial',model:out.model,tokens:out.tokens,provenance:out.provenance||null});
  if(verify){
     state.verified=out.audit;
     state.repairReview=reviewRepairCandidate(state.initialAudit,out.audit,{originalReferenceSent:out.original_reference_sent===true});
     phase(3);
   }else{state.initialAudit=out.audit;state.verified=null;state.repairReview=null;phase(1);}
  render(out.audit,verify);renderProofStudio({before:state.initialAudit,after:state.verified,facts:state.context.facts,caption:state.context.caption,originalImage:state.original,revisedImage:state.revised,onInspect:stage=>switchView(stage==='revised'?'revised':'original')});syncDeck();notify(verify?(state.repairReview.status==='regression_suspected'?'Possible repair regression detected. Compare both images; NOT approved.':'Re-audit complete. Candidate NOT approved without manual comparison.'):'AI audit completed.',verify);
 }finally{setBusy(false);}
}
async function performImprove(){
 if(state.imported)throw Error('Arsip bersifat read-only. Unggah gambar baru sebelum membuat revisi.');
 if(!state.audit || !state.original)throw Error('Jalankan audit dulu.');
  if(!hasImageRepairTarget(state.initialAudit))throw Error('Tidak ada temuan gambar yang jelas untuk diperbaiki. Jangan paksa AI membuat ulang gambar tanpa alasan.');
 setBusy(true,'Refining…');
 try{
  const out=await api('/api/improve',{...payload(state.original),issues:state.initialAudit.issues,claims:state.initialAudit.claim_ledger});
  if(typeof out.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(out.image))throw Error('Repair response did not contain a valid image. Please retry.');state.imageResponded=true;updateMetaStatus();
  state.verified=null;state.repairReview=null;state.runs=state.runs.filter(r=>r.stage==='initial'||r.stage==='archive_baseline');state.runs.push({stage:'repair',model:out.model,provenance:out.provenance||null});state.revised=out.image;renderProofStudio({before:state.initialAudit,after:null,facts:state.context.facts,caption:state.context.caption,originalImage:state.original,revisedImage:state.revised,onInspect:()=>switchView('original')});ui.revisedTab.disabled=false;ui.compareTab.disabled=false;ui.verify.hidden=false;ui.downloadImage.hidden=false;phase(2);switchView('compare');notify('Muse Image membuat kandidat revisi, bukan hasil yang disetujui. Bandingkan gambar asli dan revisi sebelum digunakan.');
 }finally{setBusy(false);}
}
function download(data,name,type){const blob=data instanceof Blob?data:new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);}
for(const field of [ui.product,ui.facts,ui.caption])field.addEventListener('input',()=>{if(state.context&&!state.busy&&!state.imported){resetAudit({preserveHistory:state.history.length>0});switchView('original');notify('Product facts changed. The saved baseline cannot be reused; run a NEW audit to keep evidence consistent. Prior archive rounds remain preserved.');}});
ui.form.addEventListener('submit',async e=>{e.preventDefault();if(!state.original){notify('Unggah gambar iklan terlebih dahulu.',true);return;}if(state.busy||state.imported)return;try{await performAudit(state.original)}catch(e){notify(e.message,true);}});
ui.refine.addEventListener('click',async()=>{if(state.busy||state.imported)return;try{await performImprove();}catch(e){notify(e.message,true);}});
ui.verify.addEventListener('click',async()=>{if(state.busy||state.imported||!state.revised)return;try{await performAudit(state.revised,true);}catch(e){notify(e.message,true);}});
ui.copyCaption.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(ui.suggested.textContent);notify('Caption copied.');}catch{notify('Clipboard tidak tersedia.',true);}});
// Export the exact saved observation set; graph and DNA are rebuilt from
// model-selected ledgers, never trusted as executable imported data.
function reportSnapshot(){
 const report=state.imported&&state.archivedReport?
  {...state.archivedReport,...proofReport()}:
  {app:'AdProof AI',date:new Date().toISOString(),report_language:state.reportLanguage||'und',product:state.context?.product,context:state.context,
   caption_scope:'The supplied caption is unchanged in both audits; image repair does not edit external caption text.',
   runs:state.runs,repair_review:state.repairReview,...proofReport(),
   original:state.initialAudit,verified:state.verified,
   disclaimer:'Saved model observations, not independently certified. Image edits always need human review.'};
 // JSON contains metadata only, no image bytes. ZIP adds historical pixels.
 report.archive_history=(state.history||[]).map(round=>({from:round.from,report:round.report}));
 return report;
}
function restoreAuditSnapshot({report,original,revised,history=[],hasImages}){
 // Validation/parsing and ZIP integrity checks are complete BEFORE modifying
 // the current session. No API call, re-scoring or remote verification here.
 state.original=null;resetAudit();
 state.history=history;
 state.original=original||null;state.originalFilename=original?'original (archived)':'no original in JSON';
 state.revised=revised||null;
 state.context={...report.context};
 state.initialAudit=report.original;
 state.verified=report.verified||null;
 state.audit=state.verified||state.initialAudit;
 state.repairReview=report.repair_review||null;
 state.runs=report.runs||[];
 state.archivedReport=report;
 state.reportLanguage=report.report_language||'und';
 state.imported=true;
 state.continuedFrom=null;
 state.sparkResponded=false;state.imageResponded=false;state.reauditResponded=false;
 updateMetaStatus(); // saved model output is NOT a new verified Meta call
 ui.product.value=report.context.product;
 ui.facts.value=report.context.facts;
 ui.caption.value=report.context.caption;
 for(const field of [ui.product,ui.facts,ui.caption])field.readOnly=true;
 ui.originalTab.disabled=!state.original;
 ui.revisedTab.disabled=!state.revised;
 ui.compareTab.disabled=!(state.original&&state.revised);
 ui.replace.disabled=false;
 ui.name.textContent=hasImages?'ORIGINAL IMAGE · SAVED ARCHIVE':'AUDIT JSON · IMAGES NOT INCLUDED';
 ui.archiveNotice.hidden=false;
 renderSavedLanguageNotice();
 ui.archiveNotice.textContent=hasImages
   ? 'IMPORTED ARCHIVE · READ ONLY UNTIL YOU CHOOSE A SOURCE. Select Repair original or Repair revised below to continue using the saved audit (no repeat initial audit). No Meta AI call was made on import. Saved report is not independently authenticated.'
   : 'IMPORTED JSON · READ ONLY. Claim DNA and proof records restored, but the old JSON contains NO original/revised pixels. Continue editing requires ZIP with images; cannot invent missing pixels. No Meta AI call was made.';
 phase(state.verified?3:1);
 render(state.audit,Boolean(state.verified));
 renderProofStudio({before:state.initialAudit,after:state.verified,
  facts:state.context.facts,caption:state.context.caption,
  originalImage:state.original,revisedImage:state.revised,
  onInspect:stage=>{if(state.original)switchView(stage==='revised'&&state.revised?'revised':'original');}});
 switchView(state.original&&state.revised&&state.verified?'compare':'original');
 selectReportView('claims');
 activateProofView(state.verified?'evolution':'xray');
 syncDeck();syncSticky();
 notify(hasImages?'Saved archive restored. No paid model request.':'Saved JSON restored without images. No paid model request.');
}
// Explicit continuation preserves the whole imported round and all older
// rounds as evidence before any changes. No inference is performed here.
function continueArchivedAudit(from){
 if(state.busy||state.importing||!state.imported) return;
 if(!['original','revised'].includes(from))return;
 if(state.history.length>=8){notify('Riwayat sudah mencapai 8 putaran. Ekspor ZIP lama dahulu; tidak akan ada riwayat yang dihapus otomatis.',true);return;}
 const image=from==='revised'?state.revised:state.original;
 const baseline=from==='revised'?state.verified:state.initialAudit;
 if(!image||!baseline){notify('Gambar dan audit untuk sumber ini tidak tersedia. Impor paket ZIP lengkap.',true);return;}
 const snapshot=reportSnapshot();
 const preserved={from,report:snapshot,original:state.original,revised:state.revised};
 const priorModel=state.runs.filter(x=>x.stage===(from==='revised'?'reaudit':'initial')).at(-1);
 state.history=[...state.history,preserved];
 state.imported=false;state.archivedReport=null;state.continuedFrom=from;
 ui.archiveLanguageNote.hidden=true;
 state.original=image;
 state.originalFilename='saved '+from+' · repair baseline';
 state.initialAudit=baseline;
 state.audit=baseline;
 state.verified=null;state.revised=null;state.repairReview=null;
 state.runs=[{stage:'archive_baseline',origin:'saved_archive',model:priorModel?.model||'Saved audit model (not rerun)',
  tokens:null,provenance:priorModel?.provenance||null}];
 state.sparkResponded=false;state.imageResponded=false;state.reauditResponded=false;
 updateMetaStatus();
 for(const field of [ui.product,ui.facts,ui.caption])field.readOnly=false;
 ui.originalTab.disabled=false;ui.revisedTab.disabled=true;ui.compareTab.disabled=true;
 ui.archiveNotice.hidden=false;
 ui.archiveNotice.textContent='CONTINUED FROM SAVED '+from.toUpperCase()+' · Archived baseline '+baseline.score+'/100 reused without a Meta call. Old round and both images kept in the next ZIP. Press Repair creative deliberately to generate a new image (potentially paid); Verify separately. The revision is never automatically approved.';
 ui.name.textContent='SAVED '+from.toUpperCase()+' · REPAIR BASELINE';
 resetProofStudio();
 render(baseline,false);
 renderProofStudio({before:baseline,after:null,facts:state.context.facts,caption:state.context.caption,
  originalImage:state.original,revisedImage:null,onInspect:()=>switchView('original')});
 phase(1);switchView('original');selectReportView('claims');activateProofView('xray');
 syncDeck();syncSticky();
 notify('Saved '+from+' audit reused. No new API request. Review issues, then press Repair when ready.');
}
ui.continueOriginal.addEventListener('click',()=>continueArchivedAudit('original'));
ui.continueRevised.addEventListener('click',()=>continueArchivedAudit('revised'));
ui.downloadReport.addEventListener('click',()=>{
 if(state.busy||!state.audit)return;
 try{download(JSON.stringify(reportSnapshot(),null,2),'adproof-audit.json','application/json');}
 catch(e){notify(e.message,true);}
});
ui.downloadPackage.addEventListener('click',()=>{
 if(state.busy||!state.audit||!state.original)return;
 try{
  const pkg=createAuditPackage(reportSnapshot(),state.original,state.revised,state.history);
  download(pkg.blob,'adproof-audit-package.zip','application/zip');
  notify('Paket audit tersimpan: JSON dan gambar asli/revisi sesuai format sebenarnya.');
 }catch(e){notify(e.message,true);}
});
ui.downloadImage.addEventListener('click',()=>{
 if(!state.revised)return;
 try{
  const {bytes,mime,extension}=fromImageDataUrl(state.revised);
  download(new Blob([bytes],{type:mime}),'adproof-revised.'+extension,mime);
 }catch(e){notify(e.message,true);}
});
const chooseImport=()=>{if(state.busy||state.importing)return;ui.importReportInput.click();};
ui.importReportButton.addEventListener('click',chooseImport);
ui.importReportStart.addEventListener('click',chooseImport);
ui.importReportInput.addEventListener('change',async()=>{
 const file=ui.importReportInput.files?.[0];ui.importReportInput.value='';
 if(!file||state.busy||state.importing)return;
 state.importing=true;syncDeck();
 try{
  const archive=await openAuditFile(file);
  restoreAuditSnapshot(archive);
 }catch(e){notify('Impor tidak berhasil: '+e.message,true);}
 finally{state.importing=false;syncDeck();}
});
ui.browse.addEventListener('click',e=>{e.stopPropagation();ui.file.click();});ui.replace.addEventListener('click',()=>ui.file.click());ui.drop.addEventListener('click',e=>{if(e.target.closest('button,input')||state.busy||state.view==='compare')return;ui.file.click();});ui.drop.addEventListener('keydown',e=>{if(e.target===ui.drop&&(e.key==='Enter'||e.key===' ')){e.preventDefault();ui.file.click();}});
ui.file.addEventListener('change',async e=>{const f=e.target.files?.[0];if(f)await upload(f);ui.file.value='';});
for(const evt of ['dragenter','dragover'])ui.drop.addEventListener(evt,e=>{e.preventDefault();ui.drop.classList.add('dragging');});for(const evt of ['dragleave','drop'])ui.drop.addEventListener(evt,e=>{e.preventDefault();ui.drop.classList.remove('dragging');});ui.drop.addEventListener('drop',e=>{if(e.dataTransfer?.files?.[0])upload(e.dataTransfer.files[0]);});
ui.originalTab.addEventListener('click',()=>switchView('original'));ui.revisedTab.addEventListener('click',()=>switchView('revised'));ui.compareTab.addEventListener('click',()=>switchView('compare'));ui.range.addEventListener('input',e=>setCompare(Number(e.target.value)));
fetch('/api/health').then(r=>{if(!r.ok)throw Error('Health unavailable');return r.json();}).then(info=>{
 state.configured=!!info.configured;state.demoGate=!!info.demoGate;
 ui.accessButton.hidden=!state.demoGate;
 updateMetaStatus();
 if(state.demoGate) {
  const saved=getCode();
  if(saved){setCode('');void verifyCode(saved,{restoring:true});}
  else setCode('');
 }else{
  setCode('');setAccessStatus('Private demo access unavailable','invalid');
 }
 if(!state.configured)notify('Untuk audit real-time, konfigurasi MODEL_API_KEY di server.',true);
}).catch(()=>{
 state.configured=false;updateMetaStatus();ui.connectionText.textContent='SERVER OFFLINE';
 setAccessStatus('Verification unavailable','invalid');
});
// Report navigation reveals one meaningful group at a time.
function selectReportView(view){
 for(const [key,id] of [['claims','reportClaims'],['findings','reportFindings'],['caption','reportCaption']])$('#'+id).hidden=key!==view;
 for(const b of document.querySelectorAll('[data-report-view]'))b.setAttribute('aria-pressed',String(b.dataset.reportView===view));
}
for(const b of document.querySelectorAll('[data-report-view]'))b.addEventListener('click',()=>selectReportView(b.dataset.reportView));
for(const b of document.querySelectorAll('[data-focus-input]'))b.addEventListener('click',()=>{
 const target=!state.original?ui.browse:!ui.product.value.trim()?ui.product:ui.facts;
 target.scrollIntoView({block:'center',behavior:'auto'});target.focus({preventScroll:true});
});
/* Public, no-cost exploration of the proof workspace. This switches real UI
   sections with explicitly labelled wireframes; it never calls a model. */
$('#exploreProofButton').addEventListener('click',()=>activateProofView('constellation',true));
const stickyAudit=$('#stickyAudit'),stickyLabel=$('#stickyLabel');
function syncSticky(){
 const done=state.phase===3;
 stickyAudit.disabled=state.busy||state.imported;
 stickyAudit.textContent=state.imported?'Archive · read only':state.busy?'Processing…':done?'Inspect changes →':state.phase===2?'Verify revision ↗':state.phase===1?'Repair creative ↗':'Run audit ↗';
 stickyLabel.textContent=state.imported?'Saved report · no Meta API used':state.busy?'Meta model request':done?'Candidate NOT approved · Review images':state.phase===2?'Review candidate image':state.phase===1?'Initial audit complete':!state.original?'Add a creative to begin':'Add facts to begin';
}
stickyAudit.addEventListener('click',()=>{if(state.busy||state.imported)return;if(state.phase===3)activateProofView('evolution',true);else if(state.phase===2)ui.verify.click();else if(state.phase===1)ui.refine.click();else ui.form.requestSubmit();});
new MutationObserver(syncSticky).observe(ui.auditButton,{attributes:true,attributeFilter:['disabled']});
ui.form.addEventListener('input',syncSticky);
ui.language.value=getPreference();
ui.language.addEventListener('change',()=>{
 setPreference(ui.language.value);
 applySelectedLanguage();
 notify(getLanguage()==='id'?'Bahasa antarmuka diperbarui. Laporan tersimpan tidak diubah.':'Interface language updated. Historical model text is unchanged.');
});
onBrowserLanguageChange(()=>applySelectedLanguage());
applySelectedLanguage();
observeDynamicLabels();
syncDeck();syncSticky();
