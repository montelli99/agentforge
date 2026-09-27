# AgentForge Public Market Leadership Plan

**Status:** Planning baseline

This document is the durable handoff for building a public, privacy-safe AgentForge system that combines AgentForge, the Workflow Engine, and JEv decision services.

## Product boundary

AgentForge is a model-independent operating system for reliable AI work. It includes the controller, workspace, memory, execution, evidence, approvals, command center, Workflow Engine, JEv decision layer, and generic channel/provider adapters.

The public release excludes operator business-system data, customer or property records, private channel history, credentials, personal identities, business configuration, private deployment files, and proprietary material.

Supported public channels are generic Telegram, Discord, and Slack adapters. iMessage is optional and remains explicitly unverified until Apple hardware is available.

## Competitive baseline

Grok Build already provides multi-session dashboards, parallel sessions, grouping, inline approval, session takeover, and persistent sessions. Harness provides local-first memory, semantic recall, and correction weighting. AWS AgentCore, Cloudflare Agents, Anthropic managed agents, Hermes, OpenClaw, and durable-agent products already provide parts of memory, compression, routing, recovery, channels, approvals, observability, and cost tracking.

AgentForge must therefore differentiate through an integrated, open, portable system with measured reliability rather than claiming that any individual feature is unique.

## 2026-09 competitive corrections

The dated market audit in [`MARKET_AUDIT_2026-09-25.md`](MARKET_AUDIT_2026-09-25.md) changes the release bar. Visible browser work, durable tasks, approvals, receipts, takeover, model-cost surfaces, and command-center views are already present in competing open-source projects. They are now baseline requirements for AgentForge, not future differentiators.

The release plan must add these implementation gates:

- **Real execution vertical:** one end-to-end workflow must invoke a configured model, use a scoped tool, pause for approval, resume, produce an evidence pack, and survive a worker restart without duplicating an external effect.
- **Live activity truth:** every animated or “active” UI element must be backed by a durable event, with current step, agent, tool, wait reason, approval, cost, and receipt visible.
- **Browser ownership:** persistent browser profiles, takeover, return-to-agent control, download boundaries, and external-write confirmation must be tested as one workflow.
- **Self-improvement safety:** learned skills and memory changes require source evidence, evaluation results, versioning, approval, and rollback; silent mutation is prohibited.
- **Provider/model trust:** route decisions must retain model, provider, prompt/configuration fingerprint, latency, tokens, cost, failures, corrections, and benchmark evidence.
- **Recovery matrix:** test restart, context compaction, provider loss, tool timeout, duplicate delivery, and partial external-write outcomes with deterministic replay.
- **Public benchmark:** publish reproducible cross-harness measurements for recovery, evidence accuracy, prompt-injection resistance, cost, latency, and drift.

These gates are release blockers. A passing unit suite or a polished local screen cannot satisfy them by itself.

## Required differentiators

1. **Context Transport and Compression**
   - Canonical task-state envelope independent of any model.
   - Separate raw events, durable facts, active decisions, pending work, and evidence.
   - Per-agent context selection and semantic compression.
   - Reversible compression with provenance.
   - Token, latency, cache-hit, compression-ratio, and quality-loss metrics.
   - Automatic full-context fallback when confidence drops.

2. **Context Integrity Monitor**
   - Fingerprint model, provider, prompt, tools, memory, route, checkpoint, and compression version.
   - Detect silent routing, prompt, tool-catalog, or memory changes.
   - Run fixed canaries after compaction, upgrades, or provider changes.
   - Compare pass rate, correction rate, tool errors, latency, cost, and token use.
   - Restore the last verified checkpoint when behavior regresses.

3. **Verified Memory**
   - Project, agent, user, and task scopes.
   - Provenance, source trust, writer authority, confidence, expiry, correction priority, and deletion.
   - Raw history retained separately from compact state.
   - Current durable state cannot be silently overridden by recalled memory.

4. **Autonomous Controller**
   - Convert natural-language goals into plans, dependencies, tasks, approvals, and evidence requirements.
   - Durable pause, resume, retry, cancellation, recovery, and parallel branches.
   - No completion claim without evidence.
   - Natural-language user guidance instead of internal command syntax.

5. **Self-Setup Agent**
   - Discover missing providers, channels, permissions, tools, storage, and runtime capabilities.
   - Guide or perform setup with explicit approvals.
   - Validate connections and preserve rollbackable configuration.
   - Keep credentials in a secret boundary and out of logs and exports.

   The setup agent is itself a first-class orchestrator, not a static wizard. It should inspect the user’s goal, infer the minimum system needed, ask only high-value questions, configure the required pieces, test them, and continue until the requested workflow is usable.

   It must also be able to create and configure other agents. When a user asks for help with a role, the setup agent should recommend a role definition, explain its responsibilities and permissions, create the agent, attach the required skills and tools, build an evaluation set, run a sandbox test, and present the result for approval. Users should be able to say “I need an agent that handles X” rather than configure models, prompts, tools, memory, permissions, schedules, and channels by hand.

   Setup should use progressive disclosure:

   - Ask for the desired outcome first.
   - Infer defaults from the outcome and available capabilities.
   - Ask only questions that change safety, cost, privacy, or execution behavior.
   - Configure reversible defaults automatically.
   - Show a plain-language plan before consequential actions.
   - Run a dry run and a small acceptance test.
   - Keep setup resumable and recoverable.
   - Record every decision and configuration change in the workspace evidence log.

   The setup agent must never silently create broad permissions, connect a private account, publish data, or enable external side effects. It should explain the missing authorization and request approval at the exact point it is needed.

