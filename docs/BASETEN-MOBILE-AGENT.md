# AI coding from a phone with Baseten ($100 credit)

This is an **optional** coding workflow for the existing AdProof AI repository.
It is separate from both official Meta Muse Code (`.github/workflows/muse-code.yml`)
and AdProof's production **Muse Spark / Muse Image** inference. It does not replace
or masquerade as a Meta Muse Code contribution.

## One-time setup from a phone browser

1. Open [GitHub Actions secrets](https://github.com/riyan3110/adproof-ai/settings/secrets/actions/new).
2. Choose **New repository secret**, name it `BASETEN_API_KEY` and paste the
   private Baseten key from the hackathon email. Save. **Never paste it into
   an Issue, PR, screenshot, or committed file.**
3. Under Settings → Actions → General → Workflow permissions, enable
   **Allow GitHub Actions to create and approve pull requests** if you want
   a PR created automatically. Keep actual merge/review decisions manual.

## Run a coding task (no Linux or ZCode required)

1. Open [New Issue](https://github.com/riyan3110/adproof-ai/issues/new).
2. Title MUST begin with `[baseten] ` (example:
   `[baseten] Fix image export losing verified output after size change`).
3. In the body, describe ONE specific, reproducible bug and expected behavior.
   Click **Submit new issue**.
4. Follow [Actions](https://github.com/riyan3110/adproof-ai/actions/workflows/baseten-code.yml).
   The owner-only job uses the Baseten key on the GitHub runner, edits checked-out
   code with Aider, runs `npm run check`, and proposes a separate PR.
5. Review the diff, CI and test coverage. A PR is **not** proof of working
   image repair. Merge only once it is safe to ship.

## Continue Work from the SAME Issue #37

You do **not** need to create another Issue. From GitHub Mobile, open
[Issue #37](https://github.com/riyan3110/adproof-ai/issues/37) and add a new
owner-authored comment beginning with `[baseten] `. Each new qualifying
comment triggers **one additional, potentially charged** coding run, starting
from the latest **merged main** (not an unmerged draft PR). Do not repeat a
comment just because the GitHub UI takes time to update.

Suggested sequence (one comment per step; review and merge the previous PR
only if safe before proceeding):

1. `[baseten] Audit remaining real bugs and update a truthful hackathon readiness checklist. Review latest PRs and production evidence. Keep PASS, FAIL, and BLOCKED distinct. Make only small code/test fixes supported by evidence.`
2. `[baseten] Investigate visual consistency and image output regression gaps from the latest README and docs. Improve deterministic source safeguards and tests only; do not claim model fidelity from mocks. Produce a review-only PR.`
3. `[baseten] Prepare FINAL-HACKATHON-READINESS.md with grounded PASS/FAIL/BLOCKED evidence, precise remaining live Meta/browser test steps, honest risks, and no invented provider results.`

**Important:** Aider's GitHub runner can edit code, run Node tests, and propose PRs,
but this workflow does **not** independently operate an authenticated production
browser, call Meta Muse Image, generate original screen recordings, or submit the
hackathon. Actual live Meta/image/judge checks remain separate and must be
performed and evidenced before READY status. Baseten credits pay for AI coding,
not for ChatGPT Work or Meta Image.

## Guardrails and limits

- The model is exactly `meta-models/muse-spark-open-1026` as granted by the
  owner's hackathon email, on `https://inference.baseten.co/v1`.
- Only Issues **opened by `riyan3110`** with that title prefix invoke the agent.
- This is a single bounded Aider request, not an unattended multi-hour worker.
  GitHub Actions runner job limit is 20 minutes, but **not** a dollar spend cap.
  Inspect billing in Baseten and stop creating tasks if credit usage is excessive.
- The workflow will not automatically merge or deploy and will not invoke
  production Meta image services. Existing security, judge access and AI
  provider integrations must remain unchanged.
- `npm run check` uses a mocked upstream and does not prove live Meta image
  consistency, HD resolution, or hackathon readiness.
- If the PR creation step is blocked by GitHub settings, the proposed branch
  remains available for manual review.
- If the `BASETEN_API_KEY` secret is missing, the job stops **before** calling
  Baseten. A broken API key, model access denial or unsupported editor output
  may cause the run to fail; inspect the Actions log.
