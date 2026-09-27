# AgentForge Markdown Review Register

**Review started:** 2026-09-22  
**Scope:** Public Markdown present in AgentForge-Staging.
**Method:** Compare each document to current source, tests, and runnable acceptance evidence. The repository documentation tree is the only product source set.

## Source-set finding

On 2026-09-24 the flattened convenience bundle was removed from this repository because it mixed public product material with private operating notes and unrelated-project references. The public documentation tree now contains the authoritative AgentForge requirements, research, and evidence only. The master build specification contains sections 0–49 (50 sections), while other specification families overlap in numbering and must remain distinct. Presence of a file is not proof that its product requirements are implemented.

## Document-by-document review

| Document | Review outcome | Finding / action |
|---|---|---|
| `CODE_OF_CONDUCT.md` | Reviewed | Community policy; no product-readiness claims. |
| `CONTRIBUTING.md` | Corrected | Node version and launch instructions align with the package scripts; licensing language no longer presents an unlicensed repository as an open-source release. |
| `FIRST_TESTER_GUIDE.md` | Corrected | Described an older token-proxy product/API rather than vNext control plane. |
| `LAUNCH_CHECKLIST.md` | Reviewed | Release gates explicitly remain unchecked and require actual workflow evidence. |
| `MEMORY_AUDIT.md` | Reviewed and qualified | Marked historical OpenClaw research; its architecture and estimates are not AgentForge capabilities. |
| `PRODUCTION_ISOLATION_CONTRACT.md` | Corrected | Removed personal machine path and clarified storage reality. |
| `QUICKSTART.md` | Reviewed; command verified | Build and `pnpm vnext` were run on isolated ports; status endpoint reported local JSON storage and sample data. |
| `README.md` | Reviewed and corrected | Product/readiness claims checked against code and current local acceptance evidence; unlicensed state and mock integrations are explicit. |
| `SECURITY.md` | Corrected | Removed universal-enforcement and secret-isolation claims and unconfigured response commitment; states that Host/Origin checks are not authentication and forbids remote exposure until identity/TLS controls are implemented. |
| `TESTER_FEEDBACK.md` | Corrected | Replaced obsolete token-savings metrics and invented price questions with vNext workflow evidence. |
| `docs/COMPETITIVE_HARNESS_UX.md` | Reviewed as research | Explicitly design research; not implementation or live benchmark evidence. |
| `docs/DURABILITY_DECISION.md` | Updated | Documents launcher-wired JSON snapshot persistence, HTTP restart acceptance for messages and operational memory, focused passing tests, and remaining concurrency/cross-platform durability gates. |
| `docs/LICENSE_DECISION_MATRIX.md` | Reviewed as decision aid | Advisory only; no license is selected. |
| `docs/MIGRATION_ACCEPTANCE_REPORT.md` | Corrected | Replaced unsupported conformance percentages with fixture-only evidence. |
| `docs/PROVIDER_READINESS_AUDIT.md` | Updated | Memory readiness now reflects local durable UI/API and query behavior while retaining automatic worker retrieval and evaluation as open gates; other readiness labels separate local tests from real provider evidence. |
| `docs/requirements/AUTONOMOUS_MASTER_BUILD_GOAL.md` | Reviewed | Primary scope, sections 0–49; normative requirements, not proof of completion. |
| `docs/requirements/COMPLETE_AUTONOMOUS_ROADMAP.md` | Reviewed | Phase plan; RC baseline/completion statements need independent revalidation. |
| `docs/requirements/COMPLETION_ENGINE_SPECIFICATION.md` | Reviewed and mapped | `COMPLETION_ENGINE_TRACEABILITY.md` maps each specification area to source/tests and labels remaining in-process, persistence, semantic-review, evidence-provenance, and orchestration gaps. |
| `docs/requirements/COMPLETION_ENGINE_TRACEABILITY.md` | Added | Requirement-by-requirement implementation and evidence map; documents the completion engine as a tested prototype rather than a complete autonomous system. |
| `docs/requirements/EXTENSION_GUIDE.md` | Reviewed | Adds package/process/voice/commercial requirements; prices are illustrative. |
| `docs/requirements/IMPLEMENTATION_TRACEABILITY.md` | Updated | Reconciled persistence, workspace hierarchy creation, Telegram owner-linking, marketplace permission review, browser smoke, operational memory persistence, governed SOP proposals, execution-contract command/path hardening, and current test evidence; retained worker-memory retrieval, Web/API auth, live-provider, hosted-marketplace, and release gates. |
| `docs/requirements/MARKDOWN_REVIEW_REGISTER.md` | Reviewed and updated | This register is part of the source set; it records the inventory boundary, document-by-document review, verified behavior, and unresolved evidence gaps. |
| `docs/requirements/RELEASE_CANDIDATE_GOAL.md` | Reviewed | Historical baseline values are not current verification results. |
| `docs/requirements/SPECIFICATION_INDEX.md` | Reviewed | Correctly distinguishes families and records missing original bundle. |
| `docs/requirements/VALIDATION_MIGRATION_RELEASE_GOAL.md` | Reviewed | Validation plan; status must be backed by real workflow evidence. |
| `docs/research/UNIFIED_AI_MEMORY_RD.md` | Reviewed as R&D | Future-memory research only; not a vNext completion requirement. |
| `.artifacts/agentforge/report.md` | Corrected | Historical report now explicitly says scenario passes are not live-provider/production evidence; formatter has regression coverage. |
| Antigravity `implementation_plan.md` | Reviewed as historical | Claims parent-repository boundary and old prototype state; current `vnext` checkout is separate. Do not use its paths/counts as current facts. |
| Antigravity `walkthrough.md` | Reviewed as historical | Completion-engine and 100% isolation claims are not release evidence; archive count is stale. |
| `reports/summary-2026-06-14.md` | Qualified | Historical optimization-proxy output; figures are not current vNext metrics or audited savings. |
| `reports/summary-2026-06-15.md` | Qualified | Historical optimization-proxy output; figures are not current vNext metrics or audited savings. |

