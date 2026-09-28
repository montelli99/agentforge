# Next research phase inputs

For a concise approval-ready list, see [`OWNER_APPROVAL_PACKET.md`](OWNER_APPROVAL_PACKET.md).

The local mechanics phase is complete. The following inputs are required before any model-backed or paid run can begin. They are intentionally not guessed or filled from private account configuration.

## Required owner decisions

1. Model IDs and provider routes for B0, B1, AF and each approved ablation.
2. Price sources and currency for input, cached-input, output and helper-model usage.
3. Pilot replicate count and a hard total spend ceiling.
4. Whether a human reviewer is available for safety failures, false-completion cases and a random success sample.
5. The supported disposable runtime used for production-path acceptance.

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
