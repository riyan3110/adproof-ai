import {createHandler, VERCEL_MAX_BODY} from '../server.mjs';

// Non-billable check of the private demo access code.
// This route never requests a Meta model or returns any secret.
const handler=createHandler({maxBody:VERCEL_MAX_BODY});

export default function vercelAccess(req,res) {
  req.url='/api/access';
  return handler(req,res);
}
