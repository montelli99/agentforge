# AgentForge vNext
### Open-Source, Self-Hostable AI Workforce Platform & Execution Control Plane

AgentForge is an open-source, self-hostable platform for creating, coordinating, and governing persistent AI teammates across Web, Telegram, Discord, CLI, and API.

Built on strict execution contracts, empirical benchmark evaluation, non-destructive Git worktree isolation, durable event ledgers, and bidirectional channel mirroring, AgentForge turns SOPs and procedures into governed autonomous workflows while enforcing human-in-the-loop approvals.

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

3. **Universal Bidirectional Channel Mirroring**
   - Unified real-time communication across Web, Telegram, and Discord.
   - 2-way Telegram topic-to-channel synchronization, interactive inline buttons for approvals, and native slash commands (`/status`, `/approve`, `/reject`, `/run`, `/agents`).
   - Discord thread-to-channel mirroring with role-based mentions and embed cards.
   - `UniversalMirrorRouter` broadcasts events across all channels with full loop suppression and idempotency.

4. **Process-to-Agent & SOP Compiler**
   - Ingests human procedures from Scribe SOPs, Markdown documents, and structured step lists.
   - Enforces **"SOP IS NOT AUTHORITY"**: SOPs document human operational intent; privileged actions automatically generate `UnresolvedBusinessRules` and require explicit `ExecutionContract` bounds.

5. **Voice Subsystem**
   - First-class voice call integration (`VoiceProvider`, `MockVoiceProvider`, `RetellVoiceProvider`).
   - Inbound and outbound phone calls are tracked as first-class workspace channel events with live transcript segments, inline tool calls, and post-call disposition summaries.

6. **Governed Execution Contracts & Evidence Packs**
   - **Execution Contracts**: Deterministic budget caps, time limits, read/write path boundaries, forbidden bash commands, and approval gates placed *below the model layer*.
   - **Approval Engine**: Unified approval state machine supporting quorum, single-approver, and multi-channel sign-offs (Web UI + Telegram inline callbacks).
   - **Evidence Packs**: Verifiable execution bundles containing git diffs, command stdout/stderr, test results, token telemetry, and contract verification hashes.

7. **Developer Economy & Marketplace Standard**
   - Standardized package manifest (`manifest.json`) declaring permissions, required secrets, tool exports, benchmark gates, and pricing models.
   - `LocalPackageProvider` validates package security against execution contracts to prevent unauthorized privilege escalation or production deployments.

8. **Web Control Plane & CLI**
   - **Responsive Web SPA**: 17 navigation views including Team Overview, 12-Step Agent Creation Wizard, Process Graph Explorer, Live Voice Call Simulator, Approvals Center, and Marketplace Browser.
   - **Developer CLI (`agentforge`)**: Commands for package initialization, linting, unit testing, empirical benchmarking, and workspace status monitoring.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm / pnpm

### 1. Installation
```bash
# Clone the repository
git clone <repo-url> AgentForge-Staging
cd AgentForge-Staging

# Install dependencies
npm install
```

### 2. Launch the Control Plane Web Server
```bash
npm run serve
# Server starts at http://localhost:3456
```

Open `http://localhost:3456` in your browser to view the AgentForge Web Control Plane:
- **Agents**: View persistent AI teammates and launch the 12-Step Create Agent Wizard.
- **Process-to-Agent**: Ingest Scribe SOPs and view the compiled DAG with unresolved business rules.
- **Voice Calls**: Simulate live phone calls, view transcripts, and inspect call dispositions.
- **Approvals**: Review pending execution contract approvals and approve/reject with one click.
- **Marketplace**: Browse verified agent skill packs and inspect permission manifests.

### 3. Using the AgentForge CLI
```bash
# Display CLI help
npx tsx src/cli/bin.ts --help

# Check workspace status
npx tsx src/cli/bin.ts status

# Initialize a new agent package
npx tsx src/cli/bin.ts pack init --name my-qa-agent --author developer@example.com

# Validate package manifest and permissions
npx tsx src/cli/bin.ts pack validate ./packages/my-qa-agent

# Run package unit tests
npx tsx src/cli/bin.ts pack test ./packages/my-qa-agent

# Run empirical benchmark suite against latency and accuracy thresholds
npx tsx src/cli/bin.ts pack benchmark ./packages/my-qa-agent
```

### 4. Running the Test Suite
All 89 tests across 7 test suites run in complete isolation:
```bash
npx vitest run src --maxWorkers=1
```

---

## 🏛 Architecture Diagram

```
+-------------------------------------------------------------------------+
|                         UNIVERSAL CHANNEL LAYER                         |
|   Web Control Plane (SPA)  |  Telegram Mirror Bot  |  Discord Mirror   |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                         UNIVERSAL MIRROR ROUTER                         |
|          Idempotent Event Distribution & Channel Synchronization        |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                       AGENTFORGE CONTROL PLANE                          |
|  Workspace Store  │  Approval Engine  │  Task Router  │  Event Ledger   |
+-------------------------------------------------------------------------+
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
+───────────────+            +───────────────+            +───────────────+
|   PROCESS &   |            |   EXECUTION   |            |   DEVELOPER   |
|     VOICE     |            |   CONTRACTS   |            |  MARKETPLACE  |
| Scribe Ingest |            | Budget Gates  |            | Manifests     |
| SOP Compiler  |            | Path Sandbox  |            | Benchmarks    |
| Voice Calls   |            | Evidence Pack |            | CLI Tooling   |
+───────────────+            +───────────────+            +───────────────+
                                    │
       ┌────────────────────────────┴────────────────────────────┐
       ▼                                                         ▼
+───────────────────────────────+       +─────────────────────────────────+
|         HARNESS LAYER         |       |        INTELLIGENCE LAYER       |
|  • Pi Harness (Default native)|       |  • Generative: Ollama, OpenAI   |
|  • Pydantic AI (Structured)   |       |  • ModelRouter: Tier 0 - Tier 4 |
|  • Native Boundary Harness    |       |  • Decision: Jev Intent Class.  |
+───────────────────────────────+       +─────────────────────────────────+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                         COMPUTE & STORAGE LAYER                         |
|   Git Worktrees (Isolated)  │  Local Processes  │  Docker / Sandbox     |
+-------------------------------------------------------------------------+
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

MIT License. Open-source and self-hostable.
