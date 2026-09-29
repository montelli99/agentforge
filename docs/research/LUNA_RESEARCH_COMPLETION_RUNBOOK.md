# Luna research completion runbook

Prepared 2026-09-28. Status: implementation instructions, NOT evidence of completion.

## 0. Read this before doing work

Objective: repair the audited research defects, execute the approved evaluation, and deliver a defensible manuscript and reproducibility package. Research preparation, measured research, and publication are three different milestones.

This runbook expands WHITE_PAPER_EXECUTION_PLAN.md. PROTOCOL.md remains the governing experimental definition. RESULTS_AUDIT.md identifies the required repairs. Do not overwrite those documents, silently change scientific definitions, or substitute favorable experiments. Existing mechanics outputs remain historical evidence, not competitive performance results.

Use AgentForge-Staging only. Do not modify production OpenClaw, access seller records, use personal chat messages, use the owner's Telegram for benchmarks, publish secrets, or import private workflows. Preserve unrelated changes. Do not pause, replace, or complete the broader product goal merely because a research dependency is pending.

Task states: NOT_STARTED, ACTIVE, VERIFIED, FAILED, WAITING_FOR_INPUT. A task becomes VERIFIED only with the evidence specified below. A failed gate returns to its repair step; do not restart completed phases. An input-dependent task does not prevent independent tasks from continuing.

## Current task-state reconciliation

The checkbox lists below are the original execution plan. Their current authoritative states are recorded in `docs/research/EXECUTION_LEDGER.md` and `docs/research/STATUS_MATRIX.md`. As of 2026-09-29:

- Sections 1 and 2 are **VERIFIED for local preparation and mechanics acceptance**.
- Section 3 is **PARTIAL**: native, worker, Docker, public completion, and speculative boundaries are tested; deployed provider round trips and any untested side-effecting controller remain open.
- Section 4 is **VERIFIED for fixture integrity**, including the 12-case development and 60-case held-out manifests; held-out behavior has not been run.
- Section 5 is **PARTIAL**: synthetic production-path accounting and recovery are verified; an approved real provider route remains open.
- Section 6 is **WAITING_FOR_INPUT** because route, pricing, budget, reviewer, and runtime decisions are intentionally null in the owner packet.
- Sections 7 and 8 are **PARTIAL / NOT STARTED** where they require measured results, human review, hosted proof, archive metadata, or publication action.

Do not infer completion from an unchecked box alone; reconcile each item against the ledger and its cited artifact before reporting status.

## 1. Establish the execution record

- [ ] 1.01 Confirm working directory, branch, revision, Node version, package manager, and git status. Record public-safe revision/runtime values; keep personal paths out of release artifacts.
- [ ] 1.02 Read applicable repository instructions, WHITE_PAPER_EXECUTION_PLAN.md, PROTOCOL.md, RESULTS_AUDIT.md, RESEARCH_PROGRESS.md, STATUS_MATRIX.md, and OWNER_APPROVAL_PACKET.md.
- [ ] 1.03 Record pre-existing dirty files. Do not revert, stage, or overwrite unrelated changes.
- [ ] 1.04 Inventory research runners, fixtures, configuration, results, scorer, model adapters, execution providers, and website research entry point.
- [ ] 1.05 Record hashes of existing frozen protocol/config/fixtures before edits. Preserve that baseline alongside subsequent manifests.
- [ ] 1.06 Add a task ledger to RESEARCH_PROGRESS.md using these numbered IDs, state, evidence path, and next action. Do not mark tasks complete from this checklist alone.
- [ ] 1.07 Correct inaccurate status descriptions in the progress, status matrix, and approval packet: complete preparation has not been demonstrated. Preserve history and explain corrections.
- [ ] 1.08 Create precise ignore rules for raw traces and scratch work before collecting them. Use a disposable research workspace with no production secrets mounted.

Gate 1: revision and baseline hashes recorded; historical artifacts preserved; current status agrees with the audit. Next: section 2.

## 2. Repair mechanics acceptance without changing scientific scoring

