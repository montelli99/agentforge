# AgentForge research and publication execution plan

Date: 2026-09-28
Status: PLANNED. No experimental findings or submission acceptance are claimed.
Owner request: prepare every execution step so Luna can continue without restarting planning.

Owner decisions for the next charged or publication phase are collected in [`OWNER_APPROVAL_PACKET.md`](OWNER_APPROVAL_PACKET.md).

## 1. Objective and boundaries

Produce a reproducible evaluation of the public AgentForge system, a technical paper supported by the results, and publication-ready website and repository materials. Study AgentForge memory/workforce coordination, the public domain-neutral Workflow Engine, and JEv together and separately.

Working title: **AgentForge: Evidence-Guided Execution and Durable Memory for Cost-Efficient Agent Systems**. This is a working title, not a novelty claim.

- Work in AgentForge-Staging; preserve unrelated edits and production OpenClaw processes.
- Use synthetic public-domain tasks and disposable workspaces. No seller records, CRM data, personal messages, private business workflows, credentials, or private course material.
- Do not use the owner's Telegram bot for benchmarks. Channel integration is a separate product acceptance concern, not necessary for this paper.
- Reuse verified production components. Do not implement a research-only imitation and present it as the shipped system.
- Do not overwrite, pause, complete, or replace the broader product goal because this research plan exists.
- Drafting and local preparation are authorized. Obtain owner approval of the final public paper and publication package before external submission/publication. Prepare all reviewable materials first.
- Do all work possible without paid calls first. Before paid evaluation, present the exact route, estimated ceiling, and run count for approval; existing product API access does not establish an unlimited research budget.
- If credentials, human review, or budget are missing, continue independent work and list the exact dependency. Never invent results or silently substitute mock output.

## 2. First actions for Luna

- [x] Read this file and RESEARCH_PROGRESS.md. Continue at the first incomplete item.
- [x] Inspect git status, branch, and current commit; record them in the progress file without copying private paths or identity data into public artifacts.
- [x] Read applicable AGENTS.md instructions and existing public architecture/release documents.
- [x] Inspect docs/PUBLIC_SYSTEM_ARCHITECTURE.md, docs/AGENT_QUALITY_FLYWHEEL.md, docs/PRODUCTION_EXECUTION_BOUNDARY.md, docs/LIVE_PROVIDER_ACCEPTANCE.md, and docs/research/UNIFIED_AI_MEMORY_RD.md.
- [x] Inventory existing benchmark code before adding a runner.
- [x] Create a claim ledger and capability map before writing an abstract promising benefits.
- [x] Implement local fixtures, scoring and a no-network dry run first.
- [ ] Report a paid-run estimate only after a functioning local runner exists.

## 3. Evidence already observed; do not misrepresent it

The planning pass inspected these code entry points. This is not an exhaustive implementation audit:

