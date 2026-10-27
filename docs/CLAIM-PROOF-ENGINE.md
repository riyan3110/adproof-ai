# Advertising Claim Verification & Repair Engine

## Data flow and evidence boundaries

`POST /api/audit` sends actual image pixels, product facts and caption to Meta Muse Spark 1.3. Strict structured output yields the existing claim ledger. Backend quote checking confirms case/whitespace-normalized excerpts occur in supplied facts. This checks quotation integrity, not external truth or semantic support. Invalid origins become unknown with human-review status; missing legacy ledgers carry `claim_ledger_available:false`.

A completed audit records a timestamp, model and SHA-256 of the request context. These application-generated metadata bind inputs for troubleshooting, **not a provider signature or independent proof of authenticity**. Mocked tests also produce them and remain labeled tests.

The browser freezes product/facts/caption for each audit→repair→reaudit cycle. Editing them invalidates results and revised assets; fields are disabled during requests. A new audit also clears earlier revisions. Image repair does not edit an external caption: both audits inspect the same supplied caption, explicitly recorded in exported reports.

`POST /api/improve` retains the current contract and accepts optional bounded `claims` in addition to issues. Claim-specific corrective guidance reaches Muse Image even when the generic issue list is empty. The returned image is re-audited through the existing audit endpoint, never substituted with a synthetic successful result.

## Claim DNA Evolution

Dependency-free `public/claim-engine.js` exports pure functions shared by browser and Node tests. Core was produced by genuine Muse Code in issue #14, commit `91eb887`; subsequent conservative matching fixes and integration are ChatGPT contributions.

- Maximum eight claims per ledger. IDs like `claim-1` are stage-local, never cross-stage identity.
- Exact pairs require unique normalized text and the same known origin. Normalization changes case/whitespace only, preserving punctuation, negation and numbers.
- Candidate pairs require the same origin, number/currency/polarity features, token-set Jaccard overlap of at least 0.6, and reciprocal unique best matching. This is a lexical heuristic, not semantic identity. Ties remain unmatched.
- Exact retained claims keep their evidence status; unsupported/contradicted claims remain problematic. A changed model assessment alone does not establish repair.
- Possible changed wording remains provisional. Different numbers/polarity can be emitted as unmatched/new; conservative false negatives are preferable to asserting identity.
- Not re-detected never means repaired, removed or false. New observations may be previously missed claims.
- Missing or malformed data is incomplete; valid empty arrays mean no detections, not no claims.

Expandable trajectories show both observations and input excerpts. Inspect links select the matching original/revised image and claim inspector. No model call or paid infrastructure is required to compute lineage.

## Proof Constellation

Nodes/edges derive only from the current normalized ledger and original facts snapshot. Selecting a claim displays its explicit neighborhood: assessment, recommended action, validated quotation and quotation source. Findings have separate evidence/suggestion nodes; there are no guessed claim↔finding edges. Shared facts do not make all claims mutually connected. Every node/edge carries its input source path in exported JSON.

The SVG uses deterministic columns and keyboard-operable nodes with an HTML selector and detail panel. Responsive CSS scales the selected neighborhood; long labels have full text in the inspector. No graph package, random layout, fabricated evidence or automatic web fact-check is added.

## Claim X-Ray

Selecting an audit card, graph claim or trajectory loads the actual corresponding image and panel with origin, assessment, reason, excerpt and action. Exact coordinates are unavailable, so there are **no bounding boxes**. This is source inspection, not OCR localization.

## Security, errors and tests

- Existing private Judge Access header/session handling, production fail-closed gate, CSP and model endpoints remain.
- New renderer uses text nodes/SVG text, not HTML injection.
- Request size checks use UTF-8 bytes for parsed serverless requests. Signed-image downloads have a timeout, no redirect following, HTTPS requirement and streamed size bound. Provider error messages redact configured secrets.
- Reports contain user facts/caption and model observations; no code/key or raw image is exported in JSON. They are local downloads and should only be shared with appropriate rights.
- In-memory rate limiting is not a global spending cap. No anonymous paid API or new paid service was enabled.
- Automated tests use mocks. Live-provider validation, real product facts and authentic demo capture must be recorded separately.
