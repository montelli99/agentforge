# Native AgentForge Gateway

AgentForge owns the channel runtime. OpenClaw and Hermes are optional bridges
for migration or existing deployments; they are not required to run the
AgentForge gateway.

Telegram uses an AgentForge-owned transport. The normal setup uses the official
BotFather Bot API transport; an authorized MTProto session is available for
advanced user-account capabilities. Both paths own their lifecycle,
normalization, routing, and outbound delivery directly in AgentForge and do not
require an OpenClaw or Hermes process.

For the normal public setup flow, users may instead provide a BotFather token
as `AGENTFORGE_TELEGRAM_BOT_TOKEN`. AgentForge starts its official Bot API
polling transport automatically when no MTProto session is configured. This is
the recommended low-friction setup; MTProto remains an advanced option for
user-account history and capabilities.

Set `AGENTFORGE_TELEGRAM_API_ID`, `AGENTFORGE_TELEGRAM_API_HASH`, and
`AGENTFORGE_TELEGRAM_SESSION` in the deployment environment. The session must
already be authorized; interactive login and session issuance belong in the
deployment setup flow and are never persisted in workspace state.

For a migration from an existing deployment, set
`AGENTFORGE_TELEGRAM_CREDENTIAL_FILE` to an operator-provided session file.
AgentForge reads that file only at startup and never copies or exposes its
values. A bot token is not a substitute for an authorized MTProto user session.

## Runtime contract

The native gateway is exposed through `NativeAgentForgeGateway` and the control
plane routes:

- `GET /api/gateway/status`
- `POST /api/gateway/start`
- `POST /api/gateway/stop`

The setup guide's `GET /api/setup-guide/channel-runtime` response includes
secret-safe status for both `telegramBotApi` and `nativeTelegramSession`; it
never returns a token, API hash, or session string.

The gateway starts provider adapters through the shared runtime registry,
normalizes inbound events into the canonical workspace, and sends outbound
messages through the provider-neutral channel contract. A runtime being
started does not claim that an external provider is authenticated; each
adapter must report live readiness independently.

## Hierarchy and mirroring

Workspaces contain spaces, spaces may contain child spaces for departments or
subgroups, and channels belong to spaces. Child spaces are created with
`parentSpaceId` and can be queried with `GET /api/spaces?...&parentSpaceId=`.
Provider bindings remain attached to canonical channels so Telegram topics,
Discord channels, Slack threads, and the native web surface can mirror the same
workspace state.

## Compatibility bridges

The OpenClaw gateway transport is an optional migration bridge. It uses the
existing authenticated gateway and does not start a second Telegram consumer.
It is configured at runtime with `AGENTFORGE_GATEWAY_URL` and optional gateway
authentication. The AgentForge-owned BotFather transport remains the normal
public path; MTProto remains an advanced option.

Discord can start its standalone Gateway v10 transport with the runtime-only
`AGENTFORGE_DISCORD_BOT_TOKEN` and optional
`AGENTFORGE_DISCORD_GATEWAY_URL`. The token is never persisted in workspace
state or included in the public manifest.

Slack can start its AgentForge-owned Socket Mode transport with the runtime-only
`AGENTFORGE_SLACK_APP_TOKEN` and `AGENTFORGE_SLACK_BOT_TOKEN`. Socket Mode
envelopes are acknowledged by AgentForge, normalized into the canonical event
stream, and outbound messages use Slack's `chat.postMessage` endpoint. Tokens
are never persisted in workspace state or included in the public manifest.

## Release evidence

Native gateway lifecycle, subgroup hierarchy, product isolation, public package
surface, Docker acceptance, typechecking, and the full automated suite are
covered by the repository verification commands. Live provider acceptance must
be run only with an operator-authorized provider session.

