import {createConsistencyUI} from './consistency-ui.js';
import {inspectConsistency} from './visual-consistency.js';
import {comparePixels,compositeRegion,dimensions,repairTextLocally,verifyLocalPixels,extendFlatBackground,compositePlannedRegions,compositeReferenceFrame} from './output-system.js';
import {inspectFormatCandidate} from './visual-consistency.js';
import {renderProofStudio, resetProofStudio, proofReport, openClaimInspector, activateProofView, refreshProofLanguage} from './proof-studio.js';
import {reviewRepairCandidate,reviewUnchangedCaption} from './repair-guard.js';
import {isClearlySubjectiveSlogan} from './claim-engine.js';
import {describeRepairNotice} from './repair-notice.js';
import {repairJourney} from './repair-journey.js';
import {repairCaption,reviewRepairedCaption} from './factual-repair.js';
import {planOneCorrection,correctionPayload} from './auto-correction.js';
import {createAuditPackage,fromImageDataUrl,openAuditFile} from './audit-archive.js';
import {storeRecovery,retrieveRecovery,removeRecovery} from './local-recovery.js';
import {loadPreference,setPreference,getPreference,getLanguage,t,applyLanguage,observeDynamicLabels,onBrowserLanguageChange} from './i18n.js';
const $ = (selector) => document.querySelector(selector);
const ui = {
  language:$('#languageSelect'),file:$('#fileInput'),drop:$('#dropzone'),browse:$('#browseButton'),replace:$('#newCreative'),empty:$('#emptyCanvas'),image:$('#creativeImage'),name:$('#fileName'),
  originalTab:$('#viewOriginal'), revisedTab:$('#viewRevised'), compareTab:$('#viewCompare'),
  compare:$('#compareView'),before:$('#compareBefore'),after:$('#compareAfter'), beforeWrap:$('#compareBeforeWrap'),bar:$('#compareBar'),range:$('#compareRange'),
  form:$('#projectForm'),product:$('#product'),facts:$('#facts'),caption:$('#caption'),captionSafety:$('#captionSafetyNotice'),auditButton:$('#auditButton'),auditText:$('#auditButtonText'),
  auditPhase:$('#auditPhase'),reportEmpty:$('#reportEmpty'),reportContent:$('#reportContent'),repairNotice:$('#repairGuardNotice'),scoreRing:$('#scoreRing'),scoreValue:$('#scoreValue'),scoreHeadline:$('#scoreHeadline'),scoreSummary:$('#scoreSummary'),scoreExplanation:$('#scoreExplanation'),scoreExplanationLabel:$('#scoreExplanationLabel'),scoreExplanationContent:$('#scoreExplanationContent'),
  breakdown:$('#breakdown'), issues:$('#issuesList'), count:$('#issueCount'),suggested:$('#suggestedCaption'),copyCaption:$('#copyCaption'),
  claimPanel:$('#claimEvidencePanel'), claimList:$('#claimEvidenceList'),claimCount:$('#claimEvidenceCount'),
  refine:$('#refineButton'),verify:$('#verifyButton'),downloadReport:$('#downloadReport'),downloadImage:$('#downloadImage'),downloadPackage:$('#downloadPackage'),importReportButton:$('#importReportButton'),importReportStart:$('#importReportStart'),importReportInput:$('#importReportInput'),archiveNotice:$('#archiveRestoreNotice'),archiveLanguageNote:$('#archiveLanguageNote'),continueActions:$('#archiveContinueActions'),continueOriginal:$('#continueFromOriginal'),continueRevised:$('#continueFromRevised'),historyPanel:$('#archiveHistoryPanel'),historySummary:$('#archiveHistorySummary'),historyList:$('#archiveHistoryList'),
  recoveryBar:$('#localRecoveryBar'),recoveryText:$('#localRecoveryText'),recoveryClear:$('#clearLocalRecovery'),
  journey:$('#repairJourney'),journeyButton:$('#repairJourneyButton'),
  scan:$('#scanOverlay'),toast:$('#toast'),connection:$('#connection'),connectionText:$('#connectionText'),
  accessButton:$('#judgeAccessButton'),accessDialog:$('#judgeAccessDialog'),accessForm:$('#judgeAccessForm'),accessInput:$('#judgeAccessCode'),accessHint:$('#judgeAccessHint'),accessCancel:$('#judgeAccessCancel'),accessSubmit:$('#judgeAccessForm button[type=submit]'),accessError:$('#judgeAccessError'),accessStatus:$('#judgeAccessStatus'),providerStatus:$('#metaProviderStatus')
};
loadPreference();
const state={captionRepair:null,reportLanguage:null,original:null,originalFilename:null,revised:null,audit:null,initialAudit:null,verified:null,view:'original',busy:false,configured:false,demoGate:false,phase:0,context:null,runs:[],formatHistory:[],repairReview:null,imported:false,importing:false,archivedReport:null,history:[],autoCorrection:null,continuedFrom:null,accessVerified:false,sparkResponded:false,imageResponded:false,reauditResponded:false};
const visualUI=createConsistencyUI({state,language:getLanguage,onSettingsChange:()=>{},download,notify,adaptFormat});
let toastTimer=null;

