# AgentForge research progress

Updated: 2026-09-29
Execution plan: [WHITE_PAPER_EXECUTION_PLAN.md](WHITE_PAPER_EXECUTION_PLAN.md)

Historical entries below preserve earlier checkpoints and their exact measurements. The current truthful state is recorded in the latest dated entries near the end of this file; older runner counts and literal call-count statements are not current-state claims.

## Current verification checkpoint — 2026-09-29

- Hosted CI run `36586933896` for release-evidence commit `8b5bf1d3cfc56346c3ddca893c5d4d8888cb5086` completed successfully across all seven Ubuntu, macOS, Windows, Node 22 and Node 24 jobs, including public-package isolation acceptance. The local release audit reports `packageReady: true`; registry publication and provenance remain deliberately unperformed.
- Latest zero-spend acceptance rerun: `mechanics-2026-09-29T14-53-04-316Z-c33c8131-21e8-4251-b349-2c6656684246`; revision `28d75cb932d67baaa44a042f07ce0c8420570290`. The clean export, review packet, all 22 isolated mechanics checks, manuscript validation, and release-evidence acceptance passed inside the network-denial boundary. This verifies the reproducible mechanics harness only; model-backed quality, measured outcomes, publication submission, and production deployment remain gated.
- Re-ran `pnpm test:research:all` after the latest runner and route-safety changes.
- Re-ran the full repository regression after the same changes: 89 test files passed, 494 tests passed, 2 skipped (496 total; 42.18s).
- Clean export, review packet, all 22 isolated mechanics checks, manuscript validation, and release-evidence acceptance passed.
- Fresh mechanics artifact: `research/results/mechanics-2026-09-29T13-09-45-583Z-24b192c7-b914-42b8-b113-3fe1a5535687/consolidated.json` (SHA-256 `6e2da0f27f815f5eabcacbe16ad4d138d64a3ac1e665f0ad38a8273fd98b5c78`).
- The result remains `MECHANICS_VERIFIED`; model-backed comparative outcomes, complete provider-call instrumentation, human review, hosted CI, registry provenance, and publication remain explicitly unmeasured or unperformed.
- Completed a separate 72-trajectory Phi-3.5 development pilot through the native Ollama adapter. All B0/B1/AF trajectories completed; scorer passes were 0/24, 0/24 and 2/24. Full records and summary are preserved under `research/results/local-adapter-pilot-phi3.5-v0.4*.json`.

## Completed
- Owner requested a detailed plan for Luna to execute.
- Publication routes researched using official arXiv, Zenodo, TMLR and JOSS sources.
- Initial code reconnaissance identified existing benchmark/memory/JEv/completion entry points.
- Detailed phased plan saved, including data boundaries, micro steps, measurement definitions, budget gates, publication steps and acceptance criteria.
- OpenClaw implementation and Hermes official documentation source audits recorded in `RELATED_WORK.md`; the source-register acceptance gate checks eight required URLs, three pinned revisions, and the explicit comparison boundary.
- Prepared the paid-run estimate from the completed local pilot in `PAID_RUN_ESTIMATE.md`; no provider spend was made and actual model prices remain an owner-input gate.
- Repaired and revalidated `RELEASE_EVIDENCE.md`: the latest mechanics artifact now has its SHA-256, the protocol hash matches the current file, and the source-register command is included in the verification sequence.
- Expanded the review-packet acceptance list to 16 current evidence files, including the latest mechanics artifact, mechanics acceptance record, owner packet, paid-run estimate and related-work register; acceptance passed.
- Added the current mechanics-run acceptance document to the packet; the gate now verifies 16 files and asserts the latest artifact is a passing 22-check record.
- Capability evidence register created, separating source/test evidence from claims that still require end-to-end measurement.
- All eight registered literature/product URLs were opened and resolved on 2026-09-29; the citation statements were checked against the source pages and remain bounded to capability/context claims. This does not substitute for matched runtime or performance comparisons.
- The experimental-design definitions for trajectory unit, valid success, false completion, matched affordances, infrastructure/model failure separation, interleaving, dry-run accounting, and real-adapter path evidence are now explicitly marked complete in `WHITE_PAPER_EXECUTION_PLAN.md`; charged comparative execution remains gated.
- Reconciled `MECHANICS_RUNNER_ACCEPTANCE.md` with the current scorer evidence: development controls pass 12/12 correct and reject all negative cases; held-out controls pass 60/60 correct and reject all 60 negative cases with evaluator data outside agent input. This is fixture/scorer integrity evidence, not model quality.
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

## 2026-09-28 Luna runbook execution

- Added fail-closed assertions to the offline, memory/evidence, correction, durable-memory and handoff mechanics runners.
- Added the native execution-contract requirement and destructive-command regression coverage; focused harness/contract tests pass 7/7.
- Added the six protocol-family development fixture manifest with 12 synthetic cases and a validator; it is included in the input hash manifest and mechanics sweep.
- Mechanics sweep passes with 12 runners, zero network calls and zero provider calls. This remains preparation evidence only; no model-backed result is claimed.
- Corrected the development-family fixtures so evaluator expectations are not embedded in agent-visible input; validator now fails on expectation leakage and the sweep remains green with updated fixture hash.
- Added an explicitly synthetic accounting slice covering atomic checkpoints, preservation of unknown billing, no duplicate completed trajectory on resume, and reservation-cap refusal. It is included in the mechanics sweep; production provider accounting remains open.
- Extracted the accounting behavior into a reusable `TrajectoryLedger` with atomic checkpoint, idempotent start, terminal-state resume, unknown billing, and spend-cap enforcement; the synthetic slice now exercises that shared component.
- Added a production-path smoke slice using the real `BenchmarkRunner` plus `TrajectoryLedger`; evaluator answers stay outside agent input, and the run checkpoints a terminal trajectory. It remains synthetic until an approved provider route is connected.
- Bound the zero-spend pilot configuration to the twelve-case development manifest and made validation fail when the declared count or manifest path drifts; refreshed the input hash in the release evidence.
- Added reservation reconciliation to `TrajectoryLedger`: known actual cost replaces the reserved estimate, while unknown billing remains conservatively reserved. Accounting and full mechanics sweep pass after this change.
- Performed a read-only local provider check. Ollama is reachable on loopback with multiple local and cloud-tagged model names; candidates were recorded in the approval packet as unapproved availability evidence. No model call was made.
## 2026-09-28 protocol-preserving verification

- Re-ran the approved mechanics sweep without changing the protocol, fixtures, scoring, runner order, or test configuration.
- Sweep passed with zero network calls and zero provider calls; the six synthetic conditions and all validation runners remained valid.
- Re-ran the repository TypeScript check against `tsconfig.vnext.json`; it passed.
- The protocol/input hashes reported by the sweep remain the recorded frozen inputs for this local mechanics track.

## 2026-09-28 related-work register expansion

- Added the official CopilotKit OpenMuse repository and roadmap to the related-work register after source inspection.
- Recorded only implementation-level comparison points (server-owned jobs, reviews, persistent browser/computer workers and artifacts); no performance, novelty or superiority claim was added.
- The approved AgentForge protocol and test configuration were not changed.

## 2026-09-28 status matrix refinement

- Marked the execution-entry inventory as complete while keeping the broader source reconnaissance in progress.
- Marked the external comparison register as expanded with OpenClaw, Hermes and OpenMuse references; matched-version testing remains open.
- No protocol, fixture, scorer, test command or benchmark condition was changed.

## 2026-09-28 public-site verification

- Verified the public site link graph: 42 pages checked, all local links resolve, and 39 pages include footer navigation.
- Verified the static-site privacy guard: the interactive preview is self-contained and privacy-safe.
- These checks do not alter or substitute for the approved research protocol.

## 2026-09-28 citation link verification

- Re-opened the official OpenClaw integrations, getting-started and Telegram documentation URLs.
- Re-opened the official Hermes quickstart and persistent-memory documentation URLs.
- Re-opened the official OpenMuse repository and roadmap URLs.
- All seven references resolved during this check. This verifies link availability only; it does not turn source descriptions into performance evidence.

## 2026-09-28 primary literature register

- Added primary references for virtualized memory, long-term interactive memory evaluation and trajectory-aware tool-use evaluation.
- Mapped each paper to the study questions without importing its results into AgentForge claims.
- The approved protocol and testing configuration remain unchanged.

## 2026-09-28 consolidated verification

- TypeScript verification passed against `tsconfig.vnext.json`.
- Protocol, evidence-path and manuscript validators passed; the manuscript still correctly reports results as not measured.
- Website link acceptance and static privacy checks passed.
- `git diff --check` found no whitespace errors in the scoped changes.
- No benchmark inputs, fixtures, scorers, or test rules were changed.

## 2026-09-28 plan checklist reconciliation

- Reconciled the first-actions checklist in `WHITE_PAPER_EXECUTION_PLAN.md` against the repository evidence.
- Marked only the seven preparation actions that are demonstrably complete; the paid-run estimate remains open until owner-selected routes, pricing and budget exist.
- Unrelated working-tree files remain untouched.

## 2026-09-28 Phase A checklist reconciliation

- Marked only Phase A items directly supported by existing source traces, fresh-process memory/handoff slices, the claim register, and the documented limitation policy.
- Left normal end-to-end model/tool tracing, context-fact preservation, workflow anti-self-report coverage, correction recurrence, version pinning and citation-claim audits open.
- No testing or protocol definitions were changed.

## 2026-09-28 literature metadata audit

- Added author lists and publication years from the primary arXiv records for MemGPT, LongMemEval and TRAJECT-Bench.
- Confirmed the register describes what each paper evaluates rather than importing its results into AgentForge claims.
- This closes the metadata portion of the literature-register task; version pinning and claim-by-claim citation audit remain open.

## 2026-09-28 citation-claim audit

