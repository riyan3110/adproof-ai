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
  const idx=options.preset==null||options.preset===''?0:Number(options.preset);if(!Number.isInteger(idx))throw Error('Invalid preset.');const preset=PRESETS[category][idx];if(!preset)throw Error('Invalid preset.');[width,height]=preset;
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
function solidPerimeter(data,width,height){
 const rgb=[data[0],data[1],data[2]];let count=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(x>1&&y>1&&x<width-2&&y<height-2)continue;
  const p=(y*width+x)*4;
  if(data[p+3]!==255||rgb.some((v,k)=>Math.abs(v-data[p+k])>6))return null;
  count++;
 }
 return count?rgb:null;
}
export async function verifyLocalPixels(original,revised,rectangles){
 const [a,b]=await Promise.all([decodeImage(original),decodeImage(revised)]);
 if(a.naturalWidth!==b.naturalWidth||a.naturalHeight!==b.naturalHeight)throw Error('Local repair changed source dimensions.');
 const read=img=>{const {ctx}=canvas(img.naturalWidth,img.naturalHeight);ctx.drawImage(img,0,0);return ctx.getImageData(0,0,img.naturalWidth,img.naturalHeight).data;};
 const x=read(a),y=read(b),w=a.naturalWidth;let outside=0,inside=0;
 for(let i=0;i<x.length;i+=4){
  if(x[i]===y[i]&&x[i+1]===y[i+1]&&x[i+2]===y[i+2]&&x[i+3]===y[i+3])continue;
  const px=(i/4)%w,py=Math.floor(i/4/w);
  if(rectangles.some(r=>px>=r.x&&py>=r.y&&px<r.x+r.width&&py<r.y+r.height))inside++;else outside++;
 }
 return {basis:'all_decoded_rgba_pixels',outside_changed_pixels:outside,inside_changed_pixels:inside,
  source_dimensions:{width:w,height:a.naturalHeight},rectangles,verified:outside===0&&inside>0};
}
// Automatic text-only route: retain the original raster everywhere except
// source-grounded text rectangles on independently measured solid backgrounds.
export async function repairTextLocally(original,plan){
 if(!plan?.edits?.length||plan.edits.some(e=>e.background==='complex'))return null;
 const a=await decodeImage(original),{c,ctx}=canvas(a.naturalWidth,a.naturalHeight);ctx.drawImage(a,0,0);
 const rectangles=[];
 for(const edit of plan.edits){
  const b=edit.box,x=Math.floor(b.x*c.width),y=Math.floor(b.y*c.height),w=Math.ceil(b.width*c.width),h=Math.ceil(b.height*c.height);
  if(w<8||h<8||x+w>c.width||y+h>c.height)return null;
  const pixels=ctx.getImageData(x,y,w,h).data,bg=solidPerimeter(pixels,w,h);
  if(!bg)return null; // no erasing photographs, gradients or intersecting objects
  let left=w,top=h,right=0,bottom=0,ink=0,inkColor=null;
  for(let py=2;py<h-2;py++)for(let px=2;px<w-2;px++){
   const i=(py*w+px)*4,d=bg.reduce((n,v,k)=>n+Math.abs(v-pixels[i+k]),0);
   if(d<60)continue;
   ink++;left=Math.min(left,px);top=Math.min(top,py);right=Math.max(right,px);bottom=Math.max(bottom,py);
   if(!inkColor||d>inkColor.d)inkColor={d,rgb:[pixels[i],pixels[i+1],pixels[i+2]]};
  }
  if(ink<4||ink>w*h*.4||!inkColor)return null;
  ctx.fillStyle=`rgb(${bg.join(',')})`;ctx.fillRect(x,y,w,h);
  if(edit.replacement){
   let size=Math.floor((bottom-top+1)*1.25);const min=Math.max(9,Math.floor(c.width/200));
   do{ctx.font=`${size}px Arial, sans-serif`;if(ctx.measureText(edit.replacement).width<=w-6)break;size--;}while(size>=min);
   if(size<min||size>h-4)return null;
   ctx.fillStyle=`rgb(${inkColor.rgb.join(',')})`;ctx.textBaseline='middle';
   ctx.fillText(edit.replacement,x+3,y+h/2);
  }
  rectangles.push({x,y,width:w,height:h});
 }
 const image=c.toDataURL('image/png'),proof=await verifyLocalPixels(original,image,rectangles);
 if(!proof.verified)return null;
 return {image,method:'source_pixels_with_deterministic_text',local_plan:plan,pixel_proof:proof};
}
export async function compositePlannedRegions(original,candidate,plan){
 const [a,b]=await Promise.all([decodeImage(original),decodeImage(candidate)]);
 if(Math.abs((a.naturalWidth/a.naturalHeight)/(b.naturalWidth/b.naturalHeight)-1)>.01)throw Error('Localized repair changed canvas geometry; candidate blocked.');
 const {c,ctx}=canvas(a.naturalWidth,a.naturalHeight);ctx.drawImage(a,0,0);const rectangles=[];
 for(const edit of plan.edits){
  const r=edit.box,x=Math.floor(r.x*c.width),y=Math.floor(r.y*c.height),w=Math.min(c.width-x,Math.ceil(r.width*c.width)),h=Math.min(c.height-y,Math.ceil(r.height*c.height));
  ctx.drawImage(b,x/c.width*b.naturalWidth,y/c.height*b.naturalHeight,w/c.width*b.naturalWidth,h/c.height*b.naturalHeight,x,y,w,h);
  rectangles.push({x,y,width:w,height:h});
 }
 const image=c.toDataURL('image/png'),proof=await verifyLocalPixels(original,image,rectangles);
 if(!proof.verified)throw Error('Localized candidate did not produce a measurable source-bound correction.');
 return {image,method:'generated_text_regions_composited_into_original',local_plan:plan,pixel_proof:proof};
}
// Seamless extension is permitted only for a measured flat source background.
// Every original pixel remains inside the composition with uniform scaling.
// This does not synthesize native detail or authorize an unsafe creative.
export async function extendFlatBackground(data,target){
 const img=await decodeImage(data),src=canvas(img.naturalWidth,img.naturalHeight);src.ctx.drawImage(img,0,0);
 const bg=solidPerimeter(src.ctx.getImageData(0,0,src.c.width,src.c.height).data,src.c.width,src.c.height);
 if(!bg)return null;
 const ratio=target.width/target.height,sw=img.naturalWidth,sh=img.naturalHeight;
 const w=sw/sh<ratio?Math.ceil(sh*ratio):sw,h=sw/sh<ratio?sh:Math.ceil(sw/ratio);
 if(w>8192||h>8192||w*h>32e6)return null;
 const {c,ctx}=canvas(w,h);ctx.fillStyle=`rgb(${bg.join(',')})`;ctx.fillRect(0,0,w,h);
 const x=Math.floor((w-sw)/2),y=Math.floor((h-sh)/2);ctx.drawImage(img,x,y);
 const image=c.toDataURL('image/png'),decoded=await decodeImage(image),check=canvas(w,h);check.ctx.drawImage(decoded,0,0);
 const source=src.ctx.getImageData(0,0,sw,sh).data,preserved=check.ctx.getImageData(x,y,sw,sh).data;
 if(!source.every((v,i)=>v===preserved[i]))return null;
 return {image,method:'measured_solid_background_extension',
  source_rect:{x,y,width:sw,height:sh},native_dimensions:{width:w,height:h},background_rgb:bg,
  source_pixels_preserved:true,detail_added_by_ai:false};
}
// Muse supplies surrounding scene pixels only. Restore the complete reference
// into that scene so reframing cannot redraw any source product/copy/logo.
export async function compositeReferenceFrame(original,background){
 const [a,b]=await Promise.all([decodeImage(original),decodeImage(background)]);
 const scale=Math.min(1,b.naturalWidth/a.naturalWidth,b.naturalHeight/a.naturalHeight);
 const w=Math.max(1,Math.round(a.naturalWidth*scale)),h=Math.max(1,Math.round(a.naturalHeight*scale));
 const x=Math.floor((b.naturalWidth-w)/2),y=Math.floor((b.naturalHeight-h)/2);
 const ref=canvas(w,h);ref.ctx.drawImage(a,0,0,w,h);
 const {c,ctx}=canvas(b.naturalWidth,b.naturalHeight);ctx.drawImage(b,0,0);ctx.drawImage(ref.c,x,y);
 const expected=ref.ctx.getImageData(0,0,w,h).data,actual=ctx.getImageData(x,y,w,h).data;
 if(!expected.every((v,i)=>v===actual[i]))throw Error('Format reference pixel restoration failed.');
 const data=ctx.getImageData(0,0,c.width,c.height).data;let delta=0,n=0;
 const pair=(ax,ay,bx,by)=>{if(bx<0||by<0||bx>=c.width||by>=c.height)return;for(let k=0;k<3;k++)delta+=Math.abs(data[(ay*c.width+ax)*4+k]-data[(by*c.width+bx)*4+k])/765;n++;};
 for(let i=0;i<w;i++){pair(x+i,y,x+i,y-1);pair(x+i,y+h-1,x+i,y+h);}
 for(let j=0;j<h;j++){pair(x,y+j,x-1,y+j);pair(x+w-1,y+j,x+w,y+j);}
 const seam=n?delta/n:0;
 if(seam>.18)throw Error('Extended scene has a measurable boundary discontinuity; format candidate blocked.');
 return {image:c.toDataURL('image/png'),method:'source_reference_restored_over_generated_surroundings',source_pixels_preserved:true,
  source_rect:{x,y,width:w,height:h},reference_scale:scale,source_dimensions:{width:a.naturalWidth,height:a.naturalHeight},
  native_dimensions:{width:c.width,height:c.height},seam_mean_delta:seam,source_upscaled:false,detail_added_by_ai:false};
}
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
