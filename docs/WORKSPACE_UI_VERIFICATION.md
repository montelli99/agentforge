# Workspace UI verification

Build with `pnpm build`, then run `node scripts/workspace-ui-acceptance.mjs`.

This creates an isolated temporary workspace and local HTTP server. It verifies project settings, project channel creation, conversation creation/rename/pin/archive/restore, message authorship, archived-write rejection, actual restart persistence, and generated JavaScript syntax. It does not connect providers, send external messages, inspect personal repositories, or use production data.

Visual and interaction acceptance is separate: project dialogs, conversation navigation, draft recovery, copy/export, responsive layouts, and keyboard focus must be exercised in a separate browser session before claiming UI readiness. API success is not visual acceptance.

### Current browser evidence

- September 27: opened a clean, isolated AgentForge workspace at `127.0.0.1:3481` using a temporary data directory. The first-run view showed the three source-backed workspace modes, the plain-language outcome field, the Setup Guide handoff, and the existing navigation for messages, team map, projects, agent studio, tasks, approvals, playbooks, connections, and management. It used the graphite, lavender, mint, and blue system palette; no model, provider, personal workspace, or execution backend was connected. The complete source suite then passed: 85 files, 476 tests, 2 skipped.

- September 25: the isolated in-memory preview was opened to AgentForge Harness at a narrow desktop/mobile-width viewport. The charcoal/lavender tokens now cover the readiness card and legacy controls; the offline 0/4 status and guided steps remain legible and source-honest. No real model, runtime, or live workspace was connected.
- September 25: a fresh isolated preview at 3464 was browser-tested at 1280×720 through first-use path selection and the complete new-conversation path, including project filtering, General channel creation, local conversation creation, and local message save. The rendered conversation provides Reply, Copy, Edit, Branch, Find, Details, Focus chat, project context, attachment, and response-route controls. The visible message styles use the charcoal/lavender system. Fixture data existed only in memory; no provider, channel, or execution backend was connected.

- September 24: the isolated local preview verified the conversation creation flow from the Messages empty state through a created conversation. The title input is blank on open (a click event can no longer leak into the title), and the open header visibly identifies the project channel, saved message count, and local-only scope. This was checked with the in-memory preview only; it did not call a provider or use production workspace data.
- September 24: `node scripts/workspace-ui-acceptance.mjs` passed. It exercised attachment and reply persistence, project/channel/thread identity, archive/restore, message identity, restart persistence, and generated client-script syntax in an isolated local workspace.
- September 24: the isolated Benchmarks preview showed the measured-quality snapshot with real baseline averages, accessible meters, and an explicit no-comparison state. The values came from local fixture baseline records; no model run or external account was invoked.
- September 24: `node scripts/chat-stream-acceptance.mjs` passed for the local HTTP fixture. It covered streaming, project-context persistence, duplicate-run protection, edit/archive guards, stop plus upstream cancellation, and provider failure. Browser streaming remains a separate acceptance item.
- September 24: the isolated project-files and persistence acceptance scripts passed. They verified explicit folder connection, bounded previews, linked-path denial, archive/revocation behavior, and restart recovery of workspace hierarchy, messages, task audit records, memory, and approved process revisions.
- September 24: at a 390 px viewport, the mobile navigation opened with its full labeled workspace list and closed immediately after selecting Messages. The selected conversation view occupied the screen without the drawer remaining over it. The viewport override was reset after the isolated preview.
- September 24: the isolated Review Desk preview showed a source-backed decision brief for a pending request: the request, in-scope task, recorded evidence state, and saved risk appear together before any decision control. Selecting Approve now opens an explicit confirmation step; the fixture was not approved or otherwise changed during this check. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed afterward.
- September 24: the isolated Activity preview verified retained audit filtering and the 24-hour filter. The page visibly reported the filtered event count and time window from saved local audit records. No audit records were altered.
- September 24: the Command Room preview verified the interactive workspace-map signal in the header. Its teammate, open-work, review, and execution-mode labels came from the same saved workspace records shown elsewhere; it is a navigation affordance to the relationship map, not simulated activity.

