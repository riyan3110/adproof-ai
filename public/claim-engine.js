// Conservative Claim DNA matching core for AdProof AI.
//
// Compares claim ledgers across audit stages using text comparison only.
// Basis is always seller-supplied facts, never treated as independently
// checked. No model calls, no randomness, no synthetic data. Absence of a
// claim in a later ledger is reported as not redetected, never as settled.

export const CLAIM_DNA_BASIS = 'seller_supplied_facts_not_independently_verified';

const MAX_CLAIMS = 8;
const MAX_ISSUES = 7;
const MIN_QUOTE = 4;
const CANDIDATE_THRESHOLD = 0.6;

const VALID_ASSESSMENTS = new Set([
  'supported_by_supplied_facts',
  'unsupported_by_supplied_facts',
  'contradicted_by_supplied_facts',
  'unreadable',
  'needs_human_review',
]);

const NEGATIONS = new Set([
  'not', 'no', 'never', 'neither', 'nor', 'cannot',
  "can't", "won't", "don't", "doesn't", 'didn\u2019t', "didn't",
  "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't",
  'tidak', 'bukan', 'belum', 'jangan', 'tanpa', 'tak', 'nggak', 'enggak', 'gak', 'nihil',
]);

// Conservative normalization: lowercase + collapse whitespace. Digits,
// punctuation and negation words are preserved untouched.
export function normalizeClaim(text) {
  return String(text ?? '').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
}

// Display-only, conservative distinction for historical Meta observations.
// Never reclassify a measured, comparative, medical, commercial or otherwise
// objectively checkable promise. This does not change audit/export eligibility.
export function isClearlySubjectiveSlogan(entry) {
  if(entry?.assessment!=='needs_human_review')return false;
  const phrase=String(entry?.claim||'').trim();
  const explanation=String(entry?.reason||'');
  if(!phrase||phrase.length>100||!/(?:slogan|tagline|motto|catchphrase|ungkapan kreatif|figurative promotional phrase)/i.test(explanation))return false;
  const objective=/\\d|[%$€]|\\b(?:garansi|jaminan|terbukti|bersertifikat|aman|menyembuhkan|mengobati|melindungi|mencegah|menurunkan|menaikkan|hemat|irit|diskon|gratis|tahan|lebih cepat|lebih lama|paling|terbaik|nomor satu|guaranteed|certified|clinically|safe|cures?|treats?|prevents?|protects?|reduces?|saves?|discount|free|lasts?|faster|longer|best|number one)\\b/i;
  return !objective.test(phrase);
}

function ledgerOf(audit) {
  if (!audit || typeof audit !== 'object') return null;
  if (audit.claim_ledger_available === false || !Array.isArray(audit.claim_ledger)) return null;
  return audit.claim_ledger.slice(0, MAX_CLAIMS);
}

function originOf(entry) {
  if (!entry || typeof entry !== 'object') return '';
  if (entry.origin === 'caption') return 'caption';
  if (entry.origin === 'creative') return 'creative';
  return '';
}

function normOf(entry) {
  if (!entry || typeof entry !== 'object') return '';
  return typeof entry.claim === 'string' ? normalizeClaim(entry.claim.slice(0,240)) : '';
}

function isReadable(entry) {
  return normOf(entry).length > 0;
}

function tokensOf(norm) {
  return norm.length ? norm.split(' ') : [];
}

function numbersOf(norm) {
  const m = norm.match(/\d+(?:[.,]\d+)?/g);
  return m ? m.slice().sort().join('|') : '';
}

function currenciesOf(norm) {
  const out = [];
  const sym = norm.match(/[$€£¥₹₩]/g);
  if (sym) out.push(...sym);
  const codes = norm.match(/\b(rp|idr|usd|eur|gbp|jpy|sgd|myr|aud|cad)\b/g);
  if (codes) out.push(...codes);
  return out.sort().join('|');
}

function polarityOf(norm) {
  for (const t of tokensOf(norm)) {
    if (NEGATIONS.has(t)) return 'negated';
    if (t.length > 3 && t.endsWith("n't")) return 'negated';
  }
  return 'plain';
}

function featuresOf(norm) {
  return { numbers: numbersOf(norm), currencies: currenciesOf(norm), polarity: polarityOf(norm) };
}

