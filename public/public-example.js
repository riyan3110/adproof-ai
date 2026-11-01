import {openAuditFile} from './audit-archive.js';

// Fixed, same-origin recorded example. No access code, provider call or
// automatic approval: the normal archive parser keeps it read-only.
export async function loadRecordedExample(fetcher=fetch){
 const response=await fetcher('/examples/aruna-verified.zip',{credentials:'omit'});
 if(!response.ok)throw Error('Recorded example unavailable. Please retry later.');
 const limit=2*1024*1024;
 if(Number(response.headers.get('content-length'))>limit)throw Error('Recorded example exceeds its size limit.');
 const bytes=await response.arrayBuffer();
 if(bytes.byteLength>limit)throw Error('Recorded example exceeds its size limit.');
 const archive=await openAuditFile(new File([bytes],'aruna-verified.zip',{type:'application/zip'}));
 if(!archive.original||!archive.revised||!archive.report.verified)throw Error('Recorded example is incomplete.');
 return archive;
}
