# Local release evidence

Status: local preparation only. This file is not a publication approval or a registry release record.

## Revision

- Local release-readiness revision: `96809cb4adf60656324db3e52e4af430bee127f0`

## Frozen research inputs

| Input | SHA-256 |
| --- | --- |
| `docs/research/PROTOCOL.md` | `554d7dbe827d0e6b4d2232c6168688b318c2514693355188c12127ec890dd6d7` |
| `research/tasks/offline-intent-v1.json` | `f222d1ceaed11b8b3723a9319537f56716e45069fdd7c76306e14238da696a48` |
| `research/config/pilot-v0.1.json` | `ac9745833b7a6a0275b64d0f896c21f0e0b27d88c3206dd28639c1c273a22f2b` |

## Local verification commands

```text
pnpm typecheck
node --import tsx research/runner/mechanicsSweep.ts
node scripts/website-link-acceptance.mjs
node scripts/website-mobile-acceptance.mjs
node website/verify-static.mjs
node scripts/public-release-readiness.mjs
node scripts/public-package-acceptance.mjs
node scripts/package-cli-acceptance.mjs
```

The mechanics sweep is synthetic and zero-spend. Hosted CI, model-backed measurements, registry publication and provenance verification are not represented as complete here.
