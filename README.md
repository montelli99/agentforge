# AgentForge vNext
### Self-hostable AI workforce platform and execution control plane

AgentForge is an open-source, self-hostable AI workforce control plane. The source is licensed under Apache-2.0. The current checkout has a passing local release-readiness audit, a built public package, privacy-isolation checks, and local acceptance evidence for the AgentForge-owned Telegram BotFather transport. No provider credential, account, workspace, or business record is included with this repository. Discord, Slack, hosted CI, and public publishing still require deployment-specific acceptance.

The readiness descriptions below distinguish code that exists from capabilities that have been validated with live providers. A durable workspace starts empty. Older showcase-only records are removed by a narrow migration and are never treated as connected users, agents, tasks, calls, or marketplace activity.

---

## 📊 Current Readiness (staging audit)

| Component | Status | Readiness Level | Implementation Notes |
| :--- | :---: | :---: | :--- |
| **Core Control Plane** | **IN DEVELOPMENT** | `PARTIAL` | Local REST/SSE control plane with versioned JSON snapshots, graceful restart coverage, and forced-termination recovery coverage. Multi-writer semantics, cross-platform evidence, and hosted release acceptance remain open. |
| **AgentForge Harness** | **PARTIAL** | `PARTIAL_INTEGRATION` | Native control plane and compute executor are built in; default remains fail-closed until an approved compute backend is configured. |
| **Pi Execution Engine** | **EXPERIMENTAL** | `PARTIAL_INTEGRATION` | Optional embedded Pi SDK executor; credentials, governed tools, and deployment acceptance remain external. |
| **Pydantic AI Execution Engine** | **EXPERIMENTAL** | `PARTIAL_INTEGRATION` | Optional bounded HTTPS/loopback service executor; no Python service is bundled. |
| **Ollama Local Provider** | **ALPHA** | `PARTIAL_INTEGRATION` | Dynamic model discovery via `/api/tags`, format json, $0 external API cost. |
| **OpenAI-Compatible Gateway** | **ALPHA** | `PARTIAL_INTEGRATION` | Provider-neutral ChatCompletions gateway (OpenRouter, LocalAI, vLLM, OpenAI). |
| **JEv System-1 Router** | **ALPHA** | `TEST_IMPLEMENTATION` | Standalone AgentForge-owned fast classifier with bounded intent matching. |
| **Scribe Process (File Import)** | **LOCAL PARSER** | `TEST_IMPLEMENTATION` | Parses supplied Markdown/HTML/SOP text; no Scribe cloud connection. |
| **Scribe Process (MCP / Sync)**| **PLANNED** | `NOT_CONFIGURED` / `UNIMPLEMENTED`| MCP server unconfigured; live cloud sync not yet implemented. |
| **Mock Voice Simulator** | **ALPHA** | `MOCK` (Release Demo) | Full-fidelity call simulator emitting transcripts, tool events, and post-call summaries. |
| **Retell Voice Telephony** | **EXPERIMENTAL** | `SKELETON` | Telephony contract skeleton. Zero live calls placed; awaits staging credentials. |
| **AGNI Voice Provider** | **PLANNED** | `UNIMPLEMENTED` | Provider slot reserved. EXACT AGNI PRODUCT NOT YET VERIFIED. |
| **Telegram Mirror & Conflict Guard**| **IMPLEMENTED** | `LOCAL_ACCEPTANCE` | AgentForge-owned BotFather bot transport, advanced MTProto user-session transport, and an optional migration relay are implemented. Each deployment still needs its own authorized provider acceptance. |
| **Discord Mirror** | **PARTIAL** | `PARTIAL_INTEGRATION` | Standalone Gateway v10 transport handles interactions and ordinary messages; live bot acceptance remains deployment-specific. |
| **Slack Mirror** | **PARTIAL** | `PARTIAL_INTEGRATION` | AgentForge-owned Socket Mode transport handles acknowledged events and outbound messages; live app acceptance remains deployment-specific. |
| **Migration Center** | **FIXTURE TESTS** | `TEST_IMPLEMENTATION` | Local fixture adapters exist; no live source discovery or production migration is verified. |
| **Compute / Sandboxes** | **LOCAL VERIFIED** | `PARTIAL_INTEGRATION` | An opt-in, human-approved Docker backend has a real isolated-worktree, network-disabled local acceptance run. The default installation stays offline until an operator configures a repository and enables it. |
| **Marketplace** | **LOCAL PROTOTYPE** | `NOT COMMERCIALLY READY` | Local package manifests/install flow only; no hosted marketplace, publisher verification, or payments. |

