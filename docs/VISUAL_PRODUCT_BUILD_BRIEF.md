# AgentForge Visual Product Build Brief

**Audience:** Terra implementation pass  
**Status:** Approved design direction; build against existing functionality rather than inventing fake activity.  
**Product bar:** A polished local-first agent harness with the confidence and clarity of Codex, the persistent teammate feel of Grok Bot, and the visual operational awareness of an agent command center.

## 1. The product experience to build

AgentForge is a place where a person can see their AI team, give work to a teammate, follow the work without reading logs, and review a real result. It must not feel like an analytics dashboard, a generic chatbot, or a neon “AI control panel.”

The first screen must answer, in this order:

1. **What needs me now?** — approvals, failures, questions, and decisions.
2. **What is my team doing?** — people-like agent presence and concise active work.
3. **Where is my work?** — projects, threads, tasks, evidence, and files.

The detailed technical record belongs one click deeper in an inspector. A nontechnical person must be able to operate the main screen without learning model, trace, tool, or infrastructure vocabulary.

## 2. Visual language

### Palette and surfaces

- Keep the existing near-charcoal base with lavender as the primary action color. Do not replace it with black-and-neon cyan.
- Use 3 surface elevations only: app canvas, navigation/inspector, and raised card/dialog.
- Use color to signal state, never merely decoration: lavender for selected/primary; mint for verified/success; amber for waiting/attention; red for blocked/failed; muted gray for inactive.
- Use thin, low-contrast borders and restrained shadows. Avoid an outlined box around every element.

### Type, spacing, and density

- Use a compact 8px spacing rhythm with 12/16/24/32px composition steps.
- Titles should be calm and readable, never dashboard-shouty. Metadata is smaller, muted, and aligned.
- The default screen is comfortable at a 13–14px body scale. Tables and traces may use a denser 12px mode.
- Icons need adjacent labels wherever there is room. Never make a primary navigation system icon-only.

### Graphics that earn their place

- The **Team Room topology** is the primary signature graphic: live agents as calm nodes with a readable assignment line and a selected-agent detail card. It needs purposeful motion only for real activity.
- Use a task **progress rail** (plan → work → verify → review) and small evidence/check indicators instead of giant KPI charts.
- Use lightweight state rings/progress arcs only when derived from real task/project state.
- Empty states use subtle line illustrations or structured placeholders, never stock robot art or fake metrics.

## 3. Global shell

### Desktop: three adaptable regions

1. **Left rail (240–280px):** product mark, project switcher, clear navigation labels, team shortcuts, and a compact “new” action.
2. **Main canvas:** changes by selected area; heading, contextual action, and content live here.
3. **Context inspector (320–380px):** hidden by default on broad list screens, open by default when reviewing a task/run; contains provenance, current agent, environment, decisions, and evidence.

The inspector must be independently collapsible. The user should never lose the central conversation or review surface to permanent sidebars.

### Mobile and narrow screens

- Bottom navigation includes **Home, Team, Work, Inbox, More**.
- The active work surface remains full width. Inspector content becomes a sheet.
- Composer, review actions, and a “jump to latest” affordance remain reachable above the keyboard.
- Do not simply squeeze a desktop three-column layout into a phone viewport.

## 4. Screen contracts

### Home: “Today”

Layout:

- A calm greeting/state line with the active project switcher.
- One **Needs your decision** queue at the top. Each item exposes impact, source agent, and clear Review / Dismiss controls.
- **Team at work** beneath it: 3–6 live agent cards, actual status only, each opening that agent’s durable conversation.
- **Continue working** shows threads/tasks the user recently touched.

Do not show empty KPIs, provider details, fake task counts, or a giant dashboard chart.

### Team Room

This is the differentiator, not a decorative graph page.

- Center: topology canvas that represents stored agents and their actual open assignments.
- Nodes display name, specialty, state, and one-line current focus. Clicking a node selects it and opens an adjacent agent card.
- The agent card exposes: Start conversation, View work, Boundaries, Memory sources, and recent evidence.
- A switch provides **Room** (visual topology) and **Roster** (accessible, filterable list). The list is first-class, not an afterthought.
- The Team Room may use polished animated topology and dimensional graphics. Motion that implies execution, message flow, or progress must be driven by a real saved/runtime event; offline ambience must be labeled and visually distinct from live work. Reduced-motion preferences must stop decorative loops.