- Added a claim-by-claim citation audit covering the three primary papers and the OpenClaw, Hermes and OpenMuse product references.
- Recorded the exact supported statement and the boundary for each source; no source is used to imply AgentForge performance or superiority.
- The remaining citation gate is version pinning and final pre-submission recheck.

## 2026-09-28 comparison source pins

- Recorded immutable source refs for OpenClaw, Hermes Agent and OpenMuse in `RELATED_WORK.md`.
- These pins are for reproducible source inspection only; no provider, model or comparative run was performed.
- This closes the initial version-pinning preparation gate while leaving matched configuration testing open.

## 2026-09-28 comparison status update

- Updated the status matrix to mark the source register and immutable repository pins complete.
- Matched supported configurations, live provider round trips and outcome comparisons remain open by design.

## 2026-09-28 public-artifact privacy scan

- Scanned `docs/research`, `research`, and `website` for email addresses, phone-number patterns, local user paths, credential prefixes and private CRM identifiers.
- No personal credentials, private paths, phone numbers or account secrets were found in the public research artifacts.
- Expected documentation terms such as Telegram, CRM and token accounting were reviewed as context, not treated as secret exposure.
- No benchmark or testing configuration was changed.

## 2026-09-28 status matrix privacy update

- Updated the status matrix to link the passing public-artifact privacy scan.
- The final human/public-release review remains required; no claim of release approval was added.

## 2026-09-28 submission checklist reconciliation

- Marked only checklist gates directly supported by current artifacts: capability evidence, protocol version/hash, mechanics-only claim boundaries, privacy scan, and research-page links.
- Kept outcome measurement, clean-checkout reproduction, independent review, authorship, archive, preprint, peer review and mobile/download verification open.
- No submission or publication action was taken.

## 2026-09-28 release-readiness privacy gate repair

- The readiness audit initially failed because the privacy scanners treated the approved public GitHub repository URL as owner data and the public research plan still named two private product integrations.
- Corrected the scanner allowlist for the exact public repository URL and generalized those two plan references.
- Re-ran readiness: package blockers are clear; product-isolation and repository-privacy gates pass.
- External proof remains correctly open: hosted CI evidence and registry/provenance publication have not been performed.
- The approved research protocol and benchmark tests were not changed.

## 2026-09-28 package acceptance repair

- Public package surface and archive privacy acceptance passed.
- CLI acceptance initially found a package metadata mismatch: the `agentforge` bin path lacked the required explicit `./` prefix.
- Corrected only that package metadata field; CLI acceptance now passes and public release readiness reports no local blockers.
- External hosted-CI and registry/provenance evidence remain open. The approved research protocol and benchmark tests were not changed.

## 2026-09-28 package readiness status

- Added a status-matrix row for public package readiness: local blockers are clear after package-surface, archive-privacy and CLI acceptance passed.
- Hosted CI and registry/provenance publication remain external gates and were not attempted.

## 2026-09-28 local release evidence pack

- Added `docs/research/RELEASE_EVIDENCE.md` with the local revision, frozen protocol/input hashes and exact non-paid verification commands.
- The evidence pack explicitly excludes hosted CI, model-backed measurements, registry publication and provenance verification from the completed state.

## 2026-09-28 evidence-pack integrity check

- Confirmed the evidence-pack commit is `d9bd29f` and the working tree contains only pre-existing unrelated user files outside the scoped research changes.
- Static-site privacy and mobile acceptance checks passed again.

## 2026-09-28 regression verification

- Repository regression suite passed: 86 test files, 480 tests passed, 2 skipped.
- This rerun followed the package/privacy gate repairs and did not modify any test or protocol files.

## 2026-09-28 latest readiness recheck

- Public release readiness still reports `packageReady: true`, `publishReady: false`, with no local blockers.
- The only reported gaps remain hosted CI evidence and registry/provenance verification.

## 2026-09-28 mechanics recheck after release repairs

- The approved zero-spend mechanics sweep still passes with the same protocol, fixture and config hashes.
- Correct executor passed all two synthetic cases; the negative control was rejected as expected.
- All runners completed with zero network and provider calls.

## 2026-09-28 owner approval packet

- Added `docs/research/OWNER_APPROVAL_PACKET.md` with the exact decisions required before charged evaluation or publication.
- The packet links the governing inputs and explicitly preserves the zero-spend boundary.

## 2026-09-28 execution ledger reconciliation

- Added `docs/research/EXECUTION_LEDGER.md` with evidence-backed states for environment setup, Gates 2–8, verified commands, and the exact next independent action.
- Reconciled `STATUS_MATRIX.md` so the synthetic fixture row reflects the validated 12-case development split while keeping the 60-case held-out split open.
- Kept paid/model-backed evaluation in `WAITING_FOR_INPUT`; no provider call, publication, or external submission was performed.

## 2026-09-28 worker evidence boundary

- Added a worker-runtime regression test proving that a backend cannot complete a task when it omits a required verification check, even if the returned check passes.
- Updated `SOURCE_RUNTIME_TRACE.md` and `CAPABILITY_EVIDENCE.md` with the exact evidence and the remaining Docker/speculative-path limitation.

## 2026-09-28 Docker evidence boundary

- Added a contracted-Docker regression test proving an approved plan that omits a required check is rejected before a container is created.
- Updated the capability register and source trace; speculative execution remains explicitly caller-supplied and unclaimed as a completion path.

## 2026-09-28 held-out fixture integrity

- Added `research/tasks/protocol-families-v1-heldout.json` with six families and 60 separate synthetic held-out cases.
- Added a fail-closed held-out validator and bound the zero-spend pilot config to both development and held-out manifests.
- Added the held-out manifest to the input hash set and mechanics sweep. No held-out output was used for tuning; no provider call was made.
- Recorded the held-out and refreshed pilot hashes in `RELEASE_EVIDENCE.md`.

## 2026-09-29 measured-run guard

- Added `measuredRunGuardSlice.ts`, which accepts only an explicitly measured configuration with provider/model/version/route identity, a positive spend ceiling, and stop-on-unknown-billing behavior.
- The guard rejects mock, fixture, and synthetic conditions before any provider call. It is included in the zero-spend mechanics sweep; no route was contacted.
- Re-ran the guard, full mechanics sweep, typecheck, and whitespace check; all passed with zero network/provider calls.

## 2026-09-29 normal request trace

- Expanded `SOURCE_RUNTIME_TRACE.md` with the verified conversational request path from web routing through scoped memory, provider streaming, partial-response status, and its separation from governed task execution.
- Added the route-boundary capability row to `CAPABILITY_EVIDENCE.md`; no provider call or protocol change was made.

## 2026-09-29 manuscript synchronization

- Added the verified development/held-out split counts and worker/Docker/measured-run guard rows to `paper.md` and `RESULTS.md`.
- Kept substantive outcomes explicitly unmeasured; no result table or performance claim was populated.

## 2026-09-29 public package recheck

- Re-ran public release readiness, archive privacy, package-surface, and release-evidence acceptance.
- Local package readiness remains true with no local blockers; hosted CI, registry/provenance, authorship approval, and publication remain external gates.

## 2026-09-29 manuscript status correction

- Added an explicit editorial correction to `paper.md` so the conclusion records the held-out split as checked-in and validated but still unrun.
- Manuscript validation and whitespace checks remain green.

## 2026-09-29 context integrity mechanics

- Added `contextIntegritySlice.ts` to verify required synthetic facts and source provenance survive deduplication/compression within the packet budget.
- Added the slice to the mechanics sweep and narrowed the capability claim: provider-billed savings and model retention under pressure remain unmeasured.
- Context slice, full mechanics sweep, typecheck, and whitespace verification all passed with zero network/provider calls.

## 2026-09-29 correction transfer mechanics

- Added `correctionTransferSlice.ts` to verify that an approved correction becomes a stable replay case for a later equivalent synthetic case, while pending and automatic mutations remain denied.
- Updated the capability register and results ledger to keep recurrence claims explicitly unmeasured.

## 2026-09-29 workflow recovery mechanics

- Added `workflowRecoverySlice.ts` to verify an unresolved blocker prevents execution readiness and does not become a completion claim.
- Updated the capability register and results ledger; no model repair or external side effect was attempted.

## 2026-09-29 consolidated mechanics verification

- Updated the status matrix and reproduction guide for the context, correction-transfer, workflow-recovery, measured-run, and held-out checks.
- The complete local sweep is now the authoritative 19-runner verification path; it will be rerun once after this documentation update.

## 2026-09-28 approval-packet safety check

- Public repository privacy acceptance passed with the new owner approval packet.
- Manuscript and evidence-path validators passed; results remain explicitly unmeasured.

## 2026-09-28 checklist evidence link

- Linked `RELEASE_EVIDENCE.md` from the submission checklist for local commit, protocol/input hashes and reproduction commands.
- Kept the release-tag requirement open because no public release tag has been created.

## 2026-09-28 publication status refinement

- Updated the status matrix to distinguish complete local publication preparation from approval-dependent measured results, release tagging, archiving and venue submission.
- No external submission, tag, paid run or publication action was initiated.

## 2026-09-28 next-inputs navigation

- Linked the owner approval packet from `NEXT_RUN_INPUTS.md` so model, pricing, budget, reviewer, runtime and publication decisions have one direct entry point.

## 2026-09-28 execution-plan navigation

- Linked the main execution plan directly to `OWNER_APPROVAL_PACKET.md` so the continuation handoff is self-contained.

## 2026-09-28 research README navigation

- Linked the owner approval packet from `research/README.md` so clean-checkout users can find the decision gate before running charged work.

## 2026-09-28 workflow facade integration coverage

- Added `src/workflowEngine.integration.test.ts` to exercise process compilation, privileged-action blocking without an explicit business rule, and durable goal-session creation through the public workflow facade.
- This adds coverage without changing the frozen protocol, mechanics sweep, existing test commands, or any research measurement claims.

