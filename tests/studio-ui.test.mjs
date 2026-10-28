import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

// All element IDs the backend wiring depends on must survive redesigns.
const REQUIRED_IDS = ['connection','connectionText','viewOriginal','viewRevised','viewCompare',
'dropzone','emptyCanvas','browseButton','creativeImage','compareView','compareAfter',
'compareBeforeWrap','compareBefore','compareBar','compareRange','scanOverlay','fileInput',
'fileName','newCreative','projectForm','product','facts','caption','auditButton',
'auditButtonText','auditCard','auditPhase','reportEmpty','reportContent','scoreRing',
'scoreValue','scoreHeadline','scoreSummary','breakdown','issueCount','issuesList',
'suggestedCaption','copyCaption','refineButton','verifyButton','downloadReport',
'downloadImage','toast'];

test('studio keeps every JS-wired element id', () => {
  for (const id of REQUIRED_IDS) assert.ok(html.includes(`id="${id}"`), `missing #${id} in app.html`);
});

test('studio keeps workflow stage hooks', () => {
  assert.ok(html.includes('class="stage'), 'missing .stage steps');
  assert.ok(js.includes("querySelectorAll('.stage')"), 'phase() stage hook changed');
});

test('responsive guards: viewport, single-column, touch targets, no min-width trap', () => {
  assert.ok(html.includes('name="viewport"'), 'viewport meta missing');
  assert.ok(/max-width:\s*1080px[\s\S]*?\.workspace-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(css), 'no single-column collapse <=1080px');
  assert.ok(css.includes('min-height:44px') || css.includes('min-height: 44px'), 'no 44px touch targets');
  assert.ok(!/min-width:\s*[5-9]\d\dpx/.test(css), 'possible min-width trap >=500px');
  assert.ok(css.includes('overflow-x:clip') || css.includes('overflow-x: clip'), 'no horizontal-scroll guard');
});

test('sticky CTA is in-flow sticky, never fixed', () => {
  assert.ok(html.includes('id="stickyAudit"'), 'sticky CTA button missing');
  assert.ok(/\.sticky-cta\s*\{[^}]*position:\s*sticky/.test(css), 'sticky CTA must use position:sticky');
});

test('empty states carry no fabricated scores', () => {
  const head = html.split('id="reportContent"')[0];
  assert.ok(!/\b\d{2}\s*\/\s*100\b/.test(head), 'fabricated score in empty state');
  assert.ok(!/AI-generated/i.test(html), 'must not claim AI-generated imagery');
});

test('reduced-motion support preserved', () => {
  assert.ok(css.includes('prefers-reduced-motion'), 'reduced-motion block missing');
});

test('claim evidence has grounded labels without unsafe template HTML', () => {
  for (const id of ['claimEvidencePanel','claimEvidenceList','claimEvidenceCount']) {
    assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
    assert.ok(js.includes(`$('#${id}')`), `missing JS binding for ${id}`);
  }
  assert.ok(js.includes('renderClaimEvidence(a,verified)'));
  assert.ok(js.includes('a.claim_ledger'));
  assert.ok(js.includes('String(item.fact_quote)'));
  assert.ok(js.includes('claimList.replaceChildren()'));
  assert.ok(!js.includes('innerHTML'), 'never render model claims as HTML');
  assert.ok(html.includes('Not independently verified'), 'avoid misleading independent fact-check claim');
  assert.ok(css.includes('.claim-evidence-list'));
});

test('judge-only code dialog is accessible and never exposed in public markup', () => {
  for(const id of ['judgeAccessButton','judgeAccessDialog','judgeAccessForm','judgeAccessCode','judgeAccessHint','judgeAccessCancel']){
    assert.ok(html.includes('id="'+id+'"'), 'missing judge access element: '+id);
  }
  assert.ok(html.includes('type="password"'), 'judge code input must be masked');
  assert.ok(html.includes('aria-labelledby="judgeAccessTitle"'), 'judge dialog must have accessible title');
  assert.ok(js.includes("ui.accessDialog.showModal()"));
  assert.ok(js.includes("sessionStorage.setItem(demoKey,code)"), 'code should be session-only');
  assert.ok(js.includes("headers['x-demo-code']=code"), 'private code must stay in request header');
  assert.ok(!js.includes("prompt("), 'browser prompt must not be used for judge access');
});

