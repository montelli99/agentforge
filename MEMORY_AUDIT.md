# Memory System Audit for AgentForge Integration

**Date:** 2026-06-14
**Purpose:** Evaluate the OpenClaw memory system for integration into AgentForge as a token-elimination layer.

---

## 1. Where the Memory System Lives

### Core Module: `src/memory/` (~86 files)

| File | Purpose |
|---|---|
| `types.ts` | Core types: `MemorySearchResult`, `MemorySearchManager` interface |
| `index.ts` | Public exports: `MemoryIndexManager`, `getMemorySearchManager` |
| `manager.ts` | `MemoryIndexManager` class — main builtin backend (637 lines) |
| `manager-search.ts` | Vector + keyword search functions |
| `manager-embedding-ops.ts` | Embedding operations (extends manager) |
| `manager-sync-ops.ts` | File sync operations |
| `manager-cache-key.ts` | Cache key generation |
| `search-manager.ts` | `getMemorySearchManager()` entry point + `FallbackMemoryManager` |
| `embeddings.ts` | `EmbeddingProvider` interface + factory |
| `embeddings-openai.ts` | OpenAI `text-embedding-3-small` provider |
| `embeddings-voyage.ts` | Voyage `voyage-4-large` provider |
| `embeddings-gemini.ts` | Gemini `gemini-embedding-001` provider |
| `node-llama.ts` | Local GGUF embedding via `node-llama-cpp` |
| `hybrid.ts` | Hybrid search: vector + BM25 weighted merge |
| `mmr.ts` | Maximal Marginal Relevance re-ranking |
| `query-expansion.ts` | Query keyword extraction + LLM expansion |
| `temporal-decay.ts` | Time-based score decay |
| `sqlite.ts` | Node `node:sqlite` loader |
| `sqlite-vec.ts` | SQLite vector extension loader |
| `memory-schema.ts` | DDL: `files`, `chunks`, `chunks_vec`, `chunks_fts`, `embedding_cache` |
| `backend-config.ts` | Backend resolution (builtin vs QMD) |
| `session-files.ts` | Session transcript file handling |
| `sync-*.ts` | File/session sync pipeline |
| `batch-*.ts` | Batch embedding pipeline (OpenAI, Voyage, Gemini) |
| `embedding-model-limits.ts` | Per-model token limits |
| `embedding-chunk-limits.ts` | Chunk size limits |
| `temporal-decay.ts` | Exponential decay scoring |
| `headers-fingerprint.ts` | Provider/model fingerprinting |

### Memory Forge: `memory-forge/` (~35 files)

| Package | Purpose |
|---|---|
| `packages/contracts` | Shared types: `MemoryDocument`, `MemoryChunk`, `FactRecord`, `GraphEdge`, interfaces |
| `packages/core` | IDs (FNV-1a), chunking, scope visibility |
| `packages/graph` | `SimpleGraph` + `TemporalGraphStore` (SQLite-backed) |
| `packages/facts` | `ChunkFactExtractor` (regex-based) + conflict detection |
| `packages/retrieve` | `HybridSearcher` (lexical, vector TBD) |
| `packages/storage-sqlite` | SQLite storage layer |
| `packages/ingest-markdown` | Markdown file ingestion |
| `packages/ingest-sessions` | Session transcript ingestion |
| `packages/bridge-openclaw` | OpenClaw bridge |
| `packages/mcp` | MCP server |
| `packages/cli` | CLI interface |

### Extensions

| Extension | Purpose |
|---|---|
| `extensions/memory-core` | Built-in memory slot provider |
| `extensions/memory-lancedb` | LanceDB-backed memory provider |

### Agent Integration

| File | Purpose |
|---|---|
| `src/agents/memory-search.ts` | Config resolution (`resolveMemorySearchConfig`) |
| `src/agents/tools/memory-tool.ts` | `memory_search` + `memory_get` tools |
| `src/agents/usage-memory.ts` | Usage memory tracking |
| `src/hooks/bundled/session-memory/handler.ts` | Saves session summaries on `/new` or `/reset` |
| `src/auto-reply/reply/memory-flush.ts` | Pre-compaction memory flush |
| `src/gateway/server-startup-memory.ts` | Gateway memory backend startup |

### Tests

