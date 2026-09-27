import http from "node:http";

const BASE = process.env.AGENTFORGE_URL || "http://localhost:3460";

function post(path: string, body: Record<string, unknown>): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(path, BASE);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(Buffer.concat(chunks).toString()) });
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function get(path: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    http.get(`${url.origin}${url.pathname}`, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

const REPO_CONTEXT_V1 = `
# Project: AgentForge
## src/optimizer.ts
The AgentForgeOptimizer class orchestrates the full optimization pipeline.
It handles memory bypass, cache lookup, semantic memory, large context elimination,
context deduplication, prompt compression, provider-specific optimization,
model selection with failover, token accounting, and cost ledger recording.

## src/types.ts
Core type definitions: TrustTier (T0-T3), TransportKind (stdio, mcp, mesh, tunnel, public-ingress),
RuntimeKind (openclaw, hermes, other), CanonicalEnvelope, RuntimeRequest, AgentForgeContext.

## src/telemetry.ts
createTelemetry() builds OptimizationTelemetry objects with token/cost calculations.
aggregateTelemetry() rolls up metrics across requests.
formatAggregateTelemetry() renders a markdown summary.

## src/tokenAccounting.ts
estimateTokens() uses chars/4 approximation.
createTokenAccount() computes before/after costs using provider rate tables.
createBypassAccount() calculates full savings when memory bypass triggers.

## src/memoryContextOptimizer.ts
MemoryContextOptimizer orchestrates memory bypass with safety checks (risk filters,
recency checks, instruction detection), large context elimination via fingerprinting,
and prompt optimization via semantic memory lookup.

## src/costLedger.ts
CostLedger records per-request costs with tenant/provider/model/project/user breakdowns.
getTenantSummary() and getReport() provide aggregated views.

## src/cache.ts
SemanticCache with exact + semantic matching, TTL-based expiry, LRU eviction.
lookup() checks exact hash first, then semantic similarity.

## src/compression.ts
compressPrompt() removes duplicate lines, normalizes whitespace, preserves code blocks.
compressWithContext() adds context-aware deduplication.
`;

const REPO_CONTEXT_V2 = `
# Project: AgentForge
## src/optimizer.ts
The AgentForgeOptimizer class orchestrates the full optimization pipeline.
It handles memory bypass, cache lookup, semantic memory, large context elimination,
context deduplication, prompt compression, provider-specific optimization,
model selection with failover, token accounting, and cost ledger recording.
UPDATED: Now supports async batch processing for high-throughput scenarios.

## src/types.ts
Core type definitions: TrustTier (T0-T3), TransportKind (stdio, mcp, mesh, tunnel, public-ingress),
RuntimeKind (openclaw, hermes, other), CanonicalEnvelope, RuntimeRequest, AgentForgeContext.

## src/telemetry.ts
createTelemetry() builds OptimizationTelemetry objects with token/cost calculations.
aggregateTelemetry() rolls up metrics across requests.
formatAggregateTelemetry() renders a markdown summary.

## src/tokenAccounting.ts
estimateTokens() uses chars/4 approximation.
createTokenAccount() computes before/after costs using provider rate tables.
createBypassAccount() calculates full savings when memory bypass triggers.

## src/memoryContextOptimizer.ts
MemoryContextOptimizer orchestrates memory bypass with safety checks (risk filters,
recency checks, instruction detection), large context elimination via fingerprinting,
and prompt optimization via semantic memory lookup.

## src/costLedger.ts
CostLedger records per-request costs with tenant/provider/model/project/user breakdowns.
getTenantSummary() and getReport() provide aggregated views.

## src/cache.ts
SemanticCache with exact + semantic matching, TTL-based expiry, LRU eviction.
lookup() checks exact hash first, then semantic similarity.

## src/compression.ts
compressPrompt() removes duplicate lines, normalizes whitespace, preserves code blocks.
compressWithContext() adds context-aware deduplication.

## src/server.ts
NEW: OpenAI-compatible HTTP server with /v1/chat/completions endpoint.
Supports provider forwarding, memory bypass, and optimization metadata.
`;

function extractAf(res: Record<string, unknown>): Record<string, unknown> {
  return (res.agentforge as Record<string, unknown>) || {};
}

function printResult(label: string, res: Record<string, unknown>, af: Record<string, unknown>): void {
  const choices = res.choices as Array<{ message: { content: string } }> | undefined;
  const content = choices?.[0]?.message?.content || "";
  console.log(`  Response preview: ${content.slice(0, 100)}${content.length > 100 ? "..." : ""}`);
  console.log(`  Tokens prevented: ${af.tokensPrevented ?? 0}`);
  console.log(`  Estimated $ saved: $${(af.estimatedCostSaved as number ?? 0).toFixed(6)}`);
  console.log(`  Provider called: ${!(af.providerCallSkipped)}`);
  console.log(`  Optimization type: ${(af.optimizationReasons as string[])?.[0] || "none"}`);
}

async function runDemo(): Promise<void> {
  console.log("=== AgentForge Demo: Token Elimination Proof ===\n");
  console.log(`Server: ${BASE}\n`);

  const health = await get("/health") as { status: string; optimization: { enabled: boolean }; provider: { available: boolean } };
  console.log(`Health: ${health.status} | Optimization: ${health.optimization.enabled ? "on" : "off"} | Provider: ${health.provider.available ? "configured" : "mock mode"}\n`);

  const requestV1 = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful coding assistant." },
      { role: "user", content: `Explain the AgentForge optimization pipeline.\n\nContext:\n${REPO_CONTEXT_V1}` },
    ],
    temperature: 0.7,
  };

  console.log("--- Scenario 1: First Request (full context, baseline) ---");
  const t1 = Date.now();
  const res1 = await post("/v1/chat/completions", requestV1);
  const elapsed1 = Date.now() - t1;
  console.log(`  Time: ${elapsed1}ms`);
  printResult("Call 1", res1.body, extractAf(res1.body));
  console.log();

  console.log("--- Scenario 2: Same Request (cache/memory hit) ---");
  const t2 = Date.now();
  const res2 = await post("/v1/chat/completions", requestV1);
  const elapsed2 = Date.now() - t2;
  console.log(`  Time: ${elapsed2}ms`);
  printResult("Call 2", res2.body, extractAf(res2.body));
  console.log();

  const requestV2 = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful coding assistant." },
      { role: "user", content: `Explain the AgentForge optimization pipeline.\n\nContext:\n${REPO_CONTEXT_V2}` },
    ],
    temperature: 0.7,
  };

  console.log("--- Scenario 3: One File Changed (partial context elimination) ---");
  const t3 = Date.now();
  const res3 = await post("/v1/chat/completions", requestV2);
  const elapsed3 = Date.now() - t3;
  console.log(`  Time: ${elapsed3}ms`);
  printResult("Call 3", res3.body, extractAf(res3.body));
  console.log();

  const dashboard = await get("/dashboard.json") as Record<string, unknown>;
  console.log("--- Dashboard Summary ---");
  console.log(`  Total requests: ${dashboard.requests}`);
  console.log(`  Tokens prevented: ${dashboard.tokensPrevented}`);
  console.log(`  Provider calls avoided: ${dashboard.providerCallsAvoided}`);
  console.log(`  Estimated cost saved: $${(dashboard.estimatedCostSaved as number).toFixed(6)}`);
  console.log(`  Avg reduction: ${(dashboard.averageReductionPercent as number).toFixed(1)}%`);

  console.log("\n=== Demo Complete ===");
}

runDemo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
