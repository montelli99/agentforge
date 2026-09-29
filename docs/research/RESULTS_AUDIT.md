# White paper results audit

Audit date: 2026-09-28 (historical checkpoint)

This document preserves the findings from the 2026-09-28 audit. It is not the current state summary; use `STATUS_MATRIX.md`, `EXECUTION_LEDGER.md`, and the latest entries in `RESEARCH_PROGRESS.md` for current evidence.

Verdict: INCOMPLETE RESEARCH; NOT READY FOR SUBMISSION AS A COMPLETED EMPIRICAL PAPER.

This is a source-and-artifact audit, not independent academic peer review. No paid experiments, protocol changes, or full regression reruns were performed for this audit. Existing unrelated working-tree edits were preserved.

## What the evidence supports

The saved `research/results/mechanics-2026-09-28.json` reports five small synthetic mechanics checks: scorer wiring, memory/evidence, correction approval, cross-process memory, and persisted handoff state. Their implementations exercise real components, but deterministic fixtures are not measurements of agent intelligence or competitive performance. The cross-process memory runner actually starts separate writer and reader processes using a temporary JSON persistence adapter.

The manuscript correctly labels model outcomes NOT MEASURED. There are no measured baseline/AgentForge comparisons establishing better task completion, lower token consumption, lower cost, reduced hallucination, or improved recovery. The manuscript's repository regression count is separate evidence from a research experiment; this audit did not rerun or independently certify that historical count.

## Findings

### High: research completion was overstated

`docs/research/paper.md` explicitly says manuscript scaffold. Sections 4, 5.5, 9, and the author disclosure still contain drafting instructions. Failure analysis and discussion describe future work. All six comparative conditions remain unrun. This does not meet the completed evaluation and publication-ready paper objective in `WHITE_PAPER_EXECUTION_PLAN.md`.

### High: mechanics sweep can report success despite false check results

`research/runner/mechanicsSweep.ts` only checks child exit codes. `offlineSlice.ts`, `memoryAndEvidenceSlice.ts`, `correctionSlice.ts`, `durableMemorySlice.ts`, and `handoffSlice.ts` print outcome fields without assertions requiring the expected outcomes. A false field does not itself cause a nonzero exit. Therefore the sweep's `passed: true` is not an enforced acceptance verdict for those outcomes. This finding does not establish that the stored true outcomes are false; it establishes that the acceptance gate is inadequate.

### High: file-write prevention claim exceeds the inspected enforcement

`src/providers/harness/nativeHarness.ts` checks file modifications only when both a contract and nonempty `inputFiles` exist. Those are declared input paths, not observed output writes. `nativeComputeExecutor.ts` forwards a nonempty context command to the compute provider and reports `filesModified: []`; this layer does not verify command approval or inspect actual modifications. Other compute-provider safeguards may apply, but the inspected paths do not establish the manuscript's general claim that unauthorized native-harness file writes are prevented. A rejected declared-path fixture supports a narrower claim only.

### High: current scorer fixture exposes its answer

`research/runner/offlineSlice.ts` produces its successful output using `String(input.expected)`. This is reasonable for a scoring smoke test, but not an answer-key-isolated task evaluation. The paper's answer-key isolation statement must be clearly identified as a future study requirement until implemented and verified in the measured route.

### Medium: manuscript validator is a phrase checker

`research/runner/validateManuscript.ts` checks required status text, NOT MEASURED, a protocol phrase, and three banned marketing phrases. It does not verify individual claims, citations, data provenance, numeric results, or manuscript completeness. Its `unsupportedClaims: none detected` must not be presented as a substantive scientific review.

### Medium: accounting and reproducibility claims are ahead of the evidence

Manuscript section 5.4 says trajectories record provider usage and checkpoints avoid repeated charged calls, then says the local sweep proves these mechanics. The inspected sweep neither runs charged trajectories nor verifies that accounting/resume behavior. Its zero-network and zero-provider fields are literals, not measured counters. Offline code paths support a limited no-provider mechanics description, not an instrumented accounting validation.

The file called the complete sanitized record contains five mechanics entries, without the native-contract regression and full-suite records in the paper's table. The sweep does not itself generate that consolidated record. Evidence packaging needs to connect each reported result to its producing run and revision.

### Medium: handoff assertions are too weak for the wording

`handoffSlice.ts` compares requirement and DAG lengths, not complete content. It checks a stored goal hash, not a resumed model's next action. The saved record appropriately says next-action quality is unmeasured. The results wording must preserve that limitation.

## Completion path within the approved plan

1. Correct the status and unsupported wording; finish actual hypotheses, limitations, disclosures, and referenced methods without inventing authors or outcomes.
2. Make existing mechanics checks fail on incorrect outcomes and verify that deliberate failures make the sweep fail. Preserve frozen research definitions; implementation gate repairs must be documented.
3. Verify native execution boundaries using actual forbidden effects in a disposable environment, including omitted path declarations and contract cases. Do not generalize a mock-executor check.
4. Complete the approved synthetic task families, isolate evaluator answers, and connect the runner to the real production components.
5. Validate trajectory accounting, checkpoint/resume, usage uncertainty, and automatic result provenance locally before paid runs.
6. Present the exact paid-run count, route, and spending ceiling as required by the existing plan; then run approved comparisons and report uncertainty, failures, and null findings.
7. Obtain independent review and owner review of the completed publication package before submission.

No frozen protocol, task definition, or implementation was changed by this audit.

## Subsequent repair record

The following audit findings were repaired after this historical review and are covered by the current evidence runs:

- Mechanics slices now assert their positive and negative outcomes instead of relying only on child-process exit codes.
- The handoff fixture verifies the persisted execution state, full requirement contents and full execution-DAG contents after replacement; the corresponding completion-engine regression passes.
- Manuscript wording was narrowed so declared-path write denial and synthetic accounting mechanics are not presented as general production or paid-run guarantees.

The remaining gates are unchanged: production-path acceptance, model-backed comparative measurements, charged-call accounting, independent review and publication.
