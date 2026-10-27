import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, QUOTA_EVAL_SCRIPT } from '../server.mjs';

const CODE = 'judge-secret-code';
const OFF = { anonEnabled: false, restUrl: '', restToken: '', perUserDaily: 3, globalDaily: 50 };
const validBody = {
  image: 'data:image/png;base64,' + 'A'.repeat(100),
  product: 'Aurora Lamp',
  facts: 'Steel body, 30cm tall, warm light, 2-year warranty.',
  caption: '',
};
const validAudit = {
  score: 82, headline: 'Solid creative', summary: 'Minor claim issues.',
  recommended_caption: 'Steel lamp, warm light.',
  issues: [{ id: 'x', title: 'Unverified claim', category: 'Claim', severity: 'medium', evidence: 'says best', suggestion: 'Soften claim.' }],
  strengths: ['Clear layout'], checks: { claim: 70, clarity: 90, hierarchy: 85, action: 80 },
};

function call(handler, { method = 'GET', url = '/', headers = {}, body = undefined, ip = '10.0.0.9' } = {}) {
  return new Promise((resolve, reject) => {
    const req = { method, url, headers, socket: { remoteAddress: ip }, body };
    const res = {
      setHeader() {},
      writeHead(status) { this.status = status; },
      end(payload) {
        try { resolve({ status: this.status, json: JSON.parse(String(payload)) }); }
        catch (e) { reject(e); }
      },
    };
    handler(req, res).catch(reject);
  });
}

function metaFetcherFactory(order, { audit = validAudit } = {}) {
  const calls = { meta: 0, quota: 0 };
  const fetcher = async (url) => {
    if (String(url).startsWith('https://kv.example.com')) {
      calls.quota++;
      order?.push('quota');
      return { ok: true, json: async () => ({ result: [1, 1, 1] }) };
    }
    calls.meta++;
    order?.push('meta');
    return {
      ok: true, status: 200, statusText: 'OK',
      text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(audit) } }], usage: { total_tokens: 11 } }),
      headers: { get: () => null }, arrayBuffer: async () => new ArrayBuffer(0),
    };
  };
  return { fetcher, calls };
}

test('public pages stay open without a code', async () => {
  const h = createHandler({ demoCode: CODE, key: 'k', quotaConfig: OFF });
  for (const url of ['/', '/demo', '/docs', '/app']) {
    const r = await call(h, { url });
    assert.equal(r.status, 200, url);
  }
});

test('gated audit without code returns 401 and never calls Meta', async () => {
  const { fetcher, calls } = metaFetcherFactory();
  const h = createHandler({ demoCode: CODE, key: 'k', fetcher, quotaConfig: OFF });
  const r = await call(h, { method: 'POST', url: '/api/audit', body: validBody });
  assert.equal(r.status, 401);
  assert.equal(calls.meta, 0);
});

test('wrong code returns 403 and never calls Meta', async () => {
  const { fetcher, calls } = metaFetcherFactory();
  const h = createHandler({ demoCode: CODE, key: 'k', fetcher, quotaConfig: OFF });
  const r = await call(h, { method: 'POST', url: '/api/audit', headers: { 'x-demo-code': 'nope' }, body: validBody });
  assert.equal(r.status, 403);
  assert.equal(calls.meta, 0);
});

test('correct code reaches Meta', async () => {
  const { fetcher, calls } = metaFetcherFactory();
  const h = createHandler({ demoCode: CODE, key: 'k', fetcher, quotaConfig: OFF });
  const r = await call(h, { method: 'POST', url: '/api/audit', headers: { 'x-demo-code': CODE }, body: validBody });
  assert.equal(r.status, 200);
  assert.equal(r.json.audit.score, 82);
  assert.equal(calls.meta, 1);
});

test('anonymous audits fail closed (503) when enabled but no durable limiter is configured', async () => {
  const { fetcher, calls } = metaFetcherFactory();
  const h = createHandler({
    demoCode: CODE, key: 'k', fetcher,
    quotaConfig: { ...OFF, anonEnabled: true },
  });
  const r = await call(h, { method: 'POST', url: '/api/audit', body: validBody });
  assert.equal(r.status, 503);
  assert.equal(calls.meta, 0);
});