- [ ] 2.01 Inspect BenchmarkRunner and all five slice runners. Separate the scorer's research definitions from script exit-status handling.
- [ ] 2.02 Define a versioned mechanics-result envelope: check ID, run ID, revision, input hashes, start/end UTC, passed boolean, assertions, artifact paths, and errors. Diagnostics go to stderr; one machine-readable envelope goes to stdout.
- [ ] 2.03 Require offlineSlice to assert exact expected counts, correct-control acceptance, and incorrect-control rejection. Label the answer-copy executor as a scorer-only fixture.
- [ ] 2.04 Require memoryAndEvidenceSlice to assert retained content, same-tenant hit, cross-tenant miss, and expected audit verdict. Add a missing-evidence negative case.
- [ ] 2.05 Require correctionSlice to assert rejection before approval, denial of automatic mutation, approved status, and a valid replay identifier. Do not claim changed model behavior.
- [ ] 2.06 Require durableMemorySlice to assert separate process execution, expected persisted count, successful hydration, and exact restored response. Fail on malformed persistence; do not let an empty fallback conceal corruption.
- [ ] 2.07 Require handoffSlice to compare complete relevant goal, requirement, and DAG content plus execution state. Array lengths alone are insufficient. Keep next-action quality explicitly outside this check.
- [ ] 2.08 Make mechanicsSweep reject nonzero exits, absent/malformed envelopes, wrong or duplicate IDs, failed assertions, missing artifacts, and timeout. Only print overall success after every required check passes.
- [ ] 2.09 Generate a new consolidated result file from actual envelopes; never manually copy true/false summaries. Retain the old dated record unchanged.
- [ ] 2.10 Add isolated negative tests for each acceptance branch. Simulate a child returning passed:false with exit zero and verify the sweep fails. Also test missing output and a hanging child.
- [ ] 2.11 Add an offline network-denial boundary using the supported disposable runtime, and instrument provider entry points. Attempt a network/provider call deliberately and require failure. If the runtime cannot deny networking, report offline isolation as unverified rather than asserting a measured zero.
- [ ] 2.12 Replace misleading validator output with its limited scope. Detect drafting placeholders, unresolved evidence references, and mismatches between generated tables and results; do not label automated text checks scientific peer review.
- [ ] 2.13 Run focused runner tests and the mechanics sweep once after repairs. Save command, exit status, revision, and output hashes.

Gate 2: deliberate failures cause failed acceptance; valid mechanics pass; consolidated results are generated, attributable, and reproducible. Next: section 3.

## 3. Verify and repair production execution boundaries

- [ ] 3.01 Trace controller authorization through nativeHarness, NativeComputeExecutor, ContractEnforcer, and each applicable compute provider. Record where authorization and isolation actually occur.
- [ ] 3.02 Identify existing contract/approval types and reuse them. Do not create a second independent permission system.
- [ ] 3.03 Require a valid, applicable execution contract and command authorization before dispatch. Reject absent, expired, mismatched, or insufficient authority where those states exist in the contract model.
- [ ] 3.04 Ensure omitting inputFiles cannot disable enforcement. Treat declared input paths as inputs, not as a complete list of future writes.
- [ ] 3.05 Enforce permitted writable mounts and protected paths in the supported isolated execution backend. Do not rely solely on post-run inspection to prevent writes.
- [ ] 3.06 Make unsupported backends reject execution requiring guarantees they cannot provide. Record supported platform/backend combinations explicitly.
- [ ] 3.07 Collect real modification evidence after execution; remove unconditional empty modification reporting. Separate attempted, blocked, and actual effects.
- [ ] 3.08 Create disposable synthetic canary files inside/outside permitted scope. Never use real user files as safety tests.
- [ ] 3.09 Test allowed writes, prohibited writes, undeclared writes, no contract, empty declarations, prohibited commands, traversal, and symlink escapes on supported platforms.
- [ ] 3.10 Verify forbidden canaries remain unchanged and allowed work succeeds. Inspect the actual resulting filesystem, not just the returned status.
- [ ] 3.11 Verify controller completion cannot pass from a worker's unsupported success statement when required artifacts are missing.
- [ ] 3.12 Run focused integration checks. Update claim/evidence records with exact backend, tested behavior, and remaining limitations.

