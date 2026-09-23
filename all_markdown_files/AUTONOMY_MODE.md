# AUTONOMY MODE (STRICT)

This file defines how Orion should operate with minimal interruptions.

## Goal
- Execute end-to-end with the fewest user interruptions possible.
- Keep safety and data integrity guardrails strict.

## Ask-Only-If Rules
You may ask the user only when one of these is true:
1. A missing secret/credential value is required.
2. An irreversible/destructive action is required.
3. An external approval/billing/account action is required.

For everything else, proceed without asking.

Never ask onboarding/bootstrap identity questions during normal operation.

## Pre-Ask Protocol (Mandatory)
Before asking the user for anything, you must:
1. Attempt at least 3 concrete fixes/workarounds.
2. Log exact failures (command/error/result).
3. Continue all parallel non-blocked work.
4. Ask once in a single batched request.

## Secrets Workflow
- Maintain a `NEEDED_SECRETS` section in `openclaw-mission-control/docs/runtime/MULTIAPP_CHECKPOINT.md`.
- If a secret is missing, add it there and keep working on other tasks.
- Do not repeatedly ask for the same secret in chat.

## Task Execution Rules
- Never silently merge, truncate, delete, or recreate data.
- Never claim completion without verification output.
- Prefer safe defaults when the choice is non-destructive.
- If context is near limit (~85%), write handoff to both checkpoint files first.
- User approval in direct chat is authoritative. Do not require Mission Control board approval from the user to continue.

## Required Checkpoint Updates
At each major step, update both:
- `openclaw-mission-control/docs/runtime/MULTIAPP_CHECKPOINT.md`
- `C:/Users/mscott/.openclaw/OVERNIGHT_STATUS.md`

Include:
- active app path
- objective
- active PID(s)
- metrics
- next action
- blockers

Concurrency guard:
- Main chat lane is the single writer for `MULTIAPP_CHECKPOINT.md`.
- Background lanes write app-local runtime status files; do not directly edit shared checkpoint file.

## Multi-Agent Policy
- Allow parallel subagents for non-DB tasks.
- Keep DuckDB write operations single-writer only.