## 2026-09-28 local release and protocol validator sweep

- Re-ran protocol, fixture, pilot-config and manuscript validators successfully.
- Re-ran public release readiness, product-isolation, repository-privacy, package-privacy and CLI acceptance successfully.
- Release readiness remains `packageReady: true` and `publishReady: false` only because hosted CI, registry/provenance evidence and publication actions are intentionally external gates.

## 2026-09-28 website mobile acceptance

- Re-ran the mobile acceptance check across all 42 public pages; metadata and fixed-width hazard checks passed.
- This verifies static mobile constraints only; live device rendering and download verification remain separate release gates.

## 2026-09-28 full regression verification

- Full repository regression passed after the workflow-facade coverage addition: 87 test files, 482 tests passed, 2 skipped.
- The approved protocol and mechanics-only boundary remain unchanged.

## 2026-09-28 native contract boundary repair

- Moved native-harness file-scope contract enforcement ahead of both simulation and attached-executor paths.
- Added a regression proving an unauthorized file write is rejected before the executor runs.
- Focused boundary tests and typecheck passed.
- Re-ran product-isolation, repository-privacy, package-privacy, CLI acceptance and release-evidence checks after the repair; all passed.
- Consolidated public-release readiness also passes with `packageReady: true`, no local blockers, and only hosted-CI/registry-provenance evidence remaining external.

## 2026-09-28 white paper methods expansion

- Expanded `paper.md` with evidence-grounded related work, architecture, task families, conditions, scoring, accounting, failure analysis, limitations boundaries and reproducibility details.
- Kept the abstract, results and conclusion unclaimed until measured results exist.
- Manuscript validator passes with no unsupported claims detected.

## 2026-09-28 reproducibility page

- Added `docs/research/REPRODUCTION.md` with clean-checkout, zero-spend sweep, broader verification and charged-evaluation boundary instructions.
- Updated the public research page to link directly to the reproduction document.
- Manuscript, website link/mobile/static and public-privacy checks all pass.

## 2026-09-28 mechanics-verified white paper completion

- Completed the abstract, mechanics results table, limitations boundary and conclusion in `paper.md`.
- The manuscript now presents the verified zero-spend mechanics evidence while keeping model-backed outcomes explicitly `NOT MEASURED`.
- Manuscript validation passes with no unsupported claims detected.

## 2026-09-28 mechanics sweep recheck

- Re-ran the complete zero-spend mechanics sweep: all 11 runners passed, with zero network/provider calls and all frozen input hashes unchanged.
- The sweep continues to report mechanics only; no model-quality, cost-savings or production-performance claim is inferred.
- Full regression after the repair: 87 test files, 483 tests passed, 2 skipped.

## 2026-09-29 evidence-ledger synchronization

- Re-ran the complete mechanics sweep after the context-integrity, correction-transfer, workflow-recovery, measured-run guard, and owner-approval validator additions.
- All 20 registered runners passed with zero network calls and zero provider calls; frozen protocol, development, held-out, and pilot input hashes were unchanged.
- Synchronized `RELEASE_EVIDENCE.md` with the current runner count and explicit mechanics-only boundary.
- No paid/model-backed study was started; owner approval remains required before any provider route is contacted.

## 2026-09-29 full regression verification

- Full repository regression passed: 87 test files, 486 tests passed, 2 skipped.
- Typecheck, manuscript validation, release-evidence acceptance, and diff checks also passed.
- The paper remains mechanics-verified and model-results-unmeasured; no provider call or spend was introduced.

## 2026-09-29 completion-evidence boundary coverage

- Added a worker-runtime regression proving a contract with `requireHumanApproval` cannot become `completed` merely because required checks pass; it produces an evidence pack and a pending approval instead.
- Focused worker-runtime tests passed: 12/12; typecheck passed.
- Updated the execution ledger to reflect the stronger completion boundary while keeping the backend matrix and provider-backed execution explicitly open.

## 2026-09-29 adapter-boundary coverage

- Added Pydantic adapter regressions for insecure non-loopback HTTP endpoints and successful HTTP responses that omit textual output.
- Focused harness-adapter tests passed: 8/8; typecheck passed.
- Updated the execution ledger to record this boundary without treating the optional adapter as a live production runtime.

## 2026-09-29 backend boundary matrix

- Added `BACKEND_BOUNDARY_MATRIX.md` to inventory native, Docker, worker, Pydantic, Pi and speculative execution surfaces with their actual contract and evidence limits.
- Linked the matrix from the execution ledger and source-to-runtime trace so future agents cannot mistake an adapter seam or response race for production execution authority.
- Typecheck, mechanics sweep, manuscript validation, repository-privacy acceptance and archive-privacy acceptance passed.

## 2026-09-29 speculative side-effect refusal

- Added an explicit `sideEffecting` marker to speculative requests; the response-race executor now refuses marked candidates before invoking any model.
- Added regression coverage proving the executor is not called for a side-effecting candidate.
- Focused broker tests passed: 31/31; typecheck passed.
- Updated the source trace, backend matrix and execution ledger. Governed worker/controller integration remains the open item.

## 2026-09-29 public controller evidence path

- Added a public completion-route integration regression using an explicit worker backend whose required check is missing from returned evidence.
- The route reaches the worker, persists the task as `failed`, and records `verifiedPassed: false`; it cannot report completion from a controller-level request.
- Completion route tests passed: 6/6; typecheck passed.
- Narrowed Gate 3's remaining scope to deployed-runtime acceptance and any future side-effecting controller not covered by the public route.

## 2026-09-29 clean research export

- Added `scripts/research-clean-export-acceptance.mjs` and `pnpm test:research:clean-export`.
- The acceptance check copies the promised research assets to a disposable clean export, verifies all 13 required files are present, scans the exported content for machine-specific paths, credential-shaped values and personal email patterns, then removes the temporary export.
- Clean-export acceptance passed; typecheck passed.

## 2026-09-29 full regression after packaging and controller changes

- Full repository regression passed: 87 test files, 491 tests passed, 2 skipped.
- The run included the public completion-route gate, speculative side-effect refusal, and all existing AgentForge tests.
- No provider-backed research run or external side effect was introduced.

## 2026-09-29 local release-readiness recheck

- Re-ran public release readiness, package/archive privacy, CLI acceptance, website-link acceptance, website-mobile acceptance, and static-site verification.
- Package readiness is `true` with no local blockers. The website checks covered 42 pages; all local links resolved and mobile hazard checks passed.
- Hosted CI, registry publication, provenance verification, and live deployment remain explicitly external gates.

## 2026-09-29 review-packet acceptance

- Added `scripts/research-review-packet-acceptance.mjs` and `pnpm test:research:review-packet`.
- The gate verifies that the eleven required paper/research/reproduction/evidence artifacts are present, non-empty, and retain the `MECHANICS_VERIFIED` / `NOT MEASURED` boundaries.
- Review-packet acceptance passed; typecheck passed. No publication action was performed.

## 2026-09-29 machine-readable approval handoff

- Added `research/config/owner-approval-template.json` with explicit fields for routes, pricing, budget, reviewer, disposable runtime and publication metadata.
- The template defaults to null decisions and disables smoke/pilot authorization; `validateOwnerApprovalPacket.ts` now validates both the prose packet and this template.
- No provider route, spend ceiling, or publication destination is inferred from existing credentials.

## 2026-09-29 capability-register synchronization

- Updated the completion-evidence row in `CAPABILITY_EVIDENCE.md` to cite the public controller integration regression and narrow its remaining limitation to deployed runtime/untested controllers.
- No claim was upgraded to model-quality or production-performance evidence.

## 2026-09-29 current mechanics evidence record

- Added `research/results/mechanics-2026-09-29.json` as the current sanitized machine-readable checkpoint for the 20-runner sweep and public integration guards.
- Updated `RESULTS.md`, clean-export acceptance, review-packet acceptance and release evidence to point at the current record while retaining the prior record as history.

## 2026-09-29 results-ledger synchronization

- Added the current public controller, speculative side-effect, and approval/export mechanics rows to `RESULTS.md` and `paper.md`.
- Each row is explicitly bounded as mechanics evidence and does not introduce a model-quality, cost, or production-performance claim.

## 2026-09-29 mechanics-record provenance

- SHA-256 hashed `research/results/mechanics-2026-09-29.json` and recorded the digest in `RELEASE_EVIDENCE.md`.
- The current sanitized checkpoint is now independently addressable by its frozen input manifest and its own record hash.

## 2026-09-29 release-evidence hash enforcement

- Extended `release-evidence-acceptance.mjs` to recompute and verify the current sanitized mechanics record hash, not only the frozen protocol/input hashes.
- The acceptance output now reports the number of verified sanitized records.

## 2026-09-29 complete frozen-input enforcement

- Expanded `release-evidence-acceptance.mjs` from three to all five frozen protocol, development, held-out and pilot inputs.
- The release gate now verifies the complete input manifest before accepting the evidence record.

## 2026-09-29 release command synchronization

- Added the clean-export and review-packet commands to the canonical `RELEASE_EVIDENCE.md` verification list.
- The documented local release sequence now covers package privacy, CLI acceptance, research export, review packet, and record-hash verification in one repeatable order.

## 2026-09-29 consolidated research audit command

- Added `pnpm test:research:all`, which runs clean-export acceptance, review-packet acceptance, the zero-spend mechanics sweep, manuscript validation and release-evidence hash verification in sequence.
- This is a local preparation command only; it cannot authorize provider calls, spending or publication.

## 2026-09-29 status-matrix refresh

- Updated `STATUS_MATRIX.md` to identify the current sanitized mechanics record and review-packet acceptance as verified preparation evidence.
- Kept measured outcomes, authorship approval, archival publication, and venue submission explicitly open.

## 2026-09-29 next-run handoff refresh