test('public walkthrough and health wording avoid simulated audit',()=>{
  assert.ok(html.includes('id="publicTour"'));
  assert.ok(html.includes('Live AI requests require the private Judge access code'));
  assert.ok(!html.includes('EXAMPLE SCORE'), 'do not display fictitious quality scores');
  assert.ok(js.includes("'META CONFIGURED'"));
  assert.ok(!js.includes("'META CONNECTED'"), 'health alone cannot prove a live provider call');
  const base = css.match(/\.compare-before-wrap\{position:absolute;inset:0;width:(\d+)%/);
  assert.equal(base?.[1], '100', 'compare layer must fill the full frame at every slider value');
});

test('distinct proof modules remain visible before the first paid AI request', () => {
  assert.ok(html.includes('class="intelligence-deck"'), 'new verification module rail missing');
  for(const id of ['deckDetect','deckProof','deckDNA','deckPhase','constellationEmpty','evolutionEmpty','constellationResults','evolutionResults']){
    assert.ok(html.includes('id="'+id+'"'), 'proof module or truthful idle-state missing: '+id);
  }
  assert.match(html, /id="proofWorkspace" class="proof-workspace" aria-label="Claim verification and evolution">/);
  assert.ok(html.includes('No simulated results'), 'idle states must not claim model output');
  assert.ok(html.includes('id="constellationResults" class="proof-live" hidden'));
  assert.ok(html.includes('id="evolutionResults" class="proof-live" hidden'));
  assert.ok(css.includes('.proof-live[hidden],.proof-pending[hidden]{display:none!important}'));
});

test('navigation and feature states follow the real audit lifecycle', () => {
  assert.ok(js.includes('function syncDeck()'));
  assert.ok(js.includes('state.initialAudit?.claim_ledger'));
  assert.ok(html.includes('data-proof-view="xray"'));
  assert.ok(js.includes("activateProofView('evolution',true)"));
  assert.ok(!html.includes('FAKE SCORE'));
  assert.ok(css.includes('.deck-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))'));
  assert.ok(css.includes('@media(max-width:700px)'));
});

// Structural checks supplement (not replace) the real-browser regression.
test('redesign has unique IDs and non-nested forms',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'duplicate DOM ids break state bindings');
 assert.equal((html.match(/<form\b/g)||[]).length,2);
 for(const id of ['xrayClaimSelect','xrayImage','xrayCaption','xrayToGraph','proofToXray','pipelineHint','exportState','reportClaims','reportFindings','reportCaption'])assert.ok(ids.includes(id));
});
test('studio stylesheet is scoped and new modes have actual buttons',()=>{
 assert.ok(html.includes('href="/studio.css"'));
 for(const id of ['deckDetect','deckProof','deckDNA'])assert.match(html,new RegExp('<button[^>]+id="'+id+'"[^>]+data-proof-view='));
});
test('graph and source navigation share an explicit selection; stale source is cleared',()=>{
 const proof=readFileSync(new URL('../public/proof-studio.js',import.meta.url),'utf8');
 assert.ok(proof.includes('export function activateProofView'));
 assert.ok(proof.includes("removeAttribute('src')"));
 assert.ok(proof.includes('context.caption'));
 assert.ok(proof.includes('detailNode=node.id'));
 assert.ok(!proof.includes('innerHTML'));
});


test('Proofroom identity is deliberate editorial visual language, not generic dashboard cards',()=>{
 const studioCSS=readFileSync(new URL('../public/studio.css',import.meta.url),'utf8');
 for(const phrase of ['Proof<span>room.','proofroom-overline','source-form-intro','canvas-field-note','THE INVESTIGATION','AUDIT DOSSIER']){
  assert.ok(html.includes(phrase)||studioCSS.includes(phrase),'Missing Proofroom identity element: '+phrase);
 }
 assert.ok(studioCSS.includes('--proof-paper:#ecebe4'),'paper palette must differ from old dark template');
 assert.ok(studioCSS.includes('background:var(--proof-ink-soft)'),'canvas must have distinct dark visual surface');
 assert.ok(studioCSS.includes('.studio-body .proof-workspace'),'proof inspection must be styled independently');
 assert.ok(studioCSS.includes('.studio-body .audit-card'),'audit dossier must have editorial hierarchy');
 assert.ok(studioCSS.includes('@media(max-width:540px)'),'mobile-specific typography and hierarchy required');
 assert.ok(studioCSS.includes('prefers-reduced-motion:reduce'),'motion preferences must remain supported');
});


