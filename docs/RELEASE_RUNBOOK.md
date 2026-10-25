# AgentForge release runbook

This runbook is the repeatable path from a clean checkout to a verified public
release. It does not require private business data or production credentials.

## 1. Local public boundary

Never archive the raw working directory. Ignored browser profiles, runtime
state, caches, logs, or generated evidence may still exist on disk even when
Git and npm exclude them. Create a new output directory outside the repository
from the explicit public allowlist:

```text
node scripts/public-release-stage.mjs <new-output-directory>
```

The exporter refuses an existing output directory and copies only the reviewed
source, build, license, website, workflow, and selected public-document inputs.
It does not copy research working trees or local runtime/artifact directories.
Install dependencies from the checked-in lockfile in that isolated staging
tree, then run:

```text
pnpm verify:public
pnpm release:audit
```

Before distribution, extract the exact proposed archive into another new
directory and run the Git-free archive checks exactly as shipped:

```text
node --test scripts/public-repository-privacy-acceptance.test.mjs
node scripts/public-repository-privacy-acceptance.mjs --archive-tree
node scripts/public-link-acceptance.mjs
```

Do not initialize `.git` in the extraction. Archive mode uses bounded direct
filesystem enumeration and rejects Git metadata or installed dependency trees.
Repository mode remains Git-aware for tracked and untracked release candidates.
Both modes fail on nested browser profiles, cookie/login/history/session stores,
unreviewed runtime/cache/artifact trees, databases, logs, and nested archives
without reading prohibited profile contents. A local pass remains local
evidence; independent review is still required.

The combined `pnpm release:preflight` command runs those checks and the
non-publishing registry preflight in one repeatable sequence.

`verify:public` checks type safety, the public package surface, archive privacy,
crash persistence, and the approved Docker acceptance path. `release:audit`
reports whether the package is publishable and keeps hosted or registry proof
separate from local evidence.

Before any authorized publication, run `pnpm test:registry:preflight`. This
performs an npm pack dry-run, records archive integrity and a file fingerprint,
checks whether the package name is already present in the registry, and never
publishes or sends credentials.

For a deployed static site, run `AGENTFORGE_DEPLOYMENT_URL=https://example.invalid
pnpm test:deployment:smoke` (or pass the URL as the first argument). The smoke
check verifies the required routes, responsive metadata, footer, and GitHub
guide CTA without modifying the deployment.

## 2. Hosted CI

The workflow at `.github/workflows/ci.yml` runs on pushes and pull requests.
It can also be started manually with GitHub Actions `workflow_dispatch`.
The workflow supplies empty provider credentials and runs deterministic tests;
it must never receive production tokens.

If the repository is being pushed with the GitHub CLI and the token does not
include the `workflow` scope, authorize it before pushing the branch:

```text
gh auth refresh -h github.com -s workflow
git push -u origin <release-branch>
gh run list --limit 5
```

After authorization, the repository includes a repeatable PowerShell resume
script that pushes the selected release branch and waits for the matching CI
run without publishing a package:

```powershell
pwsh -File scripts/public-release-resume.ps1 -Branch vnext
```

The authorization command prints a one-time device code and the device-login
URL. Complete that authorization in the operator's browser; no token value is
written into the repository or release artifacts.

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
