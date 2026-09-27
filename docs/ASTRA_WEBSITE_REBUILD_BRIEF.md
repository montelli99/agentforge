# AgentForge public website rebuild brief

## Why rebuild

The current static site is a generic SaaS landing page. It has been corrected
for stale counts and unproven commercial claims, but it does not communicate
the full AgentForge product or meet the requested visual bar. Replace it;
do not incrementally polish its pricing-card, comparison-table, or generic
feature-grid structure.

## Product truth the new site must communicate

AgentForge is a local-first, Apache-2.0 operating system for governed AI work.
It has three public systems with distinct responsibilities:

1. **AgentForge control plane**: workforce setup, agent identity and roles,
   durable workspace and event ledger, approvals, context packets, memory,
   native channels, browser-session ownership, and model routing.
2. **Workflow Engine**: a domain-neutral process engine that turns
   an outcome into stages, handoffs, checks, recovery policy, and evidence.
3. **JEv System-1**: cheap intent/risk classification and routing that keeps
   expensive model work focused and does not own credentials or side effects.

The public product excludes private CRM data, lead data, telephony, course
material, accounts, and credentials. It runs locally first. External channels,
models, browser control, and execution are opt-in and capability-scoped.

## Design direction

Design a product demonstration, not a conventional pricing site:

- The first view should feel like a calm, high-end operator cockpit: show
  **needs your decision**, **team at work**, and **continue working** in that
  order. Make the Team Room topology the signature visual.
- Use the actual AgentForge palette: near-charcoal layers, lavender for focus,
  mint for verified, amber for waiting, red for blocked. Avoid neon cyberpunk,
  generic gradient landing pages, stock robots, or made-up KPI charts.
- Create animated but restrained state graphics. Motion must respect reduced
  motion and be visually labeled as illustrative when it is not from a live
  runtime event.
- Make desktop and mobile both deliberate. Mobile should feel like a real
  operating workspace, not a compressed dashboard.
- Let users explore the three-system architecture, autonomous setup agent,
  model/cost controls, quality-drift and correction loop, native channel
  mirroring with departments/subgroups, browser takeover, and governed
  execution/evidence.

## Interaction concept

Build a polished static interactive demo with a few focus modes rather than
an endlessly long brochure:

1. **Command Room** — animated/interactive topology of the coordinator,
   workflow agent, JEv router, verifier, and human review gate.
2. **Work Run** — an inspectable progression: outcome → setup agent →
   workflow → constrained plan → isolated execution → evidence → review.
3. **Trust Layer** — visible, plain-language model routing, drift signals,
   context compression, correction/evaluation, approval, recovery, and
   rollback semantics.
4. **Connection Map** — native Telegram, Discord, Slack, browser, and future
   transports connecting into one canonical workspace with hierarchy support.

Every demo object must be explicitly labeled illustrative/sample data. Do not
claim an external provider is live merely because its adapter exists.

## Material to inspect before implementation

- `docs/VISUAL_PRODUCT_BUILD_BRIEF.md`
- `docs/COMPETITIVE_HARNESS_UX.md`
- `docs/MARKET_AUDIT_2026-09-25.md`
- `docs/PUBLIC_SYSTEM_ARCHITECTURE.md`
- `docs/RELEASE_STATUS.md`
- `src/publicSystemManifest.ts`
- `src/server/ui/` for the real product visual language
- `website/README.md` for public privacy/claim rules

## Non-negotiable content rules

- Do not add pricing, paid plans, uptime promises, support commitments,
  placeholder external links, stale test counts, or claims of market dominance.
- Do not include personal data, provider secrets, customer records, paths,
  business-specific automation, or screenshots that contain them.
- Keep the static site self-contained: no hosted fonts, analytics, trackers,
  or external presentation fetches.
- Use system fonts; Apache-2.0 is the correct license statement.

## Acceptance

- Desktop and narrow viewport render cleanly with no console errors.
- All navigation and interactive demo controls work.
- The page tells a nontechnical viewer what AgentForge is, what needs a human,
  what an agent can do, and why the architecture differs from a chat wrapper.
- The design feels like the actual AgentForge command center and demonstrates
  the complete public system rather than a subset of features.
- Verify static links, no external fetches, and no unsupported product claims.