- Linked `NEXT_RUN_INPUTS.md` directly to the machine-readable owner approval template and added the publication metadata decisions to the required input list.
- The next agent now has one prose packet and one structured record to complete; blank/null values remain fail-closed.

## 2026-09-29 public evidence link refresh

- Added the current sanitized mechanics record to `website/research.html` with a direct GitHub link and explicit 20-runner label.
- This keeps the public research page aligned with the latest evidence artifact without presenting it as a model-performance result.

## 2026-09-29 final local consistency pass

- Re-ran `git diff --check`, `pnpm typecheck`, and `pnpm test:research:all` after correcting the five-input release manifest.
- Clean export, review packet, mechanics sweep, manuscript validation, release-evidence verification, and typecheck all passed.
- The local evidence package is internally consistent; charged evaluation, hosted CI, human review, and publication remain open gates.

## 2026-09-29 execution-boundary integration check

- Ran the native harness, contracted Docker backend, worker runtime, public completion route, and speculative broker tests together.
- Five test files passed with 61 tests passed; the public completion route remains fail-closed when required worker evidence is missing, and side-effecting speculative requests remain refused before model invocation.

## 2026-09-29 full repository regression

- Ran the complete repository test suite after the research and execution-boundary changes.
- Result: 87 test files passed; 491 tests passed; 2 skipped. No provider-backed research run or external side effect was introduced.

## 2026-09-29 public release and website acceptance

- Public-release readiness passed locally with no local blockers; the audit correctly leaves hosted CI and registry/provenance proof external.
- Website acceptance passed across 42 pages: all local links resolve, 39 pages include footer navigation, and mobile metadata/fixed-width checks pass.

## 2026-09-29 public artifact build verification

- Built the public TypeScript distribution from a clean `dist` output.
- Public package acceptance passed: emitted entrypoint is importable and integration-free; npm archive privacy inspected 151 shipped files with no private-data signatures.
- Release readiness remains locally clear and correctly awaits hosted CI plus registry/provenance evidence.

## 2026-09-29 completion-audit hardening

- Expanded `completion-audit-check.mjs` from a five-document presence check to a ten-document evidence-boundary check.
- It now requires the research status/ledger, release evidence, owner approval template, and current sanitized record; it verifies truthful mechanics/unmeasured/waiting boundaries and refuses an approval template that enables provider calls or spending by default.
- The hardened completion audit and whitespace check pass.

## 2026-09-29 completion-audit evidence binding

- Bound the completion audit to the release-evidence hash verifier and current mechanics record.
- The audit now requires five verified frozen inputs, one verified sanitized record, and an explicit synthetic-only / zero-network / zero-provider boundary before it can pass.
- `pnpm audit:completion` passes with those checks active.

## 2026-09-29 public verification bundle

- Ran `pnpm verify:public` end to end.
- TypeScript checks, product-isolation privacy, repository privacy, public build/package acceptance, crash recovery, Docker acceptance, and approved Docker E2E all passed.
- Docker evidence now includes an actual network-disabled isolated container and observed execution evidence; deployed provider round trips and publication gates remain separate.

## 2026-09-29 full repository check

- Ran the canonical `pnpm check` command after audit hardening.
- Typecheck, product isolation, the full 87-file / 491-test suite, build, package surface, and archive privacy all passed; 2 tests remain skipped as before.

## 2026-09-29 synchronized research/completion audit

- Re-ran the full research acceptance suite followed by the hardened completion audit.
- Both passed with five frozen inputs, one sanitized record, 20 mechanics runners, zero network/provider calls, and explicit unmeasured-result boundaries.

## 2026-09-29 runbook state reconciliation

- Added an explicit status reconciliation to the Luna runbook so its original unchecked planning boxes cannot be mistaken for the current gate state.
- The runbook now points to the execution ledger for verified local work and clearly separates partial, waiting-for-input, and not-started publication stages.

## 2026-09-29 CLI and launcher acceptance

- CLI package acceptance passed, including least-privilege initialization, manifest/ZIP validation, traversal rejection, package checks and unsafe-name rejection.
- Launcher persistence acceptance passed, restoring workspace hierarchy, SOP assignment, task audit events, messages, operational memory and approved revision history after restart.

## 2026-09-29 status-ledger synchronization

- Updated `STATUS_MATRIX.md` and `EXECUTION_LEDGER.md` to include the verified CLI packaging and launcher persistence evidence in the public-package gate.

## 2026-09-29 reproduction command refresh

- Updated `REPRODUCTION.md` with the hardened completion audit and complete public verification bundle.
- Corrected the recorded repository regression count to 87 files, 491 passed, 2 skipped, and documented the Docker, CLI and persistence coverage.

## 2026-09-29 approval-boundary clarification

- Clarified the owner packet: credentials found on the machine are never treated as route selection, budget authorization, or publication approval.
- Completion audit and whitespace verification remain green after the clarification.

## 2026-09-29 mechanics harness repair

- Replaced the prior exit-code-only mechanics sweep with bounded child execution, output-size and timeout limits, parsed JSON results, versioned envelopes, run IDs, timestamps, input hashes, assertion checks and artifact existence checks.
- Negative regression tests cover exit-zero failure, malformed/absent output, nonzero exits, hangs, output overflow, wrong/duplicate identities, failed assertions, missing artifacts and provenance errors.
- A fresh sweep passed 20 checks and 48 parsed assertions. The fresh record marks network/provider counts `unmeasured`; it does not inherit the prior literal zero-count claim.
- Legacy fixture/scorer depth and independent network instrumentation remain open repair steps; do not call this a model result.

## 2026-09-29 isolated mechanics harness verification

- The stronger isolated sweep exited 0 with 20 checks, 61 parsed assertions and zero envelope errors.
- The Docker denial probe attempted one HTTP request and recorded `ENETUNREACH` with zero external interfaces; the image digest and denial artifact are stored in `research/results/mechanics-2026-09-29T02-13-22-888Z-686e9934-c47d-4112-9e3a-568e5446df44/consolidated.json`.
- Eleven focused sandbox/harness tests and the focused TypeScript check passed.
- Fixture cardinality, identity and shape checks still do not constitute the scientific family scorers required by Section 4. That remains open and is not being represented as completed.

## 2026-09-29 executable protocol-family scorer
- Added evaluator-side deterministic scoring for the six-family development fixture, including required-fact checks and rejection of unsupported completion/side-effect claims.
- Added correct and wrong controls; direct scorer tests passed 14/14.
- Isolated Docker sweep passed with 21 checks, including `scoreProtocolFamilies`: 12/12 correct controls and 0/12 negative controls, evaluator data kept outside agent input.
- This is scorer-mechanics evidence only; real model trajectories and held-out scientific acceptance remain open.

## 2026-09-29 local model route check
- Verified the installed local inventory includes `qwen2.5-coder:7b` with the approved digest prefix `dae161e27b0e`.
- A synthetic no-cloud smoke request to the local Ollama route did not return within the bounded 20-second check; the process was terminated and no trajectory was recorded.
- This is a route-readiness observation, not a model result. No external API was called and no pilot authorization was bypassed.

## 2026-09-29 held-out scorer mechanics
- Added the held-out scorer control for all 60 frozen cases, with evaluator data outside agent input.
- Direct held-out scorer output: 60/60 correct controls and 0/60 negative controls.
- Fresh isolated Docker sweep passed with 22 checks, including both development and held-out scorer controls; network denial remains verified and provider counts remain unmeasured.

## 2026-09-29 bounded local model smoke
- Added a bounded Ollama smoke runner using only the approved local `qwen2.5-coder:7b` route.
- Smoke completed successfully: 65 local tokens reported, zero external API spend, and the synthetic `requiredFact=Friday` response was returned.
- Artifact: `research/results/local-model-smoke.json`. This is a route smoke, not the 72-trajectory pilot or a performance claim.

## 2026-09-29 research gate regression
- `pnpm test:research:all` passed: clean export, review packet, fresh 22-check isolated mechanics sweep, manuscript validator, and release-evidence acceptance.
- The review packet correctly remains `MECHANICS_VERIFIED`; measured outcomes remain explicitly `not measured`.

## 2026-09-29 pilot manifest
- Added a deterministic pilot-manifest builder from the frozen configuration and development task manifest.
- Generated 72 stable trajectory IDs across B0, B1 and AF with two replicates, while hard-enforcing provider and network flags to false.
- Artifact: `research/results/pilot-manifest-v0.1.json`. All usage and cost fields remain unknown until an approved production adapter dispatches them.

## 2026-09-29 pilot manifest verification
- Repository typecheck passed with `pnpm typecheck`.
- Manifest verification found 72 planned, 72 actual and 72 unique trajectory IDs; provider and network flags are both false.

## 2026-09-29 production model adapter smoke
- Exercised the existing `AgentForge.OllamaModelProvider` directly, rather than the standalone HTTP helper.
- Approved local model returned the synthetic JSON response with 65 reported tokens and zero external cost.
- This verifies the production model adapter route for a smoke case; the full B0/B1/AF trajectory adapters and pilot remain open.

## 2026-09-29 local adapter pilot guard
- A 72-call local adapter pilot harness was added, but the first unbounded sequential attempt was interrupted after repeated provider waits; it produced no result artifact and is not counted as a run.
- This exposed a required repair: per-trajectory timeout/checkpoint persistence must be enforced outside the provider before rerunning the pilot. No performance or failure rate is inferred from the interrupted attempt.

## 2026-09-29 adapter timeout repair
- Extended `OllamaModelProvider` to honor the caller's `AbortSignal`; the pilot now imposes a 10-second per-trajectory bound instead of inheriting an unbounded batch wait.
- Repository typecheck completed before the subsequent local provider rerun became unresponsive; no new trajectory was recorded and no result claim is made.

