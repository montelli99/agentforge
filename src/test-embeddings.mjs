// Phase 5A: Real Embedding Activation Test
// Verifies that AgentForge's semantic memory uses real Ollama embeddings
// and produces semantically similar matches.

import { getRealEmbeddingProvider } from "../../agentforge/src/embeddingAdapter.js";
import { getSemanticMemory, resetSemanticMemory } from "../../agentforge/src/semanticMemory.js";

const BASE_URL = process.env.AGENTFORGE_URL || "http://localhost:3460";

async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

async function getDashboard() {
  const res = await fetch(`${BASE_URL}/dashboard.json`);
  return res.json();
}

async function sendToAgentForge(body, sessionId) {
  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AgentForge-Source": "openclaw",
      "X-AgentForge-Channel": "telegram",
      "X-AgentForge-Project": "openclaw",
      "X-AgentForge-Session": sessionId,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  console.log("=== Phase 5A: Real Embedding Activation Test ===\n");

  // 1. Check embedding provider status
  console.log("--- Step 1: Verify embedding provider ---");
  try {
    const provider = await getRealEmbeddingProvider({
      provider: "ollama",
      baseUrl: "http://localhost:11434",
      model: "nomic-embed-text",
      fallbackToHash: true,
    });
    const status = provider.getStatus();
    console.log("Provider:", status.provider);
    console.log("Model:", status.model);
    console.log("Mode:", status.mode);
    console.log("Dimension:", status.dimension);
    console.log("Active:", status.active);

    if (status.mode === "real" && status.active) {
      console.log("\n[PASS] Real embeddings active (Ollama/nomic-embed-text)\n");
    } else {
      console.log("\n[FAIL] Still in hash-fallback mode\n");
      return;
    }
  } catch (error) {
    console.error("Embedding provider init failed:", error);
    return;
  }

  // 2. Test semantic similarity with real embeddings
  console.log("--- Step 2: Test semantic similarity ---");
  const provider = await getRealEmbeddingProvider({
    provider: "ollama",
    baseUrl: "http://localhost:11434",
    model: "nomic-embed-text",
    fallbackToHash: true,
  });

  const text1 = "How do I reset my password?";
  const text2 = "How can I change my password?";
  const text3 = "What is the weather in Paris?";

  const emb1 = await provider.embed(text1);
  const emb2 = await provider.embed(text2);
  const emb3 = await provider.embed(text3);

  function cosineSim(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  const sim12 = cosineSim(emb1, emb2);
  const sim13 = cosineSim(emb1, emb3);
  console.log(`"${text1}" vs "${text2}"`);
  console.log(`  similarity: ${sim12.toFixed(4)} (should be HIGH - same intent)`);
  console.log(`"${text1}" vs "${text3}"`);
  console.log(`  similarity: ${sim13.toFixed(4)} (should be LOW - different topic)`);

  if (sim12 > sim13 && sim12 > 0.5) {
    console.log("\n[PASS] Semantic similarity works correctly");
    console.log(`  Semantically similar texts: ${sim12.toFixed(4)} > ${sim13.toFixed(4)} (unrelated)\n`);
  } else {
    console.log("\n[FAIL] Semantic similarity not working as expected\n");
  }

  // 3. Send 3 requests through AgentForge: 2 semantically similar, 1 different
  console.log("--- Step 3: Send requests through AgentForge ---");
  const sessionId = `phase5a-${Date.now()}`;

  // Request 1: Original question
  const req1 = await sendToAgentForge({
    model: "kimi-k2.6:cloud",
    messages: [{ role: "user", content: "Explain the function getUserById in this codebase" }],
  }, sessionId);
  console.log(`Request 1: status=${req1.status}, baseline=${req1.json.choices?.[0]?.message?.content?.length || 0} chars`);

  await new Promise((r) => setTimeout(r, 1000));

  // Request 2: Paraphrased question (semantically similar)
  const req2 = await sendToAgentForge({
    model: "kimi-k2.6:cloud",
    messages: [{ role: "user", content: "How does getUserById work? Tell me about it" }],
  }, sessionId);
  console.log(`Request 2: status=${req2.status}, baseline=${req2.json.choices?.[0]?.message?.content?.length || 0} chars`);

  await new Promise((r) => setTimeout(r, 1000));

  // Request 3: Same question, different wording
  const req3 = await sendToAgentForge({
    model: "kimi-k2.6:cloud",
    messages: [{ role: "user", content: "Walk me through the getUserById function" }],
  }, sessionId);
  console.log(`Request 3: status=${req3.status}, baseline=${req3.json.choices?.[0]?.message?.content?.length || 0} chars`);

  await new Promise((r) => setTimeout(r, 1000));

  // 4. Check dashboard for memory metrics
  console.log("\n--- Step 4: Check dashboard for memory metrics ---");
  const dashboard = await getDashboard();
  console.log("optimizationStatus:", JSON.stringify(dashboard.optimizationStatus, null, 2));
  console.log("memoryBypassHits:", dashboard.memoryBypassHits);
  console.log("semanticMatches:", dashboard.optimizationStatus.semanticMatches);
  console.log("memoryRetrievals:", dashboard.optimizationStatus.memoryRetrievals);

  // 5. Health check
  console.log("\n--- Step 5: Health check ---");
  const health = await checkHealth();
  console.log("memory:", JSON.stringify(health.memory, null, 2));

  console.log("\n=== Summary ===");
  console.log("embeddingsActive:", dashboard.optimizationStatus.embeddingsActive);
  console.log("memoryBypassActive:", dashboard.optimizationStatus.memoryBypassActive);
  console.log("currentCapability:", dashboard.optimizationStatus.currentCapability);
  console.log("embeddingProvider:", dashboard.optimizationStatus.embeddingProvider);
  console.log("embeddingModel:", dashboard.optimizationStatus.embeddingModel);
  console.log("embeddingDimension:", dashboard.optimizationStatus.embeddingDimension);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
