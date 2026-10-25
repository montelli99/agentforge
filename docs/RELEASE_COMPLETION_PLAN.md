# Full release completion goal

This work order preserves the whole remaining scope. Passing a component check
does not close the goal. No private workspaces, credentials or private product
integrations belong in source, evidence, fixtures or release packages.

| Requirement | Completion evidence | Current gap |
| --- | --- | --- |
| Guided onboarding through first successful task | Clean-install user journey with secure account setup, model validation and successful task | Encrypted save/unlock implemented; clean-install first-task journey still unproven |
| Supported subscription chat and execution | Official client authentication, bounded workspace access, cancellation and reconnect evidence for each advertised route | Direct ChatGPT chat/tool loop, protected Windows sign-in, renewal, restore and sign-out implemented; live lifecycle acceptance and other-platform storage unproven; Claude/Gemini managed workers incomplete |
| Real-model full task completion | Model-generated plan, explicit review, isolated execution, independent checks and useful artifact | Model-generated synthetic report passed isolated execution and checks; end-user approval UI journey still unproven |
| Recovery and memory reliability | Crash, auth expiry, interrupted tool, conflicting-memory and duplicate-action cases with durable receipts | Disconnect and simple retrieval examples passed; broader faults unproven |
| Measurable differentiation | Frozen held-out workloads, matched model/budget baselines, repeated trials, completion/cost/latency results including failures | Development examples only; no competitive superiority demonstrated |
| Finished public release and launch | Exact-build CI/package hashes, clean distribution, coherent UI/docs, reproducible demo and accurate marketing claims | Current changes in PR review; exact-build CI and release reconciliation remain |

## Work order

1. Complete and verify real model planning through independently checked output.
2. Exercise failure/recovery around that real workflow; repair causes found.
3. Complete secure guided setup and official subscription workers.
4. Freeze a held-out evaluation before running comparisons. Keep development
   examples out of the held-out score and account for every attempt.
5. Reconcile product, documentation and evidence; publish the exact tested build
   and prepare the demonstration and launch materials.

Only account-owner authentication or a genuine unavailable external service
should block its dependent item. Continue independent work. Do not mark the goal
complete until every row has direct current evidence. Historical private-cache
removal remains a separate tracked request until the hosting provider confirms it.

## October 25 progress

Live MiMo V2.6 Flash generated a two-command plan for a synthetic sales summary
in 8.457 seconds (458 input / 357 output tokens). After agent review and explicit
digest selection under owner-authorized testing, the governed worker ran it in
network-disabled Docker in 3.670 seconds. Independent checks observed two paid
orders and revenue 125; JSON and Markdown artifact hashes and an observed receipt
were recorded. The task remained `waiting_approval` for final review. This is an
evaluation-harness approval path, not proof of the end-user approval UI journey.

JSON artifact SHA-256:
`0bf5bf411f8b6891fd27db8fdf369ea199b3f93f9c22d62c055f643b15f0966e`

Markdown artifact SHA-256:
`8ae6b47e8fd7655f028156004e0b85151d7823a7c75bc4f5a2250ba184f69a62`

An actual child-process termination after a disposable file effect also passed:
the durable receipt was `started`, the restarted worker refused replay, and the
effect count remained one. This used a file backend, not a remote provider or
Docker orphan. The persisted task still displayed `verification_running` after
restart, exposing an unfinished interruption/reconciliation presentation path.
The read-only task presentation now labels an old-session active receipt as
paused with explicit reconciliation guidance. It preserves the recorded status
and does not assert that another worker has stopped. Repeating the actual crash
check verified that presentation and that replay remains blocked. Remote-effect
reconciliation and end-user recovery actions remain incomplete.
Do not claim recovery is complete based on duplicate prevention alone.

Authenticated guided connection setup now saves profiles and credentials together
in an encrypted private store, hot-loads web chat routes, and unlocks them after
a service restart. Owner/admin permission is required even in local unlocked mode.
Setup API tests proved anonymous/viewer denial, encrypted persistence, restart
unlock, and wrong-passphrase preservation. A concurrency check rejects responses
while connections change and preserves the previous route on failure. No real
credentials were used in these tests. Browser verification and live-provider
first-task onboarding remain separate; subscription workers and planner/channel
hot configuration are not completed by this change.

