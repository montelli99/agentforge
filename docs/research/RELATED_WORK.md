# Related work register

Status: source register started; this is not a novelty determination.

Every source used in the manuscript must be verified again before submission. Record the exact version/date, stable URL or DOI, the supported claim, and the distinction from AgentForge. Do not treat product marketing pages as evidence of measured performance.

## Runtime and harness references

| Source | What to inspect | Comparison boundary |
| --- | --- | --- |
| OpenClaw documentation and source | Channel adapters, gateway lifecycle, plugins, model/provider separation, automation and browser operations. | Compare implemented connection/runtime mechanisms and tested workflows. Do not claim feature parity from the integration catalog alone. |
| Hermes Agent documentation and source | Installation, model setup, memory behavior, tools and user-facing workflow. | Compare setup and memory semantics using pinned versions and supported configurations. |
| AgentForge public architecture | AgentForge control plane, Workflow Engine, JEv, contracts, memory, completion auditing and native gateway. | Use source evidence register; separate design intent from measured behavior. |
| CopilotKit OpenMuse | Personal-agent reference with a server-owned task worker, persistent browser/computer workers, stored action review and artifact-oriented workflows. | Compare user-visible work inspection, durable task state, review boundaries and installation—not performance. OpenMuse is identified as an alpha reference implementation. |

Official starting points used for the initial register (accessed 2026-09-28):

- OpenClaw integrations: https://openclaw.ai/integrations
- OpenClaw getting started: https://docs.openclaw.ai/start/getting-started
- OpenClaw Telegram channel: https://docs.openclaw.ai/channels/telegram
- Hermes quickstart: https://hermes-agent.nousresearch.com/docs/getting-started/quickstart/
- Hermes memory guide: https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/
- OpenMuse repository and architecture: https://github.com/CopilotKit/openmuse
- OpenMuse roadmap: https://github.com/CopilotKit/openmuse/blob/main/ROADMAP.md

Before comparative testing, pin each project to a commit or release, record the date, document enabled channels/tools/models, and preserve the exact setup commands. URLs alone do not establish a comparable configuration.

## Research areas to cover

- Agent memory and long-horizon continuity: identify persistence model, retrieval method, conflict handling, provenance and evaluation task.
- Context selection and compression: identify what is omitted, how required facts are protected, and whether token results use provider billing or estimates.
- Tool-use and workflow verification: identify artifact/state-based checks versus model self-report.
- Model routing: identify whether selection is heuristic, benchmark-based, calibrated, or cost-aware.
- Long-running and handoff evaluation: identify restart, worker replacement, correction and recovery tests.
- Open-source agent runtimes: compare installation, channels, permissions, plugins, observability and reproducibility.

## Primary research references

These papers frame the evaluation questions; they are not outcome evidence for AgentForge:

- Packer, Wooders, Lin, Fang, Patil, Stoica and Gonzalez, “MemGPT: Towards LLMs as Operating Systems” (2023): https://arxiv.org/abs/2310.08560
- Wu, Wang, Yu, Zhang, Chang and Yu, “LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory” (2024): https://arxiv.org/abs/2410.10813
- He, Dai, He, Liu, Tang, Lu, Li, Ding, Mukherjee, Wang, Xing, Tang and Dumoulin, “TRAJECT-Bench: A Trajectory-Aware Benchmark for Evaluating Agentic Tool Use” (2025): https://arxiv.org/abs/2510.04550

## Source quality rules

- Prefer original papers, official repositories, official documentation and standards.
- Record publication year/version and access date.
- Do not paraphrase a claim beyond what the source supports.
- Do not call a system a baseline until its configuration and task affordances are documented.
- Never claim “first,” “unique,” “best,” “state of the art,” or “beats” without a systematic search and matched evidence.
- Distinguish implementation comparison, user-experience comparison and empirical outcome comparison.

## Citation audit

| Reference | Supported statement in this register | Boundary kept explicit |
| --- | --- | --- |
| MemGPT (Packer et al., 2023) | Describes virtual context management and tiered memory for extending usable context. | Its reported experiments are not AgentForge results and do not establish equivalence. |
| LongMemEval (Wu et al., 2024) | Defines long-term memory evaluation dimensions including extraction, multi-session reasoning, temporal reasoning, updates and abstention. | Its benchmark scores and datasets are not used as AgentForge measurements. |
| TRAJECT-Bench (He et al., 2025) | Evaluates tool-use trajectories with selection, argument and ordering diagnostics. | No cross-system performance comparison is claimed here. |
| OpenClaw official docs | Documents available channels, providers, gateway and automation surfaces. | Product documentation is not treated as measured reliability or quality evidence. |
| Hermes official docs | Documents installation and memory feature surfaces. | No parity or performance claim is made without pinned, matched testing. |
| OpenMuse repository/roadmap | Documents server-owned jobs, reviews, persistent browser/computer workers and artifact workflows. | The repository identifies itself as an alpha reference; no superiority claim is made. |

## Comparison matrix template

| Capability | AgentForge evidence | OpenClaw evidence | Hermes evidence | Evaluation status |
| --- | --- | --- | --- | --- |
| Durable semantic memory | Source + restart slice; adapter policy deployment-specific | TO VERIFY | TO VERIFY | Not a quality comparison |
| Model/worker handoff | Persisted completion-session slice; model next action unmeasured | TO VERIFY | TO VERIFY | Not measured |
| Completion evidence | CompletionAuditor and contract path | TO VERIFY | TO VERIFY | Internal mechanics only |
| Correction recurrence | Correction governance path | TO VERIFY | TO VERIFY | Not measured |
| Token/cost accounting | Optimizer/accounting code; provider-backed savings unmeasured | TO VERIFY | TO VERIFY | Not measured |
| Channels and gateway | Native adapter source and acceptance tests | Official catalog/docs | Official docs | Round trips require pinned test accounts |
| Browser actions | JEv UltraFast-style bounded policy | TO VERIFY | TO VERIFY | Deployment bridge required |
| Visible task plans, action review and artifacts | Source evidence in AgentForge completion/evidence paths | OpenMuse server-owned jobs, reviews and artifact workflows | TO VERIFY | Implementation comparison only |

Replace every `TO VERIFY` before submitting a comparative claim. If a competitor cannot be tested fairly, describe the limitation and omit the outcome comparison.
