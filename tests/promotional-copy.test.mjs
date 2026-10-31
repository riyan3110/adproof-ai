import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isClearlySubjectiveSlogan} from '../public/claim-engine.js';

test('creative slogans are not displayed as missing documented product facts',()=>{
 const claim={claim:'Bawa segarnya. Setiap hari.',assessment:'needs_human_review',
   reason:'Slogan promosi bersifat ambigu dan tidak terukur.'};
 assert.equal(isClearlySubjectiveSlogan(claim),true);
 const proof=readFileSync(new URL('../public/proof-studio.js',import.meta.url),'utf8');
 assert.match(proof,/isClearlySubjectiveSlogan\(claim\)/);
 assert.match(proof,/xrayEvidence'\)\.hidden=expressive\|\|!claim\.fact_quote/);
});

test('measurable assertions and factual promises are never excused as slogans',()=>{
 for(const claim of ['Dingin hingga 24 jam','100% hemat energi',
  'Terbukti aman untuk mata','Meningkatkan kesehatan tidur','Garansi seumur hidup',
  'Keeps drinks cold 12 hours','Clinically proven results','Best price guaranteed']){
  assert.equal(isClearlySubjectiveSlogan({claim,assessment:'needs_human_review',
   reason:'Slogan promosi yang harus ditinjau'}),false,claim);
 }
 assert.equal(isClearlySubjectiveSlogan({claim:'Bawa segarnya. Setiap hari.',
  assessment:'unsupported_by_supplied_facts',reason:'Slogan promosi'}),false);
});

test('non-slogan ambiguity stays visible instead of being reclassified',()=>{
 assert.equal(isClearlySubjectiveSlogan({claim:'Ramah di lingkungan',assessment:'needs_human_review',
  reason:'Tidak ada data emisi atau daur ulang'}),false);
});

test('Meta prompt differentiates artistic copy from measurable guarantees for all products',()=>{
 const backend=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(backend,/OBJECTIVELY TESTABLE product assertions/);
 assert.match(backend,/Pure creative slogans are NOT factual claims/);
 assert.match(backend,/concrete measurable promise/);
 assert.match(backend,/Unsupported means UNVERIFIED, not automatically false/);
});