## 2026-09-29 pilot timeout slice
- Ran a one-trajectory pilot slice with the repaired cancellation path.
- The provider was aborted at 10,000ms and the record was persisted with `status=failed`, `usage=unknown`, and no cost inference.
- This verifies bounded failure recording; it is not a pilot result and the full 72-trajectory run remains deferred until the local route is responsive.

## 2026-09-29 pilot checkpointing
- Pilot runner now checkpoints after every trajectory and resumes only unfinished IDs, preventing duplicate completed trajectories after interruption.
- Typecheck passed; a one-trajectory bounded slice persisted its failed record as expected.

## 2026-09-29 pilot condition separation
- Added explicit condition policies for B0, B1 and AF and wired them into the local adapter runner.
- Typecheck and condition-boundary test passed; the three prompts are distinct and auditable.
- This prevents the pilot from silently treating the three conditions as the same system; full AF production context remains a separate integration task.

## 2026-09-29 AF context adapter
- Added a synthetic tenant-scoped AF context adapter using the existing AgentForge semantic-memory path and hash-fallback embedding mode.
- Wired AF pilot prompts to include only retrieved synthetic memory; B0 and B1 remain separate policies.
- Adapter test and repository typecheck passed. No private or production data is mounted.

## 2026-09-29 trajectory retry ledger
- Hardened the existing trajectory ledger with explicit failure checkpointing and a maximum of two attempts per trajectory.
- A third attempt is rejected and spend reservations remain bounded.
- Ledger retry test and repository typecheck passed.

## 2026-09-29 focused runner regression
- Complete focused runner suite passed: 18 tests, including AF context, Docker network/read-only enforcement, scorer controls, condition separation, and retry ledger behavior.

## 2026-09-29 final integrity pass
- `pnpm typecheck` passed and the complete focused runner suite passed again: 18/18.
- `git diff --check` reported only pre-existing/newline-at-EOF warnings in two runner files; no whitespace errors in the new AF, scorer, pilot or ledger additions.

## 2026-09-29 post-cleanup regression
- After newline cleanup, `pnpm typecheck` and the focused runner suite passed again: 18/18.

## 2026-09-29 pilot ledger integration
- Wired the local adapter pilot to the durable `TrajectoryLedger` for start, completion, failure, reservation and retry accounting.
- A bounded failed slice produced a corresponding ledger record with unknown usage and cost, preserving the no-inference rule.

## 2026-09-29 research acceptance rerun
- Full `pnpm test:research:all` passed against the current source: clean export, review packet, fresh 22-check Docker mechanics run, manuscript validation, and release-evidence acceptance.
- Review state remains `MECHANICS_VERIFIED`; measured outcomes remain explicitly unmeasured.

## 2026-09-29 B1 context boundary
- B1 pilot prompts now include an explicit bounded synthetic rolling-summary context; B0 receives no retained context and AF retrieves synthetic memory through its adapter.
- Condition test and repository typecheck passed.

## 2026-09-29 AF memory retrieval assertion
- Strengthened the AF adapter test to require a real synthetic memory hit and the expected `Friday` fact in the assembled prompt.
- Adapter test and repository typecheck passed.

## 2026-09-29 condition negative boundary
- Strengthened condition tests to verify B1 includes rolling-summary context while B0 explicitly does not.
- AF memory and condition tests passed; repository typecheck passed.

## 2026-09-29 AF tenant isolation
- Added a cross-tenant negative assertion: synthetic memory is retrieved for its owning tenant and not exposed to another tenant.
- AF context test and repository typecheck passed.

## 2026-09-29 AF trajectory context evidence
- Pilot records now include the AF tenant and memory-hit audit fields for each attempted AF trajectory.
- Typecheck and all 18 focused runner tests passed.

## 2026-09-29 status reconciliation
- Corrected the status matrix's stale mechanics counts and wording: the current sweep is 22 checks with development and held-out controls; production adapters and model-backed outcomes remain open.

## 2026-09-29 reproduction handoff
- Added exact commands for rebuilding the pilot manifest, running local model/adapter smoke checks, and executing a bounded resumable adapter slice.
- Documented that the adapter pilot is not the final B0/B1/AF study until production adapters and held-out gates are complete.

## 2026-09-29 handoff acceptance
- Clean-export acceptance passed with 13 public-safe files checked.
- Repository typecheck passed after the reproduction-document update.

## 2026-09-29 review and release evidence
- Review-packet acceptance passed with 11 packet files and state `MECHANICS_VERIFIED`.
- Release-evidence acceptance passed with five frozen inputs and one sanitized record; publication remains unperformed and measured outcomes remain unmeasured.

## 2026-09-29 durable adapter smoke evidence
- Updated the production-adapter smoke to persist its result JSON when it completes, rather than relying on terminal output.
- The current local route did not complete the rerun within the bounded command window, so no new smoke artifact or model result is claimed; typecheck passed.

## 2026-09-29 durable adapter smoke completed
- The bounded production-adapter smoke completed successfully and wrote `research/results/production-adapter-smoke.json`.
- Local qwen2.5-coder:7b returned the synthetic response with 65 reported tokens and zero external spend.

## 2026-09-29 first adapter trajectory
- Resumed the previously failed B0 trajectory on attempt 2; it completed with 111 local tokens and zero external cost.
- The model correctly refused to invent unavailable prior context, so the frozen delayed-recall scorer marked it failed for the required fact. This is the first actual model-backed trajectory record, not a mechanics claim.

## 2026-09-29 local adapter pilot in progress
- Resumable 72-trajectory local adapter batch is running with durable checkpoints and ledger accounting.
- Current observed checkpoint: 35 trajectories recorded, 33 completed and 2 failed; failures are preserved and are not being excluded.
- This remains an adapter pilot, not final comparative evidence, until the full batch and production-path acceptance are complete.

## 2026-09-29 local adapter pilot completed
- All 72 planned local adapter trajectories were recorded: 68 completed and 4 bounded timeouts, with no exclusions.
- Completed counts: B0 22, B1 24, AF 22. Scorer passes: B0 0, B1 0, AF 2.
- Token totals for completed records: B0 2,332; B1 3,256; AF 2,762. External spend is zero; failures retain unknown usage where no provider response existed.
- Timeout failures were B0 duplicate-timeout-recovery-02 (both replicates) and AF handoff-continuation-01 (both replicates).
- This is a local adapter pilot result, not a final comparative AgentForge study: full production-path adapter fidelity and held-out model execution remain open.

## 2026-09-29 pilot summary artifact
- Added `research/results/local-adapter-pilot-summary.json`, generated directly from all 72 trajectory records.
- Summary preserves timeouts in denominators, reports per-condition token totals and scorer passes, and explicitly labels the result as adapter-pilot evidence only.
- Repository typecheck passed.

## 2026-09-29 pilot interpretation note
- Added `docs/research/LOCAL_ADAPTER_PILOT.md` documenting the 72-record pilot, exact artifacts, timeout denominator, token totals and limits on interpretation.
- Clean-export acceptance and repository typecheck passed.

## 2026-09-29 release-state reconciliation
- Updated the status matrix to distinguish the completed local adapter pilot from final production-path model measurements and publication readiness.

## 2026-09-29 smoke artifact self-description
- Fixed the production-adapter smoke writer so the persisted JSON includes its own artifact path.
- Reran successfully: 65 local tokens, zero external spend, durable artifact verified.

## 2026-09-29 post-smoke focused regression
- After the durable production-adapter smoke artifact fix, the focused research runner suite passed **18/18** tests.
- This verifies the current runner, scorer, ledger, context-isolation, sandbox, and adapter-smoke mechanics together; it does not close the remaining production-path measurement or publication gates.

## 2026-09-29 release-evidence reconciliation
- Corrected `docs/research/RELEASE_EVIDENCE.md` so its mechanics statement matches the latest 22-check isolated sweep.
- Removed the stale literal zero network/provider claim; Docker denial is verified, while complete call counts remain explicitly unmeasured.
- Release-evidence acceptance passed with five frozen inputs and one sanitized record.

## 2026-09-29 full local research acceptance rerun
- `pnpm test:research:all` passed end to end: clean export, review packet, isolated mechanics sweep, manuscript validation, and release-evidence acceptance.
- Fresh mechanics artifact: `research/results/mechanics-2026-09-29T03-02-42-666Z-7324866b-4d0c-4fd4-bf7b-671622abf4ef/consolidated.json`.
- The fresh run passed 22 registered checks, verified Docker network denial, and retained `networkCalls` and `providerCalls` as `unmeasured`.
- Review state remains `MECHANICS_VERIFIED`; measured outcomes and publication actions remain open.

## 2026-09-29 Gate 5 state reconciliation
- Added an explicit Gate 5 status note to `LUNA_RESEARCH_COMPLETION_RUNBOOK.md`.
- The note distinguishes the verified local runner/recovery mechanics and Ollama adapter pilot from the still-open approved comparative study, billing reconciliation, and deployed-runtime acceptance.

## 2026-09-29 refreshed production-adapter smoke
- Reran the bounded `AgentForge.OllamaModelProvider` smoke successfully.
- The current artifact reports qwen2.5-coder:7b, 65 provider-reported tokens, the required synthetic fact, and USD 0 external API spend.
- This is fresh adapter evidence only; it does not substitute for the approved comparative study or prove general model quality.

## 2026-09-29 status-matrix reconciliation
- Updated `STATUS_MATRIX.md` to point to the latest 22-check mechanics evidence rather than the stale dated filename and to preserve the explicit unmeasured production/model gates.

## 2026-09-29 post-reconciliation verification
- Repository typecheck passed with `pnpm typecheck`.
- Public research clean-export acceptance passed with 13 files checked and no export violations.

## 2026-09-29 capability-evidence reconciliation
- Updated the operational-memory row to reflect the existing cross-project negative test rather than listing it as missing.
- The remaining boundary is now accurately limited to persistence/storage deployment acceptance and semantic-retrieval claims.

