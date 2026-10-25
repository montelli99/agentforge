# AgentForge goal execution map

This public map covers the public product and release gates. Owner-specific
execution amendments remain private and are not release inputs. Slack and
Discord acceptance are deferred; registry publication is a separate action.
The app goal was last observed blocked; 'active' below is historical plan text,
not evidence that the app goal has been resumed.

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

**Current state:** locally verified, with hosted CI passing on the public
repository across Ubuntu, macOS, and Windows on Node 22 and 24. The latest
recorded run is `36654866625` for commit `759ec73`; all seven Ubuntu, macOS,
and Windows Node 22/24 jobs passed. Registry publication remains a
separate owner-approved action.

**2026-09-30 local checkout recheck:** `pnpm verify:public` passed after the
approved-Docker acceptance fixture declared its output artifact. The
non-deleting sandbox continues to mount only declared output files writable.
This local result does not supersede hosted CI for the current dirty checkout.

## Phase 2 — Canonical workspace and durable memory

**Outcome:** projects, spaces, nested departments, channels, conversations,
tasks, memory, plans, approvals, audit events, and evidence share one durable
record and survive restart.

**Evidence:** persistence acceptance, workspace UI acceptance, migration tests,
and the canonical workspace routes.

**Current state:** local persistence and browser acceptance pass. The snapshot
writer now rejects a stale second store instance under the file lock instead
of silently overwriting the first instance's changes; the two-instance
regression and backup-recovery race check, 21 persistence tests, type-check and
crash recovery pass locally. A recovering backup reader also refuses to replace
a primary snapshot that another writer repaired first. `pnpm verify:public`
also passed on this local checkout after the persistence changes. The gate now
includes a real two-process stale-writer acceptance: the second process is
rejected and the first process's durable record survives. Broader concurrent
operation and cross-provider parity remain unverified. Hosted CI still needs a
committed revision before it can verify these changes.
The public gate was rerun after the owner-login change and passed locally,
including package privacy, crash recovery, concurrent writes, isolated Docker
acceptance and approved-plan Docker execution.

**Reviewer identity check:** approval resolution, process-revision decisions,
rollback, task evidence approval, execution-plan approval/revocation and browser
write approval now require an authenticated session even in local unlocked
mode. The workspace can still be explored and configured locally before owner
setup; a Review Desk decision attempt opens the owner setup or sign-in gate.
Once the owner sets a password, the local workspace requires login for all API
routes, including reads; strict mode also rejects anonymous approval and
records the authenticated admin's user ID. The focused auth, browser and
synthetic-journey suites pass 28/28; the full suite passes 549 tests with two
skipped. Historical
local decisions bearing `local-unverified-web-client` remain labeled in the
Review Desk and task evidence views instead of being presented as signed human
review. The assembled UI script parses and TypeScript passes; a rendered
browser review of this copy is still outstanding.

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

**Current state:** local package-ready audit passes and hosted CI is recorded
for the public repository. Passing run `36654866625` verified commit `759ec73`
across Ubuntu, macOS, and Windows on Node 22 and 24, including public-package
and isolated-execution acceptance.
Registry publication and provenance verification remain separate
operator-approved release actions.

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

### Generic manifest inspection correction — October 25, 2026

The generic provider now snapshots and validates the supplied manifest at
inspection and plans from that snapshot, rather than substituting the bundled
example. Unknown inspections are rejected; later edits to the caller's input do
not change the inspected plan. The existing migration regression covers custom
agent identity, snapshot isolation, unknown inspection and malformed input.
Validation: 14 migration-suite tests and the full TypeScript check passed.
This is not complete migration acceptance: the HTTP flow still uses fixture
inspection, unsupported entities are not imported, and run verification remains
process-local. No private workspace or external memory service was imported.

The subsequent UI/API change accepts pasted generic JSON for inspection,
planning and simulation. HTTP integration verifies the supplied identity reaches
the plan and preview leaves agent counts unchanged. Uploaded-manifest import
returns 409 rather than ignoring the upload and importing the fixture. Null is
invalid input, not an instruction to load example data. The production build and
built browser-script syntax check passed; interactive browser acceptance is
still outstanding. Reviewed import and durable rollback remain unfinished.