| Test File | Coverage |
|---|---|
| `src/memory/index.test.ts` | Core manager tests |
| `src/memory/search-manager.test.ts` | Search manager tests |
| `src/memory/hybrid.test.ts` | Hybrid search tests |
| `src/memory/mmr.test.ts` | MMR re-ranking tests |
| `src/memory/query-expansion.test.ts` | Query expansion tests |
| `src/memory/temporal-decay.test.ts` | Temporal decay tests |
| `src/memory/embeddings.test.ts` | Embedding provider tests |
| `src/memory/embeddings-voyage.test.ts` | Voyage provider tests |
| `src/memory/embedding-chunk-limits.test.ts` | Chunk limit tests |
| `src/memory/session-files.test.ts` | Session file tests |
| `src/memory/internal.test.ts` | Internal path tests |
| `src/memory/backend-config.test.ts` | Backend config tests |
| `src/memory/manager.watcher-config.test.ts` | Watcher config tests |
| `src/memory/manager.vector-dedupe.test.ts` | Vector dedup tests |
| `src/memory/manager.*.test.ts` | ~10 more manager test files |
| `memory-forge/test/*.test.ts` | ~6 memory-forge tests |

### Dependencies

- `node:sqlite` (Node.js built-in)
- `sqlite-vec` (optional, for vector acceleration)
- `node-llama-cpp` (optional, for local embeddings)
- `chokidar` (file watching)
- OpenAI/Voyage/Gemini APIs (remote embeddings)

---

## 2. What Type of Memory It Provides

| Memory Type | Provided | Where |
|---|---|---|
| **Short-term session memory** | ✅ | Session transcripts indexed in `chunks` table, `session-files.ts` |
| **Long-term user memory** | ✅ | `MEMORY.md` curated file, `memory/YYYY-MM-DD.md` daily logs |
| **Project memory** | ✅ | Workspace files indexed via `extraPaths`, `memory/` directory |
| **Semantic memory** | ✅ | Vector embeddings via OpenAI/Voyage/Gemini/local, cosine similarity search |
| **Episodic conversation memory** | ✅ | Session JSONL transcripts indexed as chunks |
| **Entity memory** | ⚠️ | `memory-forge/packages/facts` extracts subject-predicate-object triples |
| **File/document memory** | ✅ | Markdown files chunked and indexed, `memory_get` for targeted reads |
| **Vector/embedding-backed memory** | ✅ | Full embedding pipeline: OpenAI, Voyage, Gemini, local GGUF |
| **Graph/relationship memory** | ⚠️ | `memory-forge/packages/graph` — `SimpleGraph` + `TemporalGraphStore` |
| **Cache-like memory** | ✅ | Embedding cache in SQLite, `embedding_cache` table |

---

## 3. How Memory Is Stored

### Storage Layer

**Primary:** SQLite database per agent at `~/.openclaw/state/memory/{agentId}.sqlite`

**Schema (from `memory-schema.ts`):**

```sql
-- Metadata
meta (key TEXT PK, value TEXT)

-- Indexed files
files (path TEXT PK, source TEXT, hash TEXT, mtime INTEGER, size INTEGER)

-- Chunked content with embeddings
chunks (
  id TEXT PK,
  path TEXT,
  source TEXT,          -- "memory" | "sessions"
  start_line INTEGER,
  end_line INTEGER,
  hash TEXT,
  model TEXT,           -- embedding provider/model
  text TEXT,            -- original chunk text
  embedding TEXT,       -- JSON-encoded float array
  updated_at INTEGER
)

-- Embedding cache
embedding_cache (
  provider TEXT,
  model TEXT,
  provider_key TEXT,
  hash TEXT,
  embedding TEXT,
  dims INTEGER,
  updated_at INTEGER
)

-- Full-text search (FTS5)
chunks_fts (text)       -- FTS5 virtual table

-- Vector search (optional sqlite-vec)
chunks_vec              -- vec0 virtual table
```

**Memory Forge Storage:** Separate SQLite at `memory-forge/packages/storage-sqlite`

### Keys

- **File key:** `path` (relative to workspace)
- **Chunk key:** `id` (deterministic: `{documentId}_{ordinal}`)
- **Embedding cache key:** `{provider}:{model}:{provider_key}:{hash}`

### Tenant/User/Project Isolation

- **Per-agent:** Each agent has its own SQLite database
- **Per-workspace:** Workspace directory isolates agent memory
- **No cross-agent leakage:** Memory is scoped to `agentId`
- **Session isolation:** Session transcripts are indexed per-agent

### TTL/Expiration

