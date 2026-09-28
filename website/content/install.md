# Install AgentForge

## Before you begin

Use a computer where you can install Node.js 22 or newer, Git and pnpm. The repository pins pnpm 10.30.1. You need internet access to download dependencies. Docker is optional; you do not need a Telegram account or a paid model just to open the workspace.

The currently documented delivery method is a source checkout. Check the GitHub Releases page for any published artifacts before assuming a desktop installer exists. The website is a static product site; installing AgentForge starts a separate application on your computer.

## Windows PowerShell

Install Node.js and Git using their official installers, then reopen PowerShell. Check that both commands are available:

```powershell
node --version
git --version
```

Install the repository's package manager, download the public source and build the application:

```powershell
npm install --global pnpm@10.30.1
git clone --branch vnext https://github.com/montelli99/agentforge.git
cd agentforge
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Keep this terminal running. Open http://127.0.0.1:3460 in your browser. A successful start serves the local workspace. If the command fails, read the first error before repeating the installation. An empty workspace is expected.

## macOS and Linux

Install Node.js 22+ and Git using your preferred supported package manager or official installer. Confirm the versions, then run:

```bash
node --version
git --version
npm install --global pnpm@10.30.1
git clone --branch vnext https://github.com/montelli99/agentforge.git
cd agentforge
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

If npm reports a permissions error for global packages, use a user-owned Node installation. Do not change ownership of unrelated system directories to make this command work. The source workflow is shared across platforms; platform-specific live-provider checks still need verification on your installation.

## Open your first workspace

Visit http://127.0.0.1:3460 on the computer running AgentForge. On a different computer, localhost points to that other computer. Remote access needs a deliberate deployment configuration; it does not happen automatically.

The Setup Guide can organize an outcome into local records before a model is connected. Try: “Help me prepare a documentation review with an author and a reviewer.” Inspect the resulting project, setup conversation and reviewable goal. It has not executed the work yet.

## Make the first conversation work

Follow the [model connection guide](CHAT_SETUP.md) to set a dedicated credential, endpoint and allowed model list. Restart AgentForge after changing runtime settings. Select the model in the composer and send a simple text request, such as “Draft three acceptance criteria for this documentation review.”

Success means the selected provider returns a response, the response remains after reloading the page, and a follow-up continues in the same conversation. Saving text locally is useful, but is different from generating a model response. The current generation route does not analyze attachments.

## Add a messaging channel

Start with one provider and a disposable test conversation. Telegram uses a BotFather bot token. Discord uses a Developer Portal bot. Slack uses an app with Socket Mode. Your credentials stay in your runtime; they are not part of this public template.

A connection status does not verify every message path. Check an inbound message, the correct canonical channel and an authorized outbound reply. Do not run two pollers on the same Telegram bot. The guide library contains the complete provider instructions on this website.

## Change the port or data location

For PowerShell, set variables in the terminal that starts AgentForge:

```powershell
$env:AGENTFORGE_PORT = '3466'
$env:AGENTFORGE_DISABLE_SECONDARY = '1'
$env:AGENTFORGE_DATA_DIR = Join-Path $env:LOCALAPPDATA 'agentforge-test'
pnpm start
```

For bash or zsh:

```bash
export AGENTFORGE_PORT=3466
export AGENTFORGE_DISABLE_SECONDARY=1
export AGENTFORGE_DATA_DIR="$HOME/.local/share/agentforge-test"
pnpm start
```

Open port 3466 for that instance. These environment settings apply to the current terminal and its child process. They are not a background-service installation. Keep separate instances in separate data directories.

## Add execution only when you need it

Opening the workspace and connecting a model do not enable command execution. The optional approved Docker path needs a running Docker daemon, an explicit repository, a reviewed plan and a ready backend. Approval and Run task are separate actions. Start with a disposable repository and an output you can inspect.

## Common installation problems

- **pnpm is not recognized:** reopen the terminal after installing it and check your Node package-manager path.
- **Build fails:** confirm Node 22+, use the pinned package manager and retain the lockfile. Capture the first build error rather than deleting dependencies at random.
- **Address already in use:** choose another port and disable the secondary listener as shown above.
- **The page opens but nothing answers:** configure the model route and select a model. The local workspace does not include a paid model account.
- **The agent cannot run a task:** check execution readiness. Text generation and task execution have separate requirements.
- **Your phone cannot open localhost:** the application is running on your computer, not on your phone. Follow the operations guide before exposing it remotely.

## Your next step

Read the setup guide for your first project, then the model and channel guides. Use the operations guide for authentication, backups and upgrades. Keep the initial task small enough that you can personally verify the result.
