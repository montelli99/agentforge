# AgentForge vNext — Architecture & Kickoff Plan

## Executive Inspection Findings

A comprehensive inspection of the workspace was conducted in strict adherence to Section 1 of the Master Kickoff Specification ("INSPECT, DO NOT BUILD YET").

### Repository & Workspace Status
- **Filesystem Path**: `C:\Users\mscott\AI_Workspace\AgentForge-Staging`
- **Git Root**: `C:\Users\mscott\AI_Workspace` (Parent workspace git root)
- **Current Branch**: `master` (in parent repo)
- **HEAD**: `802e04a Restore Pipeline memory contract after Aug 20 force-push incident`
- **Remote**: `origin https://github.com/montelli99/prolific-ghl-webhook.git`
- **Git Status**: Untracked directory (`?? AgentForge-Staging/`) in parent repository. `AgentForge-Staging` does not currently contain its own independent `.git` directory.
- **Package Manager**: `pnpm` (pnpm-lock.yaml and package.json present) / `npm` / `npx`
- **Language / Framework**: TypeScript / Node.js (native `node:http`), `tsx` runner, `vitest` v4.1.11 test runner.
- **Existing UI**: Single-file server-rendered HTML/CSS/JS dashboard embedded in `src/server.ts` (`/dashboard`, `/settings`), displaying token reduction metrics, cache hit counters, and real-time SSE stream for proxy requests.
- **Existing Backend**: Node.js HTTP server in `src/server.ts` listening on port 3000, functioning primarily as an OpenAI-compatible optimization proxy (`/v1/chat/completions`) with endpoints for `/health`, `/dashboard`, `/dashboard.json`, `/metrics.csv`, `/summary/daily`, and `/events`.
- **Existing Database**: In-memory state only (arrays, Maps) for request logs, cache, cost ledger, session manager, and embeddings. Configuration stored in `.env`. No SQL or SQLite persistent database.
- **Existing Agent Implementation**: None. The codebase contains `AgentForgeBroker` (envelope routing/reflection) and `AgentForgeOptimizer` (prompt compression, caching, token elimination), but no agent teammates, execution loops, or harness runners.
- **Existing Worktree Implementation**: None.
- **Existing Task System**: None (contains only a `TaskComplexity` prompt classification enum `simple | moderate | complex | expert` for model selection and caching keys).
- **Existing Model Integration**: OpenAI, Ollama, and MiniMax endpoints; tied to OpenClaw embedding scripts with fallback to hash embeddings.
- **Existing Tests**: 4 test files (`src/broker.test.ts`, `src/phase3d.test.ts`, `src/memoryContextOptimizer.test.ts`, `src/bridge.test.ts`) with **60 passing tests** (verified via `vitest`).
- **Existing Documentation**: `README.md`, `FIRST_TESTER_GUIDE.md`, `LAUNCH_CHECKLIST.md`, `MANIFEST.json`, `MEMORY_AUDIT.md`, `QUICKSTART.md`, `TESTER_FEEDBACK.md`.

### Project Classification
AgentForge-Staging is **A. Existing AgentForge code** (specifically, an earlier prototype built around August 2026 focused on an LLM Optimization Proxy / Broker / Token Elimination Layer).

### Preservation Strategy
Existing work will **NOT** be destructively overwritten. The existing optimization modules (`optimizer.ts`, `cache.ts`, `compression.ts`, `contextFingerprints.ts`, `costLedger.ts`, `tokenAccounting.ts`, `reflection.ts`, `policy.ts`, and test suites) provide high value for the eventual optimizer/telemetry tiers.
We will isolate and preserve this baseline while scaffolding the new vNext core control plane.

---

## User Review Required

> [!IMPORTANT]
> **Git Repository Boundary & Isolation Decision**:
> `AgentForge-Staging` currently sits inside `C:\Users\mscott\AI_Workspace` which is linked to `montelli99/prolific-ghl-webhook.git`.
> To protect production systems and establish AgentForge as an open-source, self-hostable workspace:
> 1. Should we initialize `AgentForge-Staging` as its own standalone Git repository (e.g. `git init` inside `AgentForge-Staging` on branch `vnext`, with a dedicated `.gitignore`), completely decoupled from the parent `prolific-ghl-webhook` repo?
> 2. Or should we preserve it as a subfolder within the existing parent repo on a new branch?
>
> *(Recommendation: Initialize an independent Git repository within `AgentForge-Staging` on branch `vnext` so it is isolated from `prolific-ghl-webhook` and production code, and ready for open-source distribution).*

