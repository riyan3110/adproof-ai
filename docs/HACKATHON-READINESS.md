# AdProof AI — Evidence-based audit (hackathon)

## Why this is not a generic image analyzer
AdProof AI solves a narrow, actionable problem: **a marketer should be able to explain *which exact claims* in an ad need proof, remove unsupported messages using Muse Image, then independently re-audit the revised asset with Muse Spark.** Uploading a pretty image and returning a single score is not enough.

## Actual workflow
1. User provides an ad creative, product name, optional caption, and **seller-supplied product facts**. Facts are treated as untrusted content, *not instructions*.
2. Meta Muse Spark performs a multimodal audit and returns structured findings and a **claim ledger**, with up to 8 observed advertising claims:
   - `claim`: AI-observed claim from pixels or supplied caption.
   - `origin`: `creative` or `caption`.
   - `assessment`: one of `supported_by_supplied_facts`, `unsupported_by_supplied_facts`, `contradicted_by_supplied_facts`, `unreadable`, `needs_human_review`.
   - `fact_quote`: exact excerpt of seller-supplied facts, if any.
   - `reason` and `recommended_action`: concise grounded explanation and corrective advice.
3. The Node backend checks that any supposed supporting/contradicting `fact_quote` exists **verbatim, ignoring only case and whitespace**, in seller-supplied facts. If not, the status becomes `needs_human_review`. The quote is not shown as proof. This is an anti-hallucination integrity check, **not** independent fact checking.
4. `/api/audit` returns `claim_ledger`, `evidence_summary`, issue list, estimated scores, and short recommended copy, while keeping the legacy API shape.
5. `/api/improve` asks Meta Muse Image to modify the original visual while preserving product identity and eliminating unsupported claims.
6. User calls `/api/audit` **again on the actual revised image**, then compares the two analyses and assets.

## Critical honesty: what this does and does not prove
- `supported_by_supplied_facts` means only *consistent with facts typed by the seller*, not that external sources, product certificates or legislation have been checked.
- Model-extracted claims may be missed or misread; assessment remains an AI estimate. A `fact_quote` that appears in text may still be semantically unrelated; human review is required.
- An absent fact never proves a claim is false. Prefer `unsupported_by_supplied_facts`.
- Images are real inputs to Meta Muse Spark; automated tests mock the external provider. Do not claim a live billable API call was performed unless demonstrated.
- No fabricated audit scores, screenshots, celebrity endorsements or fake certificate claims are permitted.
- Strong input restrictions, API access codes, rate limits and spend caps should be enforced before broad public live access.

## Meta Global AI Developer Hackathon readiness
Event reference: https://dev.meta.ai/events/global-hackathon

**Startup track — Build for Your World**. The pitch is marketing claim integrity: allow small brands to replace weak/misleading creative claims with evidence-aligned copy and auditable before/after change history.

| Criterion | Deliverable/evidence | Current condition |
|---|---|---|
| Impact (30%) | Show a realistic small-business ad, unsupported claim, corrective result | Product workflow in development; record actual case |
| Meta tooling (25%) | Genuine Muse Spark multimodal analysis + Muse Image edit + second Muse Spark audit | Source-integrated; **must still demonstrate live calls** |
| Technical depth (20%) | Structured, source-traceable claim ledger, hallucinated-quote downgrade, tests, access protection | Backend implemented on review branch, tests pending CI |
| Demo (25%) | Public site, 3-minute video with real scenario, before/after + audit delta | Site deployed; public AI access and video pending |

**Submission checklist** (deadline: 4 November 2026, 9:00 PM U.S. Eastern / 5 November 2026, 09:00 WIB):
- [ ] Only eligible hackathon-window contributions submitted; earlier existing unrelated work is not presented as new.
- [ ] Public GitHub repo with reproducible setup, explanations and authentic Meta Muse Code commit history.
- [ ] Web app publicly reachable, meaningful authentic demo, and reliable non-secret evaluator access.
- [ ] Production AI tested with actual Meta API once, with usage and spending limits monitored. Avoid unauthenticated unlimited paid API calls.
- [ ] Record and link **real 3-minute demo video**, capture an input claim -> evidence ledger -> real edit -> re-audit comparison.
- [ ] Final submission via official Cerebral Valley portal before deadline.
- [ ] Optional Most Viral bonus: original public X post with authentic demo material and official post URL submitted according to event instructions.
- [ ] Confirm hosting plan's terms allow intended promotional/commercial use (Vercel Hobby constraints require separate review).

This document is a readiness tracker, **not a claim of official acceptance, eligibility, completion, or a guaranteed prize**. Only organizers decide those.