function sameFeatures(a, b) {
  return a.numbers === b.numbers && a.currencies === b.currencies && a.polarity === b.polarity;
}

function overlapScore(aNorm, bNorm) {
  const aSet = new Set(tokensOf(aNorm));
  const bSet = new Set(tokensOf(bNorm));
  if (!aSet.size || !bSet.size) return 0;
  let hit = 0;
  for (const t of aSet) if (bSet.has(t)) hit++;
  return hit / (aSet.size + bSet.size - hit);
}

function exactStatus(afterEntry) {
  const a = afterEntry && typeof afterEntry === 'object' ? afterEntry.assessment : '';
  if (a === 'unsupported_by_supplied_facts' || a === 'contradicted_by_supplied_facts') return 'still_problematic';
  if (a === 'supported_by_supplied_facts') return 'retained';
  return 'uncertain';
}

function exactExplanation(beforeEntry, afterEntry) {
  const afterA = String(afterEntry?.assessment ?? 'unknown');
  const beforeA = String(beforeEntry?.assessment ?? 'unknown');
  let s = `Unique one-to-one pairing by normalized text and origin. Later assessment: ${afterA}.`;
  if (beforeA !== afterA) {
    s += ` Earlier assessment was ${beforeA}; a changed assessment alone does not settle the underlying point.`;
  }
  s += ' Text comparison only; not a separate confirmation of truth.';
  return s;
}

function summarize(entries) {
  const out = {};
  for (const e of entries) out[e.status] = (out[e.status] || 0) + 1;
  return out;
}

function pendingEntry(side, item, index) {
  return {
    before: side === 'before' ? (item ?? null) : null,
    after: side === 'after' ? (item ?? null) : null,
    before_index: side === 'before' ? index : null,
    after_index: side === 'after' ? index : null,
    status: 'pending',
    match: 'none',
    explanation: 'Comparison is pending; the other ledger is missing or unreadable.',
  };
}