The test suite covers local and fixture behavior. A passing test run does not replace deployment-specific provider acceptance; see [`docs/RELEASE_STATUS.md`](docs/RELEASE_STATUS.md) for the current evidence and remaining gates.

The public boundary between the three cooperating systems is documented in [`docs/PUBLIC_SYSTEM_ARCHITECTURE.md`](docs/PUBLIC_SYSTEM_ARCHITECTURE.md): AgentForge (workforce control), Workflow Engine (process execution), and JEv (fast decision routing).

Channel setup is self-service and provider-specific. Telegram uses the normal
BotFather path; Discord uses the Developer Portal flow documented in
[`docs/DISCORD_SETUP.md`](docs/DISCORD_SETUP.md); and Slack uses Socket Mode
as documented in [`docs/SLACK_SETUP.md`](docs/SLACK_SETUP.md). None of these
paths requires OpenClaw or Hermes.

For starting, backing up, restoring, upgrading, and keeping a local deployment
within its execution boundary, see the generic [local operations runbook](docs/LOCAL_OPERATIONS.md).

The dated competitive and release-gap audit is [`docs/MARKET_AUDIT_2026-09-25.md`](docs/MARKET_AUDIT_2026-09-25.md). It is a research snapshot and must be refreshed before claiming market leadership or public-release readiness.

---

## 🌟 Core Pillars

1. **Canonical Workspace Model**
   - Structured hierarchy: `Workspace` $\rightarrow$ `Space` $\rightarrow$ `Channel` $\rightarrow$ `Thread` $\rightarrow$ `Message`.
   - Agent records model roles, goals, routing policies, tool grants, execution bounds, and memory namespaces.
   - The vNext launcher persists canonical workspace state and operational memory to local versioned JSON snapshots with backup recovery. This is local-first staging storage, not a multi-node production database.
   - Operational memory supports durable local records and retrieval; broad automatic task-history retrieval and semantic evaluation remain further work.

2. **AgentForge Harness & Optional Execution Engines**
   - AgentForge owns the control plane, execution contracts, approvals, memory, routing, compute boundaries, and evidence lifecycle.
   - Pi and Pydantic are optional execution engines selected by an operator; neither is required for AgentForge to run.
   - **Decoupled Intelligence**: Strict architectural separation between Generative Models (`OllamaModelProvider`, `OpenAIModelProvider`, 5-tier `ModelRouter`) and Decision Classification (`JevDecisionProvider` for fast, inexpensive System-1 intent classification).
   - **Compute & Sandboxing**: Provider interfaces, a Git `WorktreeManager`, and an opt-in contracted Docker backend are wired through the launcher. The default install remains offline; Docker must be available, an absolute repository must be explicitly configured, and each task still needs a human-approved plan.

3. **Universal Bidirectional Channel Mirroring & Conflict Guard**
   - Local web messages and channel abstractions are canonical. Telegram has an AgentForge-owned BotFather path for normal setup, an advanced MTProto user-session path, and an optional migration relay; Discord has a standalone Gateway v10 path; Slack has an AgentForge-owned Socket Mode path. Live channel synchronization must still be verified against operator-authorized sandbox accounts.
   - Slash-command, ordinary-message, outbound delivery, and conflict-guard paths are covered locally; live identity/RBAC and provider acceptance remain environment checks.
   - Cutover phases are represented in code; this is not evidence of a live cutover or production-safe deployment.

4. **Process-to-Agent & SOP Compiler**
   - Ingests human procedures from Scribe SOPs, Markdown documents, and structured step lists.
   - Enforces **"SOP IS NOT AUTHORITY"**: SOPs document human operational intent; privileged actions automatically generate `UnresolvedBusinessRules` and require explicit `ExecutionContract` bounds.

