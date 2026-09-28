# AgentForge evaluation results

Status: mechanics-only preparation. No model-backed or paid evaluation results are reported.

## Verified local mechanics

The following checks run without network access, provider calls or paid credits:

| Slice | Evidence | Interpretation |
| --- | --- | --- |
| Offline scoring | `research/runner/offlineSlice.ts` passed the correct executor and rejected the negative control | Benchmark wiring and scoring behave as intended |
| Memory and evidence | `research/runner/memoryAndEvidenceSlice.ts` retained a same-tenant fact, rejected a cross-tenant query and passed completion auditing | Local mechanics only; not a model-quality result |
| Correction governance | `research/runner/correctionSlice.ts` rejected pending replay and denied automatic mutation | Approval boundary mechanics only |
| Cross-process memory | `research/runner/durableMemorySlice.ts` hydrated a temporary adapter in a separate reader process | Adapter boundary works in the fixture; production privacy review remains required |
| Handoff continuity | `research/runner/handoffSlice.ts` restored execution state, goal hash, requirements and DAG | State continuity only; next-action quality is unmeasured |
| Zero-spend guard | `research/runner/validatePilotConfig.ts` accepted network/provider calls disabled and estimated spend 0 | Configuration validation, not performance evidence |
| Manuscript guard | `research/runner/validateManuscript.ts` passed | Prevents premature claims from entering the scaffold |

The complete sanitized record is [`research/results/mechanics-2026-09-28.json`](../../research/results/mechanics-2026-09-28.json).

## Outcomes intentionally not measured

The following remain `NOT MEASURED` until a frozen, owner-approved model-backed study is run:

- valid success rate against matched baselines;
- false-completion rate;
- fact retention under context pressure;
- correction recurrence;
- token use or token reduction;
- provider cost per valid success;
- latency and recovery time;
- comparative performance against OpenClaw, Hermes or other systems.

No local mechanics check establishes superiority, production readiness, market leadership or novelty.

## Reproduction

Run the local checks from the repository root:

```powershell
node --import tsx research/runner/offlineSlice.ts
node --import tsx research/runner/memoryAndEvidenceSlice.ts
node --import tsx research/runner/correctionSlice.ts
node --import tsx research/runner/durableMemorySlice.ts
node --import tsx research/runner/handoffSlice.ts
node --import tsx research/runner/validatePilotConfig.ts
node --import tsx research/runner/validateManuscript.ts
pnpm typecheck
```

Charged evaluation must not begin from this file alone. Freeze model IDs, pricing, sample size, reviewer plan and a spend ceiling in `docs/research/PROTOCOL.md`, then obtain owner approval.
