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
- Hosted CI run `36366272950` passed the complete Ubuntu, macOS, and Windows
  matrix on Node 22 and 24, including public-package and isolated-execution
  acceptance.
- The public Render site is deployed from commit `22baa80` and returns HTTP
  200 with the expected AgentForge entrypoint.
- The full Vitest regression suite passes with 86 files and 480 tests; two
  tests are skipped only behind explicit live-test opt-in.

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

`pnpm release:audit` passes all local gates. The public GitHub remote and
hosted CI evidence are now recorded. Registry publication and provenance
remain owner-approved release actions. Live provider acceptance remains
deployment-specific and requires authorized sandbox sessions. To resume the
repeatable release audit locally, run:

```powershell
pnpm release:audit
```

No package is published by this audit.

## Evidence sources

- `docs/requirements/IMPLEMENTATION_TRACEABILITY.md`
- `docs/GOAL_EXECUTION_MAP.md`
- `docs/RELEASE_STATUS.md`
- `docs/RELEASE_RUNBOOK.md`
- `docs/VISUAL_ACCEPTANCE_MATRIX.md`
- `docs/COMPETITIVE_HARNESS_UX.md`
