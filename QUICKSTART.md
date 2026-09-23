# AgentForge Quickstart

Run the current AgentForge control plane locally. This quickstart uses the built-in mock/local state and does not connect to a live CRM, messaging, or telephony account.

## Requirements

- Node.js 22 or newer
- pnpm 10 or newer

## Install and build

```bash
pnpm install --frozen-lockfile
pnpm build
```

## Start the server

```bash
pnpm start
```

The server listens on `http://localhost:3000` by default. Set `PORT` to use another port.

## Check readiness

```bash
curl -i http://localhost:3000/api/status
curl -i http://localhost:3000/api/readiness
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

This runs the same vNext server directly from TypeScript. `pnpm legacy` starts the older experimental server for compatibility checks.

## Consolidate Markdown references

Regenerate the flat review copy and its index from Markdown files in this repository:

```bash
pnpm docs:collect
```

To include a Markdown artifact stored outside the repository, pass it explicitly:

```bash
pnpm docs:collect -- --extra "path/to/artifact.md"
```

The script rejects filename collisions rather than silently overwriting a document. The indexed source files remain canonical; the consolidated folder is a review copy.

## Current scope

AgentForge is in active staging. Review `LAUNCH_CHECKLIST.md` before describing it as production-ready. The current UI and endpoints are a local control-plane foundation; real integrations, authorization, persistence/recovery, security review, marketplace distribution, and human acceptance remain release gates.