- **No explicit TTL** on chunks or embeddings
- **File hash tracking:** Changed files trigger re-embedding
- **Session delta thresholds:** `deltaBytes: 100000`, `deltaMessages: 50`
- **Temporal decay:** Optional score decay (half-life configurable, default 30 days)

### Retrieval Method

1. **Vector search:** Cosine similarity over embeddings (sqlite-vec or JS fallback)
2. **Keyword search:** FTS5 BM25 ranking
3. **Hybrid:** Weighted merge of vector + keyword scores (default: 70% vector, 30% text)
4. **Post-processing:** Optional temporal decay + MMR re-ranking

### Update Method

- **File watcher:** Chokidar watches `MEMORY.md` + `memory/` directory
- **Debounced sync:** 1.5s debounce, triggered on session start, on search, or interval
- **Session delta sync:** Background sync when session crosses byte/message thresholds
- **Batch embedding:** Optional batch API for large corpus (OpenAI, Voyage, Gemini)

### Deduplication

- **Content hash:** Chunks are hashed; unchanged chunks skip re-embedding
- **Vector dedup:** `manager.vector-dedupe.test.ts` tests deduplication
- **Embedding cache:** Prevents re-embedding identical text

---

## 4. How Memory Is Retrieved

### Exact Search

- **FTS5 BM25:** Full-text search for exact token matches
- **File path lookup:** `readFile({ relPath, from, lines })`
- **Memory get tool:** Targeted read of specific Markdown file/line range

### Semantic Search

- **Vector similarity:** Cosine similarity over embeddings
- **Embedding providers:** OpenAI, Voyage, Gemini, local GGUF
- **Query expansion:** Keyword extraction + optional LLM expansion

### Recency Search

- **Temporal decay:** Exponential decay based on file age
- **Half-life:** Configurable (default 30 days)
- **Evergreen files:** `MEMORY.md` and non-dated files skip decay

### Importance Ranking

- **Score-based:** `vectorWeight * vectorScore + textWeight * textScore`
- **MMR re-ranking:** Balances relevance with diversity
- **Configurable weights:** Default 70% vector, 30% text

### Summarization

- **Session memory hook:** Generates slug via LLM on `/new` or `/reset`
- **Memory flush:** Pre-compaction agentic turn writes durable memory
- **No automatic summarization** of retrieved results

### Chunking

- **Target size:** 400 tokens per chunk (configurable)
- **Overlap:** 80 tokens (configurable)
- **Method:** Paragraph-based splitting on double-newlines
- **Max chars:** 1200 chars per chunk (from `memory-forge`)

### Confidence Scoring

- **Score threshold:** `minScore` (default 0.35)
- **Max results:** `maxResults` (default 6)
- **Injected char cap:** Prevents oversized memory injection

### Relevance Filtering

- **Score threshold:** Results below `minScore` are filtered
- **MMR diversity:** Near-duplicate results are suppressed
- **Temporal decay:** Old results are downweighted

---

## 5. How Memory Can Reduce Tokens

### 5.1 Avoid Resending System Prompts

**Current state:** System prompt is rebuilt each run (~9,600 tokens).

**Memory integration:** Cache system prompt fingerprint in memory. On subsequent requests with same fingerprint, retrieve from cache instead of rebuilding.

**Token savings:** ~9,600 tokens per request (when cache hit).

### 5.2 Avoid Resending Project Context

**Current state:** Workspace files (AGENTS.md, TOOLS.md, etc.) are injected every run (~23,900 tokens).

**Memory integration:** Store workspace file fingerprints. When fingerprint matches, inject only the delta (changed files).

**Token savings:** ~23,900 tokens per request (when no changes).

### 5.3 Avoid Resending Repeated User Preferences

**Current state:** User preferences are in `USER.md` (~97 tokens) but sent every time.

**Memory integration:** Store user preference fingerprints. When preferences haven't changed, reference memory instead of injecting full text.

**Token savings:** ~100-500 tokens per request.

### 5.4 Avoid Resending Repeated Codebase/File Summaries

**Current state:** Code context is sent fresh each request.

**Memory integration:** Store code summary fingerprints. When codebase hasn't changed, retrieve summaries from memory instead of full context.

**Token savings:** ~1,000-10,000 tokens per request (code-heavy tasks).

### 5.5 Avoid Resending Old Conversation History

**Current state:** Full conversation history is sent until compaction.

**Memory integration:** Replace old history with memory summaries. Only send recent N turns + relevant memory summaries.

