# Research execution ledger

Updated: 2026-09-29
Governing plan: [`LUNA_RESEARCH_COMPLETION_RUNBOOK.md`](LUNA_RESEARCH_COMPLETION_RUNBOOK.md)

This ledger is the continuation record for the white-paper work. A task is **verified** only when the cited artifact or command proves the stated scope. A green local mechanics check does not authorize a paid provider run or support a model-performance claim.

## Environment and baseline

| ID | State | Evidence | Next action |
| --- | --- | --- | --- |
| 1.01 | VERIFIED | Current checkout and branch were inspected; `pnpm typecheck`, `pnpm build`, and the mechanics sweep pass. Public artifacts contain no private checkout paths. | Refresh revision/hash values immediately before any approved run. |
| 1.02 | VERIFIED | Repository instructions, `WHITE_PAPER_EXECUTION_PLAN.md`, `PROTOCOL.md`, `RESULTS_AUDIT.md`, `RESEARCH_PROGRESS.md`, `STATUS_MATRIX.md`, and `OWNER_APPROVAL_PACKET.md` were read. | Re-read only after a governing-file change. |
| 1.03 | VERIFIED | Pre-existing dirty files are listed in the progress log; unrelated branding/package/scratch files remain untouched. | Preserve the working-tree boundary. |
| 1.04 | VERIFIED | `SOURCE_RUNTIME_TRACE.md`, `CAPABILITY_EVIDENCE.md`, research runners, fixtures, config, and validators inventory the current execution surface. | Add source evidence only when a capability row changes. |
| 1.05 | VERIFIED | Protocol, fixture, development-family, and pilot hashes are recorded in `RELEASE_EVIDENCE.md`. | Refresh only after a deliberate public-safe input change. |
| 1.06 | VERIFIED | This file and the dated entries in `RESEARCH_PROGRESS.md` provide task state, evidence, and next action. | Keep this ledger synchronized after each gate. |
| 1.07 | VERIFIED | `STATUS_MATRIX.md` and the approval packet distinguish preparation from measured research and publication. | Correct any drift before reporting completion. |
| 1.08 | VERIFIED | Public research artifacts pass the privacy scan; raw traces and provider credentials are excluded from the public package. | Use a disposable, secret-free runtime for any future run. |

## Gate state

| Gate | State | What is proven | What remains |
| --- | --- | --- | --- |
| 2 — mechanics acceptance | VERIFIED | Latest isolated 22-check zero-spend sweep `mechanics-2026-09-29T13-51-13-102Z-669824ea-f17b-42ea-8c67-86cba900e522` passes; negative controls and protocol-family validation fail closed, and Docker network denial is observed. | Complete network/provider call counts remain unmeasured; re-run after related code changes. |
| 3 — execution boundaries | PARTIAL | `BACKEND_BOUNDARY_MATRIX.md` inventories native, Docker, worker, Pydantic, Pi and speculative paths. Native executor requires a contract and rejects destructive commands; worker rejects incomplete evidence and keeps verified work in `waiting_approval` when required; contracted Docker rejects an incomplete required-check plan before container creation; the optional Pydantic adapter rejects insecure endpoints and malformed output; speculative execution rejects side-effecting candidates before model invocation; the public completion route now has an end-to-end regression through the worker evidence gate. The focused boundary checks and broker suite pass, and `pnpm verify:public` passed the network-disabled approved Docker E2E on 2026-09-29. | Deployed-runtime acceptance and any future side-effecting controller beyond the tested public route remain open. |
| 4 — synthetic task suite | VERIFIED FOR FIXTURE INTEGRITY | Six families and 12 development cases plus six families and 60 held-out cases validate with evaluator data outside agent-visible input. | Held-out behavior still requires a frozen protocol and approved execution; it must not be used for tuning. |
| 5 — production-path runner | PARTIAL | Real `BenchmarkRunner` plus `TrajectoryLedger` smoke is checkpointed and capped, using synthetic answers; the bounded Ollama adapter pilot and smoke are separately recorded; a measured-run guard rejects missing routes and mock/synthetic conditions. | A real approved comparative route still must be connected and reconciled. |
| 6 — paid evaluation | WAITING_FOR_INPUT | Owner packet contains route candidates and required decisions; no provider call was made. | Owner must approve route, dated price, replicate/cap matrix, and hard spend ceiling. |
| 7 — manuscript/package | PARTIAL | Methods scaffold, synchronized results limitations, evidence links, privacy scan, package-surface/archive checks, CLI and launcher acceptance, review-packet acceptance, and clean-export reproduction checks exist. | Model results, author metadata, independent review, and final archive remain open. |
| 8 — publication | NOT_STARTED | No external submission or publication action was taken. | Final approval and verified measured package are prerequisites. |

## Verified commands at this checkpoint

```text
pnpm typecheck
node --import tsx research/runner/mechanicsSweep.ts
pnpm test:research:all
pnpm test --reporter=dot
pnpm vitest run src/semanticMemory.persistence.test.ts src/providers/browser/jevUltrafastBrowser.test.ts
pnpm vitest run src/nativeGateway.test.ts src/channelConnectionRegistry.test.ts src/channelRuntimeRegistry.test.ts src/providers/channels/telegramNativePath.test.ts src/providers/channels/telegramSessionConfig.test.ts src/providers/channels/telegramUserSessionTransport.test.ts src/providers/channels/telegramLivePreflight.test.ts
pnpm vitest run src/providers/harness/harnessExecutors.test.ts src/core/runtime/contractedDockerExecutionBackend.test.ts src/core/runtime/taskWorkerRuntime.test.ts src/server/completionRoutes.test.ts src/broker.test.ts --reporter=dot
git diff --check
pnpm test:website
node scripts/website-mobile-acceptance.mjs
node website/verify-static.mjs
node scripts/public-package-acceptance.mjs
node scripts/package-cli-acceptance.mjs
pnpm verify:public
```

The listed checks completed successfully at the checkpoints recorded in `RESEARCH_PROGRESS.md`. The latest sweep verifies Docker network denial; complete network/provider call counts remain unmeasured. Website, package, CLI, static-preview, crash-recovery and approved Docker E2E acceptance also pass. This is preparation evidence, not a performance result.

## Exact next executable action

Continue with independent work under Gate 3 and Gate 7: finish remaining source-to-runtime evidence rows and backend-matrix coverage, then update the manuscript and status matrix. Do not start Gate 6 until the owner approval packet has a selected route, dated pricing, limits, reviewer plan, and hard spend ceiling.
