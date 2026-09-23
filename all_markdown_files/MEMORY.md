<!-- openclaw-usage-start -->
## Usage Guardrails
- DeepSeek is the final reasoner.
- Smaller agents draft only and must report evidence or say unknown.
- Do not trust unverified model output for config, routing, or memory facts.

## Latest Usage Snapshot
- Updated: 2026-08-29T10:30:00.000Z
- Agent: multiapp-opencode
- Session: (current session)
- Run: watchdog recovery + persistent safety infrastructure built

<!-- openclaw-usage-end -->

# PROJECT STATUS - Last Updated: 2026-08-17

## ⚠️ CRITICAL: Before Switching Context
See `memory/orion_comprehensive_memory.md` for full Orion Trading memory dump covering everything through 2026-08-17.

---

## ORION TRADING — Current State (2026-08-29)

### Critical: Everything Stopped Aug 25
Runtime truth audit (2026-08-29) confirmed: ALL Orion processes stopped after Aug 25 session ended. No scripts ran Aug 26-29. No Telegram alerts received.

**Root cause:** Processes were not set up as Windows Task Scheduler tasks. They depended on a session that got compacted/killed. No watchdog was running.

### Watchdog + Kill Switch Built (2026-08-29)
All files in `Orion/`:
- `tools/orion_watchdog_service.py` — persistent watchdog, 5-min loop, killswitch + safety + source labels
- `tools/orion_kill_switch.py` — file-backed killswitch, status/kill/resume/test commands
- `tools/orion_telegram_monitor.py` — read-only monitor commands
- `scripts/install_orion_watchdog_task.ps1` — Windows Task Scheduler installer (boot + every 5 min)
- `scripts/remove_orion_watchdog_task.ps1` — task remover
- `scripts/status_orion_watchdog_task.ps1` — full status checker

**Install:** `.\scripts\install_orion_watchdog_task.ps1` (as Admin)
**Test:** `py tools\orion_kill_switch.py test`
**Status:** `.\scripts\status_orion_watchdog_task.ps1`

### Orion State: STOPPED — BUILD COMPLETE — MANUAL INSTALL REQUIRED
Exec blocked — Montelli must run install manually. Reports in `Orion/reports/orion_*_2026-08-29.md`.

### Full Memory Dump
See `memory/orion_comprehensive_memory.md` for complete Orion Trading context.

### Quick Status
- **Goal**: $100 → $1M via 50x-100x meme token moonshots (ACID test)
- **BRAIN**: Orion/VCS tools + PumpPortal WS + GeckoTerminal + Helius + Alchemy
- **COCKPIT**: Axiom browser (full DOM access via OpenClaw browser tool)
- **Framework**: `AI_Workspace/axiom_trade_review.py` + `BROWSER_TRADING_PLAN.md`
- **Axiom account**: montelliscottrei@gmail.com (Digital Doctor Solutions)
- **Browser tab** (last session): `C6BA94BF8EF0E53B3A1DBF0F69E0B5AE`
- **Daemon**: PID 15680 running stale code (needs manual restart)
- **DBs**: `orion_signals.db`, `wallet_events.db`, `paper_shadow.db`

### ⚠️ Active Blockers
- **Jupiter DNS**: Broken from this Windows machine (jup.ag fails)
- **Axiom API**: Token expired March 2026, endpoint 404
- **PumpPortal REST**: 404, WebSocket only working
- **Exec tool**: Intermittently dead, sessions compact
- **Paper Shadow**: Running stale code, fix not propagated

### NO TRADE GATES (All Must Pass)
Age < 3min ❌ | Top holder > 40% ❌ | Bundle > 25% ❌ | MC < $25K ❌ | Liq < $10K ❌

### Entry/Exit Rules
- Entry: 0.005-0.01 SOL proof-of-skill (NOT 0.05)
- Slippage: 5-10% conservative, 10-15% normal, 20-25% emergency
- TP1: 2x (50%), TP2: 5x (30%), TP3: 10x (20%), SL: -20%
- MURAD only validated edge; KOFI needs real wallet data

### Decision Labels
NO_TRADE | WATCH | HUMAN_APPROVAL | PAPER_VALIDATION

### Moonshot Framework (Phase 9)
- Alert tiers: WATCH_ONLY / EARLY_RUNNER / MOONSHOT_CANDIDATE / HIGH_RISK_MOONSHOT / AVOID
- All alerts: "OBSERVATION ONLY — NOT AUTO-TRADE AUTHORIZED"
- Tables: `moonshot_tracking_watchlist`, `moonshot_outcomes`, `moonshot_feature_snapshots`

---

## Prolific Capital Fund - Knowledge Base (2026-04-09)
- Full history from "ADD A Level Team" Telegram export saved to: `memory/fund/add-a-level-team.md`
- Quick reference: `memory/fund/QUICK_REFERENCE.md`
- Contains: Team members, entities (Potomac Acquisitions, Potomac Development Group), tools stack (Privy, Flipper Force, Apollo, Flowtrack), buy box criteria, funding strategy, vendor network

## SEC Edgar Database
- ✅ 922,404 companies loaded in `LeadsDB/SEC_Edgar.duckdb`
- ✅ 22,258 DEF 14A filings identified from 8,303 companies
- ✅ sec-edgar-downloader installed and working

## DEF 14A Executive Data
- ✅ PARSING WORKING - 302 executives from 37 companies (8.2 avg)
- ✅ Worker queue system running (100 tickers queued)
- ✅ 109+ filings downloaded via background worker
- ✅ Saved to DuckDB: `LeadsDB_Local/db/exec_raw.duckdb`

## Pipeline Status (Active)
1. ✅ SEC DEF 14A → Extract executives (working)
2. ✅ Apollo enrichment with company-anchored matching
3. ✅ Email domain validation (reduced false positives 102→35)
4. ✅ LinkedIn enrichment (8 profiles matched)
5. ✅ CSV export: `LeadsDB_Local/db/capital_iq_contacts.csv`

## Validated Contacts (35)
- Ramon Laguarta (PepsiCo) → ramon.laguarta@pepsico.com
- Javier Olivan (Meta) → javier.olivan@facebook.com
- Greg Peters (Netflix) → gpeters@netflix.com
- Edward Decker (Home Depot) → edward.decker@homedepot.com

## Architecture
- Task queue: `LeadsDB_Local/queue/tasks.json`
- Worker: `LeadsDB_Local/worker.py` (background process)
- Job tracking: `LeadsDB_Local/db/pipeline_jobs.duckdb`
- Config: `PIPELINE_CONFIG.md`

## Next Steps
1. Parse ~100 new filings from worker
2. Re-run enrichment → target 300-600 validated contacts
3. Scale to 500+ companies

---

## LinkedIn Pipeline (PAUSED)

### Resume Point
- **Pending**: Validate 5M run in `LeadsDB/linkedin_5m_v2.duckdb`
- **Needs**: Title filter fix (reject single-word), batch processing (50K chunks)
- **500K DB**: Validated - 43,886 valid (~8.8%)
- **5M DB**: ~496K valid (~9.1%), needs full validation

---

## Axiom Browser Control
*(See `memory/orion_comprehensive_memory.md` for full details)*
- Browser profile: `user` at `C:\Users\mscott\.openclaw\browser\user\user-data`
- Axiom account: montelliscottrei@gmail.com (Digital Doctor Solutions)
- Full DOM access confirmed working as of 2026-08-16
- **CRITICAL**: Never close browser tool window — session resets