**Token savings:** ~5,000-50,000 tokens per request (long sessions).

### 5.6 Replace Long History with Compact Memory Summaries

**Current state:** Compaction creates summaries but still sends full recent history.

**Memory integration:** Create memory-backed summaries that are smaller than raw history. Retrieve only relevant summaries instead of full history.

**Token savings:** ~3,000-20,000 tokens per request.

### 5.7 Retrieve Only Relevant Memories Instead of Full Context

**Current state:** All workspace files are injected regardless of relevance.

**Memory integration:** Use semantic search to retrieve only memories relevant to the current query. Inject top-K relevant chunks instead of full files.

**Token savings:** ~15,000-30,000 tokens per request (when only specific context is needed).

### 5.8 Support Delta Transmission

**Current state:** Delta engine sends recent messages only.

**Memory integration:** Combine delta transmission with memory retrieval. Send recent messages + relevant memory summaries instead of full history.

**Token savings:** ~10,000-40,000 tokens per request (multi-turn conversations).

### 5.9 Support Semantic Cache Hits

**Current state:** Cache is hash-based (exact match only).

**Memory integration:** Use real embeddings for semantic cache. Similar queries hit cache even with different wording.

**Token savings:** ~100% on cache hits (entire response from cache).

---

## 6. Integration Plan with AgentForge

### 6.1 `deltaEngine.ts`

**Current:** Caches system prompt, sends recent messages only.

**Integration:** Load memory fingerprints at session start. When delta is computed, check if context is already known via memory. If so, exclude from delta.

```
processTurn(sessionId, messages)
  → loadMemoryFingerprints(sessionId)
  → checkContextAlreadyKnown(messages, fingerprints)
  → computeDelta(knownContext, messages)
  → storeNewFingerprints(sessionId, newMessages)
```

### 6.2 `sessionManager.ts`

**Current:** Tracks per-session metrics.

**Integration:** Add memory-backed session state. Store session fingerprints in memory for cross-session retrieval.

```
createSession(tenantId, model)
  → loadMemorySessionState(tenantId)
  → initializeSessionMetrics()
  → storeSessionFingerprint(sessionId, fingerprint)
```

### 6.3 `semanticMemory.ts`

**Current:** Fake hash-based embeddings.

**Integration:** Replace `MockEmbeddingProvider` with real embeddings from `src/memory/embeddings.ts`. Use the same `EmbeddingProvider` interface.

```
// Before (fake)
class MockEmbeddingProvider implements EmbeddingProvider {
  async embed(text) { return hashBasedEmbedding(text); }
}

// After (real)
class OpenClawEmbeddingProvider implements EmbeddingProvider {
  constructor(private manager: MemorySearchManager) {}
  async embed(text) { return this.manager.embedQuery(text); }
}
```

### 6.4 `contextFingerprints.ts`

**Current:** Creates fingerprints but no semantic matching.

**Integration:** Use memory's hybrid search for semantic fingerprint matching. When a fingerprint matches, skip re-sending that context.

```
create(content)
  → storeFingerprintInMemory(content)
  → matchExistingFingerprints(content)
  → return { id, similarity, matchedContent }
```

### 6.5 `compression.ts`

**Current:** Deterministic compression (duplicate lines, whitespace).

**Integration:** Use memory to detect what's already known. Compress only new/unknown content. Use memory summaries to replace verbose sections.

```
compressWithContext(text, context)
  → checkMemoryForKnownContent(text)
  → compressOnlyNewContent(text, knownContent)
  → replaceWithMemorySummaries(text, relevantMemories)
```

### 6.6 `optimizer.ts`

**Current:** Orchestrates compression, dedup, cache, model selection.

**Integration:** Add memory retrieval step before optimization. Use memory to determine what context is already known and can be skipped.

```
optimize(envelope, request)
  → retrieveRelevantMemory(request)
  → detectKnownContext(request, memory)
  → stripKnownContext(request, knownContext)
  → applyOptimizations(request)
  → storeNewMemory(request, result)
  → reportTokenSavings(original, optimized)
```

### 6.7 `telemetry.ts`

**Current:** Tracks optimization metrics.

**Integration:** Add memory-specific metrics: memory hits, memory misses, tokens saved via memory, memory retrieval latency.

```
createTelemetry(params)
  → addMemoryMetrics({
      memoryHits,
      memoryMisses,
      tokensSavedViaMemory,
      memoryRetrievalMs,
    })
```

