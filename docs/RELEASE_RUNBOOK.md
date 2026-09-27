# AgentForge release runbook

This runbook is the repeatable path from a clean checkout to a verified public
release. It does not require private business data or production credentials.

## 1. Local public boundary

From the repository root, run:

```text
pnpm verify:public
pnpm release:audit
```

`verify:public` checks type safety, the public package surface, archive privacy,
crash persistence, and the approved Docker acceptance path. `release:audit`
reports whether the package is publishable and keeps hosted or registry proof
separate from local evidence.

## 2. Hosted CI

The workflow at `.github/workflows/ci.yml` runs on pushes and pull requests.
It can also be started manually with GitHub Actions `workflow_dispatch`.
The workflow supplies empty provider credentials and runs deterministic tests;
it must never receive production tokens.

Record the hosted run URL and commit SHA in the release record after the run
finishes successfully.

## 3. Live provider acceptance

Live checks are opt-in and use disposable test accounts only:

- Telegram: confirm the AgentForge-owned BotFather transport can start, receive,
  normalize, and send a test message.
- Discord: confirm the standalone Gateway session can identify, receive, and
  send in a disposable test server.
- Slack: confirm Socket Mode hello, acknowledgement, receive, and send in a
  disposable test workspace.

Never run two consumers against the same production Telegram update stream.
Never copy credentials from OpenClaw, Hermes, or a private workspace.

## 4. Publication boundary

Publishing to a registry is a separate, explicitly approved action. Before it,
verify the Apache-2.0 license, package version, npm packlist, provenance
settings, and hosted CI result. The local audit must still report no private
identifiers or credentials in the archive.

## 5. Evidence to retain

Keep the hosted CI URL, commit SHA, package digest, archive privacy result, and
provider acceptance summaries. A passing unit test or fixture does not replace
live-provider evidence, and a package-ready result does not mean publication
has occurred.
