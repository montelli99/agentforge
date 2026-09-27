Latest Team Room usability and desktop visual fix: roster mode had a 520px minimum height, leaving most of the teammate panel blank for small teams, and its record-search help incorrectly referred to the hidden map. Removed that dead space, enlarged desktop teammate cards and status text, and clarified the search copy. The saved-work graph retains its 12/17/23-second orbit motion, review pulse, selection interaction, and reduced-motion support. Verified on :3465 at 1440×900: roster fits its two profiles with mode-appropriate copy; Room shows 14/11/10px labels, active review pulse/orbits, and selection details. `pnpm build`, workspace UI acceptance, and focused whitespace checks pass. Production :3460 untouched.
Latest Messages responsive empty-state fix: at 653×550, the conversation browser used most of the available height, hiding the empty-state illustration, introduction, and all starter actions. Capped the browser panel to roughly one-third of the short viewport, allowed the empty-state panel to scroll, and restored the illustration, concise copy, and three starter actions. Verified on the refreshed :3465 preview: art, title, intro, Start a conversation, and all three starters are visible together; conversation filters remain scrollable. `pnpm build`, workspace UI acceptance, chat-stream acceptance, and focused whitespace checks pass. Production :3460 untouched.
Latest Harness readability pass: removed repeated “backend disconnected” text from each safeguard card and the closing paragraph. The hero states the root blocker once; individual steps now scan as “Blocked,” with one concise line explaining that checking status does not alter setup. Updated the workspace UI acceptance checks. Production :3460 untouched.
Latest Project detail short-phone fix: the project hero illustration inherited a 160px desktop width while its short-phone grid reserved only 68px, clipping the art and crowding the header. Added a scoped short-phone override that reserves a 108px art column and constrains the art to 108×60px, hides nonessential hero copy, and tightens spacing. Build, workspace UI acceptance, chat-stream acceptance, and focused whitespace check pass. Refresh the isolated :3465 preview to inspect; production :3460 untouched.
## CURRENT EXECUTION HANDOFF — authoritative 2026-09-25
Latest Team Room responsive graphic correction: the short mobile layout showed Workspace plus both agents in a compressed horizontal row, making cards/details cramped and hiding the topology. Reflowed short displays into a compact hub-and-spoke: Workspace centered above both teammate nodes, with legible node widths and less wasted canvas height. The orbital scene remains ambient; assignment links and execution signals keep their existing saved-state/process-backed rules. Verified in the isolated :3465 preview at 653×550: Workspace sits above both teammate cards and all three fit above the fixed navigation. pnpm build, node scripts/workspace-ui-acceptance.mjs, and node scripts/chat-stream-acceptance.mjs pass; focused whitespace check passes. Production :3460 untouched.

Latest conversation-to-project navigation fix: the project name in a saved conversation header is now a real, accessible button. Clicking it opens that exact project overview, and Open chats returns to its conversation list with the project filter selected. Browser acceptance caught a regression where a later textContent assignment erased the new button; removed that overwrite and added an assertion to prevent it returning. Verified the click-through in the refreshed isolated :3465 preview. pnpm build, node scripts/workspace-ui-acceptance.mjs, and node scripts/chat-stream-acceptance.mjs pass. git diff --check reports unrelated pre-existing whitespace issues in the broad dirty worktree; no unrelated files were changed for cleanup. Production :3460 remains untouched.
Latest Messages phone-layout correction: when a conversation was selected at 653×550, the conversation browser remained stacked above the thread and squeezed the composer beneath the fixed bottom navigation. Selected-thread mode now hides the browser on phone widths and gives the thread the full workspace canvas; the short-height textarea override is limited to desktop widths so it no longer expands the mobile composer. Verified the refreshed synthetic :3465 preview: selected thread occupies the workspace, transcript scrolls, and editor, Attach, response mode, shortcut, and Send are all visible above navigation. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass. Preview process is the isolated `scripts/command-room-preview.mjs`; production :3460 and live services are untouched.

Latest Work Board short-phone pass: at 653×550 the page header, saved-state rail, filters, and count pushed the only attention task almost entirely below the fold. On short phone viewports, the task itself now leads: the lane retains its real state, empty progress stages collapse to the existing reveal action, compact filters stay available, and the task's owner, next checkpoint, evidence status, and decision action fit above navigation. Verified the synthetic :3465 preview screenshot and accessibility tree at 653×550; full-size and first-run styles are unchanged. `pnpm build`, focused workspace UI acceptance, and `git diff --check` pass. Production :3460 and live services are untouched.

Latest Projects short-phone pass: the welcome panel and spacious project cards hid project identity and entry actions below the 653×550 bottom bar. The directory now compacts its hero and controls only at short phone dimensions, while preserving each card’s saved state, task/conversation counts, work/context/files signals, settings, recent conversation link, and Open project action. Verified the :3465 screenshot and accessibility tree: the first full project card and its Open action fit above navigation, and the next project remains visible as a scrollable directory item. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass. Production :3460 and live services are untouched.

Latest shared-shell navigation pass: added a persistent desktop compact rail toggled from the workspace header. In compact mode the full canvas gains 176px at 1280px viewport width; all 22 navigation destinations remain keyboard reachable with accessible names and native tooltips. Expanding restores the saved navigation-group preferences. The mobile bottom bar and labeled More drawer are unchanged. Verified the expanded and compact desktop states, persistence after reload, and the labeled mobile drawer at 390×844 in the synthetic :3465 preview. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass. Returned the viewport to default and left the preview open. This is a focused shared-shell improvement; the full visual objective remains incomplete.

Latest Team Room selection fix: at 653×550, selecting a saved teammate used to focus the new detail card's close button, scrolling the map out of view. The selection now retains focus on the triggering node with `preventScroll`; the detail card appears without changing `#view-content` scrollTop. Verified before/after scrollTop stayed `0`, the teammate card was announced in the accessibility tree, and the map remained fully visible in the screenshot. Computed styles confirm the orbital tracks (26/34/45 seconds) and satellites (3 seconds) animate when reduced motion is off; existing reduced-motion overrides remain in place. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass. Preview uses synthetic records; port 3460 is untouched.

Latest Team Room visual inspection: reviewed rendered desktop (1280×800) and default narrow (653×550) views. The source-backed room uses the animated orbital scene behind the saved Workspace/teammate nodes, with the pending review marker visible and no running-work animation while execution is offline. Roster toggle remains available. Returned the preview to default viewport; screenshot and AX checks confirmed the two synthetic teammate records and their saved states. No Team Room source change was needed during this pass; continue against the visual brief rather than claim the full graphic objective complete.

Latest project detail polish: mobile inspection found that the Project settings action was stretched across the full width below the title and illustration, making a secondary action look like a primary form submit. It now stays compact and right-aligned. Verified at 653×550, normal desktop 1280×800, and 390×844; the title wraps, action remains visible, and there is no horizontal overflow. Returned the preview to its default viewport. Build and focused workspace acceptance pass; project/chat data are synthetic fixtures.

Latest compact Team Room pass: browser inspection at 653×550 showed only the Workspace hub above the fixed mobile bar; both teammate cards were clipped below the fold. For short, wide canvases with up to two teammates, switched to a compact three-card relationship row so the workspace and both teammate states are visible together. Kept the full hub-and-spoke layout for larger windows or larger teams. Focus and hover now lift a teammate card and animate only its selected saved-work connection; the motion does not imply execution, and reduced-motion disables it. Verified all three cards in the :3465 synthetic preview, selected Fixture planner to confirm its saved status and assignment detail, and kept the test fixture/offline labels visible. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass. Production :3460 untouched.

Latest Team Room check found a short-window layout bug that the earlier screenshot missed: the actual map canvas was 766px wide inside the 1005px app, so the old 520px breakpoint selected the cramped desktop layout and a removed `short` variable stopped node placement. Moved the compact hub-and-spoke layout breakpoint to 820px, kept the map at least 430px tall, removed the dead short-screen branch, and restored subtle station motion on short screens. Updated the focused acceptance checks to guard against the regression. Verified the refreshed `:3465` browser at 1005×550: hub above both teammates, no overlap, all nodes within the 766×430 map, and orbital, ambient, and station animations active. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass. The preview is explicitly synthetic; production `:3460` was untouched.

September 25 Team Room visual correction: the orbital “reactor” treatment was too decorative and implied activity the fixture could not prove. Replaced it with a legible assignment map, then added a subtle animated ambient field with explicit labeling, an amber pulse for a saved waiting-review record, and a selected-teammate detail card with profile, conversation, and assigned-work actions. Counts now exclude closed tasks. A relationship appears only when an agent owns open work; moving work signals remain reserved for process-backed runs; reduced-motion disables animation. Updated acceptance checks for assignment truth, open-task counts, selection behavior, and motion rules. Verified the refreshed 3465 preview at 1005×550: only the assigned planner connects, its selected detail card is visible, the unassigned reviewer remains separate, and execution stays offline. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass. Production 3460 untouched; broad harness UI objective remains in progress.

September 25 Team Room animation pass: corrected the topology SVG's aspect-ratio distortion on short desktop canvases, which had made the orbital field look like stretched lines. Added a layered reactor with independently rotating orbital rings, a sweeping light beam, animated per-agent perimeter traces, richer ambient data currents, and stronger color response. Removed relationship connectors for agents with no saved tasks; saved-work connectors stay still until a task has a real process-backed run, when the faster active signal appears. Offline ambience remains explicitly labeled, and reduced-motion stops all added motion. Verified with the isolated 3465 browser preview, `pnpm build`, and workspace UI acceptance; production 3460 untouched.

September 25 Command Room pass: the short-height layout had only been compacting for narrow browser widths, leaving a 1005×550 desktop preview with an oversized hero and hiding the saved-assignment area below the fold. Added short-viewport sizing independent of browser width, bringing the fixture notice, priority decision, and first teammate card into the initial screen while preserving the explanatory copy and saved-state labels. Added a small animated orbital workspace mark beside the real status counts; it is decorative and does not imply execution. Reduced-motion disables its animation. Verified the 1005×550 preview and rendered positions: header bottom 215px, fixture notice 251px, attention panel 386px, assignments start 394px. Build and focused UI acceptance pass.

September 25 Projects illustration pass: the isometric project-space graphic now has a slowly tracing connection, soft surface shimmer, and a breathing anchor point. Animation is scoped to the decorative project-list illustration, honors reduced-motion, and makes no claim about task state. Verified the rendered animation names and screenshot on the 3465 preview. Build and focused UI acceptance pass.

September 25 Teammates directory pass: shortened its hero for short windows so the saved agent cards begin 68px earlier at 1005×550 (329px from viewport top), exposing avatar, assignment status, name, role, and description without scrolling. The relationship diagram now has a slow connector glint and three softly pulsing nodes; it is decorative, and reduced-motion turns it off. Verified the 3465 preview screenshot, computed geometry, and animation rules. Build and focused UI acceptance pass.

September 25 Team Room correction after live visual review: the orbit map’s narrow-canvas layout had placed the workspace hub partly above its canvas and cut the teammate cards off below the first screen. Repositioned the hub and agents to keep all three records and the ambient-motion legend visible together at 1005×550; increased orbital contrast and particle visibility while preserving reduced-motion support and reserving active path/packet motion for real process-backed work. The fixture remains visibly labeled and no active work is fabricated. Verified the refreshed 3465 browser preview screenshot and accessibility tree. Focused acceptance and production TypeScript build pass; 3460 and live services untouched. Overall AgentForge UI goal remains open.

September 25 Messages visual correction: tuned the empty-state starter cards to the actual split-pane width, preventing one-word-per-line titles in the desktop split view. Corrected the composer for short desktop windows: the 1005×550 app viewport is wide, but its conversation panel is only 492px, so old viewport-width mobile rules failed to keep send/attach/model controls on screen. New short-height styles fit toolbar, context, scrolling message feed, and complete composer within the 439px conversation canvas. Verified empty and populated states at 1005×550 in the refreshed 3465 browser preview; populated state shows title, project context, scrollable messages, route selector, editor, Attach, shortcut toggle, and Send fully visible. Focused UI acceptance and TypeScript build pass. Overall harness UI work remains open.

Token-saving guidance: keep each work pass scoped to the exact source files and latest handoff entry; do not reread the full history or rerun broad suites after an unchanged focused pass. Use Luna for narrow implementation/maintenance, Sol for coordinated coding, and reserve Astra for high-judgment design reviews. This only changes Codex usage if the user selects the model in the Codex client; JEv is not a Codex-thread attachment and only reduces AgentForge runtime costs when configured in that product.

September 25 Team Room visual pass: replaced the plain dotted map backdrop with a layered lavender/green orbital field and slow animated particles. The motion is explicitly labeled ambient; agent-to-work paths animate as active only when a task is in `in_progress` or `verification_running` and has a process ID. Added glass-like node cards, execution-state accents, reduced-motion handling, and a short-screen horizontal layout. Verified at 653×550 in the isolated in-memory browser preview on port 3465: all three nodes fit above the fixed nav (bottom 457px, nav begins 484px), 205px graph height, ambient animation present, and no fixture node falsely claims an active run. Build and focused UI acceptance passed. Port 3460 untouched. Continue broad screen polish and remaining state matrix; the complete harness UI goal is still open.

September 25 Team Room graphics refinement: replaced plain node labels with state-bearing agent/work cards, task counts, clear review/standby/active states, stronger layered purple/green lighting, rotating orbital geometry, and a sweeping ambient beam. Real active runs now emit a moving SVG signal packet along the agent/work connection only when a process-backed task is actually running; the synthetic review fixture correctly displays no active packet. Tightened short-height layout across both compact and desktop-width viewports so the Team Room relationship cards appear in the first screen. Verified the 3465 in-memory preview at 1005×550 with screenshot and accessibility tree; all three relationship cards, counts, and truthful statuses are visible. Reduced-motion overrides cover every new animation. `pnpm build` and focused workspace UI acceptance passed. Port 3460 and live services untouched.

September 25 Work Board visual refinement: converted the saved task-state summary from a tight wrapping strip into a connected four-step rail. Each stage now has a centered marker, readable one-line label, count, and a restrained halo only when saved tasks exist there; Needs attention uses its own amber cue. It does not animate task progress or imply live execution. Verified the rendered 1005×550 3465 fixture screenshot and accessibility tree; “Needs attention” stays on one line and the populated stage is immediately identifiable. `pnpm build` and focused workspace UI acceptance passed. The full UI objective remains active; continue the remaining surfaces and viewport matrix.

## CURRENT EXECUTION HANDOFF — archived checkpoints

September 25 short-screen browser pass: Command Room now keeps its workspace status beside the heading and compacts the synthetic-data disclosure, bringing the first review item into view at 653×550. Messages with saved conversations but no current selection now share the mobile canvas between the usable conversation list and a compact “Start a conversation” panel; search, the saved thread row, and the start action remain visible at 653×550. The Work Board also keeps its real next-task action and offline state above the fold. Verified through the isolated in-memory preview on port 3465 with screenshots and accessibility state. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. Port 3460 was not touched. The preview process is still running for inspection.

September 25 shared navigation polish: active routes now have a narrow lavender edge and restrained gradient, with explicit keyboard focus treatment and short transitions; this improves route orientation consistently across the shared workspace shell. Added CSS contract assertions in `workspace-ui-acceptance.mjs`. `pnpm build` and focused UI acceptance passed; browser AX still loads the Harness accurately. Pixel verification was unavailable because the in-app browser screenshot/click capture timed out; leave visual QA open and port 3460 untouched.

September 25 Harness visual pass: kept the custom safeguard-path graphic visible at 521–700px with a compact horizontal treatment; the previous breakpoint hid the graphic on all small screens. On phones below 521px, it stays hidden to protect reading space. Added responsive regression assertions. Rebuilt, restarted only the isolated 3465 fixture, and confirmed its rendered Harness state remains accurate; `pnpm build` and focused UI acceptance passed. No live providers or 3460 app were touched.

September 25 workflow audit: in the rebuilt 3465 fixture, browser accessibility state confirms the Messages path exposes project/channel context, reply/copy/edit/branch actions, find/details, response-route selection, attachments, and keyboard-send preference. Work board exposes saved status counts, focus task, agent/project filters, search, sort, list view, and the labeled empty stages. Synthetic fixture content is visibly labeled and execution remains offline. The browser screenshot endpoint failed on this pass, so pixel-level tablet review remains open; do not claim the graphic's fit as visually verified.

