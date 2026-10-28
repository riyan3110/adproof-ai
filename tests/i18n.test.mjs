import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveLanguage,setPreference,getPreference,getLanguage,t,loadPreference} from '../public/i18n.js';

test('Auto language uses browser locale for Indonesian and English with safe fallback',()=>{
 assert.equal(resolveLanguage('auto','id-ID'),'id');
 assert.equal(resolveLanguage('auto','id'),'id');
 assert.equal(resolveLanguage('auto','en-US'),'en');
 assert.equal(resolveLanguage('auto','fr-FR'),'en','unsupported locales fall back to English rather than pretending translated UI');
 assert.equal(resolveLanguage('en','id-ID'),'en');
 assert.equal(resolveLanguage('id','en-US'),'id');
 assert.equal(resolveLanguage('invalid','id-ID'),'id');
});
test('Manual language override instantly switches known labels without touching model text',()=>{
 setPreference('id');
 assert.equal(getPreference(),'id');
 assert.equal(getLanguage(),'id');
 assert.equal(t('Product name'),'Nama produk');
 assert.equal(t('Claim DNA'),'DNA Klaim');
 assert.equal(t('Repair creative ↗'),'Perbaiki gambar ↗');
 assert.equal(t('LumaDesk Mini 3000K USB-C powered'),'LumaDesk Mini 3000K USB-C powered','unknown/source text cannot be invented by dictionary');
 setPreference('en');
 assert.equal(t('Product name'),'Product name');
 assert.equal(t('A claim needs context.'),'A claim needs context.');
 setPreference('auto');
 assert.equal(getPreference(),'auto');
});
test('Untrusted preferences are ignored and the default stays Auto',()=>{
 setPreference('pretend-supported-locale');
 assert.equal(getPreference(),'auto');
 assert.equal(resolveLanguage('zh-CN','en'),'en');
 assert.equal(resolveLanguage('xx','id'),'id');
 loadPreference();
 assert.equal(['auto','en','id'].includes(getPreference()),true);
});
