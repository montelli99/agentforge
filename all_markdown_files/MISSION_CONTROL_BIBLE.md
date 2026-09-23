# Mission Control Bible

Authoritative operating manual for task continuity across session resets and gateway restarts.

## 1) Mission Rules (Always)
- Mission Control is source of truth for active work.
- Do not rely on chat memory alone.
- On every run, hydrate from checkpoint files first.
- Before context overflow or session reset, write a handoff update.

## 2) Startup Ritual (Every New Session)
1. Read `openclaw-mission-control/docs/runtime/MULTIAPP_CHECKPOINT.md`.
2. Read `C:/Users/mscott/.openclaw/OVERNIGHT_STATUS.md`.
3. Resolve current app path + objective from those files.
4. Resume from `Next Action` exactly.

If files disagree, prefer `MULTIAPP_CHECKPOINT.md`.

## 3) Mission Control Update Contract
Update both checkpoint files at each major step with:
- Active app path
- Objective
- Active PID(s)
- Real metrics (counts/sizes/timestamps)
- Next Action
- Blockers + one unblock step

Write style:
- Factual only, no guesses
- Include concrete file paths
- Keep updates concise and append-only where possible

## 4) Context/Reset Safety
When context is high (about 85%+) or before `/new`/restart:
1. Write a concise handoff to both checkpoint files.
2. Include exact command/file to run next.
3. Include active process IDs that must not be killed.

## 5) Mission Control API (Primary Mode)
Use API-first mode whenever backend health is OK.

- Base URL: `http://localhost:8000`
- Auth mode: local bearer token
- Token source: `C:/Users/mscott/AI_Workspace/openclaw-mission-control/.env` (`LOCAL_AUTH_TOKEN`)

Startup API checks (must pass before work starts):
1. `GET /healthz`
2. `GET /api/v1/boards` with `Authorization: Bearer <LOCAL_AUTH_TOKEN>`

Primary endpoints (bearer auth):
- List boards: `GET /api/v1/boards`
- List tasks: `GET /api/v1/boards/{board_id}/tasks`
- Create task: `POST /api/v1/boards/{board_id}/tasks`
- Add task comment: `POST /api/v1/boards/{board_id}/tasks/{task_id}/comments`
- List memory: `GET /api/v1/boards/{board_id}/memory?is_chat=false`
- Add memory note: `POST /api/v1/boards/{board_id}/memory`

Canonical payloads:
- Create task:
  - `{ "title": "<task>", "description": "<details>", "status": "in_progress", "priority": "high" }`
- Add comment:
  - `{ "message": "Progress: <facts>. Next: <step>." }`
- Add memory note:
  - `{ "content": "Checkpoint: <facts>", "tags": ["checkpoint","runtime"], "source": "orion" }`

## 5.1) Known Board IDs (Validated)
- VCS Trading Bot: `1a84e577-7b7e-4b8f-839a-8463bd191432`
- NPN CRM: `7cf618a1-4c7d-43fc-9ccd-16da1c0b7d37`
- OpsRelay: `ba3cb51e-52f7-4c58-b482-edf614caeb06`
- Single Mother App: `340e6b7d-fc89-4e95-9163-327c9c1f1ff6`
- CapitalIQ: `158b49ce-3041-4f67-aef1-1a547bcf2e64`
- Prolific Wholesale: `1b021644-f75d-42ab-9b9e-02be366c90e1`
- InvestMatch: `2f175975-aa2c-4437-9398-ccf3e6b3ec9f`
- Meme Terminal: `ddbaa6d9-e6ab-4c46-91c3-f9a6aeee251a`
- Titan Director: `2c91f6a9-2c35-4254-90fc-71e7edeebc17`

## 6) Fallback Mode (No API token / API unavailable)
If API auth fails or Mission Control backend is unreachable:
- Continue using file-backed board mode only:
  - `openclaw-mission-control/docs/runtime/MULTIAPP_CHECKPOINT.md`
  - `C:/Users/mscott/.openclaw/OVERNIGHT_STATUS.md`
- Keep this mode until API health + auth succeed.

## 6.1) Mandatory Task Sync Behavior
For every new user guide/instruction:
1. Resolve active board id from app path/name.
2. Create (or reuse) one task on that board.
3. Post progress comments at each major step.
4. Mirror the same checkpoint facts into the two file-backed checkpoint files.

## 7) Multi-App Scope
- Workspace root is `C:/Users/mscott/AI_Workspace`.
- Never assume a single app folder.
- Always set `Active App Path` before doing work.

## 8) Parallelism Policy
- Up to 4 subagents for non-DB tasks only (analysis/coding/reporting).
- DuckDB writes are single-writer only in main agent flow.
- Never run destructive DB reset/recreate scripts on resume.

## 8.1) Team Mode
- Role source: `TEAM_ROLE_REGISTRY.md`.
- Delegation flow source: `DELEGATION_PROTOCOL.md`.
- Orchestrator lane (`multiapp-opencode`) delegates and synthesizes.
- Worker lane (`multiapp-worker`) executes recurring/background tasks.

## 9) Reliability Guardrails
- Headless only: never open GUI apps/windows.
- Never kill active loader PIDs unless explicitly instructed.
- Never switch model/tooling mid-critical run unless explicitly instructed.

## 10) Done Criteria for Any Task
- Work result saved to target app files.
- Mission checkpoint files updated.
- Clear next step or completion note posted.
