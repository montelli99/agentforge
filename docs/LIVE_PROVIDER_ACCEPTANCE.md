# Live provider acceptance

This runbook is intentionally separate from the public test suite. The suite
proves provider contracts and safety boundaries with fixtures; this procedure
proves an operator-authorized external session without placing credentials in
the repository or workspace snapshot.

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
