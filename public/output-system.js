export const PRESETS={social:[[1080,1080],[1080,1350],[1080,1920]],website:[[1600,900],[1920,1080],[2560,1440]]};
export const PRINT_SIZES={a4:[210,297],a3:[297,420],a2:[420,594],custom:null};
export function outputPlan(source,options={}){
 const category=Object.hasOwn(PRESETS,options.category)?options.category:options.category==='print'?'print':'social';
 let width,height,physical=null;
 if(category==='print'){
  const unit=options.unit==='cm'?'cm':'mm',ppi=Number(options.ppi||150),w=Number(options.width),h=Number(options.height);
  if(![w,h,ppi].every(Number.isFinite)||w<=0||h<=0||ppi<72||ppi>600)throw Error('Invalid print size / Ukuran cetak tidak valid.');
  const mm=unit==='cm'?10:1;width=Math.round(w*mm/25.4*ppi);height=Math.round(h*mm/25.4*ppi);physical={width:w,height:h,unit,target_ppi:ppi};
 }else{
  const preset=PRESETS[category][Number(options.preset)||0];if(!preset)throw Error('Invalid preset.');[width,height]=preset;
 }
 if(width<1||height<1||width>8192||height>8192||width*height>32e6)throw Error('Output limit: 8192 px per side / 32 MP. Reduce size or PPI / Kurangi ukuran atau PPI.');
 if(!source||![source.width,source.height].every(n=>Number.isFinite(n)&&n>0))throw Error('Source dimensions unavailable / Dimensi sumber belum tersedia.');
 const scale=Math.min(width/source.width,height/source.height),drawWidth=Math.max(1,Math.round(source.width*scale)),drawHeight=Math.max(1,Math.round(source.height*scale));
 return {category,width,height,physical,source:{width:source.width,height:source.height},fit:'contain',padding:options.padding==='white'?'white':'transparent',draw:{width:drawWidth,height:drawHeight,x:Math.floor((width-drawWidth)/2),y:Math.floor((height-drawHeight)/2)},scale,
  method:scale>1?'browser_interpolation_no_new_detail':scale<1?'browser_downsample':'original_pixels_with_padding',upscaled:scale>1.001,aspect_changed:Math.abs(source.width/source.height-width/height)>0.001,
  effective_source_ppi:physical?Math.round(physical.target_ppi/scale):null,detail_certified:false};
}
/**
 * Deterministic pixel sufficiency only. No visual sharpness estimate, no AI detail
 * reconstruction and no claim of professional print certification.
 * The actual decoded image dimensions, rather than an API-requested "size", are used.
 */
