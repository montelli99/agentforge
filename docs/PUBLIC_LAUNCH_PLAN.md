# AgentForge public launch plan

This plan covers the public release after the production readiness gates pass.
It contains no private account, business, provider, or deployment values.

## Release gates

1. Run the full typecheck, test, product-isolation, package-surface, Docker,
   and release-audit commands.
2. Verify the public package contains AgentForge, Workflow Engine, and JEv,
   with no private workspace data or runtime secrets. Run the archive privacy
   gate against npm's actual packlist, not only a source-tree search.
3. Publish the Apache-2.0 repository only after a clean release commit and a
   review of the generated package contents.
4. Keep Discord documented as optional until its live credentials are supplied.

## Website

The website should explain the product in this order: autonomous setup,
workspace and agent orchestration, memory and context compression, model
routing, channel connections, JEv browser control, and the Workflow Engine.
Each claim should link to a public document or a runnable example. The site
must use sample data only and must not imply that a provider is live unless its
runtime readiness check is green.

Until the owner authorizes a commercial offering, the site must not advertise
paid plans, prices, service-level agreements, support response times, or a
placeholder repository URL. The current static site is intentionally
self-contained: it uses system fonts and no external presentation fetches.

## Community launch

Create official project accounts only after the repository and website are
public. Use the same project name, Apache-2.0 notice, repository URL, and
security contact on YouTube, X, Facebook, and TikTok. Start with a short
product walkthrough, a transparent architecture demo, and a contributor guide;
avoid publishing credentials, private customer data, or unverified performance
claims.

## Measurement

Track repository stars, forks, issues resolved, documentation visits, example
starts, and channel setup completion separately. Do not use follower counts as a
substitute for adoption or reliability evidence.