Gate 3: actual forbidden effects are prevented in the supported backend; legitimate execution works; no broad claim exceeds coverage. Next: section 4. Continue fixture/manuscript work if runtime access is unavailable.

## 4. Complete the synthetic task suite

- [ ] 4.01 Use the six families in PROTOCOL.md as canonical. Map Astra's overlapping examples into them; do not silently replace a family.
- [ ] 4.02 Create two development tasks per family (12 total) and ten held-out tasks per family (60 total), as proposed by Astra. Keep the splits physically separate.
- [ ] 4.03 Give each task stable ID, family, version, difficulty rationale, synthetic provenance/license, agent-visible instructions, initial state, event schedule, resource limits, and evaluator-only acceptance data.
- [ ] 4.04 Separate expected answers and forbidden outcomes from agent-visible inputs. Keep evaluator files outside agent mounts, retrieval indexes, tool-visible directories, and prompts.
- [ ] 4.05 Delayed recall: distribute essential constraints among distractors, then require an artifact using them. Check missing, invented, and conflicting facts separately.
- [ ] 4.06 Handoff: persist partial progress, terminate the worker, restore state, and require continuation without repeated side effects or forgotten exclusions. Model-switch configuration belongs in the approved manifest.
- [ ] 4.07 Correction: introduce a wrong default, supply a correction, and test transfer to a later equivalent scenario rather than repetition of the identical answer.
- [ ] 4.08 Workflow: inject a failed prerequisite and inspect whether execution repairs it or accurately reports incompleteness before claiming success.
- [ ] 4.09 Recovery: inject duplicates, timeouts, and restart at deterministic event points; check bounded attempts and exactly the permitted effects in a synthetic service.
- [ ] 4.10 Permission/completion safety: present forbidden actions and missing evidence; inspect actual effects and completion claims separately.
- [ ] 4.11 For every task, implement deterministic artifact/state checks, explicit ambiguity handling, one known-correct outcome, and at least one intentionally wrong outcome.
- [ ] 4.12 Run scorer controls across every task. A scorer accepting a forbidden outcome blocks that fixture's release.
- [ ] 4.13 Verify answer isolation using synthetic sentinel values and inspect the assembled context/tool scope. Do not put evaluator fixtures into agent workspaces.
- [ ] 4.14 Freeze split and fixture hashes before prompt tuning. Do not use held-out model outputs to tune the system. Record any necessary amendment and invalidate affected runs.

Gate 4: all planned fixtures validate, negative controls fail, evaluator answers remain isolated. Next: section 5.

## 5. Build the production-path runner and records

**Current gate state (2026-09-29):** the local, zero-spend runner and recovery mechanics are implemented and verified. The adapter pilot exercised the Ollama route through `OllamaModelProvider`, but it is not the approved final comparative production study. Items that require a real approved provider route, billing reconciliation, or deployed-runtime acceptance remain open.

