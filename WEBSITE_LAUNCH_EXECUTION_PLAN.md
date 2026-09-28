# AgentForge website, education, release and marketing plan

Audit date: 2026-09-28. This is an execution plan, not a completion certificate.

## Owner objective

Teach someone unfamiliar with agents what they receive, how each capability works, how to install on their platform, and how to reach a first successful result without contacting the founder. Preserve the approved branding. Promote all three systems: AgentForge workforce and memory, Workflow Engine, and JEv. Every page must offer a direct public GitHub action. Publish only generic product material; private accounts, operational records and credentials never enter release assets.

## Findings verified in this audit

- Feature pages exist but mostly repeat generic prepare/operate/verify copy. File count is not educational coverage.
- Homepage section-head remains a horizontal flex layout on phones, explaining the narrow stacked heading in the supplied screenshot. Previous viewport verification did not execute.
- Mobile navigation is hidden on feature pages without a replacement menu. New pages have inconsistent footers and weak cross-navigation.
- Download buttons commonly take an extra hop through github.html. Some inserted button classes have no corresponding button styling.
- website/verify-static.mjs checks only index.html. It does not prove feature-page links, content, accessibility, mobile rendering or deployment. It wrongly treats external navigation/canonical URLs like downloaded assets.
- Homepage metadata is incomplete; canonical is relative, social artwork is relative, and no full-site crawl acceptance was demonstrated. Keyword metadata does not substitute for useful content.
- README quickstart assumes an existing checkout and pnpm. It lacks a beginner path from installing prerequisites to first verified outcome per OS.
- Latest three hosted checks report failure. No GitHub release was returned by gh release list. Existing dated acceptance evidence must not be presented as current whole-product readiness.
- RELEASE_STATUS records prior local Telegram acceptance, but that is not verification of a currently functioning live channel session. Discord and Slack require separate provider acceptance.
- workspaceApp.ts explicitly says local JSON persistence is not encrypted production storage. The cryptography page must not imply blanket memory encryption. Compression/context-packet implementation exists; actual savings require measured representative tasks.

## Work order and acceptance

### 1. Establish one factual product inventory

For every advertised feature record implementation file, test, user-visible entry point, prerequisite, current status, live acceptance evidence and limitation. Reconcile README, release status and website from this inventory. Separate planned architecture from usable features. Explain hashing, signatures, TLS, credential storage and encryption at rest separately; claim only implemented protections. Never invent savings percentages, customer counts or benchmark wins.

### 2. Replace repetitive pages with a learning center

Navigation: Product, Learn, Install, Security, Releases, GitHub. Mobile gets a working accessible menu. Shared header/footer, breadcrumbs, related topics and direct GitHub CTA on every page. Homepage tells the outcome and leads to proof, learning and installation.

Learning paths:
- New to agents: model vs agent vs tool vs harness; what runs locally; what requires a paid model; permissions; a first harmless task.
- Operate a team: setup guide, Agent Studio, departments/subgroups, projects/goals, inbox, tasks/runs, handoffs and recovery.
- Automate a process: process library, procedure compiler, Workflow Engine, approvals/contracts, compute/tools, browser operator, evidence and retry behavior.
- Preserve context: AgentForge memory, operational memory, retrieval scope, durable handoffs, context packets, JEv routing, token economy, corrections and quality/drift.
- Connect channels: native gateway, channel mirror, Telegram BotFather, Discord Developer Portal, Slack Socket Mode; prerequisites, inbound/outbound tests, ownership conflicts and disconnect instructions.
- Extend and maintain: extension surface, migration, local marketplace status, backup/restore, upgrades, troubleshooting and security.

Each feature page must contain: plain-language definition; problem solved; a distinct realistic generic example; inputs; setup prerequisites; numbered UI/CLI steps grounded in the actual build; expected result; failure/recovery behavior; cost/privacy implications; supported versus planned boundaries; related pages; direct GitHub source CTA and installation CTA. Do not reuse the same three steps across features. Screenshots must come from a clean demo workspace with no private records.

### 3. Conversion and GitHub onboarding

Rewrite README entry into: product value, actual screenshot/demo, three-system explanation, start here, per-platform installation, first success, feature map, status, documentation, troubleshooting, contribution and Apache license. Link deeper technical limitations without concealing them. Provide Windows PowerShell, macOS and Linux instructions, pin package-manager version, explain optional Docker and model credentials, and test each supported path on clean environments. Do not advertise installers or binaries that do not exist. Use 'Get source' until a downloadable release artifact is verified. A star button opens GitHub; never promises automatic starring.

