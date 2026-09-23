# Agent Execution Playbook

Use this to prevent chat/execution disconnect.

## 1) Pick Lane First
- Chat/orchestrator lane (`multiapp-opencode`): intake, planning, delegation, quick probes.
- Worker lane (`multiapp-worker`): actual recurring/background execution.

## 2) Pick Tool Path (FORCED)
- Code/task delivery: MUST use `sessions_spawn` with coding subagent. Raw exec forbidden for code tasks.
- Cron/automation: worker cron jobs (`sessionTarget: isolated`).
- Quick diagnostics only: direct CLI probes (status, version, health) — no code execution.
- If spawn fails, say "SPAWN_FAILED" and stop — do not fall back to raw exec.

## 3) Never Claim Global Failure Blindly
Run and report all three:
1. Spawn probe
2. Exec/CLI probe
3. Read/write probe

If one works, continue with that path.

## 4) Response Standard
- For "do X": provide a one-line plan and start execution in same turn.
- Only ask user questions for secrets, irreversible actions, or external approvals.

## 5) Completion Standard
- Return: what was done, evidence, file paths updated, and next action.
