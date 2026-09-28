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
- Added a temporary JSON adapter slice proving hydration across separate SemanticMemory instances; separate-process acceptance and deployment privacy review remain outstanding.
- Added a protocol draft that freezes comparison conditions, task families, scoring definitions, run rules and explicit unmeasured outcomes.

## Not completed / no claim made
- Full capability audit, benchmark implementation and real-model evaluation.
- Statistical findings, manuscript results or novelty verification.
- Research publication, submission or acceptance.

## Next actions
1. Complete the source-to-runtime trace for the remaining capability rows in CAPABILITY_EVIDENCE.md.
2. Run a separate-process semantic-memory acceptance test with a privacy-reviewed adapter, then validate model handoff and correction recurrence.
3. Validate the protocol against the local scorers and freeze its version after the negative controls pass.
4. Prepare pilot cost estimate and obtain research spend ceiling before charged batches.

## Dependencies to resolve in parallel
- Exact paid model routes and owner-approved experimental spend ceiling.
- Human scientific review and final author/publication approval.
- arXiv author account/endorsement, only when approaching submission; this does not block local work.

## Experiment register
No experimental runs have been performed for this study. Add run IDs, code/config hashes, outcomes, costs and artifact paths here as work proceeds.

## Existing worktree note
At planning time README.md and package.json were already modified; installation/deployment docs, branding and scratch files were also present. Preserve unrelated work. Do not stage the whole repository.
