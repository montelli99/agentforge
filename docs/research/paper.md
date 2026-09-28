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

Discuss agent memory, context selection, workflow/tool-use verification, model routing, long-horizon evaluation, and open-source agent runtimes. Every statement requires a verified primary citation in `RELATED_WORK.md`. Compare mechanisms and evaluation scope; do not claim that a feature name alone establishes superiority.

## 3. System architecture

Describe the public AgentForge control plane, the domain-neutral Workflow Engine, JEv System-1 routing, semantic memory, persistence adapters, contracts, completion auditing, and channel/browser boundaries. Use the public architecture document and source paths as evidence. State which components are optional, adapter-provided, or deployment-specific.

## 4. Research questions and hypotheses

Use the frozen questions and conditions in `PROTOCOL.md`. Define primary success before reviewing results. State null hypotheses for quality, retention, false completion, recurrence, tokens, cost and latency.

## 5. Methods

### 5.1 Tasks and data

Synthetic, public-domain fixtures only. Describe task families, development/held-out split, required and forbidden outcomes, injected failures, negative controls, and leakage prevention.

### 5.2 Conditions and controls

Describe B0, B1, AF, and each AgentForge ablation. Document the model, tools, limits, prompts, configuration, code revision and provider versions actually used. Combined interventions must be labeled as such.

### 5.3 Scoring

Define valid success, false completion, fact retention, correction recurrence, token reduction, cost per success, latency and safety failure exactly as in `PROTOCOL.md`. Include denominators and treatment of infrastructure failures.

### 5.4 Accounting and reproducibility

Record provider-reported usage, cached tokens, output tokens, currency, pricing source, retries and helper calls. Unknown usage is not zero. Describe checkpointing, run IDs, hashes, privacy screening and clean-checkout reproduction.

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

Report omitted facts, invented facts, stale handoffs, repeated corrections, unsupported completion claims, blocked actions, provider failures and accounting gaps. Include sanitized traces and task IDs. Do not select only favorable examples.

## 8. Discussion

Interpret effect sizes and uncertainty, not just pass percentages. Explain which components plausibly contributed and where ablations are confounded. Do not generalize synthetic tasks to arbitrary businesses or providers without evidence.

## 9. Limitations

At minimum address synthetic task realism, sample size, model alias drift, provider pricing changes, judge reliability, adapter-specific persistence, deployment configuration, external validity, and the difference between restored execution state and a model selecting the right next action.

## 10. Reproducibility and availability

Link the public repository release, protocol, fixtures, runner commands, sanitized results, checksums and archive DOI after publication. State what requires a paid provider and what runs offline.

## 11. Conclusion

**To be written after results.** The conclusion must answer only the frozen research questions and state meaningful null findings.

## Author and AI-use disclosure

Fill with real consenting human authors, affiliations, contributions, conflicts and funding. Disclose tools/models used for code, documentation, analysis and copy editing. Human authors must review and take responsibility for every technical claim. Do not list an AI system as an author.
