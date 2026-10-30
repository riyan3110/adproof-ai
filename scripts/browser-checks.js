import {compositeRegion,renderOutput,dimensions,comparePixels} from '/output-system.js';
const output=document.querySelector('#browserChecks');
const check=(ok,message)=>{if(!ok)throw Error(message);};
const source=color=>{const c=document.createElement('canvas');c.width=100;c.height=100;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,100,100);return c.toDataURL('image/png');};
const decode=async data=>{const i=new Image();i.src=data;await i.decode();return i;};
document.querySelector('#runChecks').addEventListener('click',async()=>{
 const results=[];output.textContent='Running isolated browser pixel checks…';
 try{
  const original=source('#244a30'),candidate=source('#d03020');
  const result=await compositeRegion(original,candidate,{x:.25,y:.25,width:.5,height:.5});
  const c=document.createElement('canvas');c.width=c.height=100;const ctx=c.getContext('2d');ctx.drawImage(await decode(result.image),0,0);const bytes=ctx.getImageData(0,0,100,100).data;
  for(let y=0;y<100;y++)for(let x=0;x<100;x++){const p=(y*100+x)*4,inside=x>=25&&x<75&&y>=25&&y<75;check(bytes[p]===(inside?208:36)&&bytes[p+1]===(inside?48:74),'composite pixel mismatch');}
  results.push('PASS — 7,500 outside-region pixels retained exactly; 2,500 inside pixels replaced.');
  for(const category of ['social','website'])for(const preset of [0,1,2]){const out=await renderOutput(original,{category,preset},{allowInterpolation:true});const size=out.metadata.actual;check(size.width===out.metadata.width&&size.height===out.metadata.height,'dimensions mismatch');results.push('PASS — '+category+' '+size.width+'×'+size.height+' actual decoded PNG.');}
  let rejected=false;try{await renderOutput(original,{category:'social'});}catch{rejected=true;}check(rejected,'upscale consent missing');results.push('PASS — interpolation requires consent.');
  const print=await renderOutput(original,{category:'print',width:100,height:50,unit:'cm',ppi:150},{allowInterpolation:true});const b=new Uint8Array(await print.blob.arrayBuffer());const text=new TextDecoder('latin1').decode(b);check(text.indexOf('pHYs')<text.indexOf('IDAT'),'density chunk order');check(print.metadata.actual.width===5906&&print.metadata.actual.height===2953,'print dimensions');results.push('PASS — 5906×2953 print PNG with pHYs before IDAT.');
  const m=await comparePixels(original,candidate);check(m.mean_color_delta>.08,'color change missing');results.push('PASS — coarse color change measured.');
  try{await dimensions('data:image/png;base64,bm90YW5pbWFnZQ==');throw Error('invalid image accepted');}catch(e){check(e.message!=='invalid image accepted',e.message);}results.push('PASS — corrupt image decode rejected.');
  output.textContent=results.join('\n');
 }catch(e){output.textContent=results.join('\n')+'\nFAIL — '+e.message;}
});
