# AdProof AI — Hackathon readiness

**Positioning:** Advertising Claim Verification & Repair Engine.
**Experience:** Visual Proof Intelligence Studio — Detect → Verify → Repair → Prove.
**Overall submission status: NOT READY for a truthful final submission until the remaining evidence below is completed.**

See [compliance register](HACKATHON-COMPLIANCE.md) for source-linked requirements and [engine documentation](CLAIM-PROOF-ENGINE.md) for implementation limits.

## Track and judging

Recommended: **Indie Developer / Build for Your World**, conditional on personal eligibility and registered track. No registration was changed. Startup requires an authorized active startup employee representative; a deployed app alone is insufficient.

Official Rules weights: Impact 30%, Meta AI Tooling 25%, Technical Depth & Execution 20%, Demo 25%. This product addresses small-brand claim review through traceable observations, quote-integrity checks, image repair and explicit re-audit uncertainty. It does not claim legal certification or independent factual verification.

## Deliverables

| Deliverable | State | Evidence / remaining work |
|---|---|---|
| Source integration | Implemented | Muse Spark 1.3 audits, Muse Image 1.0 edits; existing Audit→Refine→Verify preserved |
| Claim DNA Evolution | Implemented | Conservative matching, stage snapshots, missing/new/ambiguous states, expandable trajectories |
| Proof Constellation | Implemented | Traceable lightweight SVG, no inferred claim/finding links, inspectable nodes |
| Claim X-Ray | Implemented as panel | Actual source image and observation; no fake coordinates |
| Muse Code authorship | Verified genuine contribution | Existing issue #9/run and new issue #14/run; original commit retained, ChatGPT fixes separate |
| Access | Private paid routes retained | Public homepage/Studio/docs; Judge Access; fail-closed production |
| Tests / viewport / preview | 84/84 automated; six real-browser viewport flows | See WORK-STATE and docs/qa/studio-2026-10-28. Regression mocks are not paid provider tests; release PR records deployment checks |
| Authentic Meta E2E | NOT RUN in this upgrade | No local MODEL_API_KEY/DEMO_ACCESS_CODE; no user-selected rights-cleared ad for the demo |
| Full screenshot set / participant-only instructions | Incomplete | One relevant anti-project screenshot recovered; rules/submission authenticated details need verification |
| Participant eligibility / chosen track / signed waiver | NEEDS VERIFICATION | Participant must confirm privately |
| Final video | NOT RECORDED | Must use actual successful provider calls |
| Final submission / X | NOT PERFORMED | Requires user's explicit instruction; no acceptance receipt |

## Studio demonstration navigation

The first screen exposes all three capabilities through an interactive verification rail. Open Claim X-Ray, Proof Constellation or Claim DNA to switch the inspection workbench even before an audit; only truthful empty states appear. After a genuine audit, select a claim, use “Trace this claim in Constellation”, then inspect a quotation/status node. DNA “Inspect source” selects the corresponding original/revised claim and image. Results tabs separate Claims, Findings and Suggested copy; export is in its own footer.

Desktop-first composition and mobile flow were verified in a real browser at 1920/1440/1280/768/390/320px. Evidence screenshots are regression fixtures, not material for a genuine submission demo. A server health response only confirms configuration; successful model requests and a complete live cycle still require separate evidence.

For the live run, the owner needs a rights-cleared real creative, documented product facts, a privately entered judge code, and an approved cost cap for one Spark → Image → Spark cycle. Do not retrieve production secrets or repeatedly retry paid generation without an agreed budget.

## Authentic demo storyboard

Proposed **three-minute editorial cut**, not a verified official video duration. Confirm the actual portal's format/limit before recording. Do not present test fixture results as a Meta demo.

1. **0:00–0:20 — Problem.** Use one rights-cleared real product creative with an existing questionable claim. Show the actual product facts and explain their provenance. Avoid invented product benefits, prices or certifications.
2. **0:20–0:50 — Detect.** Enter Judge Access privately before recording. Upload the real image and run Muse Spark. Show the actual returned claim and source; preserve uncertainty if no claim was readable.
3. **0:50–1:20 — Verify.** Select that claim in Proof Constellation, inspect the exact fact excerpt, assessment and repair advice. Say explicitly that these are seller-supplied facts, not independently verified evidence.
4. **1:20–1:50 — Repair.** Run Muse Image on the original asset with claim-specific instructions. Inspect its actual output and use the before/after slider. If waiting is edited, label the time cut.
5. **1:50–2:30 — Prove.** Run a fresh Spark audit on the revised image. Open Claim DNA: retained, possible change, new and missing observations. Never call a missing claim automatically repaired. Keep a problematic result visible if the repair failed.
6. **2:30–3:00 — Inspect and export.** Select a trajectory to show X-Ray source inspection; export the JSON lineage/graph and briefly state limits. Close with public app and source URLs, not secrets.

