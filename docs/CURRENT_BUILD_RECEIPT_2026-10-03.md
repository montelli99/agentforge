# Current build receipt - 2026-10-03

This receipt describes the current local integration checkout. It is not a
release, hosted deployment, registry publication, or provenance statement.

## Build identity and scope

- Branch: `vnext`.
- Committed base: `47467ba62ab1b2da1b10650e18acd5df04048db8`.
- Source identity: that base plus preserved uncommitted integration changes.
  There is no release commit for this exact source.
- Current integration includes the offline/mock direct Responses adapter and
  production planning-context wiring. It remains opt-in and does not establish
  subscription entitlement or live-provider availability.

## Local evidence

- Full product regression checkpoint: 104 test files, 622 tests passed and 2
  explicit live-test skips.
- `typecheck:all`: passed.
- Production build: passed.
- Package surface/archive check: passed across 197 shipped files.
- Strengthened repository path/type policy: 14/14 synthetic fixtures passed,
  including fail-closed coverage for browser profiles, cookies, login data,
  history, sessions, runtime/cache/artifact trees, databases, logs, and nested
  archives. These fixtures use synthetic bytes and do not inspect local profile
  contents.

## Evidence boundary

- All evidence above is local-only.
- No hosted CI run covers this exact uncommitted source.
- No current live-provider, OAuth grant, catalog, model-entitlement, inference,
  external channel, or hosted-deployment proof was produced.
- The first broad working-directory archive was rejected after an independent
  filename-only review found prohibited browser/runtime/artifact paths. It must
  not be uploaded or published. Its identifier is retained only in the private
  engineering receipt.
- A replacement candidate was produced from the explicit public allowlist and
  passed the strengthened scanner after an exact local extraction. This is
  local verification only: a local green gate does not equal independent
  privacy acceptance, and independent review remains required before
  distribution.

No publication, push, commit, upload, provider call, or credential access is
authorized or recorded by this receipt.