### Remaining consolidated files classified

These files were inventoried separately because they are workspace context, unrelated project material, or generated evidence rather than AgentForge product specifications. They are included in the consolidated bundle count but do not add AgentForge acceptance requirements.

| Document | Review outcome | Finding / action |
|---|---|---|
| `.hermes.md` | Classified as workspace context | Hermes role and shared-source notes; not AgentForge product behavior. |
| `AGENT_EXECUTION_PLAYBOOK.md` | Classified as workspace context | OpenClaw lane/tool instructions; not AgentForge product requirements. |
| `AGENT_QUALITY_FLYWHEEL.md` | Reviewed as product research | Capability comparison, reported builder pain, and proposed quality loop; use its acceptance conditions to prioritize trace-linked evaluations. Real run instrumentation and correction-to-regression behavior remain unimplemented. |
| `agentforge_report.md` | Qualified as historical evidence | August 2026 local scenario report; passing fixtures do not establish live provider, production security, or migration behavior. |
| `AGENTS.md` | Classified as workspace context | Shared AI_Workspace operating instructions; not AgentForge feature scope. |
| `ANTIGRAVITY_TAKEOVER.md` | Classified as workspace context | Cross-project migration/takeover notes; not AgentForge acceptance evidence. |
| `AUTONOMY_MODE.md` | Classified as workspace context | Agent execution preferences; not a product capability specification. |
| `BROWSER_TRADING_PLAN.md` | Excluded as unrelated project material | Trading workflow; no AgentForge acceptance requirements. |
| `DELEGATION_PROTOCOL.md` | Classified as workspace context | Cross-agent handoff procedure; not AgentForge product scope. |
| `Fairfax_Assumable_Scan_2026-07-04.md` | Excluded as unrelated deal research | Real-estate property scan; not AgentForge product scope. |
| `HEARTBEAT.md` | Classified as workspace context | OpenClaw heartbeat configuration note; not AgentForge behavior. |
| `IDENTITY.md` | Classified as workspace context | OpenClaw assistant identity note; not AgentForge behavior. |
| Unrelated coaching reference | Excluded as unrelated workflow reference | Not AgentForge acceptance criteria. |
| `MEMORY.md` | Classified as workspace context | Mixed cross-project memory and dated statuses; preserve as context, not current AgentForge evidence. |
| `MISSION_CONTROL_BIBLE.md` | Classified as workspace context | OpenClaw/Mission Control operating procedure; not AgentForge product behavior. |
| `MISSION_CONTROL_OPERATOR_PROMPT.md` | Classified as workspace context | Operator resume prompt; not AgentForge product requirements. |
| `ORION_PHASE9Y_PLAN.md` | Excluded as unrelated project plan | Orion-specific phase work; no AgentForge acceptance criteria. |
| `ORION_STATUS_LIVE.md` | Excluded as unrelated status report | Dated Orion status; not current AgentForge evidence. |
| `PIPELINE_CONFIG.md` | Excluded as unrelated project configuration | Capital IQ pipeline setup; not AgentForge product scope. |
| `PROJECT_REPO_STATUS.md` | Classified as workspace context | Historical multi-repository status; not current AgentForge evidence. |
| `SOUL.md` | Classified as workspace context | OpenClaw agent persona and behavior; not AgentForge product requirements. |
| `TEAM_ROLE_REGISTRY.md` | Classified as workspace context | Workspace role assignments; not AgentForge product behavior. |
| `TOOLS.md` | Classified as workspace context | Local tool notes; not AgentForge product scope. |
| `USER.md` | Classified as workspace context | User preferences and cross-project context; not AgentForge product requirements. |
| `INDEX.md` | Generated | Inventory index only; not an original source document or implementation evidence. |