Project repository paths are references only. Project instructions are saved context and do not grant execution authority. Conversation messages are local records until a real provider-backed runtime is configured.

Attachment limits: four files, 2 MiB per file, 4 MiB total. Types: PNG, JPEG, WebP, PDF, plain text. Bytes are stored with the message in the local workspace snapshot. This initial implementation is suited to small context files; large-file storage is not implemented. Attachments are not automatically transmitted to any model. The acceptance script includes attachment persistence and malformed-image rejection.
- September 24: the isolated Work Board preview verified a decision-first board with the saved queued task promoted as the recommended next task. Empty stages now collapse into a named disclosure rather than occupying full board columns; selecting **Show empty stages** revealed the exact three empty saved stages, with the option to hide them again. The task distribution remains source-backed, and no task was changed during this check. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed after the update.
- September 24: the isolated Team Room preview verified the new Room/Roster switch. Room keeps the source-backed relationship map; Roster presents every saved teammate with role, current saved work or idle state, and open-work count. Opening a roster card showed its saved profile, boundaries, tools, permissions, and assigned work. No profile or work record was changed during this check. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed after the update.
- September 24: the isolated Work Board preview verified that a saved task card now exposes its next source-backed checkpoint, current evidence/check state, and saved update date before the card is opened. The same fixture still showed its owner and status; no task state or evidence was changed. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed after the update.
- September 24: `pnpm check` completed after the Work Board and Team Room enhancements: type checks passed; 37 test files passed with 308 tests passed and 2 skipped; the vNext build passed. This verifies local source and test coverage, while browser checks above remain the evidence for the rendered interactions.
- September 24: the isolated Benchmarks preview verified that the former decorative header bars now render only a source-backed pass-rate comparison trajectory. With no saved comparisons, it explicitly showed “No measured comparison trend yet”; baseline cards and observed-signal meters remained tied to the local measured fixture records. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed after the update.
- September 24: at a 390 px viewport, the refreshed Benchmarks surface kept its metrics and evidence cards readable with intentional single-column stacking. The Team Room mobile navigation closed after selecting Team map; the execution disclosure, Room/Roster controls, relationship map, review action, and work action were all visible and usable. The temporary viewport override was reset afterward.
- September 24: the Benchmarks trajectory no longer begins with hidden decorative bars. Its initial markup is empty and its rendered state supplies an accessible source-backed label. In the isolated local workspace with no comparisons, the accessibility tree exposed “No recorded pass-rate comparison trend” and the matching no-history copy. `pnpm build` and workspace acceptance passed after this correction.

## Project workspace tabs — 2026-09-24

- Added first-class **Threads** and **Activity** sections to the project workspace alongside Overview, Work & review, and Files. Threads render only conversations canonically associated with the selected project; Activity filters the saved audit stream to that project and its saved task/thread records. Neither view infers hidden model work or connected integrations.
- The selected project tab persists in local navigation state. The activity stream is lazy-loaded, has a precise loading message, an honest empty state, a safe refresh action, and a retryable error state. The overview-only Project Pulse now hides when another project section is selected.
- Browser checked on the isolated in-memory preview at desktop and 390px wide: Threads showed its empty project-specific state; Activity showed its source-backed empty state; the mobile resource cards and wrapped tab row remained usable with the active section visible.
- Verification: `pnpm build` passed on 2026-09-24. This covers the UI build; no production connector, model, or worker was enabled.

## Conversation details inspector — 2026-09-24

- Added a collapsible **Details** inspector to saved conversations. It uses only current conversation, project/channel, attachment-count, and chat-route status records; it does not expose backend identifiers, credentials, unrelated project files, or simulated agent status.
- The inspector shows the linked project and opens its canonical project workspace. It explicitly states that project instructions apply only to configured chat generation and files are never automatically shared with chat.
- Browser checked with the isolated text-only streaming fixture: desktop opens and closes the inspector beside the transcript; 390px uses a full mobile sheet with a visible close action. The fixture was labeled local and was not connected to a personal account.
- Verification: `pnpm build` and `node scripts/chat-stream-acceptance.mjs` passed on 2026-09-24.

