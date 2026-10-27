import { createHandler, VERCEL_MAX_BODY } from '../server.mjs';

// Vercel Hobby serverless handler for GET /api/health. Reuses the
// project's existing Node handler (same demo gate, validation, and Meta
// API logic) with the platform's 4.5 MB payload budget. Secrets stay in
// server environment variables; nothing is exposed to the browser.
const handler = createHandler({ maxBody: VERCEL_MAX_BODY });

export default function vercelHealth(req, res) {
  req.url = '/api/health';
  return handler(req, res);
}
