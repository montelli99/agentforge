# AgentForge Market Audit — 2026-09-25

This is a dated research snapshot, not a claim that the market is static. Recheck these sources before a public release or product-positioning decision.

## What is already in the market

| Product or project | Evidence-backed capability | What it means for AgentForge |
|---|---|---|
| [OpenMuse](https://github.com/CopilotKit/openmuse) | Personal agent with persistent browser, optional computer, durable tasks, approvals, receipts, Gmail/Calendar, mobile/web clients, and visible browser takeover. The repository labels itself alpha and identifies voice, several connectors, payments, and some bridging as future work. | Visible work, durable task controls, takeover, and receipts are table stakes for the first usable release. |
| [Browser Harness](https://github.com/browser-use/browser-harness) | Self-healing browser automation with persistent browser-oriented workflows. | Browser recovery and session continuity need explicit acceptance tests, not just a Playwright adapter. |
| [LongHorizon-Harness](https://github.com/AMAP-ML/LongHorizon-Harness) | Fresh-context execution, durable verified state, independent auditing, recoverable progress, role-scoped permissions, and a web console. | Recovery, context renewal, and independent audit must be first-class product behavior. |
| [OpenHarness](https://github.com/knightfolk/open-harness) | Goal loops, model trust surfaces, routing learning, eval proof, budgets, provider limits, and a command-center-style desktop app. | Cost, quality, routing, and provider behavior need visible evidence rather than hidden settings. |
| [Herd](https://github.com/NickGuAI/Herd) | Meta-harness for fleets with mission state, worker orchestration, memory, approvals, and an operating-room UI. | Agent teams and command-room UX are no longer differentiators by themselves. |
| [Hermes Agent](https://github.com/hermes-agent-org/hermes) | Self-improving skills, channel gateway, memory and migration paths from OpenClaw. | Skill learning needs provenance, rollback, evaluation, and privacy controls; “self-improving” alone is not a safety guarantee. |

### Hermes Desktop parity check — 2026-09-27

The current official Hermes Desktop documentation confirms a native chat-first
application that shares configuration, providers, sessions, skills, and memory
with its CLI and gateway. Bot Mode presents profiles as persistent chats with
avatars and routines. This establishes the interaction baseline AgentForge must
meet for first-run clarity, continuity, and visible tool progress. AgentForge's
competitive layer remains the governed workforce model: automatic team setup,
nested departments, durable evidence, approvals, correction history, and
quality drift controls. These are product requirements, not claims that Hermes
lacks every related capability.
| [BrowserSkill](https://github.com/Tencent/BrowserSkill) | Uses a real signed-in browser without interrupting the user and supports profile binding. | Real-browser ownership, profile boundaries, and takeover must be designed into connector security. |

## AgentForge advantages that remain meaningful

The current codebase has foundations that many lightweight projects do not combine in one public system: a completion engine, process/SOP governance, evidence packs, policy-gated approvals, audit chaining, provider readiness labeling, cost-aware routing, package inspection, and a privacy boundary separating the public system from private business data.

Those are advantages only when they are demonstrated through end-to-end workflows. Local types and fixture tests are not enough.

## Release requirements added by this audit

1. **Visible execution:** every task must show current step, current agent, tool activity, waiting reason, approval state, and last durable receipt. No decorative “live” state may be shown without an event source.
2. **Recoverable long-horizon work:** a task must survive process restart, model replacement, context compaction, and worker loss without duplicating an external side effect.
3. **Independent verification:** completion must require an evidence pack produced by a verifier separate from the worker model. A worker assertion is never proof.
4. **Model/provider trust surface:** record model, provider, latency, token/cost metadata, tool failures, corrections, regressions, and benchmark evidence per task. Routing must be explainable and reversible.
5. **Real-browser boundary:** browser profiles, takeover, cookies, downloads, and external writes require explicit ownership, scope, and approval. The browser adapter must report whether it is fixture, local, or live.
6. **Self-improvement with rollback:** learned skills and memory changes require source evidence, evaluation results, versioning, review, and rollback. No silent prompt or skill mutation.
7. **Multi-agent coordination:** leases, role permissions, handoff state, conflict detection, and duplicate-side-effect protection must be durable and observable.
8. **Public-release privacy:** no personal CRM data, seller records, account identifiers, API keys, private course material, or production connector defaults may ship in fixtures, docs, screenshots, or examples.
9. **Adoption path:** a clean first-run setup must discover missing providers and guide configuration without requiring users to understand internal harness terms. Advanced controls can remain available for operators.
10. **Independent benchmark:** publish reproducible scenarios measuring recovery, evidence accuracy, prompt-injection resistance, cost, latency, and cross-model drift against representative harnesses.

## Current AgentForge status against the new bar

| Requirement | Current status | Evidence or gap |
|---|---|---|
| Visible execution | Partial | Local UI and task records exist; real worker/tool activity is offline. |
| Recovery | Partial | JSON persistence and idempotency paths exist; crash/concurrency and live external-write recovery remain open. |
| Independent verification | Partial | Completion/evidence contracts exist; no connected production worker produces verified packs end to end. |
| Trust surface | Partial | Provider registry and benchmark types exist; live provider measurements are missing. |
| Real-browser boundary | Partial | Browser/compute contracts exist; live profile ownership and takeover acceptance are not complete. |
| Self-improvement rollback | Partial | Memory and process revision records exist; worker-time retrieval/evaluation and skill rollback are incomplete. |
| Multi-agent coordination | Partial | Agent/task records and approvals exist; worker execution and full conflict handling remain incomplete. |
| Privacy | Partial | Product-isolation checks pass; release review and provenance scan remain required. |
| Adoption path | Partial | Local setup guidance exists; provider setup orchestration and first-run live validation remain incomplete. |
| Benchmark | Partial | Local benchmark domain and routing exist; broad reproducible harness comparison is not complete. |

## Decision

AgentForge is not obsolete, but it is not yet differentiated enough to claim market leadership. The differentiator should be **evidence-backed, model-independent, recoverable autonomy with an operator-visible control plane**, not another chat shell or another collection of adapters. The matrix above is now part of the release audit and must be reconciled before declaring the public release complete.

