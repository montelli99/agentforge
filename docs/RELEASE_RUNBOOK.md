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

Set `AGENTFORGE_CI_RUN_ID` to that run's numeric ID and run
`pnpm test:hosted-ci:evidence`. The check requires all seven jobs to succeed
for the exact current commit, not an ancestor. Pull-request jobs check out the
head commit explicitly. The public acceptance job retains the npm archive,
`COMMIT.txt`, and `SHA256SUMS.txt` as a workflow artifact. Download that artifact
and verify its commit and digest before distributing it. Keep the final receipt
outside the source tree so recording it does not change the verified commit.

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

## 6. Reproduce the subscription and memory acceptance checks

Run these from the source checkout after `pnpm install --frozen-lockfile`.
Record the full commit before running. Keep generated evidence outside the
checkout until that commit's verification is complete.

### ChatGPT subscription tool cycle

Use a dedicated profile containing exactly one account signed in through the
official ChatGPT flow. This consumes plan usage for two model requests; it does
not use an API key. Pass the same local actor identifier used for that profile.
The profile root and evidence output must be absolute paths; the output must
not already exist.

```text
node --import tsx scripts/chatgpt-live-tool-loop.ts <subscription-root> <actor> <available-model> <new-evidence-file>
```

The command restores the protected session, requests one synthetic calculator
operation, validates its exact arguments, executes the calculation locally and
checks the final model result. It records request counts, tool-effect counts,
reported usage and a failure stage without recording credentials or raw provider
errors. It never retries a failed generation automatically. A pass does not
establish browser setup, interrupted task execution or all-provider acceptance.

### Claude native tool controls

Use the official Claude Code 2.1.310 executable selected for the release. These
checks create a fresh temporary profile and local synthetic model server. They
do not authenticate a subscription or use an existing personal profile.

```text
node --import tsx scripts/claude-native-tool-surface.ts <absolute-official-executable>
node --import tsx scripts/claude-native-tool-surface.ts <absolute-official-executable> --negative
node --import tsx scripts/claude-native-tool-surface.ts <absolute-official-executable> --governed
```

Run modes separately. The first checks advertised tools. The negative case
requires an explicit error for an unoffered shell request, absence of its marker
file and one permitted broker result read. The governed case uses the actual
AgentForge approval broker with a synthetic owner approval, checks one physical
write and requires rejection of the duplicate operation. These do not establish
live subscription entitlement, Docker execution or OS isolation. Native workers
remain outside server startup until their remaining acceptance is complete.

### Durable built-in memory migration

```text
node --import tsx scripts/memory-migration-lifecycle.ts
```

This creates only synthetic temporary workspaces. It preserves two conflicting
facts and provenance through explicit project remapping, checks duplicate-import
idempotency, restores and deletes the facts in a fresh process, then verifies
their absence in another fresh process. The CI platform matrix retains its JSON
output. It does not prove Hindsight access or external-provider deletion.

### Live ChatGPT worker termination and durable-result recovery

With a dedicated signed-in profile, an explicitly selected model and a locally available digest-pinned Docker image:

```text
node --import tsx scripts/chatgpt-runtime-crash.ts ABSOLUTE_SUBSCRIPTION_ROOT ACTOR MODEL sha256:IMAGE_DIGEST ABSOLUTE_NEW_EVIDENCE_FILE
```

This spends up to four bounded subscription requests on a synthetic pre-approved task. It terminates only its generated acceptance child after durable Docker result publication and before worker receipt finalization. The parent recovers the result without model requests or execution, checks the artifact independently, requires pending final approval, rejects duplicate recovery and reopens the saved store. The profile is preserved; generated fixture files and owned containers are cleaned. This does not prove recovery of a partial command, automatic approval, or browser reconnection. Evidence output must not already exist. Keep account data and evidence paths outside the checkout; publish only the sanitized result.

### Live ChatGPT cancellation and explicit restore

```text
node --import tsx scripts/chatgpt-live-cancellation.ts ABSOLUTE_SUBSCRIPTION_ROOT ACTOR MODEL ABSOLUTE_NEW_EVIDENCE_FILE
```

Uses exactly one cancelled inference plus one explicit post-restore inference when successful, with a hard two-request ceiling. Cancellation occurs after successful provider response headers, before model output is released. Only synthetic text is sent. It preserves protected sign-in data and writes sanitized stage/count evidence; it does not claim provider-side billing cancellation or token expiration. No automatic retries or sign-in discovery are performed.
