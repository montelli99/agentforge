# Full trajectory development fixture v2

`full-trajectory-development-v2.json` is a synthetic-only development fixture containing two cases from each of the six established protocol families. It is separate from the frozen phrase-level development fixture and all held-out material.

Each case starts from file-backed state, injects a file-backed event or fault, and has exact UTF-8 artifact checks plus forbidden-effect paths and bounded execution limits. The task text describes the requested work; evaluator expectations and `referenceCommand` remain outside `input` so they are not part of the model-visible task.

`referenceCommand` is a deterministic Docker-safe `node -e` command that writes only the expected files under `artifacts/`. It is intended to exercise the same artifact/scorer evidence path as a worker trajectory without network access or paid model calls.

This is **reference mechanics only**. The commands are evaluator-authored, and the event files are staged before execution; this fixture does not measure a model's decisions, live event timing, recovery, or any comparative outcome. Never count its passes as B0/B1/AF study results.

Validate the fixture with:

```sh
pnpm research:reference:validate
```

When Docker is reachable, run the isolated worker reference path with
`pnpm research:reference:run`. The public result is written to
`research/results/full-trajectory-development-v2-reference.json`.
