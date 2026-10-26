# Full release completion goal

This work order preserves the whole remaining scope. Passing a component check
does not close the goal. No private workspaces, credentials or private product
integrations belong in source, evidence, fixtures or release packages.

| Requirement | Completion evidence | Current gap |
| --- | --- | --- |
| Guided onboarding through first successful task | Clean-install user journey with secure account setup, model validation and successful task | Installed-package browser save/restart/unlock and chat recovery passed; restored-model drafting passed locally; unified first-user task journey still unproven |
| Supported subscription chat and execution | Official client authentication, bounded workspace access, cancellation and reconnect evidence for each advertised route | Direct ChatGPT chat/tool loop, protected Windows sign-in, renewal, restore and sign-out implemented; live lifecycle acceptance and other-platform storage unproven; Claude/Gemini managed workers incomplete |
| Real-model full task completion | Model-generated plan, explicit review, isolated execution, independent checks and useful artifact | One live-model synthetic plan completed browser review, real Docker and final approval locally; exact hosted package passed synthetic-provider browser workflows; unified live first-user acceptance remains open |
| Extensible memory ecosystem | Provider adapters usable by chat and task execution; guided connection, per-project selection, optional composition, migration/export, provenance, deletion and outage behavior; contract acceptance for each advertised adapter | Shared chat/worker contract, read-only Obsidian and Hindsight Cloud adapters, guided encrypted save/restore/forget and simultaneous per-project selections implemented; Obsidian + Hindsight composition and local JSON/Markdown export implemented; full composition behavior, automatic migration and live provider/browser acceptance remain open; JEv remains a decision router |
| Recovery and memory reliability | Crash, auth expiry, interrupted tool, conflicting-memory and duplicate-action cases with durable receipts | Browser streaming reload, persisted completion and local recorded-result restore passed; Docker worker-kill duplicate prevention passed; uncertain-effect resolution, auth expiry and broader faults remain open |
| Measurable differentiation | Frozen held-out workloads, matched model/budget baselines, repeated trials, completion/cost/latency results including failures | Development examples only; no competitive superiority demonstrated |
| Finished public release and launch | Exact-build CI/package hashes, clean distribution, coherent UI/docs, reproducible demo and accurate marketing claims | GitHub v0.1.2 early-access archive is published from cfd876d with seven passing exact-build CI jobs; later integration work is not in that archive. Stable acceptance, demonstration and launch reconciliation remain; npm publication is deferred |

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

## Acceptance backlog — required work, not disclaimers

Every item below is OPEN until its stated outcome is demonstrated. Codex owns
implementation, execution, evidence collection and repair. A failed attempt stays
in the record; fix the cause and repeat that case. Do not close a workflow from a
component test, remove an advertised requirement to pass, or substitute fixtures
for required live acceptance. Only owner authentication may require user action.

For each attempt record: requirement ID, UTC time, exact source commit and package
SHA-256, runtime/provider versions, synthetic input hashes, reproducible command
or browser steps, expected and actual outcome, artifact/log hashes, request/run
IDs, usage/cost (unknown when unavailable), and pass/fail with remaining scope.
Store only sanitized public evidence; never credentials or personal profiles.
An acceptance entry must identify its evidence file, not merely say tests passed.

- [ ] **P01 Clean-install first task.** Install the candidate archive into a fresh
  directory and browser profile. Follow guided owner/model setup, ask for a useful
  artifact, review the actual plan, execute it, independently inspect output and
  approve completion. Save setup screenshots, task journal and output hashes.
  Next: extend the existing live approval journey beyond its predefined fixture.
- [ ] **P02 Real chat execution (live browser task and saved chat presentation proved; unified journey pending).** Use a live model to create a useful artifact
  from synthetic inputs with no embedded solution. Verify output with a separate
  evaluator, record the actual commands and all model attempts, and show the
  result in chat. Evidence: `evidence/p02-useful-invoice-acceptance.json` records a passing real-model invoice task and both rejected attempts. Fresh live planning, browser approval, independent invoice verification, restart and final approval are recorded in `evidence/p02-live-invoice-browser-completion.json`; saved chat rendering has separate evidence. Next: combine these into one installed-package chat-to-task journey. The protocol froze its
  input and evaluator before execution. Existing fixed-file proof is supporting
  evidence only and must not be reported as general task competence.
- [ ] **P03 Recovery matrix.** On that workflow interrupt browser streaming,
  service, worker, and the connection after a tool effect but before its receipt.
  Also expire authentication and introduce conflicting memory. Reopen, recover
  context, reconcile effects, and count executions to prove no duplicates.
  Save before/after journals and independently counted outputs for every case.
  Observed-failure repair of the real P02 artifact now passes browser approval and Docker execution, preserving the original receipt: `evidence/p03-invoice-browser-repair.json`. Next: finish uncertain-effect and authentication-expiry cases.
- [ ] **P04 OpenClaw workflow.** Pair a disposable real installation, select a
  session, review/send one useful task, observe and verify its returned artifact,
  disconnect/reconnect, and Stop an active run with partial-effect inspection.
  Save upstream run IDs plus AgentForge receipts and result hashes. Next: run a
  integrated browser delegation with the live adapter; live arithmetic, invoice artifact, exact-run output, reconnect history and active Stop now have separate evidence.
- [ ] **P05 Hermes workflow.** Repeat P04 using the pinned Hermes installation
  and the registered connector. Include selected API-session continuity and
  credential-change refusal for existing receipts. Verify successful completion
  and cancellation, not only failed-run persistence. Next: connect the already proved live output, invoice task, continuation and Stop into one browser workflow. Other Hermes session types require
  a separate gateway path; do not present API-only discovery as universal pairing.
- [ ] **P06 Model connection matrix.** Inventory every advertised API and official
  subscription route. For EACH record sign-in/configuration, live chat, approved
  tool execution, expiration, interruption, restore, cancellation and sign-out on
  each advertised platform. Add missing implementations rather than counting
  configuration validation as support. Next: complete the ChatGPT live lifecycle,
  then Claude and Gemini managed execution; retain API/MiMo coverage separately.
- [ ] **P07 Memory matrix.** For built-in memory, Obsidian, Hindsight and every
  advertised adapter demonstrate chat and worker retrieval with provenance,
  project isolation, simultaneous-provider composition, export/import migration,
  deletion/forget, conflicting updates and outage recovery. Use synthetic vaults
  and dedicated test accounts. Next: run the composed-provider workflow and
  inspect retrieved source IDs; JEv's router is not proof of a memory adapter.
- [ ] **P08 Guided browser experience.** Execute clean setup, connection selection,
  missing/invalid credential, no sessions, interrupted task, recovered memory and
  verified result flows in the rendered UI. Check keyboard navigation, labels,
  focus and readable errors. Save screenshots and action/results log. Next:
  replace server-only agent configuration with secure guided connection setup.
- [ ] **P09 Held-out differentiation.** Freeze task set, versions, rubric, budgets
  and repeat count BEFORE running AgentForge and matched baselines. Preserve every
  failure/timeout and usage result. Publish reproducible completion, latency and
  cost results with uncertainty; repair product weaknesses separately from the
  frozen evaluation. Next: finish evaluator execution/cost capture, then run the
  frozen suite. Development examples cannot establish competitive superiority.
- [ ] **P10 Exact release and launch.** Once the above accepts the candidate,
  run hosted matrix plus installed-archive/privacy checks on its exact commit;
  reconcile package hashes, merge, publish matching GitHub assets, verify clean
  downloads, hosted demo and documentation, and prepare evidence-backed marketing.
  Include current-build soak and GitHub cache-removal confirmation. npm stays
  deferred by user choice. Next: obtain exact integrated-build hosted results;
  the published early-access archive is not the new candidate.

Execution order: P02 then its P03 faults; P04/P05 successful remote execution and
P08 guided setup; P06/P07 matrices; P01 full clean-install journey; P09; P10 final
acceptance. Run independent hosted checks alongside implementation. Update each
item with an evidence link and next concrete action; never park it merely because
proof is missing. Previous phase summaries remain historical supporting evidence.

## October 25 progress

### Live planning and browser execution regression repair

A fresh post-repair MiMo V2.6 Flash request subsequently passed the complete
browser journey: draft, inspected exact commands, test-authorized browser
approval, network-disabled Docker execution, verified file, service restart,
receipt-preserving recovery, final approval and durable completion. One paid
request reported 751 input and 162 output tokens (913 total); monetary cost was
not measured. The task used synthetic data and a predefined required check,
with the real credential mediated by a local proxy. It does not prove arbitrary
task competence, direct credential setup or external-agent execution.
Raw synthetic provider response SHA-256:
`424338dd1350a7300e36a59fd5fb974c7a787c9dcf39993a78c53f3420e9cf24`.
Reviewed command-array SHA-256:
`c55a4cba22a5e09e8adb7e3e26037bc25ddb218117a801d50ad7d98061842c9a`.

