# Release verification log

This record separates verified evidence from deployment-specific gates. It must
contain only reproducible results and must never contain credentials or private
workspace data.

## Hosted CI

- Run: https://github.com/montelli99/agentforge/actions/runs/36613614147
- Commit: `e737a74e6b16065eea8b26eb40f52441d6eef8df`
- Result: all seven jobs passed (public package acceptance plus Linux, macOS,
  and Windows Node 22/24).

## Local public boundary

- `pnpm verify:public`: passed on the approved Docker acceptance path.
- `pnpm release:audit`: passed with no local blockers.
- `pnpm test:registry:preflight`: passed; package archive has 151 files and
  registry state is unpublished. No publication was performed.

## Deployment-specific evidence

The following remain unverified until they are run against disposable targets
or an explicitly approved deployment:

- Hosted website HTTP and responsive-page checks
- Authenticated Telegram, Discord, or Slack round trips
- Registry publication and provenance
- Final owner approval for public release

No provider credentials, private workspace records, or live account identifiers
belong in this file.
