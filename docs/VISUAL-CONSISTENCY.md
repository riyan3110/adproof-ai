# Visual consistency and checked output — 30 October 2026

Continues production baseline `0409fb6ceaa6e173089ec8e4ebc7827acb024672` (PR #29). This implementation is ChatGPT-authored; existing genuine Muse Code ancestry is retained. No new provider, hosting, domain or Judge Access rule.

## What is implemented

- Twelve versioned style contracts, each specifying color, lighting, texture, composition and change limits. `visual-consistency-1` is shared between client and server and has a stable regression digest.
- Seven conservative locks, default ON. Priority: product identity/facts → claim safety → locks → evidenced repair → style. Settings enter the real Muse edit prompt and repair metadata. UI explains style conflicts; changing language does not translate ad copy.
- Repair rejects missing or caption-only targets before a provider request. The source stays available on request, decode or verification failure.
- Optional normalized rectangular compositing: after the model edit, the browser pastes only the selected rectangle into the original. Pixels outside that rectangle are retained from the source. This is **not model masking/inpainting**; inside the rectangle, geometry, text and seams can still be wrong. A second audit is required.
- Verify requests a separate text inventory (up to 128 lines per image), wording changes, factual support for new text and seven visual observations. It does not rely solely on the selected eight-claim ledger. Newly observed unaccounted text and unsupported claims fail the candidate, regardless of score. Extraction has coverage/uncertainty labels; it is not exhaustive OCR.
- Coarse browser image measurements compare aspect ratio, colors, luminance and border pixels. They flag risk but cannot recognize product parts or certify identity. Model-only claims of preservation are downgraded to Unable to Verify. Exact identical input bytes can establish preservation; **no candidate is automatically approved**.
- Failed candidates remain visible for comparison but cannot be selected for image export. The original stays selected. A candidate with unresolved checks requires explicit human review before output preparation.
- Output uses contain/fit and white or transparent padding, never silent cropping. Social: 1080×1080, 1080×1350, 1080×1920. Website: 1600×900, 1920×1080, 2560×1440. Print: A4/A3/A2/custom, cm/mm, 72–600 PPI. Pixel needs follow physical size × PPI. Browser limits are 8192 pixels per side and 32 megapixels; requests beyond limits are rejected.
- Browser export decodes the resulting PNG and records actual dimensions, source dimensions, interpolation method and print density. Interpolation requires explicit consent; it adds no source detail. Text/logo sharpness requires human inspection. PNG pHYs records physical density, not a print-quality guarantee. No CMYK/proofing or professional-print certification.
- ZIP/JSON preserve settings, preset version, model request/response identity, dimensions, output choices and consistency observations. Older archives remain supported. Imported verification is historical and cannot establish fresh preservation or automatically approve an image. Auth secrets are not exported/restored.

## Provider capability evidence

Official documentation reviewed 30 October 2026: <https://dev.meta.ai/docs/image-generation>.

- `/v1/images/edits` accepts reference images and edit instructions.
- `mask`, `input_fidelity` and `partial_images` are not supported. They are not sent.
- `size` controls aspect ratio; it does not promise exact pixel dimensions or print resolution. Returned image headers and browser decode determine actual dimensions.
- `tool_enablement.enable_image_search` and `tool_enablement.enable_web_search` are disabled for repair, avoiding external search as a source of invented product facts.
- No documented upscaling endpoint was established. This release offers explicitly labelled local interpolation only.

These are documented capabilities, not a new successful live-model run. Native model output resolution remains provider-dependent. Source upload dimensions, submitted source dimensions, returned model dimensions and locally composed candidate dimensions are separate metadata.

## Validation evidence (MOCK / local processing)

- `npm run check`: 163 tests pass, including all existing regression suites. Tests assert all style contracts; each lock in actual backend payload; no-target/invalid-image rejection; the previously missed “Energy-efficient LED” with a higher score and an empty ledger; no approval without evidence; bounds, safe fitting, physical sizing, PNG density and ZIP recovery.
- Chrome UI mock workflow: upload → audit 42 → repair → verify 72. Added “Energy-efficient LED” fails consistency even with no selected ledger entries. Original retained; revised export disabled.
- Chrome canvas checks: all 7,500 pixels outside a central repair rectangle preserved in a 100×100 fixture; all six presets decoded at exact dimensions; 5906×2953 print output with density before IDAT; interpolation without consent rejected; color drift measured; corrupt decode rejected.
- Browser import restored Natural style, lighting OFF, rectangular target and 100×50 cm / 150 PPI. Browser PNG download was inspected at 5906×2953. UI ZIP export reported success, but the browser automation download event did not expose the saved ZIP; binary ZIP roundtrip is verified by automated tests, not claimed as a captured browser download.
- Empty Studio layouts at 320/390/768/1280/1440/1920 widths had no horizontal overflow. English/Indonesian controls were inspected. No app JavaScript errors observed in the tested flow. A populated imported archive also had no overflow at 390 px. These checks do not establish every mobile combination.
- Reproduce explicitly isolated browser mock server with `node scripts/browser-qa.mjs --port 4173`, open `/qa`, press **Run browser pixel checks**. Test scripts and fictional fixtures are not imported by production. The QA server deliberately allows its own iframe for width testing; production framing restrictions are unchanged.

No new paid Meta call is claimed here. Fixture screenshots or scores must never be used as authentic Meta demo evidence.

## Authentic demo still required

Use one rights-cleared erroneous ad and one correct ad with complete supplied facts. One correct audit should not justify repair. For the erroneous ad, inspect every new line and locked element after Audit → Repair → Verify; record returned model identity and native image dimensions, actual failures and uncertainty. Keep original and revised ZIP, then show measured export dimensions and interpolation warning. Stop after the bounded pair; do not repeatedly spend credits to obtain a flattering result.

Official public event page rechecked: <https://events.cerebralvalley.ai/e/meta-ai-developer-hackathon> states **4 November 2026, 9 PM ET**, equivalent to **5 November 2026, 09:00 WIB**. Authenticated final submission fields, video limits, owner eligibility and waiver completion remain unverified. No X post or final submission has been sent.
