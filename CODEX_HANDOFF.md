# AGENTFORGE VNEXT — MASTER BUILD HANDOFF FOR CODEX

**Date:** 2026-09-23  
**Workspace:** `C:\Users\mscott\AI_Workspace\AgentForge-Staging`  
**Git Branch:** `vnext`  
**Current Test Status:** 34 / 34 test suites passing (281 passed, 2 skipped, 0 failed)  
**TypeScript Diagnostics:** 0 errors (`npx tsc --noEmit` exits clean)  
**Build Status:** Clean compilation (`npm run build` succeeds)

---

## 1. Executive Summary & Core Laws

You are taking over the autonomous build and verification of **AgentForge vNext**, an open-source, multi-tenant AI workforce platform specified across 50 sections (0–49) in [`all_markdown_files/AUTONOMOUS_MASTER_BUILD_GOAL.md`](all_markdown_files/AUTONOMOUS_MASTER_BUILD_GOAL.md) and tracked in [`all_markdown_files/IMPLEMENTATION_TRACEABILITY.md`](all_markdown_files/IMPLEMENTATION_TRACEABILITY.md).

### Non-Negotiable Invariants:
1. **Production Isolation**: All work occurs **strictly** inside `AgentForge-Staging` on branch `vnext`. Never touch sibling directories (e.g. OpenClaw, production).
2. **Zero Hardcoded Data**: Zero personal or client data hardcoded; remain 100% generic, multi-tenant, with pluggable templates.
3. **SOP Is Not Authority**: An SOP or Procedure never grants execution authority. Only the cryptographic `ExecutionContract` authorized by an owner grants authority. Unprivileged operations or unresolved blockers immediately halt execution, transition task to `waiting_approval`, and create a durable human `ApprovalRequest`.
4. **Completion Authority**: Worker LLMs have **zero authority** to mark tasks `COMPLETE_VERIFIED`. Only the deterministic `CompletionEngine` verifies evidence packs and enforces transition invariants.
5. **Fail-Closed Security**: External channels, unauthenticated callers, symlink escapes, path traversals, and unmeasured benchmark fallbacks **always fail closed**.

---

## 2. Verified Subsystems & Code Architecture

### A. Governed Process Execution & SOP Governance (Sections 21, 22, 23, 24) — VERIFIED
- **Core File:** `src/core/process/processExecutionEngine.ts`
- **Invariants:** Sequential SOP step execution governed by `ExecutionContract`. Detects privileged operations (file deletion, deployment, external network, force-push). If contract authority is lacking or a step contains an unresolved blocker rule, execution immediately halts, emits a blocker, transitions task to `waiting_approval`, and creates a durable `ApprovalRequest`.
- **Runtime Wiring:** `src/core/runtime/taskWorkerRuntime.ts` binds processes to agents and captures `process_execution_trace.json`, sealing it inside the task's cryptographic `EvidencePack`.
- **Change Management:** `revalidateAgentsForProcess` re-audits all bound agents when an SOP revision is updated and records system audit entries.
- **Tests:** `src/core/process/processExecutionEngine.test.ts` (6 tests, 100% pass).

### B. Voice Subsystem & Workspace Telephony Lifecycle (Sections 25, 26, 27, 28) — VERIFIED
- **Core Files:** `src/providers/voice/retellVoiceProvider.ts`, `src/core/voice/callLifecycleManager.ts`, `src/core/types/voice.ts`
- **Invariants:**
  - `RetellVoiceProvider` fails closed when credentials are unset, validates timing-safe HMAC SHA-256 signatures (`verifyWebhookSignature`), and normalizes payloads into canonical `Call` domain models.
  - `CallLifecycleManager` processes completed calls: posts markdown summaries to canonical workspace channels, extracts commitment action items into queued tasks, flags high-risk calls for human approval, and commits operational memory.
  - REST endpoint: `POST /api/voice/calls`.
- **Tests:** `src/providers/voice/voiceSubsystem.test.ts` (4 tests, 100% pass).

### C. Compute & Sandbox Isolation (Section 36) — VERIFIED
- **Core Files:** `src/core/compute/localSandboxComputeProvider.ts`, `src/core/compute/dockerComputeProvider.ts`
- **Invariants:**
  - Manages isolated worktrees, command execution timeouts, sanitized environment variables, and network restriction policies.
  - Collects and serves real host telemetry (CPU count, architecture, total/free memory, Node heap memory) via `GET /api/compute`.
- **Tests:** `src/core/compute/computeSubsystem.test.ts` (6 tests, 100% pass).

### D. Approvals & Multi-Channel Remote Control (Sections 8, 9, 10, 32) — VERIFIED
- **Core Files:** `src/core/mirror/universalMirrorRouter.ts`, `src/providers/channels/discordMirror.ts`, `src/providers/channels/telegramMirror.ts`
- **Invariants:**
  - Bidirectional message synchronization between Web, Telegram, and Discord with loop suppression (`!msg.externalProvider`).
  - Remote control commands (`/status`, `/tasks`, `/agents`, `/approvals`) and interactive button callbacks.
  - Requires linked identity (`store.linkExternalIdentity`); unlinked interactions fail closed.
  - Resolving approvals durably sets `approverUserId`, updates linked task status, and logs audit trails.