## Work Board state rail — 2026-09-24

- Replaced the generic segmented distribution bar with a source-backed **Saved task state** rail. It shows Queued, In progress, Needs attention, and Closed using current filtered task records, along with a short plain-language explanation for each state on narrow screens.
- The rail works with existing filters and never presents task counts as throughput, model work, or connected execution. The existing recommended-task strip remains the primary action.
- Browser checked using the explicitly labeled in-memory fixture at desktop and 390px wide. The compact desktop rail and the expanded mobile explanations rendered without clipping; empty work lanes remained collapsed by default.
- Verification: `pnpm build` passed on 2026-09-24.


## Review Desk responsiveness — 2026-09-24

- Checked the local fixture Review Desk at desktop and a 390px mobile viewport.
- The review queue preserves its source-backed decision brief, evidence state, task context, notes field, and explicit approve/reject controls at both sizes.
- The mobile layout keeps the next-review action full-width and does not hide the decision controls behind a secondary menu.
- No approval decision was recorded during verification.

## Connection workspace loading state — 2026-09-24

- Replaced the plain connection-status loading sentence with a responsive skeleton that matches the connections header, category tabs, and setup cards.
- The loading copy identifies the records being checked for Models, Runtime, Compute, or Tools without claiming a connection exists.
- Reduced-motion support removes shimmer animation.
- Built and verified the populated Models view against the local fixture; the route remains honestly marked **Not configured**.

## Inbox queue loading and category counts — 2026-09-24

- Replaced the generic inbox wait state with a decision-first skeleton that preserves the header, recommended action, filters, and record shape.
- Added source-backed counts to All items, Decisions, and Issues & updates filters.
- Verified local populated Inbox at desktop and 390px. Verified the zero-result **Issues & updates** filter states that no matching records need attention.
- No approval, task, or external connection was changed during the checks.

## Mobile primary navigation — 2026-09-24

- Added a phone-only bottom navigation with Home, Team, Work, Inbox, and More. It stays visible above the safe area and shows the source-backed Inbox count.
- The current destination is marked for assistive technology and visually selected; the full navigation remains available through More.
- Fixed the More-button event path so it opens and closes the mobile navigation rather than immediately dismissing it.
- Verified Team navigation, More open, and More close at 390px using local fixture records.

## Task Review — 2026-09-24

- Added a clear, plain-language task outcome ahead of the internal stage label, so a reviewer sees the current situation before implementation metadata.
- Kept the underlying stage, priority, assignment, execution state, and evidence rail visible and source-backed.
- Added a phone-specific task-review presentation: a full-height sheet, persistent close header, horizontally reachable section tabs, and controls that remain usable without implying execution is connected.
- Verified with the local in-memory fixture: task board opens a task review; the outcome reads “Saved work awaits its next authorized step”; execution remains visibly disabled while offline; the execution/verification/human-review rail stays present.
- Verified at 390×844: viewport width 390px, task review width 390px, minimum height 844px, and section tabs use horizontal overflow rather than clipping.
- `pnpm check`: passed (37 files, 308 passed, 2 skipped). `pnpm build`: passed. `node scripts/workspace-ui-acceptance.mjs`: passed.

## Task Review Decisions — 2026-09-24

- Replaced technical-first labels with review-language tabs: Summary, Changed files, Checks & evidence, Decisions, Activity, Boundaries, and Execution plan.
- Added a Decisions view sourced from `/api/approvals` and filtered by the current task. It shows the saved status, request, timestamps, description, and any recorded decision notes.
- The view is explicit that these are human decision records and do not imply execution occurred.
- Verified against the local fixture: the fixture task exposes its pending approval in the Decisions view while execution remains offline and disabled.
- `pnpm check`: passed (37 files, 308 passed, 2 skipped). `pnpm build`: passed. `node scripts/workspace-ui-acceptance.mjs`: passed.

