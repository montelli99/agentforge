# AgentForge Release Readiness Checklist

**Current status: NOT READY TO RELEASE.** This is the staging gate for the current vNext control plane. A passing unit-test suite does not satisfy the live integration, security, persistence, or product-acceptance gates below.

## Reproducible local checks

- [ ] Install dependencies with `pnpm install --frozen-lockfile`.
- [ ] `pnpm test` passes without provider credentials or external writes.
- [ ] `pnpm typecheck` passes on the supported Node.js version.
- [ ] `pnpm build` emits the vNext server and CLI into `dist/`.
- [ ] Start the built vNext server (`pnpm start`, or set `PORT` when the default is occupied).
- [ ] Complete an 8-hour read-only endpoint soak with `scripts/soak-vnext.ps1`; review the full log for any `FAIL` entries.
- [ ] Verify `GET /api/status`, `/api/readiness`, `/api/agents`, `/api/tasks`, and `/api/compute` return truthful, internally consistent values.
- [ ] Verify an absent task evidence pack is reported as unavailable; never show invented diffs, tests, or verification hashes.
- [ ] Smoke-test the actual web UI in a browser, including each navigation view, create/edit paths, error states, and reconnect behavior.

## Security and data integrity

- [ ] Add authenticated user identity and authorization to all mutating control-plane actions.
- [ ] Verify external browser origins cannot access local mutation endpoints; keep the server bound to loopback by default.
- [ ] Verify real workspace persistence, atomic recovery, schema versioning, backup/restore, and crash recovery.
- [ ] Verify secrets never appear in logs, evidence packs, migration output, or exported artifacts.
- [ ] Verify worktree and package path boundaries against traversal, symlink, malformed input, and cleanup failures.
- [ ] Verify approvals are enforced by the execution path, not only displayed in the UI.

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