## Verified application facts

- The vNext launcher now explicitly constructs a `WorkspaceStore` at `getDefaultWorkspaceFilePath()`; `AGENTFORGE_DATA_DIR` overrides the default per-user `.agentforge/workspace.json` location. The exported `globalStore` remains isolated in-memory for tests and embedded use.
- Projects now offers a local create-workspace flow that creates its first space and channel. The API validates hierarchy references, lists workspaces/spaces/channels, and persists the hierarchy through a built-launcher restart; this is local workspace management only, not external repository access or remote authentication.
- Tasks now has a visible create form for title, details, priority, and optional teammate assignment. It saves the task in `ready` state with the server's restricted default contract; the UI says the worker is not connected. Browser acceptance created a task in disposable storage and showed the saved card with the teammate's name. API tests verify all authority flags remain false and human approval is required.
- The durable launcher no longer injects demo agents, active-looking tasks, or sample marketplace packages into the user's JSON workspace; isolated in-memory stores remain demo/test fixtures. The mock-call endpoint now requires an existing agent and an E.164 phone number instead of silently selecting a fictional acquisitions agent and example number.
- Telegram and REST `/resume` and `/retry` now refuse with an explicit worker-unavailable response and leave task status unchanged. This removes prior false “resumed/queued” success claims; it does not implement the missing worker.
- WorkspaceStore mutations now create minimal system-origin audit entries that appear in Activity and persist with the workspace snapshot. Automated tests cover workspace/task/procedure-assignment entries after restart. Actor attribution is honestly “workspace-store” until authenticated human identity is wired to mutations.
- Processes/SOPs now has a paste-in Markdown importer instead of only a canned sample. Browser acceptance imported a sample procedure and visibly showed its unresolved decision criteria on the SOP card; SOP import still does not execute it or grant authority.
- The version-5 snapshot covers all current `WorkspaceStore` collections, including operational memory, process revision history and approval proposals, process-to-agent assignments, and ledger bindings; version-1/2/3/4 snapshots migrate to version 5 without losing existing data. Tests verify hierarchy/binding, message and memory round-trips, revision/proposal restart restoration, event deduplication, corrupt-file recovery, and unsupported-version fallback. Cross-process concurrency, crash/power-loss, and cross-platform release durability remain unverified.
- Operational memory can be created and searched from the local UI/API and is stored with canonical workspace state. API validation/search, snapshot round-trip, and v1/v2-to-v3 migration tests pass; task/agent workers do not yet retrieve these records automatically.
- Operational-memory query tests cover category/tag filters, shared workspace rules, sibling-project isolation, and deletion; global/shared records remain intentionally visible in project-scoped lookups.
- The completion DAG fails closed on duplicate requirement IDs, missing dependency targets, and cycles before replacing the prior valid graph; focused tests also verify that an invalid replacement preserves the last valid graph. Persisted DAG status restoration validates nodes and dependencies against the PRD.
- GitHub Actions now installs with the pinned pnpm 10.30.1 lockfile, targets supported Node 22/24 across Windows, Ubuntu, and macOS, and runs whole-repo checks plus built-launcher persistence and package CLI acceptance. Local Windows checks pass; a hosted run has not yet been triggered.
- The tracked watchdog had hard-coded paths into the user's separate OpenClaw checkout and `.openclaw` logs, and its process filter could select an unrelated Node server. It now defaults to the AgentForge-Staging vNext entry point, uses an AgentForge data/log directory, and only matches that absolute entry path; it is explicitly Windows-only. `node --check` passed without running it or touching any service. Personal workspace paths were also removed from source and tests; a repository search now finds none in source, docs, workflows, or scripts.
- The marketplace manifest validator now validates untrusted input shapes and permission schemas before deeper processing, uses segment-aware path checks, rejects Windows device names and duplicate package metadata IDs, and documents that manifest validation cannot inspect archive symlinks. Focused security cases and full-source typecheck pass.
- The latest full-source run passes 222 tests with 2 live-provider checks skipped across 23 files; strict typecheck and build pass. The subsequent focused contract regression run passes 22 tests across two files and strict vNext typecheck passes. Built-launcher restart acceptance verifies workspace/space/channel hierarchy, SOP-to-agent assignment, message, memory, and approved SOP revision/proposal restoration; package CLI acceptance verifies least-privilege initialization, manifest validation, bounded ZIP content/CRC inspection, traversal rejection, and honest test reporting. Completion-engine tests cover session persistence/restart restoration, invalid OriginalGoal hash rejection, downgrading a persisted completion claim until fresh verification, failing the critic flag on detected safety/goal gaps, blocking execution after a failed critique, enforcing requested browser/provider checks, and classifying production TODO/placeholder markers. A current marker scan found 47 results but no release-blocker classifications; it does not prove product requirements are complete. Workspace hierarchy API tests cover create/list, invalid parent rejection, and private channel creation. Scribe change detection, SOP authorization, durable process proposals, approve/reject/stale behavior, revision history, stale-write rejection, rollback, and ZIP archive edge cases have focused coverage. The eight-hour read-only server soak completed on September 23. The Projects form was exercised end-to-end in a real browser on isolated temporary storage and visibly created a workspace, space, and channel.
- Telegram command/callback authorization no longer assumes an unlinked sender is the owner. Mutating task commands and approval decisions require linked-user permissions; test coverage includes unlinked-user and viewer denial. Settings now issues a ten-minute single-use owner-link code; `/link CODE` is accepted only in a private chat, identity persists in the workspace snapshot, and group redemption/replay/collision are rejected. This has local adapter coverage only; Web/API authentication and live Telegram provider proof remain.
- Marketplace installation validates the manifest, does not install on the initial permission-review response, rejects grants beyond the manifest request, and records local installation state only; package code is not executed. Hosted publishing, authenticated identity, sandboxed execution, and browser acceptance remain unverified.
- The rebuilt vNext UI was inspected in an isolated in-app browser and all 18 navigation views were clicked and verified. Sample agent/task cards appear only with in-memory demo/test stores; durable launcher storage starts without injected examples. Disconnected channels are labeled honestly; mock voice, local-only approvals, fixture migration, and manifest-only marketplace surfaces have explicit boundaries. The local voice simulator created one sample record without placing a call, migration dry-run returned a fixture-only result, and the Activity screen showed a new task mutation. UI text from workspace/package records is escaped before insertion into HTML.
- Current-build local smoke on isolated port 3460 returned HTTP 200 from all 23 exact GET API routes. Built-launcher restart acceptance created and restored a workspace/space/channel plus an imported SOP assigned to an agent. The Projects form, SOP importer and unresolved-rule display, SOP assignment wizard, and task creation form were exercised in the real browser with isolated temporary storage. Marketplace permission review was reached and canceled; no package was installed or granted permissions. The task API was verified to reject resume/retry with HTTP 409 and leave state unchanged while no worker exists. This verifies local UI/API behavior only; the broader synthetic journey and live provider integrations remain unverified.
- Package CLI initialization now accepts only safe slugs, starts with no permissions and no selected license, `pack validate` runs local security checks for lifecycle scripts and traversal paths, and `pack inspect-archive` boundedly decompresses and CRC-checks ZIP entries in memory without writing files. This does not make install or execution safe. `pack test` correctly states that no package tests ran; publisher signing and distribution are not implemented.
- `ContractEnforcer` checks declared path patterns, authority flags, selected command substrings, and a spend ceiling. It does not mediate every server/provider side effect or prove a complete OS/network sandbox.
- The execution contract now rejects traversal inside paths that otherwise match an allowed prefix and, when given a worktree root, rejects symlink resolution outside it. Tests exercise a real temporary-directory symlink escape. Recognized deletion, outbound network (including ordinary Git push/fetch/pull/clone), force-push, and deploy/publish shell-command patterns are gated; policy errors omit command text. This remains defense in depth: an active worker and an OS-enforced sandbox are still absent, so do not treat it as complete execution safety.
- Repository tests and mock adapters are local fixture evidence. They do not prove live Telegram/Discord/voice/provider integrations.
- Harness fixtures now fail closed unless tests explicitly opt into simulation, and local API parsing rejects malformed/non-object JSON and bodies above 8 MiB. Focused tests verify these boundaries; this does not create a real task runtime or web identity system.
- Tiered local model selection now uses Ollama's discovered model list, avoids unverified local vision/tool/structured-output capabilities, and does not silently fall back to a remote provider for `forceLocalOnly` tasks.
- The OpenAI-compatible model adapter now preserves tool/JSON request options and streamed/non-streamed tool-call data; focused tests use a stub transport and make no paid/live requests.
- OpenAI-compatible usage no longer reports a fabricated generic rate as a cost for arbitrary models; cost stays unknown until model-specific pricing evidence is available.
- A browser smoke check confirms the rebuilt vNext shell, Settings navigation, local Telegram link-code instructions, Projects create-workspace flow, SOP selection/save, and task creation with explicit no-worker boundary; an inline-script parse regression test protects navigation and actions. It does not satisfy the full interactive workflow. Broader crash, concurrency, cross-platform, and release durability gates remain open. The built-launcher HTTP create/restart/read acceptance test passes for workspace hierarchy and process assignment.

## Current priority

1. Keep user-facing and release documentation honest about runnable versus simulated behavior.
2. Finish each present Markdown review and update canonical docs before regenerating the convenience archive.
3. Advance implementation only where acceptance evidence can be added locally; preserve explicit blockers for the absent original source bundle, missing live credentials, owner license choice, and external release authorization. Current additional gates include task worker execution, Web/API authentication, live provider integration, and full browser synthetic workflow.
4. Do not report plan completion until its actual acceptance gates pass.
