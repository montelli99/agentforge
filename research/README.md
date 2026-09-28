# AgentForge research workspace

This directory contains public, synthetic benchmark fixtures and reproducibility helpers for the AgentForge white paper. It must never contain credentials, private conversations, seller records, business data, or raw provider logs.

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
