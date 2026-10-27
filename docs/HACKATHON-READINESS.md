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