The live compatible-provider probe exposed valid token totals being rejected
when `prompt_tokens_details` was null. Optional null breakdowns now preserve
reported totals without inventing cache counts; malformed breakdowns still fail.
Fifteen provider/accounting regression tests passed locally.

The next browser probe exposed duplicated rendering code inside the task control
handler, which referenced an unavailable `root` and prevented Run from reaching
the server. That duplicate was removed. The browser acceptance now checks the
Run HTTP response and browser exceptions instead of only waiting for task state.
The existing hosted package gate also caught this failure on revision 49f224d;
its six platform unit-test jobs passed, but package acceptance failed.

After repair, both the synthetic provider journey (including null usage details)
and replay of the inspected live provider response passed browser approval,
network-disabled Docker execution, artifact verification, service restart,
recorded-result restoration without command replay, and final approval. The
recorded-response run made zero paid requests and is not a new live-model run.
External delegation/recovery browser acceptance also passed. These are disposable
test tasks, not proof of arbitrary useful tasks or complete external-agent support.

Acceptance script SHA-256:
`5c10aafbad8b2db3e3c0cbde33729a1772691c4b8455820f8863798b144dd686`.
Provider implementation SHA-256:
`ff0009df17b7d5cec142ba8a5179ceb52f43ce55cbfc68535c3137d3fd80daa4`.
Browser implementation SHA-256:
`06014e0a99f74b035063677a011fe6d0d2fbf25c266e7e40808531d9f7f2b0c9`.

Markdown exports now include a versioned AgentForge header. Selecting such a
file through the read-only Obsidian adapter preserves its text, category, tags,
version, creation/update timestamps, archive status and public provenance.
The selected project ID and collection must match the export; scope is never
silently reassigned. Archived exports stay out of default recall. Ordinary and
older unversioned Markdown remain ordinary notes. This is selected-file
portability, not bulk migration, source deletion or automatic project remapping.
Synthetic file round-trip and rejection cases are covered by
`src/providers/memory/portableMarkdown.test.ts`.

The real Docker interruption proof now kills the AgentForge worker after an
approved synthetic file effect, reopens the durable store with a new runtime,
and finds the still-running container by workspace and operation labels. It
rejects both replay and automatic completion of the uncertain receipt, presents
the task as paused, and observes exactly one effect. A different operation ID
finds no container. Fixture cleanup removes its own containers and worktree.
Run `pnpm test:execution:docker-crash`; hosted public-package acceptance now runs
this proof before retaining the release artifact. This covers discovery and
duplicate prevention, not automatic effect reconciliation or recovery UI.

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

Current local conversation execution acceptance passed with a synthetic model and real network-disabled Docker: execute_task, observed receipt, independently checked artifact, and persisted complete response after subscriber disconnection. Artifact SHA-256 008cd021750ace7907b152862d866177e05d8d0f976cfe038cac8e0d8bc146e9. Corrected report instrumentation that previously omitted synthetic disconnection and tool-call fields; rerun reports disconnected=true and execute_task. Zero external model requests. Pre-approved fixed task only, not live planning/UI acceptance. Hosted Windows jobs were confirmed beyond build/tests and restart persistence, finishing package/cleanup steps.

Live execution revalidation on source 92aaef5928cb450c7d159a1927408163aeec6715 passed: MiMo V2.6 Flash, two requests, execute_task, disconnected subscriber, real isolated Docker artifact and observed receipt, persisted complete reply; 17169 ms. Sanitized evidence: docs/conversation-live-acceptance-20261025.json SHA-256 82d17b9d70fb2282398f9cf127d2c9afffe3fc7b4a6e8d98a490d68f2a554fe4. Monetary cost and streaming token usage unmeasured. Fixed pre-approved task, not autonomous planning/browser acceptance. Hosted run 40212948298 completed successfully for 013a243; later local commits are not covered by that CI result.

Streaming usage repair: StreamChunk now carries optional provider-reported cumulative request usage; MiMo and direct ChatGPT adapters forward it. The bounded execution proof keeps the latest report per request rather than summing cumulative events, and marks missing usage incomplete. Typecheck and 22 existing adapter tests passed. Live MiMo V2.6 Flash rerun passed in 12790 ms with two requests: prompt/completion/total 575/24/599 and 3056/229/3285 (3884 total tokens), execute_task, disconnected subscriber, verified Docker artifact. No dollar estimate claimed. Conversation usage persistence/UI and broader provider usage remain unfinished.

Conversation accounting now persists bounded per-request token reports and unknown entries in generation checkpoints, retaining the latest cumulative report without double counting. Responses display reported tokens, report completeness, and unmeasured dollar cost. Typecheck, nine existing conversation tests, build and browser syntax passed. Live acceptance extended to compare provider reports with the reopened store passed: three MiMo V2.6 Flash requests, inspect_task then execute_task, 18943 ms, per-request totals 599/1371/4011 (5981 tokens). No dollar estimate; no claim of crash-during-usage atomicity or browser visual acceptance.

Compatible API streams now forward validated provider usage into the existing conversation accounting path; absent usage remains unknown and no request parameters/billing routes changed. MiMo streams now cancel and release their reader on completion, cancellation or generator exit. Typecheck passed; existing adapter checks run separately from live acceptance. Dedicated interruption and malformed-usage coverage remains open.

Preview deployment attempt: current build and emitted browser syntax passed. Port 3464 was serving PID 21796 with no active responses and no configured model. The guarded command to stop/relaunch that preview against its existing data folder, with execution disabled and integration environment removed, was rejected before execution by automatic policy review (blocked by policy). No alternate bypass attempted; do not claim the preview runs the current build. Source/package work can continue independently.

Memory evidence integrity fix: generation contextMemories now lists only project-memory records whose actual reference message survives context trimming. Previously the UI could claim supplied memory even when the context budget had removed it. Typecheck and nine existing conversation tests passed. This is provenance correction, not proof of improved retrieval quality or dedicated truncation coverage.

Release audit exposed a durability-test hygiene defect: it created an empty prohibited .artifacts tree inside the checkout. Moved the existing test to a unique OS temporary directory with finally cleanup, and removed only the verified-empty local leftover. All 14 migration/E2E tests passed, then release:audit reported packageReady=true and no local package blockers. publishReady remains false; current exact-build hosted evidence/publication and the broader product acceptance requirements are not satisfied by this package audit.

Expanded the existing authenticated connection regression to cover subscription begin/restore/activate/cancel/signout plus status reads. Anonymous requests return 401, viewers 403, denial responses are no-store, invalid saved-account selections return 400, and no subscription credential directory is created. Setup suite 10/10 passed; typecheck passed. This establishes route authorization/invalid-selection behavior only, not successful OAuth, renewal, revocation, or concurrent lifecycle acceptance.

Conversation recovery regression now directly injects initial message-storage failure: no active conversation or committed response headers remain, and a subsequent response completes. It also resolves a pending connection after shutdown and verifies rejection without installing that connection. The nine conversation tests and full typecheck passed. These synthetic faults do not close broader recovery or live onboarding acceptance.

Fixed sign-out cleanup when the protected credential record cannot be read: reading now occurs inside the removal guarantee. A corrupted disposable DPAPI record regression confirms local removal, zero remote requests, and an unconfirmed remote-revocation result. Four protected-session tests and typecheck passed. This does not prove live account lifecycle acceptance; path validation and transaction acquisition remain mandatory before removal.

Protected-session regression also covers sign-out destination validation and account isolation: malicious discovery never receives credentials, the selected record is removed while a second account survives, and a synthetic valid revocation returns confirmed only after HTTP 200. Four Windows protected-session tests and typecheck passed. No live account was revoked. Hosted run 40214404473 for 7c3c80b was observed running; no restart was requested.

Subscription deactivation now aborts in-flight catalog/inference requests and rejects late results, rather than only denying future requests. Failed and cancelled setup attempts discard their tracked connection references. The active-connection regression observes a running request's abort signal after deactivation; three connection tests and typecheck passed. This is synthetic cancellation evidence, not live lifecycle acceptance.

Chat now has search_project_memory for current project-scoped records explicitly tagged chat-context, under the configured memory namespace. It can recover a correction after initial context trimming; results include version, update time and truncation metadata and never grant authority. Archived, unshared and other-project records are excluded; disabled memory rejects access. The conversation tool-loop regression covers retrieval after trimming and these exclusions (nine tests passed), plus typecheck. Search is bounded substring matching; broader semantic recall/conflict reasoning remains unproven.

Owner clarification: memory must remain extensible as new systems appear. Built-in memory improvements alone do not satisfy this requirement. Support adapters and explicit project-level selection/composition without rewriting the agent loop, guided permissions and configuration, provenance and correction semantics across sources, portable export/migration, and safe outage/deletion handling. Hindsight and Obsidian are named integration targets; verify each actual interface before implementation. The existing JEv module is a decision router; do not relabel it as a working memory integration. No private vault or external account is connected by this clarification.

