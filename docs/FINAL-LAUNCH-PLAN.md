# AdProof AI — release gate & X promotion kit (29 October 2026 WIB)

This file tracks **the existing** `riyan3110/adproof-ai`, not a proposed new product.
Current public URL: https://adproof-ai.vercel.app/app
All external claims below are conditional on verifying the live production build and original Meta provider execution.

## Release gate — no new features before this passes

- [x] PR #27 tutorial banner committed to main. At writing, the production alias **still points to an older commit**. Do not advertise the banner until the production SHA includes the change.
- [x] Current Node regression suite passes with an explicitly **mocked Meta provider**. This proves local code paths, not model reliability.
- [x] Browser/API input guard designed to reject corrupt returned image bytes before Verify; test results need checking in the release CI/browser run.
- [ ] Verify latest production alias SHA contains both the tutorial and paid-request safety changes. A 200 health response alone is **not** deployment parity.
- [ ] Test public `/`, `/app`, `/docs`, `/styles.css`, `/studio.css`, `/app.js`, `/i18n.js`, `/api/health` via an unauthenticated browser.
- [ ] Confirm the judge access code through `/api/access` **without exposing code, API key, or screenshots of secrets**.
- [ ] With the owner's authorization and a bounded provider budget, run one true `Meta Muse Spark → Muse Image → Muse Spark` sequence using a rights-cleared real creative. Save screenshots or local ZIP of actual result and provenance. Before a real paid run, confirm provider key, account credit, timeouts and service permissions; do not claim success from configuration alone.
- [ ] Review source and revised image side by side: brand, packaging, silhouette, parts/connectors, geometry, font legibility, ad copy, added or missing claims. A higher audit score **does not** mean repaired or approved.
- [ ] Confirm a caption-only issue does not invoke Muse Image; test export ZIP, new-session ZIP import, and deliberate continue-editing separately from live paid tests.
- [ ] Record a desktop walkthrough and a mobile quick check on the actual deployed URL. Show status of Meta responses and the candidate-needs-review warning; no synthetic data.
- [ ] Validate rules, category, video duration and submission portal requirements before clicking Submit. Do not treat this checklist as confirmation of eligibility.

## Release discipline — preserve Vercel Hobby quota

1. Work and run mocked tests on GitHub. Keep auto preview deployments disabled while over quota.
2. Do not trigger a deployment per screenshot, typo or minor UI adjustment.
3. Once release checks pass, deploy the final tested `main` SHA **once**. Confirm that the production alias resolves to the same SHA.
4. If deploy creation returns HTTP 402 `api-deployments-free-per-day`, do not endlessly retry or switch providers in haste. Wait for rolling 24-hour quota (not a fixed Indonesian midnight reset).
5. Rerun the production smoke after the actual alias changes. Only then share the live demo on X.

## X promotion preparation (do not publish before live validation)

### Introductory teaser — safe before full demo verification
> Building AdProof AI for the Meta AI Developer Hackathon: a visual workspace for inspecting ad claims, tracing supporting seller-provided facts, and comparing AI-assisted repair candidates. Repairs are suggestions, **not automatic approvals**. A public walkthrough is coming soon.

### Main launch post — publish only after passing the release gate
> AdProof AI is live. Upload an ad creative, inspect claims against supplied product facts, explore the evidence trail, and compare an AI-assisted repair with its original. See the limits clearly: results need human review and seller facts are not independently certified.
>
> Try the Studio: https://adproof-ai.vercel.app/app
>
> Built for the Meta AI Developer Hackathon.

Avoid claims such as *"proves authenticity"*, *"perfect repairs"*, *"100% accurate"* or *"guaranteed fraud-free"*. Add event hashtags only after confirming official organizer branding.

## Video storyboard (draft; final length must match official rules)

- **0–08 s:** Problem: an ad can contain unclear text, unsupported promises, or visual defects. Frame this as an inspection aid, not a certification.
- **08–23 s:** Upload a rights-cleared real creative, enter real product facts, show private access already verified without revealing its code.
- **23–40 s:** Trigger one *real* Muse Spark audit; reveal Claim X-Ray, Proof Constellation and findings, with explicit evidence uncertainty.
- **40–55 s:** If justified, run *real* Muse Image Repair; compare source and candidate. Call out any newly introduced flaws, including unsupported device claims.
- **55–70 s:** Run the *real* re-audit, inspect Claim DNA and candidate review warning, then export ZIP.
- **70–80 s:** Import saved ZIP locally, navigate the guide in Auto/English/Indonesian, close with the public demo URL and truthful limitation.

The timings are editable suggestions, **not** the confirmed official video specification.

## Current verification boundary

Source unit/integration tests use controlled fixtures and are not evidence of the Meta account's live access, provider billing, output accuracy or deployment currency. A past owner-observed 35→58 lamp example is useful debugging history but it demonstrated an *unsupported invented USB-C claim* and must **not** be reused as proof of successful or safe repair. Never make an advertisement out of mocked outcomes.
