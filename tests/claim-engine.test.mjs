import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeClaim,
  buildEvolution,
  buildConstellation,
  CLAIM_DNA_BASIS,
} from '../public/claim-engine.js';

// Fixtures only: no model calls, no network, no synthetic runtime data.
const BASIS = 'seller_supplied_facts_not_independently_verified';

const mkClaim = (over = {}) => ({
  id: 'claim-1',
  claim: 'Diskon 50% untuk semua sepatu',
  origin: 'creative',
  assessment: 'unsupported_by_supplied_facts',
  fact_quote: '',
  reason: 'No price fact supplied.',
  recommended_action: 'Remove the discount line.',
  ...over,
});

const mkAudit = (ledger, issues = []) => ({ claim_ledger: ledger, issues });

const BANNED = ['repaired', 'verified', 'verify', 'fixed', 'fix ', 'independent', 'certified', 'guarantee'];

function assertConservativeText(entries) {
  for (const e of entries) {
    const low = String(e.explanation).toLowerCase();
    for (const w of BANNED) assert.ok(!low.includes(w), `explanation leaks "${w}": ${e.explanation}`);
    assert.ok(!['repaired', 'verified', 'fixed'].includes(e.status), `banned status: ${e.status}`);
  }
}

describe('normalizeClaim', () => {
  it('lowercases, trims and collapses whitespace', () => {
    assert.equal(normalizeClaim('  Kopi   ARABIKA\nOrganik  '), 'kopi arabika organik');
  });

  it('preserves digits, punctuation and negation', () => {
    assert.equal(normalizeClaim('Tidak ada diskon 50%, gratis!'), 'tidak ada diskon 50%, gratis!');
    assert.equal(normalizeClaim("Don't miss $5 deals"), "don't miss $5 deals");
  });

  it('tolerates nullish input', () => {
    assert.equal(normalizeClaim(null), '');
    assert.equal(normalizeClaim(undefined), '');
  });
});

