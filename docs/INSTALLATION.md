# Install and connect AgentForge

This is the operator guide for a clean, public AgentForge installation. It
does not require OpenClaw, Hermes, a CRM, or any private account. AgentForge
owns its local workspace and its channel transports.

## 1. Install the control plane

Requirements: Node.js 22 or newer, Git, and pnpm 10 or newer.

```bash
git clone https://github.com/montelli99/agentforge.git
cd agentforge
corepack enable
pnpm install --frozen-lockfile
pnpm vnext
```

Open `http://127.0.0.1:3460`. The first run starts with an empty local
workspace. Run `pnpm test` and `pnpm typecheck` before connecting providers.

### Choose an installation method

- **Source checkout (recommended for contributors):** clone the repository and
  use the commands above.
- **Package distribution:** the public package surface is audited in the
  repository, but a stable npm release and signed desktop installers are not
  claimed until they are published and independently verified.
- **Desktop installers:** none are claimed yet. Until one is published from
  the project release process, use the source checkout or a self-hosted server.

This distinction keeps an installation instruction from implying that an
unreleased installer or hosted service already exists.

## 2. Connect Telegram with BotFather

This is the recommended setup for a Telegram bot. It uses AgentForge's
official Bot API transport directly; OpenClaw and Hermes are not required.

1. In Telegram, open **@BotFather** and send `/newbot`.
2. Choose a display name and a username ending in `bot`.
3. Copy the token BotFather returns. Treat it like a password and never put it
   in Git, screenshots, issue reports, or a public `.env` file.
4. Provide it to the private runtime as either an environment variable or a
   file outside the repository:

```bash
AGENTFORGE_TELEGRAM_BOT_TOKEN=123456789:replace-with-your-token
```

or:

```bash
AGENTFORGE_TELEGRAM_BOT_TOKEN_FILE=/private/path/telegram-token.txt
```

Restart AgentForge after setting the secret. Check **Connections** in the web
control plane or query:

```bash
curl http://127.0.0.1:3460/api/gateway/status
```

Telegram is ready when its channel reports `state: ready` and readiness
`status: live`. Send one test message to the bot, confirm it appears in the
canonical workspace, and approve an outbound test from the control plane.

## 3. Optional advanced Telegram user session

BotFather is sufficient for normal bot operation. User-account capabilities
require an already-authorized MTProto session plus `AGENTFORGE_TELEGRAM_API_ID`,
`AGENTFORGE_TELEGRAM_API_HASH`, and `AGENTFORGE_TELEGRAM_SESSION` supplied only
through private runtime configuration. AgentForge never writes these values to
workspace records.

## 4. Connect other channels

- **Discord:** create a bot in the Discord Developer Portal, enable the message
  intents it needs, invite it to a server, then set
  `AGENTFORGE_DISCORD_BOT_TOKEN` or `AGENTFORGE_DISCORD_BOT_TOKEN_FILE`. See
  [Discord setup](DISCORD_SETUP.md).
- **Slack:** create a Slack app, enable Socket Mode, create an app-level token
  and bot token, then set the two private runtime variables. See
  [Slack setup](SLACK_SETUP.md).

Each channel is optional and independently authorized. A missing Discord or
Slack credential does not prevent the local workspace or Telegram from running.

## 5. Enable reviewed execution (optional)

Docker execution is off by default. To enable it, configure an absolute
repository path with `AGENTFORGE_EXECUTION_REPO`, set
`AGENTFORGE_EXECUTION_MODE=approved-docker`, and require a human-approved plan
for each run. See [local operations](LOCAL_OPERATIONS.md).

## Security and troubleshooting

Keep credentials outside the repository and rotate a token immediately if it
was exposed. AgentForge reports configuration metadata only; it never returns
raw secrets from its setup or status endpoints. If Telegram reports an existing
webhook, remove that webhook or switch to the webhook-aware deployment path
before starting polling. Full provider acceptance steps are in
[live provider acceptance](LIVE_PROVIDER_ACCEPTANCE.md).

## First five minutes after launch

1. Open the setup guide and create a local owner profile when strict local
   authentication is enabled.
2. Create a workspace and a first team or subgroup.
3. Add a goal and inspect the generated plan before running anything.
4. Connect one model provider and one channel, starting with Telegram if you
   want the smallest setup.
5. Send a harmless test message, confirm the event in the activity timeline,
   and review the evidence before enabling execution.