- [ ] 5.01 Trace a normal request through context assembly, model invocation, tools, memory writes, and final completion. Record entry points in SOURCE_RUNTIME_TRACE.md.
- [ ] 5.02 Extend existing benchmark infrastructure; keep mechanics-only and measured modes explicitly separate. Measured mode rejects synthetic/fallback providers.
- [ ] 5.03 Implement B0 recent-history and B1 rolling-summary/retrieval baselines using the same model, task instructions, tools, and limits as AF for architecture comparisons.
- [ ] 5.04 Connect AF to actual production components. Do not replace memory, JEv, workflow, or evidence logic with research-only imitations.
- [ ] 5.05 Implement the three frozen ablations. Evidence-off disables completion validation only, never permission boundaries. If a switch is not isolable, document the confound and do not claim component-specific attribution.
- [ ] 5.06 Keep mixed-model routing experiments separate from same-model architecture comparisons.
- [ ] 5.07 Add a validated run manifest: schema version, experiment/task/condition/replicate IDs, seeds, input/code/config/scorer hashes, provider/model identity and exposed version, parameters, limits, and pricing provenance.
- [ ] 5.08 Add trajectory records: UTC timestamps, monotonic elapsed time, outputs/artifacts, tool events, attempts, completion claim, scorer verdict, failure category, and usage/cost fields.
- [ ] 5.09 Represent missing usage/cost as unknown, not zero. Separate provider-reported usage, price-derived cost estimates, and invoice reconciliation.
- [ ] 5.10 Include summary, embedding, routing, judge, retry, and failed-call charges where applicable. Avoid cached-token double counting.
- [ ] 5.11 Default execution concurrency to one. Require explicit manifest values for timeouts, retry limits, per-run ceiling, and total ceiling before paid mode starts.
- [ ] 5.12 Reserve worst-case request cost before dispatch. Stop new dispatches when safe reservation cannot fit the remaining ceiling or usage uncertainty prevents enforcing it.
- [ ] 5.13 Persist a started record before dispatch and atomically checkpoint completion afterward. Use stable trajectory IDs and provider idempotency support where available.
- [ ] 5.14 On restart, skip terminal trajectories. Mark interrupted requests with uncertain provider completion/billing unresolved; reconcile before retrying. Do not claim universally exactly-once provider billing.
- [ ] 5.15 Add deterministic condition interleaving from a saved seed and isolated state per replicate, except within-trajectory persistence intentionally under test.
- [ ] 5.16 Save raw traces outside public tracking. Never request or publish private model reasoning; record observable events and outputs.
- [ ] 5.17 Test synthetic usage totals, cached tokens, missing usage, failed requests, exhausted caps, crash before/after response, resume, duplicate IDs, timeouts, and malformed provider responses.
- [ ] 5.18 Verify configuration rejects missing routes and mocks in measured mode. Verify dry-run mode cannot call a provider.
- [ ] 5.19 Run focused tests and typecheck using the repository scripts. Resolve failures; do not broaden repeated test runs without a reason.

Gate 5: local runner, isolation, caps, accounting, and recovery work with synthetic records. No performance claim yet. Next: sections 6 and 7; section 7 independent drafting can proceed while approvals are pending.

## 6. Paid evaluation and analysis

- [ ] 6.01 Inspect available provider interfaces without printing credentials. Prepare concrete supported route choices; do not ask the owner to rediscover repository facts.
- [ ] 6.02 Prepare the pilot matrix: 12 development tasks x B0/B1/AF x 2 replicates = 72 trajectories. Include a separately identified minimal production-path smoke call within the requested budget.
- [ ] 6.03 Retrieve dated official prices for the proposed routes. Calculate conservative maximum costs including retries and helper calls, currency, and caps. Do not invent a dollar ceiling.
- [ ] 6.04 Present one compact approval packet for routes, exact run limits, total ceiling, and smoke/pilot authorization. Existing credentials are not research budget authorization.
- [ ] 6.05 While waiting, finish methods, citation verification, synthetic accounting tests, reproduction instructions, and website drafts. Mark only charged execution WAITING_FOR_INPUT.
- [ ] 6.06 After approval, freeze the pilot manifest and run the tiny real trajectory. Verify it invokes the same production path and reconciles available usage before dispatching the pilot.
- [ ] 6.07 Run the pilot. Save every attempted trajectory. Repair mechanics using development tasks only; record all amendments and reruns with new IDs.
- [ ] 6.08 Use pilot variance to prepare the main-study analysis/sample justification. Astra's proposed target is 60 tasks x 6 conditions x 3 replicates = 1,080 trajectories, not evidence of statistical power.
- [ ] 6.09 Present final model settings, baseline policies, limits, routing separation, sample size justification, analysis specification, reviewer plan, and main-study ceiling for approval. Unresolved scientific choices require explicit review; do not silently guess them.
- [ ] 6.10 Freeze the approved protocol version and all inputs before held-out runs. Use 'preregistered' only with an actual dated registration; a local hash is a freeze record.
- [ ] 6.11 Run interleaved held-out batches with checkpoints and caps. Preserve failed attempts and apply only frozen exclusions, with a separate exclusion ledger.
- [ ] 6.12 Calculate valid success, false completion over declaring and all trajectories, retained/invented facts, correction recurrence, tokens, costs, median/p95 latency, and forbidden effects using frozen definitions.
- [ ] 6.13 Treat zero-success cost ratios as undefined and missing billing as unknown. Report incomplete accounting rather than favorable estimates disguised as measurements.
- [ ] 6.14 Produce paired task-level comparisons and task-clustered uncertainty using the approved statistical specification. Account for replicate correlation; label secondary/exploratory comparisons.
- [ ] 6.15 Preserve null/negative findings. Separate infrastructure sensitivity analysis from the primary all-attempt results.
- [ ] 6.16 Arrange review of all safety failures, false completions, and a seeded random success sample. Record reviewer disagreements and resolutions; automated agent review is not human peer review.
- [ ] 6.17 Freeze sanitized results and hashes. Generate tables/charts from them, never by manually entering favorable numbers.

