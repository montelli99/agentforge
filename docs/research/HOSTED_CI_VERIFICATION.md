# Hosted CI verification

Status: deferred. The local research bundle is verified, but the hosted gate is intentionally deferred until the complete bundle is published together.

The public workflow is `.github/workflows/ci.yml`. Its `public-acceptance` job now runs `pnpm test:research:all` after the public-release boundary check. The research step requires no provider credentials and must run with empty provider-secret environment variables.

## Acceptance record

Record the first GitHub Actions run URL, commit SHA, job conclusion, and the research bundle output. The hosted result is complete only when all of these are true:

- `public-acceptance` succeeds.
- `Verify research mechanics and publication evidence bundle` succeeds.
- The output reports clean export, review packet, route policy, source register, 22 mechanics checks, manuscript validation, and release-evidence validation as passing.
- No provider credentials or personal repository identifiers appear in the job output or public artifacts.

The latest local evidence before hosted execution is:

- Mechanics run: `mechanics-2026-09-29T13-25-42-271Z-908ee290-832e-49a1-b8d1-2f4cc85f9c45`.
- Consolidated SHA-256: `21501E4EB11C164496054AABE243BDABD5EEC788DF33AFA13C67E090B5CA3311`.
- Local product-isolation acceptance: passed.
- Local `pnpm test:research:all`: passed.

Do not mark hosted CI complete from local output alone. After the workflow is published and runs, update `STATUS_MATRIX.md`, `RELEASE_EVIDENCE.md`, and `RESEARCH_PROGRESS.md` with the immutable run URL and commit SHA.
