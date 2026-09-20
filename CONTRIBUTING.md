# Contributing to AgentForge

Thank you for your interest in contributing to **AgentForge** — the open-source, self-hostable AI team workspace and execution control plane.

---

## 1. Architectural Guardrails & Safety Invariants

Before writing code, review the core safety contracts:

1. **Sub-Model Execution Contracts**:
   - Agent permissions, path restrictions, and authority gates are enforced *below* the model and harness layer (`ContractEnforcer`).
   - An LLM cannot override or expand its own permissions.
2. **SOP Is Not Authority**:
   - An SOP or process document describes how someone does work; it does *not* authorize an autonomous agent to execute destructive or external actions without explicit deterministic business rules and approval gates.
3. **Provider Separation & Honest Readiness**:
   - Never label a stub or skeleton as production-ready.
   - Separate capability levels (e.g. file parsing vs live API sync).
   - Local models (Ollama) have $0 external API cost.
4. **Secret Storage Separation**:
   - Secrets are never saved to `WorkspaceStore` state files, git repositories, package manifests, or migration exports.

---

## 2. Development Setup

AgentForge has zero native C/C++ build dependencies, running on pure TypeScript and Node.js.

### Prerequisites
- Node.js 20.x or 22.x
- Git

### Installation
```bash
git clone https://github.com/montelli99/AgentForge.git
cd AgentForge
npm install
```

### Running Tests
```bash
# Run complete test suite across all suites
npm test

# Run tests in watch mode during development
npx vitest
```

### Launching the Control Plane
```bash
# Launch the local web control plane (defaults to http://127.0.0.1:3000)
npm run vnext
```

---

## 3. Branching & PR Guidelines

- Create feature branches off `main` (or `vnext` during release candidate cycles).
- Name branches descriptively: `feat/telegram-webhook-guard`, `fix/atomic-store-recovery`.
- Every PR must:
  1. Pass all existing test suites without weakening test assertions (`npm test`).
  2. Include targeted unit/integration tests for any new provider, channel, or contract feature.
  3. Maintain clean git status (no untracked artifacts or modified global files).

---

## 4. Code Style & Standards

- Strict TypeScript with ESM (`"type": "module"`).
- Explicit imports using `.js` extension for local modules.
- Use `node:` protocol for built-ins (`node:crypto`, `node:fs`, `node:path`, `node:http`).
- Prefer pure functions and clean class interfaces with deterministic unit testability.
