# AGENTFORGE COMPLETION ENGINE
## ANTI-SPOON-FEEDING / VERIFIED COMPLETION CONTRACT

THIS IS A CORE PRODUCT REQUIREMENT.

AgentForge must eliminate unnecessary owner turn-taking for substantial tasks.

The default substantial-task lifecycle is:

ORIGINAL GOAL
→ REQUIREMENTS EXTRACTION
→ PRD
→ PRD CRITIC
→ REQUIREMENTS TRACEABILITY
→ DEPENDENCY GRAPH
→ TEST PLAN
→ EXECUTION
→ CONTINUOUS VERIFICATION
→ COMPLETION AUDIT
→ AUTOMATIC REPAIR
→ RE-AUDIT
→ VERIFIED COMPLETION
→ FINAL REPORT

NOT:

DO ONE STEP
→ ASK OWNER
→ DO NEXT STEP
→ ASK OWNER
→ REPORT
→ DISCOVER OMISSION
→ ASK OWNER AGAIN

------------------------------------------------------------
### ORIGINAL GOAL
------------------------------------------------------------

Persist immutable OriginalGoal.

Never replace the owner's original request with a summarized PRD.

PRD and requirements derive from OriginalGoal.

Completion audit compares against OriginalGoal.

------------------------------------------------------------
### PRD ENGINE
------------------------------------------------------------

For substantial tasks automatically generate:

- PRD
- requirements
- acceptance criteria
- dependencies
- risk analysis
- test strategy
- verification requirements
- documentation requirements
- rollback requirements
- release criteria

No owner confirmation required unless a genuine ambiguity blocks safe execution.

------------------------------------------------------------
### PRD CRITIC
------------------------------------------------------------

Before execution run independent PRD review.

Ask:

- What did the PRD omit from OriginalGoal?
- What implied dependencies are required?
- What safety requirements are missing?
- What tests prove each requirement?
- What edge cases matter?
- What rollback is required?

Revise PRD automatically.

Then lock requirement baseline.

------------------------------------------------------------
### REQUIREMENT IDs
------------------------------------------------------------

Every requirement gets stable ID.

Example:

`AF-REQ-001`

Every implementation task references requirement IDs.

Every test references requirement IDs.

Every EvidencePack references requirement IDs.

Every blocker references requirement IDs.

------------------------------------------------------------
### TRACEABILITY
------------------------------------------------------------

Maintain:

OriginalGoal
→ Requirement
→ Task
→ Code/Artifact
→ Test
→ Evidence
→ Audit Result

No orphan requirements.

No unclassified implementation.

------------------------------------------------------------
### EXECUTION DAG
------------------------------------------------------------

Create dependency graph.

If one node blocks:

block dependent subtree only.

Continue independent work.

Example:

Retell credential missing

does NOT stop:

- UI
- Ollama
- Pi
- migration
- security
- docs
- packages

------------------------------------------------------------
### INTERACTION POLICY
------------------------------------------------------------

Default:

- `autonomous=true`
- `ask_only_if_blocking=true`
- `optional_preferences_use_safe_default=true`
- `intermediate_reports=false`
- `phase_confirmation=false`
- `continue_after_checkpoint=true`
- `continue_after_commit=true`
- `continue_after_test_pass=true`
- `continue_after_repair=true`
- `continue_unrelated_work_when_blocked=true`

Never ask:

"Should I continue?"

when safe authorized work remains.

------------------------------------------------------------
### COMPLETION CONTRACT
------------------------------------------------------------

Create first-class CompletionContract separate from ExecutionContract.

ExecutionContract:

WHAT AGENT MAY DO.

CompletionContract:

WHAT MUST BE TRUE BEFORE AGENTFORGE MAY DECLARE DONE.

CompletionContract may require:

- requirements implemented
- tests passing
- build passing
- typecheck passing
- browser smoke
- integration tests
- provider test
- secret scan
- PII scan
- documentation
- rollback
- evidence
- security review
- migration verification

------------------------------------------------------------
### COMPLETION AUTHORITY
------------------------------------------------------------

Worker model has ZERO authority to mark substantial task:

`COMPLETE_VERIFIED`.

Only CompletionEngine may transition to:

`COMPLETE_VERIFIED`.

Worker may emit:

`WORKER_FINISHED`

which triggers verification.

------------------------------------------------------------
### TASK STATES
------------------------------------------------------------

Use:

- `PLANNING`
- `EXECUTING`
- `VERIFYING`
- `AUDITING`
- `REPAIRING`
- `BLOCKED_EXTERNAL`
- `BLOCKED_OWNER`
- `FAILED`
- `COMPLETE_VERIFIED`

Do not use worker self-report as completion state.

------------------------------------------------------------
### COMPLETION AUDITOR
------------------------------------------------------------

Run independent adversarial completion audit.

Auditor must attempt to DISPROVE completion.

Review:

- OriginalGoal
- PRD
- requirements
- tasks
- diffs
- tests
- browser evidence
- provider evidence
- TODO scan
- documentation
- security results
- blockers

Ask:

1. What was forgotten?
2. What claim lacks evidence?
3. What test doesn't test the real path?
4. What integration is actually a mock?
5. What UI claim was only API-tested?
6. What error path is missing?
7. What requirement has no implementation?
8. What implementation has no test?
9. What documentation overstates readiness?

------------------------------------------------------------
### AUTOMATIC REPAIR LOOP
------------------------------------------------------------

If audit fails:

DO NOT REPORT TO OWNER.

Create repair tasks.

Execute repairs.

Rerun tests.

Re-audit.

Repeat until:

`PASS`

or genuine external/owner blocker.

Implement bounded loop protection to prevent infinite repair loops.

If same failure repeats beyond safe threshold:

mark blocker with evidence.

Continue unrelated work.

------------------------------------------------------------
### CLAIM EVIDENCE
------------------------------------------------------------

Create Claim/Evidence model.

Evidence levels:

- `L0 CLAIMED`
- `L1 STATIC_IMPLEMENTATION`
- `L2 UNIT_TESTED`
- `L3 INTEGRATION_TESTED`
- `L4 E2E_TESTED`
- `L5 REAL_PROVIDER_TESTED`
- `L6 SHADOW_VERIFIED`
- `L7 PRODUCTION_VERIFIED`

Example:

Claim:
"Telegram integration works."

Evidence:
mock provider only

Maximum evidence:
`L3`

Readiness cannot claim production-ready.

------------------------------------------------------------
### SIMULATION HONESTY
------------------------------------------------------------

A simulation may NEVER be represented as real E2E.

- `MOCK`
- `SIMULATED`
- `ESTIMATED`
- `MEASURED`
- `REAL_PROVIDER`
- `SHADOW`
- `PRODUCTION`

must remain distinct.

------------------------------------------------------------
### TODO / PLACEHOLDER AUDIT
------------------------------------------------------------

Before verified completion scan:

- `TODO`
- `FIXME`
- `HACK`
- `TEMP`
- `PLACEHOLDER`
- `MOCK`
- `NOT_IMPLEMENTED`
- `stub`
- `fake`
- `throw not implemented`

Classify every result:

- `EXPECTED_FUTURE`
- `NON_BLOCKING`
- `RELEASE_BLOCKER`
- `DEAD_CODE`