## 2026-09-29 operational-memory focused verification
- `pnpm vitest run src/providers/memory/operationalMemory.test.ts` passed: 1 file, 2 tests.
- The test confirms shared workspace rules remain visible while a different project's record is excluded from the scoped query.

## 2026-09-29 semantic-memory persistence verification
- Added `src/semanticMemory.persistence.test.ts` with deterministic restart-style reload and cross-tenant exclusion checks.
- Focused run passed: 1 file, 2 tests.
- Updated `CAPABILITY_EVIDENCE.md`; deployment-specific encryption/privacy/storage acceptance and measured retention remain open.

## 2026-09-29 durable-memory cross-process verification
- Ran `research/runner/durableMemorySlice.ts` successfully.
- A synthetic entry persisted through a temporary JSON adapter and was retrieved by a separate OS process (`retainedAcrossProcess: true`).
- The slice remains synthetic and zero-network; production privacy-reviewed storage and measured retention remain open.

## 2026-09-29 full repository regression after persistence coverage
- `pnpm test --reporter=dot` passed: **88 test files**, **493 passed**, **2 skipped**.
- The total increased from the prior baseline because the semantic-memory persistence test is now included in the repository suite.

## 2026-09-29 release-evidence test-count reconciliation
- Updated `RELEASE_EVIDENCE.md` to use the verified 88-file / 493-passed / 2-skipped regression result instead of the stale 87-file / 491-passed baseline.

## 2026-09-29 review-packet revalidation
- Research review-packet acceptance passed with 11 required files.
- State remains `MECHANICS_VERIFIED`; publication action is not performed and measured outcomes remain not measured.

## 2026-09-29 public research-site acceptance rerun
- Website link acceptance passed for 42 pages; all local links resolve and 39 pages include footer navigation.
- Website mobile acceptance passed for all 42 pages.
- Static website verification passed with a privacy-safe, self-contained interactive product preview.

## 2026-09-29 browser-policy focused verification
- `pnpm vitest run src/providers/browser/jevUltrafastBrowser.test.ts` passed: 1 file, 8 tests.
- The checks cover stale/hidden/unobserved targets, unsupported operations, immediate re-observation, bounded steps, and independent completion verification.
- Live provider round trips remain deployment-specific and are not claimed by this test.

## 2026-09-29 browser capability-evidence reconciliation
- Updated `CAPABILITY_EVIDENCE.md` to include the eight browser-policy tests and their exact boundary.
- The remaining requirement is now explicitly a disposable real-browser bridge acceptance, not another policy-unit test.

## 2026-09-29 native gateway focused verification
- Native gateway and Telegram lifecycle checks passed: 7 focused files, 20 tests.
- Updated `CAPABILITY_EVIDENCE.md` with the exact local evidence and preserved the boundary that authenticated provider round trips still require disposable test accounts.

## 2026-09-29 status-matrix channel reconciliation
- Updated `STATUS_MATRIX.md` with the separate browser-policy and native-gateway test counts instead of the stale combined 2-file / 10-test summary.

## 2026-09-29 execution-ledger reconciliation
- Corrected `EXECUTION_LEDGER.md` to the latest 22-check mechanics sweep, observed Docker network denial, and explicit unmeasured network/provider counts.
- Updated Gate 5 to distinguish the Ollama adapter pilot from the still-open approved comparative route.

## 2026-09-29 post-ledger full research acceptance
- `pnpm test:research:all` passed end to end after the ledger/evidence updates.
- Fresh mechanics run passed 22 checks with Docker network denial verified and network/provider counts unmeasured.
- Clean export, review packet, manuscript validation and release-evidence acceptance all passed.

## 2026-09-29 execution-ledger command reconciliation
- Updated `EXECUTION_LEDGER.md` to list the current full research acceptance, repository regression, persistence/browser, and native-channel verification commands.
- The command list now matches the evidence recorded in this progress log rather than only the earlier checkpoint.

## 2026-09-29 execution-ledger acceptance check
- Release-evidence acceptance remained valid after the ledger update: five frozen inputs and one sanitized record.
- `git diff --check` reported no whitespace errors in the updated research documents.

## 2026-09-29 post-ledger public-package gates
- Clean-export acceptance passed with 13 files checked.
- Review-packet acceptance passed with 11 required files and state `MECHANICS_VERIFIED`.
- Publication action remains unperformed and measured outcomes remain explicitly unmeasured.

## 2026-09-29 results-ledger reconciliation
- Updated `RESULTS.md` to stop pointing at the stale dated mechanics filename and instead identify the latest 22-check artifact through the progress record.

## 2026-09-29 public-release readiness rerun
- `public-release-readiness.mjs` passed local package checks with `packageReady: true`, no local blockers, and `publishReady: false` only for unperformed hosted CI, registry publication, and provenance verification.
- Public package acceptance passed; the archive privacy gate inspected 151 shipped files with no internal paths or private-data signatures.

## 2026-09-29 stale-public-claims reconciliation
- Corrected `paper.md`, `REPRODUCTION.md`, and `STATUS_MATRIX.md` to remove stale 2026-09-28/20-runner/zero-call/87-file claims.
- Public text now reflects the latest 22-check mechanics evidence, 88-file/493-test regression, Docker denial verification, and explicitly unmeasured complete call counts.

## 2026-09-29 manuscript stale-claim follow-up
- Corrected the paper header, abstract boundary, and full-regression row after a second scan found older 2026-09-28 and 87-file references.
- Manuscript now consistently states the 22-check Docker-denial evidence and the current 88-file/493-test regression.

## 2026-09-29 manuscript and review-packet revalidation
- Review-packet acceptance passed with 11 required files and state `MECHANICS_VERIFIED`.
- Manuscript validation passed with results `not measured` and no unsupported claims.

## 2026-09-29 latest full research acceptance
- `pnpm test:research:all` passed after manuscript cleanup.
- Fresh mechanics artifact: `research/results/mechanics-2026-09-29T03-23-54-597Z-17a37791-c4fe-4287-9302-4712bf6aca35/consolidated.json`.
- All 22 checks passed; Docker network denial was verified; complete network/provider call counts remain unmeasured.

## 2026-09-29 capability-register date reconciliation
- Updated `CAPABILITY_EVIDENCE.md` to the current verification date after the browser, channel, memory and manuscript evidence updates.

## 2026-09-29 historical-audit labeling
- Labeled `RESULTS_AUDIT.md` as a historical 2026-09-28 checkpoint and linked readers to the current status, ledger and progress records.

## 2026-09-29 owner-input boundary recheck
- Release-evidence acceptance remained valid with five frozen inputs and one sanitized record.
- Public-release readiness still reports no local blockers; the next model-backed/publication phase remains unauthorized until the owner-input template has explicit routes, dated pricing, limits, reviewer, runtime and publication decisions.

## 2026-09-29 completion-audit marker repair
- The completion audit initially found that the status documents lacked the exact truthful marker `model-backed outcome measurements`.
- Added that marker to `STATUS_MATRIX.md` and reran `completion-audit-check.mjs` successfully.
- Audit result: passed, 10 source documents, five frozen inputs, one sanitized record, synthetic-only mechanics state.

## 2026-09-29 completion-audit package revalidation
- Completion audit passed again after the marker repair.
- Clean-export acceptance also passed with 13 files checked and no export violations.

## 2026-09-29 review and evidence acceptance after audit repair
- Review-packet acceptance passed with 11 required files and state `MECHANICS_VERIFIED`.
- Release-evidence acceptance passed with five frozen inputs and one sanitized record.

## 2026-09-29 current acceptance recheck
- Completion audit passed: 10 source documents, five frozen inputs, one sanitized record, synthetic-only.
- Clean-export acceptance passed across 13 files.
- Review packet remains `MECHANICS_VERIFIED`; publication and measured outcomes remain intentionally open.
- Typecheck passed with `pnpm typecheck` against `tsconfig.vnext.json`.

## 2026-09-29 execution baseline refresh
- Working baseline recorded without altering unrelated work: branch `vnext`, revision `042ed59b90220f509e5c977a40dae15c4675a518`, Node `v25.6.1`, pnpm `10.30.1`.
- The checkout had 108 pre-existing dirty entries; none were reset or staged by this pass.
- Frozen input hashes recorded: `PROTOCOL.md` `554D7DBE827D0E6B4D2232C6168688B318C2514693355188C12127EC890DD6D7`; pilot config `707C5066608DCE915028AF5B709190A1FBE6259E2521C3BE25ED89B5FCFD0DEE`; development tasks `B85F50DFA23A3B08041CE5B492187E2AAF1CD059B7D03937F4945747E5521DCB`; held-out tasks `B59C928972CDE8F80974A76D45022D72AFF1588D763D40C891F6F1FA48F1E173`.

## 2026-09-29 public package acceptance refresh
- Public package acceptance passed: built package surface is emitted, mapped, importable, and private-integration free; archive privacy inspected 151 shipped files with no internal paths or private-data signatures.
- Public release readiness passed all local checks and reports `packageReady: true`; `publishReady: false` remains limited to unrecorded hosted CI and unperformed registry/provenance publication evidence.

## 2026-09-29 integrated research acceptance refresh
- `pnpm test:research:all` passed end to end.
- Latest mechanics run `mechanics-2026-09-29T03-30-05-509Z-1ee36755-2f80-4427-9d5e-17ea58fd96bd` passed all required checks inside the Docker network-denial boundary; network/provider call counts remain explicitly `unmeasured`.
- Manuscript validation passed with `results: not measured` and no unsupported claims; release evidence remained valid.

## 2026-09-29 local production-path evidence refresh
- `productionAdapterSmoke.ts` passed through `AgentForge.OllamaModelProvider` using `qwen2.5-coder:7b`; 65 local tokens, external spend `$0`, and no paid provider was contacted.
- `durableMemorySlice.ts` passed its separate-process restart check with one persisted entry and `retainedAcrossProcess: true`; the result remains synthetic-only and does not claim deployment readiness.

