import {LOCKS} from './public/visual-consistency.js';
const text={type:'string'};
const object=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
export const inventorySchema=object({lines:{type:'array',maxItems:128,items:text},coverage:{type:'string',enum:['complete','partial','unreadable']},limitations:text});
export const inspectionSchema=object({
 original_text:inventorySchema,revised_text:inventorySchema,
 changed_text:{type:'array',maxItems:128,items:object({before:text,after:text,evidence:text})},
 new_claims:{type:'array',maxItems:128,items:object({text,assessment:{type:'string',enum:['supported','unsupported','uncertain']},fact_quote:text,evidence:text})},
 visual:object(Object.fromEntries(Object.keys(LOCKS).map(k=>[k,object({status:{type:'string',enum:['preserved','possible_change','changed','unable_to_verify']},evidence:text})])))
});
export const inspectionPrompt=`SEPARATE TEXT INVENTORY: transcribe ALL readable text in IMAGE 1 in reading order, including tiny labels, logos, footnotes and non-headline copy, into text_inventory.lines (up to 128 lines, NOT the eight-claim ledger). Never paraphrase or translate these lines. Report partial coverage if any text is unclear, cropped, too small or beyond the 128-line bound; describe limitations. Complete means only your own extraction estimate, never guaranteed OCR completeness. If comparing, independently transcribe IMAGE 2 into consistency.original_text and IMAGE 1 into consistency.revised_text. Report observed changed_text pairs with evidence. In new_claims examine EVERY newly added or changed line, including plausible-sounding claims such as "Energy-efficient LED"; label unsupported when supplied facts do not support the meaning. A related fact quote alone does not establish support (LED does not prove energy efficiency). Include exact relevant fact_quote only if supported. For each visual property describe observed regions and compare colors, lighting, shadows/reflections, background, product shape/parts, perspective/composition, typography and branding. Use unable_to_verify for small/unclear details. A style preference, better score, or a missing ledger entry is not proof of preservation. For an initial audit consistency must be null.`;
// Header inspection is a preliminary byte/dimension check, not full decoding.
// Browser decode is also mandatory before display/compositing/export.
export function imageDimensions(bytes){
 const b=Buffer.from(bytes);let width,height;
 if(b.length>=33&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&b.toString('ascii',12,16)==='IHDR'){
  width=b.readUInt32BE(16);height=b.readUInt32BE(20);
 }else if(b.length>=30&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'){
  const kind=b.toString('ascii',12,16);
  if(kind==='VP8X'){width=1+b.readUIntLE(24,3);height=1+b.readUIntLE(27,3);}
  else if(kind==='VP8L'&&b[20]===0x2f){const bits=b.readUInt32LE(21);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;}
  else if(kind==='VP8 '&&b[23]===0x9d&&b[24]===0x01&&b[25]===0x2a){width=b.readUInt16LE(26)&0x3fff;height=b.readUInt16LE(28)&0x3fff;}
 }else if(b.length>4&&b[0]===255&&b[1]===216){
  let p=2;
  while(p+4<=b.length){
   if(b[p]!==255)break;let marker=b[p+1];p+=2;
   while(marker===255&&p<b.length){marker=b[p];p+=1;}
   if(marker===0xd9||marker===0xda)break;
   const len=b.readUInt16BE(p);if(len<2||p+len>b.length)break;
   if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&len>=7){height=b.readUInt16BE(p+3);width=b.readUInt16BE(p+5);break;}
   p+=len;
  }
 }
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>16384||height>16384||width*height>64e6)return null;
 return {width,height};
}