### Project workspace

Tabs: **Overview, Threads, Work, Files, Activity**.

- Overview has a short project brief, the real project state rail, active work, and decisions waiting.
- Threads shows durable conversations grouped by recency, pin state, and agent.
- Work shows task cards with state, owner, the next checkpoint, and proof—not JSON.
- Files presents deliberately attached, read-only project files with source/path clarity.
- Activity is a readable timeline. Technical audit detail is available in the inspector.

### Conversation

The conversation view should feel like a professional collaborative workspace:

- Header: agent/team name, thread title, active run state, and compact project breadcrumb.
- Message stream: clear distinction between human messages, agent answers, collapsible work updates, tool/evidence cards, and approval requests.
- Work updates render as a single evolving card; do not flood the transcript with repeated status lines.
- Composer supports attachments, reply, edit, search, stop while generating, and a visible provider/problem state. Hide backend IDs and “writing variant” fields from the user.
- Right inspector (when opened): task plan, sources/files, run trace, model route, evidence, and recovery details.

### Task review

- Header states the task outcome in plain language: Ready for review, Needs input, Verification failed, or Complete with evidence.
- A visual progress rail shows the actual last completed stage.
- Review body uses tabs/sections: Summary, Changed files, Checks, Evidence, Decisions.
- Approval and rejection buttons include a human-readable consequence. No command executes from a visual preview alone.
- Contract/boundary editing belongs in a focused dialog, with the approval invalidation notice visible before saving.

### Connections and settings

- Present as deliberate setup cards with status, scope, and a single next action.
- Do not show API secrets back to the user; state whether a connection is configured without leaking it.
- Advanced model, runtime, tool, memory, and benchmark controls are grouped under **Manage**.

## 5. Component standards

| Component | Required behavior |
|---|---|
| Agent card | Name, specialty, source-backed state, current work, one primary action. Never seeded “working” state. |
| Task card | State, owner, next checkpoint, updated time, evidence/check count. Selecting opens the actual task record. |
| Status chip | Text plus color; never color alone. |
| Evidence card | What changed, source, timestamp, verification result, expandable raw detail. |
| Empty state | Explains why it is empty, gives one useful next action, and does not pretend a connector is live. |
| Loading state | Skeleton matching the eventual layout; no endless spinner without context. |
| Error state | Clear problem, retained user input, Retry where safe, diagnostics in disclosure. |
| Dialog | Focus trap, Escape close where safe, named primary action, mobile sheet treatment. |

## 6. Interaction and motion rules

- Motion is 150–220ms for interface transitions and respects reduced-motion settings.
- Preserve drafts, scroll position, filter state, and selected item across normal navigation.
- Asynchronous work always has a visible phase: queued, running, waiting, verifying, needs review, failed, or complete.
- On a failure, keep the partial record and offer recovery; never silently clear the user’s work.
- Keyboard: command palette, global search, new thread/task, focus composer, and review queue navigation.

## 7. Build order for Terra

1. **Shell and hierarchy:** normalize the shared shell, navigation labels, inspector behavior, typography, surfaces, focus states, and responsive rules.
2. **Conversation parity:** finish the usable chat interaction contract before adding decorative screens.
3. **Project and task review:** real thread/task/evidence workflow, readable at desktop and mobile widths.
4. **Team Room:** replace any leftover cyber/simulation presentation with the purposeful topology + roster system.
5. **State matrix:** populated, empty, loading, error, disconnected, and permission-limited states for every primary surface.
6. **Final visual QA:** inspect desktop and narrow layouts, keyboard flow, reduced motion, contrast, and actual connected/disconnected state.

## 8. Non-negotiable acceptance checklist

- A new user can tell what is active and what needs approval in under ten seconds.
- A user can find an agent’s conversation, current work, plan, source files, evidence, and next decision without reading a raw trace.
- All visible activity is source-backed. No seeded work is presented as live.
- The main workflow works with keyboard, at narrow viewport widths, and under loading/failure conditions.
- Each primary screen has intentional hierarchy, one main action, and a calm empty state.
- The build retains execution contracts, approvals, provenance, and disconnected-provider honesty.

## 9. Current implementation map — do not rebuild the wrong layer