describe('buildEvolution exact matching', () => {
  it('matches exact text across reorder and ignores local ids', () => {
    const a = mkClaim({ id: 'claim-1', claim: 'Kopi arabika organik', assessment: 'supported_by_supplied_facts' });
    const b = mkClaim({ id: 'claim-2', claim: 'Gratis ongkir hari ini', assessment: 'supported_by_supplied_facts' });
    const r = buildEvolution(
      mkAudit([a, b]),
      mkAudit([
        mkClaim({ id: 'claim-1', claim: 'Gratis ongkir hari ini', assessment: 'supported_by_supplied_facts' }),
        mkClaim({ id: 'claim-2', claim: 'Kopi arabika organik', assessment: 'supported_by_supplied_facts' }),
      ]),
    );
    assert.equal(r.basis, BASIS);
    assert.equal(r.complete, true);
    assert.equal(r.entries.length, 2);
    assert.deepEqual(r.entries.map((e) => [e.before_index, e.after_index, e.match]), [[0, 1, 'exact'], [1, 0, 'exact']]);
    assertConservativeText(r.entries);
  });

  it('same local id with different text never matches', () => {
    const r = buildEvolution(
      mkAudit([mkClaim({ id: 'claim-1', claim: 'Kopi arabika organik' })]),
      mkAudit([mkClaim({ id: 'claim-1', claim: 'Sepatu lari tahan air' })]),
    );
    assert.deepEqual(r.entries.map((e) => e.status), ['not_redetected', 'newly_detected']);
  });

  it('maps later supported assessment to retained', () => {
    const r = buildEvolution(
      mkAudit([mkClaim({ claim: 'Kopi arabika', assessment: 'unsupported_by_supplied_facts' })]),
      mkAudit([mkClaim({ claim: 'Kopi arabika', assessment: 'supported_by_supplied_facts' })]),
    );
    assert.equal(r.entries[0].status, 'retained');
    assert.equal(r.entries[0].match, 'exact');
    assert.match(r.entries[0].explanation, /changed assessment alone/);
    assertConservativeText(r.entries);
  });

  it('maps unsupported/contradicted to still_problematic', () => {
    for (const assessment of ['unsupported_by_supplied_facts', 'contradicted_by_supplied_facts']) {
      const r = buildEvolution(mkAudit([mkClaim({ claim: 'X' })]), mkAudit([mkClaim({ claim: 'X', assessment })]));
      assert.equal(r.entries[0].status, 'still_problematic');
    }
  });

  it('maps unreadable/needs_human_review/unknown to uncertain', () => {
    for (const assessment of ['unreadable', 'needs_human_review', 'something_new', undefined]) {
      const r = buildEvolution(mkAudit([mkClaim({ claim: 'X' })]), mkAudit([mkClaim({ claim: 'X', assessment })]));
      assert.equal(r.entries[0].status, 'uncertain');
    }
  });

  it('duplicate exact claims are ambiguous, never auto-paired', () => {
    const r = buildEvolution(
      mkAudit([mkClaim({ claim: 'Promo beli 1 gratis 1' }), mkClaim({ claim: 'Promo beli 1 gratis 1' })]),
      mkAudit([mkClaim({ claim: 'Promo beli 1 gratis 1' })]),
    );
    assert.equal(r.entries.length, 3);
    assert.ok(r.entries.every((e) => e.status === 'ambiguous' && e.match === 'ambiguous'));
    assert.deepEqual(r.summary, { ambiguous: 3 });
  });

  it('different numbers never qualify as exact', () => {
    const r = buildEvolution(
      mkAudit([mkClaim({ claim: 'Diskon 50% untuk semua sepatu' })]),
      mkAudit([mkClaim({ claim: 'Diskon 70% untuk semua sepatu' })]),
    );
    assert.deepEqual(r.entries.map((e) => e.status), ['not_redetected', 'newly_detected']);
    assert.ok(r.entries.every((e) => e.match === 'none'));
  });

  it('negation/polarity change never qualifies as exact', () => {
    const r = buildEvolution(
      mkAudit([mkClaim({ claim: 'Mengandung vitamin C alami' })]),
      mkAudit([mkClaim({ claim: 'Tidak mengandung vitamin C alami' })]),
    );
    assert.deepEqual(r.entries.map((e) => e.status), ['not_redetected', 'newly_detected']);
  });

  it('different currencies never qualify as exact', () => {
    const r = buildEvolution(
      mkAudit([mkClaim({ claim: 'Only $5 today' })]),
      mkAudit([mkClaim({ claim: 'Only Rp5 today' })]),
    );
    assert.deepEqual(r.entries.map((e) => e.status), ['not_redetected', 'newly_detected']);
  });

  it('origin mismatch never matches, even with identical text', () => {
    const r = buildEvolution(
      mkAudit([mkClaim({ claim: 'Gratis ongkir', origin: 'creative' })]),
      mkAudit([mkClaim({ claim: 'Gratis ongkir', origin: 'caption' })]),
    );
    assert.deepEqual(r.entries.map((e) => e.status), ['not_redetected', 'newly_detected']);
  });

  it('absent claims are not_redetected, never settled language', () => {
    const r = buildEvolution(
      mkAudit([mkClaim({ claim: 'Klaim lama yang hilang' })]),
      mkAudit([mkClaim({ claim: 'Klaim baru yang beda total' })]),
    );
    const gone = r.entries.find((e) => e.before_index === 0);
    assert.equal(gone.status, 'not_redetected');
    assert.match(gone.explanation, /not evidence/);
    assertConservativeText(r.entries);
  });

  it('bounds input to 8 items per ledger', () => {
    const many = (t) => Array.from({ length: 9 }, (_, i) => mkClaim({ claim: `${t} item ${i} unique-word-${i}` }));
    const r = buildEvolution(mkAudit(many('before')), mkAudit(many('after')));
    const idx = r.entries.flatMap((e) => [e.before_index, e.after_index].filter((v) => v !== null));
    assert.ok(idx.every((v) => v <= 7));
    assert.ok(r.entries.length <= 16);
  });

  it('summary counts by status sum to entries length', () => {
    const r = buildEvolution(
      mkAudit([mkClaim({ claim: 'Same text' }), mkClaim({ claim: 'Old gone' })]),
      mkAudit([mkClaim({ claim: 'Same text' }), mkClaim({ claim: 'Brand new' })]),
    );
    const total = Object.values(r.summary).reduce((a, b) => a + b, 0);
    assert.equal(total, r.entries.length);
    assert.deepEqual(r.summary, { still_problematic: 1, not_redetected: 1, newly_detected: 1 });
  });
});

