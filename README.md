# AdProof AI

**Advertising Claim Verification & Repair Engine.** Detect → Verify → Repair → Prove. Visual Proof Intelligence Studio for Meta Global AI Developer Hackathon 2026; preserves the Audit → Refine → Verify workflow.

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
- Actual re-audit of the edited image, before/after compare slider, score changes.
- Download revised image and JSON audit report.
- Complete help at `/docs`; no login/database/tracking by this application.
- Server-side API key protection, strict data limits, same-origin API, no saved uploads.

## Run locally

Node.js **20+** only, no extra packages required.

```bash
cp .env.example .env
# Update MODEL_API_KEY=... in .env
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
| `PORT` | Optional HTTP server port (defaults to 3000) |
| `META_MODEL` | Optional override for Muse Spark version (defaults to muse-spark-1.3) |

Meta API base URL: `https://api.meta.ai/v1`.

## Deploy

Use a Node.js web hosting service supporting a persistent HTTP process (Render, Railway, Fly.io, VPS, etc.). Set the start command to `npm start` and `MODEL_API_KEY` to a server-side secret. **Do not deploy as static-only HTML:** that would expose credentials or break the API.

Set spend monitoring and a hard budget at your provider where supported. Any public deployment should add stronger abuse controls (user authentication, CDN-level rate limiting, per-user quotas) to protect paid API credit. The included IP rate limiter is only a minimal development safeguard. The current production implementation requires a secret demo access code for paid routes and fails closed when that code is absent. This is not a durable, multi-instance spending quota.

## API endpoints

`GET /api/health` — non-sensitive readiness status.

`POST /api/audit` — JSON `{ image: "data:image/...;base64,...", product: "...", facts: "...", caption: "..." }`.

`POST /api/improve` — same fields plus `issues` from a prior audit.

Images are resized by the browser and sent as base64 only to the server and Meta, not stored in local files or a database.

## Known limitations

- AI scores and suggestions are estimates, **not legal compliance certification**.
- Meta Muse Image may introduce unwanted visual or text changes: always manually review the output.
- Image edits consume API credit. Image transformations may not preserve exact aspect ratio.
- Production reports both a configured Meta API key and a private access gate, but the connector does not verify credentials against the Meta provider. Automated tests use mocked external provider responses; live paid calls need authorized operator testing.
- Production is deployed at https://adproof-ai.vercel.app/ . Browser-accessible homepage, Studio, docs and API health returned HTTP 200 in an anonymous external smoke test on 27 October 2026. Both paid API routes returned HTTP 401 without the private demo code.
- Real end-to-end Meta API calls (Audit → Refine → Verify) have **not** been independently executed and validated; installed credentials and a successful health response are not proof of provider success. Test with the private demo code before producing an authentic submission video.
- Public browsing does not run paid models. A public four-step guide is displayed without fictional audit results.

## Official integration references

- https://dev.meta.ai/docs/cookbook/vision-input
- https://dev.meta.ai/docs/cookbook/structured-output
- https://dev.meta.ai/docs/image-generation

## Hackathon compliance

Created October 27, 2026 during the hackathon window. This is a **new and separate project**; no AI Ads Lab repository has been changed. Public repository: https://github.com/riyan3110/adproof-ai . A real demonstration video and final hackathon submission are still required.

## Evidence and readiness

See [compliance audit](docs/HACKATHON-COMPLIANCE.md), [readiness and authentic demo](docs/HACKATHON-READINESS.md), and [claim engine](docs/CLAIM-PROOF-ENGINE.md). Muse Code core contribution and ChatGPT integration/fixes are separately attributable. Automated mocks are not a completed live Meta demo.
