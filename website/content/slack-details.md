## Start AgentForge with both token files

The app-level token opens Socket Mode; the bot token authorizes bot operations. They are different credentials and cannot be swapped. Each private file contains only its token.

PowerShell:

```powershell
$env:AGENTFORGE_SLACK_APP_TOKEN_FILE = 'C:\private\slack-app-token.txt'
$env:AGENTFORGE_SLACK_BOT_TOKEN_FILE = 'C:\private\slack-bot-token.txt'
pnpm start
```

Bash or zsh:

```bash
export AGENTFORGE_SLACK_APP_TOKEN_FILE="$HOME/.config/agentforge/slack-app-token.txt"
export AGENTFORGE_SLACK_BOT_TOKEN_FILE="$HOME/.config/agentforge/slack-bot-token.txt"
pnpm start
```

These commands assume you have built the application and created the private files. Restart the process after configuration changes. Keep secret files out of the checkout and any shared archive.

## Select the conversations you want

Subscribe to the message event types for the conversations your app should receive, such as public channels, private channels or direct messages. Match event subscriptions to granted scopes. Invite the app to the test channel, then verify its membership and canonical routing.

Changing scopes may require reinstalling the Slack app into the workspace. Review the permission change before doing so. A successful Socket Mode hello confirms the socket; it does not prove access to every channel.

## Verify a thread round trip

Send a unique harmless message in a test channel. Check that the canonical workspace receives it once. Verify an authorized response returns to the intended channel and, when applicable, the correct thread. Repeat with a thread reply so a main-channel success does not hide a thread-routing problem.

## Diagnose a missing reply

- **No Socket Mode hello:** check the app-level token and connections:write scope.
- **Connected but no events:** check subscriptions, installation and channel membership.
- **Events arrive but sending fails:** check the bot token, chat:write scope and destination access.
- **Wrong thread:** check the external binding and thread identifier retained by the workflow.
- **Duplicate events:** inspect event handling and running instances before retrying a write.

The local workspace remains available while Slack is unconfigured. Start with one provider and one verified conversation before adding more channels.
