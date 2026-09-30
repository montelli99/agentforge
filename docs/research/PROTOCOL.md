# AgentForge evaluation protocol

Version: 0.1-mechanics-validated  
Status: local mechanics validated; no paid or model-backed results under the primary full-trajectory protocol. A small exploratory model-backed recall slice is reported separately in `RESULTS.md`.

## Purpose

Measure whether the actual AgentForge path improves reliable task completion, retained context, evidence-backed completion and cost efficiency under controlled synthetic tasks. This protocol does not assume that any component helps.

## Conditions

Use matched tasks, tools, limits and model settings for every comparison.

- **B0:** basic recent-history tool-use baseline.
- **B1:** conventional rolling-summary/retrieval baseline.
- **AF:** current AgentForge path with configured memory, JEv/context policy, workflow and evidence checks.
- **AF-memory-off:** AgentForge path with persistent semantic memory disabled.
- **AF-routing-off:** AgentForge path with JEv/context selection disabled where the switch is independently available.
- **AF-evidence-off:** disposable benchmark path with completion evidence validation disabled; safety and permission boundaries remain enabled.

If an implementation cannot isolate a condition, record it as a combined intervention and do not attribute the result to one component.

## Task families

All fixtures use synthetic names, documents and services.

1. Delayed recall and context pressure.
2. Restart/model handoff continuation.
3. Human correction and later equivalent task.
4. Multi-step workflow with a failed requirement.
5. Duplicate event, timeout and recovery.
6. Permission and completion-claim safety.

Each task version contains required outcomes, forbidden outcomes, deterministic checks, timeout/attempt limits, injected events, and a negative control. Evaluator answer keys never enter the agent context.

## Primary outcomes

- **Valid success:** accepted task artifact/state and no critical permission or privacy violation.
- **False completion:** agent claims success when required evidence or state is absent.
- **Fact retention:** required facts preserved minus invented or conflicting facts.
- **Correction recurrence:** later eligible opportunities that repeat the corrected error.
- **Token reduction:** one minus treatment tokens divided by matched comparator tokens. This is not cost savings unless provider billing is also measured.
- **Cost per valid success:** all measured/estimated charged costs divided by valid successes. Undefined when there are no valid successes.
- **Latency:** end-to-end median and p95; include timeout and failed-run time.

## Run rules

- Dry-run mechanics first; no network or provider calls.
- Pilot on development tasks before held-out tasks.
- Freeze fixtures, scorer, code revision, configuration, model IDs, limits and pricing sources before held-out execution.
- Interleave conditions and use independent replicates.
- Checkpoint after every trajectory and resume without repeating charged work.
- Count retries, router, retrieval, embedding, summary and judge costs when charged.
- Missing usage or cost is `unknown`, never zero.
- Keep raw logs outside the public repository until privacy screening.
- Report all attempted trajectories, including infrastructure failures; publish preregistered exclusions separately.
- Human review samples successes, false completions and all safety failures. Automated scoring is not academic peer review.

## Current protocol status

The following are verified mechanics only:

- Benchmark runner passes a correct synthetic executor and rejects a deliberately wrong executor.
- SemanticMemory retrieves a synthetic same-tenant fact and rejects a cross-tenant query.
- CompletionAuditor passes an evidence-backed synthetic context.
- CorrectionRegistry blocks unapproved replay cases and automatic mutation, then creates a replay case after approval.

The following remain unmeasured:

- deployment-specific semantic-memory privacy, encryption and retention;
- model handoff quality;
- model quality, token usage, latency and cost;
- lower correction recurrence;
- external OpenClaw/Hermes comparisons;
- production provider round trips.

An abstract may describe methods and bounded observations, but no primary outcome or superiority claim is supported until the full-trajectory results are linked to run IDs and artifacts.

The local mechanics were re-run together on 2026-09-29 with the zero-spend pilot validator and TypeScript typecheck. This validates the protocol harness, not model IDs, pricing, sample size or provider-specific configuration.

## Reproducibility record

Every measured run must record: experiment ID, task/config/code hashes, condition, replicate, runtime, model/version, provider usage, cost source, outcome counts, failures, scorer version and sanitized artifact paths. A new protocol version is required after changing fixtures, scoring, conditions or primary outcomes.