Gate 6: measured results, complete denominators, provenance, uncertainty, and required review exist. If any are absent, the empirical paper remains incomplete. Next: section 7 finalization.

## 7. Manuscript and reproducibility package

- [ ] 7.01 Draft methods and limitations during implementation, clearly distinguishing planned procedures from performed experiments.
- [ ] 7.02 Finish hypotheses from the governing questions. Do not add post-hoc confirmatory hypotheses based on outcomes.
- [ ] 7.03 Verify related-work citations from original papers and official repositories. Save title, authors, year, stable URL/DOI, pinned version where relevant, and the supported statement.
- [ ] 7.04 Describe architecture and actual runtime enforcement. Include AgentForge, Workflow Engine, and JEv; distinguish heuristics from learned/calibrated behavior.
- [ ] 7.05 Replace every results placeholder only with measured evidence. Trace each quantitative claim to generated data and denominator.
- [ ] 7.06 Write failure analysis using sanitized representative traces, including unfavorable cases and verification overhead.
- [ ] 7.07 Write complete limitations: synthetic realism, sample size, aliases/provider drift, judge uncertainty, persistence adapters, deployment scope, and external validity.
- [ ] 7.08 Write conclusions bounded by results. Do not claim superiority over external systems that were not evaluated in matched supported configurations.
- [ ] 7.09 Write abstract last. Remove draft instructions throughout the manuscript.
- [ ] 7.10 Obtain real author names, affiliations if applicable, contributions, funding/conflicts, and AI-use disclosure. Never invent them.
- [ ] 7.11 Prepare source and PDF only after content stabilizes; use the built-in LaTeX compiler/editor for a standalone LaTeX document. Inspect rendered pages, charts, references, and links.
- [ ] 7.12 Document exact clean-environment reproduction commands, runtime versions, dependencies, offline requirements, paid requirements, and expected outputs.
- [ ] 7.13 Verify release packaging actually contains the promised research assets. Current package.json files list does not include research; either supply a separate versioned research archive or explicitly include required public-safe assets. Default: separate research archive linked from the code release, leaving runtime package size unchanged.
- [ ] 7.14 Reproduce offline checks in an isolated clean export with no personal environment configuration. Recalculate tables from sanitized results independently.
- [ ] 7.15 Screen archive contents, manuscript, metadata, logs, and the history intended for publication for secrets/private data. Preserve third-party notices and Apache-2.0 for code; paper/data licenses require owner selection.

Gate 7: complete manuscript and reproducible package; no placeholders, unsupported numbers, or private content. Next: section 8.

## 8. Website, review, and publication

- [ ] 8.01 Update the research page with plain-language findings, methodology, limitations, and links to paper/source/results/code. Protocol-only drafts must be labeled as such.
- [ ] 8.02 Wire navigation/footer/sitemap entries and GitHub calls to action using the site's existing patterns.
- [ ] 8.03 Verify all links and downloads. Inspect desktop and mobile widths, stacked headings, chart readability, keyboard focus, and overflow in a real browser.
- [ ] 8.04 Ask an independent reviewer to reproduce findings and inspect claim-to-evidence mappings. Keep reviewer changes separate from raw results.
- [ ] 8.05 Resolve review findings with evidence. Repeat only checks affected by changes, then run the relevant final regression/typecheck/package/privacy checks once for the final revision.
- [ ] 8.06 Prepare a review packet: manuscript/PDF, result summary, limitations, archive checksums, website preview, authorship/license decisions, and proposed publication destinations.
- [ ] 8.07 Obtain owner approval of the final public package. No social outreach, venue submission, registry publishing, or public release is implied by preparing it.
- [ ] 8.08 Recheck official venue requirements at submission time. Default preparation order: website/GitHub package, Zenodo archival record, arXiv candidate; TMLR only after suitability review. Do not claim acceptance or peer review from a DOI/preprint.
- [ ] 8.09 Perform only approved publication actions. Verify live pages, download contents, version/checksums, and record actual URLs/DOIs/statuses.
- [ ] 8.10 Prepare factual promotion copy separately; do not contact influencers or create/send social posts without authorization.

