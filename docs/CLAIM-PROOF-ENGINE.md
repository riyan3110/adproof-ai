# Advertising Claim Verification & Repair Engine

## Data flow and evidence boundaries

`POST /api/audit` sends actual image pixels, product facts and caption to Meta Muse Spark 1.3. Strict structured output yields the existing claim ledger. Backend quote checking confirms case/whitespace-normalized excerpts occur in supplied facts. This checks quotation integrity, not external truth or semantic support. Invalid origins become unknown with human-review status; missing legacy ledgers carry `claim_ledger_available:false`.

A completed audit records a timestamp, model and SHA-256 of the request context. These application-generated metadata bind inputs for troubleshooting, **not a provider signature or independent proof of authenticity**. Mocked tests also produce them and remain labeled tests.

The browser freezes product/facts/caption for each audit→repair→reaudit cycle. Editing them invalidates results and revised assets; fields are disabled during requests. A new audit also clears earlier revisions. Image repair does not edit an external caption: both audits inspect the same supplied caption, explicitly recorded in exported reports.

`POST /api/improve` retains the current contract and accepts optional bounded `claims` in addition to issues. Claim-specific corrective guidance reaches Muse Image even when the generic issue list is empty. The returned image is re-audited through the existing audit endpoint, never substituted with a synthetic successful result.

## Claim DNA Evolution

Dependency-free `public/claim-engine.js` exports pure functions shared by browser and Node tests. Core was produced by genuine Muse Code in issue #14, commit `91eb887`; subsequent conservative matching fixes and integration are ChatGPT contributions.

- Maximum eight claims per ledger. IDs like `claim-1` are stage-local, never cross-stage identity.
- First pair exact unique normalized text **in the same known source**. Then pair unique, identical normalized text **across image and caption** with explicit `cross_source_observed` status; this establishes only an observation in a different source, never that the claim was physically moved or that the original text disappeared. Matching ignores capitalization/whitespace but preserves punctuation, negation and numbers. Ambiguous duplicates are not auto-paired.
- Candidate pairs require the same origin, number/currency/polarity features, token-set Jaccard overlap of at least 0.6, and reciprocal unique best matching. This is a lexical heuristic, not semantic identity. Ties remain unmatched.
- Exact retained claims keep their evidence status; unsupported/contradicted claims remain problematic. A changed model assessment alone does not establish repair.
- Possible changed wording remains provisional. Different numbers/polarity can be emitted as unmatched/new; conservative false negatives are preferable to asserting identity.
- **Not in re-audit list** means a claim was not included among the later model-selected ledger entries. Even if model records are well-formed, their maximum-eight-claims cap means absence is **not** proof the source image/caption lost that text. **First seen in re-audit** can be previously missed text, not necessarily newly introduced content. The UI displays an explicit sampling warning when either ledger reaches its eight-claim limit.
- The user's caption is not edited by Muse Image, and its unsupported claims require separate manual revision. Caption-vs-image observations are labeled distinctly in expanded trajectories.
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

## Inspection workspace follow-up

`activateProofView` changes the visible inspection mode without inventing observations. Selection is shared by source inspection and graph, while DNA source links explicitly select an audit stage and ledger index. An index is only a reference within that specific stage; matching across stages still uses the conservative engine. Caption claims display the actual supplied caption with the creative for context. Resizing redraws the graph against its container width while preserving the selected evidence detail. Clearing inputs releases all source references in the workbench and restores truthful empty states.


## Repair Must Not Degrade (existing workflow safeguard)

Muse Image receives preservation-first repair instructions: keep all correct physical parts, geometry, silhouette, edges, connectors, materials, logos and text; only change grounded defects, never invent unsupported details. When the initial audit has no evidence-grounded issue with an image correction, a costly image edit should not run merely to regenerate the scene.

The existing second Muse Spark audit compares **revised creative (image 1)** with a **downsampled original reference (image 2)** in one request; the original is included for comparison only and claim extraction still concerns the revised image and unchanged caption. A compact original is used to respect the Vercel payload limit. Image comparisons are model estimates, not high-resolution metrology or an external product authenticity check.

A deterministic internal guard compares the two selected audit reports for new unsupported *image* claims, medium/high revised visual/structure/legibility issues, and estimated clarity/layout score decline. Its states are `regression_suspected` or `review_required`, **never an automatic pass**; the existing Audit Dossier and exported JSON explicitly warn when manual review is required. Importantly, a larger overall score does NOT prove quality improvement, and apparent absence from a limited claim ledger does NOT prove a defect was removed. Failed verification retains the original and candidate images for inspection.