// Persist completed milestones in THIS browser only, never the access code.
// Serializing writes prevents a late old save from resurrecting an invalidated
// session after a new upload, changed facts or user-requested clear.
let recoveryQueue=Promise.resolve();
let recoveryVersion=0;
function setRecoveryStatus(message,warning=false){
 ui.recoveryBar.hidden=false;
 ui.recoveryBar.dataset.warning=String(warning);
 ui.recoveryText.dataset.message=message;
 ui.recoveryText.textContent=t(message);
}
async function persistMilestone(){
 if(!state.original||!state.initialAudit||state.imported)return;
 const snapshot={report:reportSnapshot(),original:state.original,revised:state.revised||null,history:state.history||[]};
 const version=recoveryVersion;
 recoveryQueue=recoveryQueue.catch(()=>{}).then(async()=>{
  if(version!==recoveryVersion)return;
  try{
   await storeRecovery(snapshot);
   if(version===recoveryVersion)setRecoveryStatus('Local recovery saved on this device. No Meta call; use Export ZIP for a separate backup.');
  }catch{
   if(version===recoveryVersion)setRecoveryStatus('Local autosave unavailable on this device. Export ZIP now to protect this audit.',true);
  }
 });
 await recoveryQueue;
}
function forgetMilestone(){
 recoveryVersion++;
 recoveryQueue=recoveryQueue.catch(()=>{}).then(async()=>{
  try{await removeRecovery();return true;}catch{setRecoveryStatus('Unable to clear local browser recovery. Clear website storage in browser settings.',true);return false;}
 });
 return recoveryQueue;
}
async function recoverMilestone(){
 try{
  const snapshot=await retrieveRecovery();
  if(!snapshot||state.original||state.importing||ui.product.value.trim()||ui.facts.value.trim())return;
  restoreAuditSnapshot({...snapshot,hasImages:true},{resumeLive:true});
  setRecoveryStatus('Recovered the last completed audit/repair from this browser. No Meta request was made. Review the images and export ZIP.');
 }catch{
  // IndexedDB may be unavailable in private mode; keep the normal Studio usable.
 }
}
ui.recoveryClear.addEventListener('click',async()=>{
 await forgetMilestone();
 ui.recoveryBar.hidden=true;
 ui.recoveryBar.dataset.warning='false';
 notify('Local recovery backup cleared. The current open Studio session remains visible.');
});

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
 visualUI.sync();
 syncDeck();syncSticky();
 applyLanguage();
 if(ui.recoveryText.dataset.message)ui.recoveryText.textContent=t(ui.recoveryText.dataset.message);
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
function refreshCaptionSafety(){
 const caption=state.captionRepair;
 ui.captionSafety.hidden=!caption;
 ui.captionSafety.textContent=caption?(getLanguage()==='id'
  ?'Caption dikoreksi otomatis dari fakta produk. Caption asli tetap tersimpan dalam riwayat dan paket ZIP.'
  :'Caption automatically corrected from product facts. The original remains in history and the ZIP archive.'):'';
}

function updateRepairJourney(){
 const retryEligible=!!state.verified&&state.consistencyReview?.status==='failed'
  &&!state.imported&&!state.busy&&state.history.length<8
  &&planOneCorrection({initial:state.initialAudit,verified:state.verified,
    consistencyReview:state.consistencyReview,repairReview:state.repairReview,
    alreadyAttempted:Boolean(state.autoCorrection?.attempted)}).allowed;
 const view=repairJourney(state,{canRepair:hasImageRepairTarget(state.initialAudit),
   canRetry:retryEligible,language:getLanguage()});
 ui.journey.hidden=!view.visible;
 if(!view.visible)return;
 const fill=(suffix,value)=>{document.getElementById('repairJourney'+suffix).textContent=value||'';};
 const id=getLanguage()!=='en';
 fill('Title',view.title);
 fill('Status',({ready:id?'SIAP':'READY',processing:id?'DIPROSES':'PROCESSING',
  passed:id?'LOLOS':'PASSED',blocked:id?'PERLU PERBAIKAN':'NEEDS WORK',
  unverified:id?'BELUM DIPERIKSA':'NOT VERIFIED',saved:id?'TERSIMPAN':'SAVED',
  'no-image-fix':id?'TANPA REPAIR GAMBAR':'NO IMAGE REPAIR'})[view.phase]||'');
 ui.journey.dataset.phase=view.phase;
 for(const [field,labelId,labelEn] of [['Issue','Temuan','Finding'],['Action','Tindakan','Action'],
  ['Method','Cara perbaikan','How it works'],['Change','Perubahan teramati','Observed change'],
  ['Result','Hasil pemeriksaan','Verification result']]){
  fill(fieldLabel(field),id?labelId:labelEn);
  fill(field,view[field.toLowerCase()]);
 }
 fill('Next',view.next);fill('Footnote',view.footnote);
 fill('Guidance',view.guidance);
 document.getElementById('repairJourneyGuidance').hidden=!view.guidance;
 document.getElementById('repairJourneyChange').parentElement.hidden=!view.change;
 ui.journeyButton.hidden=!view.button;
 ui.journeyButton.disabled=state.busy||state.imported;
 ui.journeyButton.dataset.action=view.button?.action||'';
 ui.journeyButton.textContent=view.button?.label||'';
}
function fieldLabel(field){return field+'Label';}

