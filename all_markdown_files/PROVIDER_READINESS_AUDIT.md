# AgentForge vNext Provider Readiness Audit

**Reviewed:** 2026-09-23
**Standard:** Local code/tests are not live-service evidence. A production-ready claim requires complete, authorized integration and security acceptance.
**Authority:** `src/core/types/providerReadiness.ts`; the UI must not contradict the registry.

| Provider/capability | Current label | What exists | What remains before live/production claim |
|---|---|---|---|
| Pi harness | TEST_IMPLEMENTATION | Explicitly opted-in contract simulation only | Official supported upstream package/API integration and end-to-end task lifecycle |
| Pydantic AI harness | NOT_CONFIGURED | Explicitly opted-in structured-output simulation only | A real service adapter and end-to-end task lifecycle |
| AgentForge native harness | TEST_IMPLEMENTATION | Explicitly opted-in in-memory contract simulation only | Real execution engine, OS sandbox, complete contract mediation, cancellation/budget/evidence enforcement |
| Jev decision provider | TEST_IMPLEMENTATION | Local reference classifier | Independent provider acceptance and calibrated quality evidence |
| Ollama model | PARTIAL_INTEGRATION | REST code for discovery/request paths; tiered routing now chooses a model discovered on the local daemon and skips unverified local vision targets | Repeatable local daemon tests for generation, streaming, structured output, timeout/cancel, and unavailable daemon |
| OpenAI-compatible model | PARTIAL_INTEGRATION | Configurable request adapter forwards tools, JSON mode, and stop sequences; parses ordinary and streamed tool calls; leaves cost unknown without model-specific pricing evidence | Provider-specific live acceptance; secret storage and error/rate-limit behavior |
| MiMo model | PARTIAL_INTEGRATION | OpenAI-compatible request adapter | Current repeatable live tests, model capability verification, credential/redaction validation |
| Telegram mirror | TEST_IMPLEMENTATION | Local mapping/guard logic and fixture tests | Separate sandbox bot tests, durable/idempotent bidirectional behavior, authenticated identity/RBAC |
| Discord mirror | TEST_IMPLEMENTATION | Local mapping/mock behavior | Authorized sandbox connection and end-to-end event/action verification |
| Native web channel | TEST_IMPLEMENTATION | Local REST/SSE and in-process message feed | Durable state, authenticated identity, browser acceptance, reconnect/error behavior |
| Scribe file parser | TEST_IMPLEMENTATION | Local Markdown/HTML/SOP text parsing | Robust file-ingestion limits, malformed-input security tests, full user acceptance; this is not Scribe cloud integration |
| Scribe MCP | NOT_CONFIGURED | Provider capability slot | Authorized MCP endpoint and real request tests |
| Scribe live sync | UNIMPLEMENTED | No continuous sync | Implementation and provider acceptance |
| Retell | SKELETON | Provider contract/types | Staging credentials, webhook verification, sandbox calls, transcript/usage tests |
| Mock voice | MOCK | Local deterministic simulation | Never describe as telephony integration |
| AGNI voice | UNIMPLEMENTED | No verified provider identity | Identify exact provider using authoritative source before implementation |

All three harness fixtures now fail closed by default: `executeTask` returns failure with a clear “No task was executed” message unless a test explicitly opts into simulation. Their advertised runtime capabilities are false until real integrations exist. Setting a Pydantic bridge URL alone does not make its provider active because no network adapter is implemented.
| Operational memory | LOCAL IMPLEMENTATION | Launcher-backed workspace snapshot persistence; title/content, category, tag, and project filtering with shared-rule semantics; local UI record entry and API create/list/query endpoints | Automatic worker retrieval, retrieval/staleness/duplicate evaluation, cross-process durability, and production workflow integration |
| Local compute | TEST_IMPLEMENTATION | Synthetic/local contract surface | Actual isolated runtime and adversarial escape/resource tests |
| OpenClaw/Hermes/Grok/generic migrations | TEST_IMPLEMENTATION | Fixture-based inspect/plan/dry-run/import code | Real sanitized exports, broad schema coverage, complete verification; no production access |

## Cross-checks performed

- `AgentForgeNativeHarnessProvider.executeTask` returns a synthetic string; it does not launch an isolated OS workload. Its implemented path check only runs when `inputFiles` and a contract are supplied.
- The vNext launcher now uses versioned local JSON snapshots for `WorkspaceStore`, including event-ledger records and external bindings, with a `.bak` recovery copy. `OperationalMemoryProvider` remains an in-process prototype; it is not the same feature as durable canonical workspace state.
- Migration adapters import fixture objects when no explicit source data is provided; current tests exercise fixtures, not live systems.
- Channel and voice tests must be described as local/mock unless a sandbox service run is recorded.
- Scribe's parser handles supplied text. It does not connect to the Scribe service; MCP is not configured and cloud sync is unimplemented.

## Release rule

The registry and UI should label capability evidence, not imply production suitability. Do not promote a provider because its interface exists or its unit tests pass. Record date, target/version, non-secret configuration method, exact workflow, test result, and limitations for each future live acceptance run.