September 25 preview correction: the isolated 3465 browser was serving an older `dist` build, so its Harness page still showed the obsolete “Choose model” action. Rebuilt from current source, restarted only the owned 3465 fixture, and verified the live accessibility tree now shows “Execution backend not connected,” separates task execution from conversation model settings, and offers “Check available execution environments.” `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. Port 3460 and real services remain untouched.

September 25 project workspace refinement: project resource shortcut cards now appear only on Overview; Threads, Work & review, Files, and Activity hide those redundant cards so their actual content moves up directly below the tabs. The tab strip now precedes resource cards, keeping navigation stable while reducing wasted vertical space on Overview. Verified on the isolated 3465 preview with the Work & review tab selected: resource cards were absent from the rendered screen, and the work panel moved into the first viewport beneath the project header and tabs. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The `3460` user app was untouched; the preview remains in-memory fixture data.

September 25 harness truthfulness pass: corrected the first safeguard, which previously sent users to chat-model settings even though those settings do not configure task execution. The harness now names the actual blocker (“Execution backend not connected”), explains the difference between conversation models and task execution, marks unavailable gates explicitly, and sends “Check environments” to the live isolated-environment status screen. Added a clear note that status pages report availability but do not connect providers. Verified on the isolated 3465 preview at 652×550; the status, explanation, and primary action fit above the mobile tab bar, and the button opens Compute & environments with accurate local, Docker, and cloud-sandbox states. `pnpm build` and focused workspace UI acceptance passed. No provider was connected and port 3460 was untouched.

The owner's full AgentForge harness and UI objective remains active and incomplete. Work in `C:/Users/mscott/AI_Workspace/AgentForge-Staging`, preserve its dirty worktree, keep live integrations disconnected, and do not switch models or deployments based on stale notes below.

Latest verified work: the Work Board adapts empty and populated queues to short mobile screens, putting the actual next task before filters and naming the offline execution blocker. A single populated lane uses the full canvas. The conversation’s first-message state gives a visual sequence for outcome, context, and evidence. New conversations require a project, filter channels to that project, and let the user create a private General channel in-place when the selected project has none. In the conversation composer, Send stays disabled until there is text or an attachment; a blank helper no longer repeats the route state already shown in the header. New projects require only a name; optional instructions and repository context are tucked away, and creation opens the project workspace. Team Room execution status spans the content width with readable sans-serif copy. Command Room uses three labeled, saved-data status facts (“Reviews,” “Open work,” “Execution: Offline/Ready”) and removes the repeated summary strip. Build, UI acceptance, project-files acceptance, and browser workflow checks passed.

Latest shared styling pass: legacy chat, control, modal, navigation-card, and scroll treatments now follow the charcoal/lavender palette; focus states are visible and reduced-motion preferences are respected. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The isolated preview at 3463 was visually checked on the AgentForge Harness readiness screen; its 0/4 offline status remained clearly presented, with no production connection implied.

September 25 follow-up: replaced remaining hardcoded cyan accents throughout the existing workspace shell and inline chat/task markup with the lavender palette. Build and workspace UI acceptance passed. A fresh isolated preview on 3464 was browser-checked through first-use mode selection, new conversation setup (including adding a General channel for the test project), project-scoped conversation creation, and a local-only message. The rendered chat exposes Reply, Copy, Edit, Branch, Find, Details, Focus chat, project context, attachment, and response-route controls. The test message was saved only to the in-memory fixture; no model response or external send occurred.

Owned preview: `http://127.0.0.1:3463/` is an in-memory visual fixture only. Confirm the listener is the expected fixture before using it. Keep the user's port 3460 untouched.

September 25 harness and conversation visual pass: replaced the generic harness header ornament in the staging UI with a custom four-stage graphic (Plan → Isolate → Verify → Keep proof). Its completed/current nodes use the same live capability flags as the readiness ring; accessible text reports the stage names and ready count, and reduced-motion preferences disable the pulse. Verified the rendered graphic and real 0/4 disconnected state in the isolated 3465 browser fixture at desktop width, then checked the Harness and Messages screens at 390×844. Mobile checks confirmed readable two-column safeguard cards, persistent bottom navigation, visible conversation starters and Start action, and the project/channel-gated new-conversation dialog. Chose an existing fixture project but canceled before creating a channel or conversation. Added a clearly labeled synthetic populated conversation to the disposable visual fixture so the saved-message layout could be reviewed: saved agent authors now resolve to their profile name rather than generic “Agent”, and user/agent messages have distinct but restrained visual hierarchy. Desktop and mobile accessibility trees confirmed profile attribution, edit/reply/branch controls, code formatting, local-only route status, and the composer. No message was sent or model response generated. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The existing 3460 app is a separate running UI instance and was not changed; do not report these staging-only changes as live there.

September 25 navigation polish: every main-view change and project screen/tab transition now resets the main canvas to the top so the destination heading is visible. Added acceptance guards for both the global view switch and project overview/tab navigation. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed; on the isolated 3465 preview, opened a saved project and confirmed its header/resources were visible, then switched to Work & review and confirmed the destination returned to the project header. The 3460 user app remains untouched.

September 25 harness visual accuracy: replaced static checkmarks in the readiness illustration with state-driven glyphs—green checks only for configured safeguards, a distinct icon for the next setup, and muted pending marks for later steps. The 0/4 isolated harness preview now shows Plan as the active step instead of implying it is complete. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed; the updated 3465 preview was reloaded and visually checked. No connected runtime state was changed; 3460 remains untouched.

September 25 conversation polish: desktop message actions now reveal on hover or keyboard focus, reducing persistent clutter while preserving keyboard access; touch layouts keep their actions visible. Added UI acceptance assertions for both interaction states. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. In the isolated 3465 preview, the populated conversation was checked with actions hidden at rest, then visible and focused by keyboard; 3460 remains untouched.

September 25 harness setup guidance: completed the unused third column in the readiness panel with a live four-safeguard checklist and added a primary button that opens the next setup screen. The summary now explains 0/4 status and exposes the next action without requiring a scroll; detailed cards remain below. Added acceptance assertions. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The 3465 preview confirmed each state label, the setup button’s route to Models, and the responsive checklist/action at 390×844. The temporary viewport override was reset; no live configuration changed and 3460 remains untouched.

Next: continue the full visual and workflow audit from `docs/VISUAL_PRODUCT_BUILD_BRIEF.md` and `docs/VISUAL_ACCEPTANCE_MATRIX.md`; continue the remaining route/state matrix. The Work Board populated/short-screen pass is recorded below. Do not call the project complete until the full objective is verified.

**History note:** all handoff headings, process IDs, “switch to Terra” instructions, and checkpoints below this block are retained as historical notes. This current block supersedes them. Read the exact relevant section and latest entries only; do not load the entire long plan or conversation into the next model.

For lower token use, continue from this compact handoff and the exact relevant source files; do not paste the historical task transcript. Keep progress messages and checks batched. Codex model selection is controlled in the client: Luna suits small scoped edits, Sol is the balanced default for coordinated code changes, and Astra is best reserved for high-judgment visual/product review. JEv can reduce usage inside AgentForge only after its own model route is configured; it does not become the model for this Codex thread.

---

## OWNER HANDOFF — SWITCH TO TERRA NOW (2026-09-24)

Owner explicitly corrected scope: Astra should do visual design and hard planning, then hand off implementation to a less expensive model. Do not continue an open-ended Astra implementation loop. No new feature work was requested for this handoff.

**Truth:** The design foundation and coding plan exist. The complete visual acceptance pass and all product requirements are NOT finished. Ready to switch to Terra for implementation; this is not a claim of project completion or that no future Astra design review is needed.

## Final Astra checkpoint before implementation handoff

**Do not mistake this for a finished product.** Astra completed the visual direction, product sequencing, and the review of the existing implementation. It also began one small task-workflow slice after the handoff was drafted; that slice is intentionally left for Terra to finish and verify rather than expanded further here.

The concrete screen, component, motion, responsiveness, and graphics direction is in [VISUAL_PRODUCT_BUILD_BRIEF.md](VISUAL_PRODUCT_BUILD_BRIEF.md). It is the implementation source of truth for visual work alongside the competitive research in `COMPETITIVE_HARNESS_UX.md`.

Use [VISUAL_ACCEPTANCE_MATRIX.md](VISUAL_ACCEPTANCE_MATRIX.md) to verify each changed primary screen across its populated, empty, loading, error, disconnected, desktop, and narrow-screen states.

For a copy-ready startup instruction that sends Terra directly to the correct files and first vertical slice, use [TERRA_START_PROMPT.md](TERRA_START_PROMPT.md).

### Unfinished slice already present in the worktree

- `src/server/webServer.ts` contains a new guarded `PUT /api/tasks/:taskId/contract` path for revising a saved task's execution boundaries. It is designed to require the current task version, full commit SHA, allowed/protected paths, and bounded verification commands; it strips all execution authority and invalidates a prior approved plan.
- `src/server/ui/workboardClient.ts` contains the matching **Edit boundaries** dialog for task detail. It needs a focused browser/API check and a small route test before it can be described as complete.
- `src/server/ui/workspaceTheme.ts` contains styling for that editor. Keep the current charcoal/lavender product language; do not replace it with a neon/cyber dashboard.

### Verified visual correction after the handoff draft

- The Command Room now puts review/failed-work attention and the active work queue ahead of supporting workspace facts. It uses compact summary chips, a real saved-state Team at work roster, and a compact relationship entry point rather than a large sparse topology canvas.
- This change is in `src/server/ui/workspaceApp.ts` and `src/server/ui/workspaceTheme.ts`. It passed `pnpm build` and was browser-inspected with in-memory fixture data on September 24. The temporary preview was stopped after verification.
- The Work board now presents a source-backed **Recommended next task** before the detailed lanes, preferring attention-required work, then active work, then the priority-sorted queue. Empty lanes collapse visually instead of consuming the same height as active work.
- This change is in `src/server/ui/workboardClient.ts` and `src/server/ui/workspaceTheme.ts`. It passed `pnpm build` and was browser-inspected with in-memory fixture data on September 24. It does not alter task state or execution authority.
- The former decorative, simulated topology canvas is now a record-driven **Team Room**. It shows saved teammate profiles, their saved task counts, actual attention/review state, and source-backed next work. Dragging only arranges the local visual cards; it never implies agents are working. This is in `src/server/ui/workspaceApp.ts`, `roomMapClient.ts`, and `workspaceTheme.ts`; it passed `pnpm build` and an isolated browser check with in-memory fixtures on September 24.
- Project overview now includes a source-backed **Project Pulse**, while the empty conversation surface includes local-only visual starters for planning, review, and research. The execution-runtime screen has a readiness ring and explicit gate list, sourced from live runtime capability flags. These are in `projectClient.ts`, `conversationClient.ts`, `connectionsClient.ts`, and `workspaceTheme.ts`; each passed `pnpm build` and isolated browser interaction checks. Preserve the explicit “not connected” language rather than turning these into fabricated live status.
- Inbox now promotes the highest-priority saved decision or issue into a source-backed **Start here** card, with the same direct review, task-inspection, or activity action available in the corresponding record. It is in `preferencesClient.ts` and `workspaceTheme.ts`; it passed `pnpm build` and an isolated browser check on September 24. The card prioritizes critical, warning, then informational records and never creates, approves, or mutates work.

### Terra's first bounded completion task

1. Inspect those three files and retain the existing contract/approval safety rules.
2. Focused route coverage is now present in `src/server/webServer.workspaceRoutes.test.ts` for valid edit, optimistic-version conflict, invalid boundary payload, permission denial, and approval invalidation. A stale task version now correctly returns `409` rather than being misclassified as malformed input.
3. Run `pnpm build` plus the focused test and `node scripts/workspace-ui-acceptance.mjs`; exercise the editor in an isolated local preview.
4. Correct only issues found, then update this file's evidence section. Do not start a new UI redesign while this workflow is unfinished.

**Evidence:** `pnpm vitest run src/server/webServer.workspaceRoutes.test.ts` passed 4 tests and `pnpm build` passed on September 24. The complete local suite subsequently passed **306 tests across 37 files, with 2 skipped**. An isolated browser check opened the saved task, opened Boundaries, and displayed the populated editor with its approval-invalidation safeguard. Fixture data was corrected to use a full 40-character Git SHA so the editor’s initial values meet its own contract validation. No boundary change was submitted during browser verification.

### First actions for Terra
1. Continue this worktree, branch vnext; preserve all existing changes. Do not restart the project or repeat broad research.
2. Preview is http://127.0.0.1:3473/, current own process session 87103. It is one build behind the final task-draft handler fix. Latest source/dist build passed. Restart only this owned preview when needed. Browser1/tab12 retained. Temporary 3474 fixture stopped.
3. Finish the generic project-to-execution vertical workflow using existing runtime, approved-plan and task contract code. New-task boundary authoring now exists; do not rebuild it. Remaining: edit existing boundaries safely with approval invalidation/conflict checks, resolve actual repo/commit, execution setup, real container run/cancel/recovery/evidence. Live Docker acceptance is still unproven; consult the recorded Docker blocker instead of weakening security.
4. Finish semantic goal planning and worker memory/quality integration from the existing batch plan. Source-line preservation is not semantic decomposition.
5. Complete a compact screen/state/mobile acceptance matrix and public packaging/privacy/license checks. Do not mark the full goal complete based on UI fixtures.

### Preserve the visual direction
Existing charcoal/lavender UI, restrained graphics, readable task board and review cards, interactive team room/topology, project resource cards/state charts, chat focus mode. Extend the same styles. Do not introduce another dashboard or return to neon panels/raw JSON. Graphics/redesign decisions can return to Astra in one bounded review; routine implementation belongs to Terra.

### Latest completed work since older checkpoint
- Comparison saves refresh chart/history/count immediately, human-readable recommendation labels, percentage-point units, aligned receipts, themed meters. Browser checked with explicit fixtures.
- Conversation groups Pinned/Today/Previous 7 days/Earlier; search and focus-layout verified (older-date groups not visually exercised).
- Connection screens now request only relevant sources, with ten-second read timeout. Actual four screens checked; source isolation checked in VM. Timeout not timed through browser.
- Execution-plan cards numbered/copyable; desktop/mobile populated layout verified. Copy showed success but clipboard bridge returned empty, so exact clipboard payload is not independently verified.
- New task optional branch/SHA/path/test/build form saves through existing API. Browser partial validation and saved boundary/command readback verified. All authority flags false, isolation/evidence/human review required. No command approved/executed.
- Final task-draft fix: attach listeners AFTER openModal converts the element into a dialog. Browser reload restored exact title/details and displayed draft-restored notice. Build passed. Other draft fields and successful-save clearing not separately browser-tested. Draft is tab-session storage, not cross-device persistence.

### Evidence and limits
Latest workspace HTTP/restart acceptance passed before final draft patch; final draft patch built and browser reload-tested. Historical full suite 305 passed/2 skipped predates recent UI work; do not claim a current full-suite pass. CODEX_HANDOFF.md contains dated details, and its old opening summary is historical.

No owner production integrations connected. No commits, resets, model switches, or deployment to production performed. Full goal stays active. Next model should work from this checkpoint and the implementation batches below, not append another repetitive audit.

---

# Terra handoff — finish the existing AgentForge product

Updated: 2026-09-24. Owner requested this plan to reduce model spending and switch to Terra.

### Latest implementation checkpoint

Owner resumed implementation after requesting this handoff. Project task creation/listing is connected by canonical project ID. Project Files now supports explicit persisted read-only folder connection, browsing and bounded source previews; see PROJECT_FILES.md. Desktop and narrow-screen browser checks and actual HTTP/filesystem/restart acceptance passed. Task changes/evidence now have readable patches and expandable checks rather than JSON-only output; populated presentation verified with a clearly labeled fixture. These do not establish agent execution or full IDE parity. Own preview session26078 on3473 and browser tab10 supersede older handles below. CODEX_HANDOFF.md has exact evidence.

## Current verified checkpoint — 2026-09-24, 11:44 ET

- The embedded Setup Guide now answers ordinary questions such as “what remains?”, “what is in the plan?”, and “what should I do next?” in plain language. Its source-backed status endpoint drives the Studio setup rail with the current project, conversation, requirement count, gates, and next action. It reports only saved requirements and real execution gates; internal implementation labels are no longer shown in the conversation. Focused API coverage, build, and workspace UI acceptance passed on September 24.
- The Command Room relationship constellation is now an interactive source-backed surface: each saved teammate node opens that teammate’s profile, with keyboard focus and loading/error behavior shared with the Team Room. Build and workspace UI acceptance passed on September 24. A browser visual check is still required before treating its final spacing as complete.

This checkpoint supersedes stale session handles and completed-item notes below. Do not repeat already verified work merely because older sections call it pending.