The current UI is already split into focused client modules. Terra should extend these modules and the shared theme rather than placing another full UI template into `webServer.ts`.

| Area | Current source | Implementation instruction |
|---|---|---|
| App shell and shared styling | `src/server/ui/workspaceApp.ts`, `src/server/ui/workspaceTheme.ts` | Normalize navigation, layout regions, shared states, typography, responsive rules, and focus treatment here. |
| Conversations | `conversationClient.ts`, `messageClient.ts`, `responseClient.ts`, `draftClient.ts` | Preserve streaming, stop, draft persistence, editing, branching, attachment preview, search, and project grouping. Improve the visual hierarchy and finish state handling; do not regress these behaviors. |
| Projects and files | `projectClient.ts`, `projectFilesClient.ts`, `src/server/projectFiles.ts` | Build the project workspace tabs around canonical project/task/file data. Keep file access explicit and read-only unless a separately approved execution path grants more. |
| Work and review | `workboardClient.ts`, `evidenceClient.ts`, `src/core/runtime/approvedPlanProvider.ts` | Make task state, evidence, boundaries, approval, and verification visually legible. Never portray planning as execution. |
| Team Room | `teamClient.ts`, `roomMapClient.ts` | Evolve the existing topology into the purposeful Room/Roster experience. Remove or avoid simulated cyber activity. |
| Goals, memory, history | `goalClient.ts`, `memoryClient.ts`, `activityClient.ts` | Keep the compact visual summary in the main canvas; preserve detailed history for an inspector or expandable view. |
| Connections and control plane | `connectionsClient.ts`, `preferencesClient.ts`, `src/server/conversationRuntime.ts` | Present verified provider status and setup actions clearly. Do not imply that an unconfigured route is live. |
| Server integration | `src/server/webServer.ts` | Keep this as routing and canonical-data integration. Do not return to the historical monolithic embedded UI. |

Before a broad visual pass, inspect the existing client module and its rendering tests. The repository already contains `scripts/workspace-ui-acceptance.mjs`, `scripts/chat-stream-acceptance.mjs`, `scripts/project-files-acceptance.mjs`, and `scripts/evidence-ui-preview.mjs`; update or add narrow checks when changing their corresponding workflow.

## 10. Rendered visual audit — September 24, 2026

This review was performed against the current local preview, using only its explicitly labeled saved/local fixture data. These are design defects to correct, not claims about missing backend functionality.

### Work board

Observed: the board has good raw elements—clear filters, a new-task action, lanes, task cards, and an offline disclosure—but the primary status graphic reads as disconnected horizontal bars. The empty lanes dominate the canvas, while the one actionable task is visually small. The title and count do not answer what decision or next step matters.

Required correction:

- Replace the abstract status graphic with a compact real progress rail and a top **Needs your attention** strip when applicable.
- Give actionable task cards stronger hierarchy: task title, owner, next checkpoint, evidence/check state, then secondary metadata.
- Collapse or visually de-emphasize empty lanes when they contain no meaningful task state; retain a deliberate way to reveal them.
- Keep the current honest offline disclosure, but put it beside execution actions rather than making it the main explanatory copy.

### Command Room

Observed: it has a strong dark foundation and a real saved-data disclosure, but its first viewport leads with four counters and a very large workspace map. With one profile and one task, the screen looks sparse and administrative. The meaningful work queue and review area are below the fold. The map has potential, but the default presentation is too large for the amount of live content.

Required correction:

- Reorder the page: **Needs your decision** first, then **Team at work**, then a compact **Continue working** area.
- Make the map responsive to data density. With only a few saved nodes, use a compact relationship card beside the roster; reserve the full canvas for the dedicated Team Room/Topology experience.
- Convert counters into small supporting facts within the relevant sections. Do not lead with four metric cards unless there is enough real activity for them to be decision-useful.
- Surface each roster agent’s current assignment or clear idle/connection state. Keep the one-line explanation and source-backed status.
- Retain the real event ledger, but show a summarized last meaningful event instead of a repeated wall of identical system blocks.

### Cross-screen rule

The current UI already has the right restraint in color and typography. The redesign must improve **information order and data-density behavior**, not add decorative effects. A sparse workspace should look calm, intentional, and ready to use—not like a dashboard with missing data.