## Team and Review Loading States — 2026-09-24

- Added layout-matched loading states for Team Directory and Review Desk instead of blank content or generic text.
- Added source-specific retry states when teammate, task, process, binding, or approval records cannot be retrieved.
- Verified the populated Team Directory shows source-backed roles, saved statuses, assigned work counts, and the profile action.
- Verified the Review Desk keeps its decision brief, linked task evidence, editable decision notes, and explicit approve/reject controls.
- `pnpm check`: passed (37 files, 308 passed, 2 skipped). `pnpm build`: passed. `node scripts/workspace-ui-acceptance.mjs`: passed.

## Project Workspace Loading — 2026-09-24

- Replaced the generic project loading text with a screen-shaped project workspace skeleton: hero, controls, and project cards.
- The loading state retains the product’s project language and visual hierarchy without inventing project activity.
- Verified the saved project workspace exposes its resource cards, deliberate project tabs, and honest disconnected file/activity states in the local fixture.
- `pnpm check`: passed (37 files, 308 passed, 2 skipped). `pnpm build`: passed. `node scripts/workspace-ui-acceptance.mjs`: passed.

## Conversation Loading States — 2026-09-24

- Added an intentional split-pane loading state for the Conversation workspace and a transcript-shaped loading state when opening a saved conversation.
- Preserved the existing draft-safe refresh failure behavior: an existing composer remains visible and an inline retry notice appears instead of replacing the workspace.
- Verified the local fixture conversation workspace renders the empty state, project filter, search, archive filter, creation action, and three starter paths without claiming a model is connected.
- `pnpm check`: passed (37 files, 308 passed, 2 skipped). `pnpm build`: passed. `node scripts/workspace-ui-acceptance.mjs`: passed. `node scripts/chat-stream-acceptance.mjs`: passed.

## Project files and specifications loading states — 2026-09-24

- Project files now retain the project workspace shape while a local folder or source preview loads, and show a retryable in-context failure rather than raw transport text.
- The Specifications reader now uses a document-shaped loading state and a retryable reader error.
- Browser-tested against the local in-memory fixture: Specifications opened and rendered its 58-document catalog and selected source with no browser-console errors. Task Review Activity rendered its saved event timeline with execution correctly shown as offline.
- Validation: `pnpm check`, `pnpm build`, and `node scripts/workspace-ui-acceptance.mjs` passed.

## Conversation retry state — 2026-09-24

- A conversation that cannot load now stays in the Messages workspace with a clear explanation and `Try again`, rather than exposing raw transport text.
- This applies both when its saved thread record is missing from the local list and when loading its message history fails.
- Validation: `pnpm check`, `pnpm build`, `node scripts/chat-stream-acceptance.mjs`, and `node scripts/workspace-ui-acceptance.mjs` passed.

## Migration workspace loading and recovery — 2026-09-24

- Migration Lab now opens with a source-and-detail skeleton while fixture adapters load.
- Inspect, Plan, Simulate, and fixture import use an in-context result skeleton, with a retryable error card if a local fixture read fails.
- Browser-tested against the local in-memory fixture: all five adapters appeared; OpenClaw Legacy Inspect showed its discovered records and reconnect requirements; no browser-console errors.
- Validation: `pnpm check`, `pnpm build`, and `node scripts/workspace-ui-acceptance.mjs` passed.

## Activity and playbooks loading states — 2026-09-24

- Activity and Playbooks now open with workspace-shaped loading states and recover through a clear local retry state if their source cannot be read.
- Browser-tested in the local fixture: Activity rendered six saved audit events with filtering controls; Playbooks correctly rendered an honest empty state; no browser-console errors.
- Validation: `pnpm check`, `pnpm build`, and `node scripts/workspace-ui-acceptance.mjs` passed.

## Live command-room visual pass — 2026-09-24

