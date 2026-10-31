import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repairJourney} from '../public/repair-journey.js';

const initial={score:35,claim_ledger:[{origin:'creative',assessment:'unsupported_by_supplied_facts',claim:'Dingin hingga 24 jam'}],
 issues:[{title:'Klaim durasi belum didukung',category:'Claim'}],
 local_text_repair:{edits:[{before:'Dingin hingga 24 jam',replacement:'Stainless steel 600 mL'}]}};
const base={initialAudit:initial,verified:null,revised:null,repairReview:null,consistencyReview:null,repairMetadata:null,history:[],imported:false,busy:false,autoCorrection:null};

test('before repair, show exact observed target, actionable repair, and no fake completed work',()=>{
 const x=repairJourney(base,{canRepair:true,language:'id'});
 assert.equal(x.visible,true);
 assert.equal(x.phase,'ready');
 assert.match(x.issue,/Dingin hingga 24 jam/);
 assert.match(x.action,/fakta produk/);
 assert.match(x.result,/Belum diperbaiki/);
 assert.equal(x.button.action,'repair');
 assert.match(x.next,/pemeriksaan ulang otomatis/);
});

test('after actual localized repair, report source edit not invented success',()=>{
 const x=repairJourney({...base,revised:'data:image/png;base64,REVISED',
  verified:{score:96,claim_ledger:[],issues:[]},
  repairMetadata:{local_repair:{pixel_proof:{verified:true}}},
  consistencyReview:{status:'validated',text:{removed:['Dingin hingga 24 jam']},risks:[]},
  repairReview:{status:'review_required'}},
  {canRepair:true,language:'id'});
 assert.equal(x.phase,'passed');assert.equal(x.button.action,'compare');
 assert.match(x.change,/Dingin hingga 24 jam/);
 assert.match(x.change,/Stainless steel 600 mL/);
 assert.match(x.result,/lolos pemeriksaan otomatis/i);
});

test('spent correction budget blocks further AI retries and guides comparison',()=>{
 const x=repairJourney({...base,revised:'image',verified:{score:90},repairReview:{status:'regression_suspected'},
  consistencyReview:{status:'failed',locks:{composition:{locked:true,status:'possible_change'}},risks:[]},
  repairMetadata:{compositing:{method:'generated_region'}},
  autoCorrection:{attempted:true,status:'still_failed'}},
  {canRetry:true,language:'id'});
 assert.equal(x.phase,'blocked');assert.equal(x.button.action,'compare');
 assert.match(x.guidance,/ukuran atau posisi objek/);
 assert.match(x.guidance,/batas koreksi otomatis tercapai/i);
 assert.match(x.next,/jangan ulangi AI/i);
 assert.match(x.result,/belum lolos/i);
 assert.match(x.result,/ekspor revisi ditahan/i);
});

test('first correction attempt is still permitted only when a grounded target exists',()=>{
 const x=repairJourney({...base,revised:'image',verified:{score:75},
   consistencyReview:{status:'failed',locks:{colors:{locked:true,status:'possible_change'}},risks:[{code:'lock_colors',evidence:'Observed color mismatch'}]}},
  {canRetry:true,language:'id'});
 assert.equal(x.button.action,'retry');
 assert.match(x.guidance,/warna produk/);
 assert.match(x.footnote,/kuota/);
});
test('spent correction budget stays blocked on recovered audit even if caller mistakenly sets canRetry',()=>{
 const x=repairJourney({...base,revised:'image',verified:{score:99},
   autoCorrection:{attempted:true,status:'still_failed'},
   consistencyReview:{status:'failed',locks:{colors:{locked:true,status:'changed'}},risks:[{code:'lock_colors',evidence:'Changed bottle color'}]}},
  {canRetry:true,language:'en'});
 assert.equal(x.button.action,'compare');
 assert.match(x.guidance,/product colors/);
 assert.match(x.next,/do not repeat AI/);
});
test('missing grounded correction target never offers an AI retry',()=>{
 const x=repairJourney({...base,revised:'image',verified:{score:90},consistencyReview:{status:'failed',risks:[]}},
  {canRetry:false,language:'en'});
 assert.equal(x.button.action,'compare');
 assert.match(x.result,/export is blocked/i);
});

test('restored archive never offers a paid action and no-image findings avoid regeneration',()=>{
 const saved=repairJourney({...base,imported:true},{canRepair:true,language:'id'});
 assert.equal(saved.phase,'saved');assert.equal(saved.button,null);
 const noFix=repairJourney({...base,initialAudit:{issues:[],claim_ledger:[]}},{canRepair:false,language:'id'});
 assert.equal(noFix.button.action,'caption');
});

test('Studio uses the existing bounded repair and verify flows, with no fake actions',()=>{
 const html=readFileSync(new URL('../public/app.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../public/studio.css',import.meta.url),'utf8');
 for(const id of ['repairJourney','repairJourneyIssue','repairJourneyAction','repairJourneyMethod','repairJourneyChange','repairJourneyResult','repairJourneyNext','repairJourneyButton']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(js,/ui\.refine\.click\(\)/);
 assert.match(js,/ui\.verify\.click\(\)/);
 assert.match(js,/await attemptAutoCorrectionOnce\(\)/);
 assert.doesNotMatch(js,/alreadyAttempted:manual\?false/);
 assert.match(js,/alreadyAttempted:Boolean\(state\.autoCorrection\?\.attempted\)/);
 assert.match(js,/max_extra_image_requests:1/); // source-bound Meta correction budget documented in autoCorrection object
 assert.match(server,/\['\/repair-journey\.js','public\/repair-journey\.js'\]/);
 assert.match(css,/\.studio-body \.repair-journey-steps/);
});
