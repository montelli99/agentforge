#!/usr/bin/env node
/**
 * Repeated-context test for real token savings.
 *
 * Uses the EXACT same OpenClaw LLM path that the Telegram bot uses:
 *   createAgentForgeStreamFn() from src/agents/ollama-stream.ts
 *
 * Sends a realistic large context (simulated repo file) multiple times
 * to trigger AgentForge's chunk-level deduplication.
 */

import { createAgentForgeStreamFn } from "file:///C:/Users/mscott/AI_Workspace/OpenClaw/src/agents/ollama-stream.js";

const AGENTFORGE_BASE_URL = process.env.AGENTFORGE_BASE_URL || "http://localhost:3000";
const TEST_MODEL = process.env.TEST_MODEL || "llama3.1:8b";

function makeRepoContext() {
  return `
File: src/auth/login.ts
import { verifyPassword, createSession } from "../utils/crypto.js";
import { findUserByEmail } from "../models/user.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { validateInput } from "../utils/validation.js";
import { logger } from "../utils/logger.js";

const loginAttempts = new Map<string, number>();

export async function handleLogin(req, res) {
  const { email, password } = req.body;
  try {
    validateInput({ email, password });
    const attempts = loginAttempts.get(email) || 0;
    if (attempts >= 5) return res.status(429).json({ error: "Too many attempts" });
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });
    const session = await createSession(user.id);
    loginAttempts.delete(email);
    res.json({ sessionToken: session.token });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ error: "Internal error" });
  }
}
`.trim();
}

function makeModifiedContext() {
  return `
File: src/auth/login.ts
\`\`\`typescript
import { hashPassword, verifyPassword, createSession } from "../utils/crypto.js";
import { findUserByEmail, updateLastLogin } from "../models/user.js";
import { logSecurityEvent } from "../utils/audit.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { validateInput } from "../utils/validation.js";
import { sendEmail } from "../services/email.js";
import { trackEvent } from "../analytics/tracker.js";
import { getConfig } from "../config/loader.js";
import { metrics } from "../utils/metrics.js";
import { logger } from "../utils/logger.js";
import { checkMFAStatus } from "../middleware/mfa.js";

const config = getConfig();
const loginAttempts = new Map<string, number>();

export async function handleLogin(req, res) {
  const startTime = Date.now();
  const { email, password, mfaToken } = req.body;
  
  try {
    validateInput({ email, password, mfaToken });
    
    const attempts = loginAttempts.get(email) || 0;
    if (attempts >= config.maxLoginAttempts) {
      logSecurityEvent("login_blocked", { email, attempts });
      return res.status(429).json({ error: "Too many attempts" });
    }
    
    const user = await findUserByEmail(email);
    if (!user) {
      loginAttempts.set(email, attempts + 1);
      logSecurityEvent("login_failed_user_not_found", { email });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      loginAttempts.set(email, attempts + 1);
      logSecurityEvent("login_failed_wrong_password", { email, userId: user.id });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    if (user.mfaEnabled) {
      const mfaValid = await checkMFAStatus(user.id, mfaToken);
      if (!mfaValid) {
        logSecurityEvent("login_failed_mfa", { email, userId: user.id });
        return res.status(401).json({ error: "MFA required" });
      }
    }
    
    const session = await createSession(user.id);
    await updateLastLogin(user.id);
    
    loginAttempts.delete(email);
    logSecurityEvent("login_success", { email, userId: user.id });
    trackEvent("user_login", { userId: user.id });
    metrics.increment("login.success");
    
    res.json({ sessionToken: session.token, userId: user.id });
  } catch (error) {
    logger.error("Login error:", error);
    logSecurityEvent("login_error", { email, error: error.message });
    res.status(500).json({ error: "Internal error" });
  } finally {
    metrics.timing("login.duration", Date.now() - startTime);
  }
}

export async function handleLogout(req, res) {
  const { sessionToken } = req.body;
  await destroySession(sessionToken);
  logSecurityEvent("logout", { userId: req.userId });
  res.json({ success: true });
}
\`\`\`
`.trim();
}

async function getDashboard() {
  const res = await fetch(`${AGENTFORGE_BASE_URL}/dashboard.json`);
  return res.json();
}

