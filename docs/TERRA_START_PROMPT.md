# Terra Startup Prompt — AgentForge Staging

Current verified visual pass (September 25): Command Room and Messages fit their key actions at 653×550. Team Room has an animated orbital relationship graphic and a compact short-screen layout verified at 653×550; motion is ambient unless a process-backed task is actually running, and reduced-motion preferences are honored. Build and focused workspace UI acceptance passed. Isolated in-memory preview: `http://127.0.0.1:3465/`. See the newest entry at the top of `docs/TERRA_COMPLETION_PLAN.md` for evidence. Port 3460 remains untouched.

Continue the existing AgentForge product in its dedicated staging repository. Do not start over. Preserve the dirty worktree and existing architecture. Do not reset, stash, switch branches, commit, publish, or connect any personal/live integrations.

Use this startup prompt as the compact handoff. In `docs/TERRA_COMPLETION_PLAN.md`, read only the **CURRENT EXECUTION HANDOFF** at the top, the relevant remaining-plan section, and the newest entries for the screen being changed. The rest is a historical evidence log; do not load the whole file or old conversation. Read the exact sections of `docs/VISUAL_PRODUCT_BUILD_BRIEF.md` and `docs/VISUAL_ACCEPTANCE_MATRIX.md` that apply to the next screen. Open `CODEX_HANDOFF.md` only when a specific earlier interaction needs its detailed evidence.

Your job is to finish the existing generic, open-source product—not an offline mock dashboard. Build a polished, graphical, local-first harness with durable agent conversations, projects, task execution/review, evidence, and honest connection status.

## Current visual checkpoint — preserve this work

Do not redesign or remove these completed, source-backed interaction improvements while working on the remaining vertical workflows:

- Command Room prioritizes saved review/failed-work attention, then active work and saved teammate state.
- Work Board has a recommended next task and visually collapses empty lanes.
- Team Room is based on saved teammates, real task counts, and source-backed attention state; it is not a simulated agent canvas.
- Project Pulse, Conversation starters, Runtime readiness, Review Desk, and Inbox **Start here** are present and visually verified with in-memory fixtures.
- Inbox sorts saved critical, warning, then informational records and routes to the corresponding review, task, or activity record without mutating anything.

The full evidence and implementation file list is in `docs/TERRA_COMPLETION_PLAN.md`. Preserve the charcoal/lavender styling and the explicit disconnected/fixture labels.

## Product direction

- Keep the charcoal/lavender visual system. Make it calm, polished, readable, and information-dense.
- Build the first screen around **Needs your decision**, **Team at work**, and **Continue working**.
- Preserve the Team Room as a purposeful visual graph plus accessible roster. Never show simulated work, fake metrics, cyber effects, or raw backend data as a default surface.
- Match Codex-style project/thread/review flow: conversations live in projects; work, plans, evidence, files, and approvals stay attached to their real task/project.
- Keep technical traces in an inspector, not in the primary workflow.
- Every primary screen needs populated, empty, loading, error, disconnected, desktop, and narrow-screen treatment.

## Archived continuation snapshot — 2026-09-24