## 2026-09-29 full regression refresh
- `pnpm test --reporter=dot` passed: 88 test files, 493 tests passed, 2 skipped.

## 2026-09-29 website acceptance refresh
- Website link acceptance passed across 42 pages; all local links resolved and 39 pages include footer navigation.
- Mobile acceptance passed across 42 pages with no fixed-width hazards or missing mobile metadata.

## 2026-09-29 public isolation refresh
- Public repository privacy acceptance passed: tracked and candidate source contain no owner-specific operations labels or archived private artifacts.
- Product isolation acceptance passed: generic product source and public site contain no legacy integration or personal-release identifiers and default to an isolated port.

## 2026-09-29 CLI release acceptance refresh
- CLI package acceptance passed: install/init, least-privilege package creation, manifest and archive validation, traversal rejection, package checks, and unsafe-name rejection all passed.

## 2026-09-29 decision-record reconciliation
- Reconciled `OWNER_DECISIONS_AND_NEXT_ACTIONS.md` with current artifacts: the local smoke and 72-record adapter pilot are complete, while production-path fidelity, held-out scoring, human review, and publication remain explicitly open.

## 2026-09-29 held-out fixture gate refresh
- Held-out fixture validation passed for six families and 60 cases.
- Held-out scorer controls passed all 60 deterministic fixture cases with evaluator data outside agent input. This validates fixture/scorer integrity only; no model outputs or performance claims are implied.

## 2026-09-29 channel and browser safety refresh
- Focused browser and native channel safety suite passed: 8 test files and 28 tests, covering JEv browser controls, native gateway registries, and Telegram session/preflight paths.

## 2026-09-29 production build refresh
- `pnpm build` passed, compiling the current TypeScript source into the public `dist` artifact after a clean output step.

## 2026-09-29 diff integrity refresh
- `git diff --check` passed after removing one trailing-whitespace defect from `CAPABILITY_EVIDENCE.md`; remaining output is line-ending normalization warnings only.

## 2026-09-29 repository check refresh
- `pnpm check` passed: full typecheck, product-isolation acceptance, 88 test files / 493 passed / 2 skipped, production build, and public package/archive privacy acceptance.

## 2026-09-29 public evidence-link repair
- Updated `website/research.html` to point to the latest 22-check mechanics artifact instead of the stale checkpoint and corrected its link description.
- Website link acceptance passed again across 42 pages with 39 footer navigations.

## 2026-09-29 static preview verification
- `node website/verify-static.mjs` passed: the public site preview is privacy-safe, self-contained, and interactive.

## 2026-09-29 latest mechanics record indexing
- Added the latest verified 22-check consolidated mechanics artifact and SHA-256 digest to `RELEASE_EVIDENCE.md` while preserving the prior sanitized checkpoint.
- Release-evidence acceptance still passes with five frozen inputs and one sanitized record.

## 2026-09-29 completion audit recheck
- Completion audit passed again: 10 source documents, five frozen inputs, one sanitized record, synthetic-only.
- Clean-export acceptance passed across 13 files after the latest evidence-index update.

## 2026-09-29 status-matrix reconciliation
- Corrected stale matrix language that said no model run had occurred. It now distinguishes the completed local adapter pilot from the still-open held-out model execution and requires a new approved manifest before that run.
- Completion audit passed after the reconciliation.

## 2026-09-29 artifact-link integrity check
- Verified the website-linked latest mechanics artifact exists, is 932,160 bytes, and matches the SHA-256 digest recorded in `RELEASE_EVIDENCE.md`.

## 2026-09-29 approval-boundary refresh
- Owner approval template validation passed with six required decisions; provider calls and spending remain explicitly unauthorized by default.

## 2026-09-29 next-inputs clarification
- Clarified `NEXT_RUN_INPUTS.md` so the completed delegated zero-spend local adapter pilot is distinguished from still-unauthorized paid, held-out, and publication work.
- Completion audit passed after the clarification.

## 2026-09-29 evidence-package recheck
- Release-evidence acceptance and review-packet acceptance both pass after the next-inputs clarification: five frozen inputs, one sanitized record, 11 packet files, `MECHANICS_VERIFIED`.

## 2026-09-29 results-boundary clarification
- Added an explicit local-adapter-pilot boundary to `RESULTS.md`, separating its 72 engineering trajectories from unmeasured model-backed outcome claims.
- Completion audit passed after the clarification.

## 2026-09-29 public pilot disclosure
- Added the verified local-pilot boundary and links to the sanitized pilot summary on `website/research.html`.
- Website link acceptance and static-preview verification both passed after the update.
- Mobile acceptance also passed across all 42 pages after the disclosure update.

## 2026-09-29 disclosure privacy recheck
- Public repository privacy and product-isolation acceptance both passed after adding the pilot disclosure and links.

## 2026-09-29 package privacy recheck
- Public package acceptance passed after the website disclosure update; 151 shipped files were inspected with no private-data signatures.

## 2026-09-29 final audit recheck
- Completion audit passed after the public package update: 10 source documents, five frozen inputs, one sanitized record, synthetic-only.

## 2026-09-29 public execution verification
- `pnpm verify:public` passed end to end: typecheck, product/repository privacy, build, package surface, crash recovery, isolated Docker acceptance, and approved Docker E2E with observed evidence.

## 2026-09-29 ledger command synchronization
- Added `pnpm verify:public` to the ledger's verified command inventory and updated the interpretation to include crash-recovery and approved Docker E2E evidence.

## 2026-09-29 mechanics run identification
- Added the exact latest 22-check mechanics run ID to Gate 2 in `EXECUTION_LEDGER.md` so the verified state resolves to a concrete artifact rather than a generic claim.

## 2026-09-29 clean-export recheck
- Clean research export acceptance passed across 13 files after the ledger and results-page updates.

## 2026-09-29 latest mechanics artifact refresh
- The integrated research run produced a newer passing 22-check artifact `mechanics-2026-09-29T03-49-50-052Z-1c780071-0335-4769-b1c9-b274f235633c`.
- Updated the public research link and `RELEASE_EVIDENCE.md` with its SHA-256 digest; website link acceptance and release-evidence acceptance both pass.

## 2026-09-29 review packet recheck
- Review-packet acceptance passed with 11 packet files and state `MECHANICS_VERIFIED`.
- Release-evidence acceptance passed with five frozen inputs and one sanitized record; measured outcomes and publication remain unperformed.

## 2026-09-29 execution-ledger synchronization
- Synchronized `EXECUTION_LEDGER.md` with the current build, website, package, CLI, and static-preview acceptance commands.
- Removed one trailing-whitespace defect from the ledger; `git diff --check` passes with only line-ending warnings.

## 2026-09-29 source-trace refresh
- Refreshed `SOURCE_RUNTIME_TRACE.md` to the current date and aligned its native-channel evidence wording with the focused lifecycle/Telegram test results while preserving deployment-specific limits.
- Completion audit passed after the trace update.


