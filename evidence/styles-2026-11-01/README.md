# Production style checks — 1 November 2026

The same fictional Nori Bottle source and saved genuine audit were imported for each test. The normal production Studio made one Muse Image edit and an independent Spark comparison per transformation. No initial audit was repeated, no provider output was mocked, and dropdown selection/import/output checking made no paid request. Product shape, composition, typography and branding stayed locked; colors, lighting and background were explicitly unlocked by Apply Style.

| Option | Observed result |
|---|---|
| Preserve Original | Local control and actual 1080 PNG passed, no new model request |
| Photorealistic | Passed model comparison and manual image inspection |
| Natural | Passed model comparison and manual image inspection |
| Studio Product | Passed model comparison and manual image inspection |
| Lifestyle | Passed model comparison and manual image inspection |
| Cinematic | Passed model comparison and manual image inspection |
| Luxury | Passed model comparison and manual PNG inspection; native ZIP not in stable artifact folder |
| Minimalist | First attempt failed an app pixel-change gate; after PR75, a subtle real edit passed independent requested-style comparison and visual inspection |
| Editorial | Passed requested-style comparison and manual image inspection |
| Vibrant | Passed requested-style comparison and manual image inspection |
| 3D / CGI | Passed requested-style comparison and manual image inspection |
| Illustration | **Manual failure:** title changed from sans-serif to serif while Typography Lock was on. The model falsely reported preservation. PR77 strengthened generation and comparison instructions; fresh post-fix live testing remains outstanding |

The Illustration JSON is intentionally the original false-positive report. Its manual failure is recorded separately, never rewritten into a model rejection that did not happen. The deployed fix is not claimed successful merely because source tests passed. New live inference is currently blocked by automatic review of the browser's secure code form: its built-in prompt incorrectly calls demo-code verification “Sign in”. No credential was submitted or recovered through another path.

[manifest.json](manifest.json) maps raw reports, native WebP images (or the actual Luxury PNG), downloaded PNG dimensions/hashes and available independent response IDs. These are application-recorded provenance, not signed provider billing receipts. Some Image response IDs/model names were not returned and remain null. Reports retain original and verification observations; ZIP import itself resets eligibility.

The first six style comparisons used the existing general lock/text/fact checks. After PR75, Minimalist through Illustration also passed the explicit requested-style context to Spark. All accepted outputs were manually inspected. One fixture cannot establish correctness for every source, lock combination or output format. The typography false positive demonstrates the continuing need for human review.

Complete local JSON/PNG/ZIP artifacts are retained in the work checkpoint; selected public image/report evidence is published here. The original Minimalist failure is retained as `minimalist-first-failed.json`. The manual Illustration assessment is `illustration-manual-review.json`.
