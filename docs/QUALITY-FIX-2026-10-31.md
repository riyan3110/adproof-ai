# Quality fix — PR #47

Continues main `3c43e21`; no redesign, new project, credential change, submission or X post.

| Area | Change | Verification and remaining limit |
|---|---|---|
| Repair | Automatic source-grounded text regions; deterministic text rendering on measured solid backgrounds, otherwise generated regions composited into the original. Correct source pixels outside edits stay unchanged. | Actual Chromium test: **0 changed pixels outside the correction**, 6,047 changed inside; original 5 W text retained. Meta localization and complex photographic LumaDesk repair still require a fresh authenticated model run. |
| Caption | Meta selects complete fact lines; deterministic validation rejects invented wording and negation slicing. Source-only fallback is automatic. Corrected caption goes to Verify/copy/ZIP; original remains in context/history and original-caption.txt. | Actual historical LumaDesk caption is corrected in `evidence/quality-2026-10-31/luma-caption.json`. This is deterministic correction of historical inputs, **not new Meta inference**. |
| Lock | Full decoded-pixel comparison outside actual edit rectangles, protected-region exclusion, complete-text re-audit and unresolved-claim blocking. No approval from score alone. | Chromium + mocked provider reports pass local validation and bounded correction/reload recovery. Generic unlocalized edits stay ineligible for final export. Imported archives do not inherit automatic approval. |
| Output | Source-preserving flat-background extension; generated surrounding scenes restore the full reference with no source upscaling and reject large seam discontinuities. Preview/export share the actual PNG. Print dimensions and pHYs remain physical-size/PPI based. | Chromium raster tests pass 1:1→16:9 **1600×900**, 1:1→9:16 **1080×1920**, 16:9→1:1 **1080×1080**; A4/150 PPI **1240×1754**. Downloaded PNG pixels match preview and all alpha is opaque. These ratio fixtures are not authentic new Meta generations. |

Source + API regression: **202 tests pass**, mocked upstream. Browser evidence: [run 41201224457](https://github.com/riyan3110/adproof-ai/actions/runs/41201224457), artifact `source-bound-pixel-evidence`. Additional reference-frame restoration/seam assertions are run on the final PR head before merge.

## Genuine Meta boundary

The original 28 October LumaDesk ZIP was recovered and inspected. It contains a photographic creative, supplied 5-watt/USB 5V facts and the original unsupported savings/eyes/sleep caption. Its prior repair also introduced unsupported USB-C. No old model result is represented as a new paid run.

Server health confirms MODEL_API_KEY and the private demo gate remain configured. This fresh Work executor has neither credential variable, and the browser session has no verified Judge Access code. No secret was decrypted or extracted from deployment configuration. Fresh Spark→Image→Spark testing of photographic LumaDesk and a second real creative remains blocked on authentication in this session.

## Native detail / print boundary

There is **no configured genuine super-resolution provider**. Muse Image's documented size parameter selects ratio, not exact native pixels; mask input is unsupported. Source restoration prevents generative damage but does not create product detail. Interpolated output remains explicitly classified as such, and professional print quality is not certified. Complex photographic print adaptation and a verified source-detail enhancement remain unresolved.

Official reference: https://dev.meta.ai/docs/image-generation (checked 31 October 2026). Deployment READY is not proof of model output quality. Final hackathon readiness remains **NOT READY** until genuine post-change inference and native-detail requirements are evidenced.

Legacy continuation follow-up (PR #48): an imported older audit with no caption_repair field now derives the corrected caption before Repair/Verify, retaining its original caption and reusing the successful initial audit. No extra model request is introduced.
