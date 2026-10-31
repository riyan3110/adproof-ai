import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../public/app.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/studio.css',import.meta.url),'utf8');

test('audit overview does not flood the UI with model-generated headline and paragraphs',()=>{
 assert.ok(html.includes('id="scoreHeadline"'));
 assert.ok(html.includes('id="scoreExplanation" class="score-explanation"'));
 assert.ok(html.includes('id="scoreExplanationContent" class="score-explanation-content model-generated"'));
 assert.ok(js.includes("Hasil audit revisi"));
 assert.ok(js.includes("klaim tercatat"));
 assert.ok(!js.includes("ui.scoreHeadline.textContent=a.headline"));
 assert.ok(!js.includes("ui.scoreSummary.textContent=a.summary"));
 assert.ok(js.includes("ui.scoreExplanation.open=false"));
 assert.ok(css.includes('.studio-body .score-explanation summary'));
});

test('saved report details still contain original AI evidence and score uncertainty',()=>{
 assert.ok(js.includes("ui.scoreExplanationContent.textContent=[a.headline,a.summary,scoreChange]"));
 assert.ok(js.includes("Skor lebih tinggi BUKAN bukti gambar membaik."));
 assert.ok(js.includes("ui.scoreExplanation.hidden=!ui.scoreExplanationContent.textContent"));
 assert.ok(js.includes("renderClaimEvidence(a,verified)"));
 assert.ok(js.includes("const notice=describeRepairNotice(state.repairReview,state.consistencyReview,getLanguage())"));
});
