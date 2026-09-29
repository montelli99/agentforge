# AgentForge research workspace

Model selection is explicit: set `AGENTFORGE_LOCAL_MODEL` for local runs.
Runners do not choose a default model and reject Qwen routes. Historical result
artifacts retain their original model labels and are not approval for new runs.

This directory contains public, synthetic benchmark fixtures and reproducibility helpers for the AgentForge white paper. It must never contain credentials, private conversations, seller records, business data, or raw provider logs.

Owner decisions required before any charged run or publication action are listed in [`../docs/research/OWNER_APPROVAL_PACKET.md`](../docs/research/OWNER_APPROVAL_PACKET.md).

## Offline mechanics slice

Run from the repository root:

```powershell
node --import tsx research/runner/offlineSlice.ts
```

The command makes no network or model calls. It runs one intentionally correct executor and one intentionally incorrect negative control. The correct path must pass every case; the negative control must be rejected. This validates benchmark wiring and scoring only. It does not measure model quality, memory retention, token savings, cost, latency, or production reliability.

Run the memory and evidence mechanics slice:

```powershell
node --import tsx research/runner/memoryAndEvidenceSlice.ts
```

This invokes the real `SemanticMemory` and `CompletionAuditor` classes with deterministic synthetic inputs. It checks a same-tenant retrieval hit, a cross-tenant miss, and an auditor pass. It is not a fresh-process durability or model-handoff test.

Run the correction-governance slice:

```powershell
node --import tsx research/runner/correctionSlice.ts
```

This invokes the real `CorrectionRegistry`, verifies that an unapproved correction cannot become a replay case, and verifies that automatic mutation remains denied until human approval. It does not measure whether a model stops repeating an error.

Run the durable semantic-memory adapter slice:

```powershell
node --import tsx research/runner/durableMemorySlice.ts
```

This uses a temporary JSON adapter and separate writer/reader OS processes. It verifies hydration and retrieval across a restart without network calls. Production deployments still need to supply a privacy-reviewed, tenant-safe persistence adapter.

Run the model-handoff continuity slice:

```powershell
node --import tsx research/runner/handoffSlice.ts
```

This creates a synthetic completion session, starts it, constructs a replacement `CompletionEngine`, and verifies that the immutable goal, requirements, DAG, and execution state survive the handoff. It does not measure whether a model resumes the right task actions.

## Research rules

- Freeze task fixtures and scoring before charged model runs.
- Save sanitized results under `research/results/` with an experiment ID and code/config hashes.
- Treat missing provider usage or cost as unknown, never zero.
- Keep raw logs out of the public repository until they pass privacy screening.
- See `docs/research/WHITE_PAPER_EXECUTION_PLAN.md` for the complete protocol and publication gates.

Validate the dry-run pilot configuration:

```powershell
node --import tsx research/runner/validatePilotConfig.ts
```

The pilot config intentionally permits zero provider spend only. It is not authorization to start paid model runs.

Validate the six-family development fixture manifest:

```powershell
node --import tsx research/runner/validateProtocolFamilies.ts
node --import tsx research/runner/validateHeldoutProtocolFamilies.ts
```

This checks the twelve synthetic development cases, unique IDs, family coverage, and that evaluator expectations are not embedded in agent-visible input. It does not run a model or establish task quality.

The production-path smoke check is included in the full sweep and can be run directly:

```powershell
node --import tsx research/runner/productionPathSlice.ts
node --import tsx research/runner/measuredRunGuardSlice.ts
node --import tsx research/runner/contextIntegritySlice.ts
node --import tsx research/runner/correctionTransferSlice.ts
node --import tsx research/runner/workflowRecoverySlice.ts
```

It invokes the repository's `BenchmarkRunner` and the shared `TrajectoryLedger` with synthetic answers kept outside the input. It is a wiring check, not model-backed evidence.

Validate the manuscript safety gates before publishing or handing the paper to a reviewer:

```powershell
node --import tsx research/runner/validateManuscript.ts
```

This check keeps the scaffold status, explicit `NOT MEASURED` results, and incomplete-study disclosure intact until a measured run replaces them. It is a publication guard, not evidence of model quality.

Validate protocol/results consistency:

```powershell
node --import tsx research/runner/validateProtocol.ts
```

This confirms that the frozen conditions and primary outcomes named by the protocol are represented before any future result is treated as publishable.

Validate source paths cited by the capability register:

```powershell
node --import tsx research/runner/validateEvidencePaths.ts
```

This catches stale source references after refactors; it does not turn source existence into a behavior or performance claim.

Run the complete local mechanics and publication-safety sweep:

```powershell
node --import tsx research/runner/mechanicsSweep.ts
```

The sweep runs sequentially, stops on the first failed check, and makes no network or provider calls.

Synthetic fixtures are versioned under `research/tasks/`; the offline runner loads `offline-intent-v1.json` rather than embedding task data in the executable.

The sweep validates fixture structure before executing it, including unique IDs, expected-output consistency, timeouts and negative-control coverage.

Generate a reproducibility manifest for the protocol inputs:

```powershell
node --import tsx research/runner/hashProtocolInputs.ts
```

Save the output with a future run record before changing the protocol, fixtures or budget configuration.

## Owner-authorized MiMo adapter smoke

For a bounded synthetic connectivity check through the real MiMo provider adapter:

```powershell
pnpm test:research:mimo-smoke
$env:AGENTFORGE_MIMO_MODEL = 'mimo-v2.5-pro'
pnpm test:research:mimo-smoke
```

The smoke validates a required response and writes sanitized, model-specific artifacts. It does not establish pricing, comparative quality, token savings, or production performance. Billing remains `unmeasured` unless reconciled from an authoritative provider record.

### MiMo smoke matrix

Run both approved MiMo connectivity tracks in one command:

```powershell
pnpm test:research:mimo-matrix
```

The runner retries empty or invalid synthetic responses up to three times per model with a 256-token response cap and writes `research/results/mimo-adapter-smoke-matrix.json`. It remains a connectivity check; usage and billing are recorded as observed or `unmeasured`, never inferred.

Validate the combined MiMo smoke artifact:

```powershell
pnpm test:research:mimo-matrix-acceptance
```

This gate requires both approved models, a passing synthetic response, and an explicit unmeasured billing field.