Scoped chat recall now accepts the same MemoryProvider contract used by task workers. Adapter results are independently filtered for namespace, project, archive status and explicit chat sharing; returned sources identify the provider. Selecting an adapter suppresses implicit built-in memory preloading rather than silently mixing sources. A deliberately overbroad synthetic adapter regression verifies the boundary through the conversation tool loop (nine tests passed; typecheck passed). This is programmatic adapter injection, not a finished provider registry, setup UI or Hindsight/Obsidian connector. The preceding combined check passed 111 files / 664 tests, two skipped, build and 214-file archive privacy before this adapter change.

Added a read-only Obsidian selected-note adapter using the shared MemoryProvider contract. Explicit vault/project/namespace/file allowlist; no vault discovery, note mutation or implicit import. Bounded UTF-8 reads, linked-path rejection, source path/content hash, and fresh reads preserve provenance and edits. Synthetic disposable-vault checks passed for selection, project/namespace isolation, updates and traversal rejection. Guided provider setup, write/export semantics and broader filesystem fault coverage remain open. Official reference: https://obsidian.md/help/properties (Markdown YAML properties); Hindsight interface research: https://hindsight.vectorize.io/developer/api/recall (bank-scoped structured recall, not a drop-in raw-document store).

Memory lookup now carries cancellation through the provider contract and has a 15-second caller deadline. The conversation boundary stops waiting even if an adapter ignores cancellation; it does not claim to terminate an uncooperative remote operation. Local providers observe the signal. A hanging synthetic adapter regression proves cancellation releases the caller; 11 focused conversation/memory tests and typecheck passed. No automatic retry or fallback is introduced.

Added Connect notes in the memory view with project/vault/explicit Markdown selection, sharing acknowledgement and disconnect. Owner/admin plus settings and memory write permissions are required; connections cannot change during active responses. Ten setup API tests verify anonymous/viewer denial, acknowledgement, connect/disconnect and unchanged source. Build and emitted-browser syntax pass; no browser interaction proof. The UI explicitly labels this initial path session-only and separate from worker memory/saved records. Persistence, multiple-project configuration and unified worker selection remain required.

Obsidian selections can now be saved in a separate encrypted private file and explicitly restored after restart with an owner-supplied passphrase. Restoring revalidates project and files; replacing saved configuration requires unlocking the existing record. UI explains that session disconnect retains saved configuration. Ten API tests include restart restore, wrong-passphrase rejection and no plaintext vault path; build and browser syntax checks passed. No live vault connected; browser acceptance, forget-saved action, multi-project selection and worker wiring remain open.

Added Forget saved selection: owner unlock is required, encrypted selection contents are replaced with an empty record, and runtime chat memory disconnects. Wrong-passphrase attempts preserve the connection; successful forgetting prevents restoration and leaves the source note unchanged. Ten API tests plus build/browser syntax passed. This is logical removal from the current store, not secure erasure of OS backups or disk history.

The selected project memory adapter now also supplies task-worker planning context. Worker results enforce namespace/project/archive boundaries independently of adapters. Active task executions block source changes; disconnect removes the selected override and restores the worker's preexisting local provider. UI sharing disclosure includes task workers. Twenty-three worker/setup tests and build passed, including selected-source context and restoration of the original source. Multi-project saved selection, remote-adapter deadlines in worker context and browser acceptance remain open.

Chat and task workers now share queryMemoryBounded: 15-second waiting bound, propagated cancellation and no implicit retry. Worker execution passes its stop signal during memory collection and checks cancellation before backend execution; standalone planning context accepts a signal too. A hung adapter regression releases planning on cancellation. Twenty-two worker/conversation tests and full typecheck passed. This cannot forcibly terminate a provider that ignores its signal.

Added a Hindsight Cloud read-only recall adapter against the official OpenAPI endpoint inspected at https://api.hindsight.vectorize.io/openapi.json. Explicit bank/project/namespace/API key; fixed HTTPS destination, no redirects, bounded response and deadline, strict chat-context tag request plus local response filtering. Structured fact IDs and bank/document provenance retained. Synthetic tests cover cross-project no-request behavior, shared-only results and sanitized provider errors. Typecheck passed. No live account request, guided Hindsight setup, retain/delete, self-hosted endpoint or migration acceptance is claimed.

Guided memory setup now offers Hindsight Cloud with bank ID, password-style API-key input, explicit sharing disclosure and a fixed non-private connection-check query. Save/restore uses the same encrypted selection store and shared chat/worker adapter. Ten setup API tests passed with mocked Hindsight responses, checking connection, restore and absence of the key from responses/plaintext storage. Build/browser syntax passed. This is not live Hindsight authentication or browser acceptance; no real bank was contacted.

Memory setup now holds a worker-side change lock throughout validation, encrypted persistence and activation. New task executions and concurrent memory changes are rejected during that interval; the lock releases after either success or failure. This closes a race where a task could start after the initial active-task check. Twenty-three worker/setup tests and typecheck passed, including delayed-change exclusion and failure recovery. The lock is process-local, not distributed coordination.

Encrypted memory selections now use project-specific keys, preserving other projects on save and forget. Restore requires the selected project and checks legacy single-selection ownership. At most 20 saved entries are allowed; existing encrypted-store size bounds still apply. API tests verify two-project preservation and forgetting one without deleting the other; ten setup tests and build passed after correcting a type guard. Runtime still activates one selection through this UI, so simultaneous project activation/composition remains unfinished.

Runtime activation now preserves separate selected memory providers for multiple projects. Chat resolves the source from the current project for each turn; disconnect and forget remove only that project's chat/worker override. Regression coverage verifies that activating another project's source does not redirect existing-project recall, and forgetting one project leaves the other connected. All 32 focused setup/conversation/worker tests and the build passed. These are synthetic integration checks and browser-script syntax validation, not live provider or browser acceptance. Combining multiple sources within one project, migration/export, provider capability discovery and live acceptance remain unfinished.

Public entry-point exports now include both external memory adapters; direct built-package imports verified. Setup labels and current-state documentation reflect separate active project connections. Full check passed 111 files / 664 tests with two skipped, build, package surface and the 216-file npm archive privacy scan. Hosted CI for prior commit 2549e33 passed; this latest source still requires its own hosted result. No live-provider or browser acceptance is claimed.

Added an exported programmatic CompositeMemoryProvider: explicit project/namespace and source aliases, bounded cancellation, defensive scope filtering, source-qualified identities, rank interleaving and whole-query failure if any source fails. Build passed. Kane scenario generation failed with an unreadable service error, so no new generated scenarios or behavioral acceptance are claimed. Guided composition selection, persistence of source sets, conflict/correction presentation and migration remain open. Latest hosted run 40216529503 for 021c094 is in progress; it does not cover this new composition change.

Combined-source integration repair: chat now retains provider retrieval order instead of re-sorting all results by date, and exposes a bounded source identity (provider, original record ID, optional alias) rather than arbitrary adapter metadata. Worker context packets retain that identity in their structured source list. Existing conversation/worker/context regressions passed 25 tests and build passed. This establishes regression compatibility, not new composite behavioral acceptance or conflict resolution. Hosted run 40216529503 remains in progress for its earlier commit; it was not restarted.

Guided setup now offers Obsidian + Hindsight together, constructs both adapters under the same project/namespace, validates the composite before activation, and saves both selections in the existing encrypted project record for explicit restore. Sharing disclosure explains whole-query failure and separate conflicting records. Existing setup regressions passed 10 tests; build/browser syntax passed. These existing tests do not establish combined-path behavioral acceptance, live authentication or browser operation. Dedicated generated coverage remains unavailable following the documented generator error.

Extended the existing Hindsight save/disconnect/restore regression to run for the combined selection as well. Ten setup tests pass, including composite activation and restoration with no API key in HTTP output or plaintext storage. Uses a disposable note and mocked remote response; does not establish combined retrieval quality, process-restart restore, failure behavior or live account acceptance. Hosted runs 40216702767 and 40216529503 were confirmed in progress and left running.

Strengthened the existing saved-memory regression by stopping and reconstructing the server before restoring Hindsight and combined selections. Fresh server starts with memory disabled; model unlock and explicit memory restore recover the expected provider. Ten setup tests passed. This recreates server/runtime objects with the existing test workspace store; it is not an OS-process crash or full disk-workspace reload. Hosted runs 40216862876, 40216702767 and 40216529503 were observed in progress, not restarted.

Broader integration verification at source 84911ec: the synthetic conversation execution acceptance passed a real network-disabled Docker task, subscriber disconnect, persisted response and observed evidence in 2762 ms. Artifact SHA-256 remained 008cd021750ace7907b152862d866177e05d8d0f976cfe038cac8e0d8bc146e9. The independent local HTTP protocol check passed streaming, project context, persistence, duplicate-run/edit/archive guards, cancellation and provider failure. No paid model request was made; these do not prove autonomous planning or browser approval. Package surface plus privacy scan passed for 217 shipped files. Hosted run 40216862876 (28028ff) has passed its package/isolated-execution job; six OS/Node matrix jobs remain in progress. No pending run was restarted.

