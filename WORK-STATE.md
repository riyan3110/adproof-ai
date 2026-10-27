# AdProof AI — Project status (27 October 2026)

## Verified and deployed

- Existing repository: https://github.com/riyan3110/adproof-ai; primary branch `main`.
- Website: https://adproof-ai.vercel.app; public `/`, `/app`, `/docs` and `/api/health` checked from an anonymous Vercel Sandbox: **HTTP 200** on 27 October.
- Private demo gate: unauthenticated POST `/api/audit` and `/api/improve` both returned **HTTP 401** from an external, anonymous client.
- PRs #10, #11, #12 merged to main; #12 adds a judge code dialog and a production fail-closed rule.
- Current `/api/health`: `configured:true` and `demoGate:true`. This means configured environment variables, **not** verified provider connectivity.
- Creative Studio includes actual source integrations for Meta Muse Spark 1.3, Muse Image 1.0, visual claim ledger, before/after and re-audit flow.
- Automated tests run against a **mocked Meta provider**; no synthetic model output is included in public Studio.
- Public four-step walkthrough, honest configured label and compare-frame consistency are in the follow-up readiness PR.

## Remaining required before hackathon submission

1. Run one authorized end-to-end **real** Meta audit, image edit and re-audit using an actual advertising image and the privately shared `DEMO_ACCESS_CODE`; verify costs and errors in Meta console. Do not print or commit the code/key.
2. Capture and publish a genuine demonstration video showing the real audit findings, evidence trace, image edit and verification — **not** a mocked result.
3. Submit the project link, public source link and genuine video in the official event portal by **5 November 2026 at 09:00 WIB**.
4. Share the judge code **privately** through official submission instructions; never in GitHub/X or a public video. Keep paid anonymous API calls disabled unless durable distributed quotas and spend controls exist.
5. Test final layout in physical mobile browsers and desktop viewport; automated HTML/CSS tests do not substitute for visual review.

## Constraints

- The separate private AI Ads Lab repo is not part of this project and must remain untouched.
- Avoid unapproved vendor subscriptions, unnecessary paid Meta usage, and public API secrets.
- Public browser access is confirmed; a tested external (real-provider) audit is still outstanding.
