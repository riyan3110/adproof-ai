# AdProof AI

**Audit → Refine → Verify.** A visual-first advertising creative inspection studio for Meta Global AI Developer Hackathon 2026.

This repository contains real application code. It is not a static mockup and does not simulate AI analysis. Calls only work when a valid Meta Model API key is configured on the server.

## Features

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

Set spend monitoring and a hard budget at your provider where supported. Any public deployment should add stronger abuse controls (user authentication, CDN-level rate limiting, per-user quotas) to protect paid API credit. The included IP rate limiter is only a minimal development safeguard. For hackathon demo, restrict access to trusted testers until proper controls exist.

## API endpoints

`GET /api/health` — non-sensitive readiness status.

`POST /api/audit` — JSON `{ image: "data:image/...;base64,...", product: "...", facts: "...", caption: "..." }`.

`POST /api/improve` — same fields plus `issues` from a prior audit.

Images are resized by the browser and sent as base64 only to the server and Meta, not stored in local files or a database.

## Known limitations

- AI scores and suggestions are estimates, **not legal compliance certification**.
- Meta Muse Image may introduce unwanted visual or text changes: always manually review the output.
- Image edits consume API credit. Image transformations may not preserve exact aspect ratio.
- API credentials and real Meta billing are not available in the coding environment here; backend endpoints are tested using a simulated *server response*, but live paid Meta calls require your key.
- Preview and actual deployment are not yet published to a URL. See `/docs` for instructions.

## Official integration references

- https://dev.meta.ai/docs/cookbook/vision-input
- https://dev.meta.ai/docs/cookbook/structured-output
- https://dev.meta.ai/docs/image-generation

## Hackathon compliance

Created October 27, 2026 during the hackathon window. This is a **new and separate project**; no AI Ads Lab repository has been changed. Publish the new code to a **public GitHub repository** for final submission and include a real demonstration video.
