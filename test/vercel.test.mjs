import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import { createHandler, VERCEL_MAX_BODY } from '../server.mjs';
import health from '../api/health.mjs';
import auditRoute from '../api/audit.mjs';
import improveRoute from '../api/improve.mjs';
import accessRoute from '../api/access.mjs';

// All external Meta calls are mocked; no paid live calls in tests.
let ipCounter = 0;
const tinyImage = 'data:image/png;base64,' + 'A'.repeat(100);
const validBody = () => ({
  image: tinyImage,
  product: 'Aurora Lamp',
  facts: 'Bahan plastik, harga 99 ribu.',
  caption: ''
});

function mockRes() {
  return {
    status: null, payload: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    writeHead(status, headers) { this.status = status; Object.assign(this.headers, headers); },
    end(body) { try { this.payload = JSON.parse(body); } catch { this.payload = body; } }
  };
}
function getReq(url) {
  return { method: 'GET', url, headers: {}, socket: { remoteAddress: `127.0.0.${++ipCounter}` } };
}
function postReq(url, body, headers = {}) {
  // Pre-parsed body, as supplied by Vercel serverless functions.
  return { method: 'POST', url, headers, socket: { remoteAddress: `10.0.0.${++ipCounter}` }, body };
}
function metaOk(json) {
  return { ok: true, statusText: 'OK', text: async () => JSON.stringify(json) };
}
const validAudit = {
  score: 80, headline: 'Baik', summary: 'Ringkasan.',
  recommended_caption: 'Caption.',
  issues: [], strengths: ['Jelas'],
  checks: { claim: 80, clarity: 80, hierarchy: 80, action: 80 }
};

test('serverless health export answers 200 without secrets', async () => {
  const res = mockRes();
  await health(getReq('/api/health'), res);
  assert.equal(res.status, 200);
  assert.equal(res.payload.ok, true);
});

test('serverless api exports delegate to the shared handler', async () => {
  for (const route of [auditRoute, improveRoute, accessRoute]) {
    const res = mockRes();
    await route(getReq('/whatever'), res); // forced to its POST-only path
    assert.equal(res.status, 404);
  }
});

test('audit without MODEL_API_KEY fails closed (503) and never calls Meta', async () => {
  let calls = 0;
  const handler = createHandler({ key: '', demoCode: '', fetcher: () => { calls++; throw new Error('must not call'); } });
  const res = mockRes();
  await handler(postReq('/api/audit', validBody()), res);
  assert.equal(res.status, 503);
  assert.equal(calls, 0);
  assert.match(res.payload.error, /belum dikonfigurasi/);
});

test('demo gate rejects missing/wrong codes before paid calls, accepts correct code', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return metaOk({ choices: [{ message: { content: JSON.stringify(validAudit) } }] }); };
  const handler = createHandler({ key: 'k', demoCode: 's3cret', fetcher });
  const missing = mockRes();
  await handler(postReq('/api/audit', validBody()), missing);
  assert.equal(missing.status, 401);
  const wrong = mockRes();
  await handler(postReq('/api/audit', validBody(), { 'x-demo-code': 'nope' }), wrong);
  assert.equal(wrong.status, 403);
  assert.equal(calls, 0);
  const ok = mockRes();
  await handler(postReq('/api/audit', validBody(), { 'x-demo-code': 's3cret' }), ok);
  assert.equal(ok.status, 200);
  assert.equal(ok.payload.audit.score, 80);
  assert.equal(calls, 1);
});

test('oversized request rejected with 413 in serverless mode', async () => {
  const handler = createHandler({ key: 'k', maxBody: VERCEL_MAX_BODY, fetcher: () => { throw new Error('must not call'); } });
  const big = { ...validBody(), image: 'data:image/png;base64,' + 'A'.repeat(VERCEL_MAX_BODY) };
  const res = mockRes();
  await handler(postReq('/api/audit', big), res);
  assert.equal(res.status, 413);
  assert.match(res.payload.error, /Vercel/);
});

test('audit success via mocked Meta call (serverless budget)', async () => {
  const fetcher = async () => metaOk({ choices: [{ message: { content: JSON.stringify(validAudit) } }], usage: { total_tokens: 5 } });
  const handler = createHandler({ key: 'k', maxBody: VERCEL_MAX_BODY, fetcher });
  const res = mockRes();
  await handler(postReq('/api/audit', validBody()), res);
  assert.equal(res.status, 200);
  assert.equal(res.payload.audit.score, 80);
});

test('improve rejects oversized Muse Image output with actionable error, never truncated/fake', async () => {
  const fetcher = async () => metaOk({ data: [{ b64_json: 'A'.repeat(5_000_000) }] });
  const handler = createHandler({ key: 'k', maxBody: VERCEL_MAX_BODY, fetcher });
  const body = { ...validBody(), issues: [{ title: 't', suggestion: 's' }] };
  const res = mockRes();
  await handler(postReq('/api/improve', body), res);
  assert.equal(res.status, 502);
  assert.match(res.payload.error, /Vercel 4,5 MB/);
  assert.equal(res.payload.image, undefined);
});

test('improve returns small image intact', async () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]).toString('base64');
  const fetcher = async () => metaOk({ data: [{ b64_json: png }] });
  const handler = createHandler({ key: 'k', maxBody: VERCEL_MAX_BODY, fetcher });
  const body = { ...validBody(), issues: [{ title: 't', suggestion: 's' }] };
  const res = mockRes();
  await handler(postReq('/api/improve', body), res);
  assert.equal(res.status, 200);
  assert.ok(res.payload.image.startsWith('data:image/png;base64,'));
});

test('unknown path returns 404', async () => {
  const handler = createHandler({ key: '', demoCode: '' });
  const res = mockRes();
  await handler(getReq('/nope'), res);
  assert.equal(res.status, 404);
});

test('static Vercel pages receive production CSP and non-sniffing security headers', () => {
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 const rules=config.headers?.find(x=>x.source==='/(.*)')?.headers||[];
 const headers=Object.fromEntries(rules.map(x=>[x.key.toLowerCase(),x.value]));
 assert.equal(headers['x-content-type-options'],'nosniff');
 assert.equal(headers['referrer-policy'],'no-referrer');
 assert.equal(headers['x-frame-options'],'DENY');
 assert.match(headers['content-security-policy'],/script-src 'self'/);
 assert.match(headers['content-security-policy'],/connect-src 'self'/);
 assert.match(headers['content-security-policy'],/frame-ancestors 'none'/);
 assert.doesNotMatch(headers['content-security-policy'],/unsafe-inline|unsafe-eval|https:\/\//);
});

test('serverless access validation shares demo protection but never performs paid inference',async()=>{
 const response=mockRes();
 await accessRoute(postReq('/not-the-access-path',{},{}),response);
 assert.ok([401,503].includes(response.status),'serverless route must remain private or closed');
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.ok(config.functions['api/access.mjs']);
 assert.ok(config.functions['api/access.mjs'].maxDuration<=10);
});