### 4. Mobile, accessibility and search

Shared CSS/components and page data prevent drift. Stack section headings above descriptions on phones; remove fixed-width CTA overflow. Verify 320, 375, 390, 768 and 1440 pixel widths with real rendered screenshots, horizontal-overflow checks, keyboard menu operation, focus states and comfortable tap targets. Follow every header/footer/card/CTA link and check fragments.

Use unique titles/descriptions, absolute canonical URLs, absolute social images, sitemap.xml, robots.txt and meaningful internal links. Visible answer-first explanations and examples are the AEO foundation. Structured data must match visible content; no invented reviews/ratings. Google says AI features require no special AI schema. Do not promise rankings or FAQ rich results. Add search-engine ownership/submission only with the appropriate account access. Measure search impressions, visits, GitHub outbound clicks and first-run success separately; outbound clicks are not confirmed stars or installs.

### 5. Release proof before promotion

Investigate current failed hosted checks; run only relevant fixes/checks then the required release sequence on a candidate revision. Independently launch from a clean checkout without personal configuration. Exercise onboarding, persistence/restart, memory retrieval/handoff, a real configured model, approved execution and evidence through the UI. Record Telegram inbound/outbound plus topic routing, restart and conflict behavior with an authorized test bot. Discord can remain pending owner setup without blocking independent work; advertise its exact status. Never launch two pollers against the same Telegram token. Maintain an evidence table with revision, date, environment, command/workflow, result and artifact.

### 6. Marketing system

Use AgentForge to run a bounded marketing workspace after its execution path is proven. Build a portable content pipeline first: verified feature inventory -> brief -> script/article -> factual review -> screenshots/video -> accessibility review -> approved publishing queue -> metrics -> corrections. Keep credentials outside source and use dedicated brand accounts. Composio is an optional adapter, selected only after checking actual supported publishing actions/scopes for each platform. Do not claim one connector supports everything.

Roles: product educator, technical fact checker, video producer, distribution planner, community support triager and analyst. Initial output stays in drafts; social account creation, OAuth, publication and individual outreach are tracked actions with explicit account/recipient/content authorization. No automatic unsolicited influencer messages.

Remotion work package: independent marketing-video workspace with pinned dependencies and its own lockfile; inspect current license/deployment terms; install tooling; build a real 30-60 second demonstration with captions and approved artwork; render 16:9 and 9:16 outputs; inspect sampled frames and audio. It must not become a runtime dependency of the AgentForge product. Mark installation/rendering complete only with saved output evidence.

Launch assets: 90-second product walkthrough, first-task tutorial, memory/handoff walkthrough, honest token-cost experiment, channel setup tutorial, short feature clips, README media, press kit and demo script. Publish tutorials that answer actual user questions instead of repeating launch slogans.

Outreach research record: creator name, public channel/profile, recent relevant coverage URL/date, audience fit, public business contact where available, personalized pitch angle, status and response. Prioritize open-source AI educators and developers; verify fit before drafting. Owner approves actual outreach batch. Track meaningful adoption: successful first run, retained use, issues resolved and contributors, alongside stars/downloads.

## Competitive research baseline

- OpenClaw https://github.com/openclaw/openclaw and https://github.com/openclaw/openclaw/blob/main/docs/install/index.md : clear getting-started, installation choices, onboarding and lifecycle documentation. Match the newcomer journey rather than copying positioning.
- Hermes https://github.com/NousResearch/hermes-agent : public documentation, setup ecosystem and user guides. Compare actual workflow and prerequisites, not star counts as proof of quality.
- OpenMuse https://github.com/CopilotKit/openmuse : concrete browser/terminal/files framing. AgentForge pages need equally concrete demonstrations of what a person can accomplish.
- Remotion https://www.remotion.dev/docs/ : reference for the separate video production workspace.
- Google https://developers.google.com/search/docs/appearance/ai-features : ordinary technical SEO and useful content remain the basis for AI search eligibility.

## Handoff rules for implementation

Work in small coherent changes. Do not push when verification has failed. Do not replace a failed browser check with a static grep and call it verified. Save rendered evidence and exact revision. Keep private workspace data out of public docs and demos. Update this checklist with implemented/verified/pending states, not vague percentages. Documentation existence, local tests, live provider checks and release availability are four different claims.

Current state: audit and execution plan prepared; website rebuild, per-platform clean installs, current live provider acceptance, marketing workspace installation and video render remain outstanding.