- Current isolated preview: http://127.0.0.1:3473/, process session24432, browser1/tab12. Verify handle before restart. Production integrations remain disconnected.
- Latest full suite previously passed 305 tests, with2 skipped across37 files. Subsequent UI changes passed build and workspace HTTP/restart acceptance; full suite has not been repeated for those changes.
- Goal planning now preserves every nonempty source line and deterministically enriches UI, regression, and integration language with observable acceptance, verification, risk, and rollback guidance. Requirement traceability now has a guarded API for explicit work/code/test/evidence references and completion fails closed while a requirement is missing any of those references. This is still not a model-generated execution plan or automatic evidence discovery. Focused completion/API tests passed **23 tests** and `pnpm build` passed on September 24 after this change.
- The Goal detail’s Evidence tab now has an accessible **Add references** flow per requirement. It records explicit work, code, test, and evidence identifiers, refreshes coverage immediately, and states that reference entry never verifies completion. Browser-verified in an isolated in-memory workspace on September 24; the local preview was stopped afterward.
- Goal-plan exports now preserve each requirement’s work-item links and blocker explanation alongside its code, check, and evidence references, so a reviewable handoff does not lose the reason a requirement remains incomplete.
- Global search is now a keyboard-operable **Command Center**: it presents high-value workspace actions before saved views and records, labels every result honestly, supports arrow-key selection and Enter, and retains search across projects, chats, tasks, and views. Browser-checked on September 24 through the keyboard path to the Review Desk; the isolated preview was stopped afterward.
- Chat file-bearing move/restart identity and draft media/replies were verified. More toolbar, message editing, branch, scoped search, export, attachment image fit/zoom, table horizontal scrolling, composer keyboard shortcuts and desktop focus mode are implemented. Consult CODEX_HANDOFF.md for exact browser evidence, not old pending bullets.
- Project canonical tasks, read-only repository browsing, task evidence/diffs, state chart and resource cards are implemented. Mobile resource cards checked at390px. File wrapping control and line count added; do not confuse previews with model file access.
- Inbox real service outage/retry verified. Failed task opens its exact review dialog. Approval navigation targets/focuses request. Review queue searches with counts and retains unsent notes during filtering in the current page session (not reload).
- Tools now reflects actual chat/runtime status, with direct setup actions. No production execution is connected in preview.
- Goal source preservation replaces the two-requirement truncation: all nonempty source lines are retained. They now receive deterministic intent-aware acceptance, verification, risk, and rollback guidance for UI, regression, and integration language. This is NOT a model-generated implementation plan or automatic code/evidence linkage; those remain required.
- Graphical team room, topology, goal dependency steps/coverage, project state ring and execution readiness guide exist. Full responsive/accessibility/state matrix remains incomplete.
- Conversation moves now preserve attachments, reply relationships, revision history, and canonical IDs across private local project channels. The new API regression also proves a public destination is refused without mutating the conversation. This is local workspace evidence, not external-channel migration proof.
- First-run outcome setup now creates a private project, General channel, durable Workspace setup conversation, reviewable goal, and embedded Setup Guide without a user manually assembling those records. The guide gives a truthful local response about missing execution gates until an explicitly configured model route is available. Reopening setup reuses the same project, guide, channel, thread, and welcome handoff rather than adding repeated setup noise. Focused setup-guide route coverage, TypeScript checks, and workspace acceptance passed on September 24.
- Goal planning now preserves each source request intact and, for a compound multi-sentence outcome, exposes the individual sentences as linked reviewable deliverables with their own acceptance, test, risk, and rollback guidance. This is deterministic plan decomposition, not a claimed model-generated execution plan. Focused completion-engine coverage and TypeScript checks passed on September 24.
- Project cards now surface canonical task count plus saved attention/active state before opening a project. Project work rows now show the real next checkpoint and recorded evidence/check count alongside owner and state. This is sourced only from canonical task records and evidence packs; build plus workspace acceptance passed on September 24.
- Current full local suite baseline: `pnpm test` passed **314 tests across 39 files, with 2 explicitly skipped** on September 24 after the setup-guide, planning, and project-work updates. This is supporting evidence, not a substitute for the remaining browser matrix or live isolated execution acceptance.
- The built-launcher persistence acceptance now follows the real first-run path through Setup Guide instead of posting into a nonexistent legacy default channel. It verifies the prepared conversation, workspace hierarchy, SOP binding, task audit, memory, and approved process revision survive a stop/restart. Build and launcher persistence acceptance passed on September 24.
- Product isolation, package/CLI, streaming-provider fixture, and explicit project-file connection acceptances all passed on September 24. The streaming check remains a local OpenAI-compatible fixture; browser streaming and a separately configured live provider remain distinct release evidence.
- Agent Studio’s embedded Setup Guide now has a compact source-backed preparation rail for workspace, guide conversation, and requirement plan, followed by only the execution decisions still outstanding. It was browser-inspected on a clean temporary local workspace after Setup Guide preparation on September 24. It showed planning-only/offline state rather than claiming any model or worker was active.

Next substantial work: finish the generic project-to-execution workflow in Batch2/3 and the remaining populated/error/mobile visual acceptance. Avoid another sequence of tiny cosmetic changes and repeated broad tests. Preserve the full public-product objective. Astra graphics ownership is the owner's preference; do not claim Astra work or the product finished without the corresponding evidence.
## Start here; do not start over

Work in `C:/Users/mscott/AI_Workspace/AgentForge-Staging` (branch `vnext`). This is the existing app, not a replacement project. Preserve the large dirty worktree, including work from other agents. Do not reset, stash, switch branches, create worktrees, commit, publish, or connect personal services without the applicable authorization.

The owner wants a polished, graphical, interactive harness with Codex/Antigravity-class chat and project workflows. Every component matters. A prettier offline dashboard is not completion. Build a generic, documented open-source product first; do not use any owner production systems, communication channels, CRM, email, or file storage to prove it works.

License decision is approved: Apache-2.0. Root LICENSE and package metadata already changed. Do not reopen the license discussion; finish notices and packaging verification.

## Cost and execution rules

- Reuse existing code and previous evidence. Do not reread the whole conversation or all54 documents every turn.
- Start with this file; consult the exact source and requirement relevant to the next batch.
- Finish meaningful vertical workflows, not one cosmetic change per turn. Avoid repeated mini-completion reports.
- Do not rerun the whole suite after each CSS change. Build once per coherent batch, run relevant integration checks once, inspect changed screens. Full release suite once at final gate, then repeat only failed/affected checks.
- Do not endlessly append audit reports instead of implementing missing functionality.
- No new paid service accounts or model calls are needed for isolated UI tests. Use the existing local provider fixture for controlled streaming tests. Paid production-provider acceptance is a separate, clearly identified gate.
- Prefer Terra for implementation. If truly stuck, identify one bounded issue and evidence needed instead of requesting a broad expensive re-audit.
- No autonomous subagents unless the owner explicitly authorizes delegation or applicable instructions require it.
- Keep comments/reports factual. Never label simulations, saved records, decision recommendations, or fixture checks as completed live execution.

## Current runtime and files

- Preview URL: `http://127.0.0.1:3473/`.
- Last own server session:59695. Verify its handle/listening process before stopping or restarting. Never kill unrelated node processes or user previews3472/3460/3000.
- Server environment: PORT=3473; AGENTFORGE_DISABLE_SECONDARY=1; AGENTFORGE_DATA_DIR points to staging `.preview-ui`.
- Own hidden in-app browser: tab9, variable `agentforgeTestTab`, browser1. Reacquire by known tab only if stale. Preserve user tabs. Mark own tab for handoff if continuing.
- Current deployed build includes latest compact conversation toolbar and extra project-move validation. These last changes built successfully but have NOT yet been browser-verified.
- UI entry: `src/server/ui/workspaceApp.ts`; shared CSS: `workspaceTheme.ts`. Extracted client modules in the same directory. These are script-string modules injected into the existing HTML, not a separate frontend.
- Backend: `src/server/webServer.ts`, `src/server/conversationRuntime.ts`, `src/core/store/workspaceStore.ts`, `src/core/types/workspace.ts`.
- Existing execution implementation to inspect before adding anything: `src/core/runtime/taskWorkerRuntime.ts`, `contractedDockerExecutionBackend.ts`, compute/provider modules. Execution currently reports OFFLINE. Do not infer those backend files are fully integrated or complete.
- `CODEX_HANDOFF.md` is historical evidence. Newer entries supersede older session IDs/unverified statuses.

Commands from staging:

```powershell
pnpm build
node scripts/workspace-ui-acceptance.mjs
node scripts/chat-stream-acceptance.mjs
pnpm test
pnpm typecheck:all
```

Start own preview only when needed:

```powershell
$env:PORT='3473'
$env:AGENTFORGE_DISABLE_SECONDARY='1'
$env:AGENTFORGE_DATA_DIR='C:/Users/mscott/AI_Workspace/AgentForge-Staging/.preview-ui'
node dist/server/start.js
```

## Requirements sources and precedence

1. Owner's current objective and corrections: existing UI; high-end graphics/interaction; full chat/project workflows; generic open-source production product; no personal production integrations.
2. `docs/COMPETITIVE_HARNESS_UX.md` and `docs/AGENT_QUALITY_FLYWHEEL.md`: already researched direction and quality behavior. Do not repeat market research unless resolving a concrete missing feature. Treat dated research as dated, not automatically current truth.
3. `docs/requirements/IMPLEMENTATION_TRACEABILITY.md`, `MARKDOWN_REVIEW_REGISTER.md`, `COMPLETION_ENGINE_TRACEABILITY.md`, and named source specifications they point to.
4. Public product sources: documents in `docs/requirements/`, `docs/research/`, and the root `docs/` evidence files. Do not import flattened external workspace bundles or confuse numbered sections with a file count.
5. `docs/PRODUCTION_EXECUTION_BOUNDARY.md`, `docs/CHAT_SETUP.md`, `docs/WORKSPACE_UI_VERIFICATION.md`.

Maintain a single requirement-to-evidence table in the existing traceability record. For each applicable source section: requirement, implementation path, actual verification, remaining work. Do not mark a section done solely because it has a markdown file or passing mock test. Do not import unrelated legacy operational instructions into the public product.

## Implemented baseline — preserve and extend

### Chat and projects

- Canonical projects: create/edit/archive/restore, description, instructions, repository reference, overview and conversations. Repository path alone grants no file access.
- Canonical conversations: create/rename/pin/archive/restore, title/message/attachment-name search, project filters, context panel.
- Message editing with revision history and optimistic conflict check; branching retains origin; replies; copy; safe Markdown/code/table display.
- Attachments: PNG/JPEG/WebP/PDF/text, bounded payloads and validation. Text-only model backend explicitly rejects unsupported media context; do not silently omit attachments.
- Text drafts persist in local storage; unsent attachments and reply targets persist in the browser's IndexedDB draft store.
- Reading position retained across chat navigation; Latest messages control; follow-bottom disabled when user reads above.
- Shared pending-send guard across rerenders; selected-chat request sequencing. Delayed-send browser race remains to test.
- Markdown/JSON export dialog with preview/copy/download. JSON download was found and inspected in Downloads despite browser download-event timeout; this is VERIFIED, do not re-open as a blocker.
- Move conversation between local private project channels preserves canonical history and audit event. File-bearing move, attachment identity, reply/revision preservation, and restart identity were verified in a disposable store. Invalid/archived destinations and active-generation rejection still need explicit checks.
- Dedicated chat provider config, streaming/stop, failure handling, partial persistence, active-generation guards. Local HTTP provider fixture accepted; not proof of paid-provider operation, multimodal reasoning, or agent tool execution.

### Workspace surfaces

- Dark charcoal/lavender theme, persistent sidebar, workspace search, responsive messages, appearance preferences, reduced motion.
- Team room with real stored roster/work counts and interactive topology; recent audit ordering fixed.
- Projects, agents/profile, task board/detail, approval desk, action inbox, activity ledger, process history, memory, documentation reader, models/runtime/compute, marketplace, migration, goals/evidence inspector, performance screen redesigned to varying levels of verification.
- Native setup dialogs with focus containment/Escape/focus restoration; teammate save guards and partial-binding error handling.
- SSE now offers refresh rather than destroying drafts. Goal unsaved content protected on refresh.
- Fake optimistic merged/approved claims removed from legacy walkthrough function. Other old dead/legacy paths still need focused inspection.
- Performance screen shows measured baselines and decisions; removed fabricated per-test outcomes inferred from aggregate pass rates.

## Remaining plan — execute in this order

### Batch1: close current interaction gaps, then freeze chat basics

1. Browser-check latest More toolbar: Find remains direct; More opens secondary actions; Escape closes; menu actions work; title Enter saves and Escape discards. Check desktop and390px layout.
2. Finish negative move cases: reject missing/archived/public/external/cross-workspace destinations and active generation without partial movement. Review route permissions against the existing auth model.
3. Fix any conversation-state issues exposed: out-of-order failures must not overwrite another chat; search must retain correct project/archive scope; selecting a result created after initial list load must resolve; origin links across projects must update visible context sensibly.
4. Controlled fixture browser run for pending-send navigation, failure preservation, streaming while scrolled up, stop, reconnect and completed partial response. Preserve draft/media in each case. Add durable regression checks where meaningful.
5. Finish chat UX missing from daily use: robust retry/regenerate with clear branching/version policy; readable artifact/file previews; durable draft attachments/replies if practical with bounded IndexedDB; model chooser status/error/action. Avoid claiming voice/tools/multimodal parity if not implemented.

Acceptance: user can start, discuss, attach, edit, branch, search, move, stop, recover and export across projects without losing content, guessing state, or getting fake replies. No invented provider connection.

### Conversation mutation race guard — 2026-09-25

- **Changed:** Recheck active model generation after the request body has been read and immediately before moving, editing, or changing a conversation. Request-body parsing yields to other requests, so the earlier pre-read check alone could allow a response to start before the mutation.
- **Regression evidence:** Added an HTTP integration test that holds a move request body open, starts a real fixture stream, then completes the move request. The server returns 409, leaves the conversation in its original project, and preserves the message.
- **Validated:** `pnpm exec vitest run src/server/conversationMoveRoutes.test.ts` (2 passed), `pnpm build`, and `node scripts/workspace-ui-acceptance.mjs` passed.
- **Scope:** Local fixture/server safety only. This does not claim live model-provider acceptance.

### Compact Team Room motion pass — 2026-09-25

- **Changed:** Kept a restrained animated atmosphere and grid in the short/narrow Team Room instead of stripping all scene detail at the compact breakpoint. Assignment paths are more legible; review and active paths use distinct state colors and motion. Reduced-motion preference disables these effects.
- **Browser evidence:** Reloaded the synthetic `:3465` preview and confirmed fixture notice, workspace hub, both teammate cards, and the review path remain readable together at the available 653×550 viewport. The assignment/review paths and animated avatar cues are present. This viewport does not substitute for a true 390px phone pass.
- **Validated:** `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and the focused conversation move integration tests passed.
- **Scope:** Presentation uses saved fixture states; ambient motion does not imply live work. The connected production task flow remains unverified.

### Batch2: project workspace + real work surfaces

1. Tie project overview to existing canonical tasks, runs, artifacts and reviews where explicit project relationships exist. Add missing relationships in canonical schema/store/API rather than inferring by title.
2. Implement deliberate repository attachment with scoped access, directory/file browser, readable file preview and actual diffs. A path string must not silently become permission to the entire disk. Generic isolated test repo first.
3. Surface environment selection (local/worktree/sandbox as actually supported), run status, stop/retry, changed files, checks, artifacts and approval in one project work view. Reuse compute/runtime code; do not create a duplicate backend.
4. Project archive behavior must be consistent across creation, move, filters and context. Decide/document reversible archive semantics without deleting history.
5. Never mark saved tasks as executed; user must distinguish planning-only, runnable, queued, running, needs input, failed, completed-with-evidence.

Acceptance: one isolated sample repo workflow from project creation through real change, verification, diff review and persisted evidence. Reopen after restart and recover same state. No paid/personal integrations required just to prove UI wiring.

### Batch3: connect the real generic harness, not a simulated dashboard

1. Read `PRODUCTION_EXECUTION_BOUNDARY.md` and existing runtime/compute/backend implementation. List specific unconnected capabilities before editing.
2. Connect configured model planning, bounded tools, isolated compute, verification and evidence through the existing execution contract. Work must support cancellation and truthful partial/failure state.
3. Tools/terminal/run trace should display real backend events and results. Keep technical depth in an inspector; keep primary user flow plain-language.
4. Make tool access/approval boundaries explicit and enforce them server-side. No new personal keys or services; configure a generic local fixture for testing, clearly labeled.
5. Rich goal decomposition must derive requirements from user goals; current generic two-requirement PRD is not sufficient. Link each required deliverable to real evidence and blocked/needs-input status.
6. Evaluate quality drift from actual observed outcomes/corrections. Stored containment decisions are not proof of routing enforcement. Implement or clearly identify the missing enforcement and recovery path.

Acceptance: real authorized sandbox task produces verifiable output; failed verification cannot become done; stop actually stops; restart doesn't duplicate work; logs and approvals tie to the right task/project. Live-model acceptance only when separately configured; do not fabricate it.

### Batch4: complete visual consistency across every surface

Use existing design language, not another redesign from scratch. Aim for clear hierarchy, comfortable density, useful graphics, polished empty/loading/error states, keyboard navigation and responsive layout.

Surface checklist:
- Team room: who is working, on what, what needs user input; inspectable agent nodes, no fake ambient work.
- Chat: clean toolbar, composer, transcript, artifacts, model status, errors, mobile navigation.
- Projects: context, files, conversations, work, review all discoverable.
- Tasks/runs: coherent list/board filters and actual run inspector.
- Agents: setup/edit roles and boundaries, assigned work and conversation entry points.
- Approvals/inbox: evidence and clear outcomes, no optimistic success before server confirmation.
- Goals: full requirement plan, dependencies, evidence gaps and reviewer findings.
- Processes: creation/version history/bindings and actual execution state.
- Memory: real retrieval scope, editing/version policy, namespaces, no automatic retrieval claims unless integrated.
- Models/harness/compute/tools: actual configuration and readiness with a usable next action.
- Activity: readable timeline, filters, drill-down and durable audit.
- Benchmarks: populated form/results, numeric validation, history ordering, decisions vs enforcement.
- Marketplace/migration: populated manifests/permissions and migration results; preserve approval gates.
- Docs/settings: actual file counts, readable rich content, coherent preferences and onboarding.
- Topology: keyboard-accessible alternative, meaningful links, reduced-motion behavior, responsive rendering.

For each: test loading, empty, populated, error, narrow viewport, keyboard focus. Use generic fixtures, not fake production metrics. Fix shared components once; do not duplicate styles/screens per state.

### Batch5: public release quality and handoff

1. Reconcile all source requirements with actual implementation/evidence. Preserve gaps visibly; completion needs all requested features, not only UI screenshots.
2. Remove dead fake/demo-success code only after reference checks. Keep explicitly labeled fixtures in tests/examples, separate from production defaults.
3. Audit public package contents: no secrets, phone numbers, personal operating documents, real local paths, customer data, proprietary course content or production snapshots. Consolidated54-file bundle contains private reference context; do not publish it wholesale.
4. Apache2 license, third-party notices/dependency license review, README/QUICKSTART/security/contribution docs must match actual shipped behavior.
5. Clean fresh-machine setup using generic configuration. App should guide missing provider/compute setup clearly, not show fake ready state or require owner's accounts.
6. Final checks: typecheck:all, full test suite, build, workspace acceptance, chat acceptance, persistence launcher, CLI/package checks applicable to the release. Inspect coverage/fixture limits before claiming broad proof.
7. Final desktop/mobile browser walkthrough from clean state; save screenshots and evidence paths. Present one concise final product report with exact remaining limitations if any. Do not call active goal complete unless full owner objective is met.

## Known verification status; don't repeat unchanged checks

- Full suite earlier:302 passed,2 failed,2 skipped. The2 failures were obsolete copy assertions; affected suites were fixed and rerun23/23 passing. Full suite has not been rerun after all later features. Do not claim latest full suite all-green.
- Build and workspace acceptance repeatedly passed, latest toolbar build passed. The acceptance script covers API/persistence/inline JS, not all browser interactions.
- Chat HTTP fixture verifies stream/stop/upstream cancellation/failure/persistence; not a real paid provider or tool run.
- Browser verified: projects, messages/edit/branch/search/export, memory create, docs rendering/table, routing inspection, migration plan, goal inspector, dialogs, draft preservation, reading position, project move. See handoff for exact scope.
- Not yet browser-proven: latest More toolbar, delay-sensitive send/stream cases, populated performance input, full file-bearing move, complete mobile/a11y matrix, actual production execution.
- Kane tool earlier reported insufficient credits. Do not burn calls retrying it without changed evidence. Existing CUA browser is available; follow current browser skill/tool instructions.

## First actions for Terra

1. Read this plan and the current source for the latest toolbar/move changes, not the entire history.
2. Reuse own live preview if still healthy. Browser-check latest toolbar and save result in existing verification record.
3. Complete Batch1 as one coherent pass, then Batch2/3 vertical workflow. Ask only for genuinely missing authorization/input; do not stop at another status-only audit.
4. Keep this plan as the durable checklist; update concrete status/evidence rather than generating another competing plan.

### Connection workspace loading polish — 2026-09-24

- **Changed:** Replaced the generic loading sentence with an intentional, responsive skeleton for Models, Runtime, Compute, and Tools. The state names exactly what saved records are being checked and does not imply a provider is connected.
- **Validated:** `pnpm check` (308 passed, 2 skipped), `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and local browser verification of the disconnected Models state.
- **Scope:** This is visual/control-plane work only. It does not configure a model, execute a task, or alter external integrations.

