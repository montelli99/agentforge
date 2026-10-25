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


## Experimental OpenClaw connection boundary

The optional OpenClaw WebSocket adapter targets protocol 4 as documented at
https://docs.openclaw.ai/gateway/protocol/handshake and
https://docs.openclaw.ai/gateway/protocol/auth (reviewed October 25, 2026).
It waits for a valid server challenge, signs its timestamp and nonce, checks the
matching hello response and operator role, and uses the granted write scope for
outbound sends. It does not downgrade to protocol 3. Login and request waits are
bounded to 30 seconds. Interrupted sends and responses without a valid message
receipt report uncertain delivery; they are never automatically replayed.

Synthetic protocol tests cover these boundaries. No live OpenClaw installation,
Hermes runtime, inbound Telegram mapping, task delegation, or guided pairing has
been accepted. This transport must not be advertised as a complete integration.
Further work requires a disposable upstream installation, source-verified event
mapping, explicit task/session binding, and durable run reconciliation before
chat delegation can be released. AgentForge does not inspect private runtime
profiles or import their credentials automatically.

A loopback WebSocket acceptance now verifies the actual signed challenge over
Node's native client, interrupts a send by terminating the server connection,
and confirms a fresh authenticated connection does not replay that send. A new
explicit send receives the server's message ID. The server is a synthetic `ws`
test fixture, not an installed OpenClaw runtime. Run the
`openClawGatewayNetwork.test.ts` suite for this transport proof.

### Actual upstream authentication — October 25, 2026

The compiled adapter authenticated against OpenClaw 2026.10.7 (157d8c2)
installed with npm scripts disabled in a disposable Node 24 container. The
container used a fresh home/configuration, synthetic gateway token, no host
profile mounts, an internal Docker network, and a loopback connection from a
probe inside the container. Result: authenticated=true, modelCalled=false.
The gateway was stopped after the probe. No chat delivery, task delegation,
remote pairing, or Hermes compatibility is established by this result.

Compiled transport SHA-256:
`ae9a77997dd35b6ac40b7be92a617ef0a65e0d25be01aa4736eaf30d7bcf8790`.
Disposable image ID:
`sha256:cd39617de1e1675bfe786ea54d5ec375b38101b9493c98f2c99f93a6054944f0`.
The initial host-to-container attempts failed to authenticate over the internal
network; the successful probe ran in the gateway container's own network
namespace. This is local backend authentication, not remote-device pairing.

The next adapter revision also read `chat.history` successfully for the explicit
synthetic session `agent:main:agentforge-synthetic-probe` in the same disposable
2026.10.7 runtime. The response contained zero messages plus sessionInfo and
pagination fields; no inference or outbound chat occurred. The read API requires
an explicit key and negotiated read authority and preserves unknown activity
fields rather than interpreting omission as idle. A pre-ready connection failed;
retry after the runtime reported readiness succeeded. Automatic startup retry,
UI session binding and task reconciliation are still unfinished.

A bounded connection coordinator now retries transport failures and the explicit
upstream startup-sidecars UNAVAILABLE response, with backoff and a total deadline.
Authentication/protocol rejection is terminal. Explicit stop cancels startup;
only connection attempts retry, never messages. The server startup path awaits
this coordinator before reporting authentication and stops the relay on shutdown.
An actual immediate-after-container-start probe against 2026.10.7 authenticated
and read the synthetic session in 10,127 ms without a manual retry or model call.
The container was stopped afterward. This does not prove reconnect orchestration
after an established working session or durable task recovery.

### Durable external submission boundary

The adapter can submit an explicit session turn with a caller-provided request
ID and requires a remote run ID. The control-plane boundary persists the request
before submission, binds approval to the exact task contract, connection,
session and message, and refuses automatic replay after uncertainty. A remote
acceptance receipt is not evidence of task completion.

Targeted verification: 16 runtime/dispatch tests passed and TypeScript checking
passed. The overlap test holds a submission open, rejects a second submission
and local execution, cancels the task, then delivers the late remote receipt.
Reopening the saved workspace preserves both cancellation and the remote run ID.
These are synthetic boundary tests, not real upstream task execution evidence.

Still required: authenticated UI/API connection selection and approval flow,
remote authority disclosure, run reconciliation and result verification, and an
end-to-end real-runtime handoff. Hermes has no verified connector yet.

