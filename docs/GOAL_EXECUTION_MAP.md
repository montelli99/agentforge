# AgentForge goal execution map

This is the operator-facing map for the approved AgentForge public-release
goal. It links the larger specifications to the evidence required before each
phase can be called complete.

**Goal state:** approved and active. Implementation may proceed autonomously;
external publication, provider account use, and public repository changes still
require their own explicit approval and target.

## Phase 1 — Public boundary and foundation

**Outcome:** a generic Apache-2.0 product with no private integrations,
credentials, owner data, or production-only records.

**Evidence:** `pnpm verify:public`, `pnpm release:audit`, the package privacy
acceptance, and the public repository privacy acceptance.

**Current state:** locally verified. Hosted provenance is still external.

## Phase 2 — Canonical workspace and durable memory

**Outcome:** projects, spaces, nested departments, channels, conversations,
tasks, memory, plans, approvals, audit events, and evidence share one durable
record and survive restart.

**Evidence:** persistence acceptance, workspace UI acceptance, migration tests,
and the canonical workspace routes.

**Current state:** local persistence and browser acceptance pass; concurrency,
authenticated reviewer identity, and cross-provider parity remain open.

## Phase 3 — Native channel runtime

**Outcome:** AgentForge owns direct channel adapters for Telegram, Discord, and
Slack. OpenClaw and Hermes remain optional migration bridges only.

**Evidence:** adapter tests, lifecycle tests, one inbound event and one
approved outbound event per disposable provider account, and clean shutdown.

**Current state:** local adapters and fixtures pass; live provider acceptance
requires disposable credentials and an explicit target environment.

## Phase 4 — Workforce setup and execution

**Outcome:** a user describes an outcome in plain language; the setup guide
creates a reviewable team, departments, playbooks, authority boundaries, and a
plan. Approved work executes through a governed backend and records evidence.

**Evidence:** setup guide routes, plan approval tests, execution-contract tests,
Docker acceptance, and a connected model/tool executor run.

**Current state:** planning, safeguards, and approved Docker evidence pass;
production model/tool execution and OS-isolated worker acceptance remain open.

## Phase 5 — Quality and competitive experience

**Outcome:** Hermes-level chat continuity plus AgentForge-specific team
orchestration, correction history, drift detection, cost-aware routing,
technical inspection, and accessible responsive UI.

**Evidence:** `COMPETITIVE_HARNESS_UX.md`, browser acceptance, quality flywheel
tests, correction persistence, and rendered visual review.

**Current state:** design requirements and local UI acceptance are recorded;
full visual review and connected worker quality measurements remain open.

## Phase 6 — Release evidence and publication

**Outcome:** hosted CI passes from the intended public repository, the package
archive is privacy-clean, provenance is recorded, and publication occurs only
after explicit owner approval.

**Evidence:** `RELEASE_RUNBOOK.md`, hosted CI URL and commit SHA, package digest,
archive report, and registry provenance.

**Current state:** local package-ready audit passes. This checkout has no Git
remote, so hosted CI and publication have not been attempted.

## Governing documents

- `requirements/AUTONOMOUS_MASTER_BUILD_GOAL.md`
- `requirements/COMPLETE_AUTONOMOUS_ROADMAP.md`
- `requirements/IMPLEMENTATION_TRACEABILITY.md`
- `COMPETITIVE_HARNESS_UX.md`
- `PUBLIC_SYSTEM_ARCHITECTURE.md`
- `RELEASE_RUNBOOK.md`
- `RELEASE_STATUS.md`

No phase is marked complete from intent alone. Each phase must retain the
evidence named above, and unresolved external evidence stays visible.
