# Execution backend boundary matrix

Updated: 2026-09-29

This matrix records what each execution adapter proves locally. It is a source-and-test inventory, not evidence that an external runtime or provider is configured.

| Adapter | Entry point | Contract boundary | Evidence boundary | Local status |
| --- | --- | --- | --- | --- |
| Native AgentForge harness | `src/providers/harness/nativeHarness.ts` and `nativeComputeExecutor.ts` | Requires a contract; rejects destructive commands and out-of-scope files before the attached executor runs. | Returns a harness result; worker completion evidence is enforced by `TaskWorkerRuntime`. | Verified by `src/providers/harness/harnessExecutors.test.ts` |
| Contracted Docker backend | `src/core/runtime/contractedDockerExecutionBackend.ts` | Requires isolated worktree, approved plan, contract scope and required checks before container execution. | Captures command, test, diff and revision evidence; missing required plan fails before container creation. | Verified by `src/core/runtime/contractedDockerExecutionBackend.test.ts` |
| Worker runtime | `src/core/runtime/taskWorkerRuntime.ts` | Requires a configured ready backend and task contract. | Required checks determine `verifiedPassed`; human-approval contracts remain `waiting_approval`. | Verified by `src/core/runtime/taskWorkerRuntime.test.ts` |
| Broker preflight | `src/router.ts` and `src/adapters.ts` | Policy/reflection checks run before translation; side-effecting requests require an available audit store and receive an idempotency key. | Run ID, runtime, model and idempotency metadata survive envelope translation; optimized requests remain subject to the same audit check. | Verified by `src/broker.test.ts` (34 tests; hosted matrix run 36582794736) |
| Pydantic HTTP adapter | `src/providers/harness/pydanticHttpExecutor.ts` | HTTPS required for non-loopback endpoints; malformed responses are rejected. | Adapter returns text and optional usage; production completion evidence still belongs to the worker/backend caller. | Boundary verified; external service optional/unconfigured |
| Pi harness | `src/providers/harness/piHarness.ts` | Explicit simulation is opt-in; a real executor must be injected. | Provider result alone is not a completion evidence pack. | Simulation/source seam only; SDK runtime unconfigured |
| Speculative executor | `src/speculativeExecution.ts` | Selects and races model responses; explicitly rejects requests marked `sideEffecting` before invoking a model. | Caller must use the governed worker/backend path for side effects and completion evidence. | Response-race behavior and side-effect refusal verified; controller integration remains open |

## Interpretation

The matrix prevents a harness adapter from being mistaken for a complete production execution path. The native, Docker and worker checks are locally exercised. Pydantic has adapter-boundary checks but no deployed service. Pi is an explicit seam, not an installed runtime. Speculative execution is intentionally not treated as an execution authority; controller integration remains an open Gate 3 item.

No row authorizes provider calls, external messages, deployment, or publication. Those require the owner approval packet and deployment-specific acceptance.
