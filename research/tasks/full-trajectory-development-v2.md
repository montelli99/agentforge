# Full trajectory development fixture v2

`full-trajectory-development-v2.json` is a synthetic-only development fixture containing two cases from each of the six established protocol families. It is separate from the frozen phrase-level development fixture and all held-out material.

Each case starts from file-backed state, injects a file-backed event or fault, and has exact UTF-8 artifact or state checks plus forbidden-effect paths and bounded execution limits. The task text describes the requested work; evaluator expectations and `referenceCommand` remain outside `input` so they are not part of the model-visible task.

`referenceCommand` is a deterministic Docker-safe `node -e` command that writes only the expected files. It is intended to exercise the same artifact/scorer evidence path as a worker trajectory without network access or paid model calls. A task that requests a state transition must assert that state as well as its completion receipt.

This is **reference mechanics only**. The commands are evaluator-authored, and the event files are staged before execution; this fixture does not measure a model's decisions, live event timing, recovery, or any comparative outcome. Never count its passes as B0/B1/AF study results.

Validate the fixture with:

```sh
pnpm research:reference:validate
```

When Docker is reachable, run the isolated worker reference path with
`pnpm research:reference:run`. The public result is written to
`research/results/full-trajectory-development-v2-reference.json`. A single-case
diagnostic can be run with `pnpm research:reference:run full-workflow-recovery-01`;
it writes a separate case result and cannot overwrite the full-run record.

The bounded model-backed development route accepts one explicit case ID, for
example `pnpm research:model-development:one full-delayed-recall-01`. It checks
Docker and the configured MiMo route before any provider call, writes a private
checkpoint outside the repository before the call, and refuses to silently
repeat an existing provider call. A failed preflight with zero provider calls
can be retried under a new checkpoint ID; the old checkpoint remains intact.
It supplies only `input` to the model, executes its
draft in a disposable network-disabled worktree under contract policy, and
scores the artifact independently. This is a research-only synthetic route;
it does not establish product approval behavior or a matched study result.
Every attempted provider call leaves a private checkpoint and a sanitized
summary, including failures. Scoring compares exact artifact content and
forbidden effects independently; a worker's completed status with a missing
artifact is counted as false completion.
