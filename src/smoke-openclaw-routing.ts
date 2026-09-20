#!/usr/bin/env node
/**
 * AgentForge integration smoke test.
 *
 * This exercises the EXACT same code path the Telegram bot uses to send
 * LLM requests when AGENTFORGE_ENABLED=true:
 *   src/agents/pi-embedded-runner/run/attempt.ts:652-665
 *   -> createAgentForgeStreamFn(AGENTFORGE_BASE_URL, sourceHeaders)
 *   -> fetch(`${baseUrl}/v1/chat/completions`, { headers, body })
 *
 * It sends a real LLM request through AgentForge with the same X-AgentForge-*
 * headers the Telegram bot would send, then queries the AgentForge dashboard
 * to prove the request was logged with the correct source metadata.
 */

import { createAgentForgeStreamFn } from "file:///C:/Users/mscott/AI_Workspace/OpenClaw/src/agents/ollama-stream.js";

const AGENTFORGE_BASE_URL = process.env.AGENTFORGE_BASE_URL || "http://localhost:3000";
const TEST_MODEL = process.env.TEST_MODEL || "llama3.1:8b";

async function getDashboard() {
  const res = await fetch(`${AGENTFORGE_BASE_URL}/dashboard.json`);
  return res.json();
}

async function getDashboardBefore() {
  return getDashboard();
}

async function getDashboardAfter() {
  return getDashboard();
}

async function runAgentForgeRequest() {
  console.log("--- AgentForge Integration Smoke Test ---");
  console.log(`AGENTFORGE_BASE_URL: ${AGENTFORGE_BASE_URL}`);
  console.log(`Model: ${TEST_MODEL}`);

  // Same headers attempt.ts sends for a Telegram message
  const sourceHeaders = {
    "X-AgentForge-Source": "openclaw",
    "X-AgentForge-Channel": "telegram",
    "X-AgentForge-Project": "openclaw",
    "X-AgentForge-Session": `smoke-test-${Date.now()}`,
  };

  console.log("\nSource headers (same as Telegram bot):");
  for (const [k, v] of Object.entries(sourceHeaders)) {
    console.log(`  ${k}: ${v}`);
  }

  // Snapshot dashboard before
  const before = await getDashboardBefore();
  const beforeCount = before.requests;
  console.log(`\nDashboard requests before: ${beforeCount}`);

  // Create the stream fn - same as attempt.ts:662
  const streamFn = createAgentForgeStreamFn(AGENTFORGE_BASE_URL, sourceHeaders);

  console.log("\nSending LLM request through AgentForge...");
  const startTime = Date.now();
  const stream = await streamFn(
    {
      id: TEST_MODEL,
      api: "openai",
      provider: "openai",
      contextWindow: 131072,
    },
    {
      messages: [
        { role: "user", content: "Reply with exactly: AGENTFORGE_OK" },
      ],
    },
    {},
  );

  let accumulated = "";
  const streamTimeout = setTimeout(() => {
    console.error("STREAM TIMEOUT after 25s");
    process.exit(2);
  }, 25000);

  try {
    for await (const event of stream) {
      console.log(`  event: type=${event.type}`);
      if (event.type === "done") {
        const text = event.message?.content
          ?.map((c) => c.text || "")
          .join("");
        if (text) accumulated = text;
        break;
      }
      if (event.type === "error") {
        console.error("Stream error:", event.error?.errorMessage);
        break;
      }
    }
  } finally {
    clearTimeout(streamTimeout);
  }
  const latency = Date.now() - startTime;
  console.log(`Response (${latency}ms): ${accumulated.slice(0, 100)}`);

  // Wait a moment for dashboard to update
  await new Promise((r) => setTimeout(r, 500));

  // Snapshot dashboard after
  const after = await getDashboardAfter();
  const afterCount = after.requests;
  console.log(`Dashboard requests after: ${afterCount}`);

  // Find our request in the log
  const latestRequests = after.latestRequests || [];
  const ourRequest = latestRequests.find(
    (r) => r.session === sourceHeaders["X-AgentForge-Session"],
  );

  if (!ourRequest) {
    console.error("\nFAIL: Request not found in AgentForge dashboard");
    console.error("Latest requests:", JSON.stringify(latestRequests.slice(0, 3), null, 2));
    process.exit(1);
  }

  console.log("\n--- Dashboard Entry (Proof) ---");
  console.log(`  requestId:    ${ourRequest.requestId}`);
  console.log(`  source:       ${ourRequest.source}`);
  console.log(`  channel:      ${ourRequest.channel}`);
  console.log(`  project:      ${ourRequest.project}`);
  console.log(`  session:      ${ourRequest.session}`);
  console.log(`  model:        ${ourRequest.model}`);
  console.log(`  providerCalled: ${ourRequest.providerCalled}`);
  console.log(`  bypass:       ${ourRequest.bypass}`);
  console.log(`  baselineTokens: ${ourRequest.baselineTokens}`);
  console.log(`  optimizedTokens: ${ourRequest.optimizedTokens}`);
  console.log(`  tokensPrevented: ${ourRequest.tokensPrevented}`);
  console.log(`  latency:      ${ourRequest.latencyMs}ms`);

  // Verify all expected fields
  const checks = [
    { field: "source", expected: "openclaw", actual: ourRequest.source },
    { field: "channel", expected: "telegram", actual: ourRequest.channel },
    { field: "project", expected: "openclaw", actual: ourRequest.project },
    { field: "session", expected: sourceHeaders["X-AgentForge-Session"], actual: ourRequest.session },
    { field: "providerCalled", expected: true, actual: ourRequest.providerCalled },
  ];

  let allPass = true;
  console.log("\n--- Assertions ---");
  for (const c of checks) {
    const pass = c.actual === c.expected;
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${c.field}: expected="${c.expected}" actual="${c.actual}"`);
    if (!pass) allPass = false;
  }

  console.log(`\nDashboard count delta: ${afterCount - beforeCount} (expected 1)`);
  if (afterCount - beforeCount !== 1) allPass = false;

  if (allPass) {
    console.log("\nALL CHECKS PASSED");
    console.log("OpenClaw LLM path is verified to route through AgentForge.");
    process.exit(0);
  } else {
    console.log("\nSOME CHECKS FAILED");
    process.exit(1);
  }
}

runAgentForgeRequest().catch((err) => {
  console.error("Smoke test error:", err);
  process.exit(1);
});
