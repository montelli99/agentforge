## Current release status — 2026-10-25

The full release goal remains incomplete. GitHub distribution is available as an
[early-access prerelease v0.1.2](https://github.com/montelli99/agentforge/releases/tag/v0.1.2),
not a stable-release acceptance claim. npm publication is deferred; installing
from the GitHub archive does not require an npm account.

Published source revision: `cfd876d0c497be489473476c6b24a874fbd13498`.
Published archive SHA-256:
`8f0ba13226eb617d7668e8bd1f6054586dac6c0964ddb62b6c4289bc14f76f91`.
All seven [exact-revision CI jobs](https://github.com/montelli99/agentforge/actions/runs/40238565372)
passed. The release includes its commit marker, checksums and verification record.
The installed-archive browser journeys use synthetic model responses; they do
not establish real-model quality or complete first-user onboarding.

Subsequent gateway changes passed all seven
[hosted jobs for 998bb6f](https://github.com/montelli99/agentforge/actions/runs/40239791266)
and merged in [PR #10](https://github.com/montelli99/agentforge/pull/10).
These changes are on vnext, not in the published v0.1.2 archive. They cover
challenge authentication, bounded waits, interrupted-delivery uncertainty,
identity preservation and no automatic send replay. A real loopback WebSocket
fixture verifies signatures and reconnection; it is not an OpenClaw installation.
Live OpenClaw/Hermes task delegation and guided connection remain unaccepted.

Still open: clean first-user onboarding through a useful real-model task;
live subscription lifecycle and managed workers; uncertain-effect reconciliation;
live memory-provider acceptance and migration; held-out comparative evaluation;
completed long-duration stability evidence; demonstration and launch reconciliation.
Historical hosting-cache removal awaits provider confirmation. The remaining
requirements in RELEASE_COMPLETION_PLAN.md remain part of the active goal.

## Earlier release checkpoint — 2026-10-25

The full release is not accepted. The automated-browser service blocker is
resolved: direct regression tests are authorized and run in fresh synthetic
browser profiles. Earlier blocked-browser entries below are historical.

Revision `47eb3c94bdcb11eb2547fd97ef02cf4c29ad815f` passed all seven
[hosted jobs](https://github.com/montelli99/agentforge/actions/runs/40234778190).
The downloaded archive commit marker and SHA-256 were independently checked:
`71665a4c3e1476c48ff13825c1ba82bbb34b4d8178c9cdbb8e0d8ffbd5d61d7b`.
Clean installation of those exact bytes passed five browser journeys on Windows
and hosted Linux: memory review/import/reload, encrypted API and local connection
restart/unlock and mid-stream reload, approved real-Docker execution through final
review and durable completion, and reviewed migration with durable rollback.
Provider responses in these browser fixtures are synthetic.

[PR #6](https://github.com/montelli99/agentforge/pull/6) merged this checkpoint
into `vnext` as `278c2d7ea9279002699825d5eae5362944011b3f`. This is integration,
not npm publication or full release acceptance.

Subsequent local regressions also prove restored connections can draft plans
without approving or executing them, and recorded verified Docker results can
be restored after a service restart before final browser approval. Receipt
recovery errors now redact recognized credentials. These changes are in
[PR #7](https://github.com/montelli99/agentforge/pull/7); their hosted results must
be checked against the final head before claiming exact-build acceptance.

Still open: unified first-user onboarding through a useful real-model task;
live subscription lifecycle and managed-worker acceptance; uncertain-effect
reconciliation and broader memory-provider behavior; held-out comparisons;
completed eight-hour soak; registry authentication/publication and launch work.
Historical cache removal still requires hosting-provider confirmation.

## Earlier exact-build checkpoint — 2026-10-25

Revision `2584e236f710322e95f977ef3dbc1d57c4775f51` passed all seven
[hosted CI jobs](https://github.com/montelli99/agentforge/actions/runs/40231877867)
and the exact-commit artifact verifier. The downloaded npm tarball SHA-256 is
`179e4ce5b7b7bf3f82d8a5f2920a88dd806eee56b0203017c244f2ad17761b59`.
A clean installation passed starter creation/validation and authenticated HTTP
memory review/import, server-object restart with disk reload, revision-history
preservation and duplicate-import prevention. This was not browser acceptance
or an OS-process crash. Later changes need their own exact-build verification.

A separate four-request live synthetic diagnostic on that revision scored 2/2
for memory prefetch and 0/2 for recent-context-only, with valid JSON in all four
responses and no provider failures. It did not reproduce the earlier failures;
it does not replace the earlier held-out score or establish competitor superiority.
Reported usage totaled 55,769 tokens; dollar cost remains unmeasured. The retained
local diagnostic report SHA-256 is
`71d88196686a42369d564f86b881fcecc03c0c3b2e4b87ed29cb7576741fe085`.

## Latest verified package checkpoint — 2026-10-25

Revision `c81a3826eeaf2eb38c4f07685f18b6a4c7fc060c` passed all seven
[hosted CI jobs](https://github.com/montelli99/agentforge/actions/runs/40227194169),
including Windows, macOS and Linux on Node 22/24 and public package acceptance.
The downloaded artifact's commit record matches that revision. Its npm tarball
SHA-256 is `a6466e0406ea70a5f53d6c4f8a442c2537fc5ddd209c333c041a937b38a7e0a1`.
The installed package's starter initialization/validation and Gemini installation
inspection passed in a disposable directory. This does not establish live
Gemini authentication or a managed Gemini worker.

Later revisions add shutdown admission protection, UTF-8 child-output decoding,
Gemini transcript validation and prompt encoding. Their local component checks
are not substitutes for exact-build hosted acceptance or a complete user journey.
The Gemini helpers remain internal and are not an activated connection.

Still required before claiming the full release goal is complete:

- Clean-install rendered onboarding, explicit approval and first-task acceptance.
- Live subscription lifecycle and isolation acceptance, completed managed workers
  and supported protected storage on other advertised operating systems.
- Broader recovery evidence and matched, repeated comparative evaluation.
- Final tested-revision merge, distribution, demonstration and accurate launch
  material; npm publication requires the publisher's registry authentication.

Browser acceptance was blocked by exhausted external test-service credits, not
by a demonstrated product failure. An alternative browser route is awaiting
owner direction. Historical private-cache removal awaits hosting-provider
confirmation separately from clean source/package verification.

## Earlier exact-build checkpoint — 2026-10-25

Revision `3a6d259e881e117d3d6b80575ba0c7e431206b1e` passed all seven
[hosted CI jobs](https://github.com/montelli99/agentforge/actions/runs/40225338010).
The downloaded package was installed in a disposable directory; public SDK
imports and starter initialization/validation passed. Its tarball SHA-256 is
`02b92af5e44738aa08cef13554867a4a3194cf523ac5fa7a8758c33d7fa1021e`.
This evidence applies to that revision, not automatically to later changes.

A live synthetic planning/execution workflow reopened in a new process with
matching artifact hashes, its observed receipt and pending final approval
preserved, and zero additional backend executions. This is not a forced-kill
test during execution or an end-user approval-screen acceptance test.

Browser acceptance of the installed package remains incomplete. The isolated
browser run ended with `Credits exhausted: insufficient credits`; its terminal
session record SHA-256 is
`dc6db984eda8d6c2690c986041d09d15b0b7bdcc8fb25bd48186b5f27ff90258`.
An authenticated test-tool account did not establish available test credits.
Do not report this run as a product failure or a passing UI check.

Managed subscription routes, full onboarding/approval UI acceptance, broader
recovery, comparative evidence and publication remain open as tracked in
[the full release plan](RELEASE_COMPLETION_PLAN.md).

## Local release verification — 2026-10-25

The public export was rebuilt and checked locally. Recovery now reconstructs the owned memory staging cache and index before serving after restart, validates durable state, and records replayable control receipts in the same database transaction. Control revision checks are serialized; source cohorts are checked again before ingestion. Continuous synthetic memory remains opt-in and requires a caller-supplied watcher; it is not automatic private-session discovery.

The release includes a pinned offline verifier product asset, its integrity tests, public requirement documents, and the indexed-memory third-party license. Local test results and archive hashes are supplied in the accompanying release verification report. These checks do not claim hosted CI, public publication, live-provider entitlement, or production acceptance of every optional adapter. Historical checkpoints below retain their original dates.

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

The requirement-by-requirement evidence index is maintained in
[COMPLETION_AUDIT_2026-09-27.md](COMPLETION_AUDIT_2026-09-27.md).

## Historical local source evidence - 2026-10-03 (superseded)

The current source identity is base revision
`47467ba62ab1b2da1b10650e18acd5df04048db8` plus preserved uncommitted
integration changes. The current local product regression checkpoint is 104
test files, 622 passed and 2 explicitly skipped live tests. Typecheck, build,
the 197-file package/archive gate, and 14 synthetic repository path/type tests
passed locally. See [the current build receipt](CURRENT_BUILD_RECEIPT_2026-10-03.md).

At that checkpoint, this source had no hosted-CI run, release commit, live-provider proof,
registry provenance, or independent acceptance of the replacement release
archive. A prior broad working-directory archive was rejected and is not a
distribution candidate. Public release at that checkpoint remained blocked pending independent
review of an explicitly allowlisted replacement.

## Historical and component evidence

The evidence below predates the current uncommitted integration unless an item
explicitly says otherwise. It must not be represented as current whole-tree or
hosted proof.

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
- Historical hosted CI run `36645820769` passed the full Ubuntu, macOS, and Windows matrix
  on Node 22 and 24, including public-package and isolated-execution
  acceptance.
- A historical public Render deployment was live from its recorded `vnext` revision. Local
  completion audit, repository-privacy, and product-isolation gates pass.
- The complete `pnpm verify:public` sequence passed on the release host,
  including typecheck, build, archive privacy, persistence crash recovery,
  Docker acceptance, and approved Docker end-to-end evidence.
- At the September 29 historical checkpoint, the Vitest suite passed with 91 files and 502 tests; two
  tests remain skipped only behind explicit live-test opt-in.
- A read-only native Telegram BotFather check accepted the configured token,
  returned the bot identity, reported no webhook, zero pending updates, and
  no last-error state. No polling or outbound message was performed.

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

- Live Telegram gateway relay acceptance against an authenticated gateway.
- Optional post-release Discord Gateway acceptance against an authorized
  sandbox bot.
- Optional post-release Slack Socket Mode acceptance against an authorized
  sandbox app.
- Registry publication and provenance verification. No package publication was
  attempted.

## Owner release decisions

- The package version remains `0.1.0` and the repository remains Apache-2.0. Current publication is blocked pending independent privacy review of the allowlisted replacement archive.
- The GitHub Actions release gates can be started manually with `workflow_dispatch` in `.github/workflows/ci.yml`; the workflow does not require production credentials.
- Publishing to npm or another registry remains an explicit external release action; it is not performed by the build or audit commands.

AgentForge is an upcoming release candidate. Discord and Slack are optional
post-release integrations until their sandbox accounts are supplied. No code
path should claim a live provider or worker based only on configuration or a
mock receipt.

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

## Historical local verification - 2026-09-29

The repeatable release procedure is documented in [RELEASE_RUNBOOK.md](./RELEASE_RUNBOOK.md). It separates locally verified package/privacy gates from external proof that requires a hosted CI run or disposable live-provider accounts.

The full approved scope and evidence map is maintained in [GOAL_EXECUTION_MAP.md](./GOAL_EXECUTION_MAP.md).

- `pnpm check`, `pnpm verify:public`, `pnpm test:persistence:launcher`, and
  `pnpm test:package:cli` passed at that checkpoint. The historical suite reported 91 files
  passed, 502 tests passed, and 2 opt-in live-model tests skipped.
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

## Latest verification record

- September 29, 2026: hosted CI run `36647635826` passed all seven jobs on
  commit `cd248b61ab5ee5a9c59de09d2674b08efc549b72`, including public-package
  and isolated-execution acceptance. The run includes the cross-platform fix
  that replaced random fixed auth-test ports with OS-assigned ephemeral ports.

- September 28, 2026: the public Render website deployment for commit
  `47a0b914860dd1172469bdb759914b5b99827991` is live at
  `https://agentforge-site.onrender.com`. The live response returned HTTP 200,
  the expected public-site markers, and `Cache-Control: no-store`.
- September 28, 2026: hosted CI run `36370748489` passed on commit
  `9418386dfe80bd0ef040acdcdfd8869dc82b2bb5` across Ubuntu, macOS, and
  Windows on Node 22 and 24.
- September 27, 2026: hosted CI run `36359613619` passed on commit
  `a17b42bdddcf7ce93ac39ff401db1c58a3f7fa32` across Ubuntu, macOS, and
  Windows on Node 22 and 24, including public-package, Docker-isolation,
  persistence-recovery, migration, and CLI acceptance.
- September 27, 2026: `pnpm release:audit` passed all ten local public-release gates. It reports `packageReady: true`, with no local privacy, license, manifest, package-surface, or CLI blockers.
- September 27, 2026: focused native-channel verification passed 19 tests across Telegram BotFather, Telegram native-path selection, Telegram relay protection, Slack Socket Mode, and Discord Gateway transport.
- The audit still correctly reports hosted CI provenance and registry publication as external release evidence. Neither is claimed by the local checkout.



## Connection setup browser regression — 2026-10-25

Added a real Chromium regression using only synthetic credentials and an isolated
workspace. It passes owner setup, guided API connection save, cleared password
inputs, encrypted on-disk storage, server-object restart, owner sign-in, and
explicit vault unlock restoring the selected route. It checks that the synthetic
key and vault passphrase are absent from browser storage. Restart correctly
leaves the route locked until unlock. No provider request is made: this is not
live credential or model-response acceptance, nor an OS-process crash test.
The regression is now required before hosted package creation; hosted results
for this change remain pending.

### Connection-to-conversation browser extension

The connection browser regression now uses a loopback-only synthetic SSE provider.
After restart and explicit unlock, it creates a conversation through the UI,
selects the recovered model, sends a message, renders the streamed response,
and reloads the saved transcript. The provider observes exactly one request,
the expected model and credential, and no replay on reload. The local Chromium
run passed. This proves the setup-to-response transport with a fixture, not
live model quality, planning, or isolated task execution. Hosted CI remains the
next verification gate for this extension.

### Authenticated browser approval to Docker execution

A new real-browser regression displays the exact synthetic task command and
boundaries, approves through the authenticated UI, verifies approval creates
no execution receipt, then selects Run task. The real Docker worker produces
the expected artifact, passing evidence and an observed receipt. The task
correctly remains waiting for final review. This local check passed and is
now required in hosted acceptance. It seeds a fixed synthetic task; it does
not establish a model-generated plan or the complete clean-install journey.
The worker uses the supported manual-dispatch configuration. Initial fixture
failures came from ambiguous selectors and a worker not started; the test was
corrected without changing the product's approval or execution guards.

### Final browser review and durable completion

The approval regression now continues from verified Docker output into the
Review Desk, reads the recorded verification result, selects Approve request,
and confirms the decision. Before confirmation the task remains waiting for
approval. Afterward it is completed; reopening the disk store preserves both
completion and the authenticated reviewer's identity. The local run passed.
This supersedes the prior fixture's final-review-pending limitation, but still
uses a fixed synthetic plan and is not the clean-install live-model journey.

### Browser disconnect during response

The connection regression now streams a first chunk, reloads the browser before
the delayed second chunk arrives, and waits for the complete recovered response.
It then reloads again and observes exactly one provider request. The completed
text is also present in the disk snapshot. The local Chromium check passed;
this is a browser-connection interruption with a synthetic provider, not server
process termination or a live provider transport failure.

### Experimental Claude launch regression coverage

Seven focused adapter tests pass: plan-only launch arguments and fresh-directory
cleanup; API, signed-out and unknown authentication denial before inference;
cancellation before authentication; unexpected tool transcript rejection with
usage retained; and bounded-child failure with usage retained and no retry.
Typechecking passed. The child process and account inspection are mocked in
these tests. They do not prove official-client isolation or live subscription
inference, which remain outstanding.

### Guided local-model endpoint configuration

The guide previously exposed a custom endpoint only for API-compatible providers.
Local users can now enter their loopback model-server address and port directly,
with the catalog endpoint prefilled. Downloaded profiles retain that address;
validation allows HTTPS or loopback HTTP, rejects embedded credentials, queries
and fragments, and requires loopback for local models. Server checks remain in
place. Both local and API-compatible browser journeys passed against an isolated
synthetic SSE endpoint, including restart/unlock and mid-response reload without
replay. The build passed. Hosted acceptance now runs both connection modes.

### Reviewed generic agent migration: browser acceptance

Current source already supports explicit generic manifests, reviewed staging
imports and durable rollback; older progress entries describing a fixture-only
provider are superseded for this route. A fresh Chromium session passed owner
setup, JSON entry, review before write, explicit confirmation, offline agent
creation, source tool/permission stripping, disk reopen, separately confirmed
rollback and persisted removal. The test is now in hosted acceptance. It uses
synthetic agent records only, not third-party account access or arbitrary
memory-format migration. Unsupported channels and tasks remain unsupported.

### Clean installed archive: browser and execution acceptance

Browser tests can now load the built modules from an explicitly selected installed
package root. The clean-install runner installs the supplied tarball with lifecycle
scripts disabled into a fresh temporary consumer, then exercises memory import,
API and local connection recovery (including mid-response reload), browser plan
approval through real Docker execution and final completion, and generic migration
with rollback. All five journeys passed locally against archive SHA-256
`059a26c5b318251f545bb5dd16918db839030317d60f4caec8d1bccd3d6eb43f`.
This archive preceded this documentation addition; it is not a digest for a future
CI artifact. Hosted CI now runs the installed-archive journeys after packaging and
before retaining that exact archive. Model endpoints remain synthetic; this does
not establish live subscription acceptance or competitive performance.
