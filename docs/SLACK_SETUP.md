# Slack setup

AgentForge connects to Slack directly through Socket Mode. It does not require
OpenClaw, Hermes, a public webhook endpoint, or a separate relay.

## Create the app

1. Open [Slack API: Your Apps](https://api.slack.com/apps) and create an app
   from scratch in a disposable workspace.
2. Under **Socket Mode**, enable Socket Mode and create an app-level token with
   the `connections:write` scope.
3. Under **OAuth & Permissions**, add only the bot scopes that AgentForge
   needs: `channels:history`, `channels:read`, `chat:write`, `groups:history`,
   `groups:read`, `im:history`, and `im:read`. Add more scopes only for a
   documented workflow.
4. Under **Event Subscriptions**, enable events and subscribe to the message
   events required by the channels you intend to mirror. Socket Mode delivers
   those events directly to AgentForge.
5. Install the app to the disposable workspace and copy the bot token.

## Give AgentForge private runtime tokens

Keep one token per private file outside the repository:

```text
AGENTFORGE_SLACK_APP_TOKEN_FILE=C:\path\outside\the\repo\slack-app-token
AGENTFORGE_SLACK_BOT_TOKEN_FILE=C:\path\outside\the\repo\slack-bot-token
```

Each file contains only its token. Direct environment variables are supported
for local development, but token files are preferred for a deployed runtime.

## Verify the connection

Start AgentForge, then open `/api/setup-guide/channel-runtime`. Slack reports
`ready` only after both tokens are configured, the WebSocket connects, and
Slack sends its Socket Mode `hello` handshake. Post a
message in the disposable workspace, confirm it reaches AgentForge's canonical
event stream once, then verify one approved outbound reply. Stop the runtime
and confirm Socket Mode closes cleanly.

No workspace token, bot token, message body, or channel identity is stored in
the public package or in AgentForge's workspace snapshot.