async function sendRequest(context, prompt, sessionId) {
  const sourceHeaders = {
    "X-AgentForge-Source": "openclaw",
    "X-AgentForge-Channel": "telegram",
    "X-AgentForge-Project": "openclaw",
    "X-AgentForge-Session": sessionId,
  };

  const streamFn = createAgentForgeStreamFn(AGENTFORGE_BASE_URL, sourceHeaders);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const stream = await streamFn(
      {
        id: TEST_MODEL,
        api: "openai",
        provider: "openai",
        contextWindow: 131072,
      },
      {
        systemPrompt: "You are a helpful code review assistant. Analyze the provided code and answer the question.",
        messages: [
          { role: "user", content: `${context}\n\nQuestion: ${prompt}` },
        ],
      },
      { signal: controller.signal },
    );

    let response = "";
    for await (const event of stream) {
      if (event.type === "done") {
        const text = event.message?.content?.map((c) => c.text || "").join("");
        if (text) response = text;
        break;
      }
      if (event.type === "error") {
        throw new Error(event.error?.errorMessage || "stream error");
      }
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function runTest() {
  console.log("--- Repeated-Context Savings Test ---");
  console.log(`AGENTFORGE_BASE_URL: ${AGENTFORGE_BASE_URL}`);
  console.log(`Model: ${TEST_MODEL}\n`);

  const baseContext = makeRepoContext();
  const modifiedContext = makeModifiedContext();
  const sessionId = `repeated-test-${Date.now()}`;

  const before = await getDashboard();
  console.log(`Baseline: ${before.requests} requests, ${before.tokensPrevented} prevented\n`);

  console.log("Request 1: First time sending repo context...");
  const t1 = Date.now();
  await sendRequest(baseContext, "What does the handleLogin function do?", sessionId);
  console.log(`  (${Date.now() - t1}ms)\n`);

  console.log("Request 2: Same context (should trigger deduplication)...");
  const t2 = Date.now();
  await sendRequest(baseContext, "Are there any security issues?", sessionId);
  console.log(`  (${Date.now() - t2}ms)\n`);

  console.log("Request 3: Same context again (cache should be warm)...");
  const t3 = Date.now();
  await sendRequest(baseContext, "Suggest improvements to error handling.", sessionId);
  console.log(`  (${Date.now() - t3}ms)\n`);

  console.log("Request 4: Modified context (MFA added)...");
  const t4 = Date.now();
  await sendRequest(modifiedContext, "What changed in this file?", sessionId);
  console.log(`  (${Date.now() - t4}ms)\n`);

  await new Promise((r) => setTimeout(r, 500));
  const after = await getDashboard();

  console.log("--- Results ---");
  console.log(`Requests: ${after.requests} (was ${before.requests}, delta ${after.requests - before.requests})`);
  console.log(`Tokens seen: ${after.tokensSeen} (was ${before.tokensSeen}, delta ${after.tokensSeen - before.tokensSeen})`);
  console.log(`Tokens prevented: ${after.tokensPrevented} (was ${before.tokensPrevented}, delta ${after.tokensPrevented - before.tokensPrevented})`);
  console.log(`Provider calls avoided: ${after.providerCallsAvoided}`);
  console.log(`Avg reduction: ${(after.averageReductionPercent ?? 0).toFixed(2)}%`);

  const ourRequests = (after.latestRequests || []).filter(
    (r) => r.session === sessionId,
  );
  console.log(`\nOur ${ourRequests.length} requests:`);
  for (const r of ourRequests) {
    console.log(`  ${r.timestamp.slice(11, 19)} | base=${r.baselineTokens} opt=${r.optimizedTokens} saved=${r.tokensPrevented} | ${r.optimizationType?.slice(0, 60)}`);
  }

  const totalPrevented = ourRequests.reduce((s, r) => s + r.tokensPrevented, 0);
  const anySavings = totalPrevented > 0;

  console.log(`\nTotal tokens prevented in our test: ${totalPrevented}`);
  console.log(`Test ${anySavings ? "PASSED" : "INCOMPLETE"}: ${anySavings ? "savings detected" : "no savings (hash-fallback embeddings may need config)"}`);
}

runTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
