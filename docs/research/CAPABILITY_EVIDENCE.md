# AgentForge capability evidence register

Updated: 2026-09-28  
Status: implementation reconnaissance; this is not experimental proof.

This register separates source evidence from claims that still require an end-to-end experiment. Paths and line numbers identify the current checkout and must be refreshed when the implementation changes.

## Evidence table

| Proposed claim | Current source evidence | Existing supporting check | Current boundary | Study needed |
| --- | --- | --- | --- | --- |
| AgentForge can retain semantic memories | `src/semanticMemory.ts:63` defines `SemanticMemory`; the optional `SemanticMemoryPersistence` boundary now loads/saves entries before retrieval and after writes. | `src/memoryEvaluation.test.ts`, `src/memoryContextOptimizer.test.ts`, `research/runner/durableMemorySlice.ts` | Persistence is adapter-provided. The default constructor remains in-memory, and the research slice currently verifies separate instances rather than separate OS processes. Adapter privacy, encryption and tenant policy remain deployment responsibilities. | Add a separate-process acceptance test using a privacy-reviewed adapter, then measure retention against the protocol. |
| Project-scoped operational memory is isolated | `src/providers/memory/operationalMemory.ts:16` defines `OperationalMemoryProvider`; retrieval tokenizes and ranks title/content terms at `:63-65`. | `src/providers/memory/operationalMemory.test.ts:5` tests project-scoped retrieval and shared rules. | This is lexical ranking in the inspected provider, not proof of semantic retrieval or universal tenant isolation. | Add cross-project negative cases and inspect persistence/storage boundaries. |
| Context can be reduced with accounting | `src/memoryContextOptimizer.ts:155` defines the optimizer; large-context decisions begin at `:405`, and token-account records are created at `:467-526`. | `src/memoryContextOptimizer.test.ts` | Several helpers estimate tokens; source-level `tokensSaved` is not provider-billed savings and may not preserve every required fact. | Compare matched prompts through the real model route and score required/omitted/invented facts. |
| JEv provides inexpensive routing | `src/providers/decision/jevDecision.ts:27` defines `JevDecisionProvider`; `:35` classifies requests. | JEv/provider tests found by `rg` and the benchmark subsystem tests. | The implementation uses deterministic patterns and fixed confidence values. It is not trained, calibrated, or a measured probability model. | Build a blinded intent set; report confusion matrix, abstentions, latency, and cost. |
| Benchmark suites can be executed | `src/providers/benchmark/benchmarkRunner.ts:26` defines `BenchmarkRunner`; `:53` runs a suite and counts cases. | `src/providers/benchmark/benchmarkSubsystem.test.ts:39` checks suite execution and thresholds. | The runner compares expected top-level fields with strict equality; it does not by itself validate full trajectories, safety or independent scoring. | Add fixture-level artifact/state scorers and negative controls. |
| Completion is evidence-checked | `src/core/completion/completionAuditor.ts:46` defines `CompletionAuditor`; `:52` audits an `AuditorContext`. `src/core/completion/completionEngine.ts:109` defines the engine and invokes audits around `:274-311`. | `src/completionEngine.test.ts` and completion-related tests. | Need to prove the production controller cannot report success without the auditor; unit tests alone do not establish integration coverage. | Trace one real safe workflow, inject a failed requirement, and verify the response and state. |
| Contracts bound execution | `src/core/contract/contractEnforcer.ts:23` defines `ContractEnforcer`. | `src/core/contract/contractEnforcer.test.ts` | Enforcement may be present in one path while another path bypasses it. | Map every execution entry point and test denied, approved and malformed requests. |
| Corrections are recorded | `src/core/quality/correctionRegistry.ts:51` defines `CorrectionRegistry`. | `src/core/quality/correctionRegistry.test.ts` | Recording a correction does not prove it changes later behavior. | Run paired before/after equivalent tasks and score recurrence. |
| Workflow procedures can become completion goals | `src/workflowEngine.ts:8` defines `WorkflowEngine`; public architecture documents its process facade and preparation routes. | Workflow and completion tests in `src/`. | A prepared goal is not necessarily a completed external workflow; privileged/unresolved rules may hold execution. | Use synthetic multi-step procedures with a failing step and inspect durable state/evidence. |
| Model selection can use empirical evidence | `src/providers/benchmark/benchmarkRunner.ts` and `src/core/router/empiricalRouter.ts` provide benchmark/routing code paths. | `src/providers/benchmark/benchmarkSubsystem.test.ts:61` tests that unmeasured models cannot win critical tasks on reputation alone. | This does not establish better quality/cost than a baseline until measured with real model usage. | Run matched routing and fixed-model conditions with full token/cost accounting. |
| Browser actions have a bounded policy | `src/providers/browser/jevUltrafastBrowser.ts` and its test define the public bridge/policy surface. | `src/providers/browser/jevUltrafastBrowser.test.ts` | A deployment-specific browser bridge is still required; policy tests do not prove every browser provider works. | Use a disposable local fixture with stale/hidden/unobserved targets and verify rejection. |
| Native channel ownership exists as a design surface | `src/nativeGateway.ts`, channel registries and provider transports exist; `docs/PUBLIC_SYSTEM_ARCHITECTURE.md` describes the boundary. | Native gateway/channel tests. | A started runtime is not proof of an authenticated provider session or successful round trip. | Keep channel acceptance separate: disposable Telegram/Slack/Discord test accounts and explicit round-trip evidence. |

## Evidence grades

- **S0 — source only:** symbol or route exists; no behavior claim.
- **S1 — unit/integration check:** a test exercises a narrow behavior.
- **S2 — local end-to-end:** a disposable workflow uses the actual production path with deterministic scoring.
- **S3 — measured study:** frozen protocol, matched conditions, repeated runs, cost/latency accounting and independent review.

Current register entries are S0 or S1 unless a future progress entry names a run ID and artifact. No S3 claim is authorized yet.

## Required audit output

Before the paper abstract is written, add for each row:

1. exact code revision and test command;
2. route and dependency actually invoked;
3. fixture/task ID and expected acceptance rule;
4. observed result, failure class and artifact hash;
5. limitation and whether it changes the paper claim.

If source and behavior disagree, report the disagreement and correct the claim. Do not patch the register to make a failing capability look complete.
