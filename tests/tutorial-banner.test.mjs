import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setPreference,t} from '../public/i18n.js';

const html=readFileSync(new URL('../public/app.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/studio.css',import.meta.url),'utf8');

test('tutorial banner is visible before the Studio without requiring an audit',()=>{
  const pos=html.indexOf('id="tutorialBanner" open');
  assert.ok(pos>0,'first-time tutorial must start visible');
  assert.ok(pos<html.indexOf('class="studio-shell"'),'tutorial is above workflow controls');
  assert.ok(html.includes('<summary>')&&html.includes('How to use AdProof AI'));
  assert.ok(html.includes('class="tutorial-open-label"'));
  assert.ok(html.includes('class="tutorial-closed-label"'));
  assert.ok(html.includes('id="publicTour"'),'keep existing sidebar guide for compatibility');
});

test('four tutorial links target actual existing UI controls in the right order',()=>{
  const guide=html.split('id="tutorialBanner" open')[1].split('</details>')[0];
  const targets=[...guide.matchAll(/class="tutorial-step" href="#([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(targets,['dropzone','auditButton','refineButton','verifyButton']);
  assert.deepEqual([...guide.matchAll(/class="tutorial-number">(\d\d)/g)].map(m=>m[1]),['01','02','03','04']);
  for(const target of targets)assert.ok(html.includes('id="'+target+'"'),'broken tutorial anchor #'+target);
  assert.ok(guide.includes('Failed checks block revised export.'));
  assert.ok(guide.includes('one Muse Image request and one automatic Muse Spark re-audit'),'explicitly disclose both paid provider calls');
  assert.ok(!guide.includes('onclick=')&&!guide.includes('javascript:'),'guide only navigates, never invokes model calls');
});

test('tutorial supports mobile horizontal step navigation without page overflow',()=>{
  assert.match(css,/\.studio-body \.tutorial-chain\s*\{/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*?\.studio-body \.tutorial-chain\s*\{/);
  assert.ok(css.includes('grid-auto-flow:column'));
  assert.ok(css.includes('overflow-x:auto'));
  assert.ok(css.includes('scroll-snap-type:x proximity'));
  assert.ok(css.includes('.studio-body .tutorial-banner:not([open])'),'collapse state must work without JS');
});

test('guide text follows manual English and Indonesian choices without touching source evidence',()=>{
  setPreference('id');
  assert.equal(t('How to use AdProof AI'),'Cara menggunakan AdProof AI');
  assert.equal(t('Repair if needed'),'Perbaiki jika perlu');
  assert.equal(t('Swipe to view all steps →'),'Geser untuk melihat semua langkah →');
  assert.equal(t('Repair a confirmed issue; AI automatically re-checks the revised image.'),
    'Perbaiki kesalahan yang ditemukan; AI otomatis memeriksa ulang gambar hasilnya.');
  setPreference('en');
  assert.equal(t('Review + save'),'Review + save');
  assert.equal(t('Real creative text stays original'),'Real creative text stays original');
  setPreference('auto');
});