### Inbox decision queue polish — 2026-09-24

- **Changed:** Added an intentional responsive loading state and live category counts for the source-backed Inbox queue.
- **Validated:** `pnpm check`, `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, populated desktop and 390px Inbox, and the zero-result filter state.
- **Scope:** Display-only; no task, approval, or provider state was mutated.

### Mobile primary navigation — 2026-09-24

- **Changed:** Added the required Home / Team / Work / Inbox / More bottom navigation and corrected the More-menu outside-click interaction.
- **Validated:** `pnpm check`, `node scripts/workspace-ui-acceptance.mjs`, and 390px local browser checks for destination selection plus More open/close.
- **Scope:** Navigation only; no provider, task, evidence, or approval state was changed.

### 2026-09-24 — Task review outcome and mobile review sheet

Implemented and verified the Task Review outcome-first header and 390px review sheet. The shell now communicates a plain-language saved/attention/complete state before exposing the internal stage, while retaining source-backed stage, owner, priority, evidence, and execution-boundary details. The local fixture shows offline execution honestly and keeps Run disabled. Verification: full check, build, acceptance script, desktop fixture review, and 390×844 responsive inspection.

### 2026-09-24 — Task decision history

Completed the task-review information architecture pass by adding an actual Decisions surface to the review dialog. It reads the canonical saved approval records for the selected task and presents request status, timing, description, and decision notes without inventing execution or verification claims. The existing review rails and offline execution safeguard remain visible.

### 2026-09-24 — Team and review state matrix

Implemented intentional loading and recoverable error states for Team Directory and Review Desk, matching the eventual layouts rather than showing a generic placeholder. Confirmed the populated fixture views remain source-backed and visually legible: teammates show role/status/assigned work, and the review desk shows the decision request, scope, evidence state, notes, and guarded decision actions.

### 2026-09-24 — Project workspace loading state

Replaced the generic project-load placeholder with a layout-matched project workspace skeleton. Verified the populated fixture workspace keeps project resources, tabs, and disconnected-provider truthfulness clear without using fake activity.

### 2026-09-24 — Conversation loading and preservation

Added layout-matched loading states for both the conversation browser and selected-thread transition. Kept the existing draft-preserving failure behavior intact. The checked local fixture presents an intentional empty collaboration workspace and explicitly states that saved messages do not mean an AI provider is configured.

### 2026-09-24 — Project files and specifications state polish

Completed the source-backed project Files and Specifications states: structured loading skeletons, clear retry paths for failed local reads, and no generic `Loading…` text in either reader. Verified the local fixture's documentation catalog and task activity record, including empty/offline truthfulness, with no browser-console errors.

### 2026-09-24 — Conversation recovery polish

Added a dedicated, retryable conversation-recovery surface so failed local reads do not break the chat workspace or force technical error text into the operator flow. Regression checks cover message streaming, local persistence, project context, and the workspace acceptance flow.

### 2026-09-24 — Migration lab recovery polish

Completed the Migration Lab state treatment: source-aware loading, result-shaped progress feedback, and retryable local-read failures. Fixture behavior remains explicit: the screen only reports simulated adapters and never claims a live import.

### 2026-09-24 — Activity and playbooks recovery polish

Completed loading and recovery treatment for the audit timeline and playbook library. Both preserve the established command-center hierarchy, surface what is local and recorded, and do not imply that a procedure or an activity record authorizes execution.

### 2026-09-24 — Live Command Room visual treatment

The Chrome-facing AgentForge process now runs the staging UI on port 3460. The Command Room has a distinct hero field, in-product orbital map graphic, visual state cues, and stronger priority panels while preserving the production-safe, source-backed messaging in the design brief.

### 2026-09-24 — Quality evidence workspace recovery

Added source-aware loading and recovery to the benchmark/drift screen. The visual treatment reinforces the product distinction: quality information is measured, saved evidence — never synthesized performance claims.

## Isolation pass — 2026-09-24

Keep AgentForge provider-neutral. Unrelated production services remain outside this repository as optional future adapters. Never expose their endpoint manifest, names, workflow vocabulary, or production configuration in the generic runtime, fixtures, demos, screenshots, or documentation.

## Project card polish — 2026-09-24

Project cards now surface real saved signals (conversation count, context, file linkage, archive/active state) with no invented telemetry. Keep this density pattern consistent across catalog, work, and agent cards.

## Team card polish — 2026-09-24

Use status, model/harness preference, task count, and permission count as compact saved-state signals. Never convert them into fabricated uptime, availability, autonomy, or performance metrics.

## Fixture-state correction — 2026-09-24

No seeded agent profile may display `working`, active execution, or a current task. Fixture activity must remain idle, explicitly labeled, and distinct from real user-created records.

## Production-isolation cleanup — 2026-09-24

Removed unreferenced replay/prototype artifacts that embedded personal real-estate workflow data and an external production-code path. The retained replay is fictional and provider-neutral. Active source and tests use `user-owner`, not an owner-specific fixture identifier. The separate legacy service on port 3000 remains outside AgentForge and is untouched.

## Command Room refinement — 2026-09-24

The top-level control surface now uses a compact recorded-state rail instead of decorative orbital telemetry, and groups repeated service notices into one readable event summary. Browser-verified on the live 3460 local preview after build and workspace acceptance passed.

## Team profile and task-review verification — 2026-09-24

- Browser-verified on the local 3460 preview: teammate profiles expose the required Start conversation, saved role, boundaries, memory source, tools, permissions, and assigned-work record without claiming a live model or executor.
- Start conversation is an explicit operator action that creates a canonical local thread. It does not start a model response or mutate task state.
- Browser-verified Task Review: plain-language outcome, saved stage/owner, execution readiness, summary sections, and source-backed execution/verification/review record are all visible in the review dialog.

## Public documentation isolation — 2026-09-24

- Removed the flattened cross-workspace Markdown bundle from this repository and added a guard that ignores any future generated bundle.
- Documentation Explorer now indexes only the local public `docs/` tree. The public catalog is recursive, rejects ambiguous duplicate filenames, and has route coverage.
- `docs:collect` is now a read-only inventory of product documentation. It does not copy from personal workspaces or external task artifacts.
- Verification: full typecheck, 37 suites / 308 passing / 2 skipped, build, and workspace acceptance all passed.

## Documentation Explorer browser verification — 2026-09-24

- The local 3460 preview displays a 25-document catalog sourced only from the public `docs/` tree. Search, category filters, selected-document rendering, source view, and copy action remain available.
- The removed private bundle is not readable from the app route and is ignored by the repository.

### Quality evidence persistence — verified 2026-09-24

Quality baselines and comparisons are now durable local workspace evidence. The Benchmarks UI shows whether its evidence survives restart and does not synthesize missing inputs. The remaining quality work is still the worker, trace linkage, correction ingestion, time-series alerts, and canary rollback described in `AGENT_QUALITY_FLYWHEEL.md`.

## Embedded Setup Guide and live launcher refresh — 2026-09-24

- The first-run guide now creates a durable private project, channel, Setup Guide profile, conversation, and source-preserving requirement plan from a stated outcome. It identifies the remaining execution boundaries without claiming that a model, compute environment, verification, or evidence store is connected.
- Its saved conversation now answers natural questions about the plan, missing setup, and how work begins using the actual stored plan and readiness state.
- The local launcher at `http://127.0.0.1:3460/` was refreshed from the current staging source after verification found it was serving an older process without the Setup Guide route. Browser inspection confirmed the current workspace shell and Guide surface at that address.
- Verification: focused Setup Guide route tests, `pnpm typecheck:all`, and `node scripts/workspace-ui-acceptance.mjs` passed. The guide remains planning-only until the user explicitly configures the execution boundaries.

## Command Room relationship constellation — 2026-09-24

- Replaced the summary-only Workspace relationships block with a compact visual constellation derived from saved teammates and their saved open-work/error state.
- Lines represent actual workspace membership, and node treatment reflects only saved state. The empty state explains how the visual becomes useful; it does not fabricate a team or activity.
- The full interactive topology remains in Team Room, while Command Room now carries a meaningful at-a-glance graphic.
- Verification: `pnpm typecheck:all`, `pnpm build`, and `node scripts/workspace-ui-acceptance.mjs` passed.

## Workspace-mode shell control — 2026-09-24

- Added a compact current-workspace indicator to the global header. It shows Command Room, Collaboration, or Agent Studio and opens the deliberate mode picker instead of hiding this architectural choice in Settings.
- It refreshes from the canonical saved workspace state after a mode selection, with no project, thread, task, or history mutation.
- Verification: typecheck, build, workspace acceptance, and a live local-launcher source check passed.

### Full regression after Command Room and shell updates — 2026-09-24

- `pnpm test`: 39 suites passed, 314 tests passed, 2 intentionally skipped.
- `pnpm test:persistence:launcher`: passed; the vNext launcher restored its durable workspace hierarchy, conversations, SOP bindings, audit records, operational memory, and approved-process history after restart.
- `pnpm test:product-isolation`: passed; generic product source remains free of legacy pipeline defaults and uses the isolated product port.

### Embedded Setup Guide plan visibility — 2026-09-24

- Agent Studio now receives the saved outcome and a source-backed, compact requirement preview directly from the Setup Guide status route. The guide tells the operator what it created (project, private channel, durable conversation, and plan) before listing only the decisions it cannot make safely.
- The guide's local conversation can also answer natural setup requests such as “Can you set this up for me?” without claiming a model route, provider, or execution connection exists.
- The requirement preview is derived from the existing Completion Engine session; it is not a generated success claim or a substitute for task-specific approval, execution, or verification.

### Current local verification — 2026-09-24

- After the Setup Guide plan-preview, generic-fixture isolation, and Command Room state-language updates: `pnpm test` passed 314 tests across 39 files with 2 explicitly skipped; `pnpm typecheck:all`, `pnpm test:product-isolation`, and `pnpm build` passed.
- These checks prove source, route, and local persistence behavior. They do not replace the remaining clean-state desktop/mobile browser walkthrough or prove a configured provider or execution backend.

### Command Room and Studio first-use reliability — 2026-09-24

- The Command Room now asks the embedded Setup Guide to prepare a new workspace instead of presenting an empty work queue as the only state. After preparation it links directly to the saved guide conversation and requirement plan.
- Agent Studio renders a structured loading state before its concurrent local reads complete. A slow local store no longer leaves the primary canvas blank while the header and navigation have already changed.
- The guide remains honest: it creates the local project, private channel, durable guide conversation, and reviewable requirements. It does not claim that a provider is connected or that work has executed.
- Verification: `node scripts/workspace-ui-acceptance.mjs`, `pnpm build`, and `pnpm vitest run src/server/setupGuideRoutes.test.ts` passed after these changes. The source server is running on port 3460. Browser rendering for this change still needs a desktop-browser check because the isolated in-app browser cannot access the host-local listener.

### Primary-surface loading pass — 2026-09-24

