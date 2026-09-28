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

## Research rules

- Freeze task fixtures and scoring before charged model runs.
- Save sanitized results under `research/results/` with an experiment ID and code/config hashes.
- Treat missing provider usage or cost as unknown, never zero.
- Keep raw logs out of the public repository until they pass privacy screening.
- See `docs/research/WHITE_PAPER_EXECUTION_PLAN.md` for the complete protocol and publication gates.
