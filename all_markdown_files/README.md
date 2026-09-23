# AgentForge vNext
### Self-Hostable AI Workforce Platform & Execution Control Plane

[![CI Status](https://github.com/montelli99/AgentForge/actions/workflows/ci.yml/badge.svg)](https://github.com/montelli99/AgentForge/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue)](https://github.com/montelli99/AgentForge)
[![Status](https://img.shields.io/badge/status-staging%20audit%20in%20progress-orange)](https://github.com/montelli99/AgentForge)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

AgentForge is an early-stage codebase intended to become an open-source, self-hostable AI workforce control plane. No distribution license has been selected yet, so the repository is not currently an open-source release. It contains working local components alongside mocks, test fixtures, and unfinished integrations and is **not a release candidate**: external channel connections, provider readiness, persistence, and full requirement coverage still need end-to-end verification.

The readiness descriptions below distinguish code that exists from capabilities that have been validated with live providers. Seeded records in a new workspace are examples; they are not connected users, agents, tasks, calls, or marketplace activity.

---

## 📊 Current Readiness (staging audit)

| Component | Status | Readiness Level | Implementation Notes |
| :--- | :---: | :---: | :--- |
| **Core Control Plane** | **IN DEVELOPMENT** | `PARTIAL` | Local REST/SSE control plane with versioned JSON snapshots; the built launcher restored an HTTP-created message after restart. Crash, concurrency, cross-platform, and release acceptance remain open. |
| **AgentForge Native Harness** | **TEST ONLY** | `TEST_IMPLEMENTATION` | Returns synthetic results and checks selected declared paths; it is not an OS sandbox or a complete execution-contract enforcement path. |
| **Pi Harness Adapter** | **EXPERIMENTAL** | `TEST_IMPLEMENTATION` | Clean public adapter contract and subprocess protocol active; awaits official packaging. |
| **Pydantic AI Harness** | **EXPERIMENTAL** | `NOT_CONFIGURED` | Optional Python backend. When Python is absent, reports `NOT_CONFIGURED` (not broken). |
| **Ollama Local Provider** | **ALPHA** | `PARTIAL_INTEGRATION` | Dynamic model discovery via `/api/tags`, format json, $0 external API cost. |
| **OpenAI-Compatible Gateway** | **ALPHA** | `PARTIAL_INTEGRATION` | Provider-neutral ChatCompletions gateway (OpenRouter, LocalAI, vLLM, OpenAI). |
| **Jev System-1 Router** | **ALPHA** | `TEST_IMPLEMENTATION` | Standalone AgentForge-owned fast classifier; sub-50ms intent matching. |
| **Scribe Process (File Import)** | **LOCAL PARSER** | `TEST_IMPLEMENTATION` | Parses supplied Markdown/HTML/SOP text; no Scribe cloud connection. |
| **Scribe Process (MCP / Sync)**| **PLANNED** | `NOT_CONFIGURED` / `UNIMPLEMENTED`| MCP server unconfigured; live cloud sync not yet implemented. |
| **Mock Voice Simulator** | **ALPHA** | `MOCK` (Release Demo) | Full-fidelity call simulator emitting transcripts, tool events, and post-call summaries. |
| **Retell Voice Telephony** | **EXPERIMENTAL** | `SKELETON` | Telephony contract skeleton. Zero live calls placed; awaits staging credentials. |
| **AGNI Voice Provider** | **PLANNED** | `UNIMPLEMENTED` | Provider slot reserved. EXACT AGNI PRODUCT NOT YET VERIFIED. |
| **Telegram Mirror & Conflict Guard**| **TEST_IMPLEMENTATION** | `SANDBOX ONLY` | Fixture-based behavior; no production Telegram credentials or live connection are configured. |
| **Discord Mirror** | **TEST_IMPLEMENTATION** | `MOCKED` | Fixture-based behavior; no production Discord connection is configured. |
| **Migration Center** | **FIXTURE TESTS** | `TEST_IMPLEMENTATION` | Local fixture adapters exist; no live source discovery or production migration is verified. |
| **Compute / Sandboxes** | **NOT READY** | `NOT CONFIGURED` | The control plane reports sandbox and host-memory telemetry as unavailable until real providers are connected. |
| **Marketplace** | **LOCAL PROTOTYPE** | `NOT COMMERCIALLY READY` | Local package manifests/install flow only; no hosted marketplace, publisher verification, or payments. |

The test suite covers local and fixture behavior; a passing test run is not evidence of live integrations or release readiness. The project remains under section-by-section requirements audit.

---

## 🌟 Core Pillars

1. **Canonical Workspace Model**
   - Structured hierarchy: `Workspace` $\rightarrow$ `Space` $\rightarrow$ `Channel` $\rightarrow$ `Thread` $\rightarrow$ `Message`.
   - Agent records model roles, goals, routing policies, tool grants, execution bounds, and memory namespaces.
   - The vNext launcher persists canonical workspace state to local versioned JSON snapshots with backup recovery. This remains staging storage, not production-grade durable storage; Operational Memory is still a separate in-memory prototype.
   - Operational-memory code exists as a prototype and is not a durable, integrated task-history system.

2. **Pluggable Provider Architecture & Harness Layer**
   - **Harness Candidates**: Pi Harness (default native harness candidate), Pydantic AI Harness (typed structured outputs), and AgentForge Native Harness.
   - **Decoupled Intelligence**: Strict architectural separation between Generative Models (`OllamaModelProvider`, `OpenAIModelProvider`, 5-tier `ModelRouter`) and Decision Classification (`JevDecisionProvider` for fast, inexpensive System-1 intent classification).
   - **Compute & Sandboxing**: Provider interfaces and a Git `WorktreeManager` exist. Docker/cloud sandbox providers are not connected; task execution is not yet wired end to end through the worktree manager.

3. **Universal Bidirectional Channel Mirroring & Conflict Guard**
   - Local web messages and channel abstractions exist. Telegram and Discord adapters are currently sandbox/test implementations; live channel synchronization has not been verified.
   - Slash-command and conflict-guard code exists, but must be tested against a separate sandbox bot before it is described as an operational integration.
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
   - **Web Control Plane**: The current launcher serves an inline local UI. Alternate UI prototypes are not wired into it; view-by-view browser acceptance is still pending.
   - **Security**: Localhost-only binding (`127.0.0.1`) by default.
   - **Developer CLI (`agentforge`)**: Commands for package initialization, manifest validation, non-extracting ZIP inspection, a clear not-yet-implemented package-test response, local manifest benchmarking, and workspace status.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 22+
- Git

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/montelli99/AgentForge.git
cd AgentForge

# Install exactly from the checked-in pnpm lockfile
pnpm install --frozen-lockfile
```

### 2. Launching the Web Control Plane
```bash
pnpm vnext
```
Open your browser to:
```
http://127.0.0.1:3000
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

Live provider smoke cases require both provider credentials and the explicit `AGENTFORGE_LIVE_TESTS=1` opt-in. A configured API key alone never causes `pnpm test` to make paid requests.

---

## Current safety scope

This staging checkout has no connected production CRM, messaging, or telephony credentials. Local code and fixtures are not proof that every external side effect is gated or that production isolation has passed a security review. The remaining controls and acceptance evidence are tracked in `LAUNCH_CHECKLIST.md`.

---

## 📜 License

License selection is currently under review by the project maintainers. See [docs/LICENSE_DECISION_MATRIX.md](docs/LICENSE_DECISION_MATRIX.md) for the evaluation of Apache 2.0 vs AGPLv3 vs MIT.
