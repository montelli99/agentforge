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
- [ ] **P02 Real chat execution (execution proof passed; chat presentation pending).** Use a live model to create a useful artifact
  from synthetic inputs with no embedded solution. Verify output with a separate
  evaluator, record the actual commands and all model attempts, and show the
  result in chat. Evidence: `evidence/p02-useful-invoice-acceptance.json` records a passing real-model invoice task and both rejected attempts. Next: expose this verified result through the chat journey and carry it into P03. The protocol froze its
  input and evaluator before execution. Existing fixed-file proof is supporting
  evidence only and must not be reported as general task competence.
- [ ] **P03 Recovery matrix.** On that workflow interrupt browser streaming,
  service, worker, and the connection after a tool effect but before its receipt.
  Also expire authentication and introduce conflicting memory. Reopen, recover
  context, reconcile effects, and count executions to prove no duplicates.
  Save before/after journals and independently counted outputs for every case.
  Next: carry the real P02 artifact through service/worker restart.
- [ ] **P04 OpenClaw workflow.** Pair a disposable real installation, select a
  session, review/send one useful task, observe and verify its returned artifact,
  disconnect/reconnect, and Stop an active run with partial-effect inspection.
  Save upstream run IDs plus AgentForge receipts and result hashes. Next: run a
  successful model-backed task; authentication and unknown-run probes do not close it.
- [ ] **P05 Hermes workflow.** Repeat P04 using the pinned Hermes installation
  and the registered connector. Include selected API-session continuity and
  credential-change refusal for existing receipts. Verify successful completion
  and cancellation, not only failed-run persistence. Next: implement verified
  output retrieval and run a successful task. Other Hermes session types require
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
