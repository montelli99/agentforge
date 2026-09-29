# Hosted CI verification

Status: verified for the public acceptance and cross-platform build matrix.

The public workflow is `.github/workflows/ci.yml`. The verified run executed the public boundary check plus the Linux, macOS, and Windows Node 22/24 build matrix without provider credentials or personal workspace data.

## Acceptance record

Latest run:

- Run: https://github.com/montelli99/agentforge/actions/runs/36613614147
- Commit: `e737a74e6b16065eea8b26eb40f52441d6eef8df`
- Result: all 7 jobs passed.

- Run: https://github.com/montelli99/agentforge/actions/runs/36591463968
- Commit: `cef8da43d04a1df9709c070d5969628f97a56437`
- Result: all 7 jobs passed.
- Public package and isolated execution acceptance: passed.
- Linux, macOS, and Windows Node 22/24 build and test jobs: passed.
- Public artifacts contain no provider credentials, private workspace records, or owner-specific operations data according to the repository privacy gate.

This proves hosted build and public-boundary acceptance. It does not prove model-backed quality, live provider round trips, registry publication, or publication acceptance.


