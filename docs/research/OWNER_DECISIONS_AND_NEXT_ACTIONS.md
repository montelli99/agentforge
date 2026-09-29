# Delegated research decisions and execution instructions

Authority: owner explicitly instructed Codex to answer the approval packet, resolve blockers, and tell the implementation agent what to do next. These are delegated implementation decisions, not an assertion of human scientific review. This document supersedes the packet's blanket wait for owner input for local work.

## Decisions

1. **Model routes:** use the installed local Ollama `qwen2.5-coder:7b` for B0, B1, AF and later isolable ablations, with identical inference settings. Inventory verified digest: `dae161e27b0e90dd1856c8bb3209201fd6736d8eb66298e75ed87571486f4364`. Verify digest and local storage again before dispatch; reject cloud variants and remote redirects. No fallback model. Freeze parameters in a new run manifest before execution.
2. **Pricing:** external API spend ceiling USD 0. Local inference has no per-request API charge; electricity, hardware and operator time are unmeasured and must not be represented as zero total economic cost. Capture actual token counts when returned; missing usage remains unknown. No cloud helper, embedding, summary or judge calls.
3. **Budget:** authorize local smoke followed by the planned development pilot (12 tasks x B0/B1/AF x 2 replicates = 72 trajectories) after runner acceptance. Concurrency 1, maximum 2 attempts and 120 seconds per trajectory, following the existing pilot limits. Record timeouts and failed attempts. Do not change tasks, metrics or exclusions to get passing results. Held-out execution follows pilot review and the original freeze requirements.
4. **Review:** use a separate agent for engineering review now. Never call that human review or peer review. Prepare the seeded human-review packet after results exist. An unavailable human reviewer gates final scientific sign-off, not coding, smoke, pilot, analysis or drafting. Do not invent a reviewer identity.
5. **Runtime:** use a disposable synthetic workspace and the tested isolated Docker backend for task execution. Allow the model adapter only the local Ollama route; keep task-side networking disabled. Mount no personal configuration, business data or secrets. Verify evaluator data is outside model/tool scope.
6. **Publication:** prepare a GitHub research package and Zenodo/arXiv submission drafts. Keep Apache-2.0 for code; use CC BY 4.0 for newly authored research text and synthetic data as the delegated selection, preserving third-party terms. Leave formal creator identity/affiliation unsubmitted until verified; do not publish the private owner's identifiers by inference. AI assistance must be disclosed. Submission and human review are later gates, not prerequisites to finish the research implementation.

## Actual next work, in order

This is an active completion goal. Continue through every gate below without
pausing for a handoff or declaring completion from mechanics evidence alone:

1. implement and test executable protocol-family scorers for development and held-out cases;
2. run them in the isolated runner with evaluator data outside agent input;
3. add negative controls for wrong facts, unsupported completion claims and forbidden effects;
4. verify network/provider instrumentation, then run the approved local smoke and development pilot;
5. update the evidence ledger and manuscript only from fresh artifacts, leaving historical records immutable.

No additional owner intervention is required for these implementation and verification steps.

1. Re-read Astra's runbook sections 2, 4 and 5 and inspect implementation, not ledger assertions. The current sweep inherits child stdout, checks only exit status, and prints literal zero call counts. Section 2 is not fully verified.
2. Implement versioned machine-readable envelopes, bounded child execution, output parsing, unique IDs, assertion/artifact validation and generated consolidated evidence (2.02, 2.08–2.10). Test exit-zero failure, missing/malformed output, duplicate IDs and hangs. Do not edit historical results to retrofit evidence.
3. Instrument or deny network/provider operations as required by 2.11. Label counts unmeasured until instrumentation proves them. A literal zero is not measurement.
4. Inspect all 72 fixtures against 4.03–4.13: event schedules, artifact/state scorers, correct/wrong controls and answer isolation. A JSON schema check is not scorer acceptance. Implement missing pieces without silently changing frozen fixtures; record any necessary amendment and preserve the prior hashes.
5. Implement real B0/B1/AF adapters and isolable ablations through production components, validated manifests, interleaving and complete attempt/usage records (5.03–5.18). Existing two-answer synthetic smoke is not this runner.
6. Verify the local model digest and execute the tiny smoke through that runner. Save run identity, actual outputs, token usage, timings and failure classification. Then run the development pilot; preserve unfavorable results.
7. Generate results and paper tables from recorded trajectories. Keep incomplete evidence explicit. Prepare human-review material and publication drafts while any external sign-off remains pending.

Do not rerun broad unchanged checks or append repeated success notes as a substitute for these implementation steps. Do not ask the owner to fill the blank template: retain it as a reusable template and use this decision record for the current local study.

## Superseding route preference (2026-09-29)

The earlier Qwen route selection is superseded by the owner's later instruction
to exclude Qwen. Future local runs must receive an explicit non-Qwen model via
`AGENTFORGE_LOCAL_MODEL`; runners no longer select a model by default. The
preferred comparison families are Luna, GPT-5.5 and MiMo when their exact
provider routes are configured. Historical Qwen pilot artifacts remain
immutable evidence and are not reused as current approval for new runs.

## Current reconciliation (2026-09-29)

The numbered instructions above are preserved as the governing implementation
sequence. Current evidence now shows that items 1 through 3, the local smoke,
and the 72-record local adapter pilot have executed. The pilot produced 68
completed trajectories and four bounded timeouts, with all attempts retained
in the denominator. It remains adapter-pilot evidence only: it does not prove
final production-path fidelity, held-out results, model superiority, or human
review. The next executable work is therefore to strengthen production-path
fidelity and held-out scoring evidence, then regenerate analysis artifacts from
those records. No paid route or external publication is authorized by this
reconciliation.