Generic import preflight now rejects unsupported/unreviewed items, empty plans,
duplicate or invalid identities, and collisions with existing agents before
creating any agent. A regression with a collision in the second item verifies
the first item is not written. The unsupported fixture import reports HTTP 409.
The migration and end-to-end regression suites passed 25 tests. This preflight
does not provide crash atomicity or durable rollback, nor does it complete the
agent policy mapping; those are still required before enabling uploaded imports.

Generic agent mapping now produces structurally complete, offline staging
records using the public AgentTeammate type: no compute, auto-resume, cloud
fallback, tools, permissions or channel bindings are enabled. The plan labels
this as a transformation and explains that model, prompt, harness and authority
must be reconnected/reviewed. Task history is explicitly unsupported in the plan
rather than disappearing from it. Synthetic staging import verifies these policy
values and run identity; 25 regression tests passed. This is staging only, not
behavior-preserving migration or completed activation. Uploaded import remains
disabled pending review and durable rollback.

Staging verification now compares complete cloned agent records in the original
store, rather than testing ID existence. Added permissions/tools and changes to
execution policies are reported as authority changes; the verification type no
longer hardcodes this result to false. Imports reject unknown or edited generated
plans and snapshot accepted input before awaiting preflight. Regression checks
cover changed permissions, another target store, tampered plans and collisions;
25 tests passed. These receipts are still in memory and do not establish durable
rollback, runtime equivalence or production migration acceptance.

Staging import now writes a start receipt before creation and a completion
receipt with record SHA-256 values through the existing durable audit store.
A fresh provider/store instance verifies unchanged records against those
receipts and the audit chain. Missing completion, changed records, invalid
receipts and pruned receipts fail verification; no automatic retry occurs.
Authority-change status is unknown when only an unverifiable durable receipt
remains. The synthetic disk-reload regression passed within the 25-test suites;
this is not an operating-system crash test or an atomic rollback implementation.

Integration check after commit `1788689`: `pnpm check` passed full typechecking,
product isolation, 111 test files (664 tests passed, two skipped), production
build, browser-script syntax and package-surface acceptance. The npm archive
privacy check inspected 217 files without matching private-data signatures.
The migration website guide was updated to explain uploaded previews and the
unfinished import/rollback boundary; website checks passed across 42 pages.
Hosted run `40219215991` for `1788689` was still running when checked; no final
hosted result or rendered-browser acceptance is claimed here.

The public memory SDK guide now documents custom adapter integration into both
embedded chat and task runtimes, composition, persistence responsibilities and
acceptance boundaries. ConversationRuntime is exported from the public package.
The shared query helper validates response shape/size and filters scope, tags,
categories and archives while preserving explicitly shared workspace records.
It snapshots query filter arrays so an adapter cannot modify the caller's filter
criteria. The focused memory/chat/worker suites passed 24 tests. Build and package
import/privacy acceptance passed before the final category/filter-array guards;
those final guards passed the focused suites. Custom plugin installation UI and
live provider acceptance are not completed by this SDK work.

Host-registered memory connection definitions now drive additional guided setup
fields, bounded connection checking and encrypted per-project save/restore.
Definitions are trusted server code, not browser-supplied code. Saved definition
versions must still match on restore. An extended setup API regression verifies
custom connection, encrypted secret storage, service reconstruction/restore,
credential-free catalog responses and rejected version mismatch preserving the
active source. Ten setup tests and the production build/browser syntax check
passed; actual browser interaction with generated fields remains unverified.

Registered synthetic memory factories now participate in the existing chat
tool-loop and worker-context tests: the chat receives the selected corrected
record and provenance, while task context receives its selected project source.
Cross-project/namespace exclusions and cancellation remain covered. Shared
lookup handling now replaces raw adapter exceptions with a fixed error so
third-party exception text cannot expose credentials. The 24 focused tests and
full typecheck passed. This is synthetic integration evidence, not a live
third-party service or browser journey result.

Registered-provider restart failures now have a fixed, credential-free recovery
message identifying a missing provider or changed setup version. Service
reconstruction tests remove the definition and replace it with a newer version;
both restore attempts fail, leave project memory disconnected, and preserve the
encrypted selection byte-for-byte. Ten setup tests and typechecking passed.

