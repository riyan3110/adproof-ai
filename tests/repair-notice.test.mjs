import test from 'node:test';
import assert from 'node:assert/strict';
import {describeRepairNotice} from '../public/repair-notice.js';

test('rejected repair gets a short neutral notice without duplicating generated observations',()=>{
  const review={status:'regression_suspected',reasons:[
    'Setiap hari. Botol stainless steel untuk aktivitas sehari-hari.',
    'Setiap hari. Botol stainless steel untuk aktivitas sehari-hari.'
  ]};
  const notice=describeRepairNotice(review,{status:'failed'},'id');
  assert.equal(notice.level,'warning');
  assert.match(notice.text,/Ekspor revisi ditahan/);
  assert.match(notice.text,/Pemeriksaan konsistensi/);
  assert.ok(notice.text.length<180);
  assert.doesNotMatch(notice.text,/Botol|BERBAHAYA|JANGAN SETUJUI|KEMUNGKINAN KUALITAS|Setiap hari/);
});

test('incomplete verification cannot be represented as successful or export-eligible',()=>{
  const notice=describeRepairNotice({status:'review_required'},{status:'review_required'},'id');
  assert.match(notice.text,/belum lengkap/);
  assert.match(notice.text,/Ekspor revisi ditahan/);
});

test('validated status is success only when there is no conflicting regression finding',()=>{
  const accepted=describeRepairNotice({status:'review_required'},{status:'validated'},'id');
  assert.match(accepted.text,/Pemeriksaan otomatis selesai/);
  const conflict=describeRepairNotice({status:'regression_suspected'},{status:'validated'},'id');
  assert.match(conflict.text,/Ekspor revisi ditahan/);
});

test('English result has same conservative export messaging',()=>{
  const notice=describeRepairNotice({status:'regression_suspected',reasons:['Duplicated text']},{status:'failed'},'en');
  assert.match(notice.text,/Revised export remains blocked/);
  assert.doesNotMatch(notice.text,/Duplicated text/);
});