- 2026-09-29 — Added the non-stop execution contract to the shared runbook. The active goal stays open; execution resumes from the earliest unchecked dependency, with unresolved external/paid gates explicitly recorded as WAITING_FOR_INPUT rather than used to pause the goal.
- 2026-09-29 — Re-ran release-evidence acceptance and completion audit. Both passed: revision 3c58486030e1d4b3ee644fac95dd1883876caad7; 5 frozen inputs; 1 sanitized record; 10 source documents; synthetic-only boundary preserved. No paid provider or publication action performed.
- 2026-09-29 — Revalidated held-out protocol manifest: valid, fixture `research-protocol-families-v1-heldout`, 6 families, 60 held-out cases. This verifies fixture/protocol integrity only; it does not claim model quality or paid execution.
- 2026-09-29 — Deterministic held-out scorer passed 60/60 fixture cases for `protocol-family-v1-heldout`. Evaluator data is outside agent input; this is fixture/scorer integrity evidence, not a model-performance or production-quality claim.
- 2026-09-29 — Production adapter smoke passed through `AgentForge.OllamaModelProvider` using local `qwen2.5-coder:7b`; 65 local tokens, external spend $0. Artifact: `research/results/production-adapter-smoke.json`. This verifies adapter execution only, not comparative model quality.
- 2026-09-29 — Durable-memory slice passed across separate OS processes: retainedAcrossProcess=true, networkCalls=0, syntheticOnly=true. This verifies hydration/retrieval with a temporary JSON adapter; production persistence still requires privacy-reviewed tenant-safe storage.
- 2026-09-29 — Integrated research acceptance passed end-to-end in Docker network-denial isolation. Run `mechanics-2026-09-29T10-00-02-464Z-8bba4dcf-c427-4e3c-ac56-17c58fa8ad2c`; 22 required checks passed. Manuscript remains scaffold, measured results remain not measured, and publication remains not performed.
- 2026-09-29 — Updated the public research page and release-evidence record to the latest 03:54 mechanics artifact; clean-export, release-evidence, and mobile acceptance all passed. SHA-256: 9a6b338733e8a838c7a37d7feb46e0e71d13e1911bf400e95d13d9d5e4dd7f89
- 2026-09-29 — Release-surface verification passed after the evidence-link update: static website preview is privacy-safe/self-contained; public package surface and npm archive privacy gate passed across 151 shipped files with no internal paths or private-data signatures.
- 2026-09-29 — Public CLI acceptance passed: published CLI installs as `agentforge`, initializes a least-privilege unlicensed package, validates manifests/ZIP archives, rejects traversal and unsafe package names, and completes package checks.
- 2026-09-29 — Public repository privacy and product-isolation acceptance passed: no owner-specific operations labels or archived private artifacts; generic product source/site contain no legacy integration or personal-release identifiers and default to an isolated port.
- 2026-09-29 — Owner-approval boundary validator passed using `research/runner/validateOwnerApprovalPacket.ts`: six required decisions present; provider calls and spend remain unauthorized by default; current-study decisions remain separate from the template.
- 2026-09-29 — Website link acceptance passed after the research-link update: 42 pages checked, all local links resolve, and 39 pages include footer navigation.
- 2026-09-29 — Repository integrity check initially found two extra blank lines at EOF in the updated evidence/page files; normalized both files and reran `git diff --check`, which now passes.
- 2026-09-29 — Review-packet acceptance passed after the evidence and formatting repairs: 11 packet files, state `MECHANICS_VERIFIED`; publication action not performed and measured outcomes not measured.
- 2026-09-29 — `pnpm verify:public` passed typecheck, product isolation, repository privacy, build, package surface, crash recovery, and isolated Docker acceptance. The final approved Docker E2E stopped at its readiness check because the Docker daemon was not running, reachable, or authorized for this user; no product failure was inferred and the goal remains active for recheck when Docker is available.
- 2026-09-29 — Docker became available (`29.8.0`); reran the previously unavailable approved E2E and it passed: approved plan, isolated worktree, network-disabled Docker execution, and observed evidence verified.
- 2026-09-29 — Full `pnpm verify:public` rerun passed after Docker recovery: typecheck, product isolation, repository privacy, build, package surface, crash recovery, isolated Docker acceptance, and approved Docker E2E all passed.
- 2026-09-29 — Full core suite passed: 88 test files, 493 tests passed, 2 skipped (495 total); duration 39.86s.
- 2026-09-29 — Added the integrated `pnpm test:research:all` command to RESULTS.md reproduction instructions so future agents can reproduce the verified path without guessing.
- 2026-09-29 — Verified the RESULTS.md reproduction-path update with website link acceptance (42 pages; 39 footer navigations) and review-packet acceptance (11 files; `MECHANICS_VERIFIED`).
- 2026-09-29 — Added a current verified checkpoint and exact remaining gates to NEXT_RUN_INPUTS.md for model handoff continuity.
- 2026-09-29 — Manuscript validation passed: scaffold is internally valid, results remain explicitly `not measured`, and no unsupported claims were detected.
- 2026-09-29 — Refreshed STATUS_MATRIX.md with the current full public-verification checkpoint and the remaining fail-closed research gates.
- 2026-09-29 — Added an explicit publication-state checkpoint to SUBMISSION_CHECKLIST.md: current state is MECHANICS_VERIFIED, with model-backed outcomes and publication actions still open.
- 2026-09-29 — Full `pnpm check` passed: typecheck, product isolation, 88 test files / 493 passed / 2 skipped, build, public package surface, and npm archive privacy gate.
- 2026-09-29 — Added the latest full verification and research-state checkpoint to CODEX_HANDOFF.md for durable model handoff.
- 2026-09-29 — Integrated research acceptance passed again (22 checks); updated public research pointer and release evidence to run mechanics-2026-09-29T04-07-05-048Z-63e187f1-4c40-4b90-ac63-72e8ea669fae. SHA-256: b3c1ad70d45692e35dcce95f12779fb200aee89e76eb526efd0d8234d6ebbe8c
- 2026-09-29 — Verified the latest 04:07 mechanics link through website acceptance and mobile acceptance: 42 pages checked, all local links resolve, 39 footer navigations present, and no fixed-width mobile hazards.
- 2026-09-29 — Completion-audit checker passed against the current repository: 10 source documents, 5 frozen inputs, 1 sanitized record, synthetic-only boundary preserved.
- 2026-09-29 — Recorded owner route preference to exclude Qwen and start with Luna, GPT-5.5, and MiMo as separate matched tracks; exact IDs/pricing/budget remain to be frozen before held-out execution.
- 2026-09-29 — Owner-authorized live MiMo Pro smoke passed through the real adapter: model `mimo-v2.5-pro`, latency 2,694 ms, usage 37 prompt + 30 completion = 67 tokens, exact response matched. This is a connectivity/smoke result only, not comparative study evidence; no key was persisted.
- 2026-09-29 — Owner-authorized live MiMo V2.5 smoke passed: model `mimo-v2.5`, latency 1,986 ms, usage 36 prompt + 22 completion = 58 tokens, exact response matched. This is still smoke evidence only, not comparative study evidence.
- 2026-09-29 — Updated the runbook route policy: model-route setup is an executable task; unavailable routes are recorded as pending configuration while approved configured routes continue.
- 2026-09-29 — Added and ran `research/runner/mimoAdapterSmoke.ts` through the real MiMo adapter on `mimo-v2.5`. Synthetic required-fact task passed; usage was 268 prompt + 107 completion = 375 tokens. Artifact: `research/results/mimo-adapter-smoke.json`. Billing is recorded as unmeasured until provider reconciliation is wired.
- 2026-09-29 — Added the MiMo adapter smoke command to REPRODUCTION.md with its credential and sanitized-artifact boundary.
- 2026-09-29 — Hardened `mimoAdapterSmoke.ts` after discovering two issues: model runs could overwrite one artifact, and empty content was previously marked passed. The runner now writes model-specific artifacts and requires the `Friday` fact. Final reruns passed for `mimo-v2.5` (345 tokens) and `mimo-v2.5-pro` (387 tokens); an earlier transient empty-content response was correctly rejected and not counted as success.

- 2026-09-29: pnpm typecheck:all passed after adding and tightening the model-specific MiMo adapter smoke runner; both mimo-v2.5 and mimo-v2.5-pro final smoke artifacts were content-validated, with billing remaining explicitly unmeasured.

- 2026-09-29: pnpm test:research:all passed end-to-end. New isolated mechanics run mechanics-2026-09-29T09-32-42-775Z-82e10da9-d9f1-480a-b4cd-075658e465fc passed with Docker network denial, clean export, review packet, manuscript validation, and release-evidence acceptance. Results remain mechanics-only; model-backed outcomes are not claimed.

- 2026-09-29: Added repeatable pnpm test:research:mimo-smoke script. Fresh synthetic smoke passes for mimo-v2.5 (299 provider-reported tokens) and mimo-v2.5-pro (326 provider-reported tokens); spend remains explicitly unmeasured and these are connectivity checks, not comparative evidence.

- 2026-09-29: Refreshed RELEASE_EVIDENCE.md to the latest mechanics run mechanics-2026-09-29T09-32-42-775Z-82e10da9-d9f1-480a-b4cd-075658e465fc and recorded its SHA-256, removing the stale prior-run pointer.

- 2026-09-29: Added the owner-authorized MiMo smoke command and evidence boundary to
esearch/README.md, so the public research workspace and reproduction guide now expose the same repeatable path.

- 2026-09-29: Added pnpm test:research:mimo-matrix, a single-command matrix smoke with bounded retries for both approved MiMo models. The matrix passed both models and wrote a sanitized artifact; billing remains unmeasured.
- 2026-09-29: After adding the MiMo matrix runner, pnpm typecheck:all, review-packet acceptance, release-evidence acceptance, and git diff --check all passed.

- 2026-09-29: MiMo matrix acceptance and full typecheck passed after the acceptance gate was added; both approved models remain content-validated with billing unmeasured.

- 2026-09-29: Executed the consolidated pnpm test:research:mimo-matrix command end to end. Both mimo-v2.5 and mimo-v2.5-pro passed and the acceptance gate returned valid; the matrix uses a 256-token cap with bounded retries to avoid transient empty responses.

- 2026-09-29 — Re-ran the documented zero-spend research bundle after documentation repair; clean export, review packet, mechanics sweep, manuscript validation, and release-evidence acceptance passed. Latest run: mechanics-2026-09-29T10-00-02-464Z-8bba4dcf-c427-4e3c-ac56-17c58fa8ad2c; consolidated SHA-256: ca4a8fab7e525b00fd9cf532457c3f079a66ed1d8d8f1030270611f12cfba85c.
- 2026-09-29 — Strengthened handoff mechanics to compare restored requirement/DAG contents, then reran the zero-spend bundle successfully. Latest run: mechanics-2026-09-29T10-00-02-464Z-8bba4dcf-c427-4e3c-ac56-17c58fa8ad2c; consolidated SHA-256: ca4a8fab7e525b00fd9cf532457c3f079a66ed1d8d8f1030270611f12cfba85c.

- 2026-09-29 — Corrected the handoff fixture to compare against the persisted post-start execution snapshot; direct and isolated mechanics runs passed. Latest run: mechanics-2026-09-29T10-00-02-464Z-8bba4dcf-c427-4e3c-ac56-17c58fa8ad2c; consolidated SHA-256: ca4a8fab7e525b00fd9cf532457c3f079a66ed1d8d8f1030270611f12cfba85c.

- 2026-09-29 — Added a focused completion-engine regression for restored state, full requirements, and full DAG equality; 21 tests passed. Refreshed the isolated mechanics evidence: mechanics-2026-09-29T10-00-02-464Z-8bba4dcf-c427-4e3c-ac56-17c58fa8ad2c; SHA-256 ca4a8fab7e525b00fd9cf532457c3f079a66ed1d8d8f1030270611f12cfba85c.

## 2026-09-29 13:29 ET — MiMo adapter smoke

The production MiMo adapter smoke passed for `mimo-v2.5` using the synthetic Friday fact task. Recorded usage was 268 prompt tokens, 94 completion tokens, 362 total. This is adapter connectivity evidence only; it is not model-quality or comparative outcome evidence.

## 2026-09-29 — Public bundle packaging gate

The allowlisted bundle builder is committed as `365f2fa`. It produces 13 files (64,448 bytes) and passes repository privacy and clean-export acceptance. CI run `36576604441` is validating the public package across Linux, macOS, and Windows before the hosted research gate is reconsidered.
