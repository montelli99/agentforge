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
