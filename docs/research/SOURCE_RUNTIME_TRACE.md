# Source-to-runtime trace

Status: source trace refreshed 2026-09-29. This is implementation evidence, not measured performance evidence.

## Verified workflow path

1. `src/workflowEngine.ts` exposes the domain-neutral facade.
2. `WorkflowEngine.beginGoal()` creates a `CompletionEngine` session with an immutable goal hash.
3. `CompletionEngine.initializeSession()` generates and critiques the PRD, registers requirements, builds the execution DAG and creates the completion contract.
4. `WorkflowEngine.startGoal()` delegates to `CompletionEngine.startExecution()`.
5. Requirement evidence is recorded through `WorkflowEngine.recordTraceability()` and the engine’s traceability matrix.
6. Completion auditing and repair are owned by `CompletionEngine`; a worker cannot directly mark a session `COMPLETE_VERIFIED`.
7. A session store can restore persisted sessions when supplied; the default constructor remains process-local.

## Normal conversational request path

The repository has a separate text-conversation route that must not be confused with governed task execution:

1. `src/server/webServer.ts` routes a response request to `ConversationRuntime.respond()` after validating the thread, actor and selected model.
2. `src/server/conversationRuntime.ts` loads the latest user message and complete thread history, rejects archived threads, concurrent replies and attachments on this text-only route, and requires the selected model to be explicitly configured.
3. The runtime adds project instructions and, only when configured, up to eight active project-scoped `chat-context` operational-memory records. It labels those records as reference data rather than new instructions.
4. The assembled `ModelMessage[]` is sent to the configured `GenerativeModelProvider.stream()` method. Tool calls are rejected on this route; this path can discuss and draft but cannot claim repository execution or external-service access.
5. Streaming deltas are bounded and require a normal stop/end-turn finish. Aborted or failed partial text is stored with its generation status and is never represented as a completed response.
6. Governed work follows the distinct `WorkflowEngine` → `CompletionEngine` → worker/backend path above. A conversation response does not itself create execution evidence, mutate a task, or transition a completion session.

This trace verifies source routing and the separation between conversational text and governed execution. It does not establish provider quality, model selection quality, or a live authenticated provider round trip.

## Evidence boundary

The trace establishes the source-level route and ownership boundary. It does not prove that every external controller uses this route, that a provider call succeeds, or that a model selects the correct next action. Those require the production-path and model-backed checks in `docs/research/PROTOCOL.md`.

## Recheck command

```powershell
node --import tsx research/runner/handoffSlice.ts
pnpm typecheck
```

The handoff slice verifies the persisted goal, requirements, DAG and execution state across replacement engines. It is intentionally narrower than a full production workflow acceptance test.

## Browser and native-channel boundaries

- `src/providers/browser/jevUltrafastBrowser.ts` validates browser actions against the observed element table, matching observation ID and freshness before accepting target operations. Its tests establish the policy boundary; they do not establish a live browser-provider round trip.
- `src/nativeGateway.ts` owns gateway lifecycle and dispatches inbound events through `ChannelRuntimeRegistry` for Telegram, Discord and Slack. Its `nativeOwnership` snapshot distinguishes the AgentForge gateway from optional external bridges. Focused lifecycle and Telegram tests pass; channel readiness and authenticated round trips remain deployment-specific acceptance work.
- `src/core/contract/contractEnforcer.ts` checks path scope, protected files, file-count limits and authority gates before side effects. `src/core/completion/completionContract.ts` separately requires evidence, tests, build/typecheck, integration, privacy and adversarial-review conditions before verified completion. The focused contract test covers a narrow enforcement case; complete controller-path coverage remains open.
- `src/providers/memory/operationalMemory.ts` records namespaced operational records and filters by project, category and tags before lexical scoring and recency ranking. Its repository is optional, so default process-local storage must not be described as durable deployment memory.
- `src/providers/decision/jevDecision.ts` performs deterministic candidate matching and controller-workflow heuristics with fixed confidence values. It is a fast routing classifier, not a trained or calibrated probability model; measured confusion and cost remain future study work.

## Execution-entry inventory

The source audit found these production-facing execution entry points:

- `src/workflowEngine.ts` is the domain facade: `beginGoal()` constructs the completion session and `startGoal()` delegates to `CompletionEngine.startExecution()`.
- `src/server/start.ts` and `src/server/webServer.ts` construct the server completion engine and expose the goal/start routes. The web server routes call the same workflow/completion objects rather than a second executor.
- `src/core/runtime/taskWorkerRuntime.ts` is the worker boundary. It delegates each task to the configured execution backend and records the returned execution output.
- `src/core/runtime/contractedDockerExecutionBackend.ts` is the filesystem/process side-effect boundary and invokes `ContractEnforcer` before execution.
- `src/providers/harness/nativeHarness.ts` is a separate harness provider boundary and also owns a `ContractEnforcer` instance.
- `src/speculativeExecution.ts` is an explicit response-race path; it rejects candidates marked `sideEffecting` before model invocation. Any side-effecting work must use the governed worker/backend contract and evidence path.

This inventory narrows the remaining integration-coverage requirement: verify that every side-effecting caller (worker, Docker backend and native harness) reaches the same contract and completion evidence gates. The native harness now applies its file-scope contract before both simulation and attached-executor paths. The worker boundary now has regressions proving a missing required check cannot become a completed task and that human approval prevents final completion. The public completion route has an end-to-end regression through that worker gate. Docker, adapter and speculative refusal boundaries are summarized in `BACKEND_BOUNDARY_MATRIX.md`; deployed-runtime acceptance remains open.

## Existing boundary-test inventory

- `src/core/runtime/taskWorkerRuntime.test.ts` covers fail-closed startup, explicit backend execution, retry/resume behavior and readiness reporting.
- `src/core/runtime/contractedDockerExecutionBackend.test.ts` covers the contracted Docker backend boundary, including rejection of an incomplete required-check plan before container creation.
- `src/providers/harness/harnessExecutors.test.ts` covers the native harness executor boundary.
- `src/broker.test.ts` covers speculative executor selection and execution behavior.

The worker evidence gate is covered by `src/core/runtime/taskWorkerRuntime.test.ts` (`TASK-MISSING-EVIDENCE`): a backend that reports only a subset of required checks is persisted as `failed`, with `verifiedPassed: false`.

These tests establish component behavior independently. A single controller-path test proving that all side-effecting callers share one completion/evidence gate remains intentionally open.