test('empty-state illustrations are explicitly non-AI schematics',()=>{
 const studioCSS=readFileSync(new URL('../public/studio.css',import.meta.url),'utf8');
 for(const id of ['xrayEmpty','constellationEmpty','evolutionEmpty','reportEmpty']){
  const point=html.indexOf('id="'+id+'"');
  assert.ok(point>=0,'missing empty section '+id);
  const section=html.slice(point,point+2200);
  assert.match(section,/SCHEMATIC ONLY|LAYOUT PREVIEW/,'illustration must disclaim synthetic output');
 }
 for(const cls of ['xray-wire','graph-wire','dna-wire','report-wireframe']){
  assert.ok(html.includes('class="'+cls+'"')||html.includes(' '+cls+'"'),'missing illustration '+cls);
 }
 for(const disclaimer of ['NO DETECTED CLAIMS','NO EVIDENCE CONNECTED','NO REVISIONS COMPARED','NO MODEL OUTPUT · NO SCORES']){
  assert.ok(html.includes(disclaimer),'missing honest status: '+disclaimer);
 }
 assert.ok(studioCSS.includes('.studio-body .proof-pending.proof-pending-rich'));
 assert.ok(studioCSS.includes('.studio-body .report-empty.report-empty-rich'));
 assert.ok(studioCSS.includes('@media(max-width:390px)'),'small mobile wireframes must be responsive');
 const fakeScore=html.split('id="reportEmpty"')[1].split('id="reportContent"')[0];
 assert.ok(!/\b\d{1,3}\s*\/\s*100\b/.test(fakeScore),'no made-up audit score is allowed');
});
test('public workflow explainer switches existing UI without a fake Meta request',()=>{
 assert.ok(html.includes('id="exploreProofButton"'));
 assert.ok(html.includes('aria-controls="constellationWorkspace"'));
 assert.ok(js.includes("$('#exploreProofButton').addEventListener('click',()=>activateProofView('constellation',true))"));
 assert.ok(html.includes('data-focus-input'),'empty screen must offer real upload starting point');
});

