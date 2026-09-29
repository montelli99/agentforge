# Next research phase inputs

For a concise approval-ready list, see [`OWNER_APPROVAL_PACKET.md`](OWNER_APPROVAL_PACKET.md).
The machine-readable companion is [`../../research/config/owner-approval-template.json`](../../research/config/owner-approval-template.json); it defaults to unauthorized execution.

The local mechanics phase is complete. The delegated local-study decisions in
`OWNER_DECISIONS_AND_NEXT_ACTIONS.md` are already active and authorize the
zero-spend implementation, smoke and development-pilot path. The inputs below
remain required only for a new paid, held-out or publication-signoff phase;
they must not stop the approved local implementation sequence.

The delegated zero-spend local adapter pilot is separately authorized by
`OWNER_DECISIONS_AND_NEXT_ACTIONS.md` and has already been recorded. That
decision does not authorize a paid route, a held-out model run, or publication.

## Additional decisions for paid, held-out or publication-signoff phases

1. Model IDs and provider routes for B0, B1, AF and each approved ablation.
2. Price sources and currency for input, cached-input, output and helper-model usage.
3. Pilot replicate count and a hard total spend ceiling.
4. Whether a human reviewer is available for safety failures, false-completion cases and a random success sample.
5. The supported disposable runtime used for production-path acceptance.
6. Publication authorship, AI-use disclosure, paper/data licenses and intended destination.

## Owner response template

Copy this block into the approval record and replace every placeholder. Blank values keep the run unauthorized.

```text
Model routes:
- B0: <provider/model/version>
- B1: <provider/model/version>
- AF: <provider/model/version>
- Ablations: <provider/model/version or none>
Pricing source and currency: <dated source / currency>
Pilot replicates: <integer>
Hard total spend ceiling: <amount and currency>
Human reviewer: <name or “not available”>
Disposable runtime: <runtime, version, isolation boundary>
Publication intent: <none / Zenodo / arXiv / TMLR>
Approved by: <real person>
Approval date: <UTC date>
```

## Required freeze artifacts

Before charged execution, save:

- the protocol/input hash manifest from `hashProtocolInputs.ts`;
- model/provider versions as exposed by each route;
- concurrency, timeout, retry and per-run caps;
- the development/held-out split;
- the reviewer and adjudication plan;
- the owner-approved budget ceiling.

## What can proceed without those decisions

- source-to-runtime audit;
- synthetic fixture expansion that follows the existing protocol;
- scorer and accounting tests using synthetic billing records;
- manuscript methods and limitations drafting;
- website and repository reproducibility documentation.

No paid call, external account, private conversation or production credential is required for those activities.

## Current verified checkpoint (2026-09-29)

- Latest integrated mechanics run: `mechanics-2026-09-29T13-51-13-102Z-669824ea-f17b-42ea-8c67-86cba900e522`.
- Local mechanics, adapter smoke, durable-memory slice, website, package, privacy, crash-recovery, and approved Docker E2E checks pass.
- Still gated: owner-approved model-backed/paid execution, measured comparative outcomes, independent human review, and publication actions.
- Next executable action without owner input: continue local protocol/manuscript/reproducibility work and rerun acceptance checks after any edit. Do not invoke paid providers or publish.

## Route availability check (2026-09-29)

The current workspace exposes a MiMo credential variable and the local Ollama route. No Luna or OpenAI/GPT route variable is configured in this environment. The route check inspected variable names only and did not read or persist secret values. Exact provider/model IDs for those tracks remain unresolved and must not be guessed.

## Owner route preference (proposal, not yet frozen)

The owner does not want Qwen used because of latency. Preferred starting routes are Luna, GPT-5.5, and MiMo. Treat these as separate matched comparison tracks: for each selected model, run B0, B1, and AgentForge with the same model/settings. Do not mix models within one comparison. Exact provider/model/version IDs, pricing, replicate count, and a hard spend ceiling must still be recorded before held-out execution. A cost-conscious order is Luna pilot first, then bounded GPT-5.5 and MiMo follow-up tracks.