5. **Voice Subsystem**
   - A local call simulator exists; Retell remains a skeleton and has not placed live calls.
   - Call records can be stored in the workspace, but live transcripts, tool events, dispositions, and real-provider cost telemetry are not verified.

6. **Execution-Contract Foundation (Incomplete)**
   - **Execution Contracts**: Types and selected checks exist for declared paths, authority flags, selected command patterns, and spend. They do not yet govern every side effect below every model/provider path.
   - **Approval Engine**: Local state and UI/API code exist; authenticated approver identity and execution-time enforcement remain release gates.
   - **Evidence Packs**: Types/builders exist; automatic, verified evidence generation is not yet an end-to-end workflow.

7. **Developer Economy & Marketplace Standard**
   - Standardized package manifest (`manifest.json`) declaring permissions, required secrets, tool exports, benchmark gates, and pricing models.
   - `LocalPackageProvider` validates manifests, and `agentforge pack inspect-archive <package-directory> <archive.zip>` verifies bounded ZIP contents in memory against the manifest without writing files. Neither capability provides runtime package isolation or a complete malware/security review.

8. **Web Control Plane & CLI**
   - **Web Control Plane**: The built launcher serves the workspace UI, setup orchestrator, command room, memory, evidence, browser, and provider controls. View-by-view browser acceptance remains a release gate for hosted deployment.
   - **Security**: Localhost-only binding (`127.0.0.1`) by default.
   - **Developer CLI (`agentforge`)**: Commands for package initialization, manifest validation, non-extracting ZIP inspection, a clear not-yet-implemented package-test response, local manifest benchmarking, and workspace status.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 22+
- Git

### 1. Installation

From an AgentForge source checkout:
```bash
# Install exactly from the checked-in pnpm lockfile
pnpm install --frozen-lockfile
```

### 2. Launching the Web Control Plane
```bash
pnpm vnext
```
Open your browser to:
```
http://127.0.0.1:3460
```

### 3. Running the Full Test Suite
Run the local test suite:
```bash
pnpm test
```

Check the primary vNext server and CLI TypeScript paths:
```bash
pnpm typecheck
```

`pnpm typecheck:all` checks the complete TypeScript source tree, including legacy scripts, benchmarks, demos, and test files. `pnpm check` runs that check, the test suite, and the production build.

For the public release preflight (typecheck, privacy isolation, package-surface, forced-recovery, and Docker acceptance), run `pnpm verify:public`.

Live provider smoke cases require both provider credentials and the explicit `AGENTFORGE_LIVE_TESTS=1` opt-in. A configured API key alone never causes `pnpm test` to make paid requests.

---

## First secure owner setup

For a shared or long-lived deployment, enable `AGENTFORGE_AUTH_STRICT=1`. The first browser visit receives a simple local owner setup screen; it stores only a password hash locally and uses an HttpOnly, same-site session cookie. Headless and CLI clients can use `POST /api/auth/bootstrap` instead; see [local operations](docs/LOCAL_OPERATIONS.md#first-secure-owner-setup).

## Current safety scope

This staging checkout ships without connected provider credentials, accounts, workspaces, customer records, or business automations. Local code and fixtures are not proof that every external side effect is gated or that production isolation has passed a security review. For a deliberate non-loopback deployment, configure `AGENTFORGE_API_TOKEN` and require its bearer token on API requests. The remaining controls and acceptance evidence are tracked in `LAUNCH_CHECKLIST.md`.

---

## 📜 License

Licensed under [Apache License 2.0](LICENSE). Third-party dependencies retain their respective licenses. See [the licensing decision](docs/LICENSE_DECISION_MATRIX.md).
### Public release readiness

Run `pnpm release:audit` after building to inspect the public package, privacy gates, and owner-controlled publishing blockers. Publishing remains an explicit owner action.
See [`docs/RELEASE_STATUS.md`](docs/RELEASE_STATUS.md) for the current evidence-backed release checklist and remaining environment gates.