function syncDeck(){
 refreshCaptionSafety();
 const current=state.phase, ready=!!state.original, indonesian=getLanguage()==='id';
 const ledger=state.verified?.claim_ledger??state.initialAudit?.claim_ledger;
 const count=Array.isArray(ledger)?ledger.length:0;
 const put=(id,text)=>{const node=document.getElementById(id);if(node)node.textContent=t(text);};
 put('deckPhase',state.imported?'IMPORTED ARCHIVE · READ ONLY':state.continuedFrom?'CONTINUED FROM ARCHIVE · LIVE REPAIR':state.busy?'META AI PROCESSING':!ready?'AWAITING CREATIVE':['READY TO AUDIT','INITIAL AUDIT COMPLETE','REPAIR GENERATED','RE-AUDIT COMPLETE'][current]);
 put('deckDetectState',current>0?(count?(indonesian?count+' klaim teramati · periksa':count+' observed claim'+(count===1?'':'s')+' · inspect'):'No readable claims reported'):ready?'Image loaded · start audit':'Upload creative to start');
 put('deckProofState',current>0?'Inspect traced evidence links':'Awaiting observed claims');
 put('deckDNAState',current===3?'View claim trajectories':current===2?'Repair ready · run re-audit':'Awaiting comparison');
 ui.refine.disabled=state.busy||state.imported||!state.initialAudit||!!state.verified||!hasImageRepairTarget(state.initialAudit);
 ui.verify.disabled=state.busy||state.imported||!state.revised||!!state.verified;
 ui.downloadReport.disabled=state.busy||!state.audit;ui.downloadImage.disabled=state.busy||!state.revised;ui.downloadPackage.disabled=state.busy||!state.audit||!state.original;ui.importReportButton.disabled=state.busy||state.importing;ui.auditButton.disabled=state.busy||state.imported||!!state.initialAudit;
  if(!state.busy)ui.auditText.textContent=t(state.initialAudit?'Audit complete ✓':'Run audit');
 ui.continueActions.hidden=!state.imported||!state.original;
 ui.continueOriginal.disabled=state.busy||state.importing||!state.imported||!state.original||state.history.length>=8;
 ui.continueRevised.disabled=state.busy||state.importing||!state.imported||!state.verified||!state.revised||state.history.length>=8;
 renderArchiveHistory();
 visualUI.sync();
 updateRepairJourney();
 put('pipelineHint',state.imported?'Imported archive · choose Original or Revised to continue editing without re-auditing the saved image.':state.busy?'Processing with Meta. Please keep this tab open.':!ready?'Upload your creative and add product facts.':current===0?'Add facts, then run the initial audit.':current===1?(hasImageRepairTarget(state.initialAudit)?'Inspect the evidence, then repair the creative.':'No grounded image repair required. Review findings or export the audit; do not force an edit.'):current===2?'Automatic verification is pending.':state.consistencyReview?.status==='validated'?'Automatic validation complete. Choose the output size and export.':'Validation incomplete. Export blocked; source and candidate retained.');
 put('exportState',state.imported?(state.original?'Saved audit restored locally. Choose a source to resume; no Meta request until you press Repair or Verify.':'JSON report restored without source images; continue editing requires a ZIP containing images.'):current===3?(state.consistencyReview?.status==='validated'?'Validated revision, corrected caption and audit evidence available.':'Source, candidate and audit evidence retained. Final export awaits validation.'):current>0?'Initial observations available. Re-audit completes the comparison.':'Run an audit to create a report.');

 for(const [id,active] of [['deckDetect',current>=1],['deckProof',current>=1],['deckDNA',current===3]]){
  const item=document.getElementById(id);if(item)item.classList.toggle('has-result',active);
 }
}
function renderArchiveHistory(){
 const rounds=state.history||[];
 ui.historyPanel.hidden=rounds.length===0;
 ui.historySummary.textContent=getLanguage()==='id'?'Putaran audit sebelumnya · '+rounds.length+' tersimpan':'Previous audit rounds · '+rounds.length+' saved';
 ui.historyList.replaceChildren();
 for(const [i,round] of rounds.entries()){
  const entry=document.createElement('li');
  const initial=round.report?.original?.score;
  const verified=round.report?.verified?.score;
  const choice=round.from==='revised'?'revised image':'original image';
  entry.textContent=getLanguage()==='id'?`Putaran ${i+1}: ${Number.isFinite(initial)?initial+'/100':'belum dinilai'}${Number.isFinite(verified)?' → '+verified+'/100':''} · dari ${round.from==='revised'?'gambar revisi':'gambar asli'}${round.original?' · gambar tersimpan':' · hanya laporan'}`:'Round '+(i+1)+': '+(Number.isFinite(initial)?initial+'/100':'unscored')+
    (Number.isFinite(verified)?' → '+verified+'/100':'')+
    ' · continued from '+choice+
    (round.original?' · images retained':' · report only');
  ui.historyList.append(entry);
 }
}
function phase(n){state.phase=n; document.querySelectorAll('.stage').forEach((el,i)=>{el.classList.toggle('active',i===n);el.classList.toggle('complete',i<n);});syncDeck();}
function setBusy(b,label='Run audit'){state.busy=b;ui.auditButton.disabled=b;ui.refine.disabled=b;ui.verify.disabled=b;ui.auditText.textContent=b?label:'Run audit';ui.scan.hidden=!b;ui.drop.setAttribute('aria-busy',String(b));for(const field of [ui.product,ui.facts,ui.caption])field.disabled=b;syncDeck();}
function resetAudit({preserveHistory=false}={}){state.captionRepair=null;state.autoCorrection=null;state.formatHistory=[];state.consistencyReview=null;state.repairMetadata=null;visualUI.clear();resetProofStudio();state.reportLanguage=null;ui.archiveLanguageNote.hidden=true;ui.archiveLanguageNote.textContent='';if(!preserveHistory)state.history=[];state.continuedFrom=null;state.imported=false;state.archivedReport=null;ui.archiveNotice.hidden=true;ui.archiveNotice.textContent='';for(const field of [ui.product,ui.facts,ui.caption])field.readOnly=false;state.context=null;state.runs=[];state.repairReview=null;state.audit=null;state.initialAudit=null;state.verified=null;state.revised=null;ui.repairNotice.hidden=true;ui.repairNotice.textContent='';ui.reportEmpty.hidden=false;ui.reportContent.hidden=true;ui.auditPhase.textContent='AWAITING INPUT';ui.refine.hidden=false;ui.verify.hidden=false;ui.downloadImage.hidden=false;ui.revisedTab.disabled=true;ui.compareTab.disabled=true;for(const image of [ui.before,ui.after])image.removeAttribute('src');phase(0);selectReportView('claims');}
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
   if(file.size*4/3<CAP){const raw=await file.arrayBuffer();const bytes=new Uint8Array(raw);let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return 'data:'+file.type+';base64,'+btoa(binary);}
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
  if(dataUrl.length<450_000)return dataUrl;
  const maxDim=1280,scale=Math.min(1,maxDim/Math.max(img.naturalWidth,img.naturalHeight));
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
async function upload(file){if(state.busy||state.importing)return;try{const data=await prepareImage(file);resetAudit();await forgetMilestone();ui.recoveryBar.hidden=true;state.original=data;
 if(state.fullOriginalURL)URL.revokeObjectURL(state.fullOriginalURL);
 state.fullOriginalURL=URL.createObjectURL(file);
 state.uploadDimensions=await dimensions(state.fullOriginalURL);
 state.sourceDimensions=await dimensions(data);state.originalFilename=file.name;ui.empty.hidden=true;ui.name.textContent=file.name.toUpperCase();ui.replace.disabled=false;ui.originalTab.disabled=false;switchView('original');notify('Creative ready.');}catch(e){notify(e.message,true);}}
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
function payload(image){const context=state.context||inputContext();if(state.initialAudit&&!state.captionRepair)state.captionRepair=repairCaption({...context,original:context.caption});return {image,consistency:state.repairMetadata?.settings||visualUI.readSettings(),language:getLanguage(),...context,caption:state.captionRepair?.final??context.caption};}
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
 ui.claimCount.textContent=getLanguage()==='id'?`${ledger.length} KLAIM · ${verified?'AUDIT ULANG':'AWAL'}`:`${ledger.length} CLAIM${ledger.length===1?'':'S'} · ${verified?'RE-CHECK':'INITIAL'}`;
 for(const [index,item] of ledger.entries()){
  const mapped=labels[item.assessment]||labels.needs_human_review;
  const expressive=isClearlySubjectiveSlogan(item);
  const card=el('article','claim-evidence-item');
  const top=el('div','claim-evidence-top');
  const source=el('span','claim-evidence-source',item.origin==='caption'?'CAPTION':item.origin==='creative'?'CREATIVE':'SOURCE UNCERTAIN');
  const status=el('span',`claim-evidence-status ${expressive?'uncertain':mapped[1]}`,expressive?(getLanguage()==='id'?'SLOGAN KREATIF':'CREATIVE SLOGAN'):mapped[0]);
  top.append(source,status);
  const claim=el('p','claim-evidence-claim',String(item.claim||''));
  card.append(top,claim);
  if(item.fact_quote){
   const quote=el('div','claim-evidence-fact');
   quote.append(el('span','claim-evidence-kicker','INPUT FACT'),el('q','',String(item.fact_quote)));
   card.append(quote);
  }
  if(expressive)card.append(el('p','claim-evidence-detail',getLanguage()==='id'?'Kalimat promosi kreatif; tidak memerlukan bukti spesifikasi.':'Creative promotional language; no specification proof is required.'));
  else {
   if(item.reason)card.append(el('p','claim-evidence-detail',String(item.reason)));
   if(item.recommended_action)card.append(el('p','claim-evidence-action',String(item.recommended_action)));
  }
  const inspect=el('button','text-button','Inspect claim ↗');inspect.type='button';inspect.addEventListener('click',()=>openClaimInspector(index,verified?'revised':'initial'));card.append(inspect);
  ui.claimList.append(card);
 }
}

