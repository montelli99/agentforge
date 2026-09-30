# Live provider acceptance

This runbook is intentionally separate from the public test suite. The suite
proves provider contracts and safety boundaries with fixtures; this procedure
proves an operator-authorized external session without placing credentials in
the repository or workspace snapshot.

Before starting a live run, use `pnpm test:provider:preflight`. It is read-only:
it reports whether private runtime variables or token-file paths are present,
without printing their values or contacting a provider. A passing preflight is
configuration evidence only; it never marks a provider live.

## Telegram

Choose one ownership path for the test run:

1. **BotFather Bot API path (normal setup)**: set
   `AGENTFORGE_TELEGRAM_BOT_TOKEN` or point
   `AGENTFORGE_TELEGRAM_BOT_TOKEN_FILE` at a private external token file. AgentForge
   owns the long-polling transport and never writes the token to workspace state.
2. **Native MTProto user-session path (advanced setup)**: set
   `AGENTFORGE_TELEGRAM_API_ID`, `AGENTFORGE_TELEGRAM_API_HASH`, and an
   already-authorized `AGENTFORGE_TELEGRAM_SESSION` only in the process
   environment. This path is useful when a user-session is required and does
   not use a Bot API token.
3. **Existing gateway relay**: set `AGENTFORGE_GATEWAY_URL` and the runtime
   gateway authentication/identity variables. This is an optional migration
   bridge; do not start a competing consumer for the same session.

Start AgentForge on loopback, then verify:

- `GET /api/gateway/status` reports the selected channel and its readiness.
- A provider message reaches the canonical event stream exactly once.
- An approved outbound message reaches the bound topic/channel.
- Shutdown returns the provider to `stopped` and does not replay the message.

## Discord

Follow the public [Discord setup guide](DISCORD_SETUP.md) to create the bot,
enable only the required intent, and invite it to an isolated test server.

Set `AGENTFORGE_DISCORD_BOT_TOKEN` or `AGENTFORGE_DISCORD_BOT_TOKEN_FILE` only
in private runtime configuration. The
optional `AGENTFORGE_DISCORD_GATEWAY_URL` is restricted to `wss://` unless it
points to loopback. Verify a Gateway v10 interaction reaches the canonical
event stream, then stop the process and confirm the socket closes cleanly.

## Slack

Follow the public [Slack setup guide](SLACK_SETUP.md) to create a disposable
app and grant the smallest set of scopes required for the intended workflow.

Set `AGENTFORGE_SLACK_APP_TOKEN` / `_FILE` and `AGENTFORGE_SLACK_BOT_TOKEN` /
`_FILE` only in private runtime configuration. AgentForge opens Slack Socket Mode itself, acknowledges
each envelope, normalizes message events into the canonical event stream, and
uses `chat.postMessage` for approved outbound messages. Verify one inbound
message and one outbound message in a disposable Slack sandbox, then stop the
process and confirm the WebSocket closes cleanly. Do not record either token.

## Evidence and release gate

Record the command output, provider readiness snapshot, inbound event ID,
outbound provider message ID, and shutdown result in an evidence file inside
the task workspace. Do not record raw tokens, message bodies containing
personal data, or private account identifiers. A provider may be marked `live`
only when these observations pass; configuration alone is not evidence.

### Telegram controlled acceptance, 2026-09-30

The existing owner-authorized BotFather credential was passed to a disposable
AgentForge data directory through the process environment. The competing
poller was stopped for the handoff. AgentForge's native gateway reported
Telegram `ready` and `live`, with no webhook conflict. In a private test chat,
the owner linked an AgentForge owner identity and received a direct reply;
`/status` returned the disposable workspace's agent, task, and approval counts.
The persisted event audit recorded one accepted link and one status command.
No private chat ID, credential, account identifier, or message payload is in
this public record.

The AgentForge test process was stopped. The original scheduled gateway was
restarted, and its channel probe confirmed the Telegram bot was running in
polling mode and working. This proves the bounded private-chat link/status
round trip and rollback. It does not prove natural conversation, agent
execution, group-topic mirroring, Slack, or Discord acceptance.

The linked private-chat text path now supports a configured, read-only chat
model with bounded per-chat context. Focused tests verify isolation between
chat IDs and exclude unlinked and group messages from model calls. The live
acceptance above preceded that change; a natural-language model reply has
not yet been observed through the real Telegram bot. The route requires an
explicit chat-model configuration described in `CHAT_SETUP.md`.

### Private conversational reply, 2026-09-30

A second controlled cutover used the same owner-authorized BotFather bot and
the isolated AgentForge workspace with the explicitly configured MiMo 2.5 Pro
chat route. The owner sent one ordinary text message in the linked private
chat. AgentForge recorded the inbound message and a successful outgoing
Telegram message ID; the owner confirmed receipt of the model reply. The
elapsed time from inbound message audit to outgoing reply audit was about
47 seconds. No model-output content or private chat identifier is included
here. AgentForge was stopped and the original OpenClaw scheduled gateway was
restarted; its local listener and task state were verified. This proves one
read-only private text round trip, not an agent tool action or acceptable
steady-state latency. A later code change records per-reply round-trip
milliseconds and reduces the default output allowance; its latency effect
has not been measured live.

The local answer path for a small set of workspace questions was added after
the live test. It has focused test coverage but no measured live latency yet.
It does not accelerate arbitrary model-backed questions or grant chat tools.

### Follow-up cutover without inbound acceptance, 2026-09-30

A later controlled cutover connected the native AgentForge Telegram transport to
an isolated workspace. The gateway reported `ready` and `live`; no inbound
owner message arrived while AgentForge held the bot connection. The transport
was stopped and the original OpenClaw scheduled gateway was restored. Its
local health endpoint returned HTTP 200. This attempt does not verify the
new product-knowledge or fast-answer paths end to end.

The owner sent a product question after OpenClaw had resumed the bot connection.
The resulting model/billing error was emitted by OpenClaw, not AgentForge, and
must not be counted as an AgentForge acceptance result. A future native chat
check requires a coordinated short test window and an inbound event observed
by AgentForge before the other gateway is restored.

### Native task-control cutover, 2026-09-30

An isolated AgentForge process held the owner-authorized Telegram bot connection.
The native gateway reported Telegram `ready` and `live`. At 10:23:58 ET, the
owner's private message asking what needed approval was persisted as an inbound
event. The audit then recorded the approvals command and a Telegram-accepted
outbound message ID. This proves the private task-control route sent a reply;
the reply's appearance on the owner's phone was not independently confirmed.

At 10:24:12 ET, an identical message in a group topic was persisted as inbound,
but no command dispatch or outbound reply was recorded for that topic. Group-topic
command parity remains unverified. The running build preceded the durable
command-reply storage fix, so its reply appears in the audit rather than the
canonical message history. That fix is now compiled for a subsequent run.

The native process was subsequently no longer listening. The OpenClaw scheduled
gateway was observed running again, with its listener active and local health
endpoint returning HTTP 200. The precise cause of its restart was not verified.
Do not infer a clean exclusive handoff beyond the first private and group events,
or count this as full Telegram acceptance.
