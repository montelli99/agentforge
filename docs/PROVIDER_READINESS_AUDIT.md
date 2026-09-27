# AgentForge vNext Provider Readiness Audit

**Reviewed:** 2026-09-27
**Standard:** Local code/tests are not live-service evidence. A production-ready claim requires complete, authorized integration and security acceptance.
**Authority:** `src/core/types/providerReadiness.ts`; the UI must not contradict the registry.

| Provider/capability | Current label | What exists | What remains before live/production claim |
|---|---|---|---|
| Pi execution engine | PARTIAL_INTEGRATION | Optional `PiSdkExecutor` embeds the installed Pi SDK with in-memory sessions and real prompts; the AgentForge Harness remains the controlling boundary and the default remains fail-closed | Deployment authentication, governed tool mediation, OS isolation, cancellation, and end-to-end acceptance |
| Pydantic AI execution engine | PARTIAL_INTEGRATION | Optional HTTPS/loopback executor calls a separately deployed Pydantic service with bounded JSON output and usage reporting; the AgentForge Harness remains the controlling boundary and the default remains fail-closed | A production Pydantic deployment, structured schema validation, tool mediation, identity, and end-to-end acceptance |
| AgentForge native harness | PARTIAL_INTEGRATION | Opt-in `NativeComputeExecutor` runs explicitly approved commands through the configured compute provider; default remains fail-closed and contract checks remain below the harness | Full contract-to-command mediation, OS isolation acceptance, cancellation/budget/evidence enforcement, and end-to-end deployment verification |
| Jev decision provider | TEST_IMPLEMENTATION | Local reference classifier | Independent provider acceptance and calibrated quality evidence |
| Ollama model | PARTIAL_INTEGRATION | REST code for discovery/request paths; tiered routing now chooses a model discovered on the local daemon and skips unverified local vision targets | Repeatable local daemon tests for generation, streaming, structured output, timeout/cancel, and unavailable daemon |
| OpenAI-compatible model | PARTIAL_INTEGRATION | Configurable request adapter forwards tools, JSON mode, and stop sequences; parses ordinary and streamed tool calls; leaves cost unknown without model-specific pricing evidence | Provider-specific live acceptance; secret storage and error/rate-limit behavior |
| MiMo model | PARTIAL_INTEGRATION | OpenAI-compatible request adapter | Current repeatable live tests, model capability verification, credential/redaction validation |
| Telegram mirror | LOCAL_ACCEPTANCE | AgentForge-owned BotFather Bot API transport, advanced MTProto user-session transport, and optional migration relay are implemented; local mapping, lifecycle, and guard tests pass | Authorized sandbox event/action acceptance for the exact deployment, durable/idempotent bidirectional behavior, and authenticated identity/RBAC |
| Discord mirror | PARTIAL_INTEGRATION | Standalone Gateway v10 transport now forwards interactions and ordinary channel messages, sends through the Discord REST message endpoint, and reconnects with Gateway session resume after unexpected disconnects; bindings, heartbeat, and canonical normalization are covered locally | Authorized sandbox connection, identity/RBAC, and end-to-end event/action verification |
| Native web channel | TEST_IMPLEMENTATION | Local REST/SSE and in-process message feed | Durable state, authenticated identity, browser acceptance, reconnect/error behavior |
| Slack mirror | PARTIAL_INTEGRATION | AgentForge-owned Slack Socket Mode transport with event acknowledgement, message normalization, and outbound `chat.postMessage` support; provider-neutral mirror remains available for fixtures | Authorized Slack app sandbox, identity/RBAC, and end-to-end event/action verification |
| Scribe file parser | TEST_IMPLEMENTATION | Local Markdown/HTML/SOP text parsing | Robust file-ingestion limits, malformed-input security tests, full user acceptance; this is not Scribe cloud integration |
| Scribe MCP | NOT_CONFIGURED | Provider capability slot | Authorized MCP endpoint and real request tests |
| Scribe live sync | UNIMPLEMENTED | No continuous sync | Implementation and provider acceptance |
| Retell | SKELETON | Provider contract/types | Staging credentials, webhook verification, sandbox calls, transcript/usage tests |
| Mock voice | MOCK | Local deterministic simulation | Never describe as telephony integration |
| AGNI voice | UNIMPLEMENTED | No verified provider identity | Identify exact provider using authoritative source before implementation |

The harnesses fail closed by default. Pi can be explicitly enabled with the public `PiSdkExecutor`; Pydantic and AgentForge Native remain fail-closed unless their corresponding deployment adapters are supplied. Simulation remains opt-in and is never reported as live execution.
| Operational memory | LOCAL IMPLEMENTATION | Launcher-backed workspace snapshot persistence; title/content, category, tag, and project filtering with shared-rule semantics; local UI record entry and API create/list/query endpoints; worker context retrieves matching shared and project-scoped records | Retrieval/staleness/duplicate evaluation, multi-process coordination, and broader production workflow evaluation |
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
