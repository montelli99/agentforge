# AgentForge evaluation results

Status: mechanics-verified preparation with a bounded exploratory local-model pilot. No paid or publication-grade comparative evaluation is reported.

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
| Held-out fixture guard | `research/runner/validateHeldoutProtocolFamilies.ts` accepted 6 families and 60 cases with evaluator data isolated | Fixture integrity only; no held-out model output was generated |
| Measured-run guard | `research/runner/measuredRunGuardSlice.ts` accepted explicit measured configuration and rejected a mock/synthetic route | Dispatch guard only; no provider route was contacted |
| Correction transfer guard | `research/runner/correctionTransferSlice.ts` rejected pending replay, transferred an approved replay case, and denied automatic mutation | Governance mechanics only; model recurrence remains unmeasured |
| Workflow recovery guard | `research/runner/workflowRecoverySlice.ts` reported an unresolved blocker and refused execution readiness | Recovery mechanics only; no model repair or external effect was attempted |
| Manuscript guard | `research/runner/validateManuscript.ts` passed | Prevents premature claims from entering the scaffold |
| Public controller evidence gate | `src/server/completionRoutes.test.ts` routed incomplete worker evidence through the public completion API and persisted `failed` with `verifiedPassed: false` | Controller-path safety mechanics only; no provider-backed workflow was run |
| Speculative side-effect refusal | `src/broker.test.ts` verified `sideEffecting` candidates are rejected before model invocation | Response racing is not execution authority |
| Approval and export gates | `validateOwnerApprovalPacket.ts`, clean-export acceptance and review-packet acceptance passed | Preparation and privacy mechanics only; no owner approval or publication occurred |

The latest mechanics checkpoint is the fresh 22-check artifact under [`research/results/`](../../research/results/), with the exact run recorded in `RESEARCH_PROGRESS.md`. The earlier dated record remains available for historical comparison.

## Owner-authorized MiMo smoke

The combined `pnpm test:research:mimo-matrix` artifact passed both `mimo-v2.5` and `mimo-v2.5-pro` with synthetic response validation. This is adapter connectivity evidence only; billing, comparative quality, token savings and production performance remain unmeasured. Acceptance is enforced by `pnpm test:research:mimo-matrix-acceptance`.

## MiMo memory-recall development slice, 2026-09-30

`research/runner/runMimoMemoryRecallPilot.ts` ran two development recall cases with
two replicates each under B0, B1, and AF (12 completed provider calls). B1 and
AF received the same synthetic prior facts: B1 as a rolling summary, AF through
the existing semantic-memory and context-optimizer path. B0 received only the
current task, consistent with its bounded recent-history condition. The
independent existing scorer was unchanged. Condition order was reversed for the
second replicate. Raw records and the trajectory ledger are in the private
AgentForge research data directory outside this public repository. The sanitized
aggregate is `research/results/mimo-memory-recall-development-v1-summary.json`;
its recorded raw-artifact SHA-256 is
`04713aa7cbed0533ff90b4d408202a835b7d56237698bf57758d439b5438af89`.

| Condition | Completed | Required-fact passes | Provider prompt tokens | Provider completion tokens |
| --- | ---: | ---: | ---: | ---: |
| B0 | 4/4 | 0/4 | 1,178 | 441 |
| B1 | 4/4 | 4/4 | 1,258 | 474 |
| AF | 4/4 | 4/4 | 1,262 | 419 |

AF retrieval hit in all four of its attempts. This is a small, unblinded,
development-only fact-recall slice using hash-fallback embeddings and the
provider's `mimo-v2.5-pro` alias; an immutable model revision was not exposed.
B1 matched AF's pass count. No token reduction or dollar savings is established; provider
billing is unknown. The slice does not exercise full task execution, workflow
repair, corrections, permission safety, or the held-out sample. It must not be
pooled with the earlier 72-trajectory local pilot or presented as the paper's
primary outcome.

`node --import tsx research/runner/validateMimoMemoryRecallPilot.ts` independently
re-scored all 12 private responses, checked distinct trajectory IDs and provider
usage, and matched the public aggregate to the raw artifact hash. It requires
the private raw files on the machine that ran the pilot; no raw conversations
are included in the public bundle.

## Local adapter pilot boundary

The zero-spend Ollama adapter pilot is recorded separately in
`LOCAL_ADAPTER_PILOT.md` and `research/results/local-adapter-pilot-v0.1.json`.
It contains 72 development trajectories, including four bounded timeouts, and
is engineering evidence for the adapter and ledger only. It is not included in
the outcome claims below and does not replace the approved production-path or
held-out study.

### Exploratory Phi-3.5 development pilot

The repaired native Ollama adapter was exercised on a separate 72-trajectory
development pilot. The records and descriptive comparison are preserved in
`research/results/local-adapter-pilot-phi3.5-v0.4.json` and
`research/results/local-adapter-pilot-phi3.5-v0.4-comparison.json`.

| Condition | Completed | Scorer passes | Pass rate | Total tokens | External spend |
| --- | ---: | ---: | ---: | ---: | ---: |
| B0 | 24/24 | 0/24 | 0.0% | 2,382 | $0 |
| B1 | 24/24 | 0/24 | 0.0% | 3,262 | $0 |
| AF | 24/24 | 2/24 | 8.33% | 3,036 | $0 |

This is a bounded, single-model development observation. It is retained as
unfavorable evidence and must not be read as a superiority claim, a final
performance result, or a substitute for the frozen held-out study.

## Outcomes intentionally not measured

The following remain `NOT MEASURED` until a frozen, owner-approved model-backed study is run:

- valid success rate against matched baselines;
- false-completion rate;
- fact retention under context pressure;
- correction recurrence;
- full-trajectory token use or token reduction in matched production conditions;
- provider cost per valid success;
- latency and recovery time;
- comparative performance against OpenClaw, Hermes or other systems.

No local mechanics check establishes superiority, production readiness, market leadership or novelty.

## Reproduction

Run the local checks from the repository root:

For the full isolated mechanics/review/evidence acceptance path, run:

```powershell
pnpm test:research:all
```

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