Memory-ablation evidence now has an exclusive append-only JSONL journal. Each
started/completed/failed attempt is flushed before the summary is replaced using
a same-directory rename; existing evaluation outputs cannot be overwritten by
a new run. The local regression verifies retained start/failure events and
overwrite refusal, and typechecking passed. No paid request or new competitive
comparison was run. Power-loss durability and actual process-kill recovery of
this journal remain unproven; the ablation is still only a recall experiment,
not a full-agent superiority result.

A real child-process termination now exercises the evaluation journal. The
child flushes a started-attempt checkpoint, signals readiness, and is killed
without closing its journal. The parent reads the intact incomplete report and
started event, and verifies a fresh writer cannot overwrite that attempt.
The local regression and full typecheck passed. This establishes this specific
post-checkpoint process-termination case, not power-loss survival, termination
during a write, or knowledge of an uncertain remote provider's billing/result.

The live planning proof now journals its start and every planning/usage audit
before proceeding, records failed/uncertain outcomes, and refuses to overwrite
an earlier run. It still never approves or executes its draft. A dedicated
TypeScript check covering the planning and ablation scripts (normally excluded
by the source tsconfig) found a missing baseSha field in the planning-only
fixture. The unbound revision is now explicitly empty until the separate
execution harness supplies the disposable checkout revision. Both scripts pass
their dedicated check. No paid request was repeated for this change.

### Release-proof script coverage

Added tsconfig.scripts.json covering all nine TypeScript scripts. typecheck:all now includes this check, so existing pnpm check and verify:public CI paths enforce it. The first run exposed a missing repository field in the disposable crash-proof contract and unsafe optional token-usage access in the latency diagnostic; both are corrected. The synthetic file backend has no Git revision (empty baseSha), and does not claim repository verification.

Validation: pnpm typecheck:all passed. The actual child-process termination/restart proof passed: durable started receipt existed before termination, automatic retry was refused, and exactly one synthetic effect remained. This does not prove remote-provider reconciliation or Docker orphan cleanup. No live model requests or private integrations were used.

### Hosted CI export omission corrected

Hosted run 40220294456 failed the public link boundary because README linked to docs/MEMORY_PROVIDER_SDK.md without that document being in the explicit source-export allowlist. Added that public guide and tsconfig.scripts.json (required by the newly checked source-release commands) to the allowlist. No private directories were added. Validation: public-link acceptance passed all 2,619 local links across 92 allowlisted documents; repository-privacy acceptance passed its 27 cases and source scan. Hosted acceptance of the resulting commit remains pending.

### Execution proof retains uncertain-run evidence

The hash-selected synthetic execution runner now uses the exclusive durable evaluation journal before workspace creation and execution. It records failed-or-uncertain outcomes without raw exception contents, preserves the workspace and receipt store on failure, and retains successful artifacts rather than returning references to deleted files. Reusing an evidence output is refused; no automatic retry is added. Retained local evaluation workspaces require deliberate later cleanup.

Validation: all TypeScript proof scripts passed type checking. A synthetic malformed-task subprocess failed before provider/backend execution, retained its workspace and failure report, and a second invocation refused to overwrite the original journal. Zero provider requests. This validates evidence retention, not a new successful Docker or end-user approval journey.

### Execution crash proof is a release gate

Added test:execution:crash to verify:public and to the Windows/macOS/Linux Node 22/24 CI matrix. The new package command passed locally: an actual child process was terminated after its effect and durable receipt, restart refused replay, exactly one effect remained, and the task was presented paused for reconciliation. Hosted cross-platform results remain pending. This gate covers the disposable backend; remote-provider reconciliation is still open.

### Recovery guards apply to SDK and worker callers

The web receipt-review route rejected unknown planning usage and finished-task restoration, but the public runtime reconciliation method did not. Moved equivalent enforcement into reconcileObservedExecution so direct SDK calls and executeTask's observed-result branch cannot bypass those checks. Extended the existing worker integration case: completed-task restoration is rejected, unknown planning usage blocks both direct reconciliation and executeTask without changing status, and an intact observed result with resolved usage restores completion without calling the backend. All 13 worker integration tests passed; typecheck:all passed. This is synthetic runtime recovery evidence, not live provider reconciliation or browser acceptance.

### Restore retains the original human approval

