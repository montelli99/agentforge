# Delegation Protocol

Use this protocol for every non-trivial request.

## 1) Intake
- Orchestrator reads mission checkpoint + overnight status + role registry.
- Orchestrator identifies app scope and task type.

## 2) Assign
- Assign one execution owner role.
- Assign one reviewer role.
- Create/update Mission Control task before execution.

## 3) Execute
- Worker executes only within role boundaries.
- Post progress comments with concrete outputs.
- Use app-local runtime files for noisy updates.

## 4) Verify
- Reviewer validates outputs against acceptance criteria.
- Reviewer posts pass/fail with evidence.

## 5) Report
- Orchestrator sends concise status to user:
  - completed
  - evidence
  - next action
  - blocker (if any)

## Failure Claims Rule
Before saying any tool is "broken", the role must run and report:
1. spawn ping
2. exec ping
3. read ping
Then report exact failing tool + error text + timestamp.
