## Start it from your terminal

The token file must already exist and contain only your bot token. In PowerShell, run this from your built AgentForge checkout:

```powershell
$env:AGENTFORGE_DISCORD_BOT_TOKEN_FILE = 'C:\private\discord-token.txt'
pnpm start
```

In bash or zsh:

```bash
export AGENTFORGE_DISCORD_BOT_TOKEN_FILE="$HOME/.config/agentforge/discord-token.txt"
pnpm start
```

Environment variables belong to the process that starts the server. Restart an existing instance after updating configuration. For a service, supply the variable in the service environment. Do not put the credential in a public configuration example.

## Understand connection versus routing

A Gateway handshake establishes the transport. It does not establish which AgentForge channel receives a server message, which user may issue commands, or what the agent should do with the text. Validate the binding and authority for the specific server channel before using real work.

AgentForge's nested department structure is its own model. Discord categories, channels and threads have different constraints. Do not assume adding a subgroup in AgentForge automatically creates every corresponding object in Discord.

## First message checklist

1. Use a test channel the bot can view and write to.
2. Send a unique harmless message from the intended user.
3. Confirm one matching inbound record in the intended canonical channel.
4. Trigger an authorized outbound test and confirm the destination.
5. Check that an unapproved user cannot perform a privileged action.

## Common failures

- **Bot is offline:** verify the runtime received the token and inspect the Gateway connection status.
- **Bot is online but misses ordinary text:** inspect Message Content Intent and channel permissions.
- **Messages reach the wrong workspace channel:** inspect the channel binding rather than changing the bot token.
- **Responses are duplicated:** check for multiple running instances or duplicate routing paths.
- **Token was exposed:** reset it in the Developer Portal, replace the private file and restart your deployment.

Keep a redacted record of the failing step, version and relevant status when reporting an issue. Never attach token files or an unreviewed workspace snapshot.
