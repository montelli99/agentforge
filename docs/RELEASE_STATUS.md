# AgentForge release status

This document is generated from the current checkout and records what is
verified, what is implemented but environment-dependent, and what still needs
an owner decision. It is intentionally conservative: passing unit tests do not
turn a mock provider into a live integration.

Run `pnpm verify:public` for the repeatable typecheck, privacy-isolation,
public-package/archive-privacy, and Docker acceptance preflight. `pnpm
release:audit` reruns the isolation and exact-package checks instead of
reporting readiness from their file presence alone. Its `packageReady` result
does not claim that hosted CI, registry publication, or provenance verification
has occurred.

The owner approval boundary and execution sequence are recorded in
[APPROVAL_EXECUTION_MAP.md](APPROVAL_EXECUTION_MAP.md).

## Verified in the current checkout

- TypeScript typecheck passes.
- The full verification suite covers the native gateway, workspace hierarchy,
  browser action policy, and public-system checks. Opt-in live MiMo smoke tests
  remain skipped unless `AGENTFORGE_LIVE_TESTS=1` and a live credential are
  deliberately configured.
- The vNext build emits the public entrypoint.
- Product-isolation acceptance passes and rejects private pipeline identifiers
  and credentials from the public package.
- Public package surface acceptance passes.
- The public archive privacy gate inspects npm's actual packlist, excludes
  internal working documents from the installed package, and rejects local
  paths, credentials, private email addresses, phone numbers, and internal
  operational paths in shipped text assets.
- CLI package acceptance passes, including least-privilege initialization,
  manifest and archive validation, traversal rejection, and unsafe-name checks.
  Package test commands remain intentionally non-executing until a governed
  sandbox runner is selected; the CLI reports that boundary honestly.
- Launcher persistence acceptance passes across restart for workspace hierarchy,
  SOP assignment, task audit events, messages, operational memory, and approved
  process revision history.
- Completion-goal sessions persist through the production launcher and recover
  from their prior backup snapshot when a primary session snapshot is damaged.
- Abrupt-launcher recovery acceptance force-stops a disposable built launcher
  during a live write, validates the primary-or-backup snapshot, restarts it,
  and confirms both a previously committed workspace and completion-goal
  session remain available.
- Telegram, Discord, and Slack channel normalization, relay contracts,
  routing, and shared-provider runtime ownership have focused test coverage.
  Slack uses an AgentForge-owned Socket Mode transport with authenticated hello
  gating, reconnect behavior, event acknowledgement, and direct message send.
- A disposable local acceptance run exercised the AgentForge-owned BotFather
  Telegram transport and reported `ready` / `live`. The public repository
  contains no token, provider account, workspace, or message history.
- The AgentForge-native gateway runtime is wired into the control plane with
  status/start/stop endpoints and owns the shared channel runtime registry;
  OpenClaw/Hermes are optional bridge paths.
- Gateway control acceptance verifies status, provider selection, start, and
  stop through the public HTTP API. Provider readiness remains explicit: a
  sandbox adapter is never presented as a live external session.
- The setup guide provisions the AgentForge Coordinator, Workflow Engine, and
  JEv System-1 Router plus goal-specific roles as sandboxed system agents when
  an operator prepares a workspace. No model, external channel, or compute
  access is configured by that step.
- After it prepares a workspace, the Setup Guide performs a local-only
  readiness scan for model, channel, and governed-execution configuration. The
  scan exposes no credential values and never connects a provider.
- The approved Docker backend validates time-bound human-approved plans,
  executes required checks in an actual isolated worktree and network-disabled
  Docker sandbox, and captures the observed artifact, diff scope, and revision
  evidence. Repeat it with `pnpm test:approved-docker:e2e`.
- The deterministic AgentForge lab currently passes all 30 scenarios, including
  routing, context compression, semantic memory, cost-aware optimization,
  provider failover, audit failure, and fail-closed side-effect handling.
- Operational memory is wired into both the control-plane worker and the
  explicitly configured execution worker. Worker context includes matching
  shared and project-scoped records and excludes unrelated project records.
- Docker engine acceptance was verified in a disposable, network-disabled
  container. Re-run `pnpm test:docker:acceptance` on the release host after
  Docker is available; availability is an environment condition, not a claim
  made by the package.

## Implemented but dependent on the deployment environment

- Direct Telegram BotFather transport is opt-in through a runtime token or
  external token file. The advanced MTProto user-session transport remains
  available only when its dedicated session configuration is supplied. Session
  material is runtime-only, and a provider reports `live` only while connected.
- An existing gateway can be connected through the public relay interface;
  AgentForge does not seize an already-owned bot or start a competing poller.
- Approved task execution is enabled only with
  `AGENTFORGE_EXECUTION_MODE=approved-docker` and an absolute
  `AGENTFORGE_EXECUTION_REPO`.

## Not yet proven