export function buildEvolution(beforeAudit, afterAudit) {
  const basis = CLAIM_DNA_BASIS;
  const beforeList = ledgerOf(beforeAudit);

  if (afterAudit === null || afterAudit === undefined) {
    const entries = beforeList
      ? beforeList.map((item, i) => ({
          before: item ?? null,
          after: null,
          before_index: i,
          after_index: null,
          status: 'pending',
          match: 'none',
          explanation: 'Later audit is not available yet; comparison is pending.',
        }))
      : [];
    return { basis, entries, summary: summarize(entries), complete: false };
  }

  const afterList = ledgerOf(afterAudit);
  if (beforeList === null || afterList === null) {
    const entries = [];
    if (beforeList) beforeList.forEach((item, i) => entries.push(pendingEntry('before', item, i)));
    else if (afterList) afterList.forEach((item, i) => entries.push(pendingEntry('after', item, i)));
    return { basis, entries, summary: summarize(entries), complete: false };
  }

  const before = beforeList.map((entry, index) => {
    const norm = normOf(entry);
    return { entry, index, norm, origin: originOf(entry), feat: featuresOf(norm), readable: norm.length > 0 && !!originOf(entry) };
  });
  const after = afterList.map((entry, index) => {
    const norm = normOf(entry);
    return { entry, index, norm, origin: originOf(entry), feat: featuresOf(norm), readable: norm.length > 0 && !!originOf(entry) };
  });
  const afterByIndex = new Map(after.map((r) => [r.index, r]));
  // Ledgers are model-selected observations, capped at eight. Even well-formed
  // lists are NOT exhaustive OCR or proof that an omitted claim vanished.
  const sample_limited = beforeList.length >= MAX_CLAIMS || afterList.length >= MAX_CLAIMS;
  const complete = before.every((r) => r.readable) && after.every((r) => r.readable);

  // Exact stage: normalized text + same origin, unique one-to-one only.
  // Ledger ids are local to each audit and are never used for matching.
  const keyOf = (r) => `${r.origin}\n${r.norm}`;
  const beforeByKey = new Map();
  const afterByKey = new Map();
  for (const r of before) {
    if (!r.readable) continue;
    if (!beforeByKey.has(keyOf(r))) beforeByKey.set(keyOf(r), []);
    beforeByKey.get(keyOf(r)).push(r);
  }
  for (const r of after) {
    if (!r.readable) continue;
    if (!afterByKey.has(keyOf(r))) afterByKey.set(keyOf(r), []);
    afterByKey.get(keyOf(r)).push(r);
  }
  const pairBefore = new Map(); // before index -> after index
  const pairAfter = new Map(); // after index -> before index
  const pairKind = new Map(); // before index -> 'exact' | 'cross_source_exact' | 'candidate'
  const ambBefore = new Set();
  const ambAfter = new Set();
  for (const [key, bArr] of beforeByKey) {
    const aArr = afterByKey.get(key) || [];
    if (aArr.length === 0) continue;
    if (bArr.length === 1 && aArr.length === 1 && sameFeatures(bArr[0].feat, aArr[0].feat)) {
      pairBefore.set(bArr[0].index, aArr[0].index);
      pairAfter.set(aArr[0].index, bArr[0].index);
      pairKind.set(bArr[0].index, 'exact');
    } else {
      // Duplicate exact claims on either side: ambiguous, never auto-paired.
      for (const r of bArr) ambBefore.add(r.index);
      for (const r of aArr) ambAfter.add(r.index);
    }
  }
  for (const [key, aArr] of afterByKey) {
    if (beforeByKey.has(key)) continue;
    void aArr;
  }

  // Exact cross-source stage: the same text may be found on an image in
  // one audit and in an unchanged caption in the other. This is NOT evidence
  // that the claim migrated or that image editing removed it from the ad.
  // Only pair unique one-to-one, equal-wording entries; never infer a
  // cross-source relationship from fuzzy semantic overlap.
  const unmatchedB = before.filter(r => r.readable && !pairBefore.has(r.index) && !ambBefore.has(r.index));
  const unmatchedA = after.filter(r => r.readable && !pairAfter.has(r.index) && !ambAfter.has(r.index));
  for (const b of unmatchedB) {
    const options = unmatchedA.filter(a => a.norm===b.norm && a.origin!==b.origin && sameFeatures(a.feat,b.feat));
    if (!options.length) continue;
    const uniquelyReversed = options.length===1 &&
      unmatchedB.filter(candidate=>candidate.norm===options[0].norm &&
        candidate.origin!==options[0].origin &&
        sameFeatures(candidate.feat,options[0].feat)).length===1;
    if (uniquelyReversed) {
      const a=options[0];
      pairBefore.set(b.index,a.index);
      pairAfter.set(a.index,b.index);
      pairKind.set(b.index,'cross_source_exact');
    } else {
      // Repeated wording across sources cannot be paired deterministically.
      ambBefore.add(b.index);
      for (const a of options) ambAfter.add(a.index);
    }
  }

  // Candidate stage: lexical overlap, same origin, reciprocal unique best.
  const freeBefore = before.filter((r) => r.readable && !pairBefore.has(r.index) && !ambBefore.has(r.index));
  const freeAfter = after.filter((r) => r.readable && !pairAfter.has(r.index) && !ambAfter.has(r.index));
  const scoreOf = (b, a) => {
    if (b.origin !== a.origin) return 0;
    if (b.norm === a.norm) return 0;
    if (!sameFeatures(b.feat, a.feat)) return 0;
    return overlapScore(b.norm, a.norm);
  };
  const uniqueBest = (rows, cols) => {
    const out = new Map();
    for (const r of rows) {
      let best = null;
      let bestScore = 0;
      let tied = false;
      for (const c of cols) {
        const s = scoreOf(r, c);
        if (s < CANDIDATE_THRESHOLD) continue;
        if (s > bestScore) { bestScore = s; best = c.index; tied = false; }
        else if (s === bestScore) { tied = true; }
      }
      out.set(r.index, tied ? null : best);
    }
    return out;
  };
  // Note: scoreOf is symmetric in this implementation, so reuse it both ways.
  const bestForB = uniqueBest(freeBefore, freeAfter);
  const bestForA = uniqueBest(freeAfter, freeBefore);
  for (const b of freeBefore) {
    const aj = bestForB.get(b.index);
    if (aj === null || aj === undefined) continue;
    if (bestForA.get(aj) === b.index) {
      pairBefore.set(b.index, aj);
      pairAfter.set(aj, b.index);
      pairKind.set(b.index, 'candidate');
    }
  }

  const entries = [];
  for (const b of before) {
    if (!b.readable) {
      entries.push({
        before: b.entry ?? null, after: null, before_index: b.index, after_index: null,
        status: 'uncertain', match: 'none',
        explanation: 'Earlier ledger entry is missing or unreadable, so it cannot be compared.',
      });
      continue;
    }
    if (pairBefore.has(b.index)) {
      const a = afterByIndex.get(pairBefore.get(b.index));
      if (pairKind.get(b.index) === 'exact') {
        entries.push({
          before: b.entry, after: a.entry, before_index: b.index, after_index: a.index,
          status: exactStatus(a.entry), match: 'exact',
          explanation: exactExplanation(b.entry, a.entry),
        });
      } else if (pairKind.get(b.index) === 'cross_source_exact') {
        entries.push({
          before: b.entry, after: a.entry, before_index: b.index, after_index: a.index,
          status: 'cross_source_observed', match: 'cross_source_exact',
          explanation: `Identical wording is recorded as ${b.origin} in the earlier audit and ${a.origin} in the later audit. This does not establish that the wording moved between sources or disappeared from the original source. Image repair does not change the supplied caption; inspect both surfaces and the later assessment.`,
        });
      } else {
        entries.push({
          before: b.entry, after: a.entry, before_index: b.index, after_index: a.index,
          status: 'changed_candidate', match: 'candidate',
          explanation: 'Similar wording with the same origin and a unique mutual best overlap. Wording similarity is uncertain evidence of sameness; human review is still needed.',
        });
      }
      continue;
    }
    if (ambBefore.has(b.index)) {
      entries.push({
        before: b.entry, after: null, before_index: b.index, after_index: null,
        status: 'ambiguous', match: 'ambiguous',
        explanation: 'Duplicate normalized text with the same origin; no unique one-to-one pairing can be made.',
      });
      continue;
    }
    entries.push({
      before: b.entry, after: null, before_index: b.index, after_index: null,
      status: 'not_redetected', match: 'none',
      explanation: 'Not listed in the later model-selected claim ledger. The text may still be visible in the image or caption; absence from a capped or non-exhaustive ledger is not evidence that it disappeared or that the underlying point is settled.',
    });
  }
  for (const a of after) {
    if (pairAfter.has(a.index)) continue;
    if (!a.readable) {
      entries.push({
        before: null, after: a.entry ?? null, before_index: null, after_index: a.index,
        status: 'uncertain', match: 'none',
        explanation: 'Later ledger entry is missing or unreadable, so it cannot be compared.',
      });
      continue;
    }
    if (ambAfter.has(a.index)) {
      entries.push({
        before: null, after: a.entry, before_index: null, after_index: a.index,
        status: 'ambiguous', match: 'ambiguous',
        explanation: 'Duplicate normalized text with the same origin; no unique one-to-one pairing can be made.',
      });
      continue;
    }
    entries.push({
      before: null, after: a.entry, before_index: null, after_index: a.index,
      status: 'newly_detected', match: 'none',
      explanation: 'First listed in the later model-selected ledger with no matched earlier entry. It may have existed in the original image or caption but been omitted from the earlier sample; this is not proof it was newly added.',
    });
  }

  return { basis, entries, summary: summarize(entries), complete, sample_limited };
}

