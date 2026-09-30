# Held-out study preflight, 2026-09-30

`pnpm exec tsx research/runner/preflightHeldoutTasks.ts` inspected the 60
synthetic cases in `research/tasks/protocol-families-v1-heldout.json` without
calling a model. All 60 have a task prompt and an evaluator-only `requiredFact`,
but none has observable prior or injected events, a required state/artifact
outcome, forbidden outcomes, deterministic checks, timeout and attempt limits,
or a negative control. The script exits nonzero and reports counts by missing
field. A model cannot retrieve a prior fact that was never in the input or
memory, and a final word match cannot measure workflow completion or safety.

This is a data and experimental-design defect in the existing v1 fixture,
not a model failure. The old 60 cases remain unchanged and unrun. Running
the planned paid matrix on them would not answer the frozen research questions.
The separate two-case development recall slice supplied synthetic prior
facts to both B1 and AF, and is reported only as exploratory evidence.

Next, create a versioned task set with observable multi-event scenarios for
all six families, executable state or artifact checks, and negative controls.
Keep evaluator keys separate from agent-visible material. Exercise those
scenarios on the real baseline and AgentForge paths, then freeze the new
fixture, scorer, route, hashes and limits before the first held-out call.
Preserve all v1 artifacts as historical evidence and disclose the fixture
revision in the paper. Do not change outcome definitions or scoring thresholds
to improve results.
