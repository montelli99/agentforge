# AgentForge takeover handoff for Antigravity

**Prepared:** 2026-09-23 (America/New_York)  
**Project:** `C:\Users\mscott\AI_Workspace\AgentForge-Staging`  
**Current branch:** `vnext` (verify before acting)  
**Purpose:** Continue the owner's AgentForge build in the project, with Astra/Antigravity leading implementation and visual design. This handoff is the durable source of the requirements given in the recent work session; do not rely on the previous chat remaining available.

## Owner's goal

Finish AgentForge as a dependable, model-independent agent harness and command center, take it open source, and create a marketplace that can support agents for multiple business verticals and become a revenue source. The owner wants the complete system, not another plan, demo-only page, audit-only pass, or feature list. Use the existing code and all authoritative specs; extend what is already there. Work through the remaining requirements without waiting for the owner to restate them. Keep the product usable and understandable by a nontechnical operator.

The owner is moving the build to Antigravity because Codex consumed too much paid usage while repeating audits and small test passes without delivering a working harness or the requested UI. Use Astra for the high-judgment design/build work if available in Antigravity. Luna has repeatedly produced poor results for this owner on complex tasks. Do not ask the owner to change model settings as a prerequisite. Keep decisions and process in shared project files so any IDE/model can continue.

## Critical design direction: interactive command room

The owner explicitly rejected the current local harness UI as ugly and inadequate. They want **Obsidian-level visual quality** and a distinctive, competitive command center, inspired by the real-time agent dashboards and interactive agent “boardroom” examples they shared. It must look like a premium product that could attract open-source adopters and marketplace customers, not a generic admin template.

References supplied by the owner:

- xAI Agent Dashboard: <https://x.ai/news/agent-dashboard>
- SquareBootstrap real-time agent dashboard article: <https://dev.to/squarebootstrap/building-a-real-time-ai-agent-dashboard-in-angular-21-how-we-used-signals-onpush-to-ship-a-4hin>
- Its live demo, which the owner signed into and was viewing: <https://squarebootstrap.com/agentops/dashboard-v1>
- The owner asked to compare Codex, Grokbot, Open Harness, and Deepseek Harness UIs and capabilities as well.

Research and screenshots must be performed and recorded, not claimed from memory. Research current products available in September 2026, their workflows and differentiators, and user complaints from Reddit/forums about harnesses and agent behavior. Preserve the user's browser tabs and signed-in demo state; do not close or repurpose their tabs while doing the research.

Design requirements:

- A responsive, readable command room where the user can visibly understand what each agent is doing now, what it is waiting for, and what changed.
- An interactive agent floor/boardroom: select an agent to inspect its assigned task, live tool activity, model/harness, run status, recent transcript, evidence, cost/latency, and controls. Agents must appear active only when real execution events say so; no fabricated live activity or decorative fake status.
- A live work queue and timeline tied to durable run/task events. Clear states for ready, running, paused, waiting for review, blocked, failed, and completed. Actions such as start, pause, resume, cancel, delegate, approve/reject must invoke real backend behavior and report truthful outcomes.
- Command center should foreground useful information and decisions, with strong typography, hierarchy, spacing, keyboard/accessibility support, responsive layouts, and clear empty/error/loading states. Avoid tiny terminal-like text, cramped narrow panels, jargon-only labels, and fake metrics.
- Include operational quality signals: actual success/verification rates, retries, tool failures, latency, model/token/cost use, user corrections, regression findings, and task evidence. Drill from every aggregate into its source runs.
- Add model/harness performance drift monitoring: run fixed, versioned evaluation suites; compare model/harness versions against a baseline; record corrections and regressions; detect hallucination/unsupported claims and tool misuse; recommend containment/fallback and make any automatic quarantine/rollback policy explicit and auditable. Never show unmeasured scores as fact.
- Marketplace experience must distinguish draft/local/unverified packages from signed, reviewed, installable publisher offerings. It should support the intended multi-vertical ecosystem and a clear economic model, but no real payment or publishing action without explicit owner authorization.
- The user prefers natural-language operation at the front end. Backend IDs and technical controls may exist, but ordinary use should not require memorizing slash commands or codes.

## Current runtime facts to verify before modifying

