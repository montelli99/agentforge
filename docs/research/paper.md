# AgentForge: Evidence-Guided Execution and Durable Memory for Cost-Efficient Agent Systems

Status: manuscript scaffold. Results are intentionally not claimed yet.  
Protocol: [PROTOCOL.md](PROTOCOL.md)  
Evidence register: [CAPABILITY_EVIDENCE.md](CAPABILITY_EVIDENCE.md)  
Mechanics record: `research/results/mechanics-2026-09-28.json`

## Abstract

**To be written after the measured study is complete.** The abstract must state the task set, comparison conditions, primary outcome, uncertainty, and limitations. It must not claim improved quality, lower cost, or novelty from the current mechanics-only checks.

## 1. Introduction

Long-running agents must preserve decisions, continue after worker replacement, follow bounded procedures, and distinguish evidence-backed completion from a confident message. Supplying more conversation context can increase cost and still fail to preserve the facts that matter. AgentForge is a public control-plane system that combines workforce coordination, workflow execution, memory, context selection, completion auditing and model routing.

This paper asks whether that combination improves reliable task completion per unit cost under controlled synthetic workloads. The study treats the combination as a hypothesis, not an established advantage.

Contributions claimed only if supported by the final study:

1. A reproducible task and scoring protocol for memory, handoff, correction, evidence and recovery behavior.
2. An implementation analysis that separates AgentForge, its Workflow Engine and JEv routing responsibilities.
3. An empirical comparison of matched baselines and ablations, including failures and accounting limitations.

## 2. Related work

Long-context agent systems have treated memory as an operating-system-like resource, while later benchmarks separate extraction, multi-session reasoning, temporal updates and abstention as distinct abilities. Tool-use benchmarks likewise evaluate trajectories rather than only final text, including tool selection, arguments and ordering. These works motivate measuring the complete task trajectory and preserving provenance for each required fact. They do not provide outcome evidence for AgentForge. The comparison register also records OpenClaw, Hermes and OpenMuse as implementation references; their documented features are not treated as matched performance results. Primary references and immutable source pins are listed in `RELATED_WORK.md`.

## 3. System architecture

AgentForge is the control plane: it owns goals, agents, channels, approvals, evidence and durable task state. The Workflow Engine is domain-neutral. It compiles a process into stages, decisions, handoffs and an execution contract; a procedure does not itself grant authority. JEv is a deterministic System-1 router that classifies intent and selects a bounded workflow or review path. It is a heuristic classifier with fixed confidence values, not a calibrated probability model.

The Completion Engine creates an immutable original-goal record, a PRD, a requirement traceability matrix, an execution DAG and a completion contract. Completion auditing requires observable evidence and does not accept a worker's self-report as proof. Contract enforcement checks scope, protected paths, command authority and file limits before side effects. The native harness now applies file-scope checks before both simulation and attached-executor paths. Docker execution adds isolated worktrees, approved commands and post-run execution evidence.

Operational memory is namespaced and optionally persisted. Retrieval is bounded by project, category, tags and archival state; the current implementation uses lexical scoring and recency rather than claiming universal semantic retrieval. Browser actions require a current observation identifier and freshness window. Native channel adapters and the gateway own lifecycle and dispatch, while authenticated provider round trips remain deployment-specific. These boundaries and source paths are documented in `SOURCE_RUNTIME_TRACE.md` and `CAPABILITY_EVIDENCE.md`.

## 4. Research questions and hypotheses

Use the frozen questions and conditions in `PROTOCOL.md`. Define primary success before reviewing results. State null hypotheses for quality, retention, false completion, recurrence, tokens, cost and latency.

## 5. Methods

### 5.1 Tasks and data

All current fixtures are synthetic and contain no private business records, credentials or personal messages. The protocol covers delayed recall/context pressure, restart and model handoff, correction retention, multi-step workflow with a failed requirement, duplicate/timeout recovery, and permission/completion safety. Each case must define required and forbidden outcomes, deterministic state or artifact checks, timeout and attempt limits, injected events, and a negative control. Evaluator answer keys are kept outside the agent context and retrieval store. The checked-in fixture is an initial mechanics fixture; the full held-out task families remain a future study deliverable.

### 5.2 Conditions and controls