describe('buildEvolution candidates', () => {
  it('suggests changed_candidate only with same origin + reciprocal unique best', () => {
    const r = buildEvolution(
      mkAudit([mkClaim({ claim: 'Gratis ongkir untuk pembelian pertama' })]),
      mkAudit([mkClaim({ claim: 'Gratis ongkir untuk pembelian pertama kali' })]),
    );
    assert.equal(r.entries.length, 1);
    assert.equal(r.entries[0].status, 'changed_candidate');
    assert.equal(r.entries[0].match, 'candidate');
    assert.match(r.entries[0].explanation, /uncertain|human review/);
    assertConservativeText(r.entries);
  });

  it('reworded text with different origin is not a candidate', () => {
    const r = buildEvolution(
      mkAudit([mkClaim({ claim: 'Gratis ongkir untuk pembelian pertama', origin: 'creative' })]),
      mkAudit([mkClaim({ claim: 'Gratis ongkir untuk pembelian pertama kali', origin: 'caption' })]),
    );
    assert.deepEqual(r.entries.map((e) => e.status), ['not_redetected', 'newly_detected']);
  });

  it('tied best overlap produces no candidate', () => {
    const r = buildEvolution(
      mkAudit([mkClaim({ claim: 'a b c d' })]),
      mkAudit([mkClaim({ claim: 'a b c e' }), mkClaim({ claim: 'a b c f' })]),
    );
    assert.deepEqual(r.entries.map((e) => e.status), ['not_redetected', 'newly_detected', 'newly_detected']);
  });

  it('one-to-one: one shared best match pairs, the other stays unmatched', () => {
    const r = buildEvolution(
      mkAudit([
        mkClaim({ claim: 'sweet mango juice no added sugar' }),
        mkClaim({ claim: 'sweet mango juice with added vitamins' }),
      ]),
      mkAudit([mkClaim({ claim: 'sweet mango juice no added sugar free sample' })]),
    );
    const pair = r.entries.find((e) => e.match === 'candidate');
    assert.ok(pair);
    assert.equal(pair.before_index, 0);
    assert.equal(pair.after_index, 0);
    const rest = r.entries.filter((e) => e !== pair);
    assert.deepEqual(rest.map((e) => e.status), ['not_redetected']);
    const usedAfter = r.entries.filter((e) => e.after_index !== null).map((e) => e.after_index);
    assert.equal(new Set(usedAfter).size, usedAfter.length);
  });
});

describe('buildEvolution incomplete ledgers', () => {
  it('null afterAudit yields pending entries and complete:false', () => {
    const r = buildEvolution(mkAudit([mkClaim({})]), null);
    assert.equal(r.complete, false);
    assert.equal(r.basis, BASIS);
    assert.equal(r.entries.length, 1);
    assert.equal(r.entries[0].status, 'pending');
    assert.equal(r.entries[0].after, null);
    assert.equal(r.entries[0].after_index, null);
  });

  it('missing/non-array ledgers yield complete:false without crashing', () => {
    for (const bad of [{}, { claim_ledger: null }, { claim_ledger: 'x' }, null, undefined]) {
      const r1 = buildEvolution(bad, mkAudit([mkClaim({})]));
      assert.equal(r1.complete, false);
      const r2 = buildEvolution(mkAudit([mkClaim({})]), bad === undefined ? {} : bad);
      assert.equal(r2.complete, false);
    }
    const both = buildEvolution({}, {});
    assert.equal(both.complete, false);
    assert.deepEqual(both.entries, []);
  });

  it('empty arrays are valid no-detection, not proof of no claims', () => {
    const r = buildEvolution(mkAudit([]), mkAudit([]));
    assert.equal(r.complete, true);
    assert.deepEqual(r.entries, []);
    assert.deepEqual(r.summary, {});
  });

  it('malformed/null entries are tolerated, flagged uncertain, complete:false', () => {
    const r = buildEvolution(
      mkAudit([null, mkClaim({ claim: 'Good one' }), { nope: true }, mkClaim({ claim: '   ' })]),
      mkAudit([mkClaim({ claim: 'Good one' }), null]),
    );
    assert.equal(r.complete, false);
    const bad = r.entries.filter((e) => e.status === 'uncertain');
    assert.equal(bad.length, 4); // 3 unreadable before + 1 unreadable after
    assert.ok(bad.every((e) => e.match === 'none'));
    assert.ok(r.entries.some((e) => e.match === 'exact'));
  });
});

