# AdProof AI

**Advertising Claim Verification & Repair Engine.** Audit → Repair → automatic Verify, with source inspection, claim lineage and checked image export. Built for Meta Global AI Developer Hackathon 2026.

**Status — 1 November 2026:** the core production demo has authentic Meta results and actual downloaded PNG/ZIP evidence. The final submission package is still incomplete: no final demo video or acceptance receipt is recorded, authenticated portal requirements remain unverified, and not every visual style/output combination has been individually live-tested. See [current readiness](docs/HACKATHON-READINESS.md) and [real production evidence](evidence/live-2026-11-01/README.md).

This repository contains real application code. It is not a static mockup and does not simulate AI analysis. Calls only work when a valid Meta Model API key is configured on the server.

## Features

- Claim DNA Evolution: conservative, auditable claim matching across original/revised audits.
- Proof Constellation: interactive source-traceable claim, quotation, assessment and repair links.
- Claim X-Ray panel: inspect the real source image without invented bounding boxes.

- Premium, responsive, minimal-text landing page and studio.
- Drag-and-drop image upload (PNG/JPEG/WebP, up to 6 MB).
- Grounded multimodal audit with **Meta Muse Spark 1.3**.
- Issue findings with evidence, severity, and actionable recommendations.
- Actual image editing with **Meta Muse Image 1.0** (not a simulated change).
- Automatic re-audit of the edited image, original/reference comparison, before/after slider and conservative regression checks. A specifically diagnosed failed comparison can trigger at most one additional edit/Verify pair.
- Twelve visual style options, seven consistency locks and optional local rectangle compositing. Applying a style invokes editing and independent verification; changing the dropdown alone does not call Meta.
- Social Media, Website and Print PNG exports, actual native-pixel/PPI checks and explicit AI composition adaptation. Interpolation adds no native detail.
- JSON reports and image+report ZIP archives, local import, explicit continuation and one-call verification of a saved original/revision pair without new image generation.
- Complete help at `/docs`; no login/database/tracking by this application.
- Server-side API key protection, strict data limits, same-origin API, no saved uploads.

## Run locally

Node.js **20+** and the dependencies installed by `npm ci`, including local OCR.

```bash
npm ci
cp .env.example .env
# Set MODEL_API_KEY and DEMO_ACCESS_CODE in .env
node --env-file=.env server.mjs
# Open http://localhost:3000
```

Run tests:

```bash
npm run check
```

## Environment variables

| Variable | Purpose |
|---|---|
| `MODEL_API_KEY` | Required. Meta Model API key, stored only on server |
| `DEMO_ACCESS_CODE` | Required for production paid routes. Private judge/demo code; never put it in public URLs, reports or videos |
| `PORT` | Optional HTTP server port (defaults to 3000) |
| `META_MODEL` | Optional override for Muse Spark version (defaults to muse-spark-1.3) |

Meta API base URL: `https://api.meta.ai/v1`.

## Deploy

Use a Node.js web hosting service supporting a persistent HTTP process (Render, Railway, Fly.io, VPS, etc.). Set the start command to `npm start` and `MODEL_API_KEY` to a server-side secret. **Do not deploy as static-only HTML:** that would expose credentials or break the API.

Set spend monitoring and a hard budget at your provider where supported. Any public deployment should add stronger abuse controls (user authentication, CDN-level rate limiting, per-user quotas) to protect paid API credit. The included IP rate limiter is only a minimal development safeguard. The current production implementation requires a secret demo access code for paid routes and fails closed when that code is absent. This is not a durable, multi-instance spending quota.

## API endpoints

`GET /api/health` — non-sensitive readiness status.

`POST /api/access` — verifies the private demo code without a model call.

`POST /api/audit` — JSON `{ image: "data:image/...;base64,...", product: "...", facts: "...", caption: "..." }`.

`POST /api/improve` — same fields plus `issues` from a prior audit.

`POST /api/localize` — source-bound text localization used by the Repair workflow when needed; the route is protected by the same demo gate.

Audit images are resized by the browser and sent as base64 to the server and Meta. The application has no server-side image database. A browser checkpoint can retain the last session on the device for up to 24 hours; downloaded JSON/ZIP/PNG files are separate user-managed copies.

## Known limitations

- AI scores and suggestions are estimates, **not legal compliance certification**.
- Meta Muse Image may introduce unwanted visual or text changes: always manually review the output.
- Image edits consume API credit. Image transformations may not preserve exact aspect ratio.
- A configured key or accepted demo code alone is not proof of model execution. Indicators record actual model responses separately. Code tests use mocked upstream responses; browser replay, genuine production calls and visual review are identified separately in the evidence.
- Production: https://adproof-ai.vercel.app/ . The 1 November release passed source tests and public browser checks at desktop/mobile widths. Paid routes reject requests without accepted private access.
- Genuine production results include ARUNA claim repair with a fresh independent comparison and actual 1080×1080 PNG/ZIP downloads; NORI Website 1600×900 and 1920×1080 exports without interpolation; and A4 output at target 150 PPI. See [response provenance, failures and files](evidence/live-2026-11-01/README.md). Application-recorded provenance is not a signed provider billing receipt, and these cases do not establish universal model accuracy.
- Not every one of the 12 visual style options or every style/lock/output combination has been live-tested individually. Failed or uncertain results are retained for review, rather than represented as successful output.
- Public browsing does not run paid models. A public four-step guide is displayed without fictional audit results.

## Official integration references

- https://dev.meta.ai/docs/cookbook/vision-input
- https://dev.meta.ai/docs/cookbook/structured-output
- https://dev.meta.ai/docs/image-generation

## Hackathon compliance

Created October 27, 2026 during the hackathon window. This is a **new and separate project**; no AI Ads Lab repository has been changed. Public repository: https://github.com/riyan3110/adproof-ai . A real demonstration video and final hackathon submission are still required.

## Evidence and readiness

See [compliance audit](docs/HACKATHON-COMPLIANCE.md), [readiness and authentic demo](docs/HACKATHON-READINESS.md), and [claim engine](docs/CLAIM-PROOF-ENGINE.md). Muse Code core contribution and ChatGPT integration/fixes are separately attributable. Automated mocks are not a completed live Meta demo.


## Visual consistency and checked export

The existing Studio now includes versioned styles, seven consistency locks, optional rectangle compositing, text-inventory and visual change verification, and exact-sized PNG export for Social Media, Website and Print. Failed checks retain the original; scores never approve a candidate. Enlargement is explicitly labelled interpolation, not new detail. See [implementation, provider evidence, validation and limits](docs/VISUAL-CONSISTENCY.md).
