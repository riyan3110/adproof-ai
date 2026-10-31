import {createHandler, VERCEL_MAX_BODY} from '../server.mjs';

// Meta Spark-only text localization. Shares the audit's access code,
// rate-limit and request-size validation, without exposing API credentials.
const handler=createHandler({maxBody:VERCEL_MAX_BODY});
export default function vercelLocalize(req,res){
 req.url='/api/localize';
 return handler(req,res);
}
