import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setPreference,t} from '../public/i18n.js';

const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const smoke=readFileSync(new URL('../scripts/browser-smoke.cjs',import.meta.url),'utf8');

test('a completed initial audit cannot be resubmitted with one accidental click',()=>{
 assert.ok(js.includes('ui.auditButton.disabled=state.busy||state.imported||!!state.initialAudit'));
 assert.ok(js.includes("ui.auditText.textContent=t(state.initialAudit?'Audit complete ✓':'Run audit')"));
 assert.ok(js.includes("resetAudit({preserveHistory:state.history.length>0})"),'source changes still permit a fresh explicit audit');
 assert.ok(smoke.includes('completed initial audit must not expose a duplicate paid action'));
});

test('Meta repair candidates are decoded before enabling verify or replacing the good source',()=>{
 const helper=js.indexOf('async function validateCandidateImage(data)');
 const decode=js.indexOf('await candidate.decode()',helper);
 const use=js.indexOf('await validateCandidateImage(out.image)');
 const approve=js.indexOf('state.imageResponded=true',use);
 const replace=js.indexOf('state.revised=out.image',use);
 assert.ok(helper>0&&decode>helper&&use>decode&&approve>use&&replace>approve);
 assert.ok(js.includes('candidate.naturalWidth<1||candidate.naturalHeight<1'));
 assert.ok(js.includes('Original and audit are preserved'));
 assert.ok(smoke.includes('unreadable candidate must not enable a second paid Meta call'));
});

test('caption-only findings navigate to inspection rather than charging for pointless image editing',()=>{
 assert.ok(js.includes("needsRepair?'Repair creative ↗':'Inspect findings ↗'"));
 assert.ok(js.includes("else activateProofView('xray',true)"));
 assert.ok(js.includes('No grounded image repair required.'));
 assert.ok(smoke.includes('caption-only workflow must direct to inspection'));
});

test('new release safety feedback uses the existing bilingual preference',()=>{
 setPreference('id');
 assert.equal(t('Audit complete ✓'),'Audit selesai ✓');
 assert.equal(t('Inspect findings ↗'),'Periksa temuan ↗');
 setPreference('en');
 assert.equal(t('Inspect findings ↗'),'Inspect findings ↗');
 setPreference('auto');
});