| Entry point | What must be checked |
| --- | --- |
| src/providers/decision/jevDecision.ts | Current routing includes deterministic string/regex heuristics and fixed confidence values. Do not call this a trained or calibrated classifier. |
| src/providers/benchmark/benchmarkRunner.ts | Existing runner checks expected top-level fields using strict equality. Inspect nested-result handling and failure latency accounting before reuse. |
| src/benchmark-real.ts | Uses provider none with hash fallback and character-count token estimates. Its name does not make it a real model evaluation. |
| src/memoryContextOptimizer.ts; src/semanticMemory.ts | Verify actual retrieval, compression, persistence and model-input wiring. |
| src/providers/memory/operationalMemory.ts; src/memoryEvaluation.ts | Verify tenant boundaries, provenance, correction handling and what is really measured. |
| src/workflowEngine.ts; src/core/completion/* | Trace procedures through actual execution and evidence validation. |
| src/core/contract/contractEnforcer.ts | Confirm authorization checks remain on the production execution path. |
| src/core/quality/correctionRegistry.ts | Determine whether corrections influence later runs or are only stored. |
| src/providers/models/modelRouter.ts; src/core/router/empiricalRouter.ts | Establish which router production uses and what data determines choices. |

Never treat unit-test counts, canned benchmark scores, estimated token savings, or a passing build as evidence of improved end-to-end agent performance.

## 4. Deliverables and file layout

Create incrementally; these paths are planned, not claims they already exist:

| Path | Purpose |
| --- | --- |
| docs/research/RESEARCH_PROGRESS.md | Durable status, next action, dependencies and experiment IDs |
| docs/research/CAPABILITY_EVIDENCE.md | Claim -> implementation -> live route -> test -> limitation |
| docs/research/RELATED_WORK.md | Primary sources, related claims, similarities and differences |
| docs/research/PROTOCOL.md | Frozen questions, comparisons, task split, scoring, budgets and exclusions |
| research/tasks/ | Versioned synthetic fixtures and expected outcomes |
| research/config/ | Public experiment definitions; no credentials |
| research/runner/ | Thin adapters invoking real system paths |
| research/scoring/ | Deterministic independent acceptance checks |
| research/results/ | Sanitized release-ready results only |
| research/README.md | Clean-machine reproduction commands |
| docs/research/RESULTS.md | Tables, uncertainty, failures and claim decisions |
| docs/research/paper.md | Full editable manuscript with results linked to evidence |
| docs/research/SUBMISSION_CHECKLIST.md | Venue-specific files and human sign-off |
| website/research.html | Educational summary, limitations, code and paper links |

`docs/research/RESULTS.md` is the current sanitized results ledger. It records verified local mechanics and keeps all model-backed outcomes explicitly unmeasured until the approved study runs.

The current phase-by-phase state is maintained in [`STATUS_MATRIX.md`](STATUS_MATRIX.md).

The exact inputs needed before model-backed execution are listed in [`NEXT_RUN_INPUTS.md`](NEXT_RUN_INPUTS.md).


Keep raw execution logs outside tracked/public files until screened. Add precise ignore rules before creating logs. Record raw-log hashes and sanitization decisions without publishing sensitive content.

## 5. Phase A: implementation and literature audit

- [ ] Trace a normal user request from controller to context assembly, model invocation, tool execution, memory write and completion response.
- [x] Identify synthetic providers, fixtures, unused modules and production entry points separately.
- [x] Record code revision and file/line evidence for each proposed capability.
- [x] Verify memory survives a fresh process, not merely a reused JavaScript object.
- [x] Verify a model handoff actually loads the transferred state.
- [ ] Verify required facts survive context reduction and provenance remains inspectable.
- [ ] Verify workflow checks affect completion and cannot be satisfied by model self-report alone.
- [ ] Verify corrections change subsequent behavior; storage alone is insufficient.
- [x] Document what is NOT implemented or not measurable yet. Narrow paper claims instead of hiding gaps.
- [x] Research original papers and official repositories for agent memory, context selection, workflow verification, model routing and long-horizon evaluation.
- [ ] Inspect current OpenClaw and Hermes implementations/docs for relevant comparison capabilities; pin versions before testing.
- [ ] For each source save title, authors, year, stable URL/DOI, relevant claim, and what distinguishes AgentForge.
- [ ] Verify every citation resolves and actually supports the sentence using it.
- [x] Avoid claims such as first, unique, best, prevents hallucinations, or defeats all harnesses unless evidence specifically establishes them.

Gate A: capability map distinguishes implemented, integrated, experimentally tested and planned. No unresolved uncertainty is silently converted into a claim.

## 6. Phase B: questions and experimental design

Primary question: Does the complete system improve valid task completion per dollar compared with a basic tool-using agent under matched conditions?

Secondary questions:
1. Does persistent memory improve continuation after restart/model handoff?
2. Does context selection lower measured model usage while preserving required facts and success?
3. Do workflow/evidence checks reduce unsupported completion claims?
4. Do recorded corrections reduce recurrence on new, equivalent tasks?
5. Does cheaper routing retain quality once routing, retrieval, retries and verification costs are included?

- [ ] Define the unit of analysis as a complete task trajectory, not a single answer.
- [ ] Define primary outcome before seeing results: valid success requires task acceptance AND no critical permission/privacy violation.
- [ ] Define completion claims and false-completion classification in a written rubric.
- [ ] Use the same tool affordances, fixtures, resource limits and task instructions across comparable conditions.
- [ ] Keep infrastructure failures and model failures distinguishable; publish both counts.
- [ ] Randomize/interleave condition order to reduce time/provider drift effects.
- [ ] Fix model IDs, parameters, context limits, tool limits, timeouts and maximum attempts.
- [ ] Capture provider model version where exposed; do not infer an immutable version from an alias.
- [ ] Use fresh isolated task state for every replicate except intentionally retained memory within that trajectory.
- [ ] Do not expose evaluator answer keys to the agent or retrieval store.
- [ ] Freeze a development split and a held-out split before tuning prompts or routing.

Comparison conditions:
- B0: basic tool-using model with a documented bounded recent-history policy.
- B1: same model plus conventional rolling summary/retrieval baseline; avoids a weak comparison designed to lose.
- AF: actual full AgentForge path.
- AF-minus-memory: disable persistent memory while holding other components fixed.
- AF-minus-JEv/context-policy: isolate routing from context selection if they are separate components; avoid attributing two changes to one switch.
- AF-minus-evidence-gate: disable completion validation only in a disposable benchmark workspace; retain safety boundaries.

- [ ] If an ablation cannot be isolated, label it a combined intervention and explain the confound.
- [ ] Keep model-routing experiments separate from same-model architecture experiments.
- [ ] External OpenClaw/Hermes comparisons are a second stage after internal evaluation works; use supported configurations and document differences.
- [ ] Never interpret an unconfigured competing integration as inferior performance.

Proposed scale, subject to budget and pilot variance:
- Dry run: all fixtures, no model calls, validates mechanics only.
- Pilot: 12 development tasks x 3 primary conditions (B0/B1/AF) x 2 replicates = 72 trajectories.
- Main study: 60 held-out tasks x 6 conditions x 3 replicates = 1,080 trajectories if the final protocol uses exactly six conditions. Recalculate when splitting interventions.
- If budget cannot support that scale, reduce scope openly and label results exploratory; do not imply statistical power from this proposed count.
- [ ] Use pilot variance and the smallest meaningful effect to justify the final sample size; do not select sample size merely to obtain significance.
- [ ] Hash and timestamp the frozen protocol before held-out execution. Commit only public-safe protocol/fixtures after review.

## 7. Phase C: task fixtures, step by step

Build ten held-out tasks per family, plus separate development examples. All people, domains, secrets and documents must be synthetic.

1. Memory and delayed recall: introduce project decisions; insert distractors; restart; ask for a result requiring specific earlier constraints. Score required facts and invented facts separately.
2. Model handoff: start with one configured model; persist state; stop the process; continue with another model; inspect whether work resumes without losing exclusions or repeating finished changes.
3. Correction retention: present a plausible wrong default; provide an explicit correction; later present a changed scenario that requires applying the principle, not memorizing the same answer.
4. Workflow and evidence: require multiple file/artifact steps; inject a failed tool step; verify the agent fixes or accurately reports it instead of declaring completion.
5. Context pressure: place essential facts at different locations in long synthetic histories; vary distractor volume; measure retention and actual model input after compression.
6. Recovery and safe execution: inject restart, duplicate event, timeout or unavailable dependency; verify durable progress, bounded retries and absence of duplicate side effects in a mock service.

For EVERY fixture:
- [ ] Assign a stable ID, family, version and difficulty rationale.
- [ ] Write the user-visible task and initial files/state.
- [ ] List required outcomes and forbidden outcomes.
- [ ] Define deterministic checks that inspect artifacts/state, not agent prose alone.
- [ ] Define ambiguity rules and any human-review requirement.
- [ ] Define injected events and their positions independently of condition behavior where feasible.
- [ ] Set time/tool/attempt limits.
- [ ] Include at least one negative control to prove the scorer rejects a bad result.
- [ ] Record provenance/license and ensure the task has not leaked into prompts.
- [ ] Validate the fixture using known correct and intentionally incorrect outputs.

## 8. Phase D: runner and measurements

- [ ] Extend suitable existing benchmark components rather than duplicating them.
- [ ] Implement production-path adapters, with a manifest naming the actual invoked entry point.
- [ ] Add configuration validation and fail loudly on missing model routes; no fallback to mocks during measured runs.
- [ ] Add run IDs, task IDs, condition IDs, replicate IDs, UTC timestamps and code/config/task hashes.
- [ ] Persist a checkpoint after each trajectory; resume completed runs without repeating charged calls.
- [ ] Implement a concurrency limit, total spend cap, per-run cap and bounded retry policy.
- [ ] Include failed requests/retries and helper-model calls in accounting when charged.
- [ ] Record provider-reported input, cached input, output and other billed token categories without double-counting.
- [ ] Distinguish measured usage, provider invoice reconciliation, and price-derived estimates.
- [ ] Store dated pricing source and currency. Missing usage/cost is unknown, never zero.
- [ ] Include retrieval/embedding/summary/router/judge costs, or explicitly identify unmeasured costs.
- [ ] Measure wall time end to end; record timeout durations and failed-run time, not only successful latency.
- [ ] Capture tools called, permission denials, retries, completion claim and scorer outcome.
- [ ] Keep private model reasoning out of requested or published artifacts; use observable actions, outputs and evidence.
- [ ] Add a dry-run mode that makes no provider calls and clearly labels output synthetic.
- [ ] Test accounting with synthetic billing records, cap enforcement, resume and negative scoring controls.
- [ ] Run existing relevant tests and type checks once after changes; avoid broad repeated suites without cause.
- [ ] Prove a tiny authorized real-model trajectory uses the same path as normal AgentForge operation.

Required metrics and definitions:
- Valid success rate = fully accepted safe trajectories / all attempted trajectories in the declared analysis set.
- False completion rate = unsupported success claims / trajectories declaring success; also report count over all attempts.
- Cost per success = total measured/estimated cost of all attempts / valid successes; undefined if zero successes.
- Fact retention = correctly preserved required facts / required facts; report invented/conflicting facts separately.
- Correction recurrence = later opportunities that repeat the corrected error / eligible later opportunities.
- Token reduction = 1 - total tokens in treatment / total tokens in matched comparator; never present as savings without success results.
- Latency = end-to-end median and p95, with timeouts and failures reported explicitly.
- Safety failures = count and rate of actual forbidden effects, separate from attempted effects that were blocked.

## 9. Phase E: paid evaluation and independent review

- [ ] Estimate cost from pilot-sized task lengths and actual selected model prices; include a contingency and worst-case attempt caps.
- [ ] Present owner a compact budget/run matrix and get a spend ceiling before starting charged batches.
- [ ] Run pilot on development tasks; inspect mechanical failures and scorer disagreements.
- [ ] Repair mechanics, record every change, then freeze held-out protocol and code.
- [ ] Run held-out batches with checkpointing and caps; keep working on manuscript/methods while runs execute.
- [ ] Never remove a failing task because it hurts the result. Apply only preregistered exclusions and list them.
- [ ] Keep infrastructure-error sensitivity analysis separate from primary all-attempt analysis.
- [ ] Have an independent reviewer inspect all safety failures and false-completion cases plus a randomly selected success sample.
- [ ] If model judges are used, blind condition labels, pin judge/prompt, record cost and calibrate against human-reviewed examples.
- [ ] Label agent review as automated review, not academic peer review. Arrange accountable human review before submission.
- [ ] Produce paired comparisons by task; account for correlated replicates with task-level resampling/appropriate clustered analysis.
- [ ] Report effect sizes and confidence intervals, not only win percentages or p-values.
- [ ] Separate confirmatory outcomes from exploratory observations and multiple secondary comparisons.
- [ ] Record null and negative findings. Narrow conclusions when uncertainty is large.

## 10. Phase F: manuscript

- [ ] Draft abstract LAST, after results are frozen.
- [ ] Introduction: concrete problem, questions and bounded contributions.
- [ ] Related work: accurately credit memory, routing, workflow and existing harness approaches.
- [ ] Architecture: diagram AgentForge, Workflow Engine and JEv; distinguish runtime enforcement from model suggestions.
- [ ] Implementation: actual version, entry points, storage and dependency boundaries.
- [ ] Methods: fixtures, baselines, ablations, splits, models, budgets, scoring, exclusions and statistics.
- [ ] Results: success/cost frontier, false completion, retention, corrections and recovery outcomes.
- [ ] Ablations: explain which component changes which result; do not infer causality from bundled interventions.
- [ ] Failure analysis: representative sanitized traces, compression omissions, heuristic routing errors and verification overhead.
- [ ] Limitations: synthetic tasks, sample size, model alias drift, judge reliability, deployment differences and external validity.
- [ ] Reproducibility: versioned release, commands, configurations, datasets and artifact hashes.
- [ ] Ethics/privacy: synthetic data, isolated execution, responsible reporting and AI-assistance disclosure.
- [ ] Author contributions: only real consenting human authors; no invented credentials/affiliations or LLM coauthors.
- [ ] Add funding/conflicts statement accurately.
- [ ] Build tables/charts only from saved result files using deterministic scripts.
- [ ] Check every numerical claim against machine-readable data and denominator.
- [ ] Verify references and remove unsubstantiated novelty/performance language.
- [ ] Prepare LaTeX/PDF only once content stabilizes; use the available built-in compiler/editor where supported and inspect rendered pages.

Do not invent absent results to fill tables. Use explicit NOT MEASURED placeholders in drafts and remove unsupported claims from final manuscripts.

## 11. Phase G: reproducibility and public materials

- [ ] Run documented commands from an isolated clean checkout with synthetic fixtures.
- [ ] Verify dry-run reproduction needs no personal account or proprietary data.
- [ ] Document paid reproduction requirements, estimated costs and supported model routes.
- [ ] Pin dependencies/configurations and record platform/runtime versions.
- [ ] Screen publication files and history included in the release for credentials, personal paths, real conversations and business names.
- [ ] Keep code Apache-2.0; preserve third-party licenses. Choose paper/data licenses separately with owner review.
- [ ] Add citation metadata with real author details supplied/approved by owner.
- [ ] Build website/research.html with plain-language results, methodology, limitations, PDF/source/results links, and GitHub CTA.
- [ ] Label any protocol-only page clearly; do not promote unmeasured improvements.
- [ ] Add navigation, footer entry, descriptive metadata and sitemap entry using existing site architecture.
- [ ] Check desktop and mobile rendering, keyboard navigation, chart labels and every download link.
- [ ] Prepare a factual launch summary and short demo script; do not send influencer/social outreach without explicit authorization.

## 12. Phase H: publication routes and exact preparation

Policies researched 2026-09-28. Recheck official instructions immediately before submitting.

### Website and GitHub
- [ ] Prepare reviewable diff, PDF, results archive and citation information.
- [ ] Obtain owner approval of the final public package.
- [ ] Publish scoped changes and verify live pages/downloads, not just local build success.
- [ ] Record public URLs, release commit and artifact checksums.

### Zenodo: archival DOI, not peer review
Official: https://help.zenodo.org/docs/get-started/quickstart/
- [ ] Prepare paper and reproducibility archive as clearly described records or related artifacts.
- [ ] Confirm real authors, title, abstract, version, keywords, licenses and related GitHub URL.
- [ ] Prepare account/upload draft through authorized access; involve owner only where identity/authentication requires it.
- [ ] Review files before publication: published record files need a new version to change.
- [ ] Obtain final approval; publish; record DOI and verify downloads.
- [ ] Link DOI from website, repository and paper as appropriate.

### arXiv: moderated research preprint, not peer review
Official: https://info.arxiv.org/help/submit/index.html
Endorsement: https://info.arxiv.org/help/endorsement.html
- [ ] Confirm paper is an actual scientific contribution suitable for the chosen category, provisionally cs.AI.
- [ ] Check author account and endorsement requirements early, while experiments continue.
- [ ] Prepare title, abstract, author list, license choice, category and complete manuscript/source.
- [ ] Include LaTeX sources when required; inspect the generated PDF.
- [ ] Respect author self-submission policy; prepare everything for the owner's final submission where required.
- [ ] Record moderation outcome accurately. Submitted, announced and peer-reviewed are different states.

### TMLR: possible later peer-reviewed research submission
Official: https://jmlr.org/tmlr/author-guide.html
Policies: https://jmlr.org/tmlr/editorial-policies.html
- [ ] Assess scientific fit after results exist; product documentation alone is insufficient.
- [ ] Prepare complete author OpenReview profiles and conflicts information.
- [ ] Format anonymized manuscript with TMLR template and anonymized supporting materials.
- [ ] Check originality/overlapping archival-submission rules; preprints are allowed under current policy.
- [ ] Check paper license, authorship, AI-use and impact requirements.
- [ ] Obtain author approval and submit through the official portal.
- [ ] Track reviews/revisions with a response matrix; never fabricate reviewer approval.

### JOSS: later software publication, not immediate launch target
Official: https://joss.readthedocs.io/en/latest/submitting.html
Policies: https://joss.theoj.org/about
- [ ] Verify more than six months of active public history and demonstrated research use under current requirements.
- [ ] Collect independent research adoption evidence as it occurs; do not invent users.
- [ ] Prepare software-focused paper, docs, tests, license and AI-use disclosure when eligible.

## 13. Delegation and cost discipline

These are optional bounded work packets for other agents, not instructions to spawn agents without applicable authorization. Luna remains coordinator unless owner changes that.

| Packet | Owned outputs | Must not edit |
| --- | --- | --- |
| Implementation auditor | CAPABILITY_EVIDENCE.md | Production code, runner or results |
| Evaluation engineer | research/runner, scoring, fixture mechanics | Paper conclusions or website |
| Literature reviewer | RELATED_WORK.md, verified bibliography | Model settings/results |
| Independent verifier | review report and reproducibility findings | Raw experimental results |
| Publication editor | manuscript and website after frozen results | Protocol or scores |

- Use small, explicit files/tasks and return evidence paths, not repeated full histories.
- Do not run competing edits to shared files. Coordinator owns protocol and integration.
- Escalate to a stronger model only for unresolved experimental design, statistical interpretation, security findings or final scientific review; routine implementation can remain with Luna.
- Batch independent reads; do not rerun broad tests or re-read the entire repository every turn.
- Save progress after each completed phase and before switching models.

## 14. Acceptance and stop conditions

Research preparation is complete when the protocol, real-path runner, validated scorers, synthetic fixtures, dry-run evidence and budget estimate exist.
Measured paper is complete only when authorized experiments, independent checking, analysis, manuscript and reproducibility package are complete.
Publication is complete only when owner-approved artifacts are actually accessible and recorded. External acceptance is never guaranteed.

Do not mark the entire AgentForge product complete based on this research task. Do not halt independent work merely because one external account, spend approval or human review is pending.

First resumption action: finish Phase A capability mapping, then build the smallest no-network evaluation slice through existing production code. Do not restart venue research or write promotional results.
