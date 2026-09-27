# Production Execution Boundary

AgentForge is safe to install locally before it is connected to an operator's
accounts, CRM, messaging channels, cloud drives, or model credentials. The
default runtime is intentionally read-only and **cannot execute tasks**.

## What must be true before a worker can run

A `TaskExecutionBackend` is the only path from a stored task to execution. It
must report all four capabilities as ready:

1. **Model planning** — the backend obtains a structured plan from a named
   provider or a human-approved plan. The plan identifies every proposed tool
   effect; a prose model response is not an execution plan.
2. **Isolated compute** — commands run in a managed, disposable task worktree
   with a real OS/container boundary. The host process, home directory, and
   unrelated workspaces are outside the task's write scope.
3. **Real verification** — each required contract check is executed, with its
   actual exit code, stdout, stderr, duration, and command captured.
4. **Evidence collection** — file diffs, artifacts, and revisions are read from
   the execution workspace after the run. The coordinator never synthesizes a
   passing check, changed file, artifact, or final revision.

If one of these is absent, `TaskWorkerRuntime.start`, `executeTask`, `resumeTask`,
and `retryTask` fail closed. The API returns the missing capability list rather
than presenting a connected worker.

## Open-source core versus operator integrations

The open-source core may be developed and tested using disposable local fixtures.
It must not require, inspect, or transmit an operator's personal accounts to be
useful. Telegram, email, CRM, cloud-drive, dialer, and paid-model adapters are
optional integrations installed after the core's local acceptance suite passes.

Every integration must use a capability-scoped secret store, have an explicit
enablement toggle, and default to disabled. A connector cannot silently inherit
credentials from a developer's shell or sibling project.

For a deployment that intentionally exposes the HTTP API beyond loopback, set
`AGENTFORGE_API_TOKEN` and send `Authorization: Bearer <token>` on API requests.
The server rejects a non-loopback `AGENTFORGE_HOST` at startup when that token
is absent. The token is compared in constant time and is never included in
readiness or error responses. This is a deployment boundary, not a replacement
for the multi-user identity and role system still required for a public hosted
service.

The local workspace settings file is not a secret store. It is kept outside the
repository by default, Git ignores legacy local settings paths, and the web API
rejects known provider credential fields before it can persist or echo them.
Provider credentials need a dedicated, capability-scoped connection mechanism
before an integration can be enabled.

Likewise, a new durable workspace begins without agent profiles, active-looking
tasks, marketplace packages, or model/harness performance baselines. A baseline
is evidence from a real evaluation, not a product default. Isolated in-memory
test stores may carry records whose IDs explicitly begin with `fixture-` so the
test suite can exercise comparison and containment behavior without presenting
fictional model performance to an operator.

The durable HTTP API also rejects manually asserted drift results until a
reviewed evaluation source is connected. This prevents the dashboard from
turning operator-entered scores into counterfeit performance evidence.

The local command center does not fetch hosted fonts or other presentation
assets. A clean local installation renders with system fonts and does not make
an external browser request simply to display the interface.

## Acceptance evidence for a real backend

Before a backend is marked production-ready, its release evidence must include:

- an isolated-worktree test proving writes cannot escape the task root;
- a denied-network test when the contract disallows outbound access;
- a denied-effect test for each prohibited authority flag;
- a command failure test proving failed checks cannot be represented as passed;
- a diff/evidence integrity test using files created by the executor;
- a restart/recovery test that preserves task state without replaying effects;
- a browser/API acceptance test that shows the same readiness state a user sees.

These requirements deliberately keep product claims smaller than implementation
ambition. A dashboard may show queued work and missing gates, but it must not
claim that a model, tool, sandbox, or verifier is live unless the corresponding
backend has actually passed them.

## Current container baseline

The included Docker compute provider is a building block, not a connected task
backend. Its command invocation uses argument arrays rather than shell command
construction and starts a disposable container with networking disabled, a
read-only root filesystem, dropped Linux capabilities, no-new-privileges, a PID
limit, and a writable task-workspace mount plus temporary filesystem. It still
requires an executor that creates a structured plan, checks that plan against
the task contract, and collects observed output before it can satisfy the four
worker gates above.

`ContractedDockerExecutionBackend` is that executor foundation. It accepts only
an approved plan provider, validates every command against the `ExecutionContract`,
requires each required check to appear in the plan, and stores Docker's observed
stdout, stderr, exit code, and duration. It is deliberately not wired into the
default server: enabling it requires an explicit plan provider and successful
Docker readiness check.

Docker readiness means a reachable daemon, not merely a `docker` executable on
the host. This prevents an installed-but-stopped Docker Desktop application from
being shown as an isolated execution environment.

## Explicit approved-command mode

The launcher accepts `AGENTFORGE_EXECUTION_MODE=approved-docker` with an explicit
absolute `AGENTFORGE_EXECUTION_REPO`. The default remains off. This mode uses
canonical task plan approvals, a one-hour approval expiry, and isolated task
worktrees. It does not call a model to invent a plan. Docker availability is
checked at startup; missing prerequisites remain visible as offline.

Ready tasks are not automatically dispatched in this mode. Review the execution
plan, approve its commands, then use Run task explicitly. Approval alone never
starts work. Contract changes invalidate the approval. The current container
limits are one CPU and 1 GiB RAM with outbound networking disabled.

Run `pnpm test:approved-docker:e2e` before enabling this mode in an operator
workspace. The check creates a disposable Git repository and a real AgentForge
worktree, verifies a human-approved command against its contract, runs it in a
network-disabled Docker sandbox, and confirms the observed artifact, diff, and
revision evidence. It does not touch the operator repository or any account.

## Runtime wiring (operator deployment)

The launcher wires the approved backend when both of these variables are set:

```text
AGENTFORGE_EXECUTION_MODE=approved-docker
AGENTFORGE_EXECUTION_REPO=/absolute/path/to/the/repository
```

The worker remains fail-closed until Docker reports a reachable daemon. A model
may draft a plan, but only a stored, human-approved plan can execute. The
launcher does not read credentials from OpenClaw, a sibling project, or a
developer shell.

Telegram is likewise opt-in and runtime-only. The normal direct path is a
BotFather token via `AGENTFORGE_TELEGRAM_BOT_TOKEN` or the safer external
`AGENTFORGE_TELEGRAM_BOT_TOKEN_FILE`; AgentForge owns the long-polling session
itself. An MTProto user session remains available only for advanced cases that
need a user account. If an existing gateway owns that user session, use the
optional gateway relay instead of starting a competing consumer. Session
material is never persisted in the workspace or source tree.

Discord is likewise opt-in and runtime-only through
`AGENTFORGE_DISCORD_BOT_TOKEN` with an optional
`AGENTFORGE_DISCORD_GATEWAY_URL`. Its standalone Gateway v10 transport routes
interactions into the native mirror; live-provider acceptance remains an
explicit deployment check.
