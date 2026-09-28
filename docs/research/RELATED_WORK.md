# Related work register

Status: source register started; this is not a novelty determination.

Every source used in the manuscript must be verified again before submission. Record the exact version/date, stable URL or DOI, the supported claim, and the distinction from AgentForge. Do not treat product marketing pages as evidence of measured performance.

## Runtime and harness references

| Source | What to inspect | Comparison boundary |
| --- | --- | --- |
| OpenClaw documentation and source | Channel adapters, gateway lifecycle, plugins, model/provider separation, automation and browser operations. | Compare implemented connection/runtime mechanisms and tested workflows. Do not claim feature parity from the integration catalog alone. |
| Hermes Agent documentation and source | Installation, model setup, memory behavior, tools and user-facing workflow. | Compare setup and memory semantics using pinned versions and supported configurations. |
| AgentForge public architecture | AgentForge control plane, Workflow Engine, JEv, contracts, memory, completion auditing and native gateway. | Use source evidence register; separate design intent from measured behavior. |

Official starting points used for the initial register (accessed 2026-09-28):

- OpenClaw integrations: https://openclaw.ai/integrations
- OpenClaw getting started: https://docs.openclaw.ai/start/getting-started
- OpenClaw Telegram channel: https://docs.openclaw.ai/channels/telegram
- Hermes quickstart: https://hermes-agent.nousresearch.com/docs/getting-started/quickstart/
- Hermes memory guide: https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/

Before comparative testing, pin each project to a commit or release, record the date, document enabled channels/tools/models, and preserve the exact setup commands. URLs alone do not establish a comparable configuration.

## Research areas to cover

- Agent memory and long-horizon continuity: identify persistence model, retrieval method, conflict handling, provenance and evaluation task.
- Context selection and compression: identify what is omitted, how required facts are protected, and whether token results use provider billing or estimates.
- Tool-use and workflow verification: identify artifact/state-based checks versus model self-report.
- Model routing: identify whether selection is heuristic, benchmark-based, calibrated, or cost-aware.
- Long-running and handoff evaluation: identify restart, worker replacement, correction and recovery tests.
- Open-source agent runtimes: compare installation, channels, permissions, plugins, observability and reproducibility.

## Source quality rules

- Prefer original papers, official repositories, official documentation and standards.
- Record publication year/version and access date.
- Do not paraphrase a claim beyond what the source supports.
- Do not call a system a baseline until its configuration and task affordances are documented.
- Never claim “first,” “unique,” “best,” “state of the art,” or “beats” without a systematic search and matched evidence.
- Distinguish implementation comparison, user-experience comparison and empirical outcome comparison.

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

Replace every `TO VERIFY` before submitting a comparative claim. If a competitor cannot be tested fairly, describe the limitation and omit the outcome comparison.
