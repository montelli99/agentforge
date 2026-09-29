# AgentForge research execution status

Updated: 2026-09-29

This matrix tracks the approved execution plan. “Complete” means locally verified for the stated scope; it does not imply publication readiness or model-backed performance.

| Phase | Status | Evidence | Remaining gate |
| --- | --- | --- | --- |
| Scope, privacy and publication boundaries | Complete for local preparation; public-artifact scan passed | `WHITE_PAPER_EXECUTION_PLAN.md`, `SUBMISSION_CHECKLIST.md`, `RESEARCH_PROGRESS.md` | Final human/public-release review |
| Source reconnaissance and capability register | In progress; execution-entry inventory and backend matrix complete | `CAPABILITY_EVIDENCE.md`, `SOURCE_RUNTIME_TRACE.md`, `BACKEND_BOUNDARY_MATRIX.md` | Resolve remaining deployment and behavioral evidence gaps |
| OpenClaw and Hermes source audit | Complete for documentation/source comparison scope | `RELATED_WORK.md`, `scripts/research-source-register-acceptance.mjs`, `pnpm test:research:source-register` | Matched runtime comparisons remain unperformed |
| Frozen protocol and comparison design | Mechanics validated; baseline hashes recorded | `PROTOCOL.md`, `validateProtocol.ts`, execution baseline in `RESEARCH_PROGRESS.md` | Freeze a new approved manifest before held-out model execution |
| Synthetic fixtures and deterministic scoring | Development and held-out fixture integrity validated; local adapter pilot completed | `research/tasks/protocol-families-v1.json`, `research/tasks/protocol-families-v1-heldout.json`, both validators, mechanics sweep and `LOCAL_ADAPTER_PILOT.md` | Held-out model execution, without tuning against the split |
| Memory, correction, handoff and evidence mechanics | Local mechanics validated | Fail-closed slices, context-integrity, correction-transfer, workflow-recovery and `mechanicsSweep.ts` | Production-path and model-backed acceptance |
| Zero-spend controls and accounting | Complete for dry-run guard | `pilot-v0.1.json`, `validatePilotConfig.ts` | Owner-approved paid-run ceiling |
| Manuscript and results records | Scaffold complete; current mechanics record verified | `paper.md`, `RESULTS.md`, latest 22-check artifact under `research/results/`, `validateManuscript.ts`, review-packet acceptance and `EXECUTION_LEDGER.md` | Replace placeholders only after measured study |
| Website research disclosure | Complete locally | `website/research.html`, deployable GitHub links, static/link acceptance; 42-page link/mobile checks passed | Live deployment verification |
| Repository regression suite | Verified | 89 test files passed, 494 tests passed, 2 skipped | Re-run after future code changes |
| Contract enforcement | Focused, workflow-facade, native-executor, and worker-evidence boundary checks verified | `contractEnforcer.test.ts`, `workflowEngine.integration.test.ts`, `harnessExecutors.test.ts`, and `taskWorkerRuntime.test.ts`: unauthorized native-executor writes and incomplete worker evidence are rejected before completion | Docker/speculative controller-wide completion-evidence coverage and production deployment remain open |
| Browser policy and native gateway | Focused checks verified | Browser policy: 8 tests; native gateway/Telegram lifecycle: 7 files, 20 tests; source trace documents freshness and channel lifecycle boundaries | Authenticated provider round trips remain deployment-specific |
| Memory, context and benchmark mechanics | Focused checks verified; production-path and model-backed acceptance remain open | AF context, scorer, condition and ledger tests; latest bounded mechanics harness passed 22 checks with development and held-out controls | Independent network instrumentation, full production adapters, model-backed retention, token savings and quality remain unmeasured |
| Correction governance and completion auditing | Focused checks verified | 2 files, 27 tests passed; approval boundary and audit mechanics recorded | Recurrence reduction and full controller-path coverage remain open |
| Operational memory and JEv routing | Source trace verified | `SOURCE_RUNTIME_TRACE.md` documents namespace filtering, optional persistence, deterministic routing and fixed-confidence limits | Cross-process deployment policy and calibrated routing study remain open |
| External comparisons | Source register, immutable repository pins, source-register acceptance gate, and 2026-09-29 URL-resolution check complete | `RELATED_WORK.md`, `scripts/research-source-register-acceptance.mjs`, `pnpm test:research:source-register` | Run matched supported configurations and record limitations |
| Publication submission | Local preparation complete; approval pending | `SUBMISSION_CHECKLIST.md`, `OWNER_APPROVAL_PACKET.md`, `RELEASE_EVIDENCE.md`, review-packet acceptance | Measured results, authorship approval, release tag, archive and venue submission |
| Public package readiness | Local blockers clear | `public-release-readiness.mjs`, package/CLI acceptance, launcher persistence/crash recovery, research clean-export, and `release-evidence-acceptance.mjs` outputs | Hosted CI evidence and registry/provenance publication |

## Current truthful release state

The repository has a reproducible, zero-spend mechanics track, a bounded local adapter pilot, and a public disclosure page. The research bundle is locally verified; its hosted CI gate is deferred until the complete bundle is deliberately published as one unit. The adapter pilot is engineering evidence only; the repository does not yet have final production-path model measurements or **model-backed outcome measurements**, competitive performance results, a DOI, peer review, or publication acceptance.

Route policy: new local runs require an explicit `AGENTFORGE_LOCAL_MODEL`; no
runner selects a default, and Qwen routes are excluded. Historical Qwen pilot
artifacts remain immutable and are not reused as current approval.

## Checkpoint refresh (2026-09-29)

The latest integrated mechanics run is `mechanics-2026-09-29T13-25-42-271Z-908ee290-832e-49a1-b8d1-2f4cc85f9c45` and passed all 22 registered checks under Docker network denial. Repeatable MiMo adapter smokes for `mimo-v2.5` and `mimo-v2.5-pro` also pass through the real adapter. Core regression is 89 test files / 494 passed / 2 skipped. These are mechanics and connectivity evidence only; model-backed outcome measurements, billing reconciliation, independent review, hosted CI, and publication remain open by design.
