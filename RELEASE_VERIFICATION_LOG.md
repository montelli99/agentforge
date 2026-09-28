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
