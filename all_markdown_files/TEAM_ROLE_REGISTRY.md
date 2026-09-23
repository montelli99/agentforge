# Team Role Registry

This defines the permanent role map for Orion's multi-agent team.

## Command Chain
- Human owner: **Montelli**
- Orchestrator lane: `multiapp-opencode` (Telegram chat/control)
- Worker lane coordinator: `multiapp-worker` (cron/background execution)

## Core Enterprise Roles
- `core-pmo` - Portfolio management, priority queue, dependency tracking
- `core-research-intel` - Competitive research, market/customer intelligence
- `core-dataops` - Data pipelines, ETL reliability, database operations
- `core-qa-release` - Quality gates, verification, release readiness
- `core-security-risk` - Security posture, secrets handling, guardrail checks

## App Engineering Roles
- `app-vcs-eng`
- `app-npn-eng`
- `app-opsrelay-eng`
- `app-singlemother-eng`
- `app-capitaliq-eng`
- `app-prolific-eng`
- `app-investmatch-eng`
- `app-memeterminal-eng`
- `app-titandirector-eng`

## App Marketing Roles
- `mkt-vcs`
- `mkt-npn`
- `mkt-opsrelay`
- `mkt-singlemother`
- `mkt-capitaliq`
- `mkt-prolific`
- `mkt-investmatch`
- `mkt-memeterminal`
- `mkt-titandirector`

## Non-Negotiable Role Rules
- Orchestrator delegates; workers execute.
- Workers do not change role.
- Every task must have one owner role and one reviewer role.
- No role may claim completion without evidence and verification output.
- Marketing roles never edit production code.
- Engineering roles never publish outbound marketing without marketing-owner review.

## Communication Contract
- Task create/update first on Mission Control API.
- Worker posts progress comments with facts only.
- Orchestrator summarizes to user with decisions + next action.
- If blocked, worker posts blocker + 1 proposed unblock action.

## Handoff Template
- Task ID:
- Owner Role:
- Reviewer Role:
- Current State:
- Evidence Links/Paths:
- Next Action:
- Blockers:
