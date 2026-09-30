# Release verification log

This record separates verified evidence from deployment-specific gates. It must
contain only reproducible results and must never contain credentials or private
workspace data.

## Hosted CI

- Run: https://github.com/montelli99/agentforge/actions/runs/36652863872
- Commit: `79c9d14f4c4e8e741405c632a3aafa18284cf6a3`
- Result: all seven jobs passed (public package acceptance plus Linux, macOS,
  and Windows Node 22/24).

- Run: https://github.com/montelli99/agentforge/actions/runs/36652414320
- Commit: `3e7f6dd61d84a40041b44d96a6b9c0f4c0793f06`
- Result: all seven jobs passed (public package acceptance plus Linux, macOS,
  and Windows Node 22/24). This run includes the bounded Windows package
  install timeout fix.

- Run: https://github.com/montelli99/agentforge/actions/runs/36619028316
- Commit: `b9c52cb2b78935310913fa4d5b602165ebd46b67`
- Result: all seven jobs passed (public package acceptance plus Linux, macOS,
  and Windows Node 22/24).

## Local public boundary

- `pnpm verify:public`: passed on the approved Docker acceptance path.
- `pnpm release:audit`: passed with no local blockers.
- `pnpm test:registry:preflight`: passed; package archive has 151 files and
  registry state is unpublished. No publication was performed.
- Follow-up preflight on 2026-09-30: `agentforge-0.1.0.tgz` passed with 154
  files, SHA-512 integrity
  `SRUYI57PpZvGW9vKjbCosAsnOwnm7E3NlQNIxZj5LXNZ6dSAjSvuZRyxNB++Y0CEpSMGUegQMADm8sAMwFUXqg==`,
  and archive fingerprint
  `4366fb77cdb6c0358cacb73024c997e5f9dec0f05024248643ebd8ef44a5a803`.
  Registry state remains unpublished; no publication was performed.

## Deployment-specific evidence

The live Render endpoint was checked on 2026-09-29:

- `https://agentforge-site.onrender.com/`: HTTP 200; responsive viewport meta and footer present.
- `/404.html`, `/robots.txt`, and `/sitemap.xml`: HTTP 200.
- `pnpm test:website`: passed; all 42 public pages resolve local links and 39
  include footer navigation.
- The first check looked for a direct GitHub URL and was a false negative because the current homepage intentionally routes through `github.html`. A follow-up check confirmed the current title, `github.html` CTA, and “View source” CTA are live.
- Deployment synchronization is accepted for the current static-site content.

The following are optional post-release acceptance items until they are run
against disposable targets or an explicitly approved deployment:

- Authenticated Telegram, Discord, or Slack round trips
- Registry publication and provenance
- Final owner approval for public release

No provider credentials, private workspace records, or live account identifiers
belong in this file.
