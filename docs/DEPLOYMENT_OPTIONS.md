# Deployment options

AgentForge is open source and self-hostable. Choose the operating model that
fits your needs; the workspace, memory, approvals, evidence, and channel
contracts remain the same across modes.

## Local workstation

Use this for evaluation, development, and private single-user work. Clone the
repository, install dependencies, and run `pnpm vnext`. The control plane binds
to `127.0.0.1` by default, starts empty, and stays offline until you configure
a model or channel. Follow [Installation](INSTALLATION.md).

## Approved Docker execution

Use this when a task needs a bounded execution environment. Docker is optional,
disabled by default, and only runs an explicitly approved plan against an
explicit repository path. It does not grant an agent unrestricted access to the
host.

## Always-on self-hosting

Run the same launcher on a server you control, protect it with HTTPS and an
owner token, keep provider credentials in the server's secret manager, and
configure backups for the workspace store. Telegram, Discord, and Slack are
independent transports; one missing provider does not stop the others.

## Managed hosting

AgentForge does not currently claim a first-party managed hosting plan. A
future hosted offering must preserve the public privacy boundary, disclose
where workspace data is stored, explain backups and retention, and provide a
clear export and deletion path. Do not imply 24/7 uptime, automatic backups,
or support commitments until those services are actually operated and tested.

## What a user gets after setup

1. A durable workspace with teams, subgroups, goals, processes, memory, and
   approvals.
2. A browser control plane and optional Telegram, Discord, or Slack views into
   the same canonical workspace.
3. Provider-neutral model routing through the configured local or remote model.
4. Reviewable execution contracts and evidence for actions that leave the
   workspace.
5. A setup guide that reports what is configured and what still needs an
   operator decision.

AgentForge never bundles private accounts, customer records, provider tokens,
or business data in the public package.