Local portability improvement: versioned the existing JSON collection export and added a selected-record Markdown download with source/version/project/category fields, current content and tags. This reuses already-authorized loaded records; no external provider or private account was accessed. Build and emitted-script syntax passed after correcting a template quoting error. Browser download acceptance remains unproven. This is manual note portability, not complete remote migration or automatic import.

Public audit repair: audit:completion referenced removed private research ledgers and approval templates. It now inventories the public release requirements and evidence gaps without requiring those files. Source-document inventory passes, but goalAchieved remains false and the command exits nonzero because it does not yet independently verify requirement-level acceptance. This is not a bypass to green completion. release:audit reports packageReady true and publishReady false; exact-commit hosted proof and registry provenance remain missing. Hosted runs for 3612d24 and 021c094 completed successfully; newer runs remain active.

Extended the existing scoped retrieval regression through CompositeMemoryProvider using a real disposable Markdown note and mocked Hindsight transport. It verifies both returned contents, distinct source-qualified identities, source metadata passed through memorySourceIdentity, cross-project/cross-namespace no-request behavior, and whole-query rejection on a remote authorization failure without echoing its body. Twenty-four memory/conversation/worker tests and full typecheck passed. This closes those synthetic composition checks only; cancellation stress, live-provider quality, browser operation and full migration remain open.

Setup usability repair: corrected the raw browser template's newline splitter, which had matched literal escape text instead of actual line breaks in the Obsidian file list. Added active project-source status from the existing chat status endpoint and mutation response, with stale initial-read protection and explicit unavailable-state copy. Build/browser script parsing passed before the final stale-read guard edit; rendered interaction acceptance remains open. No external source or private data was accessed.

Setup form now holds input/select controls fixed during asynchronous memory changes and clears entered API key/passphrase after success. Full check passed 111 files / 664 tests with two skipped, build/browser syntax, public surface and 217-file archive privacy; the final UI change was included in the emitted build. No browser interaction acceptance claimed. Hosted 32259bd passed package plus macOS/Linux jobs while Windows jobs remained live; existing jobs were left running.

Benchmark measurement repair: runner now measures each attempt with a monotonic clock, including thrown failures, instead of trusting callback latency or assigning failed attempts zero time. Empty suites are rejected; structured expected values use deep equality. Existing benchmark regression extended with a controlled clock to verify failed-attempt latency and empty-suite rejection; four tests passed and typecheck passed before the regression extension. This improves measurement integrity but supplies no held-out competitive result. Earlier latency figures from this generic runner are not directly comparable to the revised end-to-end clock.

Benchmark provenance defect repaired: default MODEL/HARNESS evaluators are simulations, not execution of the named target. Results now declare executionKind; default package checks are local-validation. Simulated, local-validation and legacy unclassified results cannot establish target compatibility or qualify empirical routing as MEASURED. Explicit executor results remain eligible, but the caller must still provide a real evaluator; this label is not cryptographic attestation or held-out proof. Updated existing integration expectations to the honest unqualified fallback. Twenty-nine benchmark/master/migration tests and full typecheck passed. No competitive advantage is asserted.

Quality-report input repair: the in-memory drift evaluation route previously supplied 100% pass rate, 200 ms latency, zero safety incidents and invented successful cases when measurements were missing. It now requires finite bounded rate/latency, nonnegative integer safety counts and explicit nonempty boolean case results. Existing endpoint regression verifies rejection of missing measurements and acceptance of explicit synthetic measurements; five tests and full typecheck passed. Persisted local production mode continues to reject manual evaluations until a reviewed source is connected. This does not authenticate an upstream evaluator or prove a competitive result.

Benchmark deadline repair: case timeoutMs was previously unused. The runner now validates deadlines (1–300000 ms), bounds each awaited case, passes an AbortSignal to custom executors and counts timed-out attempts as failures with their elapsed time. Cleanup clears the timer and signals cancellation. Existing benchmark execution regression now includes an unresponsive synthetic evaluator; four tests and full typecheck passed. This bounds waiting, not arbitrary synchronous CPU loops or external operations that ignore cancellation. There is no automatic retry.

Benchmark evidence repair: results now carry per-case passed/mismatch/error/timeout outcomes and observed duration, plus a SHA-256 of the suite snapshot. Target callbacks receive copied inputs so they cannot alter later expected values through shared references. Removed the nonexistent memory:// summary artifact link; this runner does not create a downloadable file. Fifteen benchmark/extension tests and full typecheck passed. Evidence is in the returned/stored result, not a crash-durable attempt journal; held-out independence and cost accounting remain open.

Evaluation cost accounting now accepts optional nonnegative finite executor-reported USD per completed attempt and preserves null for missing/failed/timed-out cost. Aggregate reported cost remains null if any attempt is unknown or the sum is nonfinite. It is explicitly reported cost, not independently reconciled billing. Fifteen benchmark/extension regressions and typecheck passed; the benchmark regression additionally verifies timeout cost remains unknown. Live evaluator wiring and billing reconciliation remain unfinished.

Empirical routing repair: every route request reloads stored runs, but history previously appended duplicates indefinitely. History now snapshots the first record per run ID, validates nonnegative integer case totals and requires exact target ID/type plus executor provenance. Matching a model name alone no longer transfers evidence between different targets. Twenty-nine affected integration checks and full typecheck passed; the existing routing regression additionally verifies duplicate run ingestion cannot replace the original evidence. This does not establish benchmark relevance to every task family or target-version freshness; those limitations remain.

Migration audit found the generic provider still plans from a bundled fixture rather than supplied memory exports. It also counted unimplemented channel imports and verified a hardcoded agent instead of the run. Corrected supported/unsupported planning counts, dry-run failure for missing handlers, actual created count and run-specific agent-identity verification; partial/unknown runs no longer pass. Fourteen migration regressions and typecheck passed before the final UUID/explicit status adjustment. Run tracking remains process-local, and genuine memory manifest import is still required; no real migration was performed.

Collection import now has a local JSON review/confirmation flow and authenticated memory-read/write API. The reviewed archive is bound to a digest of the exact records and current add/unchanged decisions. Changed batches and stale previews require review again. Imports preserve full records/revisions, refuse missing/archived projects and conflicting identities, never remap projects, and commit the batch plus audit hashes in one workspace snapshot. Identical reviewed reimports are no-ops. Four storage regressions plus a real HTTP boundary regression passed, including disk reopen, failure rollback, access denial and confirmation enforcement. Full typecheck and build/browser syntax passed. This supports version-1 AgentForge exports up to 100 records/1 MiB; it is not arbitrary third-party migration, and rendered browser interaction remains unverified. Prior exact-head hosted run 40230895666 (a7a1add) completed successfully; these new changes require their own hosted run.

Import validation follow-up rejects category arrays rather than coercing them to strings. Added malformed record/history, schema/size/count/duplicate, snapshot ownership and reordered-key replay tests. A real two-store concurrent-writer test confirms stale imports roll back without erasing the first writer or emitting success notifications. The affected suites total 17 passing tests; full typecheck passed before the final concurrent-writer test addition. Browser acceptance is still outstanding.

Subscription CLI planning now requires exactly one terminal successful turn and rejects failed, unknown or post-completion events even when plan text looks valid. Seven synthetic process-protocol tests passed, including missing/duplicate completion and no automatic retry; full typecheck passed. This fixes false-success acceptance, not official-client authentication, private-read isolation or live subscription lifecycle proof.

Shared model-plan validation now rejects null/non-object entries and bounds drafts to the approval route's 100-command / 20,000-character-per-command limits, with 200-character check labels. Previously these could be saved as drafts that could not be approved or fail with a generic property-access error. Eleven planner regressions and full typecheck passed. This is draft validation; execution still requires explicit human approval and the existing execution guards.

Planning failure accounting now has direct regressions for deadline cancellation with late provider success, reported usage on a failed response, and refusal to invoke a provider when its starting audit cannot be persisted. All three tests and full typecheck passed. A timed-out response is not adopted later, unknown usage stays unknown, and no automatic retry occurs. These are synthetic provider tests, not live billing reconciliation or process-crash proof.

Memory collection migration now permits explicit project-to-project mapping during review, including exports from another installation. Missing destinations still fail; shared records remain shared. The mapping is bound into the reviewed digest, shown before confirmation, retained in record provenance, and replayed identically without duplicate writes. Changing destination after import conflicts rather than silently moving an existing record. Thirteen focused tests passed, including HTTP confirmation and disk reload of a mapped record. Full typecheck and build/browser syntax passed before the final HTTP test extension. Rendered browser interaction remains unverified; this supports AgentForge JSON exports, not arbitrary third-party formats.

