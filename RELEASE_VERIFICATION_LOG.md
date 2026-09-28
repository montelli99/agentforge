# Release verification log

This file records externally verified evidence for the public release candidate.

## Revision 49e1576

- Branch: `vnext`
- Hosted workflow run: `36443192403`
- Result: passed
- Matrix: Ubuntu, macOS, and Windows on Node 22 and Node 24
- Public package and isolated execution acceptance: passed
- Website link and footer acceptance: passed locally (`35` pages scanned)
- Privacy acceptance: passed locally
- Build and type checks: passed in hosted matrix

The repository is package-ready. Publishing to a registry remains a separate operator-authorized action and is intentionally not performed by this verification log.

## Revision 32435c9

- Hosted workflow run: `36444385078`
- Result: passed
- All seven jobs passed, including Windows, macOS, Ubuntu, Node 22, Node 24, and public-package acceptance.

## Revision 4b7c0be

- Hosted workflow run: `36445764577`
- Result: passed
- All seven jobs passed with bounded matrix execution time.

## Revision 8cb7d4e

- Hosted workflow run: `36447987934`
- Result: passed
- All seven jobs passed after adding the public 404 page and link-scan coverage.

## Revision 400bc40

- Hosted workflow run: `36448562514`
- Result: passed
- All seven jobs passed after recording the website acceptance evidence.

## Revision a71ffe7

- Hosted workflow run: `36449217125`
- Result: passed
- All seven jobs passed after requiring the privacy-safe 404 page, robots file, and sitemap in the static deployment verification.
- Public package and isolated execution acceptance: passed.

## Public tarball smoke test

- Built `agentforge-0.1.0.tgz` with `pnpm pack`.
- Installed it into a clean temporary npm project with no workspace dependencies.
- Verified the published CLI starts and returns its help/usage output through `npm exec agentforge --help`.
- Verified package metadata reports `agentforge` version `0.1.0`.
- Verified the installed `agentforge status` command runs from the isolated project and reports the expected staging readiness state.

## Revision 45cde1c

- Hosted workflow run: `36450788557`
- Result: passed
- All seven jobs passed after correcting the public repository privacy allowlist for canonical package metadata.
- Release audit: `packageReady: true`, with no local blockers.

## Revision 24b50a2

- Hosted workflow run: `36451402377`
- Result: passed
- All seven jobs passed after refreshing the launch execution evidence.
