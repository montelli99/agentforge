# AgentForge

Isolated broker/control-plane build for testing runtime routing, transport
selection, reflection, guardrails, audit behavior, and **LLM optimization**.

This package is intentionally separate from the live memory stack.

**AgentForge is an LLM VPN / token-elimination layer for AI builders.**

## Features

- **Routing** — Deterministic runtime selection based on policy, capability, cost, and trust
- **Reflection** — Mandatory preflight and post-result checks before execution
- **Guardrails** — Trust tiers, approval gates, audit failure policy
- **Optimization** — Cost-aware routing, token reduction, caching, compression, context deduplication
- **Delta Transmission** — System prompt caching, recent messages only
- **Session Management** — Per-session metrics, eviction
- **Provider Optimization** — Provider-specific prompt optimization (Anthropic, OpenAI, Gemini)
- **Cost Ledger** — Tenant/user/project/provider/model cost tracking
- **Semantic Memory** — Cross-request embedding cache
- **Context Fingerprinting** — Exact/semantic/structural matching
- **Speculative Execution** — Multi-provider racing with adaptive learning
- **Model Benchmarking** — Historical performance tracking and recommendations
- **Telemetry** — Full optimization metrics tracking

## Architecture

```
Incoming Request
  → Policy Validation
  → Context Fingerprinting
  → Semantic Memory Lookup
  → Cache Lookup (exact + semantic)
  → Context Deduplication
  → Prompt Compression
  → Provider-Specific Optimization
  → Model Selection (cost-aware, failover)
  → Cost Ledger Recording
  → Router (runtime selection)
  → Adapter (transport selection)
  → Runtime/Provider
  → Reflection Post-Check
  → Optimization Telemetry/Report
```

## Usage

### Run the lab

```bash
# Run with default config (optimization disabled)
node --import tsx src/main.ts

# Run with optimization enabled
node --import tsx src/main.ts --optimization

# Run with specific features
node --import tsx src/main.ts --cost-aware --cache --compression
```

### CLI Flags

| Flag | Description |
|---|---|
| `--optimization` | Enable all optimization features |
| `--cost-aware` | Enable cost-aware routing |
| `--cache` | Enable exact + semantic caching |
| `--compression` | Enable prompt compression + context deduplication |
| `-n <N>` | Run N iterations |

### Run tests

```bash
pnpm vitest run agentforge/src --maxWorkers=1
```

## Optimization Layer

The optimization layer turns AgentForge into an LLM optimization proxy / "LLM VPN" that:

- Reduces token usage through compression and deduplication
- Routes intelligently based on cost, latency, and task complexity
- Caches repeated work (exact + semantic matching)
- Tracks cost before/after optimization
- Provides fallback across providers
- Transmits only deltas (recent messages + cached system prompt)
- Optimizes prompts per provider (Anthropic, OpenAI, Gemini)
- Races multiple providers for fastest/best response
- Tracks performance history for adaptive routing

### Phase 1 Modules

| Module | Purpose |
|---|---|
| `optimizer.ts` | Main orchestration layer |
| `cost.ts` | Provider/model cost table and estimation |
| `cache.ts` | Semantic + exact cache abstraction |
| `compression.ts` | Prompt/context compression |
| `context.ts` | Context deduplication and trimming |
| `modelSelector.ts` | Automatic model selection |
| `telemetry.ts` | Optimization telemetry tracking |
| `optimization-types.ts` | Type definitions |

### Phase 2 Modules

| Module | Purpose |
|---|---|
| `deltaEngine.ts` | Conversation delta transmission |
| `sessionManager.ts` | Session state tracking |
| `providerOptimizers.ts` | Provider-specific prompt optimization |
| `costLedger.ts` | Tenant/user/project cost tracking |
| `semanticMemory.ts` | Cross-request semantic cache with embeddings |
| `contextFingerprints.ts` | Semantic fingerprinting |
| `speculativeExecution.ts` | Multi-provider racing |
| `modelBenchmark.ts` | Dynamic model benchmarking |

