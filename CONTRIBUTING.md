# Contributing to AgentForge

Thank you for your interest in contributing to **AgentForge**, an early-stage self-hostable AI team workspace and execution control plane. Contributions are made under the repository's [Apache-2.0 license](LICENSE).

---

## 1. Architectural Guardrails & Safety Invariants

Before writing code, review the core safety contracts:

1. **Execution Contracts**:
   - `ContractEnforcer` currently checks declared path patterns, authority flags, selected shell-command patterns, and configured spend ceilings.
   - Do not claim every tool/provider side effect is mediated yet. New execution paths need explicit enforcement and tests before they can be described as contract-controlled.
2. **SOP Is Not Authority**:
   - An SOP or process document describes how someone does work; it does *not* authorize an autonomous agent to execute destructive or external actions without explicit deterministic business rules and approval gates.
3. **Provider Separation & Honest Readiness**:
   - Never label a stub or skeleton as production-ready.
   - Separate capability levels (e.g. file parsing vs live API sync).
   - Local models (Ollama) have $0 external API cost.
4. **Secret Storage Separation**:
   - Do not commit secrets or include them in fixtures, reports, screenshots, or documentation. Keep sample data synthetic. End-to-end secret isolation and export/log redaction remain release gates.

---

## 2. Development Setup

AgentForge has zero native C/C++ build dependencies, running on pure TypeScript and Node.js.

### Prerequisites
- Node.js 22 or later
- pnpm 10 or later
- Git

### Installation
```bash
git clone https://github.com/your-org/agentforge.git
cd AgentForge
pnpm install
```

### Running Tests
```bash
# Run complete test suite across all suites
pnpm test

# Run tests in watch mode during development
pnpm exec vitest
```

### Launching the Control Plane
```bash
# Launch the local web control plane (defaults to http://127.0.0.1:3460)
npm run vnext
```

---

## 3. Branching & PR Guidelines

- Create feature branches off `main` (or `vnext` during release candidate cycles).
- Name branches descriptively: `feat/telegram-webhook-guard`, `fix/atomic-store-recovery`.
- Every PR must:
  1. Pass all existing test suites without weakening test assertions (`pnpm test`).
  2. Include targeted unit/integration tests for any new provider, channel, or contract feature.
  3. Maintain clean git status (no untracked artifacts or modified global files).

---

## 4. Code Style & Standards

- Strict TypeScript with ESM (`"type": "module"`).
- Explicit imports using `.js` extension for local modules.
- Use `node:` protocol for built-ins (`node:crypto`, `node:fs`, `node:path`, `node:http`).
- Prefer pure functions and clean class interfaces with deterministic unit testability.