function render(a,verified=false){
 ui.reportEmpty.hidden=true;ui.reportContent.hidden=false;
 ui.auditPhase.textContent=verified?'RE-CHECK COMPLETE':'AUDIT COMPLETE';
 ui.scoreRing.style.setProperty('--score',String(a.score)); ui.scoreValue.textContent=String(a.score);
 // Compact, factual overview; full Meta prose stays available on demand
 // and in the saved audit. Scores/ledger/export decisions remain unchanged.
 ui.scoreHeadline.textContent=verified
  ?(getLanguage()==='id'?'Hasil audit revisi':'Revised audit results')
  :(getLanguage()==='id'?'Hasil audit iklan':'Creative audit results');
 const observed=Array.isArray(a.claim_ledger)?a.claim_ledger.length:0;
 const findings=Array.isArray(a.issues)?a.issues.length:0;
 const verificationStatus=verified
  ?(state.consistencyReview?.status==='validated'&&state.repairReview?.status!=='regression_suspected'
     ?(getLanguage()==='id'?'Konsistensi lolos':'Consistency passed')
     :(getLanguage()==='id'?'Konsistensi belum lolos':'Consistency not passed'))
  :'';
 ui.scoreSummary.textContent=(getLanguage()==='id'
  ?`${observed} klaim tercatat · ${findings} temuan audit`
  :`${observed} claims recorded · ${findings} audit findings`)+(verificationStatus?' · '+verificationStatus:'');
 ui.scoreExplanationLabel.textContent=getLanguage()==='id'?'Lihat penjelasan AI':'Show AI explanation';
 const scoreChange=verified&&state.initialAudit
  ?(getLanguage()==='id'
    ?`Perubahan skor: ${a.score-state.initialAudit.score>=0?'+':''}${a.score-state.initialAudit.score}. Skor lebih tinggi BUKAN bukti gambar membaik.`
    :`Score change: ${a.score-state.initialAudit.score>=0?'+':''}${a.score-state.initialAudit.score}. A higher score is NOT proof the image improved.`)
  :'';
 ui.scoreExplanationContent.textContent=[a.headline,a.summary,scoreChange].filter(Boolean).join('\n\n');
 ui.scoreExplanation.hidden=!ui.scoreExplanationContent.textContent;
 ui.scoreExplanation.open=false;
 ui.breakdown.replaceChildren();
 for(const [label,key] of [['Claims','claim'],['Clarity','clarity'],['Layout','hierarchy'],['Action','action']]){
  const metric=el('div','metric');metric.append(el('span','',label),el('b','',String(a.checks?.[key]??'--')));ui.breakdown.append(metric);
 }
 renderClaimEvidence(a,verified);
 const issues=Array.isArray(a.issues)?a.issues:[];ui.count.textContent=getLanguage()==='id'?`${String(issues.length).padStart(2,'0')} TEMUAN`:`${String(issues.length).padStart(2,'0')} ISSUES`;
 ui.issues.replaceChildren();
 if(!issues.length)ui.issues.append(el('p','no-issues',t('No clear issues detected. Review manually before publishing.')));
 for(const issue of issues){
  const wrapper=el('div','issue');const button=el('button','issue-top');button.type='button';button.setAttribute('aria-expanded','false');
  const dot=el('span',`severity-dot ${issue.severity}`);const title=el('span','issue-title',issue.title);const cat=el('span','issue-cat',issue.category);const arrow=el('span','issue-chevron','+');button.append(dot,title,cat,arrow);
  const details=el('div','issue-details');details.hidden=true;const evidence=el('p','',issue.evidence);const suggestion=el('p');suggestion.append(el('strong','','Fix: '),document.createTextNode(issue.suggestion));details.append(evidence,suggestion);
  button.addEventListener('click',()=>{details.hidden=!details.hidden;button.setAttribute('aria-expanded',String(!details.hidden));arrow.textContent=details.hidden?'+':'−';});
  wrapper.append(button,details);ui.issues.append(wrapper);
 }
 ui.suggested.textContent=state.captionRepair?.final||a.recommended_caption||t('No caption suggestion available.');

  ui.repairNotice.hidden=!verified;
  if(verified){
    const notice=describeRepairNotice(state.repairReview,state.consistencyReview,getLanguage());
    ui.repairNotice.dataset.level=notice.level;
    ui.repairNotice.textContent=notice.text;
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
   if(verify){auditPayload.referenceImage=await compactOriginalReference(state.original);auditPayload.caption=state.captionRepair?.final||state.context.caption;}
   const out=await api('/api/audit',auditPayload);
   if(!out.audit||typeof out.audit!=='object'||!Number.isFinite(out.audit.score))throw Error('Audit response is incomplete. Please retry.');
   state.sparkResponded=true;if(verify)state.reauditResponded=true;state.reportLanguage=out.report_language||getLanguage();updateMetaStatus();state.audit=out.audit;state.runs.push({stage:verify?'reaudit':'initial',model:out.model,tokens:out.tokens,provenance:out.provenance||null});
  if(verify){
     state.verified=out.audit;
     if(state.captionRepair)state.captionRepair.independent_audit={provenance:out.provenance||null,caption_sent:state.captionRepair.final,observed_claims:out.audit.claim_ledger.filter(c=>c.origin==='caption')};
     state.repairReview=reviewRepairCandidate(state.initialAudit,out.audit,{originalReferenceSent:out.original_reference_sent===true,language:state.reportLanguage,caption:state.captionRepair?.final||state.context?.caption});
     if(state.captionRepair)state.repairReview.caption_review=reviewRepairedCaption(state.captionRepair,out.audit);
     const measurements=await comparePixels(state.original,state.revised);
     const local=state.repairMetadata?.local_repair;
     if(local)measurements.local_repair=await verifyLocalPixels(state.original,state.revised,local.pixel_proof.rectangles);
     state.consistencyReview=inspectConsistency(state.initialAudit,out.audit,state.repairMetadata?.settings||state.consistency,measurements,state.context?.facts||'');
     if(state.repairReview.caption_review?.status==='failed'){
      const flagged=state.repairReview.caption_review.issues;
      state.consistencyReview.status='failed';
      state.consistencyReview.auto_approved=false;
      state.consistencyReview.risks.push(...flagged.map(evidence=>({code:'verified_caption_claim_regression',evidence})));
      state.repairReview.status='regression_suspected';
      state.repairReview.reasons.push('Independent re-audit marked corrected caption claims unsupported: '+flagged.join('; '));
     }
     if(state.repairReview.status==='regression_suspected'){state.consistencyReview.status='failed';state.consistencyReview.auto_approved=false;state.consistencyReview.risks.push(...state.repairReview.reasons.map(evidence=>({code:'legacy_guard',evidence})));}
     if(state.consistencyReview.status==='failed'){state.repairReview.status='regression_suspected';state.repairReview.reasons=state.consistencyReview.risks.map(r=>r.evidence).filter(Boolean).slice(0,8);switchView('original');}
     visualUI.clear();
     phase(3);
   }else{state.initialAudit=out.audit;state.captionRepair=out.audit.caption_repair||repairCaption({...state.context,original:state.context.caption});state.verified=null;state.repairReview=null;phase(1);}
  render(out.audit,verify);renderProofStudio({before:state.initialAudit,after:state.verified,facts:state.context.facts,caption:state.context.caption,originalImage:state.original,revisedImage:state.revised,onInspect:stage=>switchView(stage==='revised'?'revised':'original')});syncDeck();await persistMilestone();notify(verify?(state.consistencyReview?.status==='validated'?(getLanguage()==='id'?'Validasi otomatis selesai. Revisi siap untuk penyiapan output.':'Automatic validation completed. Revision ready for output preparation.'):state.repairReview.status==='regression_suspected'?'Possible repair regression detected. Export blocked.':'Validation incomplete. Candidate retained; export blocked.'):'AI audit completed.',verify&&state.consistencyReview?.status!=='validated');
 }finally{setBusy(false);}
}
async function validateCandidateImage(data){
  if(typeof data!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('Repair response did not contain a valid image. Please retry.');
  const candidate=new Image();candidate.decoding='async';candidate.src=data;
  try{await candidate.decode();}catch{throw Error('Meta returned an unreadable revised image. Original and audit are preserved; retry Repair only if needed.');}
  if(candidate.naturalWidth<1||candidate.naturalHeight<1)throw Error('Meta returned an empty revised image. Original and audit are preserved.');
}
// Explicit final-format action, separate from repairing factual or visual defects.
// Each successful request uses one Muse Image edit and one independent Muse Spark re-audit.
async function adaptFormat(image,target){
 if(state.imported||state.busy)throw Error('The Studio is read-only or busy.');
 if(!state.configured||!state.initialAudit)throw Error('Complete an authentic audit before AI format adaptation.');
 const allowed=new Set(['1080x1080','1080x1350','1080x1920','1600x900','1920x1080','2560x1440']);
 if(!target||!Number.isInteger(target.width)||!Number.isInteger(target.height)||(!target.print&&!allowed.has(target.width+'x'+target.height))||target.width<1||target.height<1||target.width>8192||target.height>8192||target.width*target.height>32e6)throw Error('Target AI hanya mendukung enam ukuran Sosial Media dan Website.');
 const baseline=image===state.revised?state.verified:state.initialAudit;
 if(!baseline||!state.context)throw Error('No verified source audit is available for this image.');
 if(state.formatHistory.length>=16)throw Error('Export this session before starting more format adaptations.');
 const attempt={requested:{...target},status:'pending',image:null,audit:null,review:null};
 state.formatHistory.push(attempt);
 setBusy(true,'AI format…');
 try {
  const extended=await extendFlatBackground(image,target);
  if(target.print&&!extended)throw Error('Latar kompleks untuk rasio cetak memerlukan komposisi tervalidasi. Ekspor ditahan; sumber tetap tersimpan.');
  const out=extended?{image:extended.image,model:'deterministic-background-extension',repair_metadata:{model_dimensions:extended.native_dimensions},provenance:null}:await api('/api/improve',{...payload(image),mode:'reframe',target,issues:[],claims:[]});
  attempt.deterministic_extension=extended?{...extended,image:undefined}:null;
  attempt.image=out.provenance||null;attempt.model_native_dimensions=out.repair_metadata?.model_dimensions||null;
  state.runs.push({stage:'format_image',model:out.model,provenance:out.provenance||null});
  state.imageResponded=state.imageResponded||!extended;updateMetaStatus();
  await validateCandidateImage(out.image);
  const frame=extended||await compositeReferenceFrame(image,out.image);
  out.image=frame.image;
  attempt.reference_frame={...frame,image:undefined};
  // Compare against the exact selected source, not a different prior revision.
  const referenceImage=await compactOriginalReference(image);
  const checked=await api('/api/audit',{...payload(out.image),caption:state.captionRepair?.final||state.context.caption,referenceImage,language:getLanguage()});
  attempt.audit=checked.provenance||null;attempt.tokens=checked.tokens??null;
  state.runs.push({stage:'format_audit',model:checked.model,tokens:checked.tokens,provenance:checked.provenance||null});
  state.sparkResponded=true;updateMetaStatus();
  if(!checked.audit||!Number.isFinite(checked.audit.score)||checked.original_reference_sent!==true)throw Error('AI format comparison was incomplete; candidate blocked.');
  const review=inspectFormatCandidate(baseline,checked.audit,state.consistency||visualUI.readSettings(),state.context?.facts||'');
  const repairReview=reviewRepairCandidate(baseline,checked.audit,{originalReferenceSent:true,language:getLanguage(),caption:state.context?.caption});
  if(frame.source_pixels_preserved&&review.status!=='failed'&&review.coverage==='model_reports_complete'&&repairReview.status!=='regression_suspected'){review.status='validated';review.auto_approved=true;review.pixel_preservation={...frame,image:undefined};}
  if(repairReview.status==='regression_suspected'){
   review.status='failed';review.risks.push(...repairReview.reasons.map(evidence=>({code:'model_regression',evidence})));
  }
  attempt.status=review.status;attempt.review=review;
  return {image:out.image,review,metadata:{image:out.provenance||null,audit:checked.provenance||null,requested:target,model_native_dimensions:out.repair_metadata?.model_dimensions||null,model_score_observation:checked.audit.score,not_automatically_approved:review.status!=='validated',reference_frame:{...frame,image:undefined},deterministic_extension:extended?{...extended,image:undefined}:null}};
 } catch(error){attempt.status='error';attempt.error=String(error.message).slice(0,500);throw error;}
 finally {setBusy(false);}
}
// Repair's first Muse Spark verification can trigger ONE evidence-grounded
// corrective Muse Image pass. Failed image attempts never delete the old
// candidate, and browser reload never triggers any paid request.
async function attemptAutoCorrectionOnce(){
 const plan=planOneCorrection({
  initial:state.initialAudit,verified:state.verified,
  consistencyReview:state.consistencyReview,repairReview:state.repairReview,
  alreadyAttempted:Boolean(state.autoCorrection?.attempted)
 });
 if(!plan.allowed||state.imported||state.busy)return false;
 if(state.history.length>=8){
  notify('Koreksi otomatis ditahan agar riwayat yang tersimpan tidak terhapus. Ekspor paket ZIP terlebih dahulu.',true);
  return false;
 }
 // Set the durable attempt flag BEFORE issuing any further potentially paid request.
 state.autoCorrection={attempted:true,status:'requested',diagnostics:plan.diagnostics,max_extra_image_requests:1,max_extra_audit_requests:1};
 // Lock the UI before the asynchronous recovery write so repeated taps cannot
 // start a second paid correction while the attempt flag is being persisted.
 setBusy(true,'Correcting…');
 await persistMilestone();
 const before={from:'original',report:reportSnapshot(),original:state.original,revised:state.revised};
 const settings=state.repairMetadata?.settings||state.consistency||visualUI.readSettings();
 let generated=false;
 try{
  const correction=correctionPayload(state.initialAudit,plan);
  const out=await api('/api/improve',{...payload(state.original),consistency:settings,...correction});
  // Image replacement is atomic only AFTER the provider response is validated.
  await validateCandidateImage(out.image);
  const composed=!settings.region&&state.initialAudit.local_text_repair?await compositePlannedRegions(state.original,out.image,state.initialAudit.local_text_repair):await compositeRegion(state.original,out.image,settings.region);
  await validateCandidateImage(composed.image);
  state.history=[...state.history,before]; // first rejected candidate remains in ZIP/history
  state.runs.push({stage:'auto_correction_image',model:out.model,provenance:out.provenance||null});
  state.revised=composed.image;state.imageResponded=true;updateMetaStatus();
  state.repairMetadata={...out.repair_metadata,settings,correction_attempt:1,...(composed.pixel_proof?{local_repair:{...composed,image:undefined}}:{}),
   compositing:{method:composed.method,rectangle:composed.rectangle||null,limitations:composed.limitations||[]},
   candidate_dimensions:await dimensions(composed.image)};
  state.autoCorrection={...state.autoCorrection,status:'awaiting_verification'};
  state.verified=null;state.repairReview=null;state.consistencyReview=null;state.audit=state.initialAudit;
  visualUI.clear();phase(2);switchView('compare');
  render(state.initialAudit,false);
  renderProofStudio({before:state.initialAudit,after:null,facts:state.context.facts,caption:state.context.caption,
   originalImage:state.original,revisedImage:state.revised,onInspect:()=>switchView('original')});
  generated=true;
  await persistMilestone();
 }catch(error){
  state.autoCorrection={...state.autoCorrection,status:'image_failed',error:String(error?.message||error).slice(0,220)};
  await persistMilestone();
  notify('Koreksi otomatis tidak berhasil; gambar asli dan kandidat sebelumnya tetap tersimpan. Tidak ada pemanggilan ulang gambar otomatis.',true);
 }finally{setBusy(false);}
 if(!generated)return false;
 try{
  await performAudit(state.revised,true);
  state.autoCorrection={...state.autoCorrection,
   status:state.consistencyReview?.status==='failed'?'still_failed':'verification_completed'};
  await persistMilestone();
  if(state.autoCorrection.status==='still_failed')notify('Koreksi tambahan sudah diperiksa, tetapi masih ada masalah yang terdeteksi. Hasil revisi tidak diizinkan untuk ekspor.',true);
 }catch(error){
  state.autoCorrection={...state.autoCorrection,status:'verification_failed',error:String(error?.message||error).slice(0,220)};
  await persistMilestone();
  notify('Koreksi tersimpan, tetapi audit ulang kedua gagal. Tidak ada Repair ulang otomatis.',true);
 }
 return true;
}
async function performImprove(){
 if(state.imported)throw Error('Arsip bersifat read-only. Unggah gambar baru sebelum membuat revisi.');
 if(!state.audit || !state.original)throw Error('Jalankan audit dulu.');
  if(!hasImageRepairTarget(state.initialAudit))throw Error('Tidak ada temuan gambar yang jelas untuk diperbaiki. Jangan paksa AI membuat ulang gambar tanpa alasan.');
 setBusy(true,'Refining…');
 try{
  const repairSettings=visualUI.readSettings();
  const local=!repairSettings.region&&await repairTextLocally(state.original,state.initialAudit.local_text_repair);
  const out=local?{image:local.image,model:'deterministic-source-pixel-repair',repair_metadata:{local_repair:local,method:local.method},provenance:null}:await api('/api/improve',{...payload(state.original),consistency:repairSettings,issues:state.initialAudit.issues,claims:state.initialAudit.claim_ledger});
  if(local)delete out.repair_metadata.local_repair.image;
   await validateCandidateImage(out.image);
   const composed=local?{image:out.image,method:local.method}:!repairSettings.region&&state.initialAudit.local_text_repair?await compositePlannedRegions(state.original,out.image,state.initialAudit.local_text_repair):await compositeRegion(state.original,out.image,repairSettings.region);
   if(composed.pixel_proof)out.repair_metadata={...out.repair_metadata,local_repair:{...composed,image:undefined}};
   state.repairMetadata={...out.repair_metadata,settings:repairSettings,compositing:{provider_output_hash_scope:'unmodified_provider_image_before_local_compositing',method:composed.method,rectangle:composed.rectangle||null,limitations:composed.limitations||[]},candidate_dimensions:await dimensions(composed.image),output_requested:state.outputRequested||null,upload_dimensions:state.uploadDimensions||null};
   out.image=composed.image;state.consistencyReview=null;visualUI.clear();state.imageResponded=!local;updateMetaStatus();
  state.verified=null;state.repairReview=null;state.autoCorrection=null;state.runs=state.runs.filter(r=>r.stage==='initial'||r.stage==='archive_baseline');state.runs.push({stage:'repair',model:out.model,provenance:out.provenance||null});state.revised=out.image;renderProofStudio({before:state.initialAudit,after:null,facts:state.context.facts,caption:state.context.caption,originalImage:state.original,revisedImage:state.revised,onInspect:()=>switchView('original')});ui.revisedTab.disabled=false;ui.compareTab.disabled=false;ui.verify.hidden=false;ui.downloadImage.hidden=false;phase(2);switchView('compare');await persistMilestone();
 }finally{setBusy(false);}
 // One user-initiated Repair includes ONE independent Spark re-audit.
 // Do not silently regenerate more paid images. If verification fails, the
 // saved candidate stays recoverable and the existing Verify button can retry.
 notify('Gambar revisi diterima. Meta AI memeriksa ulang hasilnya secara otomatis menggunakan satu panggilan audit tambahan.');
 try{
  await performAudit(state.revised,true);
  await attemptAutoCorrectionOnce(); // no action if Verify passed or no grounded target
 }catch(error){
  notify('Verifikasi otomatis tidak tersedia; kandidat tersimpan. Tidak ada pengulangan Repair berbayar. '+String(error?.message||'').slice(0,130),true);
 }
}
function download(data,name,type){const blob=data instanceof Blob?data:new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);}
for(const field of [ui.product,ui.facts,ui.caption])field.addEventListener('input',()=>{if(state.context&&!state.busy&&!state.imported){void forgetMilestone();ui.recoveryBar.hidden=true;resetAudit({preserveHistory:state.history.length>0});switchView('original');notify('Product facts changed. The saved baseline cannot be reused; run a NEW audit to keep evidence consistent. Prior archive rounds remain preserved.');}});
ui.form.addEventListener('submit',async e=>{e.preventDefault();if(!state.original){notify('Unggah gambar iklan terlebih dahulu.',true);return;}if(state.busy||state.imported)return;try{await performAudit(state.original)}catch(e){notify(e.message,true);}});
ui.refine.addEventListener('click',async()=>{if(state.busy||state.imported)return;try{await performImprove();}catch(e){notify(e.message,true);}});
ui.journeyButton.addEventListener('click',async()=>{
 if(state.busy||state.imported)return;
 const action=ui.journeyButton.dataset.action;
 if(action==='repair'){ui.refine.click();return;}
 if(action==='verify'){ui.verify.click();return;}
 if(action==='caption'){selectReportView('caption');ui.suggested.scrollIntoView({block:'center',behavior:'smooth'});return;}
 if(action==='compare'){
  if(state.original&&state.revised)switchView('compare');
  document.querySelector('.preview-pane')?.scrollIntoView({block:'center',behavior:'smooth'});
  return;
 }
 if(action==='retry'){
  if(!state.verified||state.consistencyReview?.status!=='failed'||state.history.length>=8)return;
  try{await attemptAutoCorrectionOnce();}
  catch(error){notify(String(error?.message||error).slice(0,180),true);}
 }
});