- Command Room, Team Room, Goal desk, and Agent Studio now render an immediate, screen-shaped loading state before their concurrent local-record reads complete. This complements existing loading states for conversations, projects, work, review, inbox, connections, activity, playbooks, and migration.
- The intent is behavioral as well as visual: a slow local read never leaves a black content canvas beneath a changed header, and an error still falls through to the existing retryable error state.
- Verification: `pnpm test` passed (39 files, 314 tests; 2 skipped), plus `pnpm typecheck:all`, `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, `pnpm test:product-isolation`, and focused Setup Guide tests.

### Human-facing review copy and served-source verification — 2026-09-24

- Removed raw repository paths, task identifiers, actor identifiers, and audit targets from normal project, conversation, work-review, activity, and Command Room copy. The visible product now says what was saved or recorded in plain language; diagnostic identifiers remain in the protected audit data rather than the operator interface.
- Restarted the owned local source launcher on port 3460 and verified the served workspace bundle contains the new plain-language review copy and the primary-surface loading states.
- Verification: `pnpm typecheck:all`, `pnpm test:product-isolation`, `pnpm build`, `pnpm test` (39 files / 314 passed / 2 skipped), and `node scripts/workspace-ui-acceptance.mjs` all passed. A current desktop/mobile visual walkthrough remains an explicit release gate; the isolated in-app browser cannot access the host-local listener.

### Workspace-mode picker correction — 2026-09-24

- The visible **Workspace mode** control now opens the actual three-path chooser — Command Room, Collaboration, and Agent Studio — rather than sending the operator to Settings. Each path remains a view of the same saved workspace and can be changed later.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed; the restarted source launcher on port 3460 serves the updated chooser.

### Harness operator surface correction — 2026-09-24

- Removed the internal runtime-adapter catalog from the normal Harness surface. AgentForge Harness now leads with source-backed readiness, its four control boundaries, and the reviewed-work path rather than experimental provider fixtures.
- Renamed the visible navigation/tab language from **Runtime** to **Harness**. Raw launcher instructions are now an optional technical disclosure; the normal path uses plain-language preparation, review, and proof actions.
- Refined Command Room’s remaining legacy dashboard styling to the product palette: charcoal surfaces, lavender selection/primary state, restrained borders, and a data-backed relationship graphic without neon treatment.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The owned source launcher on port 3460 was restarted and its served bundle was checked for the Harness tab, control map, and removal of the adapter catalog.

### Team card information hierarchy — 2026-09-24

- Reworked the primary Team cards to match the operator contract: current work and saved boundaries are visible at a glance. Raw model and harness implementation selections remain available only in the deeper teammate profile, where they belong.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The source launcher on port 3460 was restarted and served-source checked for the new human-facing team-card copy.

### Work and project owner clarity — 2026-09-24

- Work Board and Project Work cards no longer expose a raw saved assignment identifier when the profile is unavailable. They use **Assigned teammate** until the corresponding human-readable profile is present.
- Task Review already carried this owner rule; the list and project surfaces now match it.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The restarted port-3460 source bundle contains the human owner labels and no legacy raw-assignment fallback.

### Conversation header polish — 2026-09-24

- The conversation header now immediately shows its available channel and message count rather than a temporary “Project context loading” label. Once the canonical project record arrives, it upgrades to the full project breadcrumb.
- This preserves the asynchronous context read without making the workspace look unfinished during normal navigation.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The source launcher on port 3460 was restarted and served-source checked.

### Global project switcher — 2026-09-24

- Added a compact, source-backed project chooser to the global desktop shell. It opens a saved project directly into its Overview and keeps its conversations, work, files, and decisions grouped together.
- The chooser has an explicit all-projects route and a Manage projects path. It is hidden at narrow widths where the project workspace navigation remains the intentional entry point.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The restarted port-3460 source bundle was checked for the chooser, label, and project-option UI.

### Operator harness clarity and palette baseline — 2026-09-24

- Replaced the normal Harness screen's internal adapter catalog with the AgentForge control map: plan, isolation, verification, and retained evidence. Internal Pi/Pydantic/native adapter fixtures remain implementation-only and do not render in the operator surface.
- Renamed the primary control-plane entry and page title to **Harness**. The shared baseline palette now uses the charcoal/lavender workspace tokens even for legacy component classes, preventing cyan dashboard styling from leaking into less-common states.
- Reworded top-level local data state into plain workspace language: **Sample workspace**, **Your workspace**, and **Stored on this device**. External channels report their disconnected state without naming a specific service.
- Verified `pnpm build` and `node scripts/workspace-ui-acceptance.mjs`. Static served-source verification confirmed the Harness title/control map and absence of internal harness adapter cards. Browser rendering at the host desktop and a 390px viewport still requires a browser surface that reaches the host localhost server; the in-app browser runs in an isolated network namespace.

### Responsive global project navigation — 2026-09-24

- Removed the rule that hid the global project chooser below 980px. The chooser now remains available on tablet/mobile, with compact sizing and a collapsed search control at phone widths.
- Live source launcher verification: port 3460 returns HTTP 200 and serves the Command Room, project chooser, and responsive styles. The in-app browser is isolated from host localhost, so this confirms source delivery but not visual rendering in that browser.


### Shared interface visual language — 2026-09-24

- Applied the charcoal/lavender product palette across shared navigation, buttons, cards, forms, dialogs, scrollbars, and focus states. Removed the remaining cyan glow behavior from shared controls and added reduced-motion handling.
- Rebuilt the source launcher on port 3460 and confirmed it serves the updated workspace. Visual browser verification remains limited because the in-app browser cannot reach this host-local server.


### Conversation workspace refinement — 2026-09-24

- Reworked the legacy conversation layout to use the shared palette, cleaner channel and teammate selection states, calmer message bubbles, readable tool/choice cards, a grounded composer, and an illustrated empty conversation state. Added responsive chat sizing for tablet and mobile.
- This is presentation work only: existing routing, save behavior, and honest no-model-route state remain source-backed.


- The conversation composer now provides a direct **Connect a model** action to the Models screen and says that saved messages need a model for agent replies. Live port-3460 source verification confirms this copy, the chat visual treatment, the empty-state graphic, and the responsive project switcher are served together.


### Startup blank-screen repair — 2026-09-24

- Reproduced a blank content area in the actual Codex browser despite the shell and source endpoint loading. A composer navigation string was escaped for the wrong template layer, preventing the embedded app script from initializing.
- Corrected the escaping, restarted the source launcher, and reloaded the real browser tab. Accessibility state now shows the complete Command Room view with its decisions, saved work, team, relationship map, and event ledger. Navigated into Conversations and confirmed its saved-local/no-provider state is visible and understandable.


### Settings surface consistency pass — 2026-09-24

- Updated settings navigation, preference cards, and failure states to use the product palette and clear focus treatment. Narrow-screen settings navigation now wraps rather than relying on a cramped horizontal strip.
- Reopened the live Settings route in the Codex browser and confirmed all five sections, experience selection, appearance options, connection readiness, storage notes, and keyboard shortcuts render from the current workspace.


### Content-first page chrome — 2026-09-24

- Removed the redundant shell title when a page already has its own visible heading. Pages with actions keep the action bar; pages without actions reclaim the full row. The hidden duplicate is also removed from the accessibility tree.
- Verification: `pnpm build` passed, the live source at port 3460 served the new rules, and the actual Codex browser showed the Command Room heading once with the fixture notice and workspace map still present.

### Mobile conversation entry — 2026-09-24

- Tightened the conversation start screen at phone widths so the primary action and three project-oriented starters are visible without the old oversized vertical stack. The starters retain full labels for accessibility; their secondary descriptions are suppressed only on small screens.
- Verification: `pnpm build` passed and the live Codex browser at 460px wide shows the start action and all three starter controls in the first view. Lower-priority setup detail remains available by scrolling.

### Harness control-room hierarchy — 2026-09-24

- Removed the repeated gate map and repeated execution explanation from the Harness surface. Readiness is summarized once, followed by one connected four-stage visual path with source-backed status on each stage.
- Reworded the page for operators, removed the duplicate shell title, and replaced the second conceptual flow with direct links to model setup, compute, and work review.
- Live browser verification on an isolated preview confirmed the refreshed Harness page, four connected safeguard cards, and updated language. This preview used a separate temporary data directory; the existing 3460 browser tab and its running process were left untouched.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed.

### Conversation toolbar and chat canvas — 2026-09-24

- Grouped the conversation detail/focus controls, editable title and context, and search/menu actions into a single aligned desktop toolbar. The redundant shell title is hidden when the conversation workspace supplies its own header.
- The populated thread keeps project context, message actions (reply, copy, edit, branch), the local-only response-route state, and the composer in view. Existing search, attachment, move, export, pin, archive, draft, and streaming controls remain in their prior modules.
- Verified the empty and populated project conversation in an isolated temporary preview at 1280×720. The sample message was saved locally with no model route; no external message was sent. The updated preview is kept in the browser as a deliverable.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed.

### Project resource row — 2026-09-24

- Put the four project resource cards (conversations, instructions, files, activity) on one balanced desktop row, with a two-column tablet layout. Renamed the Activity card action from the vague “View” to “Open history.”
- Verified in the live isolated browser preview at 1280×720: all four cards align in one row and Project Pulse moves directly beneath them. Temporary preview data only.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed.

### Harness guided setup — 2026-09-24

- Replaced the generic three-link setup row with four cards mapped to the live execution safeguards: model route, isolated environment, verification checks, and evidence retention. The cards reflect actual readiness, visibly mark the next missing safeguard, and take the user directly to its setup area.
- Verified the current 0/4 state in the isolated browser: “Choose a model route” is marked “Next step” with a prominent “Start here” action; remaining safeguards are clearly marked “Not set up.” The UI continues to state that execution is offline.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed; browser preview at 1280×720.

### Agent Studio layout repair — 2026-09-24

- Browser inspection exposed a real layout defect: the global fixed-height header rule collapsed the teammate editor header, causing its title, create button, and profile metrics to overlap. Set that header to its natural height and adapted the three-panel layout to the narrower space left by the application sidebar.
- Removed the duplicate Add control; the page-level “Add teammate” action remains the single entry point. At 1280×720, the teammate list and editor now form a readable two-column layout, with execution readiness below; no overlapping text or controls remain.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed; confirmed live in the isolated browser preview.
- Follow-up polish: the empty studio showed three duplicate “Add teammate” actions. The page now uses the central “Create teammate” action until a profile exists; the persistent page action appears only once profiles are configured. Removed the redundant rail action at the source rather than hiding it with CSS.
- Verified the empty state in the browser: one visible create action and no duplicate accessible controls. Build and UI acceptance remained green.

### Work board empty-state polish — 2026-09-24

- Fixed the hidden recommended-task panel still rendering as a blank bordered strip because the custom flex style overrode the native `hidden` attribute. Empty task boards now remove that panel completely.
- Widened the saved task-state rail slightly and allowed lane names to wrap, so “Needs attention” stays readable in the app’s 974px canvas.
- Verified the real empty state and switched between board and list views in the isolated browser. No tasks were created or modified. `pnpm build` and the UI acceptance check passed.

### Work board empty-state visual pass — 2026-09-24

- Replaced the text-only zero-task panel with an original inline vector illustration of work moving through review and verification, clearer first-run copy, and a direct “Create your first task” action. Filtered-empty states remain distinct and keep the clear-filters action.
- Verified the live isolated preview at 1280×720, confirmed the create action opens the existing task form, then canceled without saving or creating a task. The visual is decorative to assistive technology; the heading, explanation, and action remain accessible.
- Verification: `pnpm build` passed; `node scripts/workspace-ui-acceptance.mjs` passed.

### Workspace pathway chooser visual + hierarchy pass — 2026-09-24

- Added three distinct, inline vector illustrations to the workspace pathway cards (command network, agent conversation, and studio profile/check flow) using the existing per-path accent colors. Decorative SVGs are hidden from assistive technology; each button keeps its full descriptive accessible label.
- Moved the selectable experience cards above the optional goal brief and tightened the first-run hero so users see and can compare all three ways in before entering text. Switching remains available from the workspace mode control.
- Browser-verified at 1280×720: all three illustrated path cards and labels are visible together. Chose Collaboration, returned to the chooser, selected Command Room, then switched back to Collaboration; the saved conversation remained intact. This verification used only the isolated temporary preview.
- Verification: `pnpm build` passed; `node scripts/workspace-ui-acceptance.mjs` passed.

### Project workspace visual pass — 2026-09-24

- Added an original project relationship illustration and a richer project identity banner to the project detail view. Resource cards now pair distinct accessible labels with small custom vector icons and restrained per-category color, while preserving the real project counts and connection states.
- Verified the project overview at 1280×720 and used the Files card to open the existing read-only folder connection state; no folder was connected and no data was sent. Returned to Overview for the preview.
- Verification: `pnpm build` passed; `node scripts/workspace-ui-acceptance.mjs` passed. Temporary preview workspace only.

### Team directory first-run visual pass — 2026-09-24

- Replaced the bare empty-team message and unnecessary empty-state search/add bar with a responsive illustrated setup panel. It explains the first three decisions (role, permissions, model) and provides one clear “Create first teammate” action.
- Added custom vector artwork showing a coordinator connected to research, building, and review roles. The diagram has an accessible title and description; it does not imply that agents or provider connections already exist.
- Verified the rendered empty state at 1280×720 in the isolated preview. The action opens the existing teammate form; canceled without creating a profile. No production workspace or data was changed.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed.

### Harness route user-facing hierarchy check — 2026-09-24

- Confirmed the current AgentForge Harness route presents the execution work path (Plan → Isolate → Verify → Keep proof) and guided setup, not a row of Pi/Pydantic/native test fixtures. Fixture/provider inventory belongs in implementation diagnostics, not as competing primary harness choices.
- Verified the actual isolated browser preview at 1280×720: readiness is 0/4, execution is visibly offline, and each next setup action points to its proper route. The current preview does not claim a live execution adapter.

### Messages empty-state visual pass — 2026-09-24

- Added a conversation illustration for both the first-project state and the ready-to-chat state, plus individual icons and clearer titles for the three conversation starters. Kept the source-backed empty copy and did not add example conversation content.
- Browser inspection caught the first draft making three starter cards too narrow and forcing their labels into vertical wraps. Expanded the ready-to-chat panel to use the available canvas width and rechecked the corrected three-column layout at 1280×720.
- Verified in a fresh isolated workspace after creating one temporary project: no saved conversations, clear start action, and all three starter cards legible. No production data was used.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed; browser-rendered result confirmed after server restart.

### Command Room empty-state action clarity — 2026-09-24

- Removed the duplicate “start with the guide” recommendation from both lead cards. The next-decision card now names the actual run blocker (execution is offline) and opens Harness setup. The momentum card offers direct task capture while still explaining that the guide can organize a larger outcome.
- Added distinct warning and task-list icons, with a restrained amber treatment for the execution gate. Saved-data conditions remain authoritative: pending reviews and failed tasks still replace the empty guidance.
- Verified the initial workspace at 1280×720 in the isolated browser. “Review setup” opens the four-safeguard Harness route; “Create task” opens the existing task form. Canceled without saving a task.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed.

### Agent Studio first-run composition pass — 2026-09-24

- Reworked the empty-roster layout to remove the dead teammate rail, give first-run setup the full working canvas, and place execution readiness beside it at desktop widths. Replaced the empty metric strip with a deliberate illustrated setup card and paired the two next-step panels underneath.
- Responsive browser verification caught a real narrow-screen issue in the first CSS iteration: the desktop two-column layout persisted below its breakpoint and squeezed the card into a thin column. Corrected the parent grid, restored the mobile hero spacing, and rechecked at 390×844; content now stacks at full width with a readable CTA and no horizontal clipping.
- Final desktop preview verified at the normal 1280×720 browser viewport: setup card and execution readiness form a balanced two-column composition; title and illustration no longer overlap.
- Verification: `pnpm build` passed; `node scripts/workspace-ui-acceptance.mjs` passed after the layout changes; latest CSS-only typography adjustment was followed by another successful build. Preview runs isolated on port 3461 with temporary data, separate from the user's port 3460 workspace.

### Responsive Harness and conversation surfaces — 2026-09-24

- Inspected the existing Messages and AgentForge Harness screens in the isolated browser at 390px. Messages keeps the thread header, project context, conversation, attachment control, response-mode selector, and composer within the viewport with no horizontal overflow.
- Harness inspection found its safeguards heading split into a very narrow text column on mobile, making the short explanation wrap word-by-word. Reflowed the mobile header into a clear label/description row, title row, and status badge while keeping the 2×2 safeguard cards and readiness count intact.
- Verified the Harness screen at 390px and at the default desktop viewport; mobile document width equals the viewport (390px) and all content remains in its intended responsive stack. Reset the browser viewport after the check.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The 3461 preview remains isolated from the user's 3460 workspace.

### Sidebar navigation discoverability — 2026-09-24

- The navigation already had its own vertical scroll container, but its scrollbar was explicitly hidden. Changed it to a narrow, low-contrast scrollbar with a subtle lavender hover state so users can tell the lower groups continue below the fold.
- Verified the isolated 3461 browser preview: the sidebar's scroll area is 662px tall with 864px of content, the scrollbar is visible, and scrolling the navigation independently reveals Connections and Management while the main Harness page stays in place.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed; the visual browser check confirmed the lower navigation items are reachable and discoverable.

### Project detail mobile hero repair — 2026-09-24

- Browser review of the real project detail screen at 390px caught a serious layout defect: the project title was squeezed to a few dozen pixels and wrapped one character per line because the title, illustration, and full-width settings action were competing in a non-wrapping flex row.
- Reflowed the mobile project hero into a two-column title/illustration row with Project settings on its own full-width row. The four project resource cards remain a readable 2×2 grid; the document has no horizontal overflow at 390px.
- Verified the fixed mobile project detail in the isolated browser and the unchanged desktop layout at 1280px. Validation: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed.

### Command Room first-use workflow — 2026-09-24

- Replaced the empty-workspace dashboard of zero-count chips, duplicate setup prompts, and an empty relationship map with a guided first-run surface. It explains the actual four runtime safeguards, shows each API-backed readiness state, and gives a direct setup action for each checkpoint.
- Kept `Create first teammate` as the one secondary action and made the saved audit timeline a collapsed disclosure so repeated blocked-start records do not overwhelm onboarding but remain inspectable.
- Browser-verified the 0/4 readiness state in the isolated 3461 preview. `Review setup` opens AgentForge Harness, and the first “Choose a model” checkpoint opens Models & responses. No profile or task was created; no production workspace was changed.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed; acceptance also parsed every rendered script. Desktop visual check at 1280×720 passed. Narrow layout is defined by responsive CSS but was not separately browser-rendered in this pass.

### One-click Setup Guide entry — 2026-09-24

- Replaced the empty-workspace “Review setup” CTA that bypassed the built-in guide with a one-click guided setup action. It calls the existing Setup Guide API with a bounded first-run brief, creates the guide's private setup conversation and reviewable plan, then opens Agent Studio where readiness decisions are visible.
- The action is explicit and user-triggered. Copy states that it only organizes a plan; it neither runs tasks nor claims external services are connected. The custom-outcome onboarding route remains available for users who want to define a different result.
- Added acceptance checks for the CTA and existing API route. Rebuilt the isolated preview and clicked the actual first-run CTA: it opened Agent Studio with the Setup Guide, a private conversation, six saved review requirements, and four explicit owner decisions. The preview states that model replies are local-only until a route is configured; execution remained offline.
- Browser inspection caught the generated plan duplicating compound sentence clauses. Replaced the default with concise, separate requirements and confirmed the saved plan now has distinct rows rather than repeated sentence fragments. Tightened teammate roster spacing after the same render showed the guide's name and role running together.
- Verification: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and `pnpm exec vitest run src/server/setupGuideRoutes.test.ts` passed. The end-to-end click used a fresh temporary data directory on port 3461; port 3460 and the user's workspace were left untouched. The guide still cannot answer with an AI model or configure services until the user connects a model and the corresponding integration actions are built; this remains open work.

### Harness next-step action — 2026-09-24

- Added a primary action to the readiness panel. It is derived from the same runtime capability results as the four setup steps, names the exact next safeguard, and routes directly to that setup surface; once all gates are ready it routes to saved work for review.
- Browser-tested the live preview on port 3461: the empty runtime displayed “Next: Choose a model route”; clicking it opened Models & responses, whose verified state was “Not configured.” Returned to Harness and visually confirmed the new CTA fits in the first viewport at the preview's narrow 653×550 size. No credentials or settings were entered.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The 3460 workspace remains untouched.

### Mobile conversation access — 2026-09-24

- Promoted Messages into the mobile primary tab bar, replacing Team Map; Team Map remains available in the full navigation drawer. This puts the core Codex-style conversation workflow one tap closer without removing project, agent, or team features.
- Verified on the isolated 3461 preview at its narrow mobile viewport: Messages opens the saved Workspace setup conversation, and the expanded full navigation still contains Team Map, Projects, Agents, Agent Studio, and the Harness.
- Verification: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and the browser navigation check passed. Port 3460 was not touched.

### Short-screen conversation composer — 2026-09-24

- A 653×550 browser check showed the message composer controls falling below the mobile tab bar. Added a compact layout only for short mobile viewports: tighter thread chrome, preserved scrollable transcript space, and a fully visible response selector, attachment, status, and send controls.
- Rebuilt and verified the updated 3461 preview at the same viewport. The complete composer now fits above the tab bar while the transcript remains scrollable; the 3460 workspace remains untouched.
- Validation: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and rendered browser inspection.

### Project filter label clarity — 2026-09-24

- Renamed the global “PROJECT” control to “PROJECT FILTER” and its accessible title to “Filter by project,” so “All projects” reads as filter scope rather than the currently open conversation's project.
- Verified the updated accessible label and tooltip in the rebuilt isolated preview; the conversation breadcrumb still names its own project and channel.
- Validation: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and browser accessibility-tree inspection.

### Command Room copy polish — 2026-09-24

- Corrected the workspace-map count to use singular “1 teammate” while keeping plural grammar for other counts. Removed “production” from the disconnected-runtime message so the generic harness does not sound tied to a customer deployment.
- Verified both strings in the rendered Command Room on the isolated preview. Focused runtime tests passed (6/6), followed by `pnpm build` and the UI acceptance check.

### Command Room next-action priority — 2026-09-24

- When a saved setup plan exists but there are no approvals, failed tasks, or open tasks, the attention card now surfaces “Your plan is ready to review” with a direct Review plan action. The Continue working card offers task creation instead, avoiding a duplicate plan prompt.
- Verified the rendered isolated preview at 653×550. The plan review action is visible in the first viewport; desktop/mobile layout and stored state are unchanged. Port 3460 was not touched.
- Verification: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and browser accessibility-tree/screenshot inspection.

### Work Board first-run action and short-screen layout — 2026-09-24

- On a workspace with no saved tasks, the board now suppresses the zero-count progress rail and filters and promotes one primary “Create your first task” action. The illustrated empty state no longer repeats the same CTA.
- At short mobile heights, the artwork and explanation sit side-by-side so the empty-state graphic and message fit above the bottom navigation. At taller narrow widths, the existing single-column treatment remains.
- Verified in the isolated browser at 653×550: action, illustration, title, and explanation are visible together. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. No task was created; port 3460 was untouched.

### Work Board populated queue hierarchy — 2026-09-24

- Moved the source-backed next-task card ahead of secondary search and filters; its summary now uses the real next checkpoint, so a ready task cannot imply it can run while execution is offline.
- A single populated lane now expands into the canvas and lays out task context, description, owner, and checkpoint/evidence as a readable card rather than leaving three quarters of the board unused.
- On short mobile screens, the saved task-state rail compresses into a single four-stage strip so the task recommendation appears above the fold. At narrow widths the task card returns to a one-column reading order.
- Verified with a clearly labeled, in-memory visual fixture at 653×550 on isolated port 3463. Accessibility tree showed “Execution offline · finish Harness setup” in the top recommendation and the real lane card; screenshot showed the recommendation and search in the initial viewport, with the full task card reachable by scrolling. No live services or user workspace data were used.
- Verification: `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed after the changes.