### Config

```json
{
  "optimization": {
    "enabled": true,
    "targetTokenReduction": 0.8,
    "semanticCache": true,
    "exactCache": true,
    "promptCompression": true,
    "contextDeduplication": true,
    "costAwareRouting": true,
    "providerFailover": true,
    "respectRequestedModel": false,
    "maxCostUsd": null,
    "defaultLatencyPreference": "balanced",
    "deltaTransmission": true,
    "providerOptimization": true,
    "speculativeExecution": true,
    "speculativeStrategy": "cheapest-first",
    "costLedger": true,
    "contextFingerprinting": true,
    "semanticMemory": true
  }
}
```

## Scenarios

30 lab scenarios covering:

- S1-S14: Core routing, reflection, guardrails (original 14)
- S15-S22: Optimization features (Phase 1)
- S23-S30: VPN features (Phase 2)

| Scenario | Description |
|---|---|
| S15 | Cost-aware routing |
| S16 | Compression enabled |
| S17 | Cache hit |
| S18 | Explicit model respected |
| S19 | Provider failover |
| S20 | Optimization disabled (no-op) |
| S21 | Policy blocks cheaper model |
| S22 | High complexity task |
| S23 | Delta transmission - multi-turn conversation |
| S24 | Semantic memory - cross-request similarity |
| S25 | Provider-specific optimization - Claude |
| S26 | Provider-specific optimization - OpenAI |
| S27 | Speculative execution - cheapest-first |
| S28 | Cost ledger - tenant tracking |
| S29 | Context fingerprinting - similarity matching |
| S30 | Full Phase 2 optimization stack |

## Quickstart

AgentForge is an **LLM VPN** / **token-elimination layer** for AI builders.

It sits between your app and LLM providers, detects repeated context, safely removes known tokens, skips provider calls when memory confidence is high, and shows how much money you avoided spending.

### Install

```bash
cd agentforge
npm install  # or pnpm install
```

### Configure

```bash
cp .env.example .env
# Edit .env to set your OPENAI_API_KEY (optional - works in mock mode without it)
```

Or set env vars directly:

```bash
export OPENAI_API_KEY=sk-...         # optional, for real provider forwarding
export AGENTFORGE_PORT=3000          # default: 3000
export AGENTFORGE_OPTIMIZATION=true  # default: true
export AGENTFORGE_PROVIDER=openai    # default: openai
export AGENTFORGE_MODEL=gpt-4o-mini  # default: gpt-4o-mini
export AGENTFORGE_METADATA=true      # default: true
```

### Start the server

```bash
npm run start
# or
node --import tsx src/server.ts
```

### Check health

```bash
curl -s http://localhost:3000/health
```

### Send a request

```bash
curl -s http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role":"user","content":"Say hello from AgentForge"}
    ]
  }'
```

The response is OpenAI-compatible with an `agentforge` metadata field:

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "choices": [{"message": {"role": "assistant", "content": "..."}}],
  "agentforge": {
    "tokensPrevented": 1200,
    "estimatedCostSaved": 0.003,
    "providerCallSkipped": true,
    "optimizationReasons": ["memory bypass: High-confidence memory match"]
  }
}
```

### View the dashboard

```bash
curl -s http://localhost:3000/dashboard.json
# or open http://localhost:3000/dashboard in a browser
```

### Run the demo client

```bash
npm run demo
```

### Run the benchmark

```bash
npx tsx src/benchmark-quick.ts
```

## Provider Behavior

- **With API key**: Server forwards optimized requests to the configured provider
- **Without API key**: Server runs in mock mode, optimization works but returns simulated responses
- **Memory bypass**: When a high-confidence cached response exists, the provider is never called regardless of API key status

If you send a request without an API key and no memory bypass is available, you'll get a clear error:

```json
{
  "error": {
    "message": "Provider API key not configured. Set OPENAI_API_KEY to enable provider forwarding.",
    "type": "server_error",
    "code": "provider_key_missing"
  }
}
```
