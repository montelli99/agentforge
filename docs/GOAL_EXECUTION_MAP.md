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