Observed-result recovery now requires the original pending approval for tasks whose contract requires human review. It rejects missing, mismatched, or already-decided approval records rather than presenting an impossible waiting-approval state or reopening a rejected decision. Extended worker coverage proves restart restores waiting_approval with exactly one original approval and refuses restoration after that approval is rejected. All 13 worker integration tests and typecheck:all passed; browser and hosted acceptance remain pending.

### Hosted archive inspection found missing SDK guide

Downloaded the package from successful public-acceptance job in run 40221028980. COMMIT.txt matches 66ea369d2213a340176dba7eb6f0eed95af44b24; package SHA-256 matches 0f998b1a10a947c2a6a62672c459264a621e5e4ba3821bd1d9fe801a7ed26409. Archive inspection found the runtime SDK modules but no memory SDK guide: docs/.npmignore excluded all documentation independently of the source-export allowlist. Added an exception for only MEMORY_PROVIDER_SDK.md. npm pack dry-run confirms the guide is included while the internal goal work log remains excluded. New exact-build hosted package acceptance is required; this entry does not claim the full release complete.

### Publish usable TypeScript memory contracts

Package acceptance now requires the public memory runtime exports, adapter modules and guide. Inspection also found that the SDK's documented TypeScript interfaces were erased without published declarations. Build now emits declarations and package exports explicitly map types to dist/index.d.ts while preserving JavaScript import/default entrypoints. The archive gate requires the entrypoint and memory contract declarations and continues excluding internal work logs and test/source files.

Validation: build, all source/script type checks, strict checking of dist/index.d.ts and its declaration graph, public entrypoint import and archive privacy passed (432 shipped files). The package boundary now includes the types needed to implement third-party providers; live adapter compatibility and final release acceptance are not implied.

### Installed-package memory SDK consumer passed

Extended the existing installed-package CLI acceptance to compile a synthetic external TypeScript consumer against the npm archive installed in a fresh temporary project. It imports MemoryProvider, MemoryQuery and MemoryConnectionDefinition from agentforge, registers a provider, composes it, and uses bounded querying. The compiler and Node development types come from the test toolchain; AgentForge API resolution comes from the installed archive, not repository sources. Full package CLI acceptance passed locally, including the new strict consumer check. All seven hosted jobs for prior commit 66ea369 passed (run 40221028980); newer SDK changes require their own exact-build hosted evidence.

### Generic migration writes one snapshot

Added a store-level migration batch commit and routed generic imports through it. Agent records and both verification receipts are appended before one snapshot write; a failed write restores the prior in-memory agents/audit/checkpoint and emits no successful creation notifications. Successful notifications happen after the commit. The existing generic migration integration case now forces a real concurrent-snapshot conflict on a two-agent batch and verifies unchanged in-memory agents, audit history, disk content and a valid audit chain. All 14 migration/integration tests passed; all source/script type checks passed before the test extension. This closes partial per-agent writes for this path; reviewed uploaded import, explicit rollback and process-kill atomicity proof remain open.

### Durable rollback for unchanged staging imports

Added rollbackAgentImport using the original hash-verified import receipts. It removes only the complete unchanged batch, refuses missing/changed agents or operational references, writes the removal and rollback receipt in one snapshot, restores in-memory state on write failure, and refuses repeated rollback. Source manifests are untouched. Existing migration coverage now verifies restart rollback of two agents, durable absence after reopening, audit integrity, changed-agent refusal, repeated rollback refusal and concurrent-write failure preserving both agents and disk. All 14 integration tests and source/script type checks passed. The authenticated reviewed upload/rollback UI and crash-interruption proof remain unfinished.

### Reviewed uploaded-agent import API

Added authenticated owner/admin prepare-import, commit-import and rollback-import endpoints. Preparation accepts an explicit generic manifest, refuses unsupported items, returns the exact staging plan with a SHA-256 digest and ten-minute review expiry, and makes no import. Commit binds the review to its user and digest, requires explicit confirmation, and consumes it before awaiting the atomic import to prevent duplicate submissions. Rollback requires explicit run confirmation and the durable unchanged-batch checks. Pending reviews are bounded and intentionally do not survive restart; users must re-review.

Existing API integration coverage proves anonymous denial, prepare without writes, changed-digest refusal, successful verified import, single-use refusal, and rollback. All 14 migration tests and typecheck:all passed. Browser controls still need wiring and acceptance; the old unreviewed upload route remains blocked.