test('Judge access UI distinguishes code verification from successful Meta model responses',()=>{
 for(const id of ['judgeAccessStatus','metaProviderStatus','judgeAccessError'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('Code verification is free. Model connectivity needs an actual audit.'));
 assert.ok(html.includes('Verified against this server without a paid Meta request.'));
 assert.ok(js.includes("fetch('/api/access'"),'code check must be a dedicated nonbillable request');
 assert.ok(js.includes("reply.access==='verified'"),'code may only be stored after successful server verification');
 assert.ok(js.includes("state.sparkResponded=true"),'Meta connection status depends on actual successful Spark response');
 assert.ok(js.includes("state.imageResponded=true"),'Meta Image status depends on actual successful edit');
 assert.ok(js.includes("state.reauditResponded=true"),'complete status must follow a real second audit');
 assert.ok(js.includes("verifyCode(saved,{restoring:true})"),'saved session codes must be checked again');
 assert.ok(!html.includes('Code entered'),'UI must not present unverified input as authenticated');
});

test('Claim DNA explicitly differentiates capped samples and claims seen across caption and image',()=>{
  const proof=readFileSync(new URL('../public/proof-studio.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../public/studio.css',import.meta.url),'utf8');
  assert.ok(proof.includes('cross_source_observed'));
  assert.ok(proof.includes('cross_source_exact')===false,'match logic belongs in claim engine');
  assert.ok(proof.includes('sample_limited'));
  assert.ok(proof.includes('Not in re-audit list'));
  assert.ok(proof.includes('First seen in re-audit'));
  assert.ok(proof.includes("item.after?.origin==='caption'"));
  assert.ok(proof.includes('No matched observation'));
  assert.ok(proof.includes('Image repair does not edit the caption.'), 'unchanged caption with unsupported claims must remain an explicit warning');
  assert.ok(css.includes('.dna-origin-shift'));
  assert.ok(css.includes('#evolutionNote'));
  assert.ok(!proof.includes('Not re-detected'), 'misleading old label must not appear');
});

test('existing verification dossier warns when AI repair is unapproved despite higher score',()=>{
 const studioCSS=readFileSync(new URL('../public/studio.css',import.meta.url),'utf8');
 const guard=readFileSync(new URL('../public/repair-guard.js',import.meta.url),'utf8');
 assert.ok(html.includes('id="repairGuardNotice"'));
 assert.ok(html.includes('aria-live="polite"'));
 assert.ok(js.includes("import {reviewRepairCandidate} from './repair-guard.js'"));
 assert.ok(js.includes("originalReferenceSent:out.original_reference_sent===true"));
 assert.ok(js.includes("auditPayload.referenceImage=await compactOriginalReference(state.original)"));
 assert.ok(js.includes("A higher score is NOT proof the image improved."));
 assert.ok(js.includes("POSSIBLE REPAIR REGRESSION"));
 assert.ok(js.includes("repair_review:state.repairReview"));
 assert.ok(js.includes("Candidate NOT approved"));
 assert.ok(studioCSS.includes('.repair-guard-notice[data-level=warning]'));
 assert.ok(guard.includes('auto_approved:false'));
 assert.ok(!js.includes('repair_approved:true'));
});

test('audit archive import/export controls preserve prior Studio elements and read-only restore contract',()=>{
 const archive=readFileSync(new URL('../public/audit-archive.js',import.meta.url),'utf8');
 const guard=readFileSync(new URL('../public/repair-guard.js',import.meta.url),'utf8');
 for(const id of ['importReportButton','importReportStart','importReportInput','downloadPackage','archiveRestoreNotice'])
  assert.ok(html.includes('id="'+id+'"'),'archive hook '+id);
 assert.ok(js.includes('openAuditFile(file)'), 'file import must parse locally');
 assert.ok(js.includes('restoreAuditSnapshot(archive)'), 'archive state must restore to UI');
 assert.ok(js.includes('readOnly=true'),'imported fields must be readonly');
 assert.ok(js.includes('state.imported?' ), 'archive state must be explicit');
 assert.ok(js.includes('if(state.imported)throw Error'), 'guard paid operations from loaded archives');
 assert.ok(js.includes('repair_review:state.repairReview'), 'new report exports preserve risk records');
 assert.ok(js.includes('fromImageDataUrl(state.revised)'), 'real signature controls download MIME/extension');
 assert.ok(archive.includes('sniffImageMime(bytes)'));
 assert.ok(archive.includes('zipCrc(bytes)'));
 assert.ok(!archive.includes('fetch('), 'archive processing must never call remote services');
 assert.ok(guard.includes('auto_approved:false'));
});


test('saved audit can resume from original or revised only after explicit action and never charge Meta on import',()=>{
 for(const id of ['archiveContinueActions','continueFromOriginal','continueFromRevised','archiveHistoryPanel','archiveHistorySummary','archiveHistoryList']){
  assert.ok(html.includes('id="'+id+'"'),id+' missing');
 }
 assert.ok(js.includes("continueArchivedAudit('original')"));
 assert.ok(js.includes("continueArchivedAudit('revised')"));
 assert.ok(js.includes("state.history=[...state.history,preserved]"));
 assert.ok(js.includes("stage:'archive_baseline'"));
 assert.ok(js.includes("origin:'saved_archive'"));
 assert.ok(js.includes("state.verified=null;state.revised=null;state.repairReview=null;"));
 assert.ok(js.includes("state.initialAudit=baseline;"));
 assert.ok(js.includes("state.original=image;"));
 assert.ok(js.includes("state.runs.filter(r=>r.stage==='initial'||r.stage==='archive_baseline')"));
 assert.ok(js.includes("createAuditPackage(reportSnapshot(),state.original,state.revised,state.history)"));
 assert.ok(js.includes("state.history.length>=8"),'must refuse new edits if history cannot be retained');
 assert.ok(js.includes("if(state.imported)throw Error"),'archive review cannot call AI by itself');
 assert.ok(js.includes("if(!state.configured)throw Error"),'new paid action requires actual configured API');
 const css2=readFileSync(new URL('../public/studio.css',import.meta.url),'utf8');
 assert.ok(css2.includes('.archive-continue-actions'));
 assert.ok(css2.includes('@media(max-width:760px)'));
});
