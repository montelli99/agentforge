# AgentForge: Evidence-Guided Execution and Durable Memory for Cost-Efficient Agent Systems

Status: manuscript scaffold with mechanics evidence and bounded model-backed development checks. Primary outcomes remain unmeasured.
Protocol: [PROTOCOL.md](PROTOCOL.md)  
Evidence register: [CAPABILITY_EVIDENCE.md](CAPABILITY_EVIDENCE.md)  
Mechanics record: latest 22-check artifact under `research/results/`, identified in `RESEARCH_PROGRESS.md`

## Abstract

AgentForge is an open-source control plane for governed agent work. This mechanics report documents its workflow compilation, durable goal state, memory and handoff boundaries, correction governance, execution contracts, evidence auditing and reproducibility controls. We define a preregistered protocol for comparing matched baselines and AgentForge ablations on synthetic task trajectories, including delayed recall, handoff, correction, workflow failure, recovery and completion safety. The current release validates protocol machinery and zero-spend mechanics inside a Docker network-denial boundary. A bounded model-backed development recall slice exists, but does not test full task trajectories. Complete network/provider call counts, full-trajectory success, token reduction, cost savings, latency advantage and comparative superiority remain unmeasured. Held-out evaluation and independent review remain future gates.

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

All current fixtures are synthetic and contain no private business records, credentials or personal messages. The protocol covers delayed recall/context pressure, restart and model handoff, correction retention, multi-step workflow with a failed requirement, duplicate/timeout recovery, and permission/completion safety. Each case must define required and forbidden outcomes, deterministic state or artifact checks, timeout and attempt limits, injected events, and a negative control. Evaluator answer keys are kept outside the agent context and retrieval store. The development and held-out task families are checked in and structurally validated; the held-out split remains unrun and is reserved for the future measured study.

### 5.2 Conditions and controls

The frozen conditions are B0 (bounded recent-history tool-use baseline), B1 (rolling-summary/retrieval baseline), AF (the configured AgentForge path), AF-memory-off, AF-routing-off where independently isolable, and AF-evidence-off in a disposable benchmark workspace. Matched conditions must use the same tools, task instructions, limits and model settings. A model route, provider version, prompt revision, code revision, configuration hash and task hash must be recorded for each measured run. If an ablation cannot be isolated, it is reported as a combined intervention rather than attributed to one component. The only model-backed comparison so far is the exploratory development recall slice in Section 6; no full-trajectory condition has been run.

### 5.3 Scoring

The primary unit is a complete task trajectory. Valid success requires the accepted artifact or state and no critical permission or privacy violation. False completion is an unsupported success claim, reported both over declaring trajectories and over all attempts. Fact retention counts required facts preserved without invention or conflict. Correction recurrence counts eligible later opportunities that repeat a corrected error. Token reduction compares total treatment tokens with the matched comparator and is not called cost savings without billing data. Cost per valid success includes all measured attempts and is undefined when there are no valid successes. Latency includes end-to-end median and p95, timeouts and failed-run time. Safety failures are actual forbidden effects, separated from blocked attempts. Infrastructure failures and model failures are counted separately. The exact definitions are frozen in `PROTOCOL.md`.

### 5.4 Accounting and reproducibility

Each trajectory records experiment, task, condition and replicate IDs, UTC timestamps, code/config/task hashes, model and provider versions, usage categories, pricing source and currency, retries, helper calls, tool actions, permission denials, completion claims and scorer outcomes. Provider-reported input, cached input and output usage are kept distinct; missing usage is `unknown`, never zero. Checkpoints are written after each trajectory and completed work is resumed without repeating charged calls. Raw traces remain outside the public repository until privacy screening. The local zero-spend sweep exercises the synthetic accounting and checkpoint mechanics and records protocol, fixture and configuration hashes; it does not verify charged-provider accounting, resume behavior across paid calls or provider performance. Reproduction commands and the current evidence revision are in `RELEASE_EVIDENCE.md`.

### 5.5 Human review and ethics

Human reviewers inspect safety failures, false completions and a sample of successes. Automated scoring is not peer review. Disclose AI assistance, authorship responsibility, synthetic data, privacy boundaries and risks of autonomous execution.

## 6. Results

The checked-in task inventory has two physically separate synthetic splits: 12 development cases across six families and 60 held-out cases across the same families. Both are structurally validated with evaluator data outside agent-visible input. Held-out cases are reserved for evaluation and have not been used for tuning.

The current release reports verified mechanics plus a bounded exploratory local-model pilot; it does not report publication-grade comparative outcomes. The latest sanitized record is the 22-check artifact under `research/results/` identified in `RESEARCH_PROGRESS.md`. The combined sweep used synthetic fixtures inside a Docker network-denial boundary; complete network/provider call counts remain unmeasured, and the frozen protocol, fixture and pilot hashes are preserved. The separate Phi-3.5 development pilot is summarized in `docs/research/RESULTS.md` and remains descriptive evidence only.