The launcher now exposes the existing Claude plan-only adapter through explicit host-selected configuration (`claude-cli`). Configuration rejects extra fields including credentials, relative paths and oversized/non-file input. A configuration regression and build/browser syntax passed; full typecheck passed before the regression addition. No account or executable was touched by the configuration test. Live inference, effective isolation, guided browser setup and full managed-worker acceptance remain unproven; the route is documented experimental and retains approval before execution.

Claude account-status checking now uses the same immutable host configuration selected by the launcher, rather than requiring separate duplicate environment settings. An authenticated HTTP regression verifies configured-but-signed-out status, anonymous denial, no-store responses and rejection of browser attempts to select executable/profile paths. Full typecheck passed. The official account inspector was mocked for this regression; no live account or inference was accessed.

Direct browser regression (authorized automated-test route) now proves strict owner setup, project-mapped memory import, review before write, confirmation and rendered memory with no page errors. Extending it through reload exposed a real UI defect: the collection reset to general while data remained saved. The selected collection is now remembered in browser preferences; the browser regression passes through reload. Run `pnpm build`, set `AGENTFORGE_BROWSER_EXECUTABLE` to an installed Chromium-compatible executable, then `pnpm test:memory:browser`. It uses a fresh browser context and synthetic temporary workspace; it neither accesses a personal browser profile nor calls a model. This closes this memory UI flow only, not complete model setup or first-task acceptance.

Hosted public-package acceptance now installs pinned-tooling Chromium and runs the synthetic memory browser regression before packaging the release. It retains the rendered screenshot as a separate CI artifact. Local browser execution already passed; hosted execution of this new workflow step must still be observed before claiming cross-environment browser acceptance.

P03 invoice worker/store reopen acceptance passed. The reviewed live-model plan
ran once through TaskWorkerRuntime and produced the independently checked invoice
report. Reopening WorkspaceStore and recreating the worker preserved the observed
receipts and artifact. Both explicit reconciliation and a subsequent executeTask
request restored the saved result without another backend execution (count=1).
Evidence: evidence/p03-invoice-worker-recovery.json. Reproduce with
scripts/useful-task-recovery.mjs and the retained reviewed plan/digest. This is
worker/store reopen evidence, not a process crash or browser proof; those P03
cases remain open. No new provider request was made for this recovery test.

P03 post-observation process interruption passed: the invoice worker deliberately
exited without shutdown/finally cleanup after recording its observed result.
A fresh Node process reopened the workspace, restored the result through
executeTask, preserved receipt/artifact hashes, and made zero backend execution
calls. Evidence: evidence/p03-invoice-process-recovery.json. The first recovery
attempt failed because the test backend omitted getReadiness; that harness method
was added and the SAME saved task recovered without re-executing the workload.
This closes the post-observed-receipt process-exit case only. Kill during execution,
post-effect/pre-receipt uncertainty, browser recovery and other P03 cases remain.

P03 post-effect/pre-result-receipt interruption safety passed. The real Docker
invoice execution completed, then its host process exited before returning the
result to TaskWorkerRuntime. A fresh process preserved the started receipt and
artifact, refused executeTask replay and refused observed-result reconciliation.
Recovery made zero backend execution calls; independent artifact validation passed.
Evidence: evidence/p03-invoice-uncertain-effect.json. This closes duplicate-action
prevention for this interruption point, not user resolution of the uncertain
outcome. A reviewed reconciliation path for incomplete receipts remains required;
never infer complete execution from a correct artifact alone.

P02/P03 invoice browser workflow passed through the built AgentForge service:
guided task creation, recorded live-model plan review, authenticated approval,
explicit Run, real network-disabled Docker, independent frozen invoice checker,
service restart, recorded-result restoration with unchanged receipts, final
approval and durable completed status. This reused the accepted live plan with
only its required-check label mapped to the UI contract's unit_tests type; command
text was unchanged. Zero new paid requests. The first browser attempt stopped
before execution on an obsolete verified.txt assertion; fixing that harness
assertion to the chosen artifact path produced the passing run. Reproduce using
AGENTFORGE_BROWSER_INVOICE_PROOF=1 and AGENTFORGE_BROWSER_RECORDED_RESPONSE with
scripts/approval-browser-acceptance.mjs. This proves the task UI, not conversational
chat-result rendering or a new live-model first-user journey; those remain open.

Invoice browser proof is now self-contained: set AGENTFORGE_BROWSER_INVOICE_PROOF=1
and AGENTFORGE_BROWSER_EXECUTABLE, then run pnpm test:approval:browser. The default
recorded plan comes from the committed P02 evidence, with original reported usage
and no new paid provider request. The successful browser evidence is saved at
evidence/p02-p03-invoice-browser.json with source revision and runner hash. Hosted
CI now includes this case; its next run must pass before claiming hosted acceptance.

Historical eight-hour service soak completed: 97 samples, zero failed probes, elapsed 28,800,350.8709 ms. Tested archive SHA-256 was 059a26c5b318251f545bb5dd16918db839030317d60f4caec8d1bccd3d6eb43f, NOT the current candidate. Full journal: evidence/historical-eight-hour-soak.jsonl (SHA-256 f756603db178002dc9d04ef74dab5a9e64905dc36fa63aa711c79af78fa949c9). P10 current-build soak remains open; do not transfer this result to subsequent code.

P02 live chat output retrieval passed on build 5af4d4b. MiMo v2.6-flash made two
provider requests, called read_task_artifact, and returned all five invoice groups
and all three summary counts correctly against the frozen independent oracle.
The task was not re-executed. Evidence: evidence/p02-live-invoice-chat.json.
This proves real-model result retrieval through ConversationRuntime and persisted
chat, not browser rendering of this answer or a fully live first-user journey.
The 15 focused conversation/output tests and typechecks passed. Hosted run
40279938374 failed at proof provenance collection in the installed-package test:
the harness incorrectly queried Git in the consumer directory. Fixed to identify
the runner checkout separately from the installed package; run 40280825006 tests
that correction. This is not recorded as a product execution failure or CI pass.

Approval integrity regression found and repaired: adding reviewer provenance to
an evidence pack left its old hash, so completed output failed intact-evidence
reading. Approval now checks the original hash before consuming a pending decision
and seals the updated evidence after recording provenance. Two targeted regressions
cover valid completion and tampered-evidence refusal without consuming approval.
Browser invoice approval/restart completed on b4636de, and its saved completed
output was independently reopened and read with the hardened artifact reader.
Evidence: evidence/p02-invoice-final-approval-integrity.json. The browser harness
now checks this boundary on every run. Older affected records are not blindly
re-sealed; their reconciliation remains open.

Hosted run 40280825006 completed successfully: all seven jobs on exact commit 5af4d4ba7648bceae99ac5cc9e89c225ab4fbe43, including installed-package browser acceptance. Later evidence-integrity changes require their own hosted result.

P02 browser presentation checked: the persisted live MiMo invoice answer renders
as a five-row table in Messages, and reloading preserves the conversation text.
Fresh browser profile, copied synthetic workspace, no new model requests or task
execution. Screenshot visually inspected; result and screenshot are stored at
evidence/p02-invoice-chat-browser.json and evidence/p02-invoice-chat-browser.png.
The first harness attempt used the wrong navigation label (Conversations rather
than Messages) and timed out before inspecting chat; corrected selector passed.
This closes the saved-answer presentation case, not a single uninterrupted live
first-user journey. Full local suite at b4636de: 141 files, 828 passed, 2 skipped.

Historical approval recovery is implemented as a narrow store operation used by
same-conversation artifact reading. It accepts only completed tasks whose approved
reviewer/source match the saved decision and whose evidence hash validates after
removing exactly the two historically appended approval fields. It does not repair
changed outputs, unrelated metadata, mismatched reviewers or unapproved tasks.
On a copy of the actual older invoice browser state, the original integrity failure
was confirmed, repair persisted, the reopened output passed its hash check, and
execution receipts remained byte-identical. No execution or original-record edit.
Evidence: evidence/p03-historical-approval-recovery.json. Twenty focused tests,
full typechecks and build passed. This repairs this known record defect only;
started receipts with an unknown outcome still require separate reconciliation.

P03 interruption work: production Docker launcher now writes operation-bound output
to a host-only execution-results journal before returning the backend result.
The journal flushes the file, refuses overwrite, validates request/task/worktree
identity and a payload hash, bounds record size, and refuses placement inside the
execution worktree. Seven journal/backend regressions and full typechecks pass.
This is the durable-result foundation, not completed uncertain-effect recovery:
reviewed retrieval, surviving-container checks, current artifact validation, and
reconstruction of pending approval still need integration and crash acceptance.
Started receipts remain quarantined; no automatic replay or completion added.

