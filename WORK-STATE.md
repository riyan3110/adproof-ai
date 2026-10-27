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
