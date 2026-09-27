# OpenClaw Telegram handoff

AgentForge owns the Telegram connection. OpenClaw is only an optional migration
bridge. The supported public setup is:

1. AgentForge connects directly with a BotFather token for normal bot use, or
   an authorized MTProto user session for advanced user-account capabilities.
2. AgentForge owns the selected transport lifecycle, event normalization, and
   outbound delivery.
3. OpenClaw/Hermes may be attached through the gateway relay during migration,
   but they are not required infrastructure.
4. No session string or token is stored in this repository, logs, fixtures, or
   documentation.

## Optional OpenClaw migration behavior

An existing OpenClaw gateway may remain the owner during migration. AgentForge
does not inspect, copy, or reuse provider credentials held by that gateway,
and it never starts a competing poller. This relay is optional and is not the
native AgentForge connection.

## AgentForge transport boundary

The production integrations are `TelegramBotApiTransport` for the normal
BotFather path and `TeleprotoTelegramUserSessionClient` wrapped by
`TelegramUserSessionTransport` for MTProto. Both keep credential material in
deployment-only runtime configuration.

## No-key connection mode

AgentForge also supports a `gateway` connection mode. In that mode the user
authorizes an existing OpenClaw/Hermes-style gateway or user-session connector;
AgentForge stores only a reference such as `gateway://openclaw/local`, never a
Telegram or Discord secret. The platform still requires authentication at the
gateway boundary—there is no unauthenticated way to read or send messages—but
the public AgentForge project does not require users to paste provider API keys
into its own configuration.

The concrete optional runtime is `OpenClawGatewayTransport`. When
`AGENTFORGE_GATEWAY_URL` is set, AgentForge performs the authenticated
OpenClaw gateway handshake, persists only a local device identity, subscribes
to gateway chat events, and sends through the gateway. It does not call the
Telegram Bot API, start a second poller, or require a Telegram bot token.
The BotFather transport is the normal public path; MTProto is the advanced
option. Only one Telegram owner should poll a bot token at a time.
