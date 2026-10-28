# AdProof AI — Work checkpoint (28 October 2026 WIB)

Repository https://github.com/riyan3110/adproof-ai · Production https://adproof-ai.vercel.app

## Upgrade scope and lineage

- Baseline latest main `df530267b14922bcf2b65b414720539d198261c2`, PR #10/#11/#12/#13 reviewed and already merged. No AGENTS.md found. Initial source tests: 37/37.
- Official event + Terms/Official Rules audited **before source edits**. Deadline: 5 November 09:00 WIB. See `docs/HACKATHON-COMPLIANCE.md`; eligibility, registered track, authenticated submission instructions and video duration remain unverified. Recommended Indie, no registration change made.
- Genuine new Muse Code run: issue #14 → run 40552300687 → commit `91eb887f54ba9eda3ceef4ffa1e2f0751e987ec1`. Engine + tests actually written by Muse; external validation found one overly permissive matching regression. Original commit retained as parent of integration work.
- ChatGPT review tightened overlap to token-set Jaccard 0.6, disallowed unknown origins from matching, preserved missing-ledger state; integrates real audit snapshots into Claim DNA, lightweight Proof Constellation and X-Ray panel. No author rewrite.

## Implemented

- Interactive Claim DNA trajectories: retained/problematic/possible change/not re-detected/new/ambiguous/incomplete. No automatic repaired claim from absence.
- Deterministic source-traceable graph with keyboard nodes, source details and separate issue evidence. Responsive mobile graph layout.
- Claim X-Ray on audit cards, graph and trajectories; actual original/revised image, no fake boxes.
- Frozen audit context; editing facts/product/caption invalidates stale reports. Same external caption explicitly retained in both audits.
- Claim-level repair guidance forwarded to Muse Image; report exports both graphs, lineage, original context and request metadata.
- Public positioning changed to Advertising Claim Verification & Repair Engine; fake decorative homepage score removed. No mock results in production.
- Preserved judge dialog/header/session code, public pages, production fail-closed gate, legacy routes, compare, image download and original model IDs.
- Fixed compare slider opening upload picker, hidden buttons overridden by CSS, mobile header overflow, parsed-body byte limits, missing-origin evidence and signed image download timeout/size bound. Provider errors redact configured secrets.
- No new subscription/storage provider, no workflow edits, no final submission/X post.

## Validation

