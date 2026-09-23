# AgentForge vNext Storage Status and Decision

**Reviewed:** 2026-09-23
**Status:** Local snapshot persistence implemented; release durability gate remains open.
**Scope:** Current vNext launcher and `WorkspaceStore`, not the legacy optimization prototype.

## Current behavior

`src/server/start.ts` creates a `WorkspaceStore` using `getDefaultWorkspaceFilePath()` and passes it into the web server. Set `AGENTFORGE_DATA_DIR` to choose the data directory. Otherwise the snapshot is written under the current user's local application data directory as `.agentforge/workspace.json`.

The store writes schema-version-5 JSON snapshots after mutations. It includes canonical workspace objects and messages, users and agents, tasks, approvals, processes, retained prior revisions, pending/decided process revision proposals, process-to-agent assignments, calls, package registrations/installations, benchmark results, audit records, event-ledger entries, and external bindings. Version-1 through version-4 snapshots migrate to version 5; older snapshots start with no process assignments. Writes use a temporary file and rename; the preceding snapshot is retained as `.bak`. On malformed or unsupported primary data, startup tries the backup and repairs the primary without rotating the known-good backup over itself. Test/embedded callers can continue using `new WorkspaceStore()` for isolated in-memory state.

The dedicated persistence tests exercise restart restoration of representative collections, operational memory, process revision history and proposals, process-to-agent assignments, preservation of event deduplication and bindings, corruption recovery, backup preservation, unsupported-schema fallback, and HTTP-created messages and memory read after restarting the built vNext server on the same data directory. Migration tests cover version-1/2/3/4 snapshots to version 5.

## Decision and limits

The selected vNext local persistence path is atomic JSON snapshots, not SQLite. This is a pragmatic single-process local store for current staging, not a claim of database-grade concurrency, multi-process safety, guaranteed power-loss durability, encryption at rest, or production readiness. Operational memory now uses this workspace snapshot through the launcher-backed provider; semantic retrieval and automatic worker integration remain unimplemented.

Keep the product marked in development. The built vNext launcher now passes one real HTTP create → process shutdown → restart → HTTP read acceptance run using an isolated data directory. The broader release durability gate remains open until abrupt process termination and interrupted writes are tested, concurrent writers are guarded or explicitly rejected, supported operating systems are exercised, and storage/backup contents receive a secret-handling review. No production integrations are configured by this work.

## Remaining acceptance tests

1. Pass `pnpm build` and `pnpm test:persistence:launcher`; this acceptance starts the built launcher twice with an isolated temporary data directory and verifies an HTTP-created record survives process restart.
2. Kill the process during a write and verify recovery from primary or backup without silent state loss.
3. Define and enforce single-writer behavior; test overlapping writers or fail startup when a second writer opens the same data directory.
4. Run the persistence suite on supported macOS and Linux environments in addition to the current Windows pass.
5. Verify logs, exports, primary snapshots, and backups do not expose secrets; document that the JSON file is not encrypted at rest.
6. Keep migration and backup-recovery regression tests when evolving the schema; current tests cover version-1/2/3/4 migration to version 5 and fallback from an unsupported primary to the backup.
