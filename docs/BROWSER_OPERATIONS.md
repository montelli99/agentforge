# AgentForge browser operations

AgentForge owns the browser control boundary while a deployment supplies the
actual browser harness. The public system never stores cookies, page contents,
or provider credentials.

## Safe action loop

1. Attach a profile reference with `POST /api/browser/sessions`.
2. Capture a structured observation from the browser harness and send it to
   `POST /api/browser/sessions/:id/observe`.
3. Select one JEv operation (`CLICK`, `TYPE_TEXT`, `SELECT`, `SCROLL_UP`,
   `SCROLL_DOWN`, `WAIT`, `DONE`, or `BLOCKED`) using the current observation
   ID. Validate it with `POST /api/browser/validate-action`.
4. For an external write, request approval with
   `POST /api/browser/sessions/:id/request-write`. The operator must approve
   the same fresh observation with `POST /api/browser/sessions/:id/approve-write`.
5. Only after approval does the deployment bridge execute the action. Capture
   the next observation after every browser mutation.

The policy rejects stale or future observations, invalid or ambiguous indexed
element tables, unsupported operations, hidden or unseen targets, incompatible
select options, oversized text, and input payloads on non-target operations.
The session retains only an observation fingerprint, not its page contents, so
a caller cannot reuse an observation ID with a different element table during
write approval. Write approvals expire after 30 seconds; the bridge must then
capture and propose a new observation. The session API returns `400` for malformed or rejected
actions so callers can correct the observation instead of treating validation
failures as server faults. A human can take over with
`POST /api/browser/sessions/:id/takeover` and return control with
`POST /api/browser/sessions/:id/return`. Takeover clears the last observation
and any pending write, so returning control always requires a fresh capture.
Release a profile with
`POST /api/browser/sessions/:id/release`.

## Provider boundary

JEv UltraFast supplies the indexed-action design. AgentForge supplies the
session ownership, observation freshness, approval, audit, and public API
contracts. A Browser Use, Playwright, CDP, or other deployment bridge may
implement `JevUltrafastBrowserBridge`; no bridge is assumed by the public
package.

## Jev Ultrafast action loop

`runJevUltrafastBrowser()` implements the provider-neutral loop used by the
public `browser-use/jev-ultrafast` design: each cycle obtains one fresh,
indexed observation, asks a selector for one bounded operation, validates the
operation against that exact observation, and executes it. The loop supports
`CLICK`, `TYPE_TEXT`, `SELECT`, scrolling, `WAIT`, `DONE`, and `BLOCKED`.

The loop has a 50-step default budget (configurable up to 500), re-reads after
every action, and returns `MAX_STEPS` rather than running indefinitely. A
`DONE` action is not accepted as success unless the caller supplies an
independent outcome verifier and it returns true. This keeps model confidence
separate from task completion evidence.

AgentForge does not vendor the upstream Python demo or require its API keys.
The adapter is a TypeScript safety and orchestration boundary; a deployment
can provide a local browser bridge or an optional upstream Jev/browser-use
provider without coupling the public package to a private provider.

## Evidence expectations

The operator UI should display the active profile reference, ownership mode,
observation ID, pending approval, and last action result. It must label the
session as disconnected until the deployment bridge reports a live connection.
Tests should cover stale observations, unseen targets, takeover/return, an
approval tied to the same observation fingerprint, and expiry. The control plane records each
session lifecycle operation and approval in the durable audit ledger.
