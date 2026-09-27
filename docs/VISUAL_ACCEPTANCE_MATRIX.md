# AgentForge Visual Acceptance Matrix

Use this after a focused workflow is complete. It prevents a source-backed screen from being treated as polished solely because its happy path renders.

## Shared checks for every primary screen

| Check | Evidence required |
| --- | --- |
| Desktop | Browser check at a normal desktop width; headings, actions, and primary records are visible without horizontal clipping. |
| Narrow screen | Browser check at 390px; primary action remains visible and controls wrap or scroll intentionally. |
| Loading | A short, specific loading state names the records being checked. |
| Empty | Empty state explains what is absent and gives one relevant next action. |
| Error | Error explains that data could not be checked, does not imply success, and provides retry. |
| Disconnected | Connection-dependent surfaces say exactly what is disconnected; no simulated live activity or availability claim. |
| Keyboard | Interactive controls are reachable, named, and retain visible focus. Dialogs use modal focus management. |
| Source honesty | Counts, states, charts, and “next” recommendations come from saved/API records. Fixtures are visibly labelled. |

## Screen matrix

| Surface | Populated proof | Empty/disconnected proof | Primary outcome |
| --- | --- | --- | --- |
| Command Room | Saved attention, active work, and teammate roster are source-backed. | Clear workspace state does not invent activity. | Operator sees what requires judgment first. |
| Messages | Thread list, project context, composer, attachments, and focus view render. | No-route state preserves local drafting and states why no reply can be generated. | Conversation stays attached to project context. |
| Inbox | Highest-priority saved record appears in **Start here** and opens the matching review/task/activity record. | “All clear” appears only when the inbox API returns no records. | Operator can act without scanning a dense list. |
| Team Room | Saved teammate profile, task count, attention status, and current assigned work are displayed. | No teammates is an honest roster state, not simulated agent activity. | Operator can inspect who owns saved work. |
| Projects | Project cards, state snapshot, Project Pulse, conversations, files, and work sections agree on canonical project ID. | No project gives one create action; read-only file references do not imply model access. | Work, evidence, files, and chats stay grouped. |
| Work Board | Filters, recommended task, lane state, task detail, and task state chart agree. | Empty lanes collapse without hiding that they are empty. | Operator can select the next saved task. |
| Task Review | Boundaries, plan, changes, evidence, activity, and approval controls use the current task record. | Offline execution disables run controls with a clear setup path. | Evidence is inspected before approval or execution. |
| Review Desk | Earliest/most-important pending request is promoted and focused by **Open next review**. | No pending decision does not show approval controls. | Human decision is explicit and auditable. |
| Models & routing | Configured route, provider implementation status, and evaluated route remain distinct. | No provider does not transmit text or imply a model response. | Operator understands configuration versus live verification. |
| Runtime & compute | Readiness ring, gate list, worktree/sandbox state, and host telemetry match API values. | Missing execution capability states that execution is blocked. | Safe execution readiness is visible without a fake green state. |

## Release gate

For a changed primary surface, record the tested state, viewport, fixture or real local source, date, and result in `TERRA_COMPLETION_PLAN.md`. Run `pnpm build` before browser acceptance. A visual fixture does not prove a production integration, command execution, model response, or external connection.

## Startup and navigation integrity

| Check | Evidence required |
| --- | --- |
| Initial render | On first load, selected navigation item matches the visible page and the main canvas is populated with content, a specific loading state, or a useful error. A blank canvas is a failure. |
| Route changes | The destination view renders after navigation; asynchronous loads do not leave the prior title paired with an empty or mismatched body. |

