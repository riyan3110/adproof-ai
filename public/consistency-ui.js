import {STYLES,LOCKS,normalizeSettings} from './visual-consistency.js';
import {PRESETS,PRINT_SIZES,dimensions,outputPlan,renderOutput} from './output-system.js';
const localKey='adproof-visual-settings-v1';
export function createConsistencyUI({state,language,onSettingsChange,download,notify,adaptFormat}){
 const id=()=>language()==='id',say=(en,indo)=>id()?indo:en;
 const panel=document.createElement('section');panel.className='consistency-controls';panel.id='visualControls';panel.setAttribute('data-no-translate','');
 panel.innerHTML=`<div class="visual-style"><label for="visualStyle" data-en="Visual Style" data-id="Gaya Visual"></label><select id="visualStyle"></select><p id="styleConflict" class="control-note"></p></div><fieldset class="lock-fieldset"><legend>Consistency Lock</legend><div id="consistencyLocks" class="lock-list"></div><p class="control-note" data-en="Locks guide the model; Verify checks the result. Preservation is not guaranteed." data-id="Lock mengarahkan model; Verify memeriksa hasil. Keutuhan elemen tidak dijamin."></p></fieldset><details class="region-settings"><summary data-en="Target a repair area (optional)" data-id="Batasi area perbaikan (opsional)"></summary><label class="check-label"><input type="checkbox" id="useRepairRegion"><span data-en="Keep original pixels outside this rectangle" data-id="Pertahankan piksel asli di luar kotak ini"></span></label><div class="region-fields"><label>X %<input id="regionX" type="number" min="0" max="99" value="0"></label><label>Y %<input id="regionY" type="number" min="0" max="99" value="0"></label><label><span data-en="Width %" data-id="Lebar %"></span><input id="regionW" type="number" min="1" max="100" value="100"></label><label><span data-en="Height %" data-id="Tinggi %"></span><input id="regionH" type="number" min="1" max="100" value="100"></label></div><p class="control-note" data-en="Coordinates from top-left. Only this rectangle is pasted back after editing. Check seams and placement; this is local compositing, not a model mask." data-id="Koordinat dari kiri atas. Hanya kotak ini ditempel kembali setelah edit. Periksa sambungan dan posisi; ini komposit lokal, bukan mask model."></p><div class="region-preview"><img id="regionPreview" alt=""><div id="regionBox"></div></div></details>`;
 document.querySelector('.pipeline-bar').before(panel);
 const q=s=>document.querySelector(s),style=q('#visualStyle');
 for(const [key,preset] of Object.entries(STYLES)){const o=document.createElement('option');o.value=key;o.textContent=preset.label;style.append(o);}
 const lockLabels={product_shape:'Bentuk Produk',colors:'Warna',lighting:'Pencahayaan',background:'Latar',composition:'Komposisi',typography:'Tipografi',branding:'Identitas Merek'};
 for(const [key,[label]] of Object.entries(LOCKS)){const item=document.createElement('label');item.className='lock-toggle';const input=document.createElement('input');input.type='checkbox';input.dataset.lock=key;input.checked=true;const span=document.createElement('span');span.dataset.en=label;span.dataset.id=lockLabels[key];span.textContent=label;item.append(input,span);q('#consistencyLocks').append(item);}
 const result=document.createElement('section');result.id='consistencyResult';result.className='consistency-result';result.hidden=true;result.setAttribute('data-no-translate','');document.querySelector('.pipeline-bar').after(result);
 const output=document.createElement('section');output.className='output-controls';output.id='outputControls';output.setAttribute('data-no-translate','');
 output.innerHTML=`<h3>Output Size</h3><div class="output-fields"><label><span data-en="Category" data-id="Kategori"></span><select id="outputCategory"><option value="social" data-en="Social Media" data-id="Sosial Media"></option><option value="website">Website</option><option value="print" data-en="Print" data-id="Cetak"></option></select></label><label id="pixelPresetLabel"><span data-en="Size" data-id="Ukuran"></span><select id="outputPreset"></select></label><label><span data-en="Source" data-id="Sumber"></span><select id="outputSource"><option value="original" data-en="Original" data-id="Asli"></option><option value="revised" data-en="Re-audited candidate" data-id="Kandidat diaudit ulang"></option></select></label><label><span data-en="Fit + padding" data-id="Muat utuh + padding"></span><select id="outputPadding"><option value="white" data-en="White" data-id="Putih"></option><option value="transparent" data-en="Transparent" data-id="Transparan"></option></select></label></div><div id="printFields" class="output-fields" hidden><label><span data-en="Standard / custom" data-id="Standar / khusus"></span><select id="printStandard"><option value="a4">A4</option><option value="a3">A3</option><option value="a2">A2</option><option value="custom" data-en="Custom" data-id="Khusus"></option></select></label><label><span data-en="Width" data-id="Lebar"></span><input id="printWidth" type="number" min="0.1" step="0.1" value="210"></label><label><span data-en="Height" data-id="Tinggi"></span><input id="printHeight" type="number" min="0.1" step="0.1" value="297"></label><label><span data-en="Unit" data-id="Satuan"></span><select id="printUnit"><option>mm</option><option>cm</option></select></label><label>PPI<input id="printPpi" type="number" min="72" max="600" value="150"></label></div><p id="outputEstimate" class="control-note" aria-live="polite"></p><label class="check-label"><input type="checkbox" id="allowInterpolation"><span data-en="Allow interpolation if needed (no new detail)" data-id="Izinkan interpolasi bila perlu (tanpa detail baru)"></span></label><label class="check-label"><input type="checkbox" id="confirmOutput"><span data-en="I checked text, logos, product and unresolved locks in Compare; this is not automatic approval." data-id="Saya memeriksa teks, logo, produk dan Lock yang belum pasti di Compare; ini bukan persetujuan otomatis."></span></label><button id="adaptOutput" type="button" class="btn btn-subtle" data-en="AI adapt composition · 2 model calls ↗" data-id="AI sesuaikan komposisi · 2 panggilan model ↗"></button><p id="formatReview" class="control-note" role="status" aria-live="polite"></p><div class="format-preview" id="formatPreview" hidden><img id="formatBefore" alt="Source before format change"><img id="formatAfter" alt="AI adapted candidate before manual approval"></div><button id="prepareOutput" type="button" class="btn btn-outline" data-en="Check output ↗" data-id="Periksa output ↗"></button><p id="outputActual" class="control-note" aria-live="polite"></p><img id="outputPreview" class="output-preview" alt="Output preview" hidden>`;
 document.querySelector('.export-strip').before(output);
 let prepared=null,previewUrl=null,generation=0,dimensionKey=null,sourceSize=null,formatCandidate=null;
 const clearPrepared=({keepReview=false,keepFormat=false}={})=>{
  generation++;prepared=null;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;
  q('#outputPreview').removeAttribute('src');q('#outputPreview').hidden=true;q('#outputActual').textContent='';
  q('#downloadImage').disabled=true;state.outputActual=null;
  if(!keepReview)q('#confirmOutput').checked=false;
  if(!keepFormat){formatCandidate=null;q('#formatPreview').hidden=true;q('#formatBefore').removeAttribute('src');q('#formatAfter').removeAttribute('src');q('#formatReview').textContent='';}
 };
 const readSettings=()=>normalizeSettings({style:style.value,locks:Object.fromEntries([...panel.querySelectorAll('[data-lock]')].map(el=>[el.dataset.lock,el.checked])),region:q('#useRepairRegion').checked?{x:Number(q('#regionX').value)/100,y:Number(q('#regionY').value)/100,width:Number(q('#regionW').value)/100,height:Number(q('#regionH').value)/100}:null});
 const setSettings=v=>{const s=normalizeSettings(v);style.value=s.style;for(const el of panel.querySelectorAll('[data-lock]'))el.checked=s.locks[el.dataset.lock];q('#useRepairRegion').checked=!!s.region;for(const [key,field] of [['x','X'],['y','Y'],['width','W'],['height','H']])q('#region'+field).value=(s.region?.[key]??(key==='width'||key==='height'?1:0))*100;state.consistency=s;};
 try{setSettings(JSON.parse(localStorage.getItem(localKey)||'{}'));}catch{setSettings({});}
 function setPixelOptions(){const selected=q('#outputPreset').value;q('#outputPreset').replaceChildren();for(const [i,p] of (PRESETS[q('#outputCategory').value]||PRESETS.social).entries()){const o=document.createElement('option');o.value=i;o.textContent=p.join(' × ');q('#outputPreset').append(o);}if([...q('#outputPreset').options].some(o=>o.value===selected))q('#outputPreset').value=selected;}
 setPixelOptions();
 const options=()=>({category:q('#outputCategory').value,preset:Number(q('#outputPreset').value),width:Number(q('#printWidth').value),height:Number(q('#printHeight').value),unit:q('#printUnit').value,ppi:Number(q('#printPpi').value),standard:q('#printStandard').value,padding:q('#outputPadding').value,source:q('#outputSource').value});
 const failed=()=>state.consistencyReview?.status==='failed'||state.repairReview?.status==='regression_suspected';
 const source=()=>q('#outputSource').value==='revised'?state.revised:state.original;
 const exportSource=()=>q('#outputSource').value==='original'?(state.fullOriginalURL||state.original):state.revised;
 const candidateAllowed=()=>!!state.verified&&!!state.consistencyReview&&!failed();
 const matchingFormat=(image,plan)=>formatCandidate&&formatCandidate.input===image&&formatCandidate.width===plan.width&&formatCandidate.height===plan.height;
 const usableFormat=(image,plan)=>matchingFormat(image,plan)&&formatCandidate.review?.status!=='failed';
 async function estimate(){
  const image=exportSource();state.outputRequested=options();q('#printFields').hidden=options().category!=='print';q('#pixelPresetLabel').hidden=options().category==='print';
  if(!image){q('#outputEstimate').textContent=say('Upload an image first.','Unggah gambar terlebih dahulu.');return;}
  try{if(image!==dimensionKey){dimensionKey=image;sourceSize=await dimensions(image);if(exportSource()!==image)return;}
   const p=outputPlan(sourceSize,options());q('#outputEstimate').textContent=say('Source ','Sumber ')+`${p.source.width} × ${p.source.height} → ${p.width} × ${p.height} px. `+(p.aspect_changed?say('Fit with padding; nothing cropped. ','Muat utuh dengan padding; tanpa potongan. '):'')+(p.upscaled?say('Interpolation only; no added detail. ','Hanya interpolasi; tanpa detail baru. '):say('No enlargement. ','Tanpa pembesaran. '))+(p.physical?say('Effective source PPI: ','PPI efektif sumber: ')+p.effective_source_ppi+'. ':'')+(p.aspect_changed&&p.category!=='print'?say('AI composition adaptation required to prevent blank margins. ','Perlu adaptasi komposisi AI agar tidak ada margin kosong. '):'')+say('Text/logo sharpness needs inspection. Print quality is not certified.','Ketajaman teks/logo perlu diperiksa. Kualitas cetak tidak disertifikasi.');
  }catch(e){q('#outputEstimate').textContent=e.message;}
 }
 function renderResult(){
  const r=state.consistencyReview;result.hidden=!r;result.replaceChildren();if(!r)return;
  const h=document.createElement('h3');h.textContent=r.status==='failed'?say('Consistency check failed — original retained','Pemeriksaan konsistensi gagal — gambar asli dipertahankan'):say('Consistency — manual review required','Konsistensi — perlu pemeriksaan manual');result.append(h);
  const statuses={preserved:say('Preserved','Dipertahankan'),possible_change:say('Possible Change','Mungkin Berubah'),changed:say('Changed','Berubah'),unable_to_verify:say('Unable to Verify','Belum Dapat Diverifikasi')};
  const list=document.createElement('dl');list.className='lock-results';for(const [k,v] of Object.entries(r.locks)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=(id()?lockLabels[k]:LOCKS[k][0])+(v.locked?' · ON':' · OFF');dd.textContent=statuses[v.status]||statuses.unable_to_verify;if(v.evidence)dd.title=v.evidence;list.append(dt,dd);}result.append(list);
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=say('Text changes, evidence & limitations','Perubahan teks, bukti & keterbatasan');details.append(summary);
  const add=(label,value)=>{const p=document.createElement('p');p.textContent=label+': '+value;details.append(p);};
  add(say('Extraction coverage','Cakupan ekstraksi'),r.coverage==='model_reports_complete'?say('Model reports complete; not certified OCR','Model melaporkan lengkap; bukan OCR tersertifikasi'):say('Partial / unknown','Sebagian / belum pasti'));
  for(const [key,label] of [['added',say('Newly observed text','Teks baru teramati')],['removed',say('No longer observed','Tidak lagi teramati')]])add(label,r.text[key].join(' | ')||'—');
  for(const x of r.text.changed||[])add(say('Changed wording','Perubahan kata'),`${x.before} → ${x.after} · ${x.evidence}`);
  for(const [k,v] of Object.entries(r.locks))if(v.evidence)add(id()?lockLabels[k]:LOCKS[k][0],v.evidence);
  for(const risk of r.risks)add(say('Review risk','Risiko'),risk.evidence);
  for(const limitation of r.text.limitations||[])add(say('Extraction limitation','Keterbatasan ekstraksi'),limitation);
  if(r.measurements)add(say('Pixel samples (heuristic)','Sampel piksel (heuristik)'),`${Math.round(r.measurements.changed_sample_fraction*100)}% · ${r.measurements.original.width}×${r.measurements.original.height} → ${r.measurements.revised.width}×${r.measurements.revised.height}`);
  add(say('Limit','Batas'),say('Model observations and coarse pixels cannot certify product identity, text completeness or 100% consistency.','Pengamatan model dan sampel piksel tidak menjamin identitas produk, kelengkapan teks, atau konsistensi 100%.'));result.append(details);
 }
 function sync(){
  for(const e of [...panel.querySelectorAll('[data-en]'),...output.querySelectorAll('[data-en]')]){const value=id()?e.dataset.id:e.dataset.en;if(e.textContent!==value)e.textContent=value;}
  const styleId={preserve:'Otomatis / Pertahankan Asli',photorealistic:'Fotorealistis',natural:'Natural',studio:'Studio Produk',lifestyle:'Gaya Hidup',cinematic:'Sinematik',luxury:'Mewah',minimalist:'Minimalis',editorial:'Editorial',vibrant:'Warna Cerah',cgi:'3D / CGI',illustration:'Ilustrasi'};for(const o of style.options)o.textContent=id()?styleId[o.value]:STYLES[o.value].label;
  if(prepared)q('#outputActual').textContent=say('Actual PNG: ','PNG aktual: ')+`${prepared.metadata.actual.width} × ${prepared.metadata.actual.height} px · ${Math.round(prepared.blob.size/1024)} KB. `+say('Inspect the preview, then export.','Periksa pratinjau, lalu ekspor.');output.querySelector('h3').textContent=say('Output Size','Ukuran Output');
  q('#styleConflict').textContent=style.value==='preserve'?say('Preserve the source; correct only evidenced issues.','Pertahankan sumber; perbaiki hanya masalah dengan bukti.'):say('Locks take priority. Conflicting style changes are skipped.','Lock diprioritaskan. Perubahan gaya yang bertentangan dilewati.');
  for(const e of panel.querySelectorAll('input,select'))e.disabled=state.busy||state.imported||!!state.revised;
  for(const e of output.querySelectorAll('input,select,button'))e.disabled=state.busy;
  q('#outputSource').options[1].disabled=!candidateAllowed();if(!candidateAllowed()&&q('#outputSource').value==='revised'){q('#outputSource').value='original';clearPrepared();}
  q('#downloadImage').disabled=state.busy||!prepared;q('#prepareOutput').disabled=state.busy||!state.original;
  q('#adaptOutput').disabled=state.busy||state.imported||!state.original||!state.initialAudit||options().category==='print'||(options().source==='revised'&&!candidateAllowed());
  if(state.original&&q('#regionPreview').getAttribute('src')!==state.original)q('#regionPreview').src=state.original;
  q('.region-preview').hidden=!state.original||!q('#useRepairRegion').checked;
  const box=q('#regionBox');box.style.left=q('#regionX').value+'%';box.style.top=q('#regionY').value+'%';box.style.width=q('#regionW').value+'%';box.style.height=q('#regionH').value+'%';
  renderResult();void estimate();
 }
 panel.addEventListener('change',()=>{try{state.consistency=readSettings();localStorage.setItem(localKey,JSON.stringify(state.consistency));onSettingsChange();clearPrepared();sync();}catch(e){notify(e.message,true);}});
 output.addEventListener('change',e=>{
  if(e.target.id==='outputCategory')setPixelOptions();
  if(['printStandard','printUnit'].includes(e.target.id)){const size=PRINT_SIZES[q('#printStandard').value];if(size){const divisor=q('#printUnit').value==='cm'?10:1;q('#printWidth').value=size[0]/divisor;q('#printHeight').value=size[1]/divisor;}}
  if(['printWidth','printHeight'].includes(e.target.id))q('#printStandard').value='custom';
  // Any changed input invalidates the previously rendered pixels AND their export metadata.
  // Consent/review toggles keep the user's current checkbox value, not old output.
  const sameSource=['confirmOutput','allowInterpolation','outputPadding'].includes(e.target.id);
  clearPrepared({keepReview:sameSource,keepFormat:sameSource});sync();
 });
 q('#adaptOutput').addEventListener('click',async()=>{
  const image=source(),opts=options(),token=++generation;
  try{
   if(!image||opts.category==='print'||state.imported)throw Error(say('AI format adaptation is available only for Social Media and Website.','Adaptasi format AI hanya tersedia untuk Sosial Media dan Website.'));
   if(opts.source==='revised'&&!candidateAllowed())throw Error(say('Verify and review the repair first.','Periksa dan verifikasi revisi terlebih dahulu.'));
   const size=await dimensions(image),plan=outputPlan(size,opts);
   if(!plan.aspect_changed)throw Error(say('This image already matches the selected aspect ratio.','Gambar sudah sesuai rasio yang dipilih.'));
   if(!adaptFormat)throw Error('AI format adapter is unavailable.');
   clearPrepared();
   q('#adaptOutput').disabled=true;
   q('#formatReview').textContent=say('Requesting an AI composition and a separate paid verification; source stays intact.','Membuat komposisi AI dan audit verifikasi terpisah (berbayar); sumber tetap utuh.');
   const out=await adaptFormat(image,{width:plan.width,height:plan.height});
   if(source()!==image||options().category!==opts.category||options().preset!==opts.preset)return;
   formatCandidate={input:image,image:out.image,width:plan.width,height:plan.height,review:out.review,metadata:out.metadata};
   q('#formatBefore').src=image;q('#formatAfter').src=out.image;q('#formatPreview').hidden=false;
   q('#formatReview').textContent=out.review.status==='failed'?say('AI adaptation failed checks. Do not export this candidate; original retained.','Adaptasi AI gagal pemeriksaan. Jangan ekspor kandidat; gambar asli dipertahankan.'):say('AI candidate checked. Review product, text, logos and resolution manually before output.','Kandidat AI diperiksa. Periksa produk, teks, logo, dan resolusi secara manual sebelum ekspor.');
   if(out.review.status==='failed')notify(q('#formatReview').textContent,true);
  }catch(e){q('#formatReview').textContent=e.message;notify(e.message,true);}
  finally{sync();}
 });
 q('#prepareOutput').addEventListener('click',async()=>{
  const token=++generation;
  try{if(!q('#confirmOutput').checked)throw Error(say('Inspect the source and confirm the review first.','Periksa sumber dan centang pemeriksaan terlebih dahulu.'));
   if(options().source==='revised'&&!candidateAllowed())throw Error(say('Candidate failed or has not been verified. Export the original.','Kandidat gagal atau belum diverifikasi. Ekspor gambar asli.'));
   const src=source(),opts=options(),plan=outputPlan(await dimensions(exportSource()),opts);
   const mustAdapt=plan.aspect_changed&&opts.category!=='print';
   if(mustAdapt&&!usableFormat(src,plan))throw Error(say('Adapt the composition with AI and pass verification before export. No blank-margin fallback.','Sesuaikan komposisi dengan AI dan lolos pemeriksaan sebelum ekspor. Tanpa margin kosong.'));
   q('#prepareOutput').disabled=true;
   const out=await renderOutput(mustAdapt?formatCandidate.image:exportSource(),opts,{allowInterpolation:q('#allowInterpolation').checked,aiAdapted:mustAdapt});if(token!==generation)return;
   if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(out.blob);q('#outputPreview').src=previewUrl;q('#outputPreview').hidden=false;prepared=out;state.outputActual={...out.metadata,source:options().source,source_dimensions:out.metadata.source,...(mustAdapt?{format_adaptation:{review:formatCandidate.review,provider:formatCandidate.metadata,model_native_dimensions:out.metadata.native_ai_source}}:{})};
   q('#outputActual').textContent=say('Actual PNG: ','PNG aktual: ')+`${out.metadata.actual.width} × ${out.metadata.actual.height} px · ${Math.round(out.blob.size/1024)} KB. `+say('Inspect the preview, then export.','Periksa pratinjau, lalu ekspor.');q('#downloadImage').disabled=false;
  }catch(e){notify(e.message,true);}finally{q('#prepareOutput').disabled=state.busy;}
 });
 return {sync,readSettings,clear:clearPrepared,restore(settings,outputSettings){setSettings(settings||{});if(outputSettings){for(const [key,field] of Object.entries({category:'outputCategory',preset:'outputPreset',width:'printWidth',height:'printHeight',unit:'printUnit',ppi:'printPpi',padding:'outputPadding',standard:'printStandard'})){if(outputSettings[key]!==undefined)q('#'+field).value=outputSettings[key];if(key==='category')setPixelOptions();}}clearPrepared();sync();},export(){if(!prepared||state.busy)return;download(prepared.blob,`adproof-${prepared.metadata.width}x${prepared.metadata.height}.png`,'image/png');}};
}
