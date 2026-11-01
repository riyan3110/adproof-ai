import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readAuditJson} from '../public/audit-archive.js';

test('all sixteen allowed format attempts retain actual comparison evidence on import',()=>{
 const report=JSON.parse(readFileSync(new URL('../evidence/live-2026-11-01/nori/website-verified-production.json',import.meta.url)));
 const attempt=report.visual_consistency.format_history.at(-1);
 report.visual_consistency.format_history=Array.from({length:16},()=>structuredClone(attempt));
 const restored=readAuditJson(JSON.stringify(report));
 const history=restored.visual_consistency.format_history;
 assert.equal(history.length,16);
 for(const item of history){
  assert.equal(item.audit.response_id,attempt.audit.response_id);
  assert.equal(item.comparison_mode,'format');
  assert.equal(item.audit_report.checks.clarity,95);
  assert.deepEqual(item.review.text.added,[]);
 }
});