- Continue the full product and visual audit; do not restart the design or treat the current UI as finished.
- Latest Work Board checks: the empty state has one clear create-task action; populated ready tasks correctly show when execution is offline. Browser checked on isolated previews; build and UI acceptance passed.
- Populated Work Board now puts the actual next task before filters, expands a single active lane, and compresses the stage summary on short mobile screens. Verified at 653×550 with clearly labeled in-memory fixture data; see the latest evidence entry in `TERRA_COMPLETION_PLAN.md`.
- A new chat now has an outcome/context/evidence guide with original artwork on roomier layouts and a compact cue on short phones; verified at 653×550. No fake transcript was added.
- Team Room execution availability now uses full content width, readable sans-serif copy, the actual offline/connected state, and stacks below 900px; isolated mobile preview, build, and acceptance check passed.
- Command Room replaces unlabeled status dots and duplicate counts with saved-data review/open-work/execution tiles; browser checked at 653×550, build and acceptance passed.
- New conversation creation requires an explicit project and filters channels to it. If the project has no active channel, the dialog can add a private “General” channel directly, then enables conversation creation. The message Send button remains disabled for an empty draft, and the composer hides its route helper when the header already explains local-only mode. Build, UI and chat-stream acceptance passed; both interactions are browser-verified in the isolated fixture.
- First-time project creation asks only for a name; optional instructions, description, and repository reference are tucked under an accessible disclosure. On success, the UI opens that project's overview. Build, workspace UI, and project-files checks passed; browser-verified with an in-memory fixture.
- Shared legacy controls, chat affordances, navigation cards, and scrollbars now use the charcoal/lavender tokens consistently; focus rings remain visible and reduced-motion preferences are honored. Build and workspace UI acceptance passed; the harness readiness screen was inspected on the isolated preview.
- The project workspace now hides Overview resource shortcuts on other tabs and moves content up below project navigation. The harness now distinguishes a disconnected task execution backend from conversation model setup; its “Check environments” action opens the live availability screen. A stale `dist` build made the preview show the old “Choose model” CTA; after rebuilding and restarting only the 3465 fixture, browser accessibility state confirmed the correct current UI. Build and focused acceptance passed; 3460 was untouched.
- Harness artwork now remains visible as a compact path graphic at tablet widths (521–700px), while staying out of the way on narrow phones. Responsive acceptance assertions, build, and focused UI acceptance passed; isolated preview only.
- Rebuilt 3465 browser workflow audit confirmed Messages and Work expose the expected project/chat controls, message actions, filters, and saved task states; execution is offline and fixture data labeled. Screenshot capture failed, leaving pixel-level tablet QA unverified. Continue with other high-impact surfaces and obtain visual evidence when browser capture works.
- Shared navigation now has a lavender active-route edge, subtle gradient, and visible keyboard focus; build and focused UI acceptance passed. Browser capture/click became unreliable this pass, so visual appearance remains unverified.
- Read the newest entries in `docs/TERRA_COMPLETION_PLAN.md` for completed work and evidence. Then inspect the remaining route and responsive gaps in `docs/VISUAL_PRODUCT_BUILD_BRIEF.md` section 10 and continue with the highest-impact real workflow defect.
- Keep port 3460 and all live workspaces untouched. Do not connect personal services or use demo records as real activity.

## Current continuation point — 2026-09-25

- The owner reports that progress updates have repeated the same Team Room work. Treat the newest `CURRENT EXECUTION HANDOFF` in `docs/TERRA_COMPLETION_PLAN.md` as the only current status; entries under `archived checkpoints` and this older snapshot are history, not instructions to repeat.
- Team Room desktop/short-screen layout and roster are already implemented and browser-checked. Do not repeat that slice unless a fresh browser check finds a regression.
- This assistant does not keep coding between turns. Never imply Terra or another model has worked in the background unless a live task/process proves it. Verify file timestamps, process state, browser state, and checks before reporting progress.
- The full UI goal remains open. Continue with the highest-impact unverified workflow from the remaining plan (conversation recovery/state handling, canonical project-to-task flow, or generic execution/evidence path); make a source change before reporting progress, then run only the focused verification for that change.
- Preserve the existing dirty worktree and the isolated `:3465` preview. Keep production `:3460` and live services untouched.

## Low-context continuation

Use this file plus only the relevant completion-plan entries and source files; do not carry the full conversation transcript into the next model/task. Keep progress notes concise and batch related UI changes before reporting. To reduce usage, use Luna with low reasoning for narrow reversible edits, run one build plus focused acceptance after a batch, and defer broad suite/release checks to the final gate. Use Sol for coordinated implementation and reserve Astra for high-judgment visual direction/review. The model picker and reasoning level are controlled by the Codex client, not this repository. JEv is not attachable to this Codex turn unless it is exposed as a supported Codex model/provider; it can run in AgentForge after the harness routes it.

## Working method

- Extend focused modules under `src/server/ui/`; do not put a second UI template in `webServer.ts`.
- Complete vertical workflows before cosmetic additions.
- Use existing canonical storage/API relationships. Do not infer project/task links from names.
- Do not claim a provider, execution backend, model response, or external connection is active unless the exact action was verified.
- Run focused checks for changed workflows; reserve broad release checks for the final gate.
- After each meaningful batch, update `docs/TERRA_COMPLETION_PLAN.md` with what is actually implemented and tested, including limits.

The visual source of truth is `docs/VISUAL_PRODUCT_BUILD_BRIEF.md`; the exact source-module map is in section 9 and the rendered visual defects are in section 10.