### Conversation first-message guidance — 2026-09-24

- Replaced the lone sentence in a new conversation with a small outcome → context → evidence guide and an original connected-message illustration on roomier screens. On short mobile screens the prompt reduces to a readable two-line cue without stealing composer space.
- Browser-verified the short mobile conversation at 653×550: “What would a useful result look like?” and “Outcome · Context · Evidence” remain visible above the composer; no model response or sample transcript is fabricated. Project/thread navigation, route honesty, attach, and send controls remained visible.
- Verification: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and rendered browser inspection with a labeled in-memory workspace fixture.

### Team Room execution status layout — 2026-09-24

- Expanded the execution availability card across the Team Room content area, eliminating the half-width blank region. The status dot now follows the actual runtime availability, and narrow screens collapse the header to one column.
- Corrected the card copy from inherited monospaced text to the product's readable sans-serif body font.
- Verified the offline state in the isolated preview at 653×550; the card fills the available width, uses the intended typography, and remains readable. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. Port 3460 and live integrations were untouched.

### Command Room status hierarchy — 2026-09-24

- Replaced the unexplained three-dot rail with labeled counts for reviews, open work, and execution readiness. Counts come from saved workspace records and the active runtime state.
- Removed the repeated summary strip below the action cards so the same counts are not shown twice.
- Browser-verified at 653×550 with labeled in-memory fixture records. The top card now reads “Reviews / Open work / Execution: Offline” and the primary action remains accessible. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. Live port 3460 was untouched.

### Conversation project-first creation — 2026-09-24

- New conversation now asks for a project explicitly, then filters the channel choices to that project. The currently selected project is preselected when valid; with multiple projects and no active project, the user must choose instead of accidentally creating in an unrelated project.
- A project without an active channel shows an actionable message, offers Open project, and disables conversation creation. Opening an existing conversation also synchronizes the conversation project filter to that conversation's actual project.
- Browser-verified at 653×550: AgentForge Native showed its five channels; switching to the in-memory Visual QA fixture showed no channel, disabled Create conversation, and exposed Open project. No conversation was created. Build, workspace UI acceptance, and chat stream acceptance passed. Port 3460 and live integrations were untouched.

### Conversation no-channel recovery — 2026-09-24

- Corrected a handler collision that caused the project CTA to be overwritten by the Cancel button's generic selector.
- Replaced the indirect project-navigation action with an explicit “Add a General channel” action. It creates a private `General` channel in the chosen project through the existing channel API, refreshes the form, and enables conversation creation. Project choice and project-filtered channel choices remain intact.
- Browser-verified on isolated port 3463: switching to the channel-less in-memory Visual QA project showed a clear explanation and disabled create action; choosing Add a General channel populated the channel field and enabled Create conversation. No conversation was created. `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and `node scripts/chat-stream-acceptance.mjs` passed. Port 3460 and live integrations were untouched.

### Conversation composer readiness — 2026-09-24

- Disabled Send until the draft has text or an attachment, while preserving response-in-progress, archived, and attachment-reading guards. The model/status helper now appears only when an AI response is selected; local-only mode is already clear in the route badge and model selector.
- Browser-verified on the isolated 3463 fixture: blank draft displayed a muted disabled Send; entering text enabled it and clearing the text disabled it again. No test message was sent. Build, UI acceptance, and chat-stream acceptance passed. Port 3460 and live integrations were untouched.

### Guided project creation — 2026-09-24

- Reduced first-time project setup to one required field, the project name. Description, instructions, and a repository reference are under an optional disclosure, with clear language about the repository path not granting access.
- After creation, the UI opens the new project workspace so the next action is visible without finding the project card again.
- Browser-verified on isolated port 3463: the dialog showed only the name and optional context; creating “Visual QA guided setup” landed on that project's overview with its default General channel and project actions. Build, workspace UI acceptance, and project-files acceptance passed. No connection or external data was used.
### Command Room action-first hierarchy — 2026-09-25

- Reordered the populated Command Room so pending decisions appear first, followed by saved teammate assignments and a compact workspace relationship graphic, then the continuing-work queue. Removed the oversized radial map from this overview; the detailed topology remains in Team Room.
- The relationship view now shows saved agents and their current open task or state, and opens the selected teammate profile. When execution is disconnected, its description says so and does not imply live activity.
- Tightened the hero and review card so the roster begins within the first desktop viewport. Fixed a CSS grid-area collision with legacy Command Room rules that initially pushed the roster into an implicit column.
- Verified the current render on isolated port 3465 at desktop 1280×720 and mobile 390×844. Mobile ordering stays linear and the bottom navigation remains visible. Fixture data is labeled; no execution or external integration was used. Port 3460 was not touched.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass after the change.

### Project switcher visual clarity — 2026-09-25

- Reworked each project choice into a compact visual row with a folder glyph, readable name/description hierarchy, a directional affordance, and a clear current-project badge. The active row now has a lavender edge and soft tint; the current choice is also exposed with `aria-current` for assistive technology.
- Browser-verified on isolated preview port 3465: selecting the sample conversation synchronized the global current-project header and conversation filter; opening the chooser marked that same project Current and showed the new row graphics. Screenshot review confirmed the selected state. Port 3460 was not touched.
- Added acceptance assertions for the visual row, description, current badge, and accessible selected state. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed.

### Harness readiness hierarchy — 2026-09-25

- The Harness screen repeated the same four safeguards in both the readiness card and the detailed work-path cards. Removed the duplicate mini-checklist so the hero focuses on the overall readiness score, the immediate next step, and its direct action; the detailed cards remain the single place to inspect each safeguard.
- Verified the isolated desktop render at 1280×720: the readiness hero is shorter, the next action remains prominent, and the four detailed stages keep their status and direct setup links. The live `:3460` workspace was not changed.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed; the acceptance check now guards against reintroducing the duplicate checklist.
- Follow-up polish: replaced the repeated negative “Execution is not ready yet” message with state-aware guidance. A new workspace now says “Set up your execution safeguards”; a partly configured workspace will name that setup is incomplete; a fully configured workspace tells the user to review a task before running it. The next safeguard is stated plainly beside the highlighted action. Browser accessibility inspection confirmed the empty-workspace copy and next action; build and acceptance check passed again.
- Corrected the distinction between safeguard configuration and an available execution worker. The screen now labels an empty/partial setup “Setup needed,” a fully configured but stopped worker “Runtime unavailable,” and only calls it “Ready for review” when the runtime confirms it can execute. The runtime’s actual blocker is surfaced when setup is complete but the worker is unavailable; the work-path footer no longer falsely claims safeguards are missing. Browser-verified the empty state; acceptance assertions cover each state branch, and build/UI acceptance passed.
- Mobile refinement: at phone widths the safeguard cards now stack vertically instead of squeezing four-column details into two narrow columns. Verified at 390×844 that the cards and their full-width setup actions remain legible and reachable by scrolling above the persistent bottom navigation; restored the normal viewport afterward. The responsive rule is covered by UI acceptance.
- End-to-end checked the primary “Set up · Choose model” action in the isolated browser: it opens Models & responses and shows “Not configured” with local-only response behavior. Returned to the Harness view afterward; no route, secret, or integration was changed.

### Mobile navigation drawer — 2026-09-25

- Fixed the phone-width hamburger drawer: it now expands to a readable 260px panel, restores full-width labels and badges, and places a dimmed scrim over the page. This resolves the compact-rail styles collapsing links into narrow wrapped columns.
- Verified at 320×700: menu labels stay on one line, each link has a 225px hit area, and badges remain visible. Escape closes the drawer and restores focus; selecting Messages navigates and closes it. Returned the isolated preview to the Harness view at 1280×720 with the drawer closed.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. All checks used the labeled in-memory preview; live port 3460 was untouched.

### Models screen routing illustration — 2026-09-25

- Replaced the generic sparkle placeholder on Models & responses with an original, responsive conversation → route → model diagram. Its caption makes clear that the route must be configured before conversation text is sent; the graphic does not imply a connected provider or live traffic.
- Verified the rendered desktop screen on isolated port 3465, including the existing Not configured state. The route graphic remains decorative to assistive technology, honors reduced-motion preferences, and hides at phone widths where the surrounding explanation is the priority.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The separate live workspace at :3460 was untouched.

### Workspace mode selection and mobile access — 2026-09-25

- Made the three workspace paths behave like a real mode picker: the saved mode is visibly marked on its card, switching copy says the views share one workspace, and the current choice is kept clear.
- Added a mode-switch entry at the top of the mobile navigation drawer. Phone users can now switch between Command Room, Conversations, and Agent Studio even though the compact top bar hides the desktop mode control.
- Fixed the phone-width path chooser hero being clipped by the global header height rule. At 390×844 the full headline and workspace-sharing explanation now render before the mode cards.
- Browser-verified selecting Command Room, Collaboration, and Agent Studio, then switching back; selected mode remained visible and the same sample conversations/team records were present. Verified the mobile drawer shows the saved mode and opens the chooser. Returned the preview to 1280×720 with chooser open. Live port 3460 was untouched.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed.

### Task review modal polish — 2026-09-25

- Refined the task review hierarchy with compact status, priority, and owner chips; a highlighted next-decision panel; clearer action emphasis; and a single horizontally navigable section bar so “Execution plan” no longer wraps alone.
- Improved the empty evidence state: a task without a verification pack now says “No verification evidence yet” instead of presenting the absence as a load failure.
- Verified the synthetic task preview at 1280×720. The evidence tab clearly shows no pack has been generated; no task was run or approved, and live port 3460 was untouched.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed.

### Conversation workspace polish — 2026-09-25

- Added an original conversation identity mark and refined the project/thread list, active thread header, message canvas, and composer with clearer hierarchy, subtle depth, and stronger focus states. Sending, local saving, model-route status, and message behavior are unchanged.
- A visual pass found the thread title disappeared when opening the details inspector because the chat column became narrow. Added width-aware header reflow so controls remain on the first row and the full thread identity stays visible beneath them.
- Browser-verified the conversation view and details-open state at 1280×720 on the isolated preview. The title remains readable with the inspector open. Live port 3460 was untouched.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed.

### Project directory scanability — 2026-09-25

- The project directory left an empty third card column when only two projects existed. Increased the minimum card width so the grid adapts to available space, and constrained the single-project case for comfortable reading.
- Applied the same adaptive sizing to the teammate directory, where the same layout compressed two profile cards into a three-column grid. Both directory views now use consistent density and readable card widths.
- Rebuilt and restarted only the isolated visual QA preview at :3465. Visually verified two project cards and two teammate cards expand into balanced two-column layouts; the separate user preview at :3460 was not touched.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed.

### Keep model setup focused — 2026-09-25

- Kept the default Models & responses path focused on the conversation route and separated provider implementation cards into a collapsed “Developer reference · model integrations” disclosure. The default view no longer presents integration maturity cards as choices an operator should configure.
- The reference remains available on demand for technical review; the route still states that no model receives conversation text until explicitly configured.
- Verified the isolated :3465 browser accessibility tree shows the developer reference collapsed and the primary route controls visible. Live :3460 was not touched. The last build and workspace UI acceptance run passed after this source change.

### Conversation composer send preference — 2026-09-25

- Added a visible, keyboard-accessible composer control to switch between Enter-to-send and Ctrl/Command+Enter-to-send. The selection persists locally across conversations, the control reports its active mode to assistive technology, and the existing Shift+Enter newline behavior remains available. Grouped the toggle beside Send after the first render showed it isolated in the footer.
- Added responsive control styling, setup documentation, and workspace UI acceptance checks for the control and persisted setting.
- `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, `node scripts/chat-stream-acceptance.mjs`, and `git diff --check` passed. Reloaded isolated preview :3465, visually checked the desktop composer, changed modes, reloaded to verify persistence, and restored the default setting. Live :3460 was not touched.

### Harness readiness action honesty — 2026-09-25

- The Isolate, Verify, and Keep proof cards now name what their controls actually open. Isolate links to read-only environment status, so the label no longer promises environment setup that the control plane does not implement; incomplete future gates say “Not ready” instead of implying a setup path exists.
- The readiness CTA now says “Open next step” and the card actions describe their destination. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. Reloaded the isolated `:3465` fixture and visually checked the harness and its 0/4 state; live `:3460` was not touched.

### Team Room network graphics — 2026-09-25

- Expanded the topology map into a full-width network on compact desktop viewports; the old split squeezed it into a narrow panel. Reworked the two-agent short-window layout into a curved hub-and-spoke composition, fixed cards/legend collision, and let larger teams flow through distinct rows instead of overlapping.
- Enriched the ambient orbital field and profile marks with layered motion while keeping task-activity animation limited to runs backed by a real process ID. Moved the legend into a floating canvas chip so it stays visible and out of the card row; review-state cards now have a restrained amber halo. Reduced-motion preferences disable the added motion.
- Replaced the blank map-loading interval with a branded animated topology placeholder; it is removed as soon as saved records render, and the no-record state still uses the existing first-agent setup prompt.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. Reloaded and visually inspected the isolated `:3465` preview; the workspace node now sits above the two teammate cards with curved links across the wider map. Live `:3460` was not touched.

### Work Board compact-window task visibility — 2026-09-25