The browser verification attempt reached the connection setup screen but stopped
when the external test service exhausted its credits. It is incomplete, not a
passing UI acceptance result. Typecheck, build, script parsing, focused tests,
source privacy and npm archive privacy checks passed locally.

Plan review now offers an explicit connected-model selector, with durable usage
accounting and no automatic fallback. The empty-plan panel previously returned
before rendering its draft button; it now permits drafting while keeping empty
plan approval disabled. A synthetic API test confirms selected-model drafting,
usage accounting, and absence of approval/execution. No live-provider or browser
acceptance is claimed by that test. Hosted macOS save tests failed with a linked
temporary path; the fixture now uses its canonical private path while the vault
still rejects linked locations. Hosted confirmation remains required.

Plan requests now exclude concurrent requests for the same task. A returned draft
is discarded if the task description, scope, state, approval or existing draft
changed while awaiting the model. A delayed synthetic provider test verified
that the second request creates no extra invocation, changed-task output is not
applied, usage remains recorded, and a subsequent explicit request can proceed.
This is local-service concurrency protection, not a distributed worker lease.

A frozen paired prefetch ablation (runner commit fc01993) completed 16 live
MiMo V2.6 Flash requests: four declared synthetic families, two fresh random
instances each, one request per arm, 256 output-token ceiling, alternating arm
order, no retries. Prefetch scored 6/8; recent-context-only scored 2/8. There
were no provider failures. Prefetch missed one recall and one correction case.
All requests reported usage, totaling 222,185 tokens; dollar cost is unmeasured.
This is not a competitor comparison or a test of the full tool loop. Strict JSON
scoring and hash-only response retention cannot distinguish answer errors from
formatting errors after the fact; diagnostic response retention remains a gap.
Do not tune against these cases and then relabel them held-out.

Report SHA-256: `5b11c9b5dc8b69f79e770dea5b5da1c1244c2ecd724a77b06c895b91c6430f7a`.
Protocol SHA-256: `cd276efcb47aac72b48e922b651db43595f15cb1d4180c9f46e32f302134f561`.

Diagnostic response retention reproduced a real UNKNOWN answer despite the correct
retrieved value being present before roughly 95k characters of unrelated history.
Retrieved passages now sit immediately before the current request, with source
sequence numbers, chronological presentation and recent-first relevance ties.
Fresh diagnostic instances scored 2/2 with prefetch and 0/2 without it after the
change (previous diagnostic 1/2 versus 0/2). This small, unpaired diagnostic is
not a causal proof or held-out release score. Original results remain intact.
Eight conversation tests and full typechecking passed.

`memory-diagnostic-v2.json: f9f5647b8c1a7b20bd2171317180975d2d4de71c65d8ef770ed176cb5b570b3c`

`memory-diagnostic-v2-near-query.json: 83c04aeb0ed77f41a12cfbcbce431d5968fe737653d57c0fb7708b09b92aa62a`

Windows subscription token persistence now has an explicit DPAPI CurrentUser
backend, with account/client-bound entropy, bounded hidden OS calls, atomic
replacement, and repository/linked-path rejection. Real Windows tests using only
synthetic credentials proved reopen, rotation, ciphertext storage, tamper rejection
and removal. This protects at rest for the Windows user, not against processes
running as that user. The backend is not yet wired into sign-in activation;
macOS/Linux backends and refresh/revocation integration remain open.

The direct subscription adapter now has a concrete bounded Responses SSE
transport. It accepts only an explicitly supplied account-and-grant-matched
credential, rejects redirects and expired/insufficient grants, limits stream and
event size, honors cancellation and never retries. Synthetic transport tests
cover matching/mismatched grants, complete/truncated events, one-request behavior
and safe network errors. This transport has not yet been activated by the UI or
verified with a real subscription grant; renewal remains unfinished.

Hosted Windows Node 22/24 checks failed in protected credential storage. Fixed
stage diagnostics located the Node 22 timeout after PowerShell startup and before
assembly load completion, at Add-Type. The backend now loads the installed
System.Security assembly directly, without Add-Type. The 15-second deadline,
CurrentUser protection, namespace entropy and secret-free errors remain intact.
Six focused tests passed locally, including real DPAPI round-trip/rotation/tamper
checks and error-output privacy. Hosted confirmation of this fix remains pending.