| Mechanics check | Observed result | Interpretation |
| --- | --- | --- |
| Offline scorer and negative control | Correct executor accepted; incorrect executor rejected | Scoring and rejection wiring operate as specified |
| Memory and evidence | Same-tenant fact retained; cross-tenant query rejected; evidence audit passed | Local privacy and evidence boundaries operate in the fixture |
| Correction governance | Pending replay rejected; automatic mutation denied; approved replay case created | Approval boundary mechanics operate as specified |
| Cross-process memory | Temporary adapter hydrated in a separate reader process | Adapter continuity works in the fixture; deployment privacy remains open |
| Handoff continuity | Goal hash, requirements and execution DAG restored | State continuity works; next-action quality is unmeasured |
| Native execution contract | Unauthorized file path rejected before attached executor ran | File-scope boundary is enforced below the executor |
| Worker/Docker evidence gate | Missing required worker check and incomplete Docker plan rejected before completion/container creation | Required evidence is fail-closed at the tested boundaries |
| Measured-run configuration guard | Valid measured shape accepted; mock/synthetic condition rejected before dispatch | A real route cannot be silently replaced with a fixture; no provider was contacted |
| Public controller evidence gate | Incomplete worker evidence persisted as failed through the public completion route | Controller safety mechanics only; no provider-backed trajectory |
| Speculative side-effect refusal | Side-effecting speculative candidates rejected before model invocation | Speculation remains response-only and cannot authorize effects |
| Full regression | 89 test files; 494 passed; 2 skipped | Repository checks pass at the recorded revision |

These mechanics observations are not model-quality or production-performance results. A separate, exploratory MiMo 2.5 Pro recall slice supplied the same synthetic prior facts to B1 (rolling summary) and AF (semantic-memory/context-optimizer path), while B0 saw only the current task. Across two development cases and two replicates, B0 passed 0/4 required-fact checks; B1 and AF each passed 4/4. AF retrieval hit in all four attempts. This small slice uses hash-fallback embeddings and a provider model alias, and it does not measure the full AgentForge workflow or establish an advantage over B1. Provider prompt tokens were 1,178 (B0), 1,258 (B1), and 1,262 (AF); completion tokens were 441, 474, and 419, respectively. Billing remains unknown. The public aggregate and private raw-artifact hash are identified in `RESULTS.md`.

A further single-case development run used the actual MiMo plan adapter and governed Docker worker with a synthetic preauthorized command. It completed the required artifact and evidence checks with 253 reported tokens in 14.7 seconds. Earlier bounded attempts failed before command execution. This verifies one executable integration path but is excluded from the matched B0/B1/AF study: it has no paired comparator, no measured billing, and no evidence about the six task families. Its run ID and raw-artifact hash are recorded in `RESULTS.md`.

The full-study outcome table below remains intentionally unmeasured until the matched production-path study is run.

| Outcome | B0 | B1 | AF | AF-memory-off | AF-routing-off | AF-evidence-off |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Valid success rate | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| False completion rate | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Median latency | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |
| Cost per valid success | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED | NOT MEASURED |

## 7. Failure analysis

The analysis will include omitted or invented facts, stale handoffs, repeated corrections, unsupported completion claims, blocked actions, provider failures, retries and accounting gaps. Every included trace must be sanitized and linked to a task and condition identifier. The current mechanics record includes successful and deliberately incorrect controls. The development recall slice is reported in full rather than selecting favorable examples; the full model-backed study has not been run.

## 8. Discussion

The discussion will report paired task-level effects with uncertainty and distinguish confirmatory outcomes from exploratory observations. It will explain confounds when an ablation cannot be isolated and will report null and negative findings. Synthetic mechanics results will not be generalized to arbitrary businesses, providers or deployment environments.

## 9. Limitations

At minimum address synthetic task realism, sample size, model alias drift, provider pricing changes, judge reliability, adapter-specific persistence, deployment configuration, external validity, and the difference between restored execution state and a model selecting the right next action.

## 10. Reproducibility and availability

The public package includes the Apache-2.0 code, protocol, synthetic fixtures, runners, validation scripts and sanitized mechanics records. The research page links the protocol, results ledger, source trace and reproduction commands. Offline mechanics require no provider account. Model-backed runs require the owner-approved routes, pricing, budget and disposable runtime captured in `OWNER_APPROVAL_PACKET.md`; those inputs are intentionally absent from the public package until approved. A release tag, archive DOI and live download verification will be added only after the corresponding publication gates pass.

## 11. Conclusion

Editorial status correction: the held-out task families are now checked in and structurally validated as a separate 60-case split. They remain unrun and are not evidence of model performance.

This release establishes a reproducible mechanics track for evaluating AgentForge; it does not establish that AgentForge improves task quality, reduces token use or costs less than another system. The implementation exposes explicit boundaries for workflow authority, memory scope, handoff state, correction approval, browser freshness, native execution and completion evidence. The protocol, fixtures, validators and public reproduction guide make the next study auditable. The remaining claims require frozen model routes, an approved budget, measured trajectories, independent review and deployment-specific acceptance. Until those gates pass, the appropriate conclusion is that the control and measurement machinery is available and its substantive outcome is unknown.

## Author and AI-use disclosure

Fill with real consenting human authors, affiliations, contributions, conflicts and funding. Disclose tools/models used for code, documentation, analysis and copy editing. Human authors must review and take responsibility for every technical claim. Do not list an AI system as an author.
