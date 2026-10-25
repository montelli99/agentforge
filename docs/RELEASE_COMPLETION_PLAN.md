# Full release completion goal

This work order preserves the whole remaining scope. Passing a component check
does not close the goal. No private workspaces, credentials or private product
integrations belong in source, evidence, fixtures or release packages.

| Requirement | Completion evidence | Current gap |
| --- | --- | --- |
| Guided onboarding through first successful task | Clean-install user journey with secure account setup, model validation and successful task | Guide exists; credential installation and restart remain manual |
| Supported subscription chat and execution | Official client authentication, bounded workspace access, cancellation and reconnect evidence for each advertised route | Codex planner only; Claude/Gemini managed workers incomplete |
| Real-model full task completion | Model-generated plan, explicit review, isolated execution, independent checks and useful artifact | Model-generated synthetic report passed isolated execution and checks; end-user approval UI journey still unproven |
| Recovery and memory reliability | Crash, auth expiry, interrupted tool, conflicting-memory and duplicate-action cases with durable receipts | Disconnect and simple retrieval examples passed; broader faults unproven |
| Measurable differentiation | Frozen held-out workloads, matched model/budget baselines, repeated trials, completion/cost/latency results including failures | Development examples only; no competitive superiority demonstrated |
| Finished public release and launch | Exact-build CI/package hashes, clean distribution, coherent UI/docs, reproducible demo and accurate marketing claims | Latest changes merged; release packaging and documentation reconciliation remain |

## Work order

1. Complete and verify real model planning through independently checked output.
2. Exercise failure/recovery around that real workflow; repair causes found.
3. Complete secure guided setup and official subscription workers.
4. Freeze a held-out evaluation before running comparisons. Keep development
   examples out of the held-out score and account for every attempt.
5. Reconcile product, documentation and evidence; publish the exact tested build
   and prepare the demonstration and launch materials.

Only account-owner authentication or a genuine unavailable external service
should block its dependent item. Continue independent work. Do not mark the goal
complete until every row has direct current evidence. Historical private-cache
removal remains a separate tracked request until the hosting provider confirms it.

## October 25 progress

Live MiMo V2.6 Flash generated a two-command plan for a synthetic sales summary
in 8.457 seconds (458 input / 357 output tokens). After agent review and explicit
digest selection under owner-authorized testing, the governed worker ran it in
network-disabled Docker in 3.670 seconds. Independent checks observed two paid
orders and revenue 125; JSON and Markdown artifact hashes and an observed receipt
were recorded. The task remained `waiting_approval` for final review. This is an
evaluation-harness approval path, not proof of the end-user approval UI journey.

JSON artifact SHA-256:
`0bf5bf411f8b6891fd27db8fdf369ea199b3f93f9c22d62c055f643b15f0966e`

Markdown artifact SHA-256:
`8ae6b47e8fd7655f028156004e0b85151d7823a7c75bc4f5a2250ba184f69a62`