export function buildConstellation(audit, suppliedFacts) {
  const basis = CLAIM_DNA_BASIS;
  const nodes = [];
  const edges = [];
  const factsRaw = String(suppliedFacts ?? '');
  const factsNorm = factsRaw.replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
  nodes.push({
    id: 'fact-source',
    type: 'fact_source',
    label: 'Seller-supplied facts',
    detail: factsRaw.slice(0, 2500),
    source: 'input.suppliedFacts',
  });

  const ledger = audit && typeof audit === 'object' && Array.isArray(audit.claim_ledger)
    ? audit.claim_ledger.slice(0, MAX_CLAIMS)
    : [];
  ledger.forEach((entry, i) => {
    if (!entry || typeof entry !== 'object') return;
    const text = typeof entry.claim === 'string' ? entry.claim.trim().slice(0,240) : '';
    if (!text) return;
    const n = i + 1;
    const claimId = `claim-${n}`;
    const origin = originOf(entry) || 'unknown';
    nodes.push({
      id: claimId, type: 'claim', label: text.slice(0, 120),
      detail: `[${origin}] ${text}`.slice(0, 240), source: `claim_ledger[${i}].claim`,
    });

    const raw = VALID_ASSESSMENTS.has(entry.assessment) ? entry.assessment : 'needs_human_review';
    const quoteRaw = String(entry.fact_quote ?? '').trim();
    const quoteNorm = quoteRaw.replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
    const quoteOk = quoteNorm.length >= MIN_QUOTE && factsNorm.includes(quoteNorm);
    let effective = origin === 'unknown' ? 'needs_human_review' : raw;
    let note = '';
    if ((raw === 'supported_by_supplied_facts' || raw === 'contradicted_by_supplied_facts') && !quoteOk) {
      effective = 'needs_human_review';
      note = ` Note: recorded assessment ${raw} was set aside because no exact quote from the supplied facts was present; human review is needed.`;
    }
    const reason = String(entry.reason ?? '').slice(0, 320);
    nodes.push({
      id: `${claimId}-status`, type: 'status', label: effective,
      detail: `${reason}${note}`.slice(0, 640), source: `claim_ledger[${i}].assessment`,
    });
    edges.push({ from: claimId, to: `${claimId}-status`, relation: 'has_assessment', source: `claim_ledger[${i}]` });

    const action = String(entry.recommended_action ?? '').trim();
    if (action) {
      nodes.push({
        id: `${claimId}-action`, type: 'action', label: action.slice(0, 120),
        detail: action.slice(0, 260), source: `claim_ledger[${i}].recommended_action`,
      });
      edges.push({ from: claimId, to: `${claimId}-action`, relation: 'has_recommended_action', source: `claim_ledger[${i}]` });
    }

    if (quoteOk) {
      nodes.push({
        id: `${claimId}-quote`, type: 'quote', label: quoteRaw.slice(0, 120),
        detail: quoteRaw.slice(0, 350), source: `claim_ledger[${i}].fact_quote`,
      });
      edges.push({ from: claimId, to: `${claimId}-quote`, relation: 'has_quote', source: `claim_ledger[${i}].fact_quote` });
      edges.push({ from: `${claimId}-quote`, to: 'fact-source', relation: 'quoted_from', source: 'input.suppliedFacts' });
    }
  });

  const issues = audit && typeof audit === 'object' && Array.isArray(audit.issues)
    ? audit.issues.slice(0, MAX_ISSUES)
    : [];
  issues.forEach((issue, j) => {
    if (!issue || typeof issue !== 'object') return;
    const m = j + 1;
    const issueId = `issue-${m}`;
    const title = String(issue.title ?? '').trim() || `Issue ${m}`;
    nodes.push({
      id: issueId, type: 'issue', label: title.slice(0, 120),
      detail: `Category: ${String(issue.category ?? 'Other').slice(0, 24)}. Severity: ${String(issue.severity ?? 'low').slice(0, 12)}.`.slice(0, 160),
      source: `issues[${j}]`,
    });
    const evidence = String(issue.evidence ?? '').trim();
    if (evidence) {
      nodes.push({
        id: `${issueId}-evidence`, type: 'evidence', label: evidence.slice(0, 120),
        detail: evidence.slice(0, 260), source: `issues[${j}].evidence`,
      });
      edges.push({ from: issueId, to: `${issueId}-evidence`, relation: 'has_evidence', source: `issues[${j}].evidence` });
    }
    const suggestion = String(issue.suggestion ?? '').trim();
    if (suggestion) {
      nodes.push({
        id: `${issueId}-suggestion`, type: 'suggestion', label: suggestion.slice(0, 120),
        detail: suggestion.slice(0, 280), source: `issues[${j}].suggestion`,
      });
      edges.push({ from: issueId, to: `${issueId}-suggestion`, relation: 'has_suggestion', source: `issues[${j}].suggestion` });
    }
  });

  return { nodes, edges, basis };
}
