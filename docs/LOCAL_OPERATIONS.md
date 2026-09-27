# Local operations

This runbook is for a self-hosted AgentForge installation. It is deliberately
generic: it uses no shared accounts, customer records, channel identities, or
provider credentials.

## Start safely

AgentForge binds to loopback by default. From a source checkout:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Open `http://127.0.0.1:3460`. The first launch creates an empty local
workspace and opens the Setup Guide. It does not connect a model, channel, or
execution environment by itself.

Use `AGENTFORGE_PORT` (or `PORT`) to choose a different primary port. The
runtime keeps its secondary loopback listener on port 3460 unless
`AGENTFORGE_DISABLE_SECONDARY=1` is set.

## Local data and backups

By default the workspace snapshot is stored at:

```text
<local application data>/agentforge/workspace.json
```

Set `AGENTFORGE_DATA_DIR` to keep all AgentForge workspace data in a location
you control. Set `AGENTFORGE_SETTINGS_FILE` only when you need a separate
settings file.

Every successful workspace save is atomic. AgentForge keeps the immediately
previous snapshot beside it as `workspace.json.bak`; a stale write lock is
recovered after a bounded lease. The backup is recovery protection, not a
retention policy. Copy the whole data directory to an encrypted backup location
on a schedule appropriate to the workspace.

To restore a known-good backup:

1. Stop AgentForge cleanly.
2. Copy the current data directory somewhere safe before changing it.
3. Replace `workspace.json` with a verified backup copy.
4. Start AgentForge and inspect the workspace before enabling any provider or
   execution capability.

Do not hand-edit a snapshot while AgentForge is running.

## First secure owner setup

For any shared, remote, or long-lived deployment, set `AGENTFORGE_AUTH_STRICT=1` before starting AgentForge. On first opening the loopback workspace, AgentForge presents a local owner setup screen that asks for a name and a 12-character-or-longer password. It stores only a password hash in local workspace data and uses an HttpOnly, same-site session cookie for the browser. The password and session token never appear in a URL or browser storage. Headless or CLI clients can instead submit the one-time `POST /api/auth/bootstrap` request and use the returned session token.

That bootstrap endpoint closes permanently after the password is set. Sign in through `POST /api/auth/login` after that. In strict mode, unauthenticated control-plane requests are rejected and viewer identities remain read-only even on routes that do not have a more specific capability rule. Keep `AGENTFORGE_API_TOKEN` set for a deliberate non-loopback deployment.

## Providers and secrets

Provider credentials are runtime configuration, never workspace records. Keep
token files outside the source checkout and outside the data directory you plan
to share. The Setup Guide and `/api/setup-guide/channel-runtime` expose only
safe readiness state.

- For Telegram, follow [Telegram setup](./NATIVE_GATEWAY_OPERATIONS.md) using
  a BotFather token file for normal bot operation.
- For Discord, follow [Discord setup](./DISCORD_SETUP.md).
- For Slack, follow [Slack setup](./SLACK_SETUP.md).
- For an optional chat model, follow [conversation model setup](./CHAT_SETUP.md).

AgentForge stays usable without any of these integrations. Do not reuse another
application's token merely to make a status screen look connected.

## Execution boundary

Task execution is disabled by default. The only bundled execution path requires
all of the following: `AGENTFORGE_EXECUTION_MODE=approved-docker`, an explicit
absolute `AGENTFORGE_EXECUTION_REPO`, Docker availability, and an approved task
plan. It is intended for an isolated repository, with no network access in the
acceptance configuration. Review [production execution boundaries](./PRODUCTION_EXECUTION_BOUNDARY.md)
before enabling it.

For a non-loopback deployment, configure `AGENTFORGE_HOST` and a strong
`AGENTFORGE_API_TOKEN` together. The runtime refuses a non-loopback host without
that token. Put TLS and an authenticated reverse proxy in front of any internet
reachable deployment; localhost defaults are not an internet deployment guide.

## Routine verification

Before upgrading or changing a provider configuration, run the checks that
match the change:

```bash
pnpm typecheck:all
pnpm test:repository-privacy
pnpm test:package:surface
pnpm release:audit
```

For a full local verification of all bundled execution boundaries, use
`pnpm verify:public`. It does not publish a package or make a provider live.
Live-provider checks require an operator-authorized sandbox account and remain
deployment-specific.

## Upgrade procedure

1. Back up the data directory.
2. Read the release notes and verify the target source or package provenance.
3. Install the new version and run the routine verification above.
4. Start AgentForge with external integrations disabled first.
5. Confirm the Setup Guide, workspace, and readiness endpoint work as expected.
6. Re-enable one provider at a time and verify it with a disposable channel or
   workspace before production traffic.

The workspace store migrates supported historical snapshot versions on load and
immediately writes the current schema. If a snapshot cannot be read, stop and
recover from a verified backup rather than creating a new workspace over it.
