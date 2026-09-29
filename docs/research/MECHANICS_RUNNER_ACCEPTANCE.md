# Mechanics runner acceptance evidence

This document records engineering runner acceptance separately from frozen research definitions and the historical dated results. It does not replace those records or establish model quality.

## Verified run

- Run ID: `mechanics-2026-09-29T13-25-42-271Z-908ee290-832e-49a1-b8d1-2f4cc85f9c45`.
- [Generated consolidated result](../../research/results/mechanics-2026-09-29T13-25-42-271Z-908ee290-832e-49a1-b8d1-2f4cc85f9c45/consolidated.json): 22 required checks passed; process exit 0.
- The result includes source/input hashes, revision, unique run identity, UTC timestamps, raw child artifact paths, explicit legacy-adapter version, assertions and errors. Each run gets a new directory. Existing dated records are never overwritten.
- Focused regression command: `node --import tsx --test research/runner/mechanicsHarness.test.ts research/runner/mechanicsSandbox.test.ts`. All 11 tests passed.
- Focused TypeScript check for the six mechanics harness/adapter/sweep/sandbox source and test files passed with exit 0.

## Denial boundary

The same consolidated result records `isolation.denialProbe`: an actual HTTP request to documentation-only address `192.0.2.1` failed with `ENETUNREACH`; the container exposed zero external network interfaces. This probe is a deliberate denied attempt, not a claim that no networking API was invoked.

Every mechanics child runs under the locally installed, content-pinned Docker image `sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402`, with `--network none`, a read-only root filesystem and allowlisted snapshot mount, no host credentials or node_modules mounted, a non-root user, removed capabilities, no privilege escalation, and process/memory/CPU bounds. Docker image pulling is disabled. Writable temporary state is isolated inside the container. Timeout cleanup force-removes the named container instead of merely killing the Docker client.

The integration regression additionally verified that writing to the mounted snapshot fails. Network/provider call counters remain **unmeasured**. The evidence proves denial of external networking, not an instrumented count of all provider-method invocations. Synthetic embedding/executor implementations remain synthetic.

## Fixture and scorer acceptance boundaries

| Check | Acceptance now parsed | What remains unproved |
| --- | --- | --- |
| Legacy intent fixtures | Exact fixture ID and two cases, plus successful source validator | Independence of task inputs and evaluator labels; the legacy fixture intentionally contains the scripted expected intent |
| Development families | Exact fixture ID, six families and twelve cases, source shape/leakage validation, and deterministic correct/wrong scorer controls | Model trajectories and production-path quality remain unproved |
| Held-out families | Exact fixture ID, heldout split, six families and sixty cases, source shape/leakage validation, deterministic 60/60 correct controls and 0/60 negative controls, with evaluator data outside agent input | Held-out model execution and production-path quality remain unproved |
| Offline intent scorer control | Two positive cases passed; both wrong-answer controls failed; consistent total/count fields | Model capability; answers are scripted and this is not a development-family scorer |
| Production-path smoke | Two benchmark cases and checkpoint assertions | Real model execution, paid usage, condition isolation or scientific results |

A payload containing only `valid: true` is insufficient for all three fixture validators. Wrong identity/counts or non-boolean success flags fail acceptance. These stronger adapters do not silently alter frozen fixtures, scoring or protocol. Runbook section 4 scientific scorer acceptance remains open.