P03 durable-result recovery is now connected to the authenticated receipt-review
route and task review UI. Recovery reads the operation/request-bound host journal,
refuses surviving containers, compares current Git changes/artifacts/revision with
the recorded result, rechecks the current task and required checks, and creates a
pending final human approval. It does not run commands. Even formerly automatic
contracts retain that review requirement when restoring an observed recovery.
Real Docker invoice test deliberately exited after backend completion before its
worker receipt. A fresh process recovered the result with execute replaced by a
throwing counter: zero executions, independent invoice checker passed, pending
approval persisted through reopen, and repeated recovery was refused. Evidence:
evidence/p03-invoice-journal-recovery.json; reproduce with the crash mode of
useful-task-recovery.mjs then invoice-journal-recovery.mjs. Eighteen focused tests,
full typechecks and build passed. Browser interaction and negative-path coverage
for the new reviewed recovery action remain required before release acceptance.

P03 reviewed recovery browser case passed on a new real-Docker invoice crash:
authenticated owner opened recorded execution, selected Recover durable result,
and received waiting_approval with one pending decision and zero execution calls.
Reopen preserved pending approval; no browser errors. Evidence:
evidence/p03-invoice-browser-recovery.json. Additional probes reject changed
artifact contents and a simulated surviving container; evidence:
evidence/p03-recovery-negative-cases.json. Four runtime regressions cover failed
verification, concurrent task changes, overlapping recovery (one approval only),
and preserved human review for originally automatic tasks. Full typechecks pass.
These close the stated recovery cases, not the entire P03 matrix (authentication
expiry, conflicting memory and broader shutdown combinations remain).

P03 recovery HTTP regression now checks anonymous access, missing permissions,
stale snapshots and expired sessions are refused before invoking recovery; a valid
reviewer reaches recovery and errors are sanitized. The self-contained hosted
runner materializes the committed reviewed invoice plan and synthetic input,
expects abrupt process exit 74, then opens fresh authenticated browser recovery
and runs the independent invoice oracle. Local run passed with zero recovery
executions and zero new paid requests. CI now runs this case on Linux alongside
existing browser acceptance; hosted result remains pending.

P03 live conflicting-memory recall after store reopen: two equally dated/versioned
synthetic records disagreed (USD 1200 vs USD 1800). First MiMo response identified
both and created no task, but overstated search completeness. Strengthened chat
guidance that bounded retrieval cannot prove absence of other records/revisions.
Follow-up live response identified both sources, declined to pick a winner, and
explicitly acknowledged that limitation; no task created. Two provider requests
per attempt. Both retained: evidence/p03-live-memory-conflict.json and
 evidence/p03-live-memory-conflict-followup.json. Ten conversation regressions,
full typechecks and build pass. This proves one live conflicting recall case,
not all model/provider conflict handling. Hosted run 40282398037 passed all seven
jobs on 4d7273c; subsequent changes require their own hosted result.

P05 output path implemented from the pinned Hermes image's primary Python source:
api_server_runs.py _handle_get_run returns owned run status, and completion writes
its final_response into output. Hermes transport now explicitly retrieves at most
60 KB of text only for the exact completed saved run. Authenticated task UI offers
Read external result; server binds the connection/run to the persisted receipt and
rechecks it after reading. Output is reference data, not local verification, and
is not automatically persisted as workspace transcript. Thirteen focused tests
and build passed; HTTP regression additionally checks anonymous denial, caller
run-ID override ignored, unchanged local task status and no content/credential
persistence. Full typechecks pass. Real successful Hermes model execution and
browser acceptance of the output action remain open; fixture tests do not close P05.

### P05 live runtime result — 2026-10-26

The pinned Hermes runtime completed a live MiMo calculation and returned the expected 1250. Evidence: vidence/p05-hermes-live-runtime.json (SHA-256: 4baf42f49b3d7b34640f63ba511ff6418e7382ef6440590cd0a6142fce146d75). The prior authentication failure is retained in the attempt record. This closes the direct live-runtime probe only: the registered AgentForge connector workflow, selected-session continuity, credential-change refusal, reconnect and cancellation remain required. The acceptance runner now rejects non-completion and an incorrect total instead of exiting successfully on a failed run. Hosted CI run 40283094567 passed for 2567554ba7ea136eebe934eba8a97439b685048f; it does not cover these subsequent changes.

### P05 restart failure — 2026-10-26

The real saved Hermes run returned HTTP 404 after restarting its disposable container through the registered AgentForge connector. Evidence: evidence/p05-hermes-connector-reconnect.json. No task submission was made by the reconnect probe. The first diagnostic attempt discarded the response detail; the second preserved the 404. The image creates an anonymous /opt/data volume, so the harness now distinguishes that from prohibited host bind mounts. This failure remains open: investigate upstream run persistence and preserve AgentForge receipts without replaying the task. Runtime logs also show a blocked execute_code attempt during the earlier calculation; the final numeric answer is not proof of successful tool execution.

The transport now bounds response bytes before JSON parsing and refuses partial/interrupted completion output. Thirteen connector tests and the production build passed locally. These changes are not yet exact-package acceptance.

### P05 durable submission correction — 2026-10-26

Pinned upstream api_server_runs.py persists run status only for runs registered with an Idempotency-Key (_set_run_status and submission reserve). The earlier direct probe omitted that key; the production HermesRunTransport already supplies it. Corrected the direct acceptance runner, retained the failed 404 evidence, and ran a new synthetic calculation. It completed with 1250 after five model requests. After stopping and starting its container, the production configured connector read the exact run output, listed its API session, and a fresh connector instance read the same output without any new submission. Evidence: evidence/p05-hermes-idempotent-run.json and evidence/p05-hermes-idempotent-reconnect.json (reconnect SHA-256 f84ca5296d1e67cffe12f95538a7a35ccf38eed218258a8064c3bc34765b6ff9). This resolves the direct probe's restart failure; governed UI approval, cancellation, selected-session continuation, and exact package proof remain open. No successful tool-execution claim is made from arithmetic text.

### P05 governed live continuation — 2026-10-26

Real Hermes and MiMo passed the production control-plane workflow with a synthetic reviewer. AgentForge refused pre-approval dispatch, persisted an accepted run, reopened its workspace, refused duplicate dispatch and a changed connection binding, and observed completed upstream output. The selected API session retained the prior 1250 total and returned 1300 after a request to add 50 without repeating the prior number in the follow-up prompt. The local task stayed paused with no evidence pack. Evidence: evidence/p05-hermes-governed-continuation.json (SHA-256 cbc9f0e56ce5759e2bf87bd8ec3694cbcfc836fde030dc6ec66e2f81d1961819). This is not a browser human-review proof, successful tool-execution proof, or cancellation proof. The live harness permits at most twelve provider requests only when this additional case is explicitly enabled, otherwise six. Source base: 9b4538e; runner additions in this entry's commit. Hosted CI for 9b4538e remained in progress at this check.


### P05 live cancellation — 2026-10-26

A real Hermes text-only run was observed active, Stop was acknowledged, and subsequent observation reached cancelled. AgentForge retained paused local status, refused repeated Stop after workspace reopen, and refused completed-output retrieval from the cancelled run. Evidence: evidence/p05-hermes-live-stop.json (SHA-256 56798f9949555afcf22aeec6d4def02bff838271783adbf1bd50d2eccdb5ab2e). The first harness attempt was stopped by stale-store protection before cancellation dispatch; evidence/p05-hermes-stop-harness-failure.json records that failure and its repair. This does not establish cancellation of tool side effects or browser human-review acceptance.


### P05 runtime tool record — 2026-10-26

Read-only inspection of the disposable Hermes session database confirms the selected arithmetic run first received a blocked execute_code result, then issued a terminal Python calculation with a matching tool-call ID, output 1250 and exit code 0. Evidence: evidence/p05-hermes-terminal-execution.json (SHA-256 857dd9dc21957aba76f90321ae9ac6393c5606a55d0fbdf9d4da18bfc07ca462). The verifier exports only the selected synthetic command/result and a database hash, excluding credentials, configuration and system prompts. This proves one actual arithmetic tool execution, not the still-required useful artifact workflow or cancellation of tool effects.


### P05 useful invoice artifact — 2026-10-26

Hermes generated the invoice report through its real model and tools. The host independently copied the actual file and passed the frozen invoice checker; a separate copy/hash check confirmed unchanged input. Evidence: evidence/p05-hermes-invoice-artifact.json (SHA-256 903c3fdf0cc6ca51e67123854ba500bb8790b2ef3ffca15184fc809e8c4098fb). First failed attempt retained in p05-hermes-invoice-attempt1.json. Corrected paths use the existing permitted /opt/data directory and eight turns, without weakening runtime controls. This direct runtime case does not close the unified browser workflow or tool-effect cancellation.


### Hosted archive checkpoint — 2026-10-26

All seven jobs passed for 9b4538e in run 40284746678. Downloaded CI archive hash independently matched 686294ae27e39aa2f3b89238f6aa33d751510173266d09ca307b4979a778c448. Evidence: evidence/hosted-ci-9b4538e.json. Current local public privacy tests passed 27/27 and the archive boundary inspected 464 files without private signatures. Later proof records require the next hosted build; this checkpoint does not close the release backlog.


### P03 recovery journal placement — 2026-10-26

