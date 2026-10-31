// Pixel-derived geometry complements Spark's semantic diagnosis. OCR never
// authorizes a new claim, substring edit, or unobserved replacement.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const key=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}%]+/gu,' ').trim().replace(/\s+/g,' ');
export function ocrLines(data){
 return (data?.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]))
  .filter(l=>l.confidence>=55&&key(l.text)&&l.bbox).map(l=>({text:l.text.trim(),confidence:l.confidence,box:l.bbox}));
}
export function locateExactClaim(text,lines,width,height){
 const target=key(text),matches=[];
 const visit=(chain,joined)=>{
  if(joined===target){matches.push(chain);return;}
  if(chain.length>=6||!target.startsWith(joined+' '))return;
  const last=chain.at(-1).box;
  for(const next of lines){
   const r=next.box,overlap=Math.min(last.x1,r.x1)-Math.max(last.x0,r.x0);
   if(chain.includes(next)||r.y0<last.y1-3||r.y0-last.y1>height*.065||overlap<Math.min(last.x1-last.x0,r.x1-r.x0)*.4)continue;
   visit([...chain,next],joined+' '+key(next.text));
  }
 };
 for(const line of lines)if(target===key(line.text)||target.startsWith(key(line.text)+' '))visit([line],key(line.text));
 if(matches.length!==1)return null;
 const selected=matches[0],pad=Math.max(5,Math.round(width*.006));
 const x=Math.max(0,Math.min(...selected.map(l=>l.box.x0))-pad),y=Math.max(0,Math.min(...selected.map(l=>l.box.y0))-pad);
 const right=Math.min(width,Math.max(...selected.map(l=>l.box.x1))+pad),bottom=Math.min(height,Math.max(...selected.map(l=>l.box.y1))+pad);
 // Padding cannot erase another observed text line. Spurious OCR fragments
 // inside the selected glyphs are harmless; unrelated lines outside are not.
 for(const line of lines){if(selected.includes(line))continue;const b=line.box;
  if(b.x0<right&&b.x1>x&&b.y0<bottom&&b.y1>y&&line.confidence>=80)return null;
 }
 return {x:x/width,y:y/height,width:(right-x)/width,height:(bottom-y)/height};
}
export function refineOcrPlan(plan,data,width,height){
 if(!plan?.edits?.length)return null;
 const lines=ocrLines(data),edits=[];
 for(const edit of plan.edits){const box=locateExactClaim(edit.before,lines,width,height);if(!box)return null;edits.push({...edit,box});}
 return {...plan,edits};
}
export async function recognizeSource(image){
 const {createWorker}=await import('tesseract.js');
 const worker=await createWorker('eng',1,{langPath:require('@tesseract.js-data/eng').langPath,gzip:true,cachePath:'/tmp',cacheMethod:'readOnly'});
 try{await worker.setParameters({tessedit_pageseg_mode:'11'});return (await worker.recognize(Buffer.from(image.split(',')[1],'base64'),{},{blocks:true})).data;}
 finally{await worker.terminate();}
}
