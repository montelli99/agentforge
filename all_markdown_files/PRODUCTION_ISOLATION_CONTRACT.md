# AgentForge vNext — Production Isolation Contract

**Status**: Development boundary and operating rule; not a substitute for technical isolation testing.
**Git Branch**: `vnext` (Isolated independent repository)

---

## 1. Absolute Boundary Guarantees

AgentForge vNext is a **greenfield / staging replacement architecture**.
The currently working OpenClaw / Clawbot / PPC environment is **PRODUCTION** and MUST remain untouched.

### Zero-Touch Boundaries
The following systems, repositories, and assets are strictly READ-ONLY references or completely forbidden from modification:
- OpenClaw production source, configuration, skills, and scheduled jobs
- PPC production repositories and databases
- `Hermes` repositories
- `Orion` / VCS trading environments
- PPC production code & databases
- JustCall integrations & webhooks
- GoHighLevel (GHL) production integrations
- Live Telegram bot production routing / webhooks
- Production credentials & secrets

---

## 2. No Shared Writable State

AgentForge vNext operates in strict isolation:
1. **Dedicated Repository**: Lives in its own initialized Git repository (`AgentForge-Staging/.git`) on branch `vnext`.
2. **Independent Storage**: The vNext server uses its own local JSON `WorkspaceStore` under the configured AgentForge data directory; it does not open production databases. This local staging snapshot includes canonical collections and the event ledger, but it is not encrypted, multi-writer safe, or accepted as production-grade durability.
3. **Mocks & Fixtures First**: Use mock adapters or sanitized fixtures by default. This rule does not prove every connector is technically incapable of external access.
4. **Decoupled Code**: Do not import production OpenClaw modules. Verify this with source/dependency checks before release claims.

---

## 3. Seven-Stage Migration Lifecycle

Under no circumstances will production services be stopped, replaced, or migrated without advancing through every stage of this lifecycle:

```
[ 1. BUILD ]
      │
      ▼
[ 2. TEST ] (Automated contract verification & regression suites)
      │
      ▼
[ 3. SHADOW ] (Read-only mirror observation without side-effects)
      │
      ▼
[ 4. COMPARE ] (Side-by-side reliability, cost, and latency verification)
      │
      ▼
[ 5. MIGRATION PLAN ] (Detailed rollback-safe execution plan with approval gates)
      │
      ▼
[ 6. CONTROLLED CUTOVER ] (Gradual traffic routing under explicit human approval)
      │
      ▼
[ 7. VERIFY ] (Production telemetry confirmation)
      │
      ▼
[ RETIRE LEGACY COMPONENTS ] (Only after verified superior performance)
```

---

## 4. Rollback Baseline

Production systems are outside this workstream. Their availability is not assessed here. There is **NO production cutover authorization** in this workstream.
