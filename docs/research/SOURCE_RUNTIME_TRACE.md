# Source-to-runtime trace

Status: initial trace, refreshed 2026-09-28. This is implementation evidence, not measured performance evidence.

## Verified workflow path

1. `src/workflowEngine.ts` exposes the domain-neutral facade.
2. `WorkflowEngine.beginGoal()` creates a `CompletionEngine` session with an immutable goal hash.
3. `CompletionEngine.initializeSession()` generates and critiques the PRD, registers requirements, builds the execution DAG and creates the completion contract.
4. `WorkflowEngine.startGoal()` delegates to `CompletionEngine.startExecution()`.
5. Requirement evidence is recorded through `WorkflowEngine.recordTraceability()` and the engine’s traceability matrix.
6. Completion auditing and repair are owned by `CompletionEngine`; a worker cannot directly mark a session `COMPLETE_VERIFIED`.
7. A session store can restore persisted sessions when supplied; the default constructor remains process-local.

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
- `src/nativeGateway.ts` owns gateway lifecycle and dispatches inbound events through `ChannelRuntimeRegistry` for Telegram, Discord and Slack. Its `nativeOwnership` snapshot distinguishes the AgentForge gateway from optional external bridges. Channel readiness and authenticated round trips remain deployment-specific acceptance work.
- `src/core/contract/contractEnforcer.ts` checks path scope, protected files, file-count limits and authority gates before side effects. `src/core/completion/completionContract.ts` separately requires evidence, tests, build/typecheck, integration, privacy and adversarial-review conditions before verified completion. The focused contract test covers a narrow enforcement case; complete controller-path coverage remains open.
