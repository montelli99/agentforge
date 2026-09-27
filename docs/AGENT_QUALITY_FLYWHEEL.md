# AgentForge Competitive Capability and Quality Flywheel

**Reviewed:** 2026-09-23  
**Purpose:** Turn current harness capabilities and real user pain into a product advantage.  
**Evidence rule:** Product feature claims below link to first-party material. Reddit is used to identify reported pain, not to prove prevalence or root cause. “Not evidenced” means the reviewed sources did not establish the feature; it does not prove the product lacks it.

## Capability comparison

The products overlap, but they optimize for different jobs. This is a feature comparison, not a one-number ranking: “persistent identity,” “review,” and “evaluation” have different meanings across products.

| Capability | Grok Bot | Codex app | OpenHands Agent Canvas | DeepSeek Harness | Open Harness (open-harness.app) | AgentForge today / gap |
|---|---|---|---|---|---|---|
| Durable named agent identity | Core object; Bot keeps memory, files, preferences, and browser sessions | Project threads persist; the principal object remains the task/thread | Conversations and workspaces; backend can be local, VM, or cloud | Session and plugin/runtime centered | Lead agent plus named specialist roles | Agent records and namespaces persist locally; worker lifecycle and durable agent conversations are not connected |
| Long-running/background work | Persistent cloud computer and routines can continue while user is away | Background tasks and scheduled automations return to a review queue | Local/remote/cloud backends and automations | Modes and trajectories; unattended runtime not established by reviewed page | Automations and playbooks are presented; shipped execution scope needs validation | Task records persist; real worker execution, resume, leases, and reliable background completion remain open |
| Multi-agent coordination | Multiple Bots can communicate; Bot owns its memory and routines | Parallel tasks/threads; Git repos can use isolated worktrees | Parallel agents and team-shared backends | Plugin architecture and agent handoffs are documented; product is developer preview | Lead-agent/specialist hierarchy is a central concept | Teammate and task records exist; coordination and execution are not proven end to end |
| Tool and integration surface | Browser, filesystem, terminal, and supported app integrations/routines | Coding tools, editor/browser review, project instructions and automations | Workspace tools, browser, terminal, app pages, Slack/GitHub and event/schedule automation | Everything is a plugin; modes can compose plugins | Visual playbooks and connections are presented in early access | Tool manifests, adapters, and channel records exist; most external integrations remain fixtures or partial |
| Runtime portability | Persistent hosted computer | Local worktree and Codex-managed execution | Explicit local machine, Docker, VM, or cloud switching | Runtime/plugin design is extensible | Public page positions a team workspace; portable runtime proof not established | Native/Pi/Pydantic provider shapes exist; real runtime operation and portable switching remain incomplete |
| Work review and approvals | Actions/events/artifacts appear in Bot transcript; takeover when needed | Review diffs and comment in thread; automation outputs in review queue; configurable rules | Run/review workspace and human checkpoints | Trajectory is inspectable/searchable; replay/fork supported in preview | Human checkpoints and prior-run evidence are emphasized | Local approvals, diff/evidence records exist; execution-time enforcement and complete evidence production remain incomplete |
| Run/event inspectability | Mixed transcript of conversation, actions, routines, and artifacts | Thread, changed-file review, and task/automation outputs | Conversation, browser, files, execution mode and automation results | Deep trajectory/event inspector is a differentiator | Evidence from playbooks is presented | Audit/event ledger and traces exist as partial foundations; end-to-end run capture and useful trace UI are missing |
| Quality evaluations and regression detection | Not established by the reviewed consumer product docs | App-level agent quality dashboard not established by the reviewed sources | Not established as a core Canvas quality dashboard in the reviewed product pages | Not established in the reviewed preview docs | Not established on the public early-access page | Drift baselines and a human-approved correction-to-replay primitive exist; real-agent trend data and deployment alerts remain unproven |
| Human correction loop | Bot memory and user correction are part of persistent-agent framing; formal regression tests not established | Inline review/comments support work correction; automated correction-to-eval loop not established | User review and repeatable automations; correction-to-eval loop not established | Creator mode can inspect/test/compose plugins; production quality loop not established | Playbooks/checkpoints; measurable correction loop not established | Scoped memory reaches worker context; corrections stay pending until human approval, then can become deterministic replay cases without automatically changing memory or authority |
| Honest readiness and sample-data boundaries | Product demos make a strong consumer experience; independent reliability evidence is separate | Product delivers mature review workflow; external claims are not performance guarantees | Product surface is evolving; current beta boundaries are documented | Explicit developer preview; trajectory tooling is valuable for builders | Early-access product with seeded examples | Local status must always identify real, sample, fixture, and unconnected states; old variants violated this and current UI is being redesigned |

