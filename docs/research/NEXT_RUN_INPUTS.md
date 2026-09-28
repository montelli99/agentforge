# Next research phase inputs

The local mechanics phase is complete. The following inputs are required before any model-backed or paid run can begin. They are intentionally not guessed or filled from private account configuration.

## Required owner decisions

1. Model IDs and provider routes for B0, B1, AF and each approved ablation.
2. Price sources and currency for input, cached-input, output and helper-model usage.
3. Pilot replicate count and a hard total spend ceiling.
4. Whether a human reviewer is available for safety failures, false-completion cases and a random success sample.
5. The supported disposable runtime used for production-path acceptance.

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
