# AgentForge Release Readiness Checklist

**Current status: NOT READY TO RELEASE.** This is the staging gate for the current vNext control plane. A passing unit-test suite does not satisfy the live integration, security, persistence, or product-acceptance gates below.

## Reproducible local checks

- [ ] Install dependencies with `pnpm install --frozen-lockfile`.
- [x] `pnpm test` passes without provider credentials or external writes (85 files, 476 passed, 2 skipped; 2026-09-27).
- [x] `pnpm typecheck` passes on the supported Node.js version (2026-09-27).
- [x] `pnpm build` emits the public server and CLI into `dist/` (2026-09-27).
- [x] `pnpm verify:public` passes the typecheck, product-isolation, package-surface, forced-recovery, Docker-isolation, and approved-Docker execution gates (2026-09-27).
- [x] The npm archive packlist is inspected for private local paths, credentials, non-example email addresses, phone numbers, and internal operational documents before it can pass the package-surface gate (2026-09-27).
- [x] Start the built vNext server (`pnpm start`, or set `PORT` when the default is occupied). A disposable loopback process on port 3488 returned `/api/status`, `/api/readiness`, `/api/agents`, `/api/tasks`, and `/api/compute` before clean shutdown (2026-09-27).
- [ ] Complete an 8-hour read-only endpoint soak with `scripts/soak-vnext.ps1`; review the full log for any `FAIL` entries.
- [x] Verify `GET /api/status`, `/api/readiness`, `/api/agents`, `/api/tasks`, and `/api/compute` return truthful, internally consistent values. The built-server loopback probe returned its documented status shape, a readiness collection, agent/task collections, and compute readiness state from one empty durable workspace (2026-09-27).
- [x] Verify an absent task evidence pack is reported as unavailable; never show invented diffs, tests, or verification hashes. `src/core/runtime/taskWorkerRuntime.test.ts` verifies the built control-plane evidence and diff routes return `available: false` before any worker execution (2026-09-27).
- [ ] Smoke-test the actual web UI in a browser, including each navigation view, create/edit paths, error states, and reconnect behavior.

## Security and data integrity

- [ ] Add authenticated user identity and authorization to all mutating control-plane actions.
- [x] Strict local mode presents a browser owner setup/sign-in flow and authenticates its HttpOnly, same-site session cookie on API and SSE requests; no browser token is stored in localStorage or URLs (2026-09-27).
- [x] Verify external browser origins cannot access local mutation endpoints; keep the server bound to loopback by default. Strict-mode acceptance uses an owner session cookie from an untrusted origin and verifies the mutation is rejected before workspace state changes (2026-09-27).
- [x] For deliberate non-loopback deployment, require `AGENTFORGE_API_TOKEN` as a bearer token; local loopback mode remains the default.
- [x] Verify real workspace persistence, atomic recovery, schema versioning, backup/restore, and crash recovery through a disposable force-stop/restart acceptance run (2026-09-27).
- [ ] Verify secrets never appear in logs, evidence packs, migration output, or exported artifacts.
- [x] Verify worktree and package path boundaries against traversal, hidden credential-like files, malformed input, and cleanup failures. `src/server/projectFiles.test.ts`, `src/core/worktree/worktreeManager.test.ts`, and `src/core/compute/computeSubsystem.test.ts` cover the public project browser, managed Git worktrees, and compute cleanup (2026-09-27).
- [x] Verify approvals are enforced by the execution path, not only displayed in the UI. `src/core/runtime/contractedDockerExecutionBackend.test.ts` proves no Docker environment starts without a human-approved plan, and runtime/approval route tests verify waiting-review state and resolution controls (2026-09-27).

## Integrations and product acceptance

- [ ] Complete the original numbered requirements-to-code-and-test traceability review.
- [ ] Clearly separate live integrations from mocks, fixtures, demos, and unconfigured capabilities in UI and docs.
- [ ] Complete real-provider tests for each integration claimed as supported; use isolated test accounts and explicit authorization.
- [ ] Verify external messaging and telephony remain disabled unless specifically configured and approved.
- [ ] Validate marketplace package signing/provenance, permission review, install isolation, publisher identity, and removal/rollback.
- [ ] Define and test an accessible, responsive first-run and agent-creation experience with a non-technical user.
- [ ] Update installation, upgrade, backup, troubleshooting, privacy, licensing, and contributor documentation.
- [ ] Review every pricing, benchmark, readiness, and release claim against current evidence.

Do not mark this checklist complete until each applicable item has a linked, reproducible evidence artifact and a reviewer has checked the actual user workflow.
