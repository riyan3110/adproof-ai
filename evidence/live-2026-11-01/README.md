# Actual Meta tests — 1 November 2026 (WIB)

Baseline production: `7b1cb50a7ee5d8533222f51e9a3d871c553e5133`.

The owner-provided photographic LumaDesk source and its historical product facts were uploaded to the actual authenticated production Studio. No API response was intercepted or mocked. `lumadesk/initial.json` and `lumadesk/repair-stopped.json` were downloaded through the actual Studio export controls.

- Fresh Muse Spark audit returned `muse-spark-1.3`, score 58, eight observed claims, and 12,955 total tokens. Application provenance retains the provider-returned response ID.
- One fresh localization returned `muse-spark-1.3` and 6,224 total tokens. Repair stopped without producing an image. This is a failure record, not a successful Repair or Muse Image result.
- The actual OCR inventory splits `Save up to` / `90% Electricity`, `Protect` / `Your Eyes`, and `Better Sleep` / `in 7 Days`, while the factual ledger identifies each entire assertion. The old local-plan validator rejects every complete assertion because it requires one identical OCR line. The new regression uses these actual observations and checks exact consecutive whole-line matching, product exclusion, source-only replacements, and complete target coverage.
- This evidence is application-recorded provenance, not a cryptographically signed billing receipt. Model scores do not establish image quality. Fresh post-fix image output and independent verification must still be inspected and recorded.

The unit/API regressions in `tests/multiline-localization.test.mjs` deliberately mock their provider response; they do not represent additional live calls.
