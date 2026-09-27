# AgentForge completion audit

This is the current evidence index for the approved AgentForge release goal.
It records what is proven locally, what is implemented but deployment-specific,
and what remains open. A passing unit test is not treated as proof of a live
provider or production deployment.

## Proven in the current checkout

- Apache-2.0 license, public package entrypoint, manifest, and archive privacy.
- Product-isolation and repository-source privacy gates.
- Local workspace hierarchy, durable snapshots, migration, restart recovery,
  audit ledger, memory scoping, and completion-goal persistence.
- Native Telegram BotFather transport, Telegram native-path selection, Slack
  Socket Mode, Discord Gateway lifecycle, and optional OpenClaw/Hermes relay
  boundaries through focused tests.
- Native gateway control-plane status, start, and stop routes.
- Setup-guide creation of the Coordinator, Workflow Engine, JEv router, and
  goal-specific sandboxed roles.
- Approved Docker contract validation and local Docker acceptance evidence.
- Responsive workspace flows for projects, messages, tasks, approvals,
  processes, memory, team room, settings, and first-run setup in the isolated
  browser acceptance fixture.

## Implemented but requiring deployment evidence

- Authenticated Telegram, Discord, and Slack provider sessions.
- Authenticated remote-control identity and multi-user role enforcement.
- Connected model and tool worker execution with real verification and evidence
  packs.
- Hosted CI provenance from the public repository.
- Cross-platform Docker and worktree acceptance on the release host.

## Not implemented or explicitly outside the current release

- Live voice calling and voice-provider benchmarking.
- Hosted marketplace, publisher payments, commercial agent services, and
  service-to-package revenue workflows.
- Registry publication and provenance, which remain owner-approved release
  actions.

## Current external release gate

`pnpm release:audit` passes all local gates. The public GitHub remote exists,
but the account currently lacks the `workflow` OAuth scope, so the initial
branch push and hosted CI evidence are not yet recorded. Once that scope is
authorized, run:

```powershell
pwsh -File scripts/public-release-resume.ps1 -Branch vnext
```

The script pushes the branch, waits for the matching CI run, and reports its
URL and commit SHA. It does not publish a package.

## Evidence sources

- `docs/requirements/IMPLEMENTATION_TRACEABILITY.md`
- `docs/GOAL_EXECUTION_MAP.md`
- `docs/RELEASE_STATUS.md`
- `docs/RELEASE_RUNBOOK.md`
- `docs/VISUAL_ACCEPTANCE_MATRIX.md`
- `docs/COMPETITIVE_HARNESS_UX.md`
