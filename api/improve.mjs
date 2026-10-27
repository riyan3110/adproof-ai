import { createHandler, VERCEL_MAX_BODY } from '../server.mjs';

// Vercel Hobby serverless handler for POST /api/improve. Reuses the
// project's existing Node handler (same validation, demo gate, and Meta
// Muse Image integration) with the platform's 4.5 MB payload budget.
// Oversized Muse Image output becomes a clear 502 error, never a
// truncated image or fake result. Secrets stay in server environment
// variables; nothing is exposed to the browser.
const handler = createHandler({ maxBody: VERCEL_MAX_BODY });

export default function vercelImprove(req, res) {
  req.url = '/api/improve';
  return handler(req, res);
}
