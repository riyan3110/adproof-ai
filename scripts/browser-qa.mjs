// Explicit isolated QA server: NEVER imported by production or Vercel handlers.
// Start via `node scripts/browser-qa.mjs --port 4173`.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHandler} from '../server.mjs';
import {LOCKS} from '../public/visual-consistency.js';
const png=(await readFile(new URL('../tests/fixtures/qa-after.png',import.meta.url))).toString('base64');
const inventory=lines=>({lines,coverage:'complete',limitations:'MOCK FIXTURE — not real OCR'});
const handler=createHandler({key:'mock-qa-only',requireDemoGate:false,fetcher:async(url,opts)=>{
 const body=JSON.parse(opts.body);
 if(url.endsWith('images/edits'))return Response.json({model:'MOCK IMAGE',data:[{b64_json:png}]});
 const compare=body.messages[1].content.length===3;
 const audit={score:compare?72:42,headline:'MOCK QA — not a real Meta result',summary:'Synthetic fixture only',recommended_caption:'Lamp uses 5 W',issues:compare?[]:[{id:'1',title:'Unsupported savings',category:'Claim',severity:'high',evidence:'Creative says 90% savings',suggestion:'Remove unsupported savings'}],strengths:[],checks:{claim:50,clarity:80,hierarchy:80,action:70},claim_ledger:[],text_inventory:inventory(compare?['Lamp','Energy-efficient LED']:['Lamp','90% savings']),consistency:compare?{original_text:inventory(['Lamp','90% savings']),revised_text:inventory(['Lamp','Energy-efficient LED']),changed_text:[{before:'90% savings',after:'Energy-efficient LED',evidence:'Mock changed line'}],new_claims:[{text:'Energy-efficient LED',assessment:'unsupported',fact_quote:'',evidence:'Not supplied'}],visual:Object.fromEntries(Object.keys(LOCKS).map(k=>[k,{status:'unable_to_verify',evidence:'MOCK comparison'}]))}:null};
 return Response.json({model:'MOCK SPARK',choices:[{message:{content:JSON.stringify(audit)}}]});
}});
const port=Number(process.argv[process.argv.indexOf('--port')+1])||4173;
http.createServer(async(req,res)=>{
 if(req.url==='/browser-checks.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(await readFile(new URL('./browser-checks.js',import.meta.url)));return;}
 if(req.url==='/qa'){res.writeHead(200,{'content-type':'text/html'});res.end(`<h1>AdProof isolated MOCK QA</h1><p>No model calls. Frame size tests only.</p><button id="runChecks">Run browser pixel checks</button><pre id="browserChecks"></pre><script type="module" src="/browser-checks.js"></script><label>Viewport width <select id="width"><option>320</option><option>390</option><option>768</option><option>1280</option><option selected>1440</option><option>1920</option></select></label><iframe id="studio" title="QA Studio" src="/app" style="width:1440px;height:1500px;display:block"></iframe><script>document.querySelector('#width').onchange=e=>document.querySelector('#studio').style.width=e.target.value+'px';</script>`);return;}
 const setHeader=res.setHeader.bind(res);res.setHeader=(k,v)=>{if(k.toLowerCase()==='x-frame-options')return res;if(k.toLowerCase()==='content-security-policy')v=v.replace("frame-ancestors 'none'","frame-ancestors 'self'");return setHeader(k,v);};
 return handler(req,res);
}).listen(port,'0.0.0.0',()=>console.log('MOCK QA ready on '+port));
