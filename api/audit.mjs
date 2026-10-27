import { createHandler, VERCEL_MAX_BODY } from '../server.mjs';

// Vercel Hobby serverless handler for POST /api/audit. Reuses the
// project's existing Node handler (same validation, demo gate, and Meta
// Muse Spark integration) with the platform's 4.5 MB payload budget.
// Secrets stay in server environment variables; nothing is exposed to
// the browser.
const handler = createHandler({ maxBody: VERCEL_MAX_BODY });

export default function vercelAudit(req, res) {
  req.url = '/api/audit';
  return handler(req, res);
}
