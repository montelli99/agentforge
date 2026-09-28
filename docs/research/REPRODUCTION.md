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
node scripts/release-evidence-acceptance.mjs
```

The sweep prints the protocol, fixture and pilot configuration hashes, then runs the offline, memory, correction, durable-memory, handoff, pilot, protocol, evidence-path and manuscript checks. A valid run reports zero network calls and zero provider calls. The deliberate negative control must be rejected.

## Broader verification

```powershell
pnpm test --reporter=dot
node scripts/website-link-acceptance.mjs
node scripts/website-mobile-acceptance.mjs
node website/verify-static.mjs
node scripts/public-release-readiness.mjs
```

The current recorded regression is 87 test files, 483 passed and 2 skipped. Future runs must record their own output and revision; this number is not a model-quality result.

## Charged evaluation boundary

Do not run a paid or model-backed study from this document alone. First complete `NEXT_RUN_INPUTS.md`, obtain owner approval, freeze model routes, pricing, budget, reviewer and runtime, and create a new protocol/input manifest. Unknown usage or cost is recorded as `unknown`, never zero.