test('denied quota returns 429 before any Meta call', async () => {
  const { fetcher, calls } = metaFetcherFactory();
  let quotaCalls = 0;
  const h = createHandler({
    demoCode: CODE, key: 'k', fetcher,
    quotaConfig: { ...OFF, anonEnabled: true },
    quotaCheck: async () => { quotaCalls++; return { allowed: false }; },
  });
  const r = await call(h, { method: 'POST', url: '/api/audit', body: validBody });
  assert.equal(r.status, 429);
  assert.equal(quotaCalls, 1);
  assert.equal(calls.meta, 0);
});

test('allowed quota is enforced before the Meta call', async () => {
  const order = [];
  const { fetcher, calls } = metaFetcherFactory(order);
  const h = createHandler({
    demoCode: CODE, key: 'k', fetcher,
    quotaConfig: { ...OFF, anonEnabled: true },
    quotaCheck: async () => { order.push('quota'); return { allowed: true }; },
  });
  const r = await call(h, { method: 'POST', url: '/api/audit', body: validBody });
  assert.equal(r.status, 200);
  assert.deepEqual(order, ['quota', 'meta']);
  assert.equal(calls.meta, 1);
});

test('anonymous path is audit-only: improve stays code-protected', async () => {
  const { fetcher, calls } = metaFetcherFactory();
  const h = createHandler({
    demoCode: CODE, key: 'k', fetcher,
    quotaConfig: { ...OFF, anonEnabled: true },
    quotaCheck: async () => ({ allowed: true }),
  });
  const r = await call(h, { method: 'POST', url: '/api/improve', body: { ...validBody, issues: [] } });
  assert.equal(r.status, 403);
  assert.equal(calls.meta, 0);
});

test('invalid anonymous input is rejected without consuming quota or Meta calls', async () => {
  const { fetcher, calls } = metaFetcherFactory();
  let quotaCalls = 0;
  const h = createHandler({
    demoCode: CODE, key: 'k', fetcher,
    quotaConfig: { ...OFF, anonEnabled: true },
    quotaCheck: async () => { quotaCalls++; return { allowed: true }; },
  });
  const r = await call(h, { method: 'POST', url: '/api/audit', body: { ...validBody, image: 'bad' } });
  assert.equal(r.status, 400);
  assert.equal(quotaCalls, 0);
  assert.equal(calls.meta, 0);
});

test('default durable limiter uses a single atomic EVAL before Meta (consistency)', async () => {
  const seen = [];
  const fetcher = async (url) => {
    seen.push(String(url));
    if (String(url).startsWith('https://kv.example.com')) {
      assert.match(String(url), /\/eval\//);
      assert.ok(String(url).includes(encodeURIComponent(QUOTA_EVAL_SCRIPT).slice(0, 40)));
      return { ok: true, json: async () => ({ result: [2, 1, 1] }) };
    }
    return {
      ok: true, status: 200, statusText: 'OK',
      text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify(validAudit) } }] }),
      headers: { get: () => null }, arrayBuffer: async () => new ArrayBuffer(0),
    };
  };
  const h = createHandler({
    demoCode: CODE, key: 'k', fetcher,
    quotaConfig: { ...OFF, anonEnabled: true, restUrl: 'https://kv.example.com', restToken: 'kv-token' },
  });
  const r = await call(h, { method: 'POST', url: '/api/audit', body: validBody });
  assert.equal(r.status, 200);
  const quotaIdx = seen.findIndex((u) => u.startsWith('https://kv.example.com'));
  const metaIdx = seen.findIndex((u) => u.includes('api.meta.ai'));
  assert.equal(seen.filter((u) => u.startsWith('https://kv.example.com')).length, 1);
  assert.ok(quotaIdx !== -1 && metaIdx !== -1 && quotaIdx < metaIdx);
});

test('limiter outage fails closed: quota errors deny before Meta', async () => {
  const { fetcher, calls } = metaFetcherFactory();
  const h = createHandler({
    demoCode: CODE, key: 'k', fetcher,
    quotaConfig: { ...OFF, anonEnabled: true },
    quotaCheck: async () => { throw new Error('kv down'); },
  });
  const r = await call(h, { method: 'POST', url: '/api/audit', body: validBody });
  assert.equal(r.status, 503);
  assert.equal(calls.meta, 0);
});

test('demo-status exposes capability flags without secrets', async () => {
  const h = createHandler({ demoCode: CODE, key: 'k', quotaConfig: { ...OFF, anonEnabled: true } });
  const r = await call(h, { url: '/api/demo-status' });
  assert.equal(r.status, 200);
  assert.equal(r.json.demoGate, true);
  assert.equal(r.json.anonAudit.scope, 'audit-only');
  assert.ok(!JSON.stringify(r.json).includes(CODE));
});
