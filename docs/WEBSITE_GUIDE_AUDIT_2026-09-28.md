# Website guide rebuild — 2026-09-28

## Comparison sources

- https://docs.openclaw.ai/start/getting-started
- https://docs.openclaw.ai/channels/telegram
- https://hermes-agent.nousresearch.com/docs/getting-started/quickstart/
- https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/

Their useful pattern is a clear learning journey: installation, provider setup,
first conversation, feature-specific reference and recovery instructions.
This is an information-architecture comparison, not a claim of feature parity.
Competitor commands are not copied into AgentForge setup instructions.

## Findings and implementation

| Gap | Change |
| --- | --- |
| Repeated three-step boilerplate on feature pages | Replaced all learning subpages with topic-specific explanations, practical examples, operating details and explicit boundaries |
| Appended, duplicated installation summaries | Replaced with one ordered source-install workflow and platform-specific commands |
| External documentation required to understand setup | Rendered full setup, model, Telegram, Discord, Slack, browser and operations guides on the static website |
| No central learning route | Added grouped learning hub, searchable desktop guide list, page contents, related guides and mobile menu |
| Privacy and memory claims were too broad | Explained plaintext workspace storage, secret separation, text-only model route, memory opt-in and provider data flow |
| Green transport status treated as full acceptance | Added binding, identity and message-round-trip checks; documented incomplete automatic mapping rather than inventing a finished UI |
| Manual page editing caused drift | Added public editorial source and deterministic static-page builder |

## Repeatable maintenance

Edit website/guide-content.mjs for feature explanations and website/content for
authored operating guides. Selected public documentation sections are rendered
by scripts/build-learning-site.mjs. Keep secrets and local runtime state out of
all editorial inputs. Run the builder, link checks and static checks. Inspect
real browser rendering and interactions; metadata checks do not verify layout.

## Remaining product differences

Documentation cannot supply a signed installer, automated onboarding that is
not implemented, a completed provider binding UI, or a functioning autonomous
worker. These remain product work where the actual implementation lacks them.
The website must never paper over those gaps with setup instructions that do
not work. Live transport tests using a private token are temporary acceptance
checks, not credentials bundled for users.