- At the actual `1005 × 550` preview viewport, the first task card began below the fold. Tightened the short-window header/rail/controls and removed the duplicate attention banner at that height so the real task and its evidence/next-step summary occupy the first screen.
- Verified the Work Board preview source contains one saved waiting-for-review task; the compact layout is source-agnostic and only changes presentation. Build and workspace UI acceptance passed before browser verification.

### Command Room first-fold priorities — 2026-09-25

- Paired “Needs your attention” with the actual “Continue working” task list in the top priority row. At compact heights, the saved assignment roster follows below; operators no longer have to scroll past the decorative relationship panel to reach the task itself.
- Kept both panels derived from the existing approval/task API records and preserved the clearly labeled disconnected/fixture state. Build and workspace UI acceptance passed; visually verified at `1005 × 550` in isolated preview `:3465`: review and saved task are both fully visible in the first fold, with the teammate view below them and no overlap. Browser console had no errors.

### Team Room constellation refresh — 2026-09-25

- Replaced the sparse vertical diagram with a centered constellation: the workspace hub anchors the canvas and teammate cards orbit around it, with SVG ownership paths still based on saved assignments. The canvas now has a moving light arc, layered orbit tracks, brighter node halos, rotating avatar rings, and visible status colors. Only process-backed active or verifying work gets the faster green execution treatment; ambient relationship animation is explicitly labeled, and reduced-motion settings stop the loops.
- Tightened the two-person desktop layout to a 310px map at short window heights so the full hub/team composition fits the working view instead of clipping the artwork below the fold. Narrow layouts retain their stacked card arrangement.
- Verified the labeled synthetic two-agent room at `1005 × 550` in the isolated `:3465` preview. Execution remains visibly offline; no demo task is represented as a live run. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. Production preview `:3460` was not touched.

### Team Room visual correction — 2026-09-25

- The first constellation treatment still read as three cards on one horizontal rail, with faint background loops. Changed the two-teammate arrangement to opposing diagonals around the workspace hub and increased contrast, depth, orbit movement, and the status-specific card treatment. Added a visible amber review treatment; green moving paths remain limited to process-backed active work, while offline demo motion is labeled decorative.
- Reduced motion remains respected. Updated the map acceptance checks for the new two-agent geometry and state styling. Verified the refreshed map in isolated preview `:3465` at `1005 × 550`; the hub and two teammates are now visibly arranged on distinct vertical levels with bright orbital markers. `pnpm build` and workspace UI acceptance passed. Production preview `:3460` was not touched.

### Conversation composer first-fold refinement — 2026-09-25

- Moved the response route selector beside the attach, send-shortcut, and send controls so it no longer consumes a separate row above the message field. Increased the compact-height typing area while retaining the existing route, stop, retry, attachment, and keyboard-shortcut behavior.
- Verified in the isolated `:3465` conversation: the route control is in the send toolbar and the textarea is 54px high at the 1005×550 preview viewport. `pnpm build`, chat-stream acceptance, workspace UI acceptance, and `git diff --check` passed. Production preview `:3460` was not touched.

### Compute readiness, real host availability, and first-fold hierarchy — 2026-09-25

- The Compute page now leads with the actual isolated-environment choices and their state; host resource telemetry follows beneath. This puts the operator's decision before machine statistics.
- The local API now probes Docker read-only and distinguishes an available engine from an execution backend that AgentForge has actually connected. Local provider code is labeled implemented-but-disconnected; cloud compute remains not configured. The execution readiness gate remains closed.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. The acceptance stubs Docker availability per server instance and verifies the API still reports `PARTIAL_NOT_CONFIGURED` while Docker responds. The isolated `:3465` browser showed this host's actual Docker-unavailable state and the three environment cards above the fold. Live `:3460` was not touched.

### Task Review compact-height hierarchy — 2026-09-25

- The task modal used most of a short desktop window before showing its section tabs and progress rail. Added a compact-height layout for the title, state, ownership, next step, controls, tabs, and proof rail so the reviewer can reach the actual evidence without losing the task context.
- Verified both Summary and Checks & evidence in the labeled fixture at `1005 × 550` on the isolated `:3465` preview. Summary shows the Plan → Work → Verify → Review rail; evidence accurately reports that no verification pack exists. `pnpm build` and workspace UI acceptance passed. Production preview `:3460` was not touched.

### Team Room animated graphics pass — 2026-09-25

- Strengthened the map into a dimensional command-floor scene with a perspective mesh, higher-contrast orbit paths, luminous agent stations, and a visible workspace core. The waiting-for-review state now gets an amber attention beacon; a live execution beacon and moving connection remain tied to process-backed work only. The offline state has its own amber styling, so ambient animation cannot be mistaken for an active agent.
- Added acceptance checks for the perspective floor, attention/live indicators, offline class, and existing reduced-motion handling. `pnpm build`, workspace UI acceptance, and scoped whitespace check passed. Reloaded the isolated `:3465` preview and inspected the actual Team Room at `1005 × 550`; its fixture truthfully shows execution offline, one review waiting, and no active run. Production `:3460` was not touched.

### Conversation context and inspector sizing — 2026-09-25

- Removed the always-visible project-context strip from the message timeline; project instructions now live under Details, alongside conversation, channel, attachment, and response-route facts. This gives the actual transcript more vertical room without removing its context.
- Fixed the 1005px layout where opening Details had reduced the transcript to a narrow sliver. On medium desktop widths, the conversation list yields while the transcript and 320px inspector share the workspace; narrower desktop windows use an overlay, and wide screens retain three regions.
- Verified in the isolated browser at `1005 × 550`: 753px workspace, 432px transcript, 320px inspector, list hidden while details are open, and project instructions inside Details. `pnpm build`, workspace UI acceptance, chat-stream acceptance, and scoped `git diff --check` passed. Production `:3460` was not touched.

### Project overview attention-first order — 2026-09-25

- The overview put four setup/resource cards before the project's actual review queue, pushing the decision out of view. Moved the source-backed Project Pulse directly below the project tabs, before setup links, and tightened the project hero and pulse for short desktop windows.
- Browser verification at `1005 × 550` shows the project name, tab row, pending decision, and both relevant actions together above the fold; the resource cards follow beneath. Workspace and project-files acceptance checks passed after the reorder.

### Team Room animated stage redesign — 2026-09-25

- Reworked the topology art from boxed profile cards into presence stations around the workspace core. Added a perspective floor, layered orbital platforms, illuminated agent spheres, and low-key ambient particles. Ambient motion is explicitly labeled while execution is offline; mint live paths still require a saved process-backed task, amber marks a real pending review, and reduced-motion preferences disable loops.
- Each station now shows the agent's saved role or actual assigned task title, state, and task count. The synthetic review fixture renders a clear amber workspace and planner with a distinct standby teammate; no agent run is implied.
- Verified the updated implementation on the isolated `:3465` preview at `1005 × 550` and `390 × 844`. At phone width the hub now sits above the teammate stations with 25px separation and no horizontal overflow; clicking a station still opens the saved profile and assigned-work details. Restarted only the local visual-QA server to load the newly built UI. `pnpm build`, workspace UI acceptance, and scoped `git diff --check` passed. Production `:3460` was not touched.

### Command Room hierarchy and duplicate reduction — 2026-09-25

- The saved-agent list was repeated as a second relationship graphic, and Continue working appeared before Team at work. Removed the duplicate relationship block; the default order is now decision queue, actual teammate assignments, then the saved task list. The full interactive relationship graphic remains on the Team Room screen.
- Verified the generated home view visually at 1005×550 and 390×844: the order is decision → team → continue, there is no horizontal overflow, profile actions still open the saved teammate details, and the duplicate graphic markup is gone. `pnpm build` and workspace UI acceptance passed. Production `:3460` was not touched.

### Team Room motion and agent identity refinement — 2026-09-25

- The initial animated scene read as static orbital decoration. Added four continuously animated particles on two separate SVG data currents, a cursor-following light field, and deterministic per-agent accent colors. Removed the leftover rounded-square avatar orbit that conflicted with the new circular avatar animation. The UI continues to distinguish decorative offline movement from real process-backed execution signals, and all additional motion and lighting are disabled for reduced-motion preferences.
- Verified the isolated browser render shows distinct mint and violet agent identities and moving particles; DOM reports four SVG motion tracks and no horizontal overflow at 1005px. Added acceptance assertions for the animated currents, accent palette, spotlight, and reduced-motion handling. `pnpm build` and workspace UI acceptance passed. Production `:3460` was not touched.

### Conversation list previews and project context — 2026-09-25

- The thread list showed only a title, channel, and date, so the user had to open threads one at a time to find the latest seller or agent message. `GET /api/threads` now includes a bounded latest-message preview (author, up to 240 characters, timestamp, attachment count); search results include the same preview. The list shows project/channel, recent time, and a two-line message preview, while keeping message text as plain text.
- Verified latest-message metadata through the HTTP API, including attachment count and the last reply. The isolated `:3465` Messages screen visibly renders project/channel/time and the latest message snippet with no horizontal overflow at 1005px. `pnpm build`, the focused conversation API test, workspace UI acceptance, chat-stream acceptance, and scoped whitespace check passed. Production `:3460` was not touched.

### Team Room agent-station visual pass — 2026-09-25

- Replaced the faint, floating-initials look with readable translucent agent stations, colored energy avatars, a central workspace core, brighter animated orbital paths, and visibly flowing agent links. Kept active-run animation restricted to process-backed tasks, pending review amber, and motion-reduction support.
- Verified the rendered Team Room in isolated `:3465` at 1005×550; confirmed cards, status labels, and orbit paths render. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. Production `:3460` was not touched.

### Shared navigation and control polish — 2026-09-25

- At 1005px desktop width, the long Harness navigation item wrapped and looked broken. Tuned the compact desktop rail to preserve the full label, aligned the active marker, and applied consistent short hover/focus transitions to navigation and buttons. Reduced-motion users do not receive those transitions.
- Verified the full “AgentForge Harness” label fits on one line in the refreshed `:3465` browser and Team Room still renders with the revised animated stations. `pnpm build`, workspace UI acceptance, and scoped whitespace validation passed. Production `:3460` was not touched.

### Team Room short-screen layout repair — 2026-09-25

- On the `550px`-tall preview, the topology forced its nodes and selected-agent details below the visible map. Added a compact three-card row when the screen is short and there are at most two teammates; the map and selected detail card now use the same compact height, with tighter detail spacing so every action remains visible. Teammate selection is exposed as a button with `aria-current`, rather than as a checkbox.
- Verified the actual `:3465` browser after rebuild at `1005 × 550`: Workspace and both teammate cards fit in one row; selecting Fixture planner opens its status, current assignment, profile, conversation, and assigned-work actions without clipping. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` passed. Production `:3460` was not touched.

### Home and project screen short-window review — 2026-09-25

- The Home screen’s workspace-status tile consumed too much vertical space before “Team at work.” Reflowed the tile into a compact two-row status strip and tightened only the short-window review panel; kept status labels at 8px or larger. This brings the first teammate into view without hiding the next decision or inventing data.
- In the isolated `:3465` preview, visually checked Home, the full Team Room selection state, empty Messages, a populated conversation, and the selected project overview at `1005 × 550`. Conversation controls and project sections remain accessible; project pulse reflects its saved review. `pnpm build` and workspace UI acceptance passed. Preview uses labeled synthetic records; production `:3460` was not touched.

### Team Room scene visibility and identity cues — 2026-09-25

- Reconnected the animated reactor and layered agent orbs to the Team Room DOM. A later visual override had hidden those elements and rendered avatars as static square initials, despite the existing scene styles. The ambient orbit and gentle breathing identify the space and teammates; ordinary assignment lines stay still, while only process-backed runs receive moving signals. Pending review keeps its amber pulse. Reduced-motion settings stop the animations.
- Verified the isolated `:3465` preview at `1005 × 550` and `390 × 844`; the hub and teammate states render, phone layout has no horizontal overflow, and the execution service still reads Offline. `pnpm build` and workspace UI acceptance passed. Production `:3460` was not touched.

### Task review to decision handoff — 2026-09-25

- A pending approval displayed in a task's Decisions tab, but users had to leave the task and find the matching request in the Review Desk. Added a task-linked **Review and decide** action. It closes the task modal, opens the exact saved request in the Review Desk, and explains that recording a decision does not start the task. The Review Desk retains its decision brief, notes, and explicit confirmation step.
- Verified this full handoff against the labeled local fixture on `:3465`: the Decisions tab identifies the pending request, the action opens the same request with its evidence/risk brief and Approve/Reject controls, and no decision is submitted. `pnpm build`, workspace UI acceptance, and scoped whitespace checks passed. Production `:3460` was not touched.

### Team Room animated scene correction — 2026-09-25

- The first visual pass still read as three cards on a dark grid. Added a responsive SVG orbital layer with three independently rotating paths, softly pulsing satellites and a star field, plus a slow ambient color drift. Motion is explicitly decorative; assignment paths remain still and only process-backed runs can show task motion. Reduced-motion preferences disable the scene animations.
- The task approval handoff remains connected to the exact Review Desk request, so users can inspect evidence and make a deliberate decision from the task.
- Rebuilt and ran workspace UI acceptance plus scoped `git diff --check`. Reloaded the isolated `:3465` preview and visually verified Team Room with labeled test fixtures. Production `:3460` was not touched.
- Selected teammate details now render in the Team Room side column instead of floating over the topology. At narrow width the detail card no longer blocks the workspace hub or other agents; the full profile, conversation, and assigned-work actions stay visible. Verified the selected-planner state in the isolated `:3465` browser.

September 25 Team Room state visualization fix: tightened compact graph height/coordinates so the Workspace node and teammate cards stay within the same short-screen scene; waiting-approval work now uses an amber animated signal travelling from the teammate toward Workspace, while process-backed active work keeps its mint execution signal. Compact-screen minimum heights no longer force the graph taller than its rendered coordinates. Reduced-motion remains respected. This is a saved-record visual cue and does not represent demo data as live execution. Verified build; workspace acceptance initially caught an obsolete assertion tied to the previous state-class implementation, updated the regression check to the new explicit active/review state contract, and rerunning.
Compact viewport visual QA follow-up: the first 292px layout put the lower cards behind the fixed navigation in the 653x550 preview. Restored the 224px compact scene with the Workspace and teammate centers aligned to its actual height, while removing the old CSS minimum-height forcing. The compact map now fits its coordinates and should keep all three nodes visible; checking live after rebuild.
Final Team Room signal pass verified on the rebuilt isolated 3465 preview: all three compact-scene nodes are visible above the fixed bottom navigation; the amber review path now animates from the assigned teammate toward Workspace, and saved fixture status remains explicitly labeled. pnpm build, 
ode scripts/workspace-ui-acceptance.mjs, and git diff --check pass. The active goal remains broader harness/UI refinement; this completes only the Team Room graphics fix.

September 25 compact UI readability follow-up: fixed the Team Room legend so it no longer sits over the Workspace node; state captions are now 10–11px in the tested 653×550 layout. Raised Home’s key short-window disclosure/decision/team copy above the previous 8–9px settings, and brought compact Projects status/action labels up to 10–11px while preserving card navigation. These are local responsive styles only. Build and UI acceptance run next; production :3460 remains untouched.
September 25 conversation usability pass: visual inspection found the “Latest messages” control centered over and obscuring the transcript at 653×550. Moved it into the conversation action bar, made the control compact and accessible, and shortened the offline response choice to “Save only” with a clear title so it no longer truncates in the composer. Conversation content and existing reply/edit/search/branch/attach/stop features are unchanged. Build, workspace/chat acceptance, and browser verification follow.
September 25 visual QA follow-up: the isolated 653×550 preview was inspected across Team Room, Home, Projects, Work, Messages, Inbox, and AgentForge Harness. The Inbox’s recommended action and filter counts remain visible; Harness shows the truthful offline state, readiness count, and all four setup paths. The saved conversation now announces a “Jump to latest messages” action in its toolbar, away from transcript text; its offline route selector is visibly “Save only.” `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, `node scripts/chat-stream-acceptance.mjs`, and scoped `git diff --check` pass. This is continued incremental UI work; the full product-polish goal remains active. Preview is synthetic and isolated on :3465; production :3460 remains untouched.

September 25 responsive visual fix: the Models & responses route illustration was hidden for every viewport below 700px, so the animated path vanished on a tablet or small laptop. It now stays visible at 521–700px with a compact responsive layout (up to 250px) and reduced copy; it remains hidden below 521px where it would crowd the controls. Verified the built preview at 653×550 and passed `pnpm build` plus `node scripts/workspace-ui-acceptance.mjs`. `:3460` production was not touched.

