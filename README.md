# AgentForge vNext
### Open-Source, Self-Hostable AI Workforce Platform & Execution Control Plane

[![CI Status](https://github.com/montelli99/AgentForge/actions/workflows/ci.yml/badge.svg)](https://github.com/montelli99/AgentForge/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue)](https://github.com/montelli99/AgentForge)
[![Status](https://img.shields.io/badge/status-RELEASE%20CANDIDATE%201-green)](https://github.com/montelli99/AgentForge)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-112%2F112%20PASS-brightgreen)](https://vitest.dev)

AgentForge is an open-source, self-hostable platform for creating, coordinating, and governing persistent AI teammates across Web, Telegram, Discord, CLI, and API.

Built on strict execution contracts, empirical benchmark evaluation, non-destructive Git worktree isolation, durable event ledgers, and bidirectional channel mirroring, AgentForge turns SOPs and procedures into governed autonomous workflows while enforcing human-in-the-loop approvals below the model layer.

---

## 📊 Release Status Model (Section 48)

| Component | Status | Readiness Level | Implementation Notes |
| :--- | :---: | :---: | :--- |
| **Core Control Plane** | **ALPHA** | `REAL_INTEGRATION` | In-memory store, atomic JSON + `.bak` durability recovery, event ledger, 17 views. |
| **AgentForge Native Harness** | **ALPHA** | `REAL_INTEGRATION` | Governed execution enforcing `ExecutionContract` bounds below model layer. |
| **Pi Harness Adapter** | **EXPERIMENTAL** | `TEST_IMPLEMENTATION` | Clean public adapter contract and subprocess protocol active; awaits official packaging. |
| **Pydantic AI Harness** | **EXPERIMENTAL** | `NOT_CONFIGURED` | Optional Python backend. When Python is absent, reports `NOT_CONFIGURED` (not broken). |
| **Ollama Local Provider** | **ALPHA** | `PARTIAL_INTEGRATION` | Dynamic model discovery via `/api/tags`, format json, $0 external API cost. |
| **OpenAI-Compatible Gateway** | **ALPHA** | `PARTIAL_INTEGRATION` | Provider-neutral ChatCompletions gateway (OpenRouter, LocalAI, vLLM, OpenAI). |
| **Jev System-1 Router** | **ALPHA** | `TEST_IMPLEMENTATION` | Standalone AgentForge-owned fast classifier; sub-50ms intent matching. |
| **Scribe Process (File Import)** | **ALPHA** | `REAL_INTEGRATION` | Ingests Markdown, HTML, and SOP steps; detects ambiguous decisions. |
| **Scribe Process (MCP / Sync)**| **PLANNED** | `NOT_CONFIGURED` / `UNIMPLEMENTED`| MCP server unconfigured; live cloud sync not yet implemented. |
| **Mock Voice Simulator** | **ALPHA** | `MOCK` (Release Demo) | Full-fidelity call simulator emitting transcripts, tool events, and post-call summaries. |
| **Retell Voice Telephony** | **EXPERIMENTAL** | `SKELETON` | Telephony contract skeleton. Zero live calls placed; awaits staging credentials. |
| **AGNI Voice Provider** | **PLANNED** | `UNIMPLEMENTED` | Provider slot reserved. EXACT AGNI PRODUCT NOT YET VERIFIED. |
| **Telegram Mirror & Conflict Guard**| **ALPHA** | `TEST_IMPLEMENTATION` | Topic mirroring, webhook conflict detection, and 5-phase safe cutover lifecycle. |
| **Migration Center** | **ALPHA** | `REAL_INTEGRATION` | Non-destructive shadow migration for OpenClaw Legacy, Current, Hermes, Grok, Generic. |

---

## 🌟 Core Pillars

1. **Persistent AI Teammates & Canonical Hierarchy**
   - Structured hierarchy: `Workspace` $\rightarrow$ `Space` $\rightarrow$ `Channel` $\rightarrow$ `Thread` $\rightarrow$ `Message`.
   - Agents maintain defined roles, goals, model routing policies, tool grants, execution bounds, and memory namespaces.
   - Dual-memory architecture: engineering memory (task history, test failures, commit logs, strict "do-not-repeat" rules) and semantic context memory.

2. **Pluggable Provider Architecture & Harness Layer**
   - **Harness Candidates**: Pi Harness (default native harness candidate), Pydantic AI Harness (typed structured outputs), and AgentForge Native Harness.
   - **Decoupled Intelligence**: Strict architectural separation between Generative Models (`OllamaModelProvider`, `OpenAIModelProvider`, 5-tier `ModelRouter`) and Decision Classification (`JevDecisionProvider` for fast, inexpensive System-1 intent classification).
   - **Compute & Sandboxing**: Pluggable `LocalProcessProvider`, `DockerComputeProvider`, `E2BSandboxProvider`, and strict ephemeral `WorktreeManager`.

3. **Universal Bidirectional Channel Mirroring & Conflict Guard**
   - Unified real-time communication across Web, Telegram, and Discord.
   - 2-way Telegram topic-to-channel synchronization, interactive inline buttons for approvals, and native slash commands (`/status`, `/approve`, `/reject`, `/run`, `/agents`).
   - **Telegram Ownership Conflict Guard**: Inspects webhook state before assuming polling ownership. If an external webhook is detected, prevents competing consumer conflicts and offers non-destructive migration.
   - **5-Phase Cutover Safety**: `SOURCE_AUTHORITATIVE` $\rightarrow$ `AGENTFORGE_SHADOW` $\rightarrow$ `CUTOVER_READY` $\rightarrow$ `AGENTFORGE_AUTHORITATIVE` $\rightarrow$ `ROLLBACK`.

4. **Process-to-Agent & SOP Compiler**
   - Ingests human procedures from Scribe SOPs, Markdown documents, and structured step lists.
   - Enforces **"SOP IS NOT AUTHORITY"**: SOPs document human operational intent; privileged actions automatically generate `UnresolvedBusinessRules` and require explicit `ExecutionContract` bounds.

5. **Voice Subsystem**
   - First-class voice call integration (`MockVoiceProvider`, `RetellVoiceProvider`).
   - Inbound and outbound phone calls are tracked as first-class workspace channel events with live transcript segments, inline tool calls, and post-call disposition summaries.
   - Real-world cost telemetry clearly marked (Mock calls report $0 real cost; local models report $0 API cost).

6. **Governed Execution Contracts & Evidence Packs**
   - **Execution Contracts**: Deterministic budget caps, time limits, read/write path boundaries, forbidden bash commands, and approval gates placed *below the model layer*.
   - **Approval Engine**: Unified approval state machine supporting quorum, single-approver, and multi-channel sign-offs (Web UI + Telegram inline callbacks).
   - **Evidence Packs**: Verifiable execution bundles containing git diffs, command stdout/stderr, test results, token telemetry, and contract verification hashes.

7. **Developer Economy & Marketplace Standard**
   - Standardized package manifest (`manifest.json`) declaring permissions, required secrets, tool exports, benchmark gates, and pricing models.
   - `LocalPackageProvider` validates package security against execution contracts to prevent unauthorized privilege escalation, symlink escapes, postinstall scripts, or production deployments.

8. **Web Control Plane & CLI**
   - **Responsive Web SPA**: 17 navigation views including Team Overview, 12-Step Agent Creation Wizard, Process Graph Explorer, Live Voice Call Simulator, Approvals Center, and Marketplace Browser.
   - **Security**: Localhost-only binding (`127.0.0.1`) by default.
   - **Developer CLI (`agentforge`)**: Commands for package initialization, linting, unit testing, empirical benchmarking, and workspace status monitoring.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 20.x or 22.x
- Git

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/montelli99/AgentForge.git
cd AgentForge

# Clean install with zero native C++ build dependencies
npm install
```

### 2. Launching the Web Control Plane
```bash
npm run vnext
```
Open your browser to:
```
http://127.0.0.1:3000
```

### 3. Running the Full Test Suite
All 112 tests across 10 test suites run in complete isolation:
```bash
npm test
```

---

## 🔒 Production Isolation Guarantee

AgentForge vNext adheres to strict production isolation protocols:
- Operates in a dedicated, isolated workspace repository.
- Does **not** read or write production databases, production configurations, or live customer automations.
- External communication channels operate with test fixtures, mocks, and sandboxes prior to explicit owner authorization.
- Privileged operations and external side effects strictly require human approval via the unified Approval Engine.

---

## 📜 License

License selection is currently under review by the project maintainers. See [docs/LICENSE_DECISION_MATRIX.md](docs/LICENSE_DECISION_MATRIX.md) for the evaluation of Apache 2.0 vs AGPLv3 vs MIT.