> [!WARNING]
> **Production Boundary Strict Enforcement**:
> Per Section 2 of the specification, all existing production systems (`OpenClaw`, `prolificcapital-recovery`, `Hermes`, `Orion`, `PPC`, `JustCall`, `GHL`) are strictly read-only or out of scope. Any references in the existing AgentForge code pointing to `OpenClaw` (such as `../../OpenClaw/src/agents/defaults.js` or `embeddingAdapter.ts`) will be decoupled in vNext so AgentForge has no hard dependency on OpenClaw.

---

## Proposed Architectural Phases for AgentForge vNext

### Phase 1: Core Foundation & Provider Abstractions
Establish the provider-neutral backbone where AgentForge owns the control plane:
- **Provider Interfaces**:
  - `HarnessProvider` (`id`, `capabilities`, `startSession()`, `resumeSession()`, `executeTask()`, `streamEvents()`, `cancelTask()`, `getState()`, `shutdown()`)
  - Initial stub adapters: `PiHarnessProvider`, `PydanticHarnessProvider`, `AgentForgeNativeHarness`
  - `GenerativeModelProvider` (neutral interface for Ollama, OpenAI, Anthropic, OpenRouter, custom OpenAI-compatible)
  - `DecisionProvider` (clean separation for System-1 / Jev / classification models vs generative models)
  - `MemoryProvider` (engineering/operational memory: task history, repo history, commits, test results, do-not-repeat constraints)
  - `ChannelProvider` (Web, Telegram, Discord, CLI, API)
  - `ComputeProvider` / `SandboxProvider` (local workspace, local sandbox, future docker/cloud)
  - `ToolProvider`, `SecretProvider`, `StorageProvider`

### Phase 2: Canonical Workspace & Dual-Mirror Database
Implement the unified canonical schema (SQLite / Prisma or Kysely / Drizzle) supporting 2-way live sync:
- **Canonical Structure**:
  - `Workspace` → `Space` → `Channel` → `Thread` → `Message`
  - `Agent` (name, avatar, role, harness policy, model policy, permissions)
  - `Task` (id, project, assigned agent, status, priority, execution contract)
  - `ExecutionContract` (scope, allowed paths, protected files, authority gates, required checks, evidence requirements)
  - `Approval` (requester, task, action, risk, evidence, status, decision origin)
  - `ExternalBinding` (durable bidirectional mapping with `sync_direction`, `sync_state`, `last_cursor`)
  - `EventLedger` (immutable, idempotent event log for inbound/outbound sync, replay, and audit trail)

### Phase 3: Bidirectional Channel Mirroring & Remote Control
- Channel provider adapters for Telegram and Discord with bidirectional topic/channel synchronization.
- Telegram remote control surface (`/status`, `/tasks`, `/approvals`, interactive inline buttons: Approve, Reject, View Diff, Cancel).
- Discord component interaction mapping to the exact same canonical actions.

### Phase 4: Modern Web Workspace & Execution Plane UI
- 3-column desktop layout:
  - Left: Canonical tree (Workspaces, Channels, Telegram/Discord mirrored spaces)
  - Center: Message stream / conversation & interactive task updates
  - Right: Rich Context Panel (Agent info, Active Task, Execution Contract, Approvals, Diff viewer, Evidence Pack, Audit log)
- Real-time updates via WebSocket / SSE.
- Unified Inbox with status categorizations.

### Phase 5: Engineering Control, Git Worktree Isolation & Evidence Pack
- Git worktree manager for task isolation (one agent/worktree per concurrent task).
- Execution contract enforcer below the model layer.
- `EvidencePack` compiler: What did the agent do? Why? What changed (diff)? What tested it? Who approved it?

---

## Verification Plan

### Automated Verification
1. **Existing Test Suite Baseline**: Run `npx vitest run src --maxWorkers=1` to confirm all 60 existing tests remain passing.
2. **Provider Contract Tests**: Unit tests verifying that `HarnessProvider`, `GenerativeModelProvider`, `DecisionProvider`, and `ChannelProvider` adhere to contract specifications without provider leakage.
3. **Canonical Event Ledger Tests**: Test inbound/outbound event deduplication, idempotency, and transactional ledger replay.
4. **Mirror Binding Tests**: Test bidirectional state synchronization between mock Telegram/Discord structures and canonical AgentForge channels.

### Manual Verification
1. Verify no files outside `AgentForge-Staging` are touched.
2. Start the AgentForge service and verify clean startup, health check, and interface inspection.
