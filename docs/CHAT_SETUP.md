# Conversation model setup

AgentForge saves conversations locally without a model. Chat generation is an optional, explicitly configured route. It does not grant task execution, repository access, tools, or external channel access.

## First-run Setup Guide

On a clean installation, a person can describe the outcome they want instead of creating a project, channel, agent, and plan by hand. AgentForge then creates one private local project, a General workspace channel, a durable **Workspace setup** conversation, an initial reviewable goal, and a built-in **Setup Guide** agent.

The Setup Guide is deliberately useful before a model is connected: it keeps the initial workspace organized, reports the execution gates still missing, and keeps a durable setup conversation. It does not pretend to be a connected model or claim that it has run a task. Once a chat route is configured below, the conversation can use that explicitly selected model for natural planning assistance.

The initial plan preserves the stated outcome verbatim for traceability. When an outcome contains several complete sentences, it also exposes those sentences as separately reviewable deliverables, each with acceptance, verification, risk, and rollback guidance. This is deterministic planning support; a connected model may later improve the plan, but the application does not present that refinement as already completed.

The guide never imports external credentials, connects an account, grants a tool, or starts execution by itself. Those choices stay visible and reviewable: model planning, isolated execution, verification, and evidence collection must each be configured before task execution is available.

## Configure a route

Supply these environment variables to the AgentForge server process through your deployment's secret-management system:

- `AGENTFORGE_CHAT_API_KEY`: the credential for the chosen endpoint. Never commit it or store it in workspace settings.
- `AGENTFORGE_CHAT_MODELS`: comma-separated model identifiers supported by that endpoint. Only these models appear in the composer.
- `AGENTFORGE_CHAT_BASE_URL`: optional OpenAI-compatible API base URL; defaults to `https://api.openai.com/v1`. Remote endpoints require HTTPS; localhost HTTP is supported for local gateways.

Both a dedicated credential and model list are required. AgentForge never adopts `OPENAI_API_KEY` or another application's stored credentials for this chat route. Restart the server after configuration. Select a model in the conversation composer before sending; “Save locally” does not request a response.

For an explicitly selected MiMo route, set `AGENTFORGE_CHAT_PROVIDER=mimo`,
`AGENTFORGE_CHAT_MODELS=mimo-v2.5-pro` (or another supported MiMo model), and
provide `MIMO_API_KEY` privately to the AgentForge process. This option uses
AgentForge's native MiMo adapter and does not require a second chat key. Leave
`AGENTFORGE_CHAT_PROVIDER` unset for the OpenAI-compatible route above.

For private Telegram chat, allow both `mimo-v2.5,mimo-v2.5-pro` to make the
regular model the default conversational route. Set
`AGENTFORGE_TELEGRAM_CHAT_MODEL=mimo-v2.5-pro` only if that model is in the
allowed list and you deliberately want it for private chat. This default is
based on a small latency diagnostic, not a measured quality comparison.

Linked Telegram identities can receive read-only text replies in a private
chat when a conversation model is configured. This uses a bounded context per
private chat, kept in process memory and cleared on restart. Group messages,
unlinked identities, attachments and tool execution are outside this route.
Telegram `/status` and other remote-control commands use their separate
authorized command path.

Common private-chat questions about workspace status, tasks, pending approvals,
and AgentForge's capabilities use immediate local answers without a model call.
Other open-ended questions still use the selected model, and their latency is
subject to that provider. The channel audit records model time and total reply
time without storing the reply text in the audit entry.

The configured provider receives that conversation's text and its project's instructions when generation is requested. Attachment contents are not supported by this route; conversations containing attachments are rejected rather than pretending to inspect them. Review the endpoint and its data-handling policy before sending private content.

## Behavior

- Responses stream into the conversation. Stop aborts the upstream request.
- The composer has a persistent send-key toggle: Enter sends by default; switch to Ctrl/Command+Enter when you prefer Enter for new lines. Shift+Enter inserts a line break in either mode.
- Complete and partial replies persist with model, provider, originating prompt, and completion status.
- One response may run per conversation. Sending, editing, and archiving are blocked while it runs.
- Browser disconnection aborts the request. Partial text, if any, is saved and marked stopped.
- Project instructions are included. No other project's conversation or file contents are automatically read.
- Context exceeding120,000 characters is rejected rather than silently truncated. Responses are bounded at100,000 characters and120 seconds.
- Provider errors are shown without raw provider payloads or credentials. No synthetic success is generated.
- In authenticated deployments, generation requires `tasks:execute` permission. This does not replace the application's broader access-control review.

## Repeatable verification

Build with `pnpm build`, then run `node scripts/chat-stream-acceptance.mjs`.

This starts an isolated local HTTP fixture and exercises the actual OpenAI-compatible provider and AgentForge routes: streamed deltas, project context, duplicate-run rejection, edit/archive guards, cancellation, provider failure, and persistence. It uses no paid account or real model. Run with `--preview` only for explicit UI testing; its model is visibly named `fixture-stream`, and its output says “Fixture response.” Stop the process afterward.

The local fixture verifies protocol behavior, not model quality, live account availability, billing, or multimodal support. A configured-provider acceptance test is still required before declaring a deployment ready.

Protocol reference: [OpenAI streaming documentation](https://developers.openai.com/api/docs/guides/streaming-responses).

## Recovering and comparing responses

Stop response preserves received text with an explicit partial status. Use Retry
response on a partial reply, or Try another response on a completed reply, to
choose a configured model and generate in a new conversation branch. The original
history is retained. When a provider fails before returning text, the saved user
message remains available through Respond to last message. These controls use the
configured text-only chat provider; they do not provide agent tools or attachment
analysis.

## Optional project memory

Set AGENTFORGE_CHAT_MEMORY_NAMESPACE to one deliberate memory collection to
opt in. Only active records matching the current project and tagged chat-context
are supplied to the configured chat provider. Unscoped, archived, untagged and
other-project records are excluded. Leave the variable unset to disable it.
This opt-in shares the selected record text with the configured model provider.

Up to eight recently updated records, each bounded to4000characters, are supplied
as reference data. Responses retain record IDs, titles and versions, shown in
Project memory supplied. This is context provenance, not proof that a response
correctly applied every record. No automatic memory creation occurs.
