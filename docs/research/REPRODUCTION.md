# AgentForge mechanics reproduction

Status: `MECHANICS_VERIFIED`. This procedure runs synthetic fixtures only. It does not contact a model provider, messaging service, CRM, or private account.

## Requirements

- Node 22 or newer
- pnpm from the repository lockfile
- A clean checkout of the public repository

## Run the zero-spend sweep

From the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
node --import tsx research/runner/mechanicsSweep.ts
pnpm test:research:clean-export
pnpm test:research:review-packet
pnpm test:research:route-policy
pnpm test:research:all
pnpm test:research:source-register
node scripts/release-evidence-acceptance.mjs
```

The sweep prints the protocol, fixture and pilot configuration hashes, then runs the offline, protocol-family, held-out, accounting, production-path, measured-run guard, context-integrity, correction-transfer, workflow-recovery, memory, correction, durable-memory, handoff, pilot, protocol, evidence-path and manuscript checks. A valid run verifies Docker network denial and keeps complete network/provider call counts explicitly unmeasured. The deliberate negative control must be rejected. The production-path smoke uses the real `BenchmarkRunner` and shared trajectory ledger with evaluator answers outside agent input; it is still synthetic and is not a model result.

`pnpm test:research:all` is intentionally a zero-spend mechanics/release-evidence bundle. It includes the explicit route-policy gate and does **not** invoke the MiMo smoke matrix or any other provider-backed command. Run provider-backed connectivity checks separately, only when their route and spending authorization are in force.

## Broader verification

```powershell
pnpm test --reporter=dot
node scripts/website-link-acceptance.mjs
node scripts/website-mobile-acceptance.mjs
node website/verify-static.mjs
node scripts/public-release-readiness.mjs
pnpm audit:completion
pnpm verify:public
```

The current recorded regression is 89 test files, 494 passed and 2 skipped. The public verification bundle additionally covers product/repository privacy, the public build and package, crash recovery, network-disabled Docker acceptance, approved Docker E2E, CLI packaging and launcher persistence. Future runs must record their own output and revision; these checks are not model-quality results.

## Charged evaluation boundary

Do not run a paid or model-backed study from this document alone. First complete `NEXT_RUN_INPUTS.md`, obtain owner approval, freeze model routes, pricing, budget, reviewer and runtime, and create a new protocol/input manifest. Unknown usage or cost is recorded as `unknown`, never zero.

## Local adapter preparation

Set `AGENTFORGE_LOCAL_MODEL` explicitly before any local model smoke or pilot.
There is no default model, and Qwen routes are rejected by the runner. This
prevents a historical pilot configuration from being reused accidentally.

These commands do not spend on external APIs:

```powershell
node --import tsx research/runner/buildPilotManifest.ts
node --import tsx research/runner/localModelSmoke.ts
node --import tsx research/runner/productionAdapterSmoke.ts
```

The pilot runner checkpoints each trajectory and resumes unfinished IDs:

```powershell
$env:AGENTFORGE_PILOT_LIMIT = '1' # optional bounded slice
node --import tsx research/runner/runLocalAdapterPilot.ts
```

The current runner is an adapter pilot only. It must not be reported as the full
AgentForge B0/B1/AF study until the production adapters, approved manifest and
held-out execution gates are complete.

## MiMo adapter smoke (owner-authorized connectivity check)

The repeatable smoke validates the real MiMo adapter against a synthetic prompt and writes a model-specific artifact. It does not establish price, quality, or comparative performance.

```powershell
pnpm test:research:mimo-smoke
$env:AGENTFORGE_MIMO_MODEL = 'mimo-v2.5-pro'
pnpm test:research:mimo-smoke
```

Artifacts are written to `research/results/mimo-adapter-smoke-mimo-v2.5.json` and `research/results/mimo-adapter-smoke-mimo-v2.5-pro.json`. Do not commit credentials or treat `externalApiSpendUsd: "unmeasured"` as zero.

### MiMo smoke matrix

Run both approved MiMo connectivity tracks in one bounded command:

```powershell
pnpm test:research:mimo-matrix
```

The matrix retries empty or invalid synthetic responses up to three times per model with a 256-token response cap and writes `research/results/mimo-adapter-smoke-matrix.json`. This is connectivity evidence only; it does not establish pricing, comparative quality, token savings, or production performance.

Validate the combined MiMo smoke artifact:

```powershell
pnpm test:research:mimo-matrix-acceptance
```

This gate requires both approved models, a passing synthetic response, and an explicit unmeasured billing field.