Returning sign-in now accepts a retained ID-token hint only with an explicit
issued client ID and selected subject. Fresh callback and verified identity checks
still apply. The shared preparation helper forwards this hint to the official
authorization endpoint; callers must not log the resulting authorization URL.
Fifteen OAuth/listener tests and full typechecking passed. This is preparation
support, not completed account UI, refresh, revocation or provider activation.
Source: https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions

Hosted confirmation: commit dcae21517fa1c61e4a3f2db3e5b334a1be8559b2 passed
all seven checks in run 40210196891, including Windows Node 22/24, macOS Node
22/24, Linux Node 22/24 and public package/isolated execution acceptance.
The Windows assembly-loading defect is closed for that tested build. This does
not establish subscription activation, account renewal or overall release readiness.

Session lifecycle integration requirements confirmed against official account
and token documentation: retain issued client and host mapping on sign-out;
keep registrations separate; serialize rotating refresh across processes; use
only the saved issued client and resource on refresh; replace the complete token
set; clear unusable refresh tokens and request reauthorization; stop requests on
sign-out and report unconfirmed remote revocation accurately. These lifecycle
items remain open, rather than being implied by passing storage tests.
Sources:
https://developers.openai.com/siwc/token-sharing-open-source/token-reference
https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery

The sign-in runtime now exposes a one-attempt refresh transport using the issued
client ID, saved refresh token and fixed resource, omitting scope and rejecting
redirects. It refuses reuse even after network failure. Session-wide locking,
response identity/grant validation, atomic token replacement and UI activation
still need integration; this transport alone is not automatic renewal. The shared
JSON helper now also redacts fetch exceptions, closing a network-error disclosure
path in sign-in/catalog calls. Twelve runtime tests and full typechecking passed.

Renewal response validation now preserves the existing registration, requires a
replacement refresh token and usable access-token lifetime, rejects scope
expansion, and checks any returned signed identity against the selected subject,
issuer and client. It retains the prior identity hint when no ID token is returned.
Verifier failures are redacted. Focused OAuth tests passed; full typechecking
passed before the additional prior-record shape guard. This validation is not yet
wired to automatic refresh; cross-process coordination, durable interruption
handling, credential replacement and activation remain unfinished.

Renewal is now coordinated with Windows protected storage using an OS-held named
pipe lock shared by reads, writes, removal and renewal transactions. A pending
marker is encrypted and persisted before exchange; uncertain exchanges remain
pending across reopen and require a fresh sign-in rather than replay. A validated
replacement clears the marker atomically; fresh sessions avoid extra refreshes.
The coordinator bounds renewal to 30 seconds and redacts failure details.
Real Windows tests verified replacement/reopen, durable uncertainty/no replay,
cross-process exclusion, and lock release after terminating the owner process.
Twenty-nine focused tests and full typechecking passed locally. This is storage
and renewal coordination, not completed subscription UI activation. The refresh
identity verifier, platform coverage beyond Windows, revocation, and live account
acceptance remain open. Existing in-memory grant snapshots must be invalidated
by the activation manager when renewal begins; that manager is not yet wired.

The pinned identity verifier now distinguishes initial sign-in from renewal.
Initial sign-in still requires its nonce. Refresh permits an absent nonce but
rejects a changed one, retaining the original authentication nonce across token
rotation (OIDC Core section 12.2). Signature, issuer, audience and expiry checks
remain enforced. The verifier integrity hash was updated for the changed bytes.
The protected renewal entry point now joins storage coordination, fixed-endpoint
exchange, trusted JWKS retrieval, pinned signature verification and replacement.
A Windows integration test exercised this entire local path using synthetic
signed tokens and intercepted HTTP, not a live account. Twenty-nine focused
tests and full typechecking passed. UI activation and live-provider acceptance
remain open; this test does not authorize or prove real subscription access.

The direct subscription provider now has an explicit conversation-tool mode.
It maps approved function definitions into the supported AgentForge namespace,
preserves function call/result history, and releases calls only after a completed
provider response. Unknown tools/namespaces, duplicate call IDs, malformed
arguments and unmatched history are rejected. Planning-only mode remains the
default and continues rejecting tool activity. The conversation stream currently
emits only completed turns, not partial text. Twenty-nine adapter/planner tests,
nine conversation tests and full typechecking passed. The actual conversation
runtime completed a synthetic two-turn prepare-task exchange without approving
or executing the task. This is intercepted-provider integration evidence, not
live subscription proof or completed account UI activation.
Sources:
https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
https://developers.openai.com/api/docs/guides/function-calling

