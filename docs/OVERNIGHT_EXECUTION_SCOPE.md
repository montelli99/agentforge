# Overnight execution scope

This scope is part of the active production completion goal. It is designed to
run without new owner input or external account authorization.

## Work to complete

1. Verify the live public website on Render: routes, assets, responsive layout,
   privacy markers, cache headers, and redeploy behavior.
2. Run a clean-room AgentForge install from the public repository. Build and
   start it with an empty data directory, then verify workspace creation,
   persistence, memory, plans, approvals, channel registry, and the public
   system manifest.
3. Run the complete local release, package, archive, privacy, and acceptance
   checks. Fix deterministic failures and save exact evidence.
4. Verify the native Telegram, Slack, and Discord adapter contracts with
   fixtures: lifecycle, routing, subgroup mirroring, message normalization, and
   fail-closed behavior. Do not require live provider credentials.
5. Improve the first-run setup and public documentation so users are guided in
   plain language and do not need to edit backend configuration by hand.
6. Review the public website and documentation for stale claims, unclear
   capabilities, or leakage of private account data.

## Explicit boundaries

- Do not publish a package to a registry.
- Do not authorize or modify a live Discord account.
- Do not access or copy private CRM, seller, phone, email, or pipeline data.
- Do not change the existing private Render services.
- Do not claim a live provider connection from fixture results.

## Completion evidence

Each item must retain a command or URL, commit SHA, result, and timestamp in the
release evidence record. A clean-room test must use an empty data directory and
must confirm `privateDataIncluded: false`.
