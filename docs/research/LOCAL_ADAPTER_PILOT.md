# Local adapter pilot

The current local adapter pilot is a zero-spend engineering run over the 12
development tasks, three condition policies (B0, B1 and AF), and two
replicates: 72 trajectory records in total.

The machine-readable source is
`research/results/local-adapter-pilot-v0.1.json`; the generated summary is
`research/results/local-adapter-pilot-summary.json`. The durable ledger is
`research/results/local-adapter-pilot-ledger.json`.

The run recorded 68 completed trajectories and four bounded timeouts. It kept
all attempts in the denominator and did not infer usage or cost for timed-out
requests. Completed local usage was 2,332 tokens for B0, 3,256 for B1 and
2,762 for AF; external spend was zero. The frozen scorer accepted two AF
responses, and no B0 or B1 response.

This is adapter-pilot evidence only. It does not establish final AgentForge
performance, production-path fidelity, held-out results, statistical power,
or superiority over another system. The full production adapters, held-out
model run and review gates remain required before any manuscript result may
use these records.

## Model-specific follow-up

The native Ollama chat path was repaired and verified with a separate
model-specific output. The bounded Phi-3.5 run is recorded at
`research/results/local-adapter-pilot-phi3.5-v0.2.json`: one trajectory
completed with 100 reported local tokens and scored as a failed required-fact
case. It is retained as unfavorable evidence and is not merged into the
historical Qwen pilot artifact.

A six-trajectory B0 follow-up is recorded at
`research/results/local-adapter-pilot-phi3.5-v0.3.json`, with its summary in
`research/results/local-adapter-pilot-phi3.5-v0.3-summary.json`. All six
requests completed through the native adapter, consumed 606 local tokens in
total, and scored zero passes. This is useful adapter/model evidence, not a
comparative superiority claim.

A complete 72-trajectory Phi-3.5 development pilot is recorded separately at
`research/results/local-adapter-pilot-phi3.5-v0.4.json`, summarized in
`research/results/local-adapter-pilot-phi3.5-v0.4-summary.json`. B0, B1 and AF
each completed 24/24 trajectories. Scorer passes were B0: 0/24, B1: 0/24 and
AF: 2/24; local token totals were 2,382, 3,262 and 3,036 respectively. The
external spend is zero. These are development-pilot observations only and do
not establish superiority or publication-ready performance.

The reproducible descriptive comparison is generated with
`pnpm research:compare-pilot` and saved at
`research/results/local-adapter-pilot-phi3.5-v0.4-comparison.json`. It reports
pass rates, completion counts, token totals and averages per condition without
turning the pilot into a superiority claim.
