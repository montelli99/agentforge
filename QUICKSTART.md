# AgentForge Quickstart

Run the current AgentForge control plane locally. A new workspace begins empty and does not connect to messaging, telephony, model, or other external accounts.

## Requirements

- Node.js 22 or newer
- pnpm 10 or newer

## Install the GitHub release without building

Download `agentforge-0.1.2.tgz` from the
[0.1.2 early-access release](https://github.com/montelli99/agentforge/releases/tag/v0.1.2).
Its SHA-256 is `8f0ba13226eb617d7668e8bd1f6054586dac6c0964ddb62b6c4289bc14f76f91`.
This route needs Node.js 22+ and npm, but no npm account or pnpm. Git and Docker
are needed for isolated repository execution, not for simply opening the UI.

From the folder containing the downloaded archive, create a new installation:

```sh
mkdir agentforge-workspace
cd agentforge-workspace
npm init -y
npm install --ignore-scripts ../agentforge-0.1.2.tgz
node node_modules/agentforge/dist/server/start.js
```

Keep the terminal running and open `http://127.0.0.1:3460`. Complete owner setup,
then use the connection guide to select a model. Installing sends no model request
and does not connect OpenClaw, Hermes, or private accounts automatically.
This is an early-access build; see the release notes for unverified integrations.
The source-build instructions below are an alternative for contributors.

## Install and build

```bash
pnpm install --frozen-lockfile
pnpm build
```

## Start the server

```bash
pnpm start
```

The vNext server listens on `http://localhost:3460` by default. Set `PORT` to use another port.

For the local data location, backup and restore procedure, upgrades, and the
execution boundary, use the [local operations runbook](docs/LOCAL_OPERATIONS.md).

## First workspace

Open `http://localhost:3460`, choose a workspace surface, and describe the
outcome you want. The Setup Guide prepares a local project, private channel,
guide conversation, requirement plan, and proposed roles. It asks only for
decisions that change capabilities or authority. No connection or task run is
enabled until its boundary is explicitly reviewed.

## Check readiness

```bash
curl -i http://localhost:3460/api/status
curl -i http://localhost:3460/api/readiness
```

The control plane also exposes `GET /api/agents`, `GET /api/tasks`, and `GET /api/compute`. These endpoints report the current local staging state; they do not imply that external providers are connected.

## Run the test suite

```bash
pnpm test
pnpm typecheck
pnpm check
```

`pnpm check` runs the full strict source-tree typecheck, test suite, and production build.

Provider-backed live tests are opt-in. They require both a provider credential and `AGENTFORGE_LIVE_TESTS=1`; ordinary tests do not make paid provider calls.

## Development mode

```bash
pnpm dev
```

This runs the same AgentForge server directly from TypeScript.

## Consolidate Markdown references

Review the canonical public Markdown inventory from this repository:

```bash
pnpm docs:collect
```

To include a Markdown artifact stored outside the repository, pass it explicitly:

```bash
pnpm docs:collect -- --extra "path/to/artifact.md"
```

The script lists the canonical public documents and accepts explicitly supplied external artifacts; it does not copy or publish private workspace files.

## Current scope

AgentForge is in active staging. Review `LAUNCH_CHECKLIST.md` before describing it as production-ready. The current UI and endpoints are a local control-plane foundation; real integrations, authorization, persistence/recovery, security review, marketplace distribution, and human acceptance remain release gates.
