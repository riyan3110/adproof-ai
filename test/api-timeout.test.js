import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// public/app.js runs in the browser (top-level document access), so Node cannot
// import/execute it directly. This regression test asserts the source carries
// the per-request AbortController timeout contract instead.
const BASE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = readFileSync(path.join(BASE, 'public', 'app.js'), 'utf8');

test('api() uses AbortController with signal and per-endpoint timeout', () => {
  assert.match(src, /AbortController/, 'missing AbortController');
  assert.match(src, /signal:\s*controller\.signal/, 'fetch must pass AbortSignal');
  assert.match(src, /clearTimeout\(timer\)/, 'timer must be cleared');
});

test('frontend deadlines exceed backend limits (70s audit, 110s improve)', () => {
  assert.match(src, /\/api\/improve/, 'must branch timeout for /api/improve');
  const numbers = [...src.matchAll(/\b(\d{5,6})\b/g)].map((m) => Number(m[1]));
  assert.ok(numbers.some((n) => n >= 75000), `no audit timeout >= 75000ms found: ${numbers}`);
  assert.ok(numbers.some((n) => n >= 120000), `no improve timeout >= 120000ms found: ${numbers}`);
});

test('timeout throws short Bahasa Indonesia retry message', () => {
  assert.match(src, /AbortError/, 'must handle AbortError');
  assert.match(src, /kedaluwarsa/i, 'timeout message must mention expiry in Indonesian');
  assert.match(src, /coba lagi/i, 'timeout message must suggest retry');
});
