# AgentForge vNext — Production Isolation Contract

**Status**: ACTIVE & STRICTLY ENFORCED  
**Workspace**: `C:\Users\mscott\AI_Workspace\AgentForge-Staging`  
**Git Branch**: `vnext` (Isolated independent repository)

---

## 1. Absolute Boundary Guarantees

AgentForge vNext is a **greenfield / staging replacement architecture**.
The currently working OpenClaw / Clawbot / PPC environment is **PRODUCTION** and MUST remain untouched.

### Zero-Touch Boundaries
The following systems, repositories, and assets are strictly READ-ONLY references or completely forbidden from modification:
- `C:\Users\mscott\AI_Workspace\OpenClaw` (source, configuration, skills, cron)
- `C:\Users\mscott\AI_Workspace\prolificcapital` / `prolificcapital-recovery`
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
2. **Independent Databases & Storage**: Uses dedicated staging/in-memory SQLite/vector stores with zero shared tables or file descriptors with OpenClaw/PPC.
3. **Mocks & Fixtures First**: All external connectors (Telegram, Discord, SMS, Webhooks) operate via mock adapters, fixture playback, or dedicated non-production sandboxes.
4. **Decoupled Code**: Zero imports or runtime dependencies on `OpenClaw` production modules.

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

The existing production system is the immutable rollback baseline and remains 100% operational.
There is **NO production cutover authorization** in this workstream.
