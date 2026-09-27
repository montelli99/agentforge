# Public system architecture

AgentForge is released as three cooperating public subsystems. They are separate on purpose so a user can replace a model, workflow, or decision policy without losing the rest of the system.

## AgentForge

AgentForge is the workforce control plane. It owns workspace setup, agent and role records, durable memory, bounded context packets, permissions, approvals, audit events, channel adapters, runtime lifecycle, and cost-aware model routing. Its setup guide turns an ordinary-language outcome into a reviewable plan and sandbox agent drafts.

AgentForge does not include or own operator business records, customer data, proprietary documents, personal credentials, or vendor-specific automations.

### One harness, optional execution engines

The **AgentForge Harness** is the product's primary harness and control boundary.
Pi and Pydantic are optional execution engines that the harness may call when an
operator explicitly configures them; they are adapters behind the harness, not
additional harnesses and not requirements for channel connectivity. Native
AgentForge execution is the default product path, and the harness remains
useful even when no optional engine is installed.

## Workflow Engine

The Workflow Engine is the domain-neutral process layer. It compiles a process into stages, checks, handoff contracts, completion evidence, retry/recovery rules, and an execution decision. It owns repeatable work, not the workforce that performs it.

Its public facade is `src/workflowEngine.ts`. It can inspect a process and begin a durable completion goal without connecting to a private business system.
The control-plane route `POST /api/workflows/goals` exposes that goal start as a safe, auditable operation with no external side effects.
When a process is assigned to an agent, `POST /api/process-runs/prepare` compiles that binding into a reviewable task and restricted execution contract. Unresolved or privileged rules hold the task for approval; preparation never starts a worker or grants authority by itself.

## JEv

JEv is the cheap System-1 decision layer. It classifies intent, selects setup/route/review/execute workflows, and identifies whether approval is required. It is deliberately bounded: it does not generate long-form work, store credentials, or perform external side effects.

`AgentForgeController` uses JEv and creates the bounded context packet passed into the selected workflow. JEv recognizes ordinary-language setup, review, routing, and execution verbs so an unmatched status question does not accidentally restart setup. This keeps routing cheap while preserving provenance and an exact token ceiling.

## Public boundary

### Native channel ownership

AgentForge is designed to operate without OpenClaw or Hermes. Its native
gateway owns channel sessions, routing, reconnects, normalized events, and
outbound delivery for Telegram, Slack, Discord, and future providers. Each
provider still requires its own legitimate authorization or session because
the provider controls access; that authorization is held by AgentForge's
runtime and is never supplied by OpenClaw or Hermes. Those systems remain
optional compatibility bridges for migration and existing deployments.

The native runtime entry point is `NativeAgentForgeGateway`. It owns channel
runtime lifecycle and exposes one inbound event stream plus one
provider-neutral outbound send path. A started runtime is not treated as a
live external connection until the provider adapter proves its authenticated
session.

The control plane exposes `GET /api/gateway/status`, `POST /api/gateway/start`,
and `POST /api/gateway/stop` for the native runtime. These controls operate on
AgentForge-owned adapters and do not start or stop an OpenClaw/Hermes process.

The public manifest is the authority for this split: `src/publicSystemManifest.ts`, exposed by `GET /api/system/manifest`. The product-isolation acceptance scan rejects private pipeline identifiers and private integration defaults. Provider connections accept only secret references and remain approval-gated.
Connection state is discoverable through `GET /api/setup-guide/connections`, allowing the inner setup agent to resume configuration without relying on conversation history.
Provider-neutral MCP JSON-RPC support is exposed through `McpJsonRpcClient`; it validates endpoint transport, requires session initialization, supports tool discovery/calls and resource reads, requires explicit `allowOutbound` for remote endpoints, and keeps authentication headers in memory supplied by the caller.
The Scribe process provider can ingest a text resource through that client with `ingestFromMcp`, preserving the same compiler and unresolved-rule checks used for local Markdown.

### Browser action boundary

The public package includes a JEv UltraFast-style browser action policy. A
browser bridge supplies an indexed, visible element observation; AgentForge
accepts only compatible actions targeting that exact observation and rejects
stale, hidden, or unobserved targets. A deployment may supply its own browser
harness, but model output cannot bypass this policy or become raw selectors,
coordinates, scripts, or shell commands.

`BrowserSessionRegistry` owns the lifecycle around that bridge: agent ownership,
explicit human takeover, return-to-agent control, and same-observation approval
for external writes. It stores only a profile reference and observation IDs;
cookies and credentials remain inside the deployment's browser harness.
The local control plane exposes this lifecycle under `/api/browser/sessions` so
an operator UI can attach, observe, take over, return control, release a
session, and approve a pending write without handling browser secrets.

## Current verification

- `pnpm verify:public` passed on 2026-09-27: typecheck, product-isolation,
  public-package surface, isolated Docker baseline, and approved Docker E2E.
- The Docker E2E created a disposable repository and real AgentForge worktree,
  accepted a time-bound human-approved command, ran it in a network-disabled
  container, and verified the observed artifact, diff scope, and revision.
- A disposable local acceptance runtime reported the AgentForge-native gateway
  ready with the direct BotFather transport. That evidence proves the local
  transport lifecycle only; no provider account, credential, or workspace is
  bundled or implied by the public source. Telegram is owned by AgentForge,
  not an OpenClaw or Hermes process.
- Setup, callback, controller, context-packet, workflow, and channel lifecycle
  tests are included in the full suite.

Provider-neutral callback, health, approval, and sandbox contracts are not
substitutes for each operator's external authorization. Discord and Slack live
acceptance, model-authored execution plans, durable remote identity, and a
public hosted deployment remain separate opt-in release tracks. The public
code intentionally stops before private account access or business-specific
side effects.