describe('buildConstellation', () => {
  const FACTS = 'Kopi arabika organik 500 gram. Sangrai medium dari petani Gayo.';

  it('exposes basis and well-formed node/edge shapes', () => {
    const g = buildConstellation(mkAudit([mkClaim({ claim: 'Kopi arabika organik', fact_quote: '' })]), FACTS);
    assert.equal(g.basis, BASIS);
    assert.equal(g.basis, CLAIM_DNA_BASIS);
    for (const n of g.nodes) assert.deepEqual(Object.keys(n).sort(), ['detail', 'id', 'label', 'source', 'type']);
    for (const e of g.edges) assert.deepEqual(Object.keys(e).sort(), ['from', 'relation', 'source', 'to']);
    for (const e of g.edges) {
      assert.ok(e.relation && e.source, 'every edge carries relation + provenance source');
    }
  });

  it('creates deterministic claim + status nodes and stable ids', () => {
    const audit = mkAudit([mkClaim({ claim: 'Kopi arabika organik' })]);
    const g1 = buildConstellation(audit, FACTS);
    const g2 = buildConstellation(mkAudit([mkClaim({ claim: 'Kopi arabika organik' })]), FACTS);
    assert.deepEqual(g1, g2);
    const ids = g1.nodes.map((n) => n.id);
    assert.ok(ids.includes('claim-1'));
    assert.ok(ids.includes('claim-1-status'));
    assert.ok(ids.includes('fact-source'));
    assert.equal(new Set(ids).size, ids.length);
  });

  it('adds recommended_action node only when nonempty', () => {
    const g = buildConstellation(
      mkAudit([mkClaim({ recommended_action: 'Fix copy' }), mkClaim({ recommended_action: '  ' })]),
      FACTS,
    );
    const ids = g.nodes.map((n) => n.id);
    assert.ok(ids.includes('claim-1-action'));
    assert.ok(!ids.includes('claim-2-action'));
  });

  it('creates quote nodes only for exact normalized substrings (>=4 chars)', () => {
    const g = buildConstellation(
      mkAudit([
        mkClaim({ claim: 'Arabika 500 gram', fact_quote: '  ARABIKA   organik 500 GRAM ', assessment: 'supported_by_supplied_facts' }),
        mkClaim({ claim: 'Short quote', fact_quote: 'abc', assessment: 'supported_by_supplied_facts' }),
        mkClaim({ claim: 'Invented quote', fact_quote: 'diamond certified award', assessment: 'supported_by_supplied_facts' }),
      ]),
      FACTS,
    );
    const ids = g.nodes.map((n) => n.id);
    assert.ok(ids.includes('claim-1-quote'));
    assert.ok(!ids.includes('claim-2-quote'));
    assert.ok(!ids.includes('claim-3-quote'));
    const link = g.edges.find((e) => e.from === 'claim-1-quote' && e.to === 'fact-source');
    assert.ok(link);
    assert.equal(link.relation, 'quoted_from');
    const src = g.nodes.find((n) => n.id === 'fact-source');
    assert.ok(String(src.detail).includes('500 gram'));
  });

  it('downgrades supported/contradicted without a valid quote to needs_human_review', () => {
    const g = buildConstellation(
      mkAudit([
        mkClaim({ claim: 'A', fact_quote: '', assessment: 'supported_by_supplied_facts' }),
        mkClaim({ claim: 'B', fact_quote: 'not in facts anywhere', assessment: 'contradicted_by_supplied_facts' }),
      ]),
      FACTS,
    );
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    assert.equal(byId.get('claim-1-status').label, 'needs_human_review');
    assert.equal(byId.get('claim-2-status').label, 'needs_human_review');
  });

  it('keeps valid supported quotes without downgrade', () => {
    const g = buildConstellation(
      mkAudit([mkClaim({ claim: 'A', fact_quote: 'petani Gayo', assessment: 'supported_by_supplied_facts' })]),
      FACTS,
    );
    const status = g.nodes.find((n) => n.id === 'claim-1-status');
    assert.equal(status.label, 'supported_by_supplied_facts');
  });

  it('links issue evidence/suggestion from that issue only; no claim-to-issue edges', () => {
    const g = buildConstellation(
      mkAudit(
        [mkClaim({ claim: 'Kopi arabika' })],
        [{ title: 'Harga tidak jelas', category: 'Claim', severity: 'high', evidence: 'Tidak ada harga', suggestion: 'Tambahkan harga' }],
      ),
      FACTS,
    );
    const ids = g.nodes.map((n) => n.id);
    assert.ok(ids.includes('issue-1'));
    assert.ok(ids.includes('issue-1-evidence'));
    assert.ok(ids.includes('issue-1-suggestion'));
    const isClaimSide = (id) => id.startsWith('claim-') || id === 'fact-source';
    const isIssueSide = (id) => id.startsWith('issue-');
    for (const e of g.edges) {
      assert.ok(!(isClaimSide(e.from) && isIssueSide(e.to)), `inferred link ${e.from} -> ${e.to}`);
      assert.ok(!(isIssueSide(e.from) && isClaimSide(e.to)), `inferred link ${e.from} -> ${e.to}`);
    }
    const ev = g.edges.find((e) => e.to === 'issue-1-evidence');
    assert.equal(ev.from, 'issue-1');
    assert.equal(ev.source, 'issues[0].evidence');
  });

  it('bounds claims to 8, issues to 7, and truncates long strings', () => {
    const ledger = Array.from({ length: 9 }, (_, i) => mkClaim({ claim: `Claim number ${i} ${'z'.repeat(500)}` }));
    const issues = Array.from({ length: 8 }, (_, i) => ({
      title: `T${i} ${'y'.repeat(300)}`, category: 'Other', severity: 'low',
      evidence: 'e'.repeat(900), suggestion: 's'.repeat(900),
    }));
    const g = buildConstellation({ claim_ledger: ledger, issues }, 'f'.repeat(5000));
    assert.ok(!g.nodes.some((n) => n.id === 'claim-9'));
    assert.ok(!g.nodes.some((n) => n.id === 'issue-8'));
    assert.equal(g.nodes.filter((n) => n.type === 'claim').length, 8);
    assert.equal(g.nodes.filter((n) => n.type === 'issue').length, 7);
    for (const n of g.nodes) {
      assert.ok(String(n.label).length <= 120, `label too long: ${n.id}`);
      assert.ok(String(n.detail).length <= 2500, `detail too long: ${n.id}`);
    }
  });

  it('tolerates null audit and null facts', () => {
    const g = buildConstellation(null, null);
    assert.equal(g.basis, BASIS);
    assert.deepEqual(g.edges, []);
    assert.equal(g.nodes.length, 1);
    assert.equal(g.nodes[0].id, 'fact-source');
  });
});

// ChatGPT review regressions; original Muse Code commit is retained in history.
it('missing/unknown origin must not create an exact identity match',()=>{
 const r=buildEvolution(mkAudit([mkClaim({origin:undefined})]),mkAudit([mkClaim({origin:undefined})]));
 assert.equal(r.complete,false);assert.ok(r.entries.every(e=>e.match!=='exact'));
});
it('legacy normalized missing ledger remains incomplete',()=>{
 const r=buildEvolution({...mkAudit([]),claim_ledger_available:false},mkAudit([]));assert.equal(r.complete,false);
});
it('a short generic shared word is insufficient for a changed candidate',()=>{
 const r=buildEvolution(mkAudit([mkClaim({claim:'Best coffee'})]),mkAudit([mkClaim({claim:'Best tea with free delivery'})]));
 assert.ok(r.entries.every(e=>e.match!=='candidate'));
});