### Sources for product capabilities

- Grok Bot persistent-agent interface: [Designing Grok Bot](https://x.ai/news/designing-grok-bot), [Grok Bot overview](https://docs.x.ai/grok-bot/overview), and [Skills, routines, and automations](https://docs.x.ai/grok-bot/skills-routines-and-automations) (last updated Sep 14, 2026).
- Codex desktop work/review: [Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/) and [Codex repetitive-work workflow](https://developers.openai.com/blog/automating-repetitive-work-at-openai-with-codex).
- OpenHands: [Agent Canvas](https://www.openhands.dev/product/canvas), [August 2026 changes](https://hub.openhands.dev/blog/new-in-agent-canvas-august-2026), and [Agent Canvas overview](https://github.com/OpenHands/docs/blob/main/openhands/usage/agent-canvas/overview.mdx).
- DeepSeek: [Harness developer preview](https://www.deepseek.com/harness/en/).
- Open Harness: [Team builder](https://open-harness.app/). This is distinct from [OpenHarness.ai](https://openharness.ai/), a universal agent API, and the [open-harness desktop repository](https://github.com/knightfolk/open-harness).

## What builders are complaining about

These are examples of reported pain, not a representative survey:

| Reported problem | Example discussion | Product implication |
|---|---|---|
| Agent ignores a tool result, repeats a call, or resumes an older thought | [LocalLLaMA harness developer](https://www.reddit.com/r/LocalLLaMA/comments/1uob3za/learning_to_write_ai_harness_old_fashioned_way/) describes stale-topic drift and repeated tool calls in a self-built loop | Record user intent, selected tool, arguments, result, and the agent’s next action. Detect a repeated call with unchanged input/result and require a reasoned retry or stop. Keep an explicit current objective and checkpoint outside free-form chat. |
| Context and tool catalogs quietly degrade behavior | [LLMDevs discussion](https://www.reddit.com/r/LLMDevs/comments/1ulf40z/thought_i_made_my_agent_worse_turned_out_to_be_context_bloat_from_too_many/) reports an apparent model regression that was attributed to context bloat; replies warn tool pruning can also remove a needed tool | Fingerprint and diff the exact prompt, retrieved memories, tool schemas, token budget, and order sent on each run. Measure both tool-selection precision and missed-required-tool rate before enabling dynamic tool retrieval. |
| The same model changes materially across harnesses | A [Reddit same-model comparison](https://www.reddit.com/r/aiagents/comments/1vgwf9i/i_tested_the_same_model_in_8_agent_harnesses_pass/) reports a wide pass-rate spread in a small task set. Another [14-task comparison](https://www.reddit.com/r/LocalLLaMA/comments/1w8f7bp/which_agent_harness_do_you_use_and_why/) reports differing cost and tool-call counts with a fixed model | Compare one frozen task set with model/provider, system prompt, tools, decoding, harness version, and context held constant. Report uncertainty and raw cases, not a “best harness” badge from a tiny sample. |
| Quality regression is hard to attribute | A [production-debugging checklist](https://www.reddit.com/r/LLMDevs/comments/1umirhc/your_agent_is_failing_in_prod_is_it_your_code_the/) lists code, model, environment, input mix, load, and monitor itself as competing causes | AgentForge needs a regression record that pins every observable axis and tests the evaluator itself. Never label an incident “model degradation” without a controlled rerun. |
| A long-lived agent accumulates bad context and becomes less consistent | [Long-running agent discussion](https://www.reddit.com/r/ClaudeCode/comments/1uioiie/why_do_longrunning_agents_get_stupider_and_more/) recommends separating append-only events, typed execution state, and the small active working set | Preserve raw history separately from compact typed state. Resume from a validated checkpoint and retrieve only task-relevant instructions. Compare behavior before and after compaction. |
| Plugin flexibility causes breakage and discoverability problems | DeepSeek users discuss plugin churn and an unclear community catalog in [release compatibility](https://www.reddit.com/r/DeepSeek/comments/1vnbdzn/author_here_any_feedback_about_deepseek_harness/) and [plugin discoverability](https://www.reddit.com/r/DeepSeek/comments/1vthl6g/deepseek_harness_the_everything_is_a_plugin_pitch/) threads | Version and validate plugins; show compatibility, provenance, permissions, and last-tested runtime. Treat a “plugin ecosystem” as a governed compatibility surface, not a count of available plugins. |
| Users suspect a model was silently downgraded | Anecdotal “it got worse” posts exist, but the reviewed discussions do not prove intentional provider changes. Context, tool/schema edits, decoding defaults, routing, and app releases are common confounders | Productize an **audit for suspected model rug-pulls**, not an unsupported allegation: persist the exact resolved model ID/revision when available, provider/endpoint, harness build, prompt/tool/memory hashes, decoding, context size, and frozen-case results. If the provider only gives a moving alias, label the underlying revision unknown and detect behavioral change with canaries. |

There is a stronger, documented example of a real **stack-level** regression: [Anthropic’s April 23 postmortem](https://www.anthropic.com/engineering/april-23-postmortem) says changes to Claude Code’s reasoning-effort default, retained thinking/context behavior, and system prompt affected quality; the company says the issues were resolved by April 20 and states the API/inference layer was not impacted. This supports the user's concern that user-visible “model quality” can change because of the harness around it. It does **not** demonstrate a malicious model-weight rug-pull. AgentForge should call this *behavioral drift* until controlled evidence attributes a cause.

For operational evaluation, first-party guidance converges on trace-level grading and frozen datasets: [OpenAI agent evals](https://developers.openai.com/api/docs/guides/agent-evals), [Anthropic agent evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), and [Google online evaluations](https://docs.cloud.google.com/gemini-enterprise-agent-platform/optimize/evaluation/evaluate-online). These support the measurement design below; they do not establish that any one provider’s judge is correct. OpenAI’s [API compatibility documentation](https://platform.openai.com/docs/api-reference/backward-compatibility) also cautions that prompting behavior may change between model snapshots, which is why immutable model IDs and periodic golden-case runs both matter.

## AgentForge’s adoption wedge: Quality Flywheel, not just traces

The differentiator should be **causal, actionable quality history**. A raw trace says what happened. AgentForge should show what changed, which layer likely caused it, whether users corrected it, and whether the repair survives a replay.

### What to record for each evaluated run

Create a durable quality record linked to the agent, task, and trace:

- Immutable run ID, task type, benchmark/case-set revision, timestamp, outcome, latency, token/cost counts when available.
- Exact harness/provider build; resolved model name and immutable revision when exposed; endpoint/region when exposed; decoding parameters.
- Hashes and versions for system/developer instructions, process/playbook, tool catalog and schemas, retrieved memory set, and active context/checkpoint. Keep secret values and private prompt text out of the summary view; retain user-authorized raw trace under the workspace’s data policy.
- Tool-call validity, tool choice, repeated/no-progress actions, result acknowledgement, objective completion, contract/policy violations, evidence-grounded claims, and human corrections.
- Data coverage and evaluator identity/version. Never substitute an LLM judge score for deterministic checks or human labels without saying so.

If any axis is unavailable, store `unknown`. A dashboard must not fill missing provider revision, factual-grounding evidence, or confidence with a guess.

### Signals and regression rules

Track by **agent + task type + exact configuration fingerprint**, not one blended “agent score”:

1. **Task success:** acceptance checks passed, required outputs present, and human acceptance/rework rate.
2. **Tool behavior:** correct tool chosen, valid schema, result used, duplicate/no-progress call rate, and required-tool omission.
3. **Grounding:** factual claims linked to retrieved/tool evidence; unsupported claim rate; contradictions with authoritative source; citation/source mismatch.
4. **Policy and safety:** unauthorized action attempts, contract boundary violations, secrets in output, and correct human handoff.
5. **Stability and cost:** pass rate, correction/rework rate, latency, tokens/cost, retry count, context growth, and resume/checkpoint success.

Use a fixed “golden” suite plus a rotating, human-reviewed sample of real runs. Compare a candidate against its accepted baseline using minimum sample counts and confidence intervals. A small sample may show “watch,” not “regression.” A material drop triggers a canary hold or routing fallback for the affected task class, preserves the failing trace, and opens a diagnosis card comparing model, harness, prompt, tools, memory, input distribution, and infrastructure changes.

### Correction-to-improvement loop

1. User marks a response/action as wrong and supplies or selects the correction. Store the original evidence, agent output, correction, category, and affected run/config fingerprint.
2. Convert the case into a regression candidate. Ask the user only if the correction changes business policy or is ambiguous; do not silently turn every correction into permanent memory.
3. Replay the candidate against the current build and nearby golden cases. A correction is accepted only when it fixes the target without breaking existing cases and keeps safety checks passing.
4. Propose the smallest change: task-specific memory, playbook rule, prompt patch, tool-schema fix, retrieval adjustment, or model routing change. Show a before/after diff and measured impact.
5. Require a human approval for policy/memory changes that alter authority or business rules. Roll out as a canary; automatically revert or disable the change when quality guardrails fail.
6. Keep the correction, rejected proposals, evaluator version, replay evidence, and rollback linked in the audit history.

This is not unrestricted self-modification. Agents may suggest an improvement; only the deterministic evaluation gate and authorized human can activate sensitive policy changes.

## Implementation status and priority

The current codebase has persistent benchmark-result storage, and its measured quality baselines and comparison reports now persist locally across restart with audit linkage. A first run containing a detected hallucinated claim or tool misuse is quarantined and cannot establish a trusted baseline. `CorrectionRegistry` stores only opaque evidence references and a corrected expected result, requires explicit human approval, and then produces a deterministic replay case; it cannot mutate memory, authority, or policy automatically. It does **not** yet have a worker producing real agent runs, trace-linked run evidence, time-series regression alerts, or canary rollback. The benchmark runner also previously inferred unrelated capabilities (`tool_calling`, streaming, structured output) from a generic pass rate; that inference has been removed. Until feature-specific suites and end-to-end execution exist, compatibility must not imply capability coverage.

Suggested build order:

1. **Quality event schema and trace linkage:** record configuration fingerprint, run/case IDs, evidence provenance, tool outcomes, human rating/correction, and explicit unknowns. Persist locally with restart tests and connect approved correction cases to the runner.
2. **Frozen evaluations:** add golden cases for tool-result use, stale-intent drift, repeated calls, long-context compaction/resume, grounded answers, schema compliance, correction retention, and policy boundaries. Run deterministic checks first; use judge models only as labeled secondary signals.
3. **Quality trend page:** per-agent/task graphs, baseline comparison, sample counts/uncertainty, corrections/rework, and filterable traces. Clearly separate measured, user-labeled, judge-scored, and unavailable metrics.
4. **Drift attribution and canary gate:** configuration diff, suspected model-revision change, regression threshold, task-class fallback, and human-visible hold/revert record.
5. **Correction proposals:** connect approved replay cases to measured suites and narrowly scoped diffs; verify no regression before activation.

### Acceptance conditions for claiming this works

- Same frozen cases run on two harness/model configurations and the report exposes exact differences and every unknown.
- A tool-result-ignore or repeated-call regression causes a failing signal tied to the failing trace.
- A user correction becomes a regression case, can be replayed, and is not silently promoted into memory or authority.
- A deliberately degraded candidate is detected at the configured minimum sample size; a small sample is not falsely labeled as drift.
- A prompt, tool schema, memory, harness, or resolved model change is attributable from the configuration diff.
- A detected failure stops or routes away from the affected candidate without erasing evidence; recovery is auditable.
- The evaluator is checked against human-labeled cases and can be versioned independently from the agent being evaluated.