September 25 Command Room responsive hierarchy correction: the phone view spent its first screen on an oversized status hero and a demo-data warning before showing the pending review. The mobile hero now keeps the live workspace counts in a compact status strip, and pending decisions render immediately after it; the demo-data notice follows the decision card. Verified at 390×844 in the isolated preview: the review action and request fit above the fixture notice, with no horizontal overflow. `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass. Production `:3460` remains untouched.

September 25 Inbox phone-layout correction: visual inspection found the saved decision card's action-button offset consumed the text column, breaking every title across narrow fragments. Replaced that layout with a two-column mobile grid: the request copy now gets the available width, and its action sits directly beneath it. Browser verification at 390×844 shows a readable two-line title and description, visible review action, and no horizontal overflow. `pnpm build`, workspace UI acceptance, and scoped whitespace check pass. Production `:3460` remains untouched.

September 25 Messages phone-list correction: at 390×844 the empty-thread list was clipped beneath an invisible thread pane, and the first repair attempt arranged its filters as narrow columns. The list now becomes the mobile view until a conversation is selected; its project filter, search, archive toggle, and full-width conversation row stack vertically. Corrected the back-navigation state check to use the same saved selection class as the conversation client, so “Conversations” returns to the list. Rebuilt and checked in the isolated `:3465` browser; production `:3460` remains untouched.

September 25 Team Room visual emphasis pass: the animated orbit tracks and satellites were too faint and slow to read at a glance, and the Workspace node was clipped at the top in the compact 653×550 layout. Increased the colored path contrast and moving satellite size, shortened the three independent orbit cycles to 12, 17, and 23 seconds, and shifted the compact node layout down so all three cards fit inside the map. Selection, review, and execution indicators continue to use saved/live state; reduced-motion overrides remain in place. Workspace acceptance and browser checks pass; production `:3460` remains untouched.

September 25 Work Board single-record hierarchy: browser review at 1440×900 showed a single task stretched across three columns, separating its title, description, and next-action details across a mostly empty canvas. Reflowed the one-lane card into a readable work summary beside a contained checkpoint/evidence panel, with a single-column version below 900px. Task state and actions remain source-backed. Build, acceptance, and browser checks follow; production `:3460` remains untouched.
Latest Messages toolbar accessibility fix: the conversation “More” control was operable with a pointer but was not consistently exposed by the accessibility tree as a named button. Added a stable accessible name, expanded state, control relationship, and labelled action group; kept Escape-to-close with focus restoration and close-on-outside-click. Verified in the refreshed isolated :3465 browser: assistive snapshot announces “More conversation actions” and the “Conversation actions” group, the secondary actions appear on open, Escape closes and returns focus, and clicking Find closes the disclosure. `pnpm build`, workspace UI acceptance, and conversation-move route test pass. No conversation was sent, moved, archived, or otherwise changed. Production :3460 untouched.
Latest Team Room compact-graph correction: the 653×550 browser check exposed a real regression hidden by earlier acceptance: the compact layout still used 112px-tall cards centered only 106px apart, so nodes overlapped and nearly touched the fixed bottom bar. The map now marks its compact layout explicitly, uses a 202px canvas, puts the hub and teammate row on separate centers, and sizes each card to 84px with a one-line detail. Verified in the refreshed :3465 browser at 653×550: all three cards are distinct, with measured bounds inside the map (map bottom 462px, teammate cards bottom 450px, navigation starts 484px); the accessibility tree still exposes every node and action. `pnpm build` and workspace UI acceptance pass. Preview uses synthetic data; production :3460 remains untouched.
September 25 follow-up verification: live 653×550 browser QA found the compact Team Room legend overlaying the Workspace hub even though the map/node bounds passed. Moved the hub below the legend and lowered teammate centers slightly to preserve a visible gap; updated acceptance assertions. Also tightened the short-screen Command Room header/status and fixture banner so the decision and full team roster fit above the fixed mobile navigation, while the work queue remains scroll-accessible. These are preview UI changes only. Rebuild, acceptance, and fresh browser measurement recorded below after completion.
Verification complete: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, `pnpm exec vitest run src/server/conversationMoveRoutes.test.ts`, and `git diff --check` pass. Reloaded the isolated preview at 653×550 and verified (1) Command Room shows the review item, labeled preview-data strip, and complete two-person roster above bottom navigation; (2) Team Room Room/Roster toggles work, all three graph nodes are accessible, the legend no longer covers Workspace, compact task text ellipsizes rather than colliding with the count, and selecting a teammate opens its actions; (3) browser console has no errors. Preview contains test fixtures; no provider or production workspace was changed. Production `:3460` remains untouched.
September 25 compact Agents page fix: the first teammate card was clipped below the fixed phone navigation at 653×550. The short-screen layout now compresses the hero, keeps search and Add teammate side-by-side, and condenses each teammate card while retaining role, status, current-work, and permission signals. Rebuilt and reloaded isolated :3465; screenshot confirms the complete first card and controls fit above navigation, with the next card naturally scrollable. `node scripts/workspace-ui-acceptance.mjs` passes. Production :3460 remains untouched.
September 25 Agent Studio root-cause repair: the global `header` selector in workspaceApp.ts was applying the 46px app-toolbar height and flex sizing to every semantic page header. Scoped it to `body > header`; Agent Studio hero and nested editor header now size correctly. Added responsive single-column Agent Studio layout for <=720px, a compact roster and profile on <=700px/short screens, and acceptance guards. Rebuilt and ran workspace acceptance; at 653×550 the full Studio title, horizontal teammate roster, and selected profile are readable with no horizontal overflow, while the Agents page fits its full first card above the bottom bar. Production :3460 remains untouched.
September 25 Command Room phone-readability pass: at 653×550 several labels and task details were 7–8px. Increased the short-screen status, preview, review, roster, and task copy to 8–10px while keeping the existing decision-first layout. Refreshed the isolated :3465 preview and verified the review, preview-data notice, and both teammate assignments remain visible above bottom navigation; build and workspace acceptance pass. This continues Batch 4; broader goal is still open.

### Team Room compact topology overlap fix — 2026-09-25

- The live :3465 screenshot contradicted the earlier claim that the compact graph had been checked: the Workspace card and teammate cards overlapped and their assignment text was cut off. Root cause: compact layout depended on `window.innerHeight`, which did not match the narrow rendered canvas. Compact mode now keys off the map width and renders cards in a grid, so card bounds follow content flow; drag is disabled only while that fixed compact layout is active. The single-agent case is centered. Compact card labels and the legend are larger and clearer.
- Verified in the actual :3465 browser at the narrow 653×550 preview: Workspace, both teammate cards, states, assignment text, counts, and legend are separated and visible above the fixed navigation. Clicking a teammate opens the accessible detail panel with profile, conversation, and assigned-work actions. The records are labeled synthetic; no live execution is implied. Production :3460 was not touched.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass. The acceptance check now covers width-based compact selection and flow-positioned grid cards.

### Team Room compact-graphic clarity repair — 2026-09-25

- The live 653×550 preview showed the animated background grid and orbital reactor bleeding through the compact relationship cards. Simplified only the constrained layout: removed background geometry behind the nodes, made node surfaces opaque, and kept the assignment links plus per-teammate animated identity rings visible. This preserves the graph's state cues while making names, review state, and assignments readable.
- Rebuilt and ran `node scripts/workspace-ui-acceptance.mjs`; both passed. Reloaded the isolated `:3465` browser and confirmed the workspace node and both teammate cards are clearly separated, assignment lines are visible in the gaps, and the offline/demo disclosures remain explicit. The preview is synthetic; production `:3460` remains untouched.
- Interaction check after the visual pass: switched Room → Roster and opened Fixture planner. The accessible profile exposed saved role, status, memory/model/harness preferences, permissions, and its assigned task; no live model or worker was implied.

### Conversation and project flow spot-check — 2026-09-25

- On the running synthetic `:3465` preview, verified the conversation toolbar keeps **Find** as a direct action; **More** opens Save title / Pin / Export / Archive / Move, and Escape closes it. Find opens its search field while leaving the conversation available.
- Opened the linked project and checked its Overview and Work & review views. The project pulse, review count, task state snapshot, filters, and task details reflect the same saved fixture. The new-task dialog remains scrollable at the captured 653×550 viewport, and Cancel leaves the task count unchanged.
- `node scripts/chat-stream-acceptance.mjs` passed for provider-fixture streaming, project context, persistence, duplicate-run guard, edit/archive guard, stop/upstream cancellation, and provider failure. `pnpm exec vitest run src/server/conversationMoveRoutes.test.ts` passed. This is not evidence of live-provider streaming or the still-missing full 390px browser pass.

### Harness short-window workflow — 2026-09-25

- On the 653×550 preview, the execution-readiness card pushed the four-step work path beneath the fixed navigation. Reordered the harness so its four safeguards and their relevant status actions lead, with the overall readiness card immediately after; tightened the hero, tabs, and cards specifically for short windows, hiding only the decorative header diagram on short screens. The compact Plan card also showed its “Blocked” status colliding with its environment button; aligned each step’s number/title, explanation, state, and action into separate grid rows.
- Execution remains visibly blocked while the backend is disconnected. The actions only open status pages; they do not imply setup or start execution.
- `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and scoped `git diff --check` pass. Reloaded the isolated `:3465` preview at 653×550: all four step cards and their actions fit above the fixed navigation; Plan’s “Check environments” and Isolate’s “View status” controls no longer overlap their blocked labels. The accessible harness tree exposes all four steps before readiness. Production `:3460` remains untouched. The broader execution-backend integration and remaining acceptance matrix are still open.

### Conversation action browser check and empty-move recovery — 2026-09-25

- In the isolated 653×550 browser, confirmed Find opens its labeled search field, More exposes named Pin/Export/Archive/Move actions, Escape closes it, and conversation-title Enter saves while Escape restores the last saved title. The fixture title was restored after the check.
- Found an actual dead end: Move had no valid destination and only told the user to create a project. Added a **Create a project** action that opens the existing project-creation dialog directly; it creates nothing until the user submits the form. Browser-verified the path ends at the focused New project name field; cancelled without creating a project.
- `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and scoped `git diff --check` pass. The browser uses synthetic records on `:3465`; production `:3460` was not touched. Desktop and true 390px mobile interaction checks remain outstanding.

### Home decision-to-team-to-work hierarchy at short viewport — 2026-09-25

- The 653×550 browser view showed Home's team list taking the full vertical stack, leaving **Continue working** behind the fixed navigation. On this short landscape/tablet size only, the team roster now uses two readable side-by-side cards; the repeated team footer is removed because execution status is already shown in the workspace snapshot, and the duplicate task-state badge is removed while the same state remains in its metadata.
- Verified in the refreshed `:3465` preview: both team cards occupy one row at y=310–374, **Continue working** begins at y=386, and its complete task/action row ends at y=482, above navigation at y=484. The separate reviewer and owner actions remain visible. The preview is synthetic and labeled; production `:3460` was not touched.
- `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and scoped `git diff --check` pass. The 390px phone layout and other primary screens still need the full visual-state matrix.

### Task-review navigation at narrow window — 2026-09-25

- At 653×550 the task-review tabs formed a horizontal strip; the final destinations were clipped and required horizontal scrolling. Narrow windows now show all seven destinations in a visible grid, switching to two columns on phone widths.
- Rebuilt and verified in the isolated `:3465` preview: Summary, Changed files, Checks & evidence, Decisions, Activity, Boundaries, and Execution plan are all visible; selecting Decisions and Boundaries renders their respective records and actions. The task fixture remains synthetic and untouched. Production `:3460` remains untouched.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass. Desktop-wide and 390px phone interaction verification remain part of the unfinished visual-state matrix.

### Team Room assignment-path visibility in compact layout — 2026-09-25

- The compact 653×550 room placed cards close enough that assignment paths and their review animation ran underneath the cards and were nearly invisible. Compact cards now leave a clear connector gap, and SVG paths terminate at each card edge using the rendered element bounds. Review/active status controls the path style and packet; idle profiles do not gain invented activity.
- Verified on the refreshed synthetic `:3465` preview: the workspace-to-planner assignment path is visible in the gap, both cards and labels remain readable above navigation, and saved offline/review labels remain explicit. Production `:3460` was not touched.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass. A true 390px phone pass and desktop-wide graph pass remain outstanding in the full visual matrix.

### Task review opens its matching decision — 2026-09-25

- Waiting-approval tasks previously showed only task controls; reaching the actual approve/reject decision required finding the separate Review Desk. Added a **Review request** action that fetches the current pending approval for that task and opens that exact decision, with a clear no-request/error state if the record is missing or unavailable.
- Browser-verified from the synthetic task on `:3465`: **Review request** opened the matching Review Desk item and displayed its task, evidence state, and decision controls. No decision was submitted. Production `:3460` was not touched.
- `pnpm build` and `node scripts/workspace-ui-acceptance.mjs` pass. Permission denial and stale pending-record cases still need targeted acceptance coverage.

### Execution readiness verification — 2026-09-25

- Read `docs/PRODUCTION_EXECUTION_BOUNDARY.md` and inspected the existing Docker backend wiring before changing anything. The approved-command backend is already implemented and defaults to off; it fails closed unless an explicit repository and live Docker daemon are available.
- Current machine check: Docker CLI exists, but the Docker Desktop Linux engine pipe is absent, so daemon readiness fails. The isolated preview correctly remains Offline. I left execution mode and task approval state untouched and did not weaken any safety gates. Live container run/cancel/recovery remains unverified until the daemon is available.

### Team Room live-run status accuracy — 2026-09-25

- Corrected activity classification: a saved `processId` is only a procedure reference and does not prove a task is executing. The runtime now exposes active task IDs from its in-memory execution registry; Team Room labels saved `in_progress` records without a matching active ID as saved state, not live work.
- The room summary and assignment legend now distinguish verified runs, saved active state, review requests, and offline/no-work. Searchable workspace records also label agent/task states as saved metadata. The preview's previous in-memory server had stale code; restarted only the isolated `:3465` fixture and verified the refreshed accessibility tree and screenshot. It shows 0 active work items, 1 decision waiting, and explicitly labels profile status as saved metadata. Production `:3460` remains untouched.
- Verification: `pnpm build`; focused runtime test (6 passed); `node scripts/workspace-ui-acceptance.mjs`; refreshed `:3465` browser check; `git diff --check`.

### Team Room compact graph clarity — 2026-09-25

- Compact Team Room layouts hid the orbit illustration and muted the relationship line, so the room read as a stack of cards rather than a live workspace map. Restored the small ambient reactor/orbit layer behind the cards and strengthened the amber review route and its moving packet. The animation remains state-driven and respects reduced-motion preferences.
- Corrected the Workspace hub state: it now reports execution readiness/offline status instead of inheriting “Review needed” from an individual task. The assigned teammate continues to carry that review state.
- Verified the refreshed synthetic `:3465` browser map at the compact 653×550 viewport; Workspace reports Offline and the assigned planner alone reports Review needed. Production `:3460` was not touched.
- Verification: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, focused browser inspection, and scoped `git diff --check`.

### Compact Messages list visibility — 2026-09-25

- The narrow no-thread Messages view was clipping its conversation list to 32% of the workspace height even though a conversation row existed below that boundary. Removed the cap for the no-thread state so the list fills the available panel and remains scrollable.
- Verified in the refreshed `:3465` preview: the conversation row and its title, project, timestamp, and latest-message preview are visible without selecting a thread. Production `:3460` was not touched.
- Verification: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, focused browser inspection, and scoped `git diff --check`.

### Mobile action clearance — 2026-09-25

- Inbox and Work content now reserve safe bottom space above the fixed mobile navigation. Long decision/task lists remain scrollable instead of ending underneath the navigation bar.
- Verified in the refreshed `:3465` preview: Inbox has a scrollable content region with 86px bottom clearance; the current review action remains visible and the remaining record is reachable by scrolling. Production `:3460` was not touched.
- Verification: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, focused browser inspection, and scoped `git diff --check`.

### Mobile project reachability — 2026-09-25

- The Projects surface now reserves the same safe bottom clearance as Inbox and Work. The final project card and its open/settings actions remain reachable above the fixed mobile navigation.
- Verified in the refreshed `:3465` preview: the project grid has 86px bottom padding and a scrollable content height; both saved projects are present in the accessibility tree. Production `:3460` was not touched.
- Verification: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, focused browser inspection, and scoped `git diff --check`.

### Mobile Agent Studio reachability — 2026-09-25

- Agent Studio now reserves safe bottom space above the fixed mobile navigation, so the selected teammate’s role, readiness, assigned work, process actions, and runtime inspection control remain reachable by scrolling instead of being hidden behind the nav.
- Verified in the isolated `:3465` preview with the compact viewport; production `:3460` was not touched.
- Verification: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, focused browser inspection, and scoped `git diff --check`.

### Command Room signal clarity — 2026-09-25

- Reworked the Team Room header signal so it leads with the action, `Open the live team map`, and changes its supporting line to the actual state: verified runs, decisions waiting, or a quiet assignment map. Raw profile/run counters no longer dominate the primary action.
- Verified the refreshed isolated `:3465` Command Room and kept the production `:3460` surface untouched.
- Verification: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, focused browser inspection, and scoped `git diff --check`.

### Mobile Harness reachability — 2026-09-25

- The Harness execution path now reserves safe space above the fixed mobile navigation, keeping the lower Verify, Keep proof, and follow-up controls reachable in the scrollable surface.
- Verified the isolated `:3465` Harness view at the compact viewport; production `:3460` was not touched.

### Workspace keyboard focus polish — 2026-09-25

- Added a consistent visible focus ring for primary workspace navigation, project switching, search, workspace mode, and mobile navigation controls so keyboard users can track the active control against the dark glass UI.
- Verification: `pnpm build`, `node scripts/workspace-ui-acceptance.mjs`, and scoped `git diff --check`.
