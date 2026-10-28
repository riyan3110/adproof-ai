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
  assert.ok(js.includes("sessionStorage.setItem(demoKey,v)"), 'code should be session-only');
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
 for(const phrase of ['Proofroom.','proofroom-overline','source-form-intro','canvas-field-note','THE INVESTIGATION','AUDIT DOSSIER']){
  assert.ok(html.includes(phrase)||studioCSS.includes(phrase),'Missing Proofroom identity element: '+phrase);
 }
 assert.ok(studioCSS.includes('--proof-paper:#ecebe4'),'paper palette must differ from old dark template');
 assert.ok(studioCSS.includes('background:var(--proof-ink-soft)'),'canvas must have distinct dark visual surface');
 assert.ok(studioCSS.includes('.studio-body .proof-workspace'),'proof inspection must be styled independently');
 assert.ok(studioCSS.includes('.studio-body .audit-card'),'audit dossier must have editorial hierarchy');
 assert.ok(studioCSS.includes('@media(max-width:540px)'),'mobile-specific typography and hierarchy required');
 assert.ok(studioCSS.includes('prefers-reduced-motion:reduce'),'motion preferences must remain supported');
});
