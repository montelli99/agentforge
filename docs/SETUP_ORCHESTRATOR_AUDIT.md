# AgentForge setup orchestrator audit

## Purpose

AgentForge must be usable by a non-technical person. A user states an outcome in ordinary language; the system proposes the workforce, identifies the missing capabilities, asks only material questions, and prepares safe drafts. It must not require the user to hand-create every agent, role, connector, or permission.

The public system has three cooperating layers: **AgentForge** owns the workforce and control plane, the **Workflow Engine** owns repeatable stages and evidence, and **JEv** owns fast System-1 classification and routing. Their boundary is published by `src/publicSystemManifest.ts` and `GET /api/system/manifest`.

## Implemented

- `src/setupOrchestrator.ts` converts a natural-language goal into a durable setup plan.
- The plan proposes roles, capabilities, automatic preparation steps, approval-gated steps, and only the questions that cannot be inferred safely.
- `buildAgentProvisionDrafts` creates sandbox-only agent drafts with no tools, no provider credentials, scoped memory, and approval-only permissions.
- `proposeCapabilitySetup` produces explicit capability proposals instead of silently changing external systems.
- `src/capabilitySetupExecutor.ts` records whether a proposal is ready, requires approval, or is unavailable. It never stores or mutates raw credentials.
- `src/channelConnectionRegistry.ts` separates sandbox registration from live connection requests for Telegram, Discord, and Slack. Live requests require a secret reference and explicit approval.
- `src/channelRuntimeRegistry.ts` provides a provider-neutral start/stop/status lifecycle for those channels.
- `src/providers/channels/slackMirror.ts` adds the Slack mirror adapter while preserving the same safety contract as the Telegram and Discord mirrors.
- Setup routes expose plan, capability, provisioning, connection, and runtime status through the local control plane.
- Setup plans are persisted as operational memory records and restored from the workspace store after a refresh or process restart.
- Owner answers are persisted as separate setup-guide memory records through `POST /api/setup-guide/answers` and returned by setup status, so a new model can resume without chat history.
- Generic provider callbacks are supported through `POST /api/setup-guide/connections/callback`; only an external workspace ID and secret reference are retained, and the connection is approval-gated until the explicit callback approval is supplied. The route is covered by the setup-guide API test.
- `src/controller/agentController.ts` provides the inner controller: JEv classifies ordinary-language setup/review/route/execute requests instead of defaulting unmatched questions to setup, and marks execution as approval-required.
- The Agent Studio guide now renders the persisted plan, proposed teammates, and required owner questions directly in the first-run workspace view.
- Agent Studio now also renders the durable owner answers returned by setup status, making handoff state visible to the next model or operator.
- Repeated setup preparation now preserves prior plans as revisions, and Agent Studio renders the recent plan history.
- `src/workflowEngine.ts` is the public workflow facade. It compiles a process, exposes unresolved authorization rules, computes whether execution is safe, and starts a completion-engine goal without owning any private business system.
- `src/contextPacket.ts` creates bounded, provenance-tagged handoffs shared across the three layers. It deduplicates and compresses source material, records token savings, marks truncation explicitly, and enforces the requested token ceiling even for very small packets.
- The existing `/api/route` path now includes the JEv controller decision and context packet alongside empirical routing, so the handoff contract is exercised by normal task routing.
- `UniversalMirrorRouter` now sends inbound Telegram, Discord, Slack, and web events through the same controller and records the packet ID, intent, approval state, and packed token count in the audit trail before command handling.
- `GET /api/system/manifest`, `POST /api/controller/inspect`, and `POST /api/workflows/inspect` expose the three-layer public architecture through the local control plane.
- The model router preserves an explicitly selected local Ollama route when cloud providers are absent; it no longer silently substitutes a different provider.

## Safety boundary

The public repository contains no operator business-system data, customer records, personal phone numbers, private channel content, API keys, proprietary material, or business-specific automation. The current setup path is sandbox-only until a user deliberately approves a live connection.

## Required operator flow

1. Submit a goal in plain language.
2. Review the inferred roles, capabilities, and questions.
3. Approve sandbox agent drafts.
4. Answer only unresolved setup questions.
5. Connect a channel using a secret reference; raw secrets stay outside the repository.
6. Review the evidence and capability status before enabling live execution.

## Remaining work

- Model-authored task plans are not connected by default. The production-safe
  approved-command path is verified locally: a human-approved plan runs in an
  isolated worktree and network-disabled Docker sandbox with actual command,
  artifact, diff, and revision evidence. A model provider remains an opt-in
  plan-drafting layer, never execution authority.
- Remote identity/RBAC, durable production storage, live provider adapters, webhook health checks, and real channel authentication remain open.
- Browser-level verification of the callback approval flow remains open; rendered UI and API acceptance are covered, but the external browser driver is not reliable against the local navigation surface.
- Extend context-packet enforcement to future controller entry points and broaden redaction scanning as release packaging grows.

## Verification record

- TypeScript typecheck: passed.
- Production build: passed.
- Setup, capability, connection, callback, runtime, Slack, controller, and model-routing focused tests: passed.
- Full Vitest suite (current 2026-09-25 gate): **50 files passed, 343 tests passed, 2 skipped**.
- TypeScript typecheck: passed.
- The master-build tests now assert the current AgentForge UI and honest runtime states rather than obsolete UI labels.
- Browser verification through Kane: passed. A natural-language goal produced a proposed two-agent team and an owner decision about sandbox mode; no external service was connected and no work executed.
- Workspace UI acceptance: passed after adding the provider callback controls and callback route assertions; live browser click-through remains environment-sensitive.

## Current evidence addendum — 2026-09-25

- The central readiness registry now exposes Telegram, Discord, and Slack as `TEST_IMPLEMENTATION` providers with explicit missing live-transport requirements.
- The channel adapters expose machine-readable readiness: native web is `local`; external mirrors are `sandbox`.
- The dated market audit is [`MARKET_AUDIT_2026-09-25.md`](MARKET_AUDIT_2026-09-25.md). It adds release requirements for visible execution, long-horizon recovery, independent verification, provider trust data, browser ownership, reversible self-improvement, multi-agent coordination, and reproducible benchmarks.
- `pnpm typecheck` and the focused channel/mirror tests pass after those changes.

This audit does not declare the entire product release-ready. It records the implemented setup/controller slice and the still-open production requirements above.

This file is the repeatable audit and handoff record. Update it whenever the setup orchestrator, controller, channel registry, or public/private boundary changes.
