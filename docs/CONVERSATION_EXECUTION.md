# Conversation execution and recovery

Chat can retrieve saved conversation history, read explicitly attached UTF-8 text,
prepare restricted tasks, inspect their state, and invoke an already approved
execution plan through the task worker. The model cannot approve a plan, change a
contract, or grant itself repository or network access.

Configure a tool-capable chat model and the approved Docker execution backend.
New tasks start with a restricted contract. Review their scope and execution plan
through the existing task controls before running them. Linked tasks appear in
the conversation. Chat configuration alone does not enable execution.

## Continuity

Closing the browser does not cancel a response. Explicit Stop does. Responses
checkpoint to workspace storage at most once per second and at completion.
After a service restart, abandoned checkpoints are marked incomplete. The latest
request and saved task state are available when continuing; uncertain operations
are not automatically replayed. A crash may lose the last uncheckpointed fragment.

Long histories retain a bounded recent context and expose original saved messages
through conversation-scoped search. This is retrieval, not a guarantee that a
model will recall every earlier decision. Project memory remains opt-in and scoped.

Text, Markdown, CSV and JSON attachments can be read from stored attachment data.
No arbitrary local path or remote URL is fetched. Binary document interpretation
is not implemented by this tool. Tool rounds, argument sizes and context are bounded.

## Evidence

`pnpm test:conversation:e2e` uses a scripted model with the real governed worker,
isolated Git worktree and network-disabled Docker backend. It verifies the actual
artifact, observed execution receipt, persisted response after disconnect and
human-review state. It does not establish live-model planning quality.

Unit coverage includes disconnect survival, original-history retrieval, task
deduplication, conversation boundaries, stored text attachment restrictions and
checkpoint recovery from disk. Provider quality and unattended performance must
be evaluated separately with explicit provider configuration.

## Live development evidence — October 25, 2026

MiMo's authenticated model inventory returned `mimo-v2.6-flash` and
`mimo-v2.6-pro`; the previously selected `mimo-v2.5` was rejected. These runs
used Flash and synthetic disposable data, with no private workspace material.

- Before repair, a real tool follow-up failed with HTTP 400. Internal
  `toolCalls` / `toolCallId` fields were being sent without translation to
  `tool_calls` / `tool_call_id`. Both compatible and MiMo adapters now translate
  those fields.
- After repair, live conversation-driven execution passed in 16.724 seconds,
  using two model requests. The approved fixed task ran in a network-disabled
  Docker worktree. The actual artifact, observed receipt and saved response
  after subscriber disconnection were verified. Artifact SHA-256:
  `008cd021750ace7907b152862d866177e05d8d0f976cfe038cac8e0d8bc146e9`.
- The first memory ablation recovered 0/3 random facts both with AgentForge
  tools and with recent context alone. Requesting a history tool call did not
  improve the next development run. The implementation now prefetches up to
  three relevant omitted passages for explicit English recall requests,
  constrained to the same conversation and marked as reference data.
- With that repair, one fresh-random-fact development ablation recovered 3/3
  facts versus 0/3 for the same model with the retrieved passages removed and
  no retrieval tools. Recent context was 96,245 characters; the targets were
  absent from that context. The persisted store was reopened before answering.
  The paired run took 15.175 seconds. The three facts are not independent trials.

These results establish narrow live capabilities, not comparative product
superiority. The task was pre-approved and fixed; autonomous planning was not
evaluated. Reopening the store is not a process-crash experiment. The memory
example was used during development, not a held-out benchmark. Monetary cost
is unmeasured. Provider-reported per-request token usage is now persisted and displayed when supplied; missing usage stays unknown. Broader
held-out workloads and independently reproducible baselines are still needed.

Reproduce with `scripts/conversation-execution-e2e.ts` using
`AGENTFORGE_LIVE_EXECUTION_PROOF=1`, or `scripts/live-memory-proof.ts` using
`AGENTFORGE_LIVE_MEMORY_PROOF=1`. Both require an explicit
`AGENTFORGE_PROOF_MODEL` and private `MIMO_API_KEY`. Set
`AGENTFORGE_PROOF_OUTPUT` outside the project for the JSON result. Live runs
consume provider quota; they are never enabled by normal CI.

## Selectable project memory

Chat recall and worker context accept the shared MemoryProvider interface. The Memory screen offers Connect memory for explicit Obsidian Markdown selections. An owner or administrator selects a project and files and acknowledges that their contents may reach the configured model and task workers. No vault scanning or note writes occur. Optional encrypted saving supports explicit restore after restart; forgetting clears the saved selection without modifying notes.

Projects can keep separate selected sources active simultaneously. Disconnect or forget affects only the selected project; its task worker returns to its previously configured local memory. Up to 20 project selections can be saved encrypted and explicitly restored after restart. Hindsight Cloud read-only recall is available alongside Obsidian, using an explicit bank and API key and only facts tagged chat-context. Connection checking sends a fixed query and may use provider credits. The saved-memory list still shows local records, not a merged external browser. Composition, migration/export and live Hindsight acceptance remain unfinished. Lookup waiting is bounded to 15 seconds and supports cancellation; a provider ignoring cancellation may continue its own work. Browser acceptance is not yet demonstrated.

The public package exports MemoryProvider, ObsidianMemoryProvider and HindsightMemoryProvider for programmatic integration. This is an adapter contract, not automatic plugin installation. External adapters currently provide read-only retrieval; they do not implement source writes or deletion.

Programmatic source composition is available through `CompositeMemoryProvider(namespace, projectId, sources)`, where each source has a unique `alias` and `provider`. It implements the same chat/worker interface, bounds waiting for each source and filters project/namespace/category/tag boundaries again. Results use source-qualified IDs and retain original provider/record identity in `metadata.memorySource`. Sources are interleaved by rank because relevance scores from different engines are not comparable. Conflicting records remain separate; composition does not decide which is true. Any source failure fails the entire query rather than implying partial results are complete. Writes and direct lookup are deliberately unsupported. Guided setup supports the Obsidian + Hindsight pair; arbitrary source-set configuration and full retrieval behavioral acceptance remain pending.

The setup dialog now also offers Obsidian + Hindsight together. Supply both the selected local files and remote bank connection, then acknowledge sharing. Validation must succeed for both before the project source changes. Optional encrypted saving stores both configurations for explicit restore. The existing synthetic setup check covers combined activation, encrypted saving, disconnect and explicit restore. Combined retrieval quality, process-restart restore and browser acceptance remain pending.