- Hosted CI provenance is not recorded because this staging checkout currently
  has a public repository remote configured. The initial push is
  pending the GitHub `workflow` OAuth scope because the repository includes its
  CI workflow. No package publication was attempted.

- Live Telegram gateway relay acceptance against an authenticated gateway.
- Live Discord Gateway acceptance against an authorized sandbox bot.
- Live Slack Socket Mode acceptance against an authorized sandbox app.
- Hosted CI results and a public package publish.

## Owner release decisions

- The public package version is `0.1.0` and the package is publishable. The repository is Apache-2.0 and the privacy gate passes.
- The GitHub Actions release gates can be started manually with `workflow_dispatch` in `.github/workflows/ci.yml`; the workflow does not require production credentials.
- Publishing to npm or another registry remains an explicit external release action; it is not performed by the build or audit commands.

Until the remaining live provider and hosted-release checks are complete, the
release remains a candidate rather than a published release. No code path
should claim a live provider or worker based only on configuration or a mock
receipt.

- A disposable local AgentForge runtime acceptance run enabled approved Docker
  execution and confirmed the release-readiness response reported isolated
  compute, verification, and evidence collection. The temporary server was
  shut down after the check.
- The `/api/compute` route now derives Docker connection status from the same execution backend readiness, keeping the runtime and workspace UI consistent.

- JEv UltraFast-style browser control is included as a provider-neutral public
  boundary. Browser actions use fresh indexed observations, reject stale or
  unseen targets, and are exposed for dry-run validation at
  `/api/browser/validate-action`; no private browser session or credentials are
  bundled. `BrowserSessionRegistry` adds explicit agent/human takeover,
  return-to-agent, and same-observation approval for external writes.
  The repeatable procedure is documented in `docs/BROWSER_OPERATIONS.md`.

- Live /api/system/manifest acceptance verified: it returns privateDataIncluded: false and the public AgentForge, Workflow Engine, and JEv subsystem records. Temporary server was shut down after verification.

- The browser adapter now includes a bounded Jev observe/choose/execute loop with re-observation, step limits, blocked/max-step results, and independent verification before accepting DONE.

## Current local verification — 2026-09-27

The repeatable release procedure is documented in [RELEASE_RUNBOOK.md](./RELEASE_RUNBOOK.md). It separates locally verified package/privacy gates from external proof that requires a hosted CI run or disposable live-provider accounts.

The full approved scope and evidence map is maintained in [GOAL_EXECUTION_MAP.md](./GOAL_EXECUTION_MAP.md).

- `pnpm check`, `pnpm verify:public`, `pnpm test:persistence:launcher`, and
  `pnpm test:package:cli` passed. The current full suite reports 86 files
  passed, 480 tests passed, and 2 opt-in live-model tests skipped.
- Docker Desktop was started and `pnpm test:docker:acceptance` created the
  isolated network-disabled container successfully.
- `pnpm test:approved-docker:e2e` created a disposable Git repository and real
  AgentForge worktree, accepted a time-bound human-approved plan, ran it in the
  network-disabled Docker sandbox, and verified its actual artifact, diff
  scope, and revision evidence.
- The generated package is cleaned before every build. The public package gate
  rejects stale TypeScript and test artifacts from `dist`; its archive gate
  separately validates the exact tarball npm would publish.
- A disposable loopback runtime reported the AgentForge native gateway `ready`
  and Telegram `ready/live` through the direct BotFather transport. Discord and
  Slack remained explicitly unconfigured; their self-service setup guides do
  not affect Telegram or the rest of the control plane. This was a local
  acceptance result, not a bundled account or a public-service availability
  claim.
- `node scripts/workspace-ui-acceptance.mjs` passed the local workspace flow,
  including project and channel creation, messages, attachments, replies,
  archiving, and restart persistence. A direct browser inspection of the live
  Command Room found no console warnings or errors.
- Focused setup, capability-executor, native-gateway, Telegram BotFather, and
  release-readiness tests passed: 6 files and 15 tests.
- Strict local authentication is browser-verified: a fresh workspace presents a nontechnical owner setup screen, hides the username until sign-in is selected, and uses an HttpOnly, same-site session cookie rather than localStorage or URLs. The release still requires a broader multi-user authorization review.
- Strict-mode acceptance also proves a foreign origin cannot use that cookie to call a mutating control-plane route; the request is rejected before workspace state changes.
- The local public-site preview uses Cache-Control: no-store, max-age=0, and its static verifier rejects the retired 3D/pink demo, invented pricing, stale test counts, and private release identifiers.
- Durable metric exports, the secret store, and audit-ledger metadata now share the runtime redaction boundary, including credential-shaped fields, Bearer/Basic headers, and JWT-shaped values; focused privacy and persistence tests pass.
- The static public website was reviewed in a browser and corrected to remove
  stale test counts, speculative paid plans, uptime promises, and placeholder
  external links. It now uses system fonts with no external presentation
  fetches or unresolved parent-directory links.
