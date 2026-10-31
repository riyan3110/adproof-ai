# Live production evidence — 31 October 2026 WIB

These are actual production browser runs against `https://adproof-ai.vercel.app/app`, baseline `8bb6d3b43a2b4736d47e6839a056259e556a261c`. No model response was intercepted or mocked. The images are clearly labelled fictional QA creatives made of text and simple geometry already in this project's test assets. They are test inputs, not real product advertisements or mock model outputs. No external photograph or brand logo is used.

- `case-a/audit.json`: actual initial audit → image repair → independent re-audit, with sanitized provenance.
- `case-a/original.png`: supplied fictional 1200 × 800 input with an unsupported 90% savings claim.
- `case-a/revised.webp`: actual Muse Image response, 1920 × 1280; claim removed.
- `social-1080x1080.*`: real Meta 1600 × 1600 re-composition, independently audited, exported at 1080 × 1080 by downsampling. No padding.
- `social-1080x1350.*`: real Meta 1408 × 1760 re-composition, independently audited, exported at 1080 × 1350 by downsampling. No padding.
- `production-baseline.json`: source-hash and unauthenticated gate checks, no paid calls.

Meta Image response did not include a returned model name or request ID: these are explicitly null; requested model and output SHA-256 are retained. Spark returned `muse-spark-1.3` and response IDs. Provenance is application-recorded evidence, not a cryptographically signed provider attestation. No API key or demo code is included.

Observed defects: format calls were absent from the main run ledger; changing presets discarded the only format provenance; native-resolution estimate continued to describe the pre-adaptation source; same-ratio Website presets unnecessarily discarded the paid candidate; some Judge Access labels stayed English in Indonesian UI. The focused fixes preserve bounded attempt history (including failed verification), reuse same-source/same-ratio candidates only, require fresh output review, and translate the observed labels.

This directory is technical evidence, not a declaration of submission readiness. Full results and remaining blockers belong in `FINAL-HACKATHON-READINESS.md` after final production verification. No submission or X post has been made.
