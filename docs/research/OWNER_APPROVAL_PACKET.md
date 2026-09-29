# Owner approval packet

Status: delegated local-study decisions recorded in `OWNER_DECISIONS_AND_NEXT_ACTIONS.md`. That record authorizes local model smoke and development pilot after implementation acceptance, with USD 0 external API spending. The blank template remains a reusable template and must not pause the active local implementation sequence.

This packet does not read, select, or authorize any credential merely because a credential exists on the machine. A route becomes eligible only after the owner supplies the route identity, dated pricing, hard ceiling, disposable runtime and reviewer decisions below.

## Locally discovered route candidates (not approved)

On 2026-09-28, the local Ollama endpoint at `127.0.0.1:11434` responded to a read-only model inventory request. Available names included `mistral:7b-instruct`, `qwen2.5-coder:7b`, `phi3.5:latest`, `gemma4:e4b`, `qwen3.5:2b`, `qwen3-vl:2b`, `llama3.1:8b`, `qwen3:3b`, `qwen2.5:3b`, and `qwen3:1.7b`, plus cloud-tagged entries. This inventory is availability evidence only; it does not authorize a model-backed run, establish quality, or establish pricing. The owner must choose exact routes and whether local inference is acceptable before the pilot manifest is frozen.

The local preparation, privacy gates, package checks and zero-spend mechanics track are complete. Before any charged study or publication action, confirm the following:

1. **Model routes:** model IDs and provider routes for B0, B1, AF and approved ablations.
2. **Pricing:** dated price sources, currency and treatment of cached input, output and helper-model usage.
3. **Budget:** pilot replicate count and a hard total spend ceiling.
4. **Review:** named human reviewer for safety failures, false completions and a random success sample.
5. **Runtime:** disposable supported runtime for production-path acceptance.
6. **Publication:** author list, affiliations, AI-use disclosure, paper/data licenses and whether to prepare Zenodo, arXiv or TMLR materials.

Once these decisions are recorded, freeze the protocol/input manifest, run the approved pilot, reconcile provider usage, and update `RESULTS.md` and `paper.md` only from sanitized artifacts. Do not infer zero cost or success from missing usage data.

See `NEXT_RUN_INPUTS.md`, `PROTOCOL.md` and `SUBMISSION_CHECKLIST.md` for the governing details.

The workload baseline and spend-ceiling formula are recorded in `PAID_RUN_ESTIMATE.md`. It uses the completed local pilot for sizing only; it does not authorize provider spend.

The machine-readable companion template is `research/config/owner-approval-template.json`. It intentionally contains null decisions and false authorization flags until the owner explicitly fills and approves them.

## Owner-authorized smoke result (2026-09-29)

MiMo Pro (mimo-v2.5-pro) completed one capped smoke request through the real adapter: 2,694 ms and 67 provider-reported tokens. This confirms the route works; it does not authorize or establish the full comparative study.

### Fresh repeatable smoke checks (2026-09-29)
`pnpm test:research:mimo-smoke` passed for `mimo-v2.5` (299 provider-reported tokens) and `mimo-v2.5-pro` (326 provider-reported tokens). The runner validates the required synthetic response and writes model-specific artifacts under `research/results/`. These remain connectivity/smoke checks only: external billing is unmeasured, no comparative quality claim is made, and no production or publication authorization is implied.

### Combined MiMo smoke matrix (2026-09-29)

`pnpm test:research:mimo-matrix` passed both approved tracks in one run. The matrix artifact is `research/results/mimo-adapter-smoke-matrix.json`; the runner used up to three bounded retries for empty or invalid synthetic responses. This remains connectivity evidence only, with billing explicitly `unmeasured` and no comparative performance claim.
