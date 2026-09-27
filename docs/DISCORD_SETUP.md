# Discord setup

AgentForge connects to Discord directly through the official Discord Gateway. OpenClaw and Hermes are optional bridges; neither is required at runtime.

## Create the bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create an application.
2. Open **Bot**, create the bot, and copy its token. Treat the token like a password and never commit it or paste it into a public issue.
3. Under **Privileged Gateway Intents**, enable **Message Content Intent**. Enable Presence or Server Members only if a workflow explicitly needs them.
4. Under **OAuth2 → URL Generator**, select `bot` and `applications.commands`. Grant only the permissions the bot needs: View Channels, Read Message History, Send Messages, and Use Application Commands. Do not grant Administrator.
5. Open the generated URL and invite the bot to a test server.

## Give AgentForge the token

Use a private file so the secret stays outside the repository:

```text
AGENTFORGE_DISCORD_BOT_TOKEN_FILE=C:\path\outside\the\repo\discord-bot-token
```

Put only the token in that file. A direct environment variable is also supported for local development:

```text
AGENTFORGE_DISCORD_BOT_TOKEN=your-token
```

The file-based setting is preferred for production. AgentForge reads the token at startup, owns the Gateway session, reconnects and resumes after interruptions, and exposes secret-safe readiness details. It does not require an OpenClaw gateway, a user-account session, or a separate API relay.

## Verify the connection

Start AgentForge and open `/api/setup-guide/channel-runtime`. Discord should report `ready` only after the Gateway hello, AgentForge's identify or resume, and Discord's `READY` or `RESUMED` confirmation. Send a test message in the invited server and confirm it appears in the AgentForge event stream. Keep the test server isolated until permissions and routing are verified.

If no token is configured, Discord remains `not_configured`; this is an intentional optional setup state and does not prevent Telegram or the rest of AgentForge from running.

## Channel structure

AgentForge can mirror a workspace into departments and nested subgroups. Each mirrored channel keeps its parent path and routing metadata, so a business can organize teams without flattening everything into one chat.
