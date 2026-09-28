# AgentForge research progress

Updated: 2026-09-28
Execution plan: [WHITE_PAPER_EXECUTION_PLAN.md](WHITE_PAPER_EXECUTION_PLAN.md)

## Completed
- Owner requested a detailed plan for Luna to execute.
- Publication routes researched using official arXiv, Zenodo, TMLR and JOSS sources.
- Initial code reconnaissance identified existing benchmark/memory/JEv/completion entry points.
- Detailed phased plan saved, including data boundaries, micro steps, measurement definitions, budget gates, publication steps and acceptance criteria.
- Capability evidence register created, separating source/test evidence from claims that still require end-to-end measurement.
- Targeted checks passed: 4 test files, 13 tests covering operational memory, benchmark execution/routing, corrections and contract enforcement.
- Added a no-network synthetic runner with a deliberate negative control; this is mechanics evidence only.
- Added a no-network slice invoking the real SemanticMemory and CompletionAuditor classes, including a cross-tenant negative case.
- Added a no-network correction-governance slice covering pending approval, replay-case creation, and automatic-mutation denial.
- Added an optional `SemanticMemoryPersistence` boundary; the default remains in-memory. Durable completion/correction metadata uses separate stores and must not be conflated with semantic memory.
- Added a temporary JSON adapter slice proving hydration and retrieval across separate OS processes; deployment privacy review remains outstanding.
- Added a protocol draft that freezes comparison conditions, task families, scoring definitions, run rules and explicit unmeasured outcomes.
- Added a completion-session handoff slice for persisted goal, requirements, DAG and execution-state continuity.
- Consolidated the verified mechanics outputs into `research/results/mechanics-2026-09-28.json` with explicit limitations.
- Added and validated a zero-spend pilot configuration with concurrency, retry, timeout, billing and unknown-cost stop caps.
- Added a manuscript scaffold with evidence-linked sections and explicit NOT MEASURED result placeholders.
- Added a venue-specific submission checklist with evidence, privacy, licensing, author approval and publication-state gates.
- Full local mechanics sweep passed: all five research slices plus pilot-config validation and TypeScript typecheck.
- Protocol status advanced to `0.1-mechanics-validated`; model IDs, pricing, sample size and provider configuration remain intentionally unfrozen.
- Added a related-work register and comparison matrix with source-quality rules and explicit verification placeholders.
- Added a sanitized results ledger and protocol-consistency validator so frozen conditions, outcomes and publication boundaries stay aligned.
- Re-ran the approved mechanics sweep after cleanup; all checks passed with zero network and provider calls.
- Ran the repository test suite unchanged: 86 files passed, 480 tests passed, 2 skipped.
- Added and linked the public research disclosure page; static and website link acceptance passed.
- Added `NEXT_RUN_INPUTS.md` to preserve the exact continuation point before model-backed evaluation.
- Added the verified regression-suite result to the execution status matrix.
- Audited public comparison and manuscript language; unsupported superiority, novelty and market-leadership claims remain excluded.
- Corrected research-page evidence links to deployable public GitHub paths; website and static acceptance passed afterward.
- Integrated sweep, website link acceptance, and static-site verification all pass at the current checkpoint.
- Focused browser-policy and native-gateway checks passed: 2 files, 10 tests.
- Focused correction-registry and completion-engine checks passed: 2 files, 27 tests.
- Extended the source-to-runtime trace for operational memory and JEv; both remain explicitly bounded by their current persistence and calibration limitations.
- Re-ran the full approved mechanics sweep and TypeScript typecheck after the evidence-matrix updates; both passed.
- Focused memory, context-optimizer and benchmark checks passed: 3 files, 12 tests.
- Focused contract-enforcement check passed: 1 file, 1 test; no dedicated workflow-engine test file is present in this checkout.

## Not completed / no claim made
- Full capability audit, benchmark implementation and real-model evaluation.
- Statistical findings, manuscript results or novelty verification.
- Research publication, submission or acceptance.

## Next actions
1. Complete the source-to-runtime trace for the remaining capability rows in CAPABILITY_EVIDENCE.md.
2. Run deployment-specific semantic-memory acceptance with a privacy-reviewed adapter, then validate the handoff slice and correction recurrence against model-backed tasks.
3. Freeze protocol/task/config hashes after the local consistency and negative-control checks remain green.
4. Prepare a real-model pilot estimate and obtain research spend ceiling before charged batches; the current config is deliberately zero-spend.

## Dependencies to resolve in parallel
- Exact paid model routes and owner-approved experimental spend ceiling.
- Human scientific review and final author/publication approval.
- arXiv author account/endorsement, only when approaching submission; this does not block local work.

## Experiment register
No experimental runs have been performed for this study. Add run IDs, code/config hashes, outcomes, costs and artifact paths here as work proceeds.

## Existing worktree note
At planning time README.md and package.json were already modified; installation/deployment docs, branding and scratch files were also present. Preserve unrelated work. Do not stage the whole repository.
## 2026-09-28 protocol-preserving verification

- Re-ran the approved mechanics sweep without changing the protocol, fixtures, scoring, runner order, or test configuration.
- Sweep passed with zero network calls and zero provider calls; the six synthetic conditions and all validation runners remained valid.
- Re-ran the repository TypeScript check against `tsconfig.vnext.json`; it passed.
- The protocol/input hashes reported by the sweep remain the recorded frozen inputs for this local mechanics track.

## 2026-09-28 related-work register expansion

- Added the official CopilotKit OpenMuse repository and roadmap to the related-work register after source inspection.
- Recorded only implementation-level comparison points (server-owned jobs, reviews, persistent browser/computer workers and artifacts); no performance, novelty or superiority claim was added.
- The approved AgentForge protocol and test configuration were not changed.