- `npm run check`: **79/79 passed**, syntax + Node regression tests; upstream mocked.
- Real headless browser rendering with **mocked API responses**: 1920×1000, 1440×1000, 390×1000 and 320×1000. Upload → private judge challenge → audit → graph/X-Ray → repair → compare → re-audit → DNA → export → context invalidation passed at all sizes. Empty/missing ledger and HTML-injection fixture checks passed. No JS/unexpected console errors or document overflow. Four expected mocked HTTP 401 gate responses were exercised.
- Test runner: `scripts/browser-smoke.cjs` (optional development Playwright dependency; zero production dependencies). `ADPROOF_TEST_URL` can target a preview; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` optionally selects Chromium. Fixtures exist only in tests, never runtime outputs.
- Desktop/mobile screenshots inspected locally; screenshots contain explicit test fixtures and are not authentic demo materials.
- `git diff --check`: clean. Deployment verification is recorded below and in PR #15; this document does not claim a paid Meta run.

## Remaining before final submission

1. Confirm age/majority, residence/sanctions/affiliation exclusions, signed rules and registered track privately.
2. Read authenticated final portal fields, any participant-only FAQ, full prior screenshot set, required video format/duration and specific X bonus instructions.
3. Run bounded authorized **real** Spark → Image → Spark E2E using a rights-cleared real ad, actual facts and private judge code. This environment has no local MODEL_API_KEY or DEMO_ACCESS_CODE. No production secret was decrypted; no live paid test is claimed.
4. Record genuine video per official duration after confirmed live results. Storyboard is in `docs/HACKATHON-READINESS.md`; three minutes is a proposal only.
5. User must explicitly authorize final submission/posting; share judge code only in a confidential evaluator channel. No submission receipt exists.
6. In-memory IP limit is not a durable global spending cap; retain private paid access and provider budget monitoring.

## Deferred

Coordinate highlights, Red Team Arena, What-If Lab and complex Proof Passport. Public app still requires private Judge Access for paid Meta execution.

## Release verification (PR #15)

- Integration source commit: `859715ec3a6583981fbf13255167728c8be9408b`; genuine Muse parent remains `91eb887f54ba9eda3ceef4ffa1e2f0751e987ec1`.
- PR: https://github.com/riyan3110/adproof-ai/pull/15 — use a merge commit to preserve attribution. The final merge SHA and production deployment evidence are recorded in that PR conversation after verification.
- GitHub Actions run [40554464506](https://github.com/riyan3110/adproof-ai/actions/runs/40554464506): Node.js mocked-upstream suite completed successfully. Vercel commit status succeeded.
- Vercel Preview `dpl_FrCDzPq143AgdSyiEfyd9Hue112j` was READY for the integration commit. Authenticated HTTP checks returned 200 for `/app`, `/docs`, `/claim-engine.js`, `/proof-studio.js` and `/api/health`. Health reported both configured model IDs and enabled demo gate; this does not prove successful model execution.
- Preview is protected by Vercel; its access token was not added to source, reports or public links. Production public access must be tested without that token.
- No final submission, X post or genuine demo recording has been made.

## Studio visibility correction (follow-up to PR #15; ChatGPT-authored)

- User reported that the screenshot still looked like the old two-column Studio. Confirmed: `proofWorkspace` was hidden until the first authenticated audit; X-Ray inspector was also only shown when real evidence was available.
- Introduced a visible, prominent three-module verification rail at the top of Studio with navigable X-Ray, Evidence Constellation and Claim DNA sections, plus honest phase labels backed by the actual audit lifecycle.
- The real Proof Constellation and Claim DNA panels are now visible on first load, with explicit empty states. Results containers remain hidden until Meta AI returns observations; changing inputs clears stale nodes and restores the empty state.
- Reused existing backend/engine and private Judge Access, without synthetic claim data, model calls, third-party JS packages, or a large refactor.
- Browser smoke assertions updated for persistent modules, live result swaps, and context invalidation. PR validation and production merge must still be checked; do not present this note as an already-deployed release.

## Final Studio inspection workspace (28 October 2026 WIB; ChatGPT-authored)

Baseline main `558d6e9b571b1d62ebd454a811634c4bd30b5f48` includes merged PR #16. Checked remote main before starting; no AGENTS.md. Baseline 81/81 tests. Genuine Muse commits remain unmodified ancestors.

### Changes

- Desktop composition now has a sticky verification rail, large canvas with source-context form, separate repair/verify controls, a three-mode inspection workbench, and a distinct results/export area. On mobile the rail becomes three compact selectors. At desktop 1920/1440/1280, canvas starts at y=298 in a 1000px-high browser, versus the previous large cards pushing it below the fold.
- Modules actually switch workbench modes; selected claim is preserved between X-Ray and Constellation. X-Ray has a real source-image preview, explicit original/revised stage, claim selector, actual caption context, evidence status and repair advice. DNA source buttons select the exact stage/claim, not just a page anchor.
- Graph layout responds to its own available width; selected evidence survives resize; two-line labels and full detail panel prevent unreadable long labels. Keyboard Enter/Space selects nodes and updates aria-pressed. No synthetic coordinates/relationships.
- Claims, Findings and Suggested copy are separate report tabs. Export controls show availability and report scope. Mobile primary action now advances Audit → Repair → Verify → Inspect changes instead of always auditing the original again.
- Invalidation releases X-Ray and comparison image references and clears selections/nodes/trajectories. Malformed successful API responses do not advance workflow state. Failed repair/re-audit retains the last usable stage for retry. Toasts no longer intercept the mobile action.
- Scope: HTML/CSS and browser modules, local CSS route, regression scripts/tests, docs. Shared backend model/auth/billing behavior unchanged. No new runtime package, workflow, account, infrastructure or paid service.

### Verification

- `npm run check`: 84/84 passed, with mocked upstream.
- Real Chromium 131 + Playwright passed at 1920, 1440, 1280, 768, 390 and 320 × 1000. Full mocked workflow, real uploads, private-code dialog, graph keyboard/resize, caption inspection, both image stages, report tabs, comparison slider, DNA, exports, repeated mode switching, empty/incomplete ledgers, injection fixture and context invalidation tested. No JS/unexpected console errors or horizontal overflow.
- Additional 1440 browser checks: malformed audit response, repair HTTP 502, re-audit HTTP 504, and actual browser AbortController deadline advanced using Playwright's clock. Recovery kept correct stage and controls.
- DOM after workflow: 506 elements at each viewport. Chromium reported approximately 10 MB JS heap (coarse bucket, not total tab/GPU/process memory or a peak measurement). No heavy graph dependency.
- Screenshots and machine-readable results: `docs/qa/studio-2026-10-28/`. These contain explicitly labelled test fixtures and are **not proof of live Meta output**.
- PR/Preview/production checks and final release SHA will be recorded in the release PR conversation after deployment, preserving an exact checked-commit trail.

### Remaining boundaries

Official event deadline rechecked 28 October: still 4 November 21:00 ET / 5 November 09:00 WIB. Public submission page does not expose authenticated final fields/video limits. No personal eligibility/registered track/waiver fact was newly verified. No secret was retrieved/decrypted; no authorized cost cap and usable private-code/real-ad combination was available, so no paid Meta E2E or video is claimed. See readiness for remaining owner steps.

Final mobile visual correction: 320px header controls now remain inside the header; the empty-canvas headline wraps within its container. Full 390px/320px mocked browser flows were rerun successfully with an explicit header-containment assertion, no overflow and no JS errors. See QA `empty-320.png` and `mobile-final-results.json`.

## Editorial Proofroom visual identity (28 October 2026 — ChatGPT-authored, pending release)

- User rejected the generic all-dark card/dashboard treatment in PR #17. Reworked the **existing** `/app` into an editorial-forensics Studio: dark graphite investigation rail and source canvas, warm ivory evidence input/workbench and audit dossier, distinctive ink + serif headline and restrained acid-lime functional accents. This is a compositional rebrand, not mock AI content or a new app.
- Kept every feature wire, element ID, private judge challenge, backend API, audit engine, Muse provenance and deployment requirements intact. `index.html` landing and documentation styles remain unchanged; new branding rules live in studio-only CSS.
- Increased readable type scale, simplified card treatments into bordered document surfaces, emphasized user creative, and kept before/after plus graph/DNA interactive.
- **Independent local sandbox verification:** `npm run check` **85/85** passed. Chromium + Playwright real-browser full MOCKED flow passed at 1920/1440/1280/768/390/320px; no unexpected console/page errors or horizontal overflow. Desktop creative canvas top was 371/354/352px at 1920/1440/1280 respectively (under 400px first-fold assertion). Mobile 390/320 also passed navigation, upload, claim inspection, repair, re-audit, report export, stale input reset. Results from fake provider responses are **never** public demo evidence.
- Follow-up PR/deployment verification should be recorded only when actually merged. Genuine paid Meta E2E and authenticated competition form checks remain outstanding.


## Informative idle visuals (28 October 2026 — ChatGPT-authored)

- User observed that X-Ray / Constellation / DNA / Audit Dossier remained visually empty before upload. Implemented **clearly labeled wireframe-only explanatory diagrams**, not synthetic Meta scores, fabricated claims, simulated images or test fixture output in production.
- Kept all existing actual result panels unchanged: after a genuine audit, placeholders hide and results render from the original backend; input changes reset to safe, non-AI visuals.
- Added **Explore the evidence flow** action in Audit Dossier's empty state. It activates the existing Proof Constellation UI without invoking a provider or enabling paid anonymous requests. Other empty CTA uses the existing upload/facts focus action.
- Validation: source check **87/87**; real Chromium mocked browser flow at **1920/1440/1280/768/390/320px**, no horizontal overflow, no unexpected JS/console errors, all legacy audit/repair/verify, X-Ray/evidence/DNA, export and invalidation checks passed. Browser fixtures do not establish real Meta API success.
- Scope: `public/app.html`, `public/studio.css`, `public/app.js`, structural tests, browser smoke. No model/backend/secret/rate-limit changes. Deployment status to be checked separately before claiming production.


## Meta live-readiness preflight (28 October 2026 — ChatGPT-authored)

- **External production smoke:** From an independent Vercel sandbox, GET `/`, `/app`, `/docs`, `/api/health` returned **200**, while POST `/api/audit` and `/api/improve` without the private code returned **401** and one intentionally wrong-code POST returned **403**. These protected rejection paths did **not** invoke paid inference.
- Production health reported `configured:true`, `demoGate:true`, `muse-spark-1.3`, `muse-image-1.0`. **This does not prove Meta credentials work or a genuine provider response.** No real Model API call was made; the owner's code/cost approval and rights-cleared creative were not available for this session.
- Identified and fixed a readiness bug: model-supplied signed image URLs can use `application/octet-stream` even for valid PNG/JPEG/WebP. The backend now uses image signature bytes for MIME selection, rejects unsupported/HTML payloads, and preserves the explicit Vercel response-size error before format checks. Tests cover those cases.
- Independent probe found Vercel CDN-served `/app` and `/docs` omitted the backend's baseline CSP while API routes had it. Added Vercel static headers (CSP, nosniff, frame deny, no-referrer) without unsafe inline scripts/styles; verify preview and production after merge.
- Tests in isolated sandbox: `npm run check` **90/90 PASS**. Regression fixtures are mocked Model API responses and are not authentic hackathon demo evidence.
- For **one** paid end-to-end owner test: enter the existing private Judge Access code in the browser (never send to GitHub/chat), upload a rights-cleared small ad with accurate seller facts, run Audit → Repair → Verify with a user-approved spend cap, save the genuine JSON report and screenshot of any failures (redact code). Do not publish fake results. 


## Judge Access connection status — 28 October 2026 (ChatGPT-authored)

- User observed that entering a code showed only **"Code entered"** alongside **"META CONFIGURED"**, without confirming the submitted code matched the server secret. This was a genuine UI trust/status error: saving to sessionStorage was wrongly presented as access confirmation.
- Added `POST /api/access` through the existing Vercel handler, with constant-time matching against server-side `DEMO_ACCESS_CODE` and per-instance best-effort request throttling. It returns minimal success or 401/403/429/503, **never calls paid Meta** and never returns any secret. Serverless throttling is **not** a distributed global quota.
- Frontend now verifies before persisting a submitted code, presents inline rejection, and rechecks codes after browser reload. A persistent two-part Studio strip distinguishes **verified Judge Access** from **Meta provider configured but NOT TESTED**; the latter advances only after actual responses from first audit, image edit, and re-audit during that browser session.
- Client tests, smoke tests and documentation were updated to keep these semantics. Independent isolated Chromium full mocked workflow passed at 1920, 1440, 1280, 768, 390 and 320px without overflow or JS console errors; **94/94 source tests passed** prior to final docs changes. The full Meta Model API with real credentials is still **not yet called**.
- Existing gated paid routes, secret handling, Muse Code contribution history, image responses and verification engine remain intact.


## Live user test and Claim DNA lineage correction — 28 October 2026 (ChatGPT-authored)

- **Owner-observed production flow:** user shared screenshots of the actual deployed Studio after uploading a synthetic *LumaDesk Mini* LED lamp ad made for testing, entering fictional product facts, and running Audit → Repair creative → Verify revision. Studio displayed initial audit **35/100**, generated revised creative, and re-audit **58/100**. The revised image removed unsupported claims from the image but showed an unsupported **USB-C Powered** feature; unchanged original caption still mentioned electricity savings, eye protection, and sleep benefits. This is direct owner-supplied browser evidence, not an independently retrieved Meta billing log or a commercially real product.
- **Real finding:** the generated Claim DNA listed 15 trajectories, misclassifying 'Save up to 90% Electricity' and 'Protect Your Eyes' as separate removed/introduced observations solely because the source changed **creative ↔ caption** (and text case varied). It also said 'Not re-detected' for LumaDesk Mini / LED DESK LAMP, although visibly still in the revised image; eight-model-claim sampling is not exhaustive image OCR.
- Corrected lineage for *unique identical normalized text* across creative and caption, with status `cross_source_observed` and explicit source labels. It **does not** assert image text moved or was removed. Cross-origin fuzzy matching remains disallowed; duplicate ambiguous observations remain unmatched. Changes in numbers/negation/currency cannot silently match. UI calls missing entries 'Not in re-audit list' and new ledger entries 'First seen in re-audit', and warns about eight-claim sampling and unchanged caption.
- Reproduced the LumaDesk screenshot's eight-claim ledgers as test-only fixtures. The corrected example has two explicit cross-source pairs, five older unmatched and five later unmatched observations; USB-C remains visible for human review. Test fixtures do not appear in production.
- Tests: isolated Node suite initially **98/98 PASS** after the engine change; final browser and PR release checks recorded separately. No new paid API requests or public secrets.


## Repair Must Not Degrade hardening (28 October 2026 — ChatGPT-authored)

- Scope deliberately restricted to **existing Audit → Repair → Verify**. No new modes, dashboard panels or paid providers.
- Muse Image editing prompt now strongly preserves product silhouette, connectors, geometry, parts, material, labels, accurate typography and unaffected objects; never infer USB-C from USB 5V or force changes on doubtful findings.
- Existing Verify request now supplies IMAGE 1 revised plus a compact JPEG reference of the original as IMAGE 2 (Meta supports multi-image Chat Completions). This reuses the **one existing verification call**; additional image tokens may affect its cost. A failure preparing the original reference stops before calling the provider.
- The model is explicitly instructed to inspect visual regressions conservatively, avoid asserting defects on blurry or artistic references, and prioritize meaningful newly worsened structures. Claims in the ledger still derive from revised image and unchanged caption only.
- New **internal** pure risk-guard checks newly unsupported image claims (e.g., the owner's USB-C example), medium/high revised visual/readability/consistency issues and estimated clarity/layout deterioration. Even if no risk is found, the candidate is **NOT auto-approved**. The existing audit report shows review/possible regression and the JSON export includes `repair_review`. Original image remains available for Before/After; fields/reset preserve safeguards.
- Image regeneration is suppressed where there is no grounded image target (e.g. caption-only claims), avoiding unnecessary paid rewrites. Caption text is not edited by Muse Image.
- The guard does NOT prove pixel accuracy, originality of a product, or true causal regressions. Comparing two model impressions cannot certify safety, and downsampled original may hide small details. A human should inspect the candidate. Tests are mocked; no genuine paid Meta call was made in this development round.


## Audit archive reliability patch — 28 October 2026 (ChatGPT-authored)

Scope: data recovery, correct image file types, and no-cost read-only review within the EXISTING Audit Dossier. No new paid AI/model calls or changed Muse Code attribution.

- Export JSON retains the original/verified model observations, context, audit runs and repair-review notes. Legacy adproof-audit.json (including the owner LumaDesk 35/58 session) can be imported without replaying Meta API calls or claiming fresh audit status.
- Export package ZIP saves a strict STORE-only ZIP containing audit.json, original.png/jpg/webp, and optional revised.png/jpg/webp. After refresh, the packaged Before/After pixels can be restored. Extensions are derived from image magic bytes; the old JPEG misnamed as .webp is corrected for future downloads.
- Import report reads local files entirely in-browser. ZIP central directory, known names, CRC32, payload bounds, image signatures, and declared artifacts are validated before altering current UI. JSON import regenerates Claim DNA/X-Ray/Proof Constellation from saved model observations rather than trusting arbitrary graph topology. Old JSON files do NOT contain source pixels.
- Imported reports are READ ONLY: product fields locked, paid Audit/Repair/Verify disabled and an explicit saved-archive label. No API key or Judge Access code is written to exports. Uploading a new creative exits archive mode.
- ZIP uses uncompressed entries for broad compatibility and no new runtime dependencies. Third-party compressed ZIPs are not accepted. The browser performs all file operations without server upload.
- Tests cover legacy JSON, ZIP roundtrip, tampering/CRC, traversal, compression flags, image MIME mismatches, secrets, and 6-width Playwright import/export after reload. Existing Audit→Repair→Verify browser smoke also rechecked. See PR for release statuses.


## Continue repairing from imported archive — 28 Oct 2026

The existing read-only import had blocked all Repair/Verify actions, preventing the owner from fixing the real LumaDesk Mini 58/100 revised image after reimport. Added **explicit** Continue from original or Continue from revised controls in the existing Audit Dossier, with no new AI feature modes, no model calls on import/choice, no new infrastructure and no changes to Judge Access.

- Selecting original reuses the archived **initial audit** and original pixels as the new Repair baseline, with no initial-audit rerun (LumaDesk: 35). Selecting revised reuses the archived **verified audit** and revised pixels as the new baseline (LumaDesk: 58). Repair creative remains a separate explicit potentially paid Muse Image action, followed by a separate Verify (potentially paid Muse Spark). Verify compares the new candidate to its actual selected baseline, not the older pre-import original; score improvement is never self-certification.
- Before exiting read-only mode, the app copies the imported snapshot (both images, initial and verified audit reports, run metadata, risk assessment and context) into in-memory **history**. Its original state is not overwritten. Stage provenance is marked `archive_baseline` / `saved_archive` rather than fabricated new inference. No provider response is assumed merely from import.
- Archive package version 2 stores prior rounds under `history/roundNN-original.{jpg,png,webp}` and optional `history/roundNN-revised.*`, along with their own prior reports in the manifest. Previous version-1 ZIPs and old JSON remain readable. ZIP importer verifies every historic image name/signature, byte bounds, CRC, count and snapshot. Imported older JSON-only reports have no pixels and cannot be used to resume; the interface explains this.
- The history list shows prior round scores and which image was chosen for continuation. Max eight saved previous rounds and 48MB ZIP cap; when reaching limits, the app refuses an additional round instead of silently losing evidence. No old evidence is deleted automatically. Changed product facts/caption invalidate a reused baseline and require a genuinely new audit, but retain historical rounds for the next package.
- Mocked Node + Playwright tests cover imported LumaDesk 35→58: continue revised without paid initial audit, new repair, verify against 58 and store full 35→58 baseline; and continue original from 35. All six desktop/mobile widths and existing workflows checked. No paid Meta calls run during this patch.