- Reworked the Command Room hero into an operational field with a layered grid, orbital graphic, visual status signals, and stronger hierarchy.
- Added differentiated attention and momentum treatments while preserving source-backed counts and offline execution truth.
- Restarted the local Chrome-facing server on port 3460 from the staging build and visually verified the rendered command room.
- Validation: `pnpm check` and `pnpm build` passed.

## Quality workspace loading and recovery — 2026-09-24

- Benchmarks now opens with evidence-shaped loading states for quality trend, baselines, comparisons, and the comparison form.
- A source failure becomes a clear retry state and never implies a measurement was recorded.
- Validation: `pnpm check`, `pnpm build`, and `node scripts/workspace-ui-acceptance.mjs` passed. The local Chrome-facing server was restarted from the staging build on port 3460.

## Production isolation verification — 2026-09-24

- AgentForge runs independently at its configured local port (currently 3460 during development).
- A separate legacy local service owns another product manifest and port 3000 endpoints. It is outside AgentForge and was not modified.
- The AgentForge runtime, migration fixture, and visual prototypes were scanned for unrelated product names, external-provider identifiers, and legacy endpoint identifiers. Product-visible fixture and demo references were replaced with generic operations examples.
- The generic migration fixture remains intentionally synthetic: it contains no production credentials, customer data, real provider routes, or active connections.

## Projects surface refinement — 2026-09-24

- The project catalog cards now make state visible before opening a project: active/ready/archive state, saved context, linked-file status, conversation counts, and a purposeful empty-conversation prompt.
- Cards gained subtle depth and responsive motion without presenting fabricated project activity.
- Validation: `pnpm check` and `node scripts/workspace-ui-acceptance.mjs` passed.

## Team directory refinement — 2026-09-24

- Team cards now expose saved status, preferred model/harness, assigned work, and permission count before opening a profile.
- The data remains descriptive: these fields state recorded preferences and boundaries, never a claim that a model or executor is live.
- Validation: `pnpm check` and `node scripts/workspace-ui-acceptance.mjs` passed; the live 3460 preview was visually verified.

## Fixture-state honesty correction — 2026-09-24

- Removed the remaining seeded `working` agent status from the legacy fixture and local preview workspace. Fixture profiles now appear idle unless real saved state later changes them.
- Preserved dated backups of the prior local test workspace before the correction.
- Verified the live AgentForge `/api/agents` response and the rendered Team Directory: both fixture profiles are now source-backed as `idle`.
- Validation: `pnpm check` and `node scripts/workspace-ui-acceptance.mjs` passed.

## Production-isolation cleanup — 2026-09-24

- Removed legacy, unreferenced replay scripts and obsolete visual prototypes that embedded a real-estate workflow, personal names, a personal email address, provider names, stage identifiers, and a path to an external production repository.
- Replaced the remaining context-stress replay fixture with a fictional, provider-neutral request-review example.
- Replaced the owner-specific fixture user ID throughout the active source and tests with the generic `user-owner` identifier.
- The independently running legacy local service remains outside this repository on port 3000 and was not changed.

## Command Room decision-first refinement — 2026-09-24

- Replaced the decorative orbit in the Command Room summary with a compact, source-backed state rail for saved open work, execution readiness, and pending review.
- Grouped recurring equivalent audit records into one recent-event entry with a count, while keeping the full audit ledger available one click deeper.
- Browser-verified the rendered Command Room on the local 3460 preview: the top view now leads with the decision queue, continued work, team, and an honest fixture disclosure.
- Validation: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed.

## Team profile conversation entry — 2026-09-24

- Browser-verified the Team Room profile surface on the live local 3460 preview. Each saved teammate profile clearly shows role, saved status, memory source, model/harness preferences, tools, permissions, and assigned work.
- The visible **Start conversation** action creates a durable local conversation only after the operator selects it; it chooses that teammate's assigned active channel when available, otherwise another active workspace channel. It never starts a model run or represents a saved profile as a live agent.
- The Task Review modal was also browser-verified: the saved stage, owner, verification record, approval requirement, and disconnected-execution state are shown in plain language before any review action.

## Public documentation boundary — 2026-09-24