An active subscription provider now coordinates renewal and account-catalog refresh
for concurrent callers, invalidates the old grant before preparation, refuses
swapped identities and prevents a late renewal from reactivating a disconnected
connection. It uses the renewed credential for subsequent inference. Three focused
connection tests passed with intercepted providers. The selected-model planner
route now uses the direct subscription request profile, omitting unsupported
sampling/output-token fields. UI account activation remains unfinished; this
provider is not automatically installed or advertised as a working saved account.

Subscription setup integration progress: authenticated owner/admin endpoints now begin, inspect, cancel, and activate actor-scoped ChatGPT sign-in. The guided setup presents official sign-in, saved account selection, result checking, and account model selection. URLs and credentials are not stored in browser storage. Server shutdown cancels callback listeners and deactivates in-memory connections. Windows protected storage only. Typecheck, build, and 13 existing setup/provider tests passed before the final shutdown cleanup; live OAuth/browser acceptance, remote sign-out/revocation, and restart restoration still need proof. This is implementation progress, not release acceptance.

Saved-account recovery is now wired through an authenticated restore endpoint and guided setup action. It checks actor ownership, registration/client binding, protected credentials, and a fresh account model catalog before model activation. Uncertain refresh state requires new sign-in. Cancellation and shutdown invalidate recovery. Typecheck and 13 existing setup/provider tests passed after these changes; those tests do not establish live restore or browser acceptance. Direct restore acceptance coverage remains required.

Lifecycle correction: pending setup now has cancellation before asynchronous preparation, shutdown prevents late account publication, all created subscription providers are deactivated on shutdown, and activation rechecks the current attempt after catalog refresh. Conversation shutdown rejects late configuration installation and new responses. Existing setup, conversation, and provider suites: 22/22 passed; build passed. Dedicated cancellation race coverage and live setup acceptance remain outstanding.

Account sign-out groundwork: added signOutDirectSession using protected-store transactions to serialize against token renewal, bounded official discovery, same-origin revocation endpoint validation, bounded retry, and local token removal even when remote revocation is unconfirmed. Registration is retained. Typecheck passes. This operation is not yet wired to account request shutdown or UI and has not received dedicated acceptance tests; sign-out remains incomplete. Source: https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions. Hosted run 40212590539 for 0d0e5f2 was still pending when checked.

Sign-out integration: owner/admin route now disconnects only providers belonging to the selected actor/account, excludes active responses and concurrent connection changes, invalidates local providers before revocation, and keeps registration metadata. Guided setup includes sign-out for ready and saved accounts and distinguishes confirmed remote revocation from local-only removal. Build and 22 existing tests passed; emitted browser script parsing caught an extra parenthesis, corrected and rechecked successfully. Dedicated sign-out failure/race acceptance and live browser proof remain open. Earlier pushed 0d0e5f2 CI: five checks passed; Windows 22/24 pending.

Release pipeline improvement: every build now parses the exact rendered inline browser JavaScript without executing it. This catches syntax failures hidden inside TypeScript strings. Full local pnpm check passed: 111 test files, 664 passed and 2 skipped, product isolation, build/browser syntax, and package acceptance. Archive privacy inspection covered 214 shipped files. These checks do not establish live OAuth or complete UI behavior.

Setup reconciliation: replaced obsolete subscription catalog/docs with the implemented Windows flow, explicit live-acceptance limitations, restart restoration, and sign-out outcomes. Added a return to the saved-account picker after successful setup without forcing sign-out. Connection catalog tests: 4/4; build and emitted browser syntax passed. Live account-switch acceptance remains open.

Public manifest cleanup: removed 14 legacy research command aliases tied to the excluded research distribution; eight aliases directly referenced missing runner files, and the legacy clean-export wrapper also required absent research assets. No public benchmark requirement was removed. Package surface/privacy verification passed for 214 shipped files. Dedicated account-lifecycle case generation via Kane failed before producing cases with error [object Object]; no generated tests or acceptance claimed. Independent release work continues.

Conversation recovery fix: initial assistant-message persistence now precedes active-run registration and HTTP headers. A storage exception can no longer leave an unstarted response occupying the thread. Stream startup is inside cleanup handling; stopped runtimes also reject planner connection lookup. Existing conversation suite 9/9 and typecheck passed. Dedicated injected storage-failure coverage is still absent; do not infer it from the existing suite.
