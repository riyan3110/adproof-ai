# Website format repair

The real Nori 16:9 attempts on 1 November failed because the previous format path centered a smaller copy of the complete square advertisement on a wider scene. The generator was explicitly instructed to keep that arrangement, and source compositing then restored the square even if the model tried another layout. This made copy smaller instead of designing a usable landscape advertisement.

For landscape output with a different ratio and a complex background, the client now sends the original image to Muse Image with an explicit relayout request. The server instructs it to reposition the original text groups and product independently, preserve each original text occurrence and product detail, and fill the target canvas. It no longer asks for a frozen square or overlays one on the result. Flat measurable backgrounds retain the deterministic extension path; print retains its successful source-frame path.

The new layout must pass a separate Spark comparison against the selected source. Product, typography, branding, factual claims, complete text inventory, visible defects, and readability/layout regression checks remain active. Expected composition/background changes are exempted only as already specified by format adaptation. Actual dimensions are checked against the requested ratio, while the source-ratio change remains in the measurements. Generative output requires distinct provider audit receipts and complete comparison evidence. It does not claim exact source pixels or automatic approval.

Regression coverage exercises the raw landscape image surviving without a square overlay, the server's actual outgoing prompt, correct target geometry, missing receipts, changed products, new claims, incomplete text, and unreadable copy. Existing A4, local pixel repair, archive, recovery and free-output-check coverage remains.

No fresh paid model call has been made for this change. The previous six calls, the two-call overrun incident, successful A4 download and failed Website outputs remain recorded in `evidence/live-2026-11-01/nori/format-live-manifest.json`. A fresh bounded live relayout and comparison are still required to establish the quality of an actual new Muse result. Test fixtures and source tests are not that live evidence.


## Actual follow-up: audit scope mismatch

The first live relayout after PR #65 returned complete exact copy, no product defect, clarity 95, and hierarchy 88. It was rejected solely for moving the bottle to the right and changing its fraction of the wider canvas. The audit request still carried the old composition lock, despite format validation deliberately exempting layout changes. The report is preserved in `evidence/live-2026-11-01/nori/website-relayout-scope-failed.json`; it remains a failed attempt, not a successful export.

The audit route now validates an explicit format-comparison mode and target, requires the original reference, and tells Spark that requested repositioning and canvas changes are not composition defects. Composition/background locks are exempt only in that format audit; product identity, parts, copy completeness, actual readability and visual defects remain checked. Ordinary Repair verification retains its original lock policy. Invalid comparison modes/targets fail before inference, and one comparison still uses one Spark request. 263 source tests pass with mocked upstream.