- **Tests:** `src/core/mirror/universalMirrorRouter.test.ts` (5 tests), `src/core/approvals/approvalSubsystem.test.ts` (3 tests).

### E. Activity & Cryptographic Audit Trail (Section 34) — VERIFIED
- **Core Files:** `src/core/types/audit.ts`, `src/core/store/workspaceStore.ts`, `src/server/webServer.ts`
- **Invariants:**
  - Every entry contains a deterministic SHA-256 `hash` chaining to `previousHash` (originating from `GENESIS_AUDIT_HASH`).
  - `store.verifyAuditChain()` verifies every link and canonical hash; detects tampering with action, details, actor, or severed linkages.
  - `store.pruneAuditTrail({ retentionDays, maxEntries })` prunes history while creating an anchor `auditPrunedCheckpoint.lastPrunedHash`, maintaining unbroken cryptographic verification.
  - Snapshot persistence preserves the chain and pruned checkpoint across restarts.
  - REST API: `GET /api/audit` (query filtering by `origin`, `actorId`, `targetType`), `GET /api/audit/verify`, and RBAC-gated `POST /api/audit/prune`.
- **Tests:** `src/core/audit/auditSubsystem.test.ts` (6 tests, 100% pass), `src/server/webServer.workspaceRoutes.test.ts` (3 tests).

### F. Benchmark Domain, Benchmark Everything & Empirical Routing (Sections 47, 48, 49) — VERIFIED
- **Core Files:** `src/core/types/benchmark.ts`, `src/providers/benchmark/benchmarkSuites.ts`, `src/providers/benchmark/benchmarkRunner.ts`, `src/core/router/empiricalRouter.ts`
- **Invariants:**
  - "DO NOT TRUST PROVIDER CLAIMS. MEASURE."
  - Standard suites defined for Models (`suite-model-intent-v1`, `suite-model-tools-v1`), Harnesses (`suite-harness-isolation-v1`), and Packages (`suite-package-manifest-v1`).
  - Evaluates quality thresholds (`gte`, `lte`, `eq`) and outputs `CompatibilityResult`.
  - `EmpiricalRouter.route()` enforces that candidates without measured benchmarks receive pass rate 0 and status `UNKNOWN`. For high/critical risk tasks, fallback targets are explicitly labeled `UNKNOWN`. Once benchmarks are measured, lowest-cost demonstrated-capable candidates win.
  - REST API: `GET /api/benchmarks`, `POST /api/benchmarks/run`, and `POST /api/route` (synchronized with store benchmark history).
- **Tests:** `src/providers/benchmark/benchmarkSubsystem.test.ts` (4 tests, 100% pass).

### G. Package Standard & Marketplace Security (Sections 38, 39, 40, 43) — VERIFIED
- **Core Files:** `src/providers/marketplace/localPackageProvider.ts`, `src/providers/marketplace/archiveInspector.ts`
- **Invariants:**
  - Safe manifest validation, path traversal segment rejection, Windows reserved device checks, executable mode blocking.
  - In-memory bounded ZIP inspection (`inspectPackageZipArchive`) against CRC-32 corruption, traversal paths, symlinks, and expansion ratios.
  - `installFromArchive` validates archive in-memory before writing files.
  - `installPackage` requires explicit permission review and enforces that approved permissions are a strict subset of requested permissions.
  - `uninstallPackage` / `removeInstallation` cleans up packages and logs audit events.
  - REST API: `GET /api/packages`, `POST /api/packages/install`, `POST /api/packages/uninstall`.
- **Tests:** `scripts/package-cli-acceptance.mjs`, `src/server/webServer.test.ts`.

---

## 3. Immediate Verification Commands

Before writing any new code, verify current health with these exact commands:

```bash
# 1. Typecheck (Must be 0 errors)
npx tsc --noEmit

# 2. Run all test suites
npx vitest run

# 3. Package CLI acceptance
node scripts/package-cli-acceptance.mjs

# 4. Build output
npm run build
```

---

## 4. Next Steps for Codex to Reach 100% Completion

Review [`all_markdown_files/IMPLEMENTATION_TRACEABILITY.md`](all_markdown_files/IMPLEMENTATION_TRACEABILITY.md):

1. **Update `IMPLEMENTATION_TRACEABILITY.md`**:
   - Update rows 34 (Activity / Audit), 38-40 (Package Standard & Security), 43 (Package Dev UX), and 47-49 (Benchmark Domain, Everything, & Empirical Routing) to **Verified** with concrete evidence descriptions.
2. **Sections 12 & 13 (Event Ledger Durability & Web Socket/SSE Reconnect)**:
   - Ensure `EventLedger` concurrent appending and SSE stream heartbeats/reconnection recovery pass rigorous stress tests.
3. **Sections 41, 42, 44, 45, 46 (Marketplace Economy & Commercial Services)**:
   - These are remote/hosted commercial capabilities (e.g. Stripe payouts, external hosting).
   - Ensure the local platform exposes clear, fail-closed boundaries with honest `status: "LOCAL_ONLY_NOT_HOSTED"` rather than mock facades.
4. **Final Acceptance Run**:
   - Execute full test suite, verify clean logs, and complete the master build goal!