### 6.8 `costLedger.ts`

**Current:** Tracks cost per tenant/provider/model.

**Integration:** Add memory cost tracking. Track embedding API costs, storage costs, retrieval costs.

```
record(params)
  → addMemoryCosts({
      embeddingCostUsd,
      storageBytes,
      retrievalCount,
    })
```

### 6.9 `benchmark.ts`

**Current:** Simulated benchmark.

**Integration:** Add memory-specific benchmarks: memory retrieval accuracy, token savings from memory, memory latency impact.

---

## 7. Token-Elimination Architecture

```
Incoming Request
  │
  ├─→ Identify Tenant/User/Project/Session
  │
  ├─→ Load Memory Fingerprints
  │   ├─ System prompt fingerprint
  │   ├─ Workspace file fingerprints
  │   ├─ User preference fingerprints
  │   ├─ Codebase fingerprints
  │   └─ Conversation history fingerprints
  │
  ├─→ Detect Already-Known Context
  │   ├─ Compare request context against memory fingerprints
  │   ├─ Semantic search for similar past contexts
  │   └─ Identify what can be skipped
  │
  ├─→ Strip/Delta Repeated Context
  │   ├─ Remove known system prompts
  │   ├─ Remove known workspace files
  │   ├─ Remove known user preferences
  │   ├─ Remove known code summaries
  │   └─ Keep only new/changed content
  │
  ├─→ Retrieve Only Relevant Memory
  │   ├─ Semantic search for query-relevant memories
  │   ├─ Rank by relevance + recency + importance
  │   ├─ Top-K retrieval (configurable)
  │   └─ Inject only relevant chunks
  │
  ├─→ Compress If Safe
  │   ├─ Apply deterministic compression
  │   ├─ Use memory summaries to replace verbose sections
  │   └─ Preserve system/developer/security instructions
  │
  ├─→ Route to Model
  │   ├─ Cost-aware model selection
  │   ├─ Provider failover
  │   └─ Speculative execution
  │
  ├─→ Store New Memory/Fingerprints
  │   ├─ Store new context fingerprints
  │   ├─ Update memory index
  │   ├─ Cache embeddings
  │   └─ Track delta savings
  │
  └─→ Report Avoided Tokens and Savings
      ├─ Tokens saved via memory
      ├─ Tokens saved via delta
      ├─ Tokens saved via compression
      ├─ Cache hit rate
      └─ Cost reduction
```

---

## 8. Safety Rules

### Memory Must Not:

1. **Leak between tenants** — Each agent has isolated SQLite database. No cross-agent queries.
2. **Leak between users** — Session isolation per agent. No cross-session queries.
3. **Inject stale facts as truth** — Temporal decay + conflict detection. Superseded facts are marked.
4. **Override current user instructions** — Memory is supplemental, never replaces explicit instructions.
5. **Weaken system/developer/security instructions** — System prompts are never compressed or skipped.
6. **Retrieve irrelevant memories just because similarity is high** — MMR re-ranking + score threshold + temporal decay.
7. **Increase tokens more than it saves** — Token budget enforcement. Memory injection is capped.

### Implementation Guards:

- **Score threshold:** `minScore: 0.35` filters low-relevance results
- **Max results:** `maxResults: 6` limits injection size
- **Injected char cap:** Prevents oversized memory payload
- **Temporal decay:** Old memories fade naturally
- **MMR diversity:** Prevents redundant memory injection
- **Conflict detection:** Superseded facts are flagged
- **System prompt preservation:** Never compressed or delta'd

---

## 9. MVP Build Recommendation

### What to Build Today

**Priority 1: Real Embeddings (Critical)**

Replace `MockEmbeddingProvider` with real embeddings from `src/memory/embeddings.ts`.

Files to modify:
- `agentforge/src/semanticMemory.ts` — Replace `MockEmbeddingProvider` with `OpenClawEmbeddingProvider`
- `agentforge/src/semanticMemory.ts` — Add `createEmbeddingProvider` integration

New files:
- `agentforge/src/embedding-adapter.ts` — Adapter between AgentForge and OpenClaw embedding interfaces

**Priority 2: Memory-Backed Context Reduction**

Use memory to detect already-known context and skip re-sending.

Files to modify:
- `agentforge/src/optimizer.ts` — Add memory retrieval step
- `agentforge/src/deltaEngine.ts` — Load memory fingerprints
- `agentforge/src/compression.ts` — Use memory to detect known content

