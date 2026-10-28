# Hackathon compliance audit — 28 October 2026 (WIB)

**Overall: NEEDS VERIFICATION. This is an evidence register, not eligibility certification or a completed submission.** Rules were examined before source changes in this upgrade. Repository baseline: `df530267b14922bcf2b65b414720539d198261c2` (PR #13).

## Sources and evidence hierarchy

- [M — Meta event](https://dev.meta.ai/events/global-hackathon)
- [C — Organizer event](https://cerebralvalley.ai/e/meta-ai-developer-hackathon)
- [R — Hackathon Terms & Conditions (Official Rules) and Event Waiver](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver), document dated 25 October 2026. Read from the official page's embedded structured document after the search renderer showed only Loading. This is the rules document, not a third-party summary.
- [S — Official submission portal, linked in R](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit). Public HTML did not expose authenticated submission fields. Do not confuse application questions with final submission requirements.
- [D — Meta API overview](https://dev.meta.ai/docs/overview), [structured output](https://dev.meta.ai/docs/cookbook/structured-output), [image editing](https://dev.meta.ai/docs/image-generation).
- User screenshot `1000068223(3).jpg`: organizer presentation headed “Skip these overdone projects”, including simple image analyzers, dashboards as the main feature and basic RAG. Supporting presentation advice, not itself a disqualification rule. Only this relevant screenshot was recovered/read; the full earlier 13-image set has not been established as complete.

## Requirements register

PASS means the specific stated check has evidence, not that the entire entry is eligible. Absence of a clause in retrieved rules does not establish permission if participant-only instructions add requirements.

| Requirement / source | Status | Available evidence | Gap / corrective action |
|---|---|---|---|
| Accepted application and accurate participant details (R) | NEEDS VERIFICATION | User previously reported acceptance | Confirm accepted account, identity and signed rules in portal; no account action taken |
| At least 18 AND local age of majority (R) | NEEDS VERIFICATION | No age evidence inspected | Participant confirms both conditions privately |
| Eligible jurisdiction and no sanction/excluded affiliation (R) | NEEDS VERIFICATION | Indonesia is not in the named exclusion list | Residence alone is insufficient; participant must confirm sanctions, employer/government/family exclusions |
| One track per participant/project (R) | NEEDS VERIFICATION | No registration change made | Confirm current selected track before submitting |
| Indie: individuals/students or teams up to four; authorized representative and all members named (R) | NEEDS VERIFICATION | Appears to be a personal project | Recommended track: **Indie Developer**, conditional on personal eligibility/team size; do not change registration automatically |
| Startup: technical founders; representative is active startup employee and authorized for notices/prize (R) | NEEDS VERIFICATION | Production deployment exists | Deployment does not establish startup employment or authorization. Previous unconditional Startup positioning removed |
| Event window: begins 26 October; submissions 4 November 21:00 ET (M/C) | PASS | Git root 27 October 2026 14:00:41 WIB; initial implementation 07:06:33 UTC | All observed repo commits are after start date; exact window/admissibility governed by current organizer instructions |
| Deadline conversion (M/C) | PASS | 4 November 2026 21:00 America/New_York = 5 November 02:00 UTC = **09:00 Asia/Jakarta** | Recheck before submission; do not rely on portal internal grace settings |
| Existing-project allowance / required new-work proportion | NEEDS VERIFICATION | R requires original work but retrieved text gives no specific pre-existing-project policy | Repo started during event; preserve full history and identify any reused material. Confirm any additional FAQ/invite instruction |
| Original ownership and no third-party IP/privacy/contract violation (R) | NEEDS VERIFICATION | Real Git source, no bundled third-party runtime packages | Participant must confirm source and uploaded creative rights; no creative licensed for a live demo was supplied this turn |
| Open-source components allowed if licenses respected and enhanced (R) | PASS | Dependency-free runtime; no added third-party assets | Keep dependency/license review if packages added |
| Public repo / mandatory open-source license | NEEDS VERIFICATION | GitHub metadata confirms public repository; no LICENSE found | R retrieved text does not mandate a public repository or specific license; verify S/participant-only instructions. Public is not synonymous with open-source licensed |
| Build with Meta AI products (R/M/D) | PASS | Source integrates Spark 1.3 multimodal structured audits and Image 1.0 edits | This PASS is source integration only; live end-to-end execution remains unproven |
| Muse Code usage and minimum contribution/beyond other AI agents | NEEDS VERIFICATION | Genuine official CLI run and resulting commit verified below | No numeric minimum or exclusive-agent rule located in R/M. Verify participant instructions; do not claim all code was made by Muse |
| Judging criteria and weights (R) | PASS | Impact 30%; Meta AI Tooling 25%; Technical Depth & Execution 20%; Demo 25% | These are project judging weights; application scoring is separate |
| Anti-project presentation | NOT APPLICABLE | Screenshot says skip overdone projects; no prohibition located in R | Treat as differentiation guidance. Product now needs evidence graph + claim lineage + real repair/reaudit, not just image score |
| Final portal (R) | PASS | S linked explicitly by Official Rules | Preparing docs does not submit anything |
| Description, application URL, repository URL, evidence fields (S) | NEEDS VERIFICATION | App/repo URLs known; draft details in readiness doc | Authenticated final form fields not inspected; verify before entry |
| Working demo and quality demo video (R judging) | NEEDS VERIFICATION | Public application; regression tests | Authentic Meta audit/edit/reaudit and final recording still required |
| Required video length/format | NEEDS VERIFICATION | No duration found in retrieved R | Three minutes is a proposed storyboard, **not a verified official limit** |
| X post / Most Viral bonus rules (R) | NEEDS VERIFICATION | R permits optional bonus categories, including most viral; organizers determine allocation | No specific X requirement/hashtag/scoring located in R. Confirm announcement before publishing; no post authorized or made |
| Final submission acceptance/receipt | FAIL | No receipt | User must approve/perform final submission explicitly; not performed by this task |
| Signed rules, organizer license and recording/privacy provisions (R) | NEEDS VERIFICATION | Rules inspected | Participant acceptance cannot be inferred from reading; submit only material rights can be granted for |
| Prize tax/payment verification (R) | NOT APPLICABLE | No winner/prize claim made | If selected, supply applicable forms privately through official channels |

## Genuine Muse Code provenance

Strong verified chain for the earlier Studio contribution:

- [Issue #9](https://github.com/riyan3110/adproof-ai/issues/9) contains original coding instructions.
- [Run 40497541084](https://github.com/riyan3110/adproof-ai/actions/runs/40497541084), job 122166689353: official install from `https://dev.meta.ai/install.sh`; `muse exec` under the repository's existing workflow; real file changes; external validation step passed 27 tests; push completed.
- [Commit 963e543](https://github.com/riyan3110/adproof-ai/commit/963e543de31dadda73e738f866e9946017f04a72): actual Studio HTML/CSS/JS and test changes produced by that run; merged through [PR #11](https://github.com/riyan3110/adproof-ai/pull/11).
- The Muse sandbox itself could not run shell (`bwrap` restriction), but file edits succeeded and the following workflow validation executed tests outside that agent sandbox. Logs corroborate this; do not misrepresent Muse's own test execution.
- PR #11's later claim-evidence additions are explicitly ChatGPT-authored. PR #10 backend evidence ledger and PR #12/#13 access/readiness changes also disclose ChatGPT authorship.
- Earlier commits `5f3ba887`, `211b4b67`, `39bb700e` and related issues #2/#4/#6 are additional provenance leads, not all independently log-audited in this turn.
- [Issue #14](https://github.com/riyan3110/adproof-ai/issues/14) requests a genuine bounded Muse Code implementation of the new claim engine. Run [40552300687](https://github.com/riyan3110/adproof-ai/actions/runs/40552300687), job 122358995705, executed official Muse Code and created [91eb887](https://github.com/riyan3110/adproof-ai/commit/91eb887) with the real engine and tests (809 added lines). The external validation reported one matching regression despite an overall workflow success; ChatGPT tightened lexical overlap and added regressions afterward. The original Muse commit is retained as an ancestor, not rewritten. Logs, file diff and subsequent local tests were reviewed.

No author metadata was rewritten. ChatGPT integration/review changes remain attributed separately. Even verified Muse execution does not establish any unspecified competition minimum.

## Source API review and live-test boundary

`muse-spark-1.3`, `muse-image-1.0`, `https://api.meta.ai/v1/chat/completions`, strict `response_format.json_schema`, multimodal `image_url`, and JSON `images` for `/images/edits` match D. Mock tests demonstrate contracts and failure handling, not provider availability. Private Judge Access and production fail-closed behavior remain required. No decrypted production key or judge code was retrieved. A health response saying configured is not proof of a paid call. No live paid E2E is claimed.

## Focused follow-up — 28 October 2026 (WIB)

Rechecked the official Meta event page and organizer event/submission URL during the final Studio upgrade. The public deadline remains 4 November 21:00 ET (5 November 09:00 WIB); no new public video-duration requirement was exposed by the submission page. Authenticated form details, personal eligibility and registered track remain NEEDS VERIFICATION. Existing source-integration and genuine Muse history evidence is unchanged. New browser screenshots are explicitly mocked regression evidence, not an authentic provider demo. No final submission or social post was made.
