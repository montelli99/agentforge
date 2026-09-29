# Local release evidence

Status: local preparation only. This file is not a publication approval or a registry release record.

## Revision

- Local release-readiness revision: `3c58486030e1d4b3ee644fac95dd1883876caad7`

## Frozen research inputs

| Input | SHA-256 |
| --- | --- |
| `docs/research/PROTOCOL.md` | `2a6f39245767bba869b3e8842ba9488147e92f1e4a8d17d02748ac132bf7e1eb` |
| `research/tasks/offline-intent-v1.json` | `f222d1ceaed11b8b3723a9319537f56716e45069fdd7c76306e14238da696a48` |
| `research/tasks/protocol-families-v1.json` | `b85f50dfa23a3b08041ce5b492187e2aaf1cd059b7d03937f4945747e5521dcb` |
| `research/tasks/protocol-families-v1-heldout.json` | `b59c928972cde8f80974a76d45022d72aff1588d763d40c891f6f1fa48f1e173` |
| `research/config/pilot-v0.1.json` | `707c5066608dce915028af5b709190a1fbe6259e2521c3be25ed89b5fcfd0dee` |

## Sanitized mechanics records

| Record | SHA-256 |
| --- | --- |
| `research/results/mechanics-2026-09-29.json` | `b04b24c45ed0059b4615d9ac15e554ec68352d9b99683b3c887db8b5cc81fdab` |
| `research/results/mechanics-2026-09-29T03-30-05-509Z-1ee36755-2f80-4427-9d5e-17ea58fd96bd/consolidated.json` | `2d54400962a838929b133c5d9f12d7212cad6193f9a42f4bdce93df302b1b7d0` |
| `research/results/mechanics-2026-09-29T13-25-42-271Z-908ee290-832e-49a1-b8d1-2f4cc85f9c45/consolidated.json` | `21501E4EB11C164496054AABE243BDABD5EEC788DF33AFA13C67E090B5CA3311` |

## Local verification commands

```text
pnpm typecheck
pnpm test --reporter=dot  # 89 files, 494 passed, 2 skipped on 2026-09-29
node --import tsx research/runner/mechanicsSweep.ts  # includes protocol-family, accounting and production-path smoke checks
node scripts/website-link-acceptance.mjs
node scripts/website-mobile-acceptance.mjs
node website/verify-static.mjs
node scripts/public-release-readiness.mjs
node scripts/public-package-acceptance.mjs
node scripts/package-cli-acceptance.mjs
pnpm test:research:clean-export
pnpm test:research:review-packet
pnpm test:research:source-register
node scripts/release-evidence-acceptance.mjs
```

The mechanics sweep is synthetic and zero-spend. The latest isolated rerun passed 22 registered checks, including development and held-out scorer controls. Docker network denial was verified; complete network/provider call counts remain unmeasured. Hosted CI, model-backed measurements, registry publication and provenance verification are not represented as complete here.

## Latest mechanics verification

- Run date: `2026-09-29`
- Result: `PASS`
- Registered checks: `22`
- Network boundary: Docker network denial verified
- Network/provider call counts: `unmeasured`
- Frozen input hashes: unchanged from the manifest above
- Scope: fixture integrity, accounting, production-path wiring, measured-run guard, context integrity, correction transfer, workflow recovery, durable memory, handoff, protocol/evidence/manuscript validation
- Boundary: this is mechanics evidence only; it is not a model-quality, cost, latency, or production-performance result.

## Latest full regression

- Run date: `2026-09-29`
- Result: `PASS`
- Test files: `89`
- Tests: `494 passed`, `2 skipped`

## Latest local release-readiness verification

- Run date: `2026-09-29`
- `public-release-readiness.mjs`: `packageReady: true`; no local blockers
- Public package and archive acceptance: passed
- CLI package acceptance: passed
- Website link acceptance: 42 pages checked; 39 pages include footer navigation
- Website mobile acceptance: passed for 42 pages
- Static website verification: passed
- Research review-packet acceptance: 16 required files present; state `MECHANICS_VERIFIED`
- Current mechanics evidence: run `mechanics-2026-09-29T13-25-42-271Z-908ee290-832e-49a1-b8d1-2f4cc85f9c45` under `research/results/` (22 checks; network/provider call counts explicitly unmeasured)
- Remaining external proof: hosted CI, registry publication and provenance verification