Record only an authentic run. If the API fails, repair the fault and run again within the authorized budget; do not replace it with mock playback. Save the genuine report securely and review privacy before publication. A privacy-safe recording/video URL is still outstanding.

## Submission preparation

- Deadline confirmed against official event: **5 November 2026 09:00 WIB** (4 November 21:00 New York / 5 November 02:00 UTC). Recheck organizer updates before final entry.
- Portal: https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit
- App: https://adproof-ai.vercel.app
- Repository: https://github.com/riyan3110/adproof-ai
- Draft one-line description: “AdProof AI traces advertising claims from detection through evidence inspection, image repair and re-audit, making uncertainty and every observed change inspectable with Meta AI.”
- Technical evidence: link Muse Code issue/run/commit, source modules, regression results and genuine provider report/video. Do not claim that every file was authored by Muse.
- Confirm authenticated form's description fields, video duration, URLs, source/public license requirements and evaluator access instructions. Do not infer them from application fields.
- Share private judge code only through an approved confidential evaluator channel. It must never appear in public GitHub, X, screenshots or video.
- Bonus Most Viral is discretionary in Official Rules; confirm the current specific social-post rules. No X post was made.

## Deferred

AI Red Team Arena, What-If Lab, complex Proof Passport, paid infrastructure and image-coordinate highlighting. None is needed to run the core claim trace/repair/re-audit workflow.

## Editorial Proofroom design review (28 October 2026)

The user requested a professional, visually distinctive Studio rather than the prior generic dark dashboard. A follow-up UI-only branch replaces uniform dark cards with a graphite-and-ivory editorial investigation environment, strengthens creative-canvas prominence and the evidence document hierarchy, while retaining the same source-backed claim functions. Independent browser mocked-flow checks at six desktop/mobile widths and source tests passed; these do **not** constitute an authentic Meta API demo. Final production readiness and video/submission status remain governed by the unresolved items above.


## Explicit schematic empty-state enhancement (28 October 2026)

In response to feedback that the initial Studio appeared lifeless, the three evidence modes and audit dossier now show **wireframe illustrations labelled as non-model output** before the first audit. A public "Explore the evidence flow" action navigates to the actual claim/evidence inspector without making a paid model request. As soon as a real audit response arrives, authentic results replace explanatory visuals. Local `npm run check` and six Chromium viewport flows passed using mocked providers, not an authentic Meta API call. No additional claim about hackathon submission readiness is made.


## Live Model API verification gate (28 October 2026)

Preflight checks independently confirmed production pages/health answer HTTP 200; unauthenticated Model API routes answer 401 and a wrong Judge Access code answers 403. Both Model API environment variables are configured, but the real Meta **Muse Spark → Muse Image → Muse Spark** chain remains **NOT RUN** with genuine credentials/creative in this check. Do not treat `META CONFIGURED` or tests against mocked fetchers as a live completion.

The image response path now validates PNG/JPEG/WebP signatures (including octet-stream signed URLs) to avoid browser-incompatible data URLs, with regression coverage and proper oversized-response error handling. CDN static page security headers match backend policy after this patch is deployed. Before filming, the owner must privately enter Judge Access, approve a finite paid test budget, supply a real ad image they can use, and verify one complete result. Keep the demo code and keys out of screenshots/videos and use actual provider outputs.


## Judge Access verification status (28 October 2026)

Previously "Code entered" only meant local storage, not authentication. The Studio now submits the code to a dedicated nonbillable `POST /api/access` endpoint, reports accepted or rejected explicitly, and rechecks the tab-stored code on refresh. It presents distinct states for "code accepted by server", "Meta model key configured but not yet live-tested", and actual responses from Spark and Image only when a provider stage has returned successfully within the tab. This **does not** itself establish end-to-end Meta success. Full live provider evaluation remains blocked until the user consents to a finite cost and provides a usable real creative.


