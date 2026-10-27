# Studio browser QA — 28 October 2026

**All AI responses and creative images in these captures are TEST FIXTURES. They are not live Meta results and must not be used as an authentic hackathon demo.** Private access in the tests uses a made-up local fixture code, not the production judge code. No secrets are visible in screenshots.

| Capture | What was checked |
|---|---|
| [1920 desktop](empty-1920.png) | Initial composition, visible functional modules and canvas |
| [1440 desktop](empty-1440.png) | Initial composition and public empty states |
| [1280 laptop](graph-1280.png) | Responsive node layout and selected evidence |
| [768 tablet](graph-768.png) | Evidence graph and detail stacking |
| [390 mobile](xray-390.png) | Actual source selection, claim and evidence details |
| [320 mobile](graph-320.png) | Graph readability, touch controls and no overflow |
| [Claim DNA](dna-1440.png) | Expandable original/re-audit observations |

Machine-readable files: [six viewport flow](browser-results.json), [error recovery](error-results.json). Screenshots were visually inspected. Existing scripts/browser-smoke.cjs reproduces the flows with Playwright installed as a development tool. Use ADPROOF_SCREENSHOT_DIR to save all four modes at each viewport. Optional ADPROOF_TEST_PROXY uses the environment proxy for remote Preview checks; ignoreHTTPSErrors is enabled only for that controlled proxy test environment and is not a production setting.

No JS or unexpected console errors, no horizontal overflow; exact request counts, stage linkage, exported report, stale-data clearing and DOM count are checked. Heap reporting is approximate Chromium JS heap only; it does not establish total browser/process memory.
