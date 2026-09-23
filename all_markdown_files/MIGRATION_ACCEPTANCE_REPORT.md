# AgentForge vNext Migration Test Evidence

**Reviewed:** 2026-09-22
**Result:** Fixture-level tests only; no migration readiness or production conformance claim.

## What has been exercised

`src/migrationAndE2E.test.ts` runs local provider code against checked-in synthetic fixtures for legacy/current OpenClaw-shaped data, Hermes/Grok-shaped data, and a generic manifest. It checks selected inspect, plan, dry-run, import, and verification behaviors. These tests do not read a live account, prove exhaustive schema compatibility, or compare complete behavior with a running source system.

| Source family | Evidence currently present | Not established |
|---|---|---|
| OpenClaw legacy/current | Separate checked-in fixtures and adapter tests | Compatibility with all real versions/configurations; production migration; full behavior parity |
| Hermes | Synthetic fixture/provider test | Complete export format coverage or live account inspection |
| Grok Bot | Synthetic fixture/provider test | Private/unavailable data extraction or undocumented API behavior |
| Generic manifest | Local schema/adapter test | Broad third-party interoperability |

The earlier exact item counts, `100% Conforming` percentages, and blanket `PASSED` labels have been removed because the current evidence does not define a representative denominator or support those claims.

## Safe next acceptance gate

Add sanitized, user-provided export fixtures with provenance and schema versions. Test discovery, inspection, transformation, dry-run, import, post-import comparison, secret redaction, malformed input, partial failure, retry, and rollback independently. Keep production systems disconnected. Any future live migration requires explicit authorization and a separate cutover plan.