- The owner currently has a browser tab open at `http://127.0.0.1:3460/`. **Do not close, navigate, restart, or take over this tab.**
- On 2026-09-23, port 3460 was served by `node.exe dist/server/start.js`. Its live `/api/harnesses` response reported `NOT_CONNECTED`, `canExecuteTasks: false`, `workerCount: 0`; the Pi and Native entries were test/simulation fixtures and Pydantic was unconfigured. It explicitly said tasks are stored but no work is running. Recheck current process/API before relying on this snapshot.
- The current app is not the accepted final UI. The owner says the visible harness UI looks horrible and does not match the agreed dashboard/boardroom direction.
- Earlier Codex work began an unreviewed, partial worker patch and removed it before handing off. Treat the repo state as authoritative; do not assume a task worker was delivered. There is no proven live model-to-worker-to-tool-to-evidence workflow.
- The default task contract in `src/core/store/workspaceStore.ts` denies all paths (`protectedPaths: ["**"]`) and requires an isolated worktree. `src/core/contract/contractEnforcer.ts` has lexical/path and shell-pattern checks, but these are not an OS sandbox. `WorktreeManager` exists but is not wired into the task execution lifecycle. WSL was inspected and found to run as root with Windows files mounted, so it is **not** a safe sandbox.
- The Pi dependency is installed, but `src/providers/harness/piHarness.ts` is a test fixture and does not integrate it. The Native/Pydantic harnesses are also not production execution backends. Do not enable Pi's default bash/write tools without routing every effect through AgentForge contracts and a genuine isolation boundary.
- The existing ModelRouter/model providers are not wired into the server's task lifecycle. Confirm which provider credentials/configuration are available without printing secrets. Do not assume that a model key means a safe/usable worker exists.
- The generated documentation set is in `AgentForge-Staging\all_markdown_files\` and mirrored in `AI_Workspace\all_markdown_files\`. It was reported as 54 source Markdown files plus `INDEX.md`; the master autonomous roadmap contains sections 0–49 (50 sections). The user's earlier “48 Markdown files” may refer to a distinct numbered bundle. Find and reconcile the actual source bundle and preserve distinct spec families. A file inventory, title/index, or review register is not proof that the requirements were read, implemented, or verified.
- `docs/requirements/MARKDOWN_REVIEW_REGISTER.md` and `IMPLEMENTATION_TRACEABILITY.md` are useful starting maps, but they explicitly leave major features incomplete. Re-read/update them from source evidence as implementation progresses.
- The repository has extensive pre-existing staged/unstaged/untracked owner work. Preserve it. Do not reset, clean, stash, overwrite unrelated changes, switch branches, or modify the OpenClaw production checkout. Build only in `AgentForge-Staging` unless a specific shared document is intentionally placed in the parent `AI_Workspace`.

## Work the owner expects next

1. **Take ownership of implementation.** Begin coding in `AgentForge-Staging`; do not return another long audit in place of product work. Inspect the source bundle and specs by content, capture the exact acceptance criteria, then implement the product path through the existing architecture.
2. **Replace the rejected UI.** Research the references above, record source URLs/screenshots and a concise feature comparison, then build the command room/agent boardroom described above into the actual app entrypoint. Do not leave the better-looking design as an unwired static HTML file. Keep browser state intact and test the rendered app visually and interactively.
3. **Make agent work real.** Wire model routing, agent identity/policies, task queue, contract-checked tools, genuine OS isolation, pause/resume/cancel, durable events, output, verification and evidence into one end-to-end workflow. A task must never be called “done” merely because a plan or model response exists. The UI, Telegram/API controls, and persisted state must agree about what ran.
4. **Build quality/drift into the harness.** Each real run should produce traceable evaluation evidence. Record model/harness version, input, tool events, outcome, checks, cost/latency/tokens where known, user corrections, and regressions. Compare with a fixed baseline and make drift visible/actionable.
5. **Complete the open-source/marketplace path.** Map package authoring, validation, permission review, publisher verification, install/update/rollback, vertical templates, marketplace UX, and revenue accounting to the specs. Clearly identify decisions that require the owner's legal, license, pricing, or production-access input. Do every independent implementation item first.
6. **Verify the actual workflow.** After implementation (not instead of it), run focused tests once, full checks once, build and packaged-launcher acceptance, browser click-through/visual QA, and an overnight soak if the environment supports it. Store logs/screenshots/evidence and distinguish local-only from live-provider/production proof. Avoid repeated paid model calls and redundant test cycles.
7. **Report only finished evidence.** The owner wants the app ready to inspect, not a promise. Tell them which workflow is now usable, where to open it, what checks passed, what remains blocked, and why. Do not say “100% complete” while a required item remains unimplemented or unverified.

## Useful project files

- Master goal/spec: `docs/requirements/AUTONOMOUS_MASTER_BUILD_GOAL.md`
- Full roadmap: `docs/requirements/COMPLETE_AUTONOMOUS_ROADMAP.md`
- Release goal: `docs/requirements/RELEASE_CANDIDATE_GOAL.md`
- Validation/migration/release: `docs/requirements/VALIDATION_MIGRATION_RELEASE_GOAL.md`
- Completion engine spec and traceability: `docs/requirements/COMPLETION_ENGINE_SPECIFICATION.md`, `docs/requirements/COMPLETION_ENGINE_TRACEABILITY.md`
- Markdown review register: `docs/requirements/MARKDOWN_REVIEW_REGISTER.md`
- Implementation traceability: `docs/requirements/IMPLEMENTATION_TRACEABILITY.md`
- Competitive UX research: `docs/COMPETITIVE_HARNESS_UX.md`
- Agent quality flywheel: `docs/AGENT_QUALITY_FLYWHEEL.md`
- Current server/API/UI: `src/server/webServer.ts`, `src/server/start.ts`
- Task types/store/contracts: `src/core/types/task.ts`, `src/core/store/workspaceStore.ts`, `src/core/contract/contractEnforcer.ts`, `src/core/worktree/worktreeManager.ts`
- Harness/model adapters: `src/providers/harness/`, `src/providers/models/`, `src/providers/models/modelRouter.ts`
- Generated Markdown catalog: `all_markdown_files/INDEX.md` (use only as an index; go read canonical source docs)

## Communication and operating constraints

- No micro-updates or repeated “I’m checking” messages. Work in coherent batches and show concrete outcomes.
- Do not burn model credits proving the same fact repeatedly. Gather evidence once, implement, then perform the minimum meaningful verification for the actual workflow.
- Do not ask the owner to restate settled requirements. Continue independently and surface only a real external/owner decision that prevents the next step.
- Do not store critical process solely in chat memory. Keep this handoff and repeatable procedures in shared project files.
- Protect credentials and personal/business data. Never print secrets, commit live credentials, or contact/publish/deploy/charge anyone as part of this build without explicit authorization.
- Preserve existing user browser tabs, particularly the signed-in dashboard example and the local AgentForge page.

## First Antigravity action

Open this handoff and the canonical project files above, verify the live app and source state, then proceed directly to the command-room redesign plus the worker/runtime implementation. Update this file and the traceability matrix as real capabilities land. Do not stop after making a design plan or a static mockup.
