# PHASE 9Y — Next Session To-Do

## Prerequisites
- /new session needed (exec tool broken)

## DB Data (intact, not lost)
- token_social_metadata_snapshots: 249 rows (Jupiter + DexScreener social metadata)
- moonshot_outcomes: ~201 rows (actionability labels)
- jupiter_quote_observations: collecting (supervisor running)
- token_price_observations (jupiter_quote): collecting

## Files Written
- src/narrative_tagger.py
- tools/collect_social_metadata.py
- tools/run_jupiter_observer_supervised.py
- tools/probe_jupiter_v7.py
- reports/phase_9x_ultrafast_jupiter_observer_validation_2026-08-08.md

## Phase 9Y Scripts Needed
All written. Scripts to run in next session:
1. python tools/collect_social_metadata.py (re-run for fresh mints)
2. python tools/label_jupiter_quote_outcomes_v2.py (refresh labels)
3. Run social edge analysis JOIN queries

## Phase 9Y Next Session Commands
```bash
cd Orion
python tools/collect_social_metadata.py  # refresh social metadata
python tools/label_jupiter_quote_outcomes_v2.py  # refresh labels
sqlite3 decoded_swaps.db  # manual queries
```

## Supervisor
- tools/run_jupiter_observer_supervised.py — keeps Jupiter observer alive
- runtime/jupiter_quote_observer.heartbeat.json
- logs/jupiter_quote_observer_supervisor_2026-08-08.log