Journal placement now validates canonical filesystem paths before execution and on save/read, rejecting directory links into the task workspace. Twelve focused tests and build passed. Real Docker crash output recovered through authenticated Chrome with zero execution during recovery, independent invoice verification, and pending approval retained after reopen. The initial browser launch failed because bundled Chromium was absent; recovery continued against the same saved run using installed Chrome, not by repeating execution. Evidence: evidence/p03-journal-placement-recovery.json.


### P07 selected-note lifecycle — 2026-10-26

Actual temporary Markdown files passed selected-file isolation, visible edit with stable record ID/new content hash, missing-file failure, restored content in a separate process, project isolation, and disconnect without deletion. Evidence: evidence/p07-obsidian-lifecycle.json (SHA-256 eafaf0ee1584f93f507183b1b78df48e05a844c6f98e1b0316c41440256e99fa). This is local adapter acceptance, not the Obsidian application UI or live Hindsight/composed-provider acceptance. Those requirements remain open.


### P07/P08 browser memory lifecycle — 2026-10-26

Extended the hosted memory browser acceptance to perform visible synthetic model setup, connect a selected local note, save encrypted selection, clear secret fields, disconnect, restore, and forget without modifying the note. Real installed Chrome passed with no page errors. The first attempt correctly refused setup before a chat model existed; the harness now includes that visible prerequisite. Evidence: evidence/p07-memory-connection-browser.json. This is same-process restore and does not establish server-restart or live cloud composition.


### P07/P08 memory-first setup fix — 2026-10-26

Removed the unnecessary model-configuration prerequisite for project-scoped memory selection. Shared connection-change exclusion and active-response protection remain. Eleven conversation tests and build passed; real Chrome completed note connect, encrypted save, disconnect, restore and forget before any model was configured, with zero page errors. The browser harness now exercises this simpler sequence directly. Earlier evidence p07-memory-connection-browser.json describes the previous model-first prerequisite; this entry supersedes that setup limitation. Hosted run 40285759568 passed for 7fb2493 before these newer changes.


### P07/P08 encrypted selection after server restart — 2026-10-26

Real Chrome acceptance now stops the server, constructs a fresh server from saved workspace/settings, reloads, verifies no active selection, rejects a wrong passphrase, explicitly restores with the correct passphrase, and forgets without modifying the note. Encrypted file excludes plaintext vault path and passphrase. Evidence: evidence/p07-memory-browser-server-restart.json (SHA-256 267d837d92610875cfc796726ebcf494daabd41e3f78cf967164aba9f85d334b). This is server reconstruction in the same Node process, not an OS process-kill claim. The case is part of the hosted and installed-package browser acceptance runner.


### P07/P03 process-death restoration — 2026-10-26

A dedicated synthetic owner saved a selected-note connection encrypted. The acceptance forcibly terminated the server child, launched a distinct process from disk, signed in again, observed no active memory source, rejected a wrong passphrase, restored with the correct passphrase, and verified unchanged note content. Evidence: evidence/p07-memory-process-recovery.json (SHA-256 7dbee44cfa9e094b18eaede932f5e0c0929eacfcebd09d0f0a6370a5bfe6e62b). Added to all six hosted OS/Node combinations with retained evidence. The initial harness setup collided with the default owner username before any server launch; corrected to a unique synthetic owner. This authenticated HTTP case complements, but does not replace, browser and remote-provider coverage.


### P06 subscription route reconciliation — 2026-10-26

Confirmed current start.ts registers opt-in claude-cli planning with explicit configuration, while Gemini currently has preparation/protocol helpers but no registered planner. Corrected the setup catalog's stale Claude external-client-only label without claiming chat or managed execution. Eight Claude configuration/planner tests passed. Neither official executable was found on this process PATH; this is not evidence that no installation exists elsewhere or that an account is authenticated. Live lifecycle, Gemini integration and managed execution remain required.


### P06 Gemini opt-in planner integration — 2026-10-26

Added GeminiCliPlanner and registered AGENTFORGE_PLAN_PROVIDER=gemini-cli with AGENTFORGE_PLAN_GEMINI_CONFIG pointing to an explicit configuration containing bundlePath, homeDirectory and model. Uses the prepared dedicated Google-login profile, no inherited API credentials, fresh working directory, bounded child execution, deny-tool policies, disabled extensions/MCP, strict transcript validation, and existing plan validation. Twenty-five protocol/adapter tests and production build passed. Official reference: https://geminicli.com/docs/reference/policy-engine/ and https://geminicli.com/docs/reference/configuration/. These are requested client controls, not verified isolation. No live account login, policy-enforcement proof, managed command execution or streaming chat is claimed. Authentication-file presence is not treated as successful sign-in proof; the official client consumes its own credential. Live acceptance remains required.

P06 official Gemini 0.65.0 check on Windows: advertised controls passed, but temporary system settings were rejected for ownership. User-scoped authentication mismatch rejection passed with a synthetic profile. Evidence: evidence/p06-gemini-settings-ownership.json. The current planner settings route needs replacement and actual enforcement proof; no live authentication or inference is claimed.

P06 correction: Gemini profile preparation now writes disabled extension/MCP/skill controls into the dedicated user settings, and planning checks them before launch. The adapter no longer supplies an ownership-rejected temporary system settings file. Missing restrictions reject before capability inspection or client launch. Actual user-scope authentication enforcement passed against 0.65.0; full live inference and tool-policy enforcement still require proof.

P06 actual policy-engine proof found and fixed a malformed MCP rule: missing toolName invalidated the policy file and read_file remained allowed. Corrected production policy now denies shell, read, write, web-fetch and synthetic MCP requests in the official 0.65.0 PolicyEngine. Reproducer: scripts/gemini-policy-engine-acceptance.mjs. Evidence: evidence/p06-gemini-policy-engine.json retains failed and passing outcomes. This is engine-level proof, not full CLI/live authentication acceptance.

P06 regression protection: scripts/gemini-pinned-policy-acceptance.mjs fetches official Gemini 0.65.0, verifies its pinned SHA-512 before extraction, and runs the production policy through its actual engine. Fresh-download local Windows execution passed for all five denied tools. Added to all six hosted OS/Node matrix jobs; hosted outcome pending. No account, model request or tool execution is used.

P06 interrupted Gemini accounting: preserve validated usage reported in a bounded child failure while rejecting the interrupted plan and making no automatic retry. Focused cancellation regression passed; typecheck passed. Subscription catalog now accurately describes the opt-in planner and remaining live/full-client acceptance.

Hosted run 40288267608 revealed Gemini planner tests rejected macOS temporary-directory aliases. Profile preparation now returns its physical filesystem path and planner fixtures use physical paths. Redirected profile rejection stays intact. Added a real directory-alias regression covering returned path selection. Hosted rerun required.

P06/P10 installed-package setup: actual npm archive installed into a fresh consumer directory; its CLI created the restricted Gemini profile, returned its physical path, created no credential file, and rejected repeated setup without altering settings. Full package CLI acceptance passed locally. Public package privacy check also passed (470 shipped files); this does not close live account acceptance. MODEL_CONNECTIONS now documents the opt-in Gemini configuration.

Hosted run 40288543433: public installed-archive acceptance plus both Linux and both macOS matrix jobs passed at observation; Windows jobs still active. Downloaded archive COMMIT matched c7ee2318c33bf8b59ea3e658055f7d8fcd93e58b and recorded SHA-256 in evidence/hosted-ci-c7ee231.json. This confirms the macOS path correction on hosted runners, not completion of the full release goal.

P04 live disposable OpenClaw attempt exposed an actual scope mismatch: suppressCommandInterpretation requires operator.admin in upstream 2026.10.7, while the adapter requests read/write. Gateway authenticated but rejected send; zero provider requests. Evidence: evidence/p04-openclaw-live-permission-failure.json. Do not remove command suppression merely to obtain a passing call. Fresh container stopped; no private mounts.

P04 fixed scope mismatch with explicit task-delegation opt-in requesting admin, verifying actual grant before send, and binding receipts to this authority choice. Command suppression remains on. 26 focused tests passed; built adapter completed a real OpenClaw/MiMo synthetic turn, one provider request, correct 1250-cent result and matching run receipt. Evidence: evidence/p04-openclaw-live-response.json. Browser review, useful artifact execution, reconnect and cancellation remain open.

P04 restart proof: disposable OpenClaw gateway stopped and restarted; fresh adapter recovered exactly one assistant reply matching the prior run ID and correct 1250-cent result, with no submission method invoked. agent.wait returned timeout after restart; this is history recovery evidence, not terminal run-state recovery. Evidence: evidence/p04-openclaw-reconnect-history.json. Reproducer: scripts/openclaw-reconnect-acceptance.mjs. Live runner's arithmetic assertion escaping corrected before further runs.

P04 recovery fix: external receipts retain up to 16 status transitions; identical repeated polls do not evict earlier reports. Reopen regression covers timeout, ok, restart, repeated timeout while retaining prior ok and keeping local task paused. Workboard displays previous report separately from latest status. Five external-dispatch tests and typecheck/build passed; rendered UI acceptance remains pending.