- Removed the generated generated private-reference export from the repository. That flat copy mixed public product material with private workspace notes and unrelated project references.
- The in-product Documentation Explorer now reads only this repository's `docs/` tree, recursively and with duplicate filename protection. It cannot fall back to an external workspace bundle.
- Reworked `docs:collect` into a read-only public-document inventory rather than a cross-workspace copy operation.
- Verified with the full typecheck, 37 test suites (308 passing, 2 skipped), build, documentation-route tests, and the workspace acceptance check.

## Documentation Explorer isolation — 2026-09-24

- Browser-verified the live 3460 Documentation Explorer after the public-documentation migration: it lists 25 repository-owned documents, renders the selected document, and exposes no private workspace bundle entries.
- The catalog is now sourced only from the local `docs/` tree; private operating notes and unrelated project materials cannot appear through this surface.

## Quality evidence boundary — 2026-09-24

- The Benchmarks view queries `/api/drift/status` in addition to baselines and comparison reports.
- The view labels evidence as **saved locally** only when the workspace uses `local_json`; an in-memory session is explicitly marked temporary.
- Quality baselines and comparison reports are persisted in the local workspace snapshot (schema v6) and restored when the workspace restarts.
- Verification: `pnpm typecheck:all`, `pnpm vitest run src/core/drift/driftMonitor.test.ts src/server/docsRoutes.test.ts`, and `pnpm build` passed. The restart test proves a baseline and regression report round-trip through the persisted workspace file.

## Command Room information order — 2026-09-24

- The first operational content below the Command Room header is now **Needs your attention** and **Continue working**.
- Supporting counts follow those actionable sections instead of leading the page as dashboard KPIs.
- Verification: `pnpm typecheck:all`, `node scripts/workspace-ui-acceptance.mjs`, and `pnpm build` passed.

### Project workspace hierarchy — 2026-09-24

The Project Pulse now appears directly under the project navigation and before the overview content. It uses canonical task and approval records to promote the next decision or a clear project state; it never displays a synthetic health score. The existing resource cards and project tabs remain the quick path to saved conversations, instructions, files, and recorded activity.

## First-run surfaces and visual system — 2026-09-27

- A disposable built AgentForge server was opened in a real browser with an
  empty durable workspace. The first-run screen presented the three actual
  workspace surfaces: Command Room, shared Workspace, and Agent Studio.
- Selecting **Run an autonomous team** rendered the Command Room with the
  guided-setup path and four source-backed execution safeguards. It did not
  show fabricated tasks, connected providers, or a ready executor.
- Selecting **Build and test agents** rendered Agent Studio with its honest
  empty teammate, work, process, and execution-readiness states.
- The public product page was independently inspected after its rebuild. It
  uses the same graphite, lavender, and mint visual language as the workspace,
  presents AgentForge, Workflow Engine, and JEv as separate cooperating
  systems, and labels every illustrated workspace as non-live sample data.
- The disposable runtime and browser tab were stopped after inspection.
- Verification: `node website/verify-static.mjs`, `pnpm typecheck:all`, and
  `pnpm test:repository-privacy` passed.

## First-run teammate creation correction — 2026-09-27

- A real browser pass against an empty durable workspace found that the first
  teammate form always submitted the sample-only `chan-general` channel ID.
  Fresh workspaces have no channel yet, so the API correctly rejected the
  profile as invalid.
- The form now leaves channel assignment empty until an operator creates or
  selects an actual channel. The server likewise records no assigned channels
  when none are supplied; it does not invent a default channel reference.
- The browser acceptance run created **QA Evidence Reviewer** from Command
  Room and verified the saved profile in Team Directory: role, description,
  one saved permission, zero assigned tasks, and an explicitly idle status.
  No provider, executor, or external channel was connected.
- Regression coverage verifies that the complete first-run agent payload is
  accepted and returns an empty channel-assignment list.
- Verification: `pnpm vitest run src/server/webServer.workspaceRoutes.test.ts
  --maxWorkers=1`, `pnpm typecheck:all`, and `pnpm build` passed.
