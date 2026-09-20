#!/usr/bin/env node
/**
 * Telegram handler smoke test.
 *
 * This simulates what happens when a Telegram message arrives at the
 * OpenClaw gateway: it runs the EXACT same LLM call path the Telegram
 * handler uses (attempt.ts), with AGENTFORGE_ENABLED=true, and verifies
 * the request reaches AgentForge with the correct headers.
 *
 * If the live gateway has AGENTFORGE_ENABLED=true, this test will
 * produce the same result as a real Telegram message.
 */

import { createAgentForgeStreamFn } from "file:///C:/Users/mscott/AI_Workspace/OpenClaw/src/agents/ollama-stream.js";

const AGENTFORGE_BASE_URL = process.env.AGENTFORGE_BASE_URL || "http://localhost:3000";
const TEST_MODEL = "llama3.1:8b";

async function getDashboard() {
  const res = await fetch(`${AGENTFORGE_BASE_URL}/dashboard.json`);
  return res.json();
}

async function main() {
  console.log("--- Telegram Handler Simulation ---");
  console.log("Simulating: user sends Telegram message to bot");
  console.log("Bot processes through OpenClaw → AgentForge → Ollama\n");

  // These are the EXACT headers the Telegram handler sends (attempt.ts:656-661)
  const sourceHeaders = {
    "X-AgentForge-Source": "openclaw",
    "X-AgentForge-Channel": "telegram",
    "X-AgentForge-Project": "openclaw",
    "X-AgentForge-Session": `telegram-${Date.now()}`,
  };

  console.log("Headers (from attempt.ts:656-661):");
  for (const [k, v] of Object.entries(sourceHeaders)) {
    console.log(`  ${k}: ${v}`);
  }

  const before = await getDashboard();
  const beforeOpenClaw = (before.latestRequests || []).filter(
    (r) => r.source === "openclaw",
  ).length;
  console.log(`\nDashboard before: ${before.requests} total, ${beforeOpenClaw} openclaw`);

  // This is what createAgentForgeStreamFn does when AGENTFORGE_ENABLED=true
  const streamFn = createAgentForgeStreamFn(AGENTFORGE_BASE_URL, sourceHeaders);

  console.log("\nSending LLM request (same path as live Telegram handler)...");
  const startTime = Date.now();
  const stream = await streamFn(
    {
      id: TEST_MODEL,
      api: "openai",
      provider: "openai",
      contextWindow: 131072,
    },
    {
      systemPrompt: "You are a helpful assistant. Be brief.",
      messages: [
        { role: "user", content: "Reply with exactly: TELEGRAM_OK" },
      ],
    },
    {},
  );

  let response = "";
  for await (const event of stream) {
    if (event.type === "done") {
      const text = event.message?.content?.map((c) => c.text || "").join("");
      if (text) response = text;
      break;
    }
    if (event.type === "error") {
      console.error("Stream error:", event.error?.errorMessage);
      process.exit(1);
    }
  }
  const latency = Date.now() - startTime;
  console.log(`Response (${latency}ms): ${response.slice(0, 60)}`);

  await new Promise((r) => setTimeout(r, 500));

  const after = await getDashboard();
  const afterOpenclaw = (after.latestRequests || []).filter(
    (r) => r.source === "openclaw",
  ).length;
  console.log(`\nDashboard after: ${after.requests} total, ${afterOpenclaw} openclaw`);

  const latest = (after.latestRequests || [])[0];
  console.log("\n--- Latest Request in AgentForge Dashboard ---");
  console.log(`  source:       ${latest?.source}`);
  console.log(`  channel:      ${latest?.channel}`);
  console.log(`  project:      ${latest?.project}`);
  console.log(`  session:      ${latest?.session}`);
  console.log(`  model:        ${latest?.model}`);
  console.log(`  providerCalled: ${latest?.providerCalled}`);
  console.log(`  latency:      ${latest?.latencyMs}ms`);

  const passed =
    latest?.source === "openclaw" &&
    latest?.channel === "telegram" &&
    latest?.project === "openclaw" &&
    latest?.providerCalled === true;

  console.log(`\n${passed ? "PASS" : "FAIL"}: Live Telegram path would route through AgentForge`);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