6. **Public Workflow Engine**
   - Generic event ingestion and normalization.
   - Stages, queues, retries, schedules, assignments, ownership, automation toggles, and webhooks.
   - Idempotent side effects, duplicate protection, approvals, and audit history.
   - Provider-neutral schemas and synthetic fixtures only.

7. **JEv Decision Layer**
   - Intent, urgency, risk, task-state, confidence, routing, and escalation.
   - Tool and agent selection, abstention, calibration, drift alerts, and correction feedback.
   - Replaceable provider interface.

8. **Agent Quality Flywheel**
   - Record outcomes, evidence, configuration fingerprints, tools, memory, model, latency, tokens, cost, retries, and corrections.
   - Frozen evaluations for groundedness, tool selection, compaction, recovery, policy boundaries, and correction retention.
   - Replayable regressions with human ratings separate from model self-ratings.

9. **Open channel control plane**
   - Telegram, Discord, and Slack as equal views into one workspace.
   - Shared identity, permissions, threads, files, approvals, and events.
   - Sandbox workspaces, rate limits, retries, and no preconnected accounts.

10. **Cost-aware execution**
    - Route simple work to inexpensive/local models and reserve stronger models for high-judgment tasks.
    - Cache stable prompt sections and retrieval results; batch independent work.
    - Track cost by workspace, project, agent, task, model, provider, and channel.
    - Show savings against an uncompressed baseline.

11. **Command center**
    - Work board, agent room, context inspector, evidence, approvals, failures, cost, quality, drift, and recovery.
    - Show what the agent knows, received, compressed, and the source supporting each important fact.
    - Allow operating-path changes without losing state.

12. **Security and privacy**
    - Least-privilege tools and channel scopes.
    - Secret-provider interface with redaction.
    - Export and log scanning.
    - Synthetic fixtures and reproducible installation.
    - Release scanner for phone numbers, emails, tokens, local paths, customer records, private prompts, and production snapshots.

## Implementation order

### Phase 0: Public boundary

Create a clean public package boundary, exclusion scanner, synthetic fixtures, public/private documentation split, and release gate that fails on personal or production data.

### Phase 1: State and transport

Define event, task, checkpoint, evidence, memory, context-envelope, cost, and quality schemas. Implement append-only events, typed active state, context selection, compression, provenance, reversible expansion, and token instrumentation.

### Phase 2: Controller and recovery

Implement dependency scheduling, pause/resume, retry, cancellation, approvals, recovery, idempotency keys, side-effect ledgers, evidence-based completion, canary replay, and checkpoint rollback.

### Phase 3: JEv and quality

Wire JEv into classification, routing, confidence, escalation, and evaluation. Add deterministic test providers, drift detection, correction retention, and frozen evaluation cases.

### Phase 4: Workflow Engine

Implement generic ingestion, normalization, queues, stages, assignments, automation toggles, webhooks, schedules, event replay, duplicate protection, and audit history.

### Phase 5: Channels and providers

Implement Telegram, Discord, and Slack adapters with sandbox onboarding and permission tests. Add provider/model adapters and cost metadata. Keep iMessage optional and explicitly unverified.

### Phase 6: Guided setup and UI

Build the setup orchestrator before polishing the remaining UI. It must support goal-first setup, capability discovery, role design, agent creation, tool and channel configuration, permission review, dry runs, acceptance tests, resumable setup, and rollback. Then build command-center surfaces for work, context, evidence, cost, quality, and drift. Add path selection and switching with source-backed status.

### Phase 7: Validation and release

Run unit, integration, channel, recovery, security, privacy, and end-to-end tests. Measure token savings, quality retention, recovery rate, correction rate, latency, and cost. Perform a clean-room release audit before publishing.

## Acceptance metrics

- Measured context-compression savings with acceptable quality retention.
- Correct recovery after restart and provider failure.
- No loss of verified facts after compaction.
- Lower repeated-instruction rate than a transcript-only baseline.
- Correct tool selection after context reduction.
- Detectable routing, model, prompt, and memory drift.
- Reproducible Telegram, Discord, and Slack sandbox operation.
- Zero private data in the release archive.
- New-user setup without editing internal files.
- A new user can describe a desired role or workflow and receive a working, tested agent without manually assembling prompts, tools, memory, schedules, or permissions.
- Every external side effect traceable to policy, approval, and evidence.

## Current truth

The staging project contains partial UI, prototype memory, prototype completion, test adapters, and specifications. The setup orchestrator now turns natural-language goals into role proposals, durable sandbox agent records, capability plans, approval-pending connection records, and channel runtime lifecycle states. Telegram, Discord, and Slack have provider-neutral sandbox adapters. These are not live account integrations.

The public Workflow Engine facade, AgentForge controller, bounded context transport, integrated JEv routing, setup orchestration, provider-neutral callback contract, and approval-gated channel lifecycle are implemented and covered by local tests. Real provider adapters, webhook/polling health checks, live tool setup, and browser verification of the callback approval screen remain release work. Documentation and sandbox adapters are not evidence that a live external account is connected.

## Sources reviewed

- OpenClaw releases 2026.9.2, 2026.9.4, and 2026.9.6
- OpenClaw public documentation and product notes
- Hermes Agent official repository and configuration documentation
- Grok Agent Dashboard announcement
- Harness memory documentation
- AWS AgentCore memory documentation
- Cloudflare Agents harness documentation
- Anthropic managed-agent engineering documentation
- AgentForge roadmap, quality flywheel, memory audit, extension guide, and Terra completion plan