Run inspection now uses the installed OpenClaw 2026.10.7 `agent.wait` schema
(runId, timeoutMs), requesting a zero-wait observation of the saved run ID.
The adapter rejects mismatched run IDs and retains upstream status verbatim.
Source inspection of prepareAgentWaitForTurn confirmed pending and timeout
responses; neither establishes completion. Eighteen transport tests and type
checking passed, including mismatched receipts and no resubmission. This method
still needs control-plane reconciliation wiring and actual-runtime acceptance.

Durable observation recovery now reads only the receipt's saved connection/run
ID, persists bounded status metadata and leaves local task status unchanged.
The disk-reopen test rejects an unrelated connection/run, retains timeout, and
keeps the task paused even when upstream reports ok. It makes only one original
submission. All three dispatch recovery tests and type checking passed.

The compiled adapter was also exercised against the disposable OpenClaw 2026.10.7
runtime: inspecting `agentforge-synthetic-unknown-run` returned that exact run ID
with status `timeout`. No model call or task submission occurred. The container
was stopped afterward. This proves unknown-run observation behavior, not recovery
of a successfully completed real task; UI integration and result verification
remain outstanding.

The server now exposes POST /api/tasks/:id/external-observation for authenticated
users with task-read and task-execution permissions. It uses only a startup-
registered connection matching the saved receipt, never a caller-supplied URL or
run ID. The optional OpenClaw startup connection is registered for this purpose.
HTTP acceptance covers anonymous and restricted-user denial, method enforcement,
saved-run selection, persisted timeout, unchanged task status, and provider-error
redaction. The test and type checking passed. This is a recovery API; chat setup,
approval creation, delegation UI and verified completion remain unfinished.

Recovery registration is now bound to the normalized gateway URL, credential and
local device identity, rather than a reusable constant name. A keyed digest keeps
credential material out of task receipts. Changing any binding component prevents
an old receipt from silently targeting the new configuration. This is configuration
binding, not cryptographic proof of the remote server's identity. Six targeted
transport/HTTP tests and type checking passed, including option mutation and IPv6
loopback validation. Credential rotation requires explicit future rebinding logic.

### Integrated API and browser recovery checkpoint

The API now supports listing configured runtime IDs, preparing an exact pending
review, and submitting that exact request after approval. HTTP tests reject
unregistered destinations, unapproved submissions, changed messages and duplicate
submissions. The runtime URL and credentials cannot be supplied through these APIs.
Review text explains that an external runtime has its own tools and permissions;
AgentForge's local execution contract is not enforced inside that runtime.

A full local regression run at 45f8d20 passed 803 tests with 2 skipped across
136 files. Later browser changes were checked separately: a fresh browser signed
in, opened a synthetic external task, checked its saved run once, then reloaded.
The last timeout status remained visible, completion remained unverified, and
local Resume stayed hidden. No model call was made. The check is now included in
hosted acceptance and the installed-archive runner. Hosted acceptance of the final
head is still required; earlier passing revisions do not cover later changes.

Cancelling an external task currently cancels only AgentForge's local record.
Both the confirmation and response disclose that the remote run may continue;
the saved receipt is retained. Remote cancellation, guided connection setup,
chat-to-delegation review UI, actual model-backed task acceptance, artifact/result
verification and Hermes integration remain open. No stable-release or comparative
superiority claim follows from this checkpoint.

### Run-scoped Stop checkpoint

The transport, durable control plane, authenticated API and browser now support
an explicit confirmed Stop request for the saved session/run. The attempt is
persisted before the remote request and is never automatically replayed after
uncertainty. Acknowledgement must name that run; it does not prove every partial
side effect has ended. The browser acceptance verifies confirmation, persisted
acknowledgement, and no repeated Stop after reload using a synthetic runtime.

The current compiled transport was also tested against disposable OpenClaw
2026.10.7. Stop for the synthetic unknown run returned acknowledged=false; no
model call occurred and the container was stopped afterward. Transport SHA-256:
ef4a0f36d9dc31528317ecf53d51f7a63a3b9034c2ac09bd7ee143c64a4b9e1e
This establishes unknown-run behavior only. Stopping an active model-backed run
and inspecting its partial results still need acceptance evidence.