export function assessOutputQuality(plan){
 const scale=Number(plan?.scale);
 if(!Number.isFinite(scale)||scale<=0)throw Error('Output scale unavailable.');
 const enlargement=Math.max(1,scale);
 const needsInterpolation=enlargement>1.001;
 const padded=plan.fit==='contain'&&(plan.draw.width<plan.width-1||plan.draw.height<plan.height-1);
 const print=plan.category==='print';
 const nativePpi=print?Math.round(plan.physical.target_ppi/scale):null;
 const nativeMaxPrint=print?{
  width_mm:Math.round(plan.source.width/plan.physical.target_ppi*25.4),
  height_mm:Math.round(plan.source.height/plan.physical.target_ppi*25.4)
 }:null;
 const status=print
  ?needsInterpolation||padded?'print_draft_only':'print_pixels_sufficient_manual_review'
  :needsInterpolation?'interpolated_not_native_detail':'native_pixels_sufficient';
 return {
  status,detail_added_by_ai:false,print_certified:false,
  source:{...plan.source},target:{width:plan.width,height:plan.height},
  native_source_ppi:nativePpi,max_native_print_mm:nativeMaxPrint,
  scale_factor:Math.round(scale*100)/100,
  enlargement_factor:Math.round(enlargement*100)/100,
  needs_interpolation:needsInterpolation,
  contains_padding:padded,
  limitations:[
   ...(needsInterpolation?['Pixel enlargement cannot create authentic source detail.']:[]),
   ...(padded?['Aspect ratio mismatch may leave blank margins.']:[]),
   ...(print?['Effective PPI is mathematical only; no CMYK conversion, proofing or sharpness certification.']:[])
  ]
 };
}
export async function decodeImage(data){
 const img=new Image();img.decoding='async';img.src=data;await img.decode();
 if(!img.naturalWidth||!img.naturalHeight)throw Error('Unreadable image / Gambar tidak terbaca.');
 return img;
}
export async function dimensions(data){const i=await decodeImage(data);return {width:i.naturalWidth,height:i.naturalHeight};}
function canvas(width,height){const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas unavailable.');return {c,ctx};}
export async function comparePixels(before,after){
 const [a,b]=await Promise.all([decodeImage(before),decodeImage(after)]);
 const sample=img=>{const {ctx}=canvas(64,64);ctx.drawImage(img,0,0,64,64);return ctx.getImageData(0,0,64,64).data;};
 const x=sample(a),y=sample(b);let delta=0,border=0,n=0,lightA=0,lightB=0,changed=0;const avgA=[0,0,0],avgB=[0,0,0];
 for(let i=0;i<x.length;i+=4){let d=0;for(let j=0;j<3;j++){d+=Math.abs(x[i+j]-y[i+j])/765;avgA[j]+=x[i+j]/4096;avgB[j]+=y[i+j]/4096;}delta+=d;if(d>.12)changed++;lightA+=(.2126*x[i]+.7152*x[i+1]+.0722*x[i+2])/4096;lightB+=(.2126*y[i]+.7152*y[i+1]+.0722*y[i+2])/4096;const px=(i/4)%64,py=Math.floor(i/256);if(px<8||px>55||py<8||py>55){border+=d;n++;}}
 return {basis:'64x64_normalized_pixel_heuristic_not_object_detection',identical:before===after,original:{width:a.naturalWidth,height:a.naturalHeight},revised:{width:b.naturalWidth,height:b.naturalHeight},aspect_delta:Math.abs((a.naturalWidth/a.naturalHeight)/(b.naturalWidth/b.naturalHeight)-1),mean_color_delta:avgA.reduce((v,k,j)=>v+Math.abs(k-avgB[j]),0)/765,luminance_delta:Math.abs(lightA-lightB)/255,border_delta:border/n,mean_pixel_delta:delta/4096,changed_sample_fraction:changed/4096};
}
export async function compositeRegion(original,candidate,region){
 if(!region)return {image:candidate,method:'full_frame_candidate'};
 const [a,b]=await Promise.all([decodeImage(original),decodeImage(candidate)]);
 const {c,ctx}=canvas(a.naturalWidth,a.naturalHeight);ctx.drawImage(a,0,0);
 const x=Math.round(region.x*c.width),y=Math.round(region.y*c.height),w=Math.min(c.width-x,Math.round(region.width*c.width)),h=Math.min(c.height-y,Math.round(region.height*c.height));
 if(w<1||h<1)throw Error('Repair region too small.');
 ctx.drawImage(b,region.x*b.naturalWidth,region.y*b.naturalHeight,region.width*b.naturalWidth,region.height*b.naturalHeight,x,y,w,h);
 return {image:c.toDataURL('image/png'),method:'local_rectangle_composite_original_pixels_outside',rectangle:{x,y,width:w,height:h},limitations:['Hard rectangle boundary may have seams; inspect the boundary. No model mask/inpainting was used.']};
}
// Embed truthful physical resolution in PNG pHYs. This is metadata, never added detail.
function crc(bytes){let v=0xffffffff;for(const byte of bytes){v^=byte;for(let j=0;j<8;j++)v=(v>>>1)^((v&1)?0xedb88320:0);}return (v^0xffffffff)>>>0;}
export function pngDensity(bytes,ppi){
 if(!ppi)return bytes;
 const chunk=new Uint8Array(21),v=new DataView(chunk.buffer);v.setUint32(0,9);chunk.set([112,72,89,115],4);v.setUint32(8,Math.round(ppi/0.0254));v.setUint32(12,Math.round(ppi/0.0254));chunk[16]=1;v.setUint32(17,crc(chunk.subarray(4,17)));
 // Replace a browser's existing pHYs if any, keeping every other chunk intact.
 const parts=[bytes.subarray(0,8)];let p=8;const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 while(p+12<=bytes.length){const len=dv.getUint32(p);if(p+len+12>bytes.length)throw Error('Invalid PNG.');const type=String.fromCharCode(...bytes.subarray(p+4,p+8));if(type!=='pHYs')parts.push(bytes.subarray(p,p+len+12));if(type==='IHDR')parts.push(chunk);p+=len+12;}
 const out=new Uint8Array(parts.reduce((n,b)=>n+b.length,0));let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;
}
export async function renderOutput(data,options,{allowInterpolation=false,aiAdapted=false}={}){
 const img=await decodeImage(data),plan=outputPlan({width:img.naturalWidth,height:img.naturalHeight},options);
 if(aiAdapted){
  // Never disguise letterbox padding as an AI-composed full-bleed result.
  // The Muse output must already have substantially the intended ratio.
  const ratio=plan.width/plan.height,sourceRatio=img.naturalWidth/img.naturalHeight;
  if(Math.abs(sourceRatio-ratio)/ratio>.025)throw Error('AI result ratio is not compatible with this format / Rasio hasil AI tidak sesuai.');
  const scale=Math.max(plan.width/img.naturalWidth,plan.height/img.naturalHeight);
  const w=Math.ceil(img.naturalWidth*scale),h=Math.ceil(img.naturalHeight*scale);
  plan.draw={width:w,height:h,x:Math.floor((plan.width-w)/2),y:Math.floor((plan.height-h)/2)};
  plan.scale=scale;plan.fit='ai_adapted_full_bleed';plan.padding='none';
  plan.method=scale>1?'ai_relayout_then_interpolation_no_new_detail':'ai_relayout_then_browser_downsample';
  plan.upscaled=scale>1.001;
  plan.detail_certified=false;
  plan.native_ai_source={width:img.naturalWidth,height:img.naturalHeight};
  plan.cropped_margin_pixels={x:Math.abs(plan.draw.x),y:Math.abs(plan.draw.y)};
 }
 if(plan.upscaled&&!allowInterpolation)throw Error('Confirm interpolation before enlarging / Setujui interpolasi sebelum memperbesar.');
 const {c,ctx}=canvas(plan.width,plan.height);
 if(plan.padding==='white'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);}
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,plan.draw.x,plan.draw.y,plan.draw.width,plan.draw.height);
 const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)throw Error('PNG export failed.');
 const bytes=pngDensity(new Uint8Array(await blob.arrayBuffer()),plan.physical?.target_ppi);
 const out=new Blob([bytes],{type:'image/png'}),url=URL.createObjectURL(out);
 try{const actual=await dimensions(url);if(actual.width!==plan.width||actual.height!==plan.height)throw Error('Output dimensions mismatch.');return {blob:out,metadata:{...plan,actual,quality:assessOutputQuality(plan),exported_at:new Date().toISOString(),text_sharpness:'manual_review_required',limitations:['No AI upscaler used; interpolation adds no detail.','Raster text/logo sharpness and print quality are not certified.']}};}finally{URL.revokeObjectURL(url);}
}
