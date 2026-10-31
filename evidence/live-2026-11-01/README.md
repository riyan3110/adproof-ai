# Actual Meta tests — 1 November 2026 (WIB)

Baseline production: `7b1cb50a7ee5d8533222f51e9a3d871c553e5133`.

The owner-provided photographic LumaDesk source and its historical product facts were uploaded to the actual authenticated production Studio. No API response was intercepted or mocked. `lumadesk/initial.json` and `lumadesk/repair-stopped.json` were downloaded through the actual Studio export controls.

- Fresh Muse Spark audit returned `muse-spark-1.3`, score 58, eight observed claims, and 12,955 total tokens. Application provenance retains the provider-returned response ID.
- One fresh localization returned `muse-spark-1.3` and 6,224 total tokens. Repair stopped without producing an image. This is a failure record, not a successful Repair or Muse Image result.
- The actual OCR inventory splits `Save up to` / `90% Electricity`, `Protect` / `Your Eyes`, and `Better Sleep` / `in 7 Days`, while the factual ledger identifies each entire assertion. The old local-plan validator rejects every complete assertion because it requires one identical OCR line. The new regression uses these actual observations and checks exact consecutive whole-line matching, product exclusion, source-only replacements, and complete target coverage.
- The same line/claim mismatch affected Verify: deleting an unsupported multi-line assertion was treated as unexplained removal of correct typography. Verify now accounts for complete exact source spans. Harmless OCR wrapping does not count as added/removed copy; altered numbers, omitted negation, reordered words, genuinely new copy and removal of supported branding still fail the relevant checks.
- This evidence is application-recorded provenance, not a cryptographically signed billing receipt. Model scores do not establish image quality. Fresh post-fix image output and independent verification must still be inspected and recorded.

The unit/API regressions in `tests/multiline-localization.test.mjs` deliberately mock their provider response; they do not represent additional live calls.

## Nori — actual Muse Image style and independent Verify

`nori/original.png` is an explicitly labelled fictional QA input with a flat background. Actual production Audit → Cinematic style → automatic Verify completed using the configured Meta endpoints. `nori/revised.webp` is the actual 1600×1600 Muse Image output; `nori/styled.json` is the actual downloaded report. No upstream response was intercepted. Muse Image did not return a model name or response ID; those remain null, while its requested model and output SHA-256 are recorded. Both Spark calls returned `muse-spark-1.3` and distinct response IDs.

The output was visually inspected: artwork changed to a photographic textured scene, source copy stayed readable, capacity remained 500 mL, and the green bottle/black cap remained recognizable. The independent Meta comparison reported complete text, preserved active locks, no new/removed copy, no visual issues, and no blocking risks. Baseline export nevertheless remained blocked because the application accepted only exact source-pixel proofs. Its Revisions/Compare tabs also stayed disabled, and automatic evidence-panel rendering could switch the main canvas away from the selected view.

The correction distinguishes two validation bases: decoded source-pixel comparison, and complete independent reference-based Meta comparison backed by distinct model receipts plus measured dimensions. Only the former claims source-pixel preservation. The latter leaves `auto_approved` false, labels matching locks as model observations, retains limitations, and permits output only without factual/visual findings, missing text, changed active locks or malformed dimensions. No score-only approval is added. Imported archives still cannot restore automatic approval.

Style results now enable Revisions/Compare, passive proof/language/resize rendering preserves the main canvas view, and a passing verification selects the revision for export. `scripts/style-browser.cjs` replays the recorded Nori images/reports in actual Chromium at desktop/mobile widths and checks a real 1080×1080 PNG download with the styled background. This is explicitly replay evidence, not fresh inference. A fresh post-release verification and production PNG export remain part of the live test.