P04/P08 real-browser acceptance passed for preserved prior status after reload, stop persistence, no Resume/replay, exact delegation review and stale session rejection using a synthetic runtime (zero model calls). Visual inspection also exposed misleading resume guidance; delegated tasks now instruct inspection and verification without resubmission. Evidence: evidence/p04-external-status-browser.json. Initial stale expected-label failure retained in evidence description; corrected full rerun passed.

P04 useful artifact passed on real OpenClaw 2026.10.7 with MiMo: four provider requests, upstream read/write/exec recorded, actual report copied from the stopped disposable container and accepted by the independent frozen invoice verifier. Input hash unchanged; report hash matches the expected verified artifact. Evidence: evidence/p04-openclaw-invoice-artifact.json. Browser review, active-run Stop and complete end-to-end recovery remain open.

P04 Stop proof: actual OpenClaw run observed active, provider request start independently marked by capped proxy, then exact run Stop acknowledged. Subsequent status error/stopReason rpc, no active run, abortedLastRun true; history contained only the user message. Evidence: evidence/p04-openclaw-live-stop.json retains earlier harness/early-stop outcomes. This is text-only cancellation, not cancellation of remote tool effects or provider charges.

## October 26 repair integration

`evidence/p03-invoice-browser-repair.json` records an actual failed live-model invoice task repaired through authenticated browser review, one new Docker operation, independent artifact verification and final approval. Previous receipts are retained. Stale review, changed commands, unknown effects and wrong workspace cannot authorize repair. `scripts/repair-browser-acceptance.mjs` reproduces the approval/execution behavior with synthetic model output and is included in installed-archive CI; it does not replace live-model acceptance.

Hosted CI passed all jobs for `4ae5135a88b8d29fa3fe60298530ab0983379fdd` (run 40291999674). Later repair commits require their own exact-build results. No P01–P10 row is closed solely by these component results.

P03 provider reconnect correction: explicit HTTP 401/403 refusal remains recorded without fabricated token usage and permits a new explicitly requested draft after reconnect. Transport/timeout uncertainty remains blocked. Controlled local HTTP generate and stream tests passed, alongside accounting/repair regressions (11 tests), typecheck and build. Evidence: evidence/p03-provider-authentication-recovery.json. Live provider credential expiry and full browser reconnect acceptance remain open. Prior hosted build d90774b passed run 40294227751; this new change requires its own CI.

P03 authentication recovery boundary: production worker tests now prove approved execution after explicit refusal, preservation of the rejection record, no repeated execution on reopen, and rejection of unknown/started/malformed audits before backend execution. HTTP receipt review distinguishes authentication refusals from uncertain attempts; UI keeps usage labeled unreported. Nine tests across worker/route suites, typecheck and build passed. Evidence: evidence/p03-auth-recovery-worker-boundary.json. Integrated live credential renewal remains open.

P10 hosted run 40295148327 exposed a stale redaction assertion on all six OS/Node matrix jobs: HTTP 401 now intentionally returns a fixed reconnect message instead of a redacted upstream body. Expanded regression to HTTP 401, 403 and 500, retaining credential non-disclosure assertions for every case and redaction coverage for generic server failures. Adapter/authentication/worker suites: 27 tests passed. Hosted rerun pending; failure remains in the record.

P01/P02 combined synthetic browser journey passed: chat prepare_task -> reviewed boundaries -> model draft -> explicit command approval -> real Docker output -> service restart -> recorded result restore -> final approval. Three provider requests (two chat tool-loop responses and one planning response), all simulated; zero paid requests. Evidence: evidence/p02-combined-chat-task-browser.json. Two harness setup failures retained. This does not close live-model, installed-package or final chat artifact presentation requirements. Full local suite at 15982c8 passed 866 tests, two skipped.

P01/P02 installed chat round trip passed using a freshly installed archive: model tool prepares task, browser boundaries/plan approval, actual Docker execution, restart and final approval, explicit encrypted connection unlock, hash-verified artifact read through chat tool, visible answer and reload without new requests or execution. Five synthetic provider requests. Evidence: evidence/p02-installed-chat-roundtrip.json. Added journey to installed-browser CI. Live model and useful-invoice combined journey still open.

P02 unified LIVE chat invoice round trip passed on the source build: MiMo v2.6 flash prepared the task via chat, generated the inspected plan, real Docker produced independently verified invoice JSON, service restart restored evidence, final approval completed, and a live read_task_artifact call returned the hash-verified report to chat. Reload preserved the answer without more provider requests or effects. Five live requests with reported usage retained. Evidence: evidence/p02-live-chat-invoice-roundtrip.json. P01 exact installed live archive remains open; this is one bounded task, not broad competence or superiority.

P01/P02 exact installed live invoice round trip passed: archive cd3a83cc9e1ec1886d0a904ff1a7835e0d9cd52dc87ebcf5951b947657c49f61 in a fresh consumer installation, live chat task preparation and fresh planning, browser command review, independent invoice verification, restart, final approval, live artifact read and persisted chat result. Six provider requests with usage; no automatic repeat on reload. Installed runtime module hashes match current built modules. Evidence: evidence/p01-installed-live-invoice-roundtrip.json. Remaining scope includes visual setup captures and final-release artifact reconciliation, broader recovery/integration/model/memory matrix and evaluation; the full goal stays open.

P07 actual built-in + Obsidian composition passed through the chat memory tool: both conflicting values retain distinct source identities; other projects and unselected notes stay excluded; reopening the store preserves recall; a missing selected note fails visibly; restoring it returns its new content. Reproducer: scripts/composed-memory-lifecycle-acceptance.mjs, added to hosted OS/Node matrix. Evidence: evidence/p07-composed-local-memory.json. Hindsight live account, combined worker/browser lifecycle and semantic conflict handling remain separate.

P07 worker planning boundary also passed with the actual composed local adapters: both conflicting values and source identities are present; missing selected note rejects planning context; restored content is fresh; explicit disconnect removes it. Evidence: evidence/p07-composed-worker-memory.json. This tests planning context, not live worker command behavior or Hindsight.

P02 acceptance strengthened: final chat now must consume a read_task_artifact tool response tied to the exact task/path and evidence SHA-256, with content bytes hashed independently. A plausible answer alone cannot pass. Synthetic full browser/Docker/restart journey passed the stronger assertion. Evidence: evidence/p02-artifact-tool-result-integrity.json. This newly enforced assertion is not retroactively claimed for older live runs.

P04 real host-to-gateway setup exposed required device pairing, hidden by generic adapter error. Exact pending device approved using pinned OpenClaw CLI on the disposable gateway; host production adapter then authenticated and discovered sessions successfully. No model requests. Stale dynamic-port reconnect failure retained; corrected with fresh port discovery. Evidence: evidence/p04-host-device-pairing.json. Gateway stopped. Next: expose pairing guidance and join this route to live browser delegation.

P04 pairing guidance fixed: NOT_PAIRED is mapped to explicit device-review instructions and the locally generated fingerprint, without reflecting arbitrary upstream text or autoapproving. All 23 handshake tests, typecheck and build passed. Fresh pinned real gateway reproduced the actionable rejection, with zero model calls. Evidence: evidence/p04-pairing-guidance.json. This verifies guidance at the transport boundary; guided browser pairing and full delegation remain open.

P04 reconnect defect fixed: terminal handshake failure previously poisoned subsequent explicit connectWhenReady calls. Failure state now resets only when the failed attempt exits; a new explicit request can authenticate after pairing, without automatic retry or work replay. Thirty gateway tests, typecheck and build passed. Evidence: evidence/p04-explicit-pairing-reconnect.json. Hosted preceding build 0b47874 passed run 40297113702; new fix awaits CI.

P04 real pairing/reconnect lifecycle now passed against pinned OpenClaw 2026.10.7: initial NOT_PAIRED rejection, pending request selected by locally generated device fingerprint, exact request approved via official CLI, same client explicitly reconnects and lists sessions. No model request, task send or authentication bypass. Evidence: evidence/p04-real-pairing-reconnect.json. Disposable gateway stopped after proof. Full browser delegation still required.

P04 live browser invoice delegation passed: paired pinned gateway, exact message reviewed in browser before submission, one accepted external receipt, five live provider requests, independent invoice verifier passed, external response displayed, reload did not resend, local task remained paused rather than claiming verified completion. Evidence: evidence/p04-live-browser-invoice.json. Gateway stopped. Combined gateway restart/Stop lifecycle and usage/cost capture remain open.

P04 live runner now persists a started audit before each provider request and records HTTP status, timestamps and reported input/output tokens after responses. Interrupted/missing accounting stays unknown; cost remains unknown rather than inferred. JSON/SSE parser tests (3) passed and are added to CI. Evidence: evidence/p04-provider-accounting-parser.json. New live capture still needs execution alongside remaining lifecycle case.