## Owner-observed production end-to-end flow (28 October 2026)

The project owner supplied screenshots of a production browser session displaying a complete Audit → Muse Image repair → Verify workflow on a **fictional AI-created lamp advertisement**. Initial claim-risk score **35/100** increased to **58/100** in the re-audit. Original questionable health/savings claims were removed **from the image** but retained in the unchanged ad caption; an unsupported "USB-C Powered" appeared in the revised image. This is useful authentic *application use* evidence, though the screenshot alone cannot independently validate provider-side billing/model logs, and seller-supplied facts are not independent verification.

The same session exposed a Claim DNA source-matching flaw: image claims appearing again in caption were counted as newly detected, while unchanged branding was called not re-detected due a selected eight-claim re-audit list. The follow-up fix labels unique case-insensitive cross-source observations, explains origin differences and sampling uncertainty, and warns that image edits do **not** update the caption. Do not claim a removal is verified solely from an absent claim-ledger entry. Capture a fresh post-fix session for demo material; the old screenshot remains historical debugging evidence.

Prior headings in this document describe the status **before** this owner-run test. The final hackathon video, eligibility/category checks and submission remain outstanding, and a confirmed Meta billing/model invocation log has not been independently inspected.


## Repair fidelity safeguard review (28 October 2026)

Prompt-hardening and internal regression checks were applied to the *existing* Repair/Verify workflow after the owner's real LumaDesk test revealed an invented `USB-C Powered` line despite facts specifying only USB 5V. Re-audit now sends a compact original reference alongside the revised image, and displays a clearly **unapproved candidate** warning based on conservative model-observation checks even if the aggregate score increases. Both real images remain available in memory for comparison; saved results can still be lost on refresh if not exported. Caption-only concerns no longer justify automatically invoking image editing.

**Validation limitation:** Source regressions and browser mocked-provider tests can confirm code and flow but do not establish that Muse Image never deforms objects, that the model reliably finds all Photoshop/AI artifacts, or that paired-image visual analysis will meet accuracy requirements on real production images. No paid live-model call was made for this patch. Do not make a hackathon demo claim of guaranteed repair quality.


## Demonstration archive recovery (28 October 2026)

To avoid repeated paid audits after a browser refresh, AdProof AI exports/imports JSON and complete image+JSON ZIP packages locally. Historical JSON, including the owner-observed 35/58 LumaDesk example, restores claim observations and claim lineage but cannot recover missing original/revised pixels. New ZIP packages retain both images for a reconstructed Before/After.

Imports are explicitly READ ONLY with no Meta API call, and old model observations are not presented as a newly verified inference. Live provider evaluation is grounded separately in the owner's screenshots and application-generated run metadata, not signed provider records. ZIP archive quality tests use mocked model responses and do not assert independent accuracy of Muse Spark or image editing.


## Archived editing continuation (28 October 2026)

A full saved LumaDesk ZIP containing original and revised images can now be resumed in the existing Proofroom without repeating the first paid audit. Choosing original uses saved score 35; choosing revised uses saved score 58, then a new **user-initiated** Repair and Verify can produce the next generation. Previous reports/images are archived in version-2 ZIP under distinct history filenames. Old ZIPs remain importable. User must press Repair/Verify explicitly, so merely importing/resuming costs no Meta API credits.

No actual live Meta call was performed to validate the new flow. Automated tests use clear mock data; do not present fixture responses as new Meta results. The repaired candidate remains unapproved and subject to manual quality review.


## Automatic language readiness (28 October 2026)

The existing Proofroom app has zero-cost local English/Indonesian UI localization with Auto browser detection and manual override. New live Meta audits use the selected report language; image editing preserves the original ad-copy language and never treats the selected report locale as a request to translate the product.

This is primarily for judge-facing **English browser experience** and the owner's Indonesian browser. Stored screenshots/JSON from the historical LumaDesk 35→58 session remain authentic Indonesian source observations after import; the app marks their language status instead of falsifying a new English-language audit. To demonstrate a genuine English-language Meta report, a *new user-initiated* audit in English is needed and potentially billable.

Release verification uses Node unit/integration and Chromium mocked requests only. No actual new Meta paid calls have been made for multilingual validation.