Gate 8: publication is complete only for approved artifacts actually live and verified; external venue acceptance remains an external outcome.

## 9. Questions that cannot be silently guessed

Ask only when the corresponding package is ready. Do not ask the owner to choose coding details discoverable in the repository.

| Input | When needed | Work continuing without it |
| --- | --- | --- |
| Paid routes, prices, run limits, ceiling | Before first charged call | All mechanics, fixtures, runner, methods, website drafts |
| Main-study statistical specification and final size | After pilot, before held-out execution | Pilot analysis, code repairs, literature and reproducibility |
| Human reviewer and adjudication availability | Before final research sign-off | Experiments if otherwise authorized; automated review |
| Authors, affiliations, funding, licenses | Before final manuscript/release | Technical content and package preparation |
| Final publication approval and required account access | After reviewable package exists | Local verification and submission preparation |

## 10. Efficient execution and exact next-action rules

- Start at the earliest unverified numbered step whose dependencies are available. Do not replay completed sections after context compaction or model switching.
- After each gate, record changed files, evidence, failures, and the next numbered step in RESEARCH_PROGRESS.md. A statement of intent is not evidence.
- If a test fails, diagnose and repair that scope, then rerun the affected checks. Do not loop through unchanged full suites or repeated status-only commits.
- Do not lower assertions or change metrics to obtain a pass. Research-definition changes require a versioned amendment and review before affected measured runs.
- If an external dependency is missing, mark that step WAITING_FOR_INPUT and proceed to independent steps listed above. Never claim all work complete to escape that dependency.
- If delegation is authorized, assign disjoint work: runner/scoring; literature/bibliography; independent verification. Coordinator owns protocol, integration, and results. Reviewers do not edit raw results.
- At handoff, state the last verified gate, exact current step, commands/evidence already obtained, outstanding defects, pending input, and next executable action. No vague 'continue work' handoff.
- Preparation complete requires Gates 1–5 plus a concrete budget packet. Research complete requires Gates 6–7 and review. Published requires Gate 8. These do not mean the entire AgentForge product is complete.

## Immediate next action for Luna

Begin at 1.01. Preserve the frozen study, complete the acceptance repairs, and follow the numbered dependencies. This file is a plan: none of its unchecked items is a claim that work has been performed.

## 11. Non-stop execution contract

The active goal remains open until every executable item is either verified complete or explicitly marked `WAITING_FOR_INPUT` with the owner input named. Do not pause, close, or replace the goal after a successful check. Continue automatically from the earliest unchecked dependency, preserve frozen inputs and prior evidence, and record each completed action in `docs/research/RESEARCH_PROGRESS.md`. A model switch or context compaction must resume from the recorded step rather than restart the audit. Never claim production, publication, measured superiority, or final release while the remaining gates in this runbook are open.

Current execution rule (2026-09-29): mechanics, local adapter pilot, website, packaging, privacy, and acceptance gates are verified. Continue with the remaining authorized local work and keep paid providers, held-out model execution, human review, and publication fail-closed until the owner approval packet authorizes them.

## Route setup policy update (2026-09-29)

Provider/model route setup is an execution task, not a blocker. The coordinator must resolve configured routes, validate credentials without exposing them, record exact model/version/endpoint metadata, and run the smallest capped smoke before expanding the study. If a route is unavailable, continue with the approved configured route and record the unavailable route as pending configuration; do not pause the overall goal.
