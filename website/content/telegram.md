# Connect Telegram

## What you need

A Telegram account, a bot you control and a running local AgentForge installation. The normal connection uses a token issued by BotFather. It does not require a my.telegram.org developer application, API ID or API hash. BotFather is Telegram's setup tool; Discord has its own separate setup process.

AgentForge talks directly to Telegram through the Bot API. OpenClaw and Hermes are not runtime dependencies. Each person installing this template supplies their own credentials.

## Create a bot

1. Open the verified @BotFather account in Telegram.
2. Send /newbot and follow the prompts for a display name and unique username ending in bot.
3. Save the returned token in a private file outside the repository. The file should contain only the token.
4. Restrict access to that file to your operating-system account. Do not upload it with logs, screenshots or support reports.

If you already have a bot, determine which application owns it before reusing its token. Two getUpdates consumers can interrupt each other. For initial testing, a separate bot is the simplest way to keep an existing service running.

## Configure Windows

Create a private token file, then point AgentForge at its location. Replace the example path with your real file path; do not put the token in the command itself.

```powershell
$env:AGENTFORGE_TELEGRAM_BOT_TOKEN_FILE = 'C:\private\telegram-token.txt'
pnpm start
```

Run this in the built AgentForge checkout. If AgentForge is already running, stop that instance cleanly and restart it from this terminal. Environment changes do not modify an existing process.

## Configure macOS or Linux

Keep a token file accessible only to the account running AgentForge:

```bash
chmod 600 "$HOME/.config/agentforge/telegram-token.txt"
export AGENTFORGE_TELEGRAM_BOT_TOKEN_FILE="$HOME/.config/agentforge/telegram-token.txt"
pnpm start
```

Create the file and parent directory before running these commands. For a supervised service, configure the variable in that service's private environment; exporting it in an unrelated terminal will not change the service.

## Check the transport

Open http://127.0.0.1:3460/api/gateway/status in your local browser. Inspect the Telegram entry. The setup status at /api/setup-guide/channel-runtime reports whether the credential is configured without showing its value.

Treat transport readiness as a preliminary signal. It does not prove a message reached the intended workspace or that a user is authorized. Check a complete inbound and outbound path separately. Leave other channels unconfigured if you do not need them.

## Link a user and route a conversation

The application includes a one-time Telegram link-code flow. Create the code through the local workspace's Telegram controls and send /link followed by the code in a private bot conversation. Use it before its displayed expiration. Linking identifies a user; it does not automatically authorize every remote command.

Channel bindings are also required for correct routing. A group topic must map to the intended canonical channel. The adapter provides topic binding, but the public build does not establish that every binding can be configured automatically through a completed UI flow. Validate your deployment's binding path before relying on group mirroring. If that path is missing, the transport being connected is not completion of setup.

## Groups, topics and privacy

Add the bot to a disposable group first. For topic-based organization, use a Telegram group with topics enabled. Give it only the permissions needed by the workflow. Privacy mode affects which group messages Telegram delivers; choose it deliberately through BotFather rather than granting broad permissions to troubleshoot blindly.

AgentForge's nested spaces represent departments in its own workspace. Telegram's group and topic structure is different. Map the intended channels explicitly; do not expect unlimited nested groups to be created in Telegram.

## Verify before using real conversations

1. Send a distinct harmless test message in the intended conversation.
2. Confirm the message reaches the correct canonical channel once.
3. Verify the linked user's allowed action and reject an unauthorized action.
4. Send an authorized test reply and confirm it appears in the same topic.
5. Restart the test deployment and check routing again before introducing real traffic.

Keep failures visible. A missing message, wrong topic or duplicate reply means the workflow still needs repair, even when the gateway is green.

## Troubleshoot without breaking another bot

- **Invalid token:** check the private file contains just the issued token. If exposed, revoke and replace it using BotFather.
- **Existing webhook:** identify its owner before changing it. AgentForge's polling path refuses a registered webhook; removing another application's webhook will interrupt that application.
- **Conflicting poller:** stop the other authorized consumer or use a separate bot. Do not keep restarting both consumers.
- **Private chat works, group does not:** inspect membership, privacy mode, topic binding and permissions.
- **Connected but no reply:** inspect user linking, canonical binding and the configured response workflow. Transport alone is not an autonomous conversational agent.

## Advanced account sessions

MTProto user sessions are a separate advanced path. They need an already-authorized session and developer credentials. They are unnecessary for the BotFather flow above. Keep them private and do not configure them accidentally while testing bot mode, because the launcher prefers an explicitly configured user session.
