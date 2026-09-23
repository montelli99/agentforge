# Capital IQ Pipeline - Project Configuration

## Project: Executive Intelligence Database
**Status:** Active - Background worker running

---

## Data Sources

| Source | Records | Location |
|--------|---------|-----------|
| SEC Edgar | 922,404 companies | LeadsDB/SEC_Edgar.duckdb |
| Apollo | 87M contacts | LeadsDB/Apollo.db |
| LinkedIn | 76M profiles | LeadsDB/LinkedIn.db |
| SEC Executives (parsed) | ~297 | LeadsDB/sec_exec_staging/ |

---

## Current Output

**Validated Contacts:** 35 executives with verified corporate emails

**Sample Contacts:**
- Ramon Laguarta (PepsiCo) → ramon.laguarta@pepsico.com
- Javier Olivan (Meta) → javier.olivan@facebook.com
- Greg Peters (Netflix) → gpeters@netflix.com
- Edward Decker (Home Depot) → edward.decker@homedepot.com

**Export:** `LeadsDB/capital_iq_contacts.csv`

---

## Architecture

### Pipeline Flow
1. SEC DEF 14A → Extract executives
2. Company-anchored matching (name + company + email domain)
3. DuckDB storage
4. CSV export

### Worker System (Background)
- Task queue: `LeadsDB_Local/queue/tasks.json`
- Worker: `LeadsDB_Local/worker.py`
- Logs: `LeadsDB_Local/logs/worker.log`

---

## Key Scripts

| Script | Purpose |
|--------|----------|
| `LeadsDB_Local/worker.py` | Background worker process |
| `LeadsDB_Local/queue/tasks.json` | Task queue (100 tickers) |
| `LeadsDB_Local/scripts/parse_executives_final.py` | SEC parser |
| `LeadsDB_Local/scripts/full_match.py` | DuckDB join matching |

---

## How to Resume

1. **Check worker status:**
   ```bash
   cat LeadsDB_Local/queue/tasks.json
   cat LeadsDB_Local/logs/worker.log
   ```

2. **Start worker if stopped:**
   ```bash
   python LeadsDB_Local/worker.py
   ```

3. **Parse new filings:**
   ```bash
   python LeadsDB_Local/scripts/parse_executives_final.py
   ```

4. **Enrich with company validation:**
   ```bash
   python LeadsDB_Local/scripts/full_match.py
   ```

---

## Matching Logic

**Company-Anchored Matching (validated approach):**
1. Match by: name + company
2. Validate email domain matches company domain
3. Example: "Brian Moynihan" + "BAC" → must have @bankofamerica.com

This approach filters out false positives from name-only matching.

---

## Files Created

- `LeadsDB/exec_raw.duckdb` - Parsed executives
- `LeadsDB/capital_iq_contacts.csv` - Validated export
- `LeadsDB_Local/db/pipeline_jobs.duckdb` - Job tracking

---

## Next Steps (When Worker Completes)

1. Parse ~100 new SEC filings
2. Re-run enrichment with company validation
3. Target: 300-600 validated contacts
4. Scale to 500+ companies
