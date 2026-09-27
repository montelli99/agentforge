# AgentForge completion map

**Status:** owner-approved; repository-only tracks are in progress.

This is the single decision map for completing AgentForge as a public,
Apache-2.0, self-hostable product. It separates work that can be completed in
the repository from work that needs an external account, release decision, or
hardware. A missing credential blocks only its own track.

## Current evidence

The current checkout has a public package surface, Apache-2.0 license, privacy
isolation gate, isolated Docker acceptance, persistence acceptance, CLI
acceptance, and a full suite of 75 test files with 409 passing tests and two
opt-in live-model checks skipped. The built local runtime has an
AgentForge-owned BotFather Telegram connection; the native gateway reports
`ready` and Telegram reports `live`.

AgentForge, Workflow Engine, and JEv are all included as public
subsystems. Their boundaries are published in
[PUBLIC_SYSTEM_ARCHITECTURE.md](PUBLIC_SYSTEM_ARCHITECTURE.md).

## Completion tracks

| Track | Outcome | Work that can proceed now | External condition | Completion evidence |
|---|---|---|---|---|
| 1. Core control plane | Durable workspace, setup guide, hierarchy, approvals, memory, context packets, and model routing behave consistently | Tighten lifecycle, persistence, authorization, and acceptance coverage | None for local work | Typecheck, full suite, restart acceptance, real local HTTP acceptance |
| 2. Native channels | Telegram, Discord, and Slack are direct AgentForge transports with mirrored department/subgroup structure | Maintain provider-neutral routing, secret isolation, setup guides, and test adapters | Discord/Slack sandbox credentials for live acceptance | Provider status, one inbound event, one approved outbound event, clean shutdown |
| 3. Governed execution | Approved plans run in isolated workspaces with evidence rather than simulated success | Complete fail-closed contract, worktree, Docker, evidence, and recovery checks | A model provider only when model-authored plans are desired | Approved plan, isolated execution log, verification result, evidence pack, rollback test |
| 4. Product experience | The setup agent guides a nontechnical user from an outcome to a reviewable workforce and capability plan | Finish UI consistency, responsive/browser acceptance, clear empty states, and no-manual-setup flow | None for local UX work | Browser journey: outcome → plan → agent drafts → capability review → approved sandbox setup |
| 5. Public package and website | A clean, privacy-safe package and sample-data-only website explain the product accurately | Keep package surface minimal, build/publish checks strict, and website claims evidence-backed | GitHub/NPM publication authority and hosting choice | Pack inspection, privacy scan, hosted CI run, owner-approved publication |
| 6. Trust, quality, and market leadership | Drift detection, hallucination controls, benchmarks, memory/context evaluation, and transparent provider readiness | Improve local evaluations, evidence provenance, regression suites, and public docs | Live model/provider accounts only for their respective benchmarks | Reproducible benchmark artifacts, drift records, independent verifier results |

## Sequence after approval

1. **Finish repository-only gaps first.** Work through tracks 1, 3, 4, and 6
   without waiting on chat-provider accounts. Every change must have tests and
   a documented acceptance record.
2. **Keep channels independent.** Telegram remains live through BotFather.
   Discord and Slack retain their self-service setup guides and remain
   `not_configured` until their sandbox credentials are supplied. Neither
   blocks other work.
3. **Run full product acceptance.** Execute the local browser journey, package
   inspection, Docker execution path, persistence/recovery path, and privacy
   gate against the rebuilt product. The approved-command Docker E2E now covers
   a disposable repository, real isolated worktree, network-disabled command,
   and observed evidence; model-authored plans remain a separate opt-in track.
4. **Prepare release assets.** Finish website copy, contributor docs, security
   policy, release notes, and the public GitHub checklist using sample data
   only.
5. **Perform owner-controlled releases last.** Connect remaining sandbox
   providers, choose hosting, push to public GitHub, publish a package, and
   create social accounts only after you explicitly authorize each external
   action.

## Decisions that need the owner later

- Discord sandbox bot token, when you are ready to run that provider test.
- Slack sandbox app and bot tokens, when you are ready to run that provider
  test.
- A chosen model provider only if you want AgentForge to author plans; the
  human-approved Docker execution acceptance is complete locally.
- Public GitHub push, package publication, website host, and social-account
  creation. These are external release actions and are not performed by local
  development work.

## Approval boundary

Approval of this map authorizes implementation of every repository-only item
above, including local test data, local Docker execution, local browser
acceptance, documentation, and release artifacts. It does **not** authorize
public publishing, external messages, live Discord/Slack connection, account
creation, payment, or any use of private business data.
