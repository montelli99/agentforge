# Charged run estimate

Status: prepared for owner approval; no paid provider call was made.
Date: 2026-09-29

## Observed local planning baseline

The completed Phi-3.5 local adapter pilot ran 72 trajectories (24 each for B0, B1 and AF), completed all 72, and reported 8,680 total local tokens:

| Condition | Trajectories | Reported tokens |
|---|---:|---:|
| B0 | 24 | 2,382 |
| B1 | 24 | 3,262 |
| AF | 24 | 3,036 |
| Total | 72 | 8,680 |

This is a workload-sizing baseline only. It is not a provider price, a quality result, or a claim that local-token accounting matches a hosted provider invoice.

## Approval formula

For a proposed hosted batch, the owner supplies the exact provider model IDs and dated input/output prices. The run ceiling is then calculated as:

```
input_cost = billed_input_tokens / 1_000_000 * input_price_per_million
output_cost = billed_output_tokens / 1_000_000 * output_price_per_million
base_cost = input_cost + output_cost + any provider-request charges
ceiling = (base_cost * 1.25 contingency) + explicitly approved retry allowance
```

The execution must stop when the ceiling is reached. Retries, judge calls, retrieval, routing, summaries and other helper calls count toward the ceiling. Missing provider usage or pricing is recorded as unknown, never as zero.

## Required owner inputs before a charged run

1. Exact provider and model IDs for each condition.
2. Dated provider price sources and currency.
3. Number of trajectories and replicates.
4. Retry and timeout limits.
5. Maximum spend ceiling using the formula above.
6. Human reviewer availability for safety failures, false completion, and a random success sample.

Until those values are supplied and approved, the safe executable scope remains the zero-spend mechanics track and local adapter pilot.

## Source artifact

- `research/results/local-adapter-pilot-phi3.5-v0.4-summary.json`
- `docs/research/NEXT_RUN_INPUTS.md`
- `docs/research/WHITE_PAPER_EXECUTION_PLAN.md`