The frozen conditions are B0 (bounded recent-history tool-use baseline), B1 (rolling-summary/retrieval baseline), AF (the configured AgentForge path), AF-memory-off, AF-routing-off where independently isolable, and AF-evidence-off in a disposable benchmark workspace. Matched conditions must use the same tools, task instructions, limits and model settings. A model route, provider version, prompt revision, code revision, configuration hash and task hash must be recorded for each measured run. If an ablation cannot be isolated, it is reported as a combined intervention rather than attributed to one component. No model-backed condition has been run in the current evidence set.

### 5.3 Scoring

The primary unit is a complete task trajectory. Valid success requires the accepted artifact or state and no critical permission or privacy violation. False completion is an unsupported success claim, reported both over declaring trajectories and over all attempts. Fact retention counts required facts preserved without invention or conflict. Correction recurrence counts eligible later opportunities that repeat a corrected error. Token reduction compares total treatment tokens with the matched comparator and is not called cost savings without billing data. Cost per valid success includes all measured attempts and is undefined when there are no valid successes. Latency includes end-to-end median and p95, timeouts and failed-run time. Safety failures are actual forbidden effects, separated from blocked attempts. Infrastructure failures and model failures are counted separately. The exact definitions are frozen in `PROTOCOL.md`.

### 5.4 Accounting and reproducibility

Each trajectory records experiment, task, condition and replicate IDs, UTC timestamps, code/config/task hashes, model and provider versions, usage categories, pricing source and currency, retries, helper calls, tool actions, permission denials, completion claims and scorer outcomes. Provider-reported input, cached input and output usage are kept distinct; missing usage is `unknown`, never zero. Checkpoints are written after each trajectory and completed work is resumed without repeating charged calls. Raw traces remain outside the public repository until privacy screening. The local zero-spend sweep proves these mechanics and records protocol, fixture and configuration hashes; it does not prove provider performance. Reproduction commands and the current evidence revision are in `RELEASE_EVIDENCE.md`.

### 5.5 Human review and ethics

Human reviewers inspect safety failures, false completions and a sample of successes. Automated scoring is not peer review. Disclose AI assistance, authorship responsibility, synthetic data, privacy boundaries and risks of autonomous execution.

## 6. Results

**PLACEHOLDER — do not fill from mechanics-only checks.**

| Outcome | B0 | B1 | AF | AF-memory-off | AF-routing-off | AF-evidence-off |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Valid success rate | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| False completion rate | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Median latency | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Cost per valid success | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |

## 7. Failure analysis

The analysis will include omitted or invented facts, stale handoffs, repeated corrections, unsupported completion claims, blocked actions, provider failures, retries and accounting gaps. Every included trace must be sanitized and linked to a task and condition identifier. The current mechanics record includes successful and deliberately incorrect controls, but it does not select favorable model examples because no model-backed study has been run.

## 8. Discussion

The discussion will report paired task-level effects with uncertainty and distinguish confirmatory outcomes from exploratory observations. It will explain confounds when an ablation cannot be isolated and will report null and negative findings. Synthetic mechanics results will not be generalized to arbitrary businesses, providers or deployment environments.

## 9. Limitations

At minimum address synthetic task realism, sample size, model alias drift, provider pricing changes, judge reliability, adapter-specific persistence, deployment configuration, external validity, and the difference between restored execution state and a model selecting the right next action.

## 10. Reproducibility and availability

The public package includes the Apache-2.0 code, protocol, synthetic fixtures, runners, validation scripts and sanitized mechanics records. The research page links the protocol, results ledger, source trace and reproduction commands. Offline mechanics require no provider account. Model-backed runs require the owner-approved routes, pricing, budget and disposable runtime captured in `OWNER_APPROVAL_PACKET.md`; those inputs are intentionally absent from the public package until approved. A release tag, archive DOI and live download verification will be added only after the corresponding publication gates pass.

## 11. Conclusion

**To be written after results.** The conclusion must answer only the frozen research questions and state meaningful null findings.

## Author and AI-use disclosure

Fill with real consenting human authors, affiliations, contributions, conflicts and funding. Disclose tools/models used for code, documentation, analysis and copy editing. Human authors must review and take responsibility for every technical claim. Do not list an AI system as an author.
