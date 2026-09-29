# Hosted CI verification

Status: verified for the public acceptance and cross-platform build matrix.

The public workflow is `.github/workflows/ci.yml`. The verified run executed the public boundary check plus the Linux, macOS, and Windows Node 22/24 build matrix without provider credentials or personal workspace data.

## Acceptance record

- Run: https://github.com/montelli99/agentforge/actions/runs/36584747789
- Commit: `ebcc0e889c87e9a6e46b851c1490dd930b5fcc91`
- Result: all 7 jobs passed.
- Public package and isolated execution acceptance: passed.
- Linux, macOS, and Windows Node 22/24 build and test jobs: passed.
- Public artifacts contain no provider credentials, private workspace records, or owner-specific operations data according to the repository privacy gate.

This proves hosted build and public-boundary acceptance. It does not prove model-backed quality, live provider round trips, registry publication, or publication acceptance.