ui.verify.addEventListener('click',async()=>{if(state.busy||state.imported||!state.revised)return;try{await performAudit(state.revised,true);}catch(e){notify(e.message,true);}});
ui.copyCaption.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(ui.suggested.textContent);notify('Caption copied.');}catch{notify('Clipboard tidak tersedia.',true);}});
// Export the exact saved observation set; graph and DNA are rebuilt from
// model-selected ledgers, never trusted as executable imported data.
function reportSnapshot(){
 const report=state.imported&&state.archivedReport?
  {...state.archivedReport,...proofReport()}:
  {app:'AdProof AI',date:new Date().toISOString(),report_language:state.reportLanguage||'und',product:state.context?.product,context:state.context,
   caption_scope:'Original caption retained in context; caption_repair.final is the corrected source-bound output and is sent to re-audit.',caption_repair:state.captionRepair,
   runs:state.runs,auto_correction:state.autoCorrection,repair_review:state.repairReview,...proofReport(),
   original:state.initialAudit,verified:state.verified,
   disclaimer:'Saved model observations, not independently certified. Image edits always need human review.'};
 // JSON contains metadata only, no image bytes. ZIP adds historical pixels.
 report.visual_consistency={format_history:state.formatHistory,upload_dimensions:state.uploadDimensions||null,source_dimensions:state.sourceDimensions||null,settings:state.consistency,repair:state.repairMetadata||null,verification:state.consistencyReview||null,output_requested:state.outputRequested||null,output_actual:state.outputActual||null};
 report.archive_history=(state.history||[]).map(round=>({from:round.from,report:round.report}));
 return report;
}
function restoreAuditSnapshot({report,original,revised,history=[],hasImages},{resumeLive=false}={}){
 // Validation/parsing and ZIP integrity checks are complete BEFORE modifying
 // the current session. No API call, re-scoring or remote verification here.
 state.original=null;resetAudit();
 state.history=history;
 if(state.fullOriginalURL)URL.revokeObjectURL(state.fullOriginalURL);
 state.fullOriginalURL=null; // Historical archives contain the bounded source, not the full-resolution upload.
 state.original=original||null;state.originalFilename=original?'original (archived)':'no original in JSON';
 state.revised=revised||null;
 state.context={...report.context};
 state.initialAudit=report.original;
 state.verified=report.verified||null;
 state.audit=state.verified||state.initialAudit;
 state.captionRepair=report.caption_repair||null;
 state.repairReview=report.repair_review||null;state.autoCorrection=report.auto_correction||null;
 state.consistencyReview=report.visual_consistency?.verification||null;state.repairMetadata=report.visual_consistency?.repair||null;
 visualUI.restore(report.visual_consistency?.settings,report.visual_consistency?.output_requested);
 state.outputActual=report.visual_consistency?.output_actual||null;state.uploadDimensions=report.visual_consistency?.upload_dimensions||null;state.sourceDimensions=report.visual_consistency?.source_dimensions||null;
 state.runs=report.runs||[];state.formatHistory=report.visual_consistency?.format_history||[];
 state.archivedReport=resumeLive?null:report;
 state.reportLanguage=report.report_language||'und';
 state.imported=!resumeLive;
 state.continuedFrom=null;
 state.sparkResponded=false;state.imageResponded=false;state.reauditResponded=false;
 updateMetaStatus(); // saved model output is NOT a new verified Meta call
 ui.product.value=report.context.product;
 ui.facts.value=report.context.facts;
 ui.caption.value=report.context.caption;
 if(resumeLive){for(const field of [ui.product,ui.facts,ui.caption])field.readOnly=false;}
 else {for(const field of [ui.product,ui.facts,ui.caption])field.readOnly=true;}
 ui.originalTab.disabled=!state.original;
 ui.revisedTab.disabled=!state.revised;
 ui.compareTab.disabled=!(state.original&&state.revised);
 ui.replace.disabled=false;
 ui.name.textContent=resumeLive?'RECOVERED LOCAL SOURCE':hasImages?'ORIGINAL IMAGE · SAVED ARCHIVE':'AUDIT JSON · IMAGES NOT INCLUDED';
 ui.archiveNotice.hidden=false;
 renderSavedLanguageNotice();
 ui.archiveNotice.textContent=resumeLive
   ? 'LOCAL RECOVERY · Last completed Studio milestone restored without Meta API calls. The original upload file handle is not retained; saved source image and revision are recovered. Review and export ZIP. Never assume previously pending requests completed.'
   :hasImages
   ? 'IMPORTED ARCHIVE · READ ONLY UNTIL YOU CHOOSE A SOURCE. Select Repair original or Repair revised below to continue using the saved audit (no repeat initial audit). No Meta AI call was made on import. Saved report is not independently authenticated.'
   : 'IMPORTED JSON · READ ONLY. Claim DNA and proof records restored, but the old JSON contains NO original/revised pixels. Continue editing requires ZIP with images; cannot invent missing pixels. No Meta AI call was made.';
 phase(state.verified?3:state.revised?2:1);
 render(state.audit,Boolean(state.verified));
 renderProofStudio({before:state.initialAudit,after:state.verified,
  facts:state.context.facts,caption:state.context.caption,
  originalImage:state.original,revisedImage:state.revised,
  onInspect:stage=>{if(state.original)switchView(stage==='revised'&&state.revised?'revised':'original');}});
 switchView(state.original&&state.revised?'compare':'original');
 selectReportView('claims');
 activateProofView(state.verified?'evolution':'xray');
 syncDeck();syncSticky();
 notify(resumeLive?'Browser session recovered from local device storage. No paid Meta request.':hasImages?'Saved archive restored. No paid model request.':'Saved JSON restored without images. No paid model request.');
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
 state.original=image;state.formatHistory=[];
 state.sourceDimensions=from==='revised'?(state.repairMetadata?.candidate_dimensions||null):state.sourceDimensions;
 state.originalFilename='saved '+from+' · repair baseline';
 state.initialAudit=baseline;
 state.audit=baseline;
 state.verified=null;state.revised=null;state.repairReview=null;state.autoCorrection=null;state.consistencyReview=null;state.repairMetadata=null;visualUI.clear();
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
 void persistMilestone();
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
  notify('Audit package saved: JSON and original/revised images in their actual formats.');
 }catch(e){notify(e.message,true);}
});
ui.downloadImage.addEventListener('click',()=>visualUI.export());
const chooseImport=()=>{if(state.busy||state.importing)return;ui.importReportInput.click();};
ui.importReportButton.addEventListener('click',chooseImport);
ui.importReportStart.addEventListener('click',chooseImport);
ui.importReportInput.addEventListener('change',async()=>{
 const file=ui.importReportInput.files?.[0];ui.importReportInput.value='';
 if(!file||state.busy||state.importing)return;
 state.importing=true;syncDeck();
 try{
  const archive=await openAuditFile(file);
  await forgetMilestone();ui.recoveryBar.hidden=true;
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
 const needsRepair=state.phase===1&&hasImageRepairTarget(state.initialAudit);
 stickyAudit.textContent=state.imported?'Archive · read only':state.busy?'Processing…':done?'Inspect changes →':state.phase===2?'Verify revision ↗':state.phase===1?(needsRepair?'Repair creative ↗':'Inspect findings ↗'):'Run audit ↗';
 stickyLabel.textContent=state.imported?'Saved report · no Meta API used':state.busy?'Meta model request':done?'Candidate NOT approved · Review images':state.phase===2?'Review candidate image':state.phase===1?'Initial audit complete':!state.original?'Add a creative to begin':'Add facts to begin';
}
stickyAudit.addEventListener('click',()=>{if(state.busy||state.imported)return;if(state.phase===3)activateProofView('evolution',true);else if(state.phase===2)ui.verify.click();else if(state.phase===1){if(hasImageRepairTarget(state.initialAudit))ui.refine.click();else activateProofView('xray',true);}else ui.form.requestSubmit();});
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
// Restore only after the initial UI is initialized. Recovery never calls /api/audit
// or /api/improve and never repeats a possibly charged request.
void recoverMilestone();