New files:
- `agentforge/src/memoryIntegration.ts` — Memory integration layer

**Priority 3: Token Savings Dashboard**

Show actual token savings from memory integration.

Files to modify:
- `agentforge/src/telemetry.ts` — Add memory metrics
- `agentforge/src/report.ts` — Add memory savings section
- `agentforge/src/benchmark.ts` — Add memory benchmarks

**Priority 4: Session Delta Transmission**

Combine delta transmission with memory retrieval.

Files to modify:
- `agentforge/src/deltaEngine.ts` — Load memory for known context
- `agentforge/src/sessionManager.ts` — Store session fingerprints in memory

### What NOT to Build Today

- **Enterprise multi-tenant isolation** — Per-agent SQLite is sufficient for MVP
- **Graph memory** — Not needed for token elimination
- **QMD backend** — Builtin SQLite is sufficient for MVP
- **Batch embedding** — Not needed for MVP
- **Session transcript indexing** — Nice-to-have, not critical

---

## 10. Required Output

### Memory System Summary

The OpenClaw memory system is a production-grade, SQLite-backed memory engine with:
- Real embedding providers (OpenAI, Voyage, Gemini, local)
- Hybrid search (vector + BM25)
- MMR re-ranking for diversity
- Temporal decay for recency
- File watching + incremental sync
- Session transcript indexing
- Per-agent isolation

### Integration Map

| AgentForge Module | Memory System Integration |
|---|---|
| `semanticMemory.ts` | Replace fake embeddings with real ones from `src/memory/embeddings.ts` |
| `deltaEngine.ts` | Load memory fingerprints for known context detection |
| `optimizer.ts` | Add memory retrieval step before optimization |
| `compression.ts` | Use memory to detect what's already known |
| `telemetry.ts` | Track memory-specific metrics |
| `costLedger.ts` | Track embedding API costs |
| `benchmark.ts` | Add memory benchmarks |

### Missing Gaps

1. **Fake embeddings** — `MockEmbeddingProvider` must be replaced with real embeddings
2. **No memory integration** — AgentForge doesn't currently use the memory system
3. **No token savings measurement** — No metrics on tokens saved via memory
4. **No memory-backed cache** — Cache is hash-based, not semantic

### Risks

1. **Embedding API costs** — Real embeddings cost money (OpenAI: $0.02/1M tokens)
2. **Latency** — Embedding + search adds ~50-200ms per request
3. **Storage** — SQLite database grows with indexed content
4. **Complexity** — Memory integration adds architectural complexity

### Exact Files to Modify

1. `agentforge/src/semanticMemory.ts` — Replace `MockEmbeddingProvider`
2. `agentforge/src/optimizer.ts` — Add memory retrieval
3. `agentforge/src/deltaEngine.ts` — Load memory fingerprints
4. `agentforge/src/compression.ts` — Use memory for known content
5. `agentforge/src/telemetry.ts` — Add memory metrics
6. `agentforge/src/costLedger.ts` — Track embedding costs
7. `agentforge/src/benchmark.ts` — Add memory benchmarks
8. `agentforge/src/optimization-types.ts` — Add memory config types

### Exact New Files to Create

1. `agentforge/src/embedding-adapter.ts` — Adapter for OpenClaw embeddings
2. `agentforge/src/memoryIntegration.ts` — Memory integration layer
3. `agentforge/src/memoryFingerprints.ts` — Memory fingerprint management

### Exact Tests/Scenarios to Add

1. `agentforge/src/memoryIntegration.test.ts` — Memory integration tests
2. `agentforge/src/embedding-adapter.test.ts` — Embedding adapter tests
3. `agentforge/src/broker.test.ts` — Add memory-backed scenarios (S31-S35)

### Today's MVP Implementation Plan

**Hour 1-2: Real Embeddings**
- Create `embedding-adapter.ts` wrapping OpenClaw's `EmbeddingProvider`
- Replace `MockEmbeddingProvider` in `semanticMemory.ts`
- Test with real embedding queries

**Hour 3-4: Memory Integration**
- Create `memoryIntegration.ts` for context detection
- Integrate with `optimizer.ts` for known context stripping
- Test token savings

**Hour 5-6: Metrics & Dashboard**
- Add memory metrics to `telemetry.ts`
- Update `report.ts` with memory savings section
- Run benchmark with real metrics

**Hour 7-8: Testing & Polish**
- Add memory-backed test scenarios
- Run full test suite
- Update documentation
