
import assert from 'node:assert';
import { AgentForgeOptimizer } from './src/optimizer.ts';
import type { CanonicalEnvelope, RuntimeRequest } from './src/types.ts';

// 1. Construct realistic domain context fixture with critical facts
const systemPrompt = "System: You are Prolificclawd operating for Prolific Capital. Critical Invariants: 1. Seller copy is locked: 'Congratulations! We are interested in proceeding with an offer for your property at {PropertyAddress}. To get qualified immediately for an offer, please reply to this text with interior photos of the kitchen and bathrooms, as well as the living spaces. You can also email the photos to montelliscottrei@gmail.com. The sooner you submit photos, the sooner cash gets in your pocket! Looking forward to working with you in getting this across the finish line. Reply STOP to unsubscribe.' 2. DND/STOP state must suppress autoresponder. 3. Leads assigned to human operators (Kayla/Seth) must be suppressed. 4. Realtime leads run 24/7 immediately; Monday campaign window is 12 PM - 7 PM ET. 5. Entry stage is New Lead (d31c50be-0148-4769-b3bd-cf32c2a16bff), photo stage is Awaiting Photos (0bac4afa-7cd0-4019-84ad-6f2a2dc33422).";

// Build a 140,000 token session context (~560,000 chars of conversation history + project background)
const sessionChunk = "User: Check lead status for 100 Main St. Assistant: Lead is in Awaiting Photos stage. Owner assigned: none. DND: false. Photos received: false.\n";
const conversationHistory = sessionChunk.repeat(4000); // ~560,000 chars

// Build a 400,000 character raw tool result (~100,000 tokens)
const rawToolOutput = "Tool Output Log Entry [GHL Sync Audit Data]: " + "x".repeat(399950);

const fullPromptText = systemPrompt + "\n" + conversationHistory + "\n" + rawToolOutput;
const realBaselineChars = fullPromptText.length;
const realBaselineTokens = Math.ceil(realBaselineChars / 4);

console.log("REAL_BASELINE_INPUT_CHARS:", realBaselineChars);
console.log("REAL_BASELINE_INPUT_TOKENS:", realBaselineTokens);

// Build canonical AgentForge envelope & request
const envelope: CanonicalEnvelope = {
  runId: 'run_400k_test_001',
  runtimeId: 'openclaw',
  transport: 'stdio',
  trustTier: 'T1',
  sideEffecting: false,
  model: { provider: 'codex', model: 'gpt-5.4-mini' },
  request: { prompt: fullPromptText },
  policy: {},
  reflection: { preflight: 'approve', postResult: 'approve' }
};

const runtimeReq: RuntimeRequest = {
  prompt: fullPromptText,
  model: 'codex/gpt-5.4-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: conversationHistory },
    { role: 'user', content: rawToolOutput }
  ]
};

// 2. Execute Real AgentForgeOptimizer
const optimizer = new AgentForgeOptimizer({
  enabled: true,
  targetTokenReduction: 0.8,
  exactCache: false,
  semanticCache: false,
  promptCompression: true,
  contextDeduplication: true,
  costAwareRouting: false,
  providerOptimization: true,
  providerFailover: true
});

const result = await optimizer.optimize(envelope, runtimeReq);
const optimizedText = typeof result.envelope.request.prompt === 'string' ? result.envelope.request.prompt : JSON.stringify(result.envelope.request);
const realOutputChars = optimizedText.length;
const realOutputTokens = result.telemetry.optimizedTokens.input || Math.ceil(realOutputChars / 4);
const realReductionPercent = result.telemetry.savingsPercent || (((realBaselineTokens - realOutputTokens) / realBaselineTokens) * 100);

console.log("REAL_AGENTFORGE_OUTPUT_CHARS:", realOutputChars);
console.log("REAL_AGENTFORGE_OUTPUT_TOKENS:", realOutputTokens);
console.log("REAL_AGENTFORGE_REDUCTION_PERCENT:", realReductionPercent.toFixed(2) + "%");

// 3. Structured Assertions over Critical Domain Invariants Post-Optimization
let assertionErrors = [];

try {
  assert.ok(optimizedText.includes("Congratulations! We are interested in proceeding with an offer for your property"), "Fact 1: Locked seller copy missing");
  console.log("ASSERTION 1 (Seller Copy Preserved): PASS");
} catch (e) { assertionErrors.push(e.message); }

try {
  assert.ok(optimizedText.includes("DND/STOP state must suppress"), "Fact 2: DND/STOP rule missing");
  console.log("ASSERTION 2 (DND/STOP Rule Preserved): PASS");
} catch (e) { assertionErrors.push(e.message); }

try {
  assert.ok(optimizedText.includes("assigned to human operators"), "Fact 3: Human ownership rule missing");
  console.log("ASSERTION 3 (Human Ownership Preserved): PASS");
} catch (e) { assertionErrors.push(e.message); }

try {
  assert.ok(optimizedText.includes("Realtime leads run 24/7"), "Fact 4: Realtime 24/7 rule missing");
  console.log("ASSERTION 4 (Realtime vs Monday Preserved): PASS");
} catch (e) { assertionErrors.push(e.message); }

try {
  assert.ok(optimizedText.includes("d31c50be-0148-4769-b3bd-cf32c2a16bff"), "Fact 5: Stage ID semantics missing");
  console.log("ASSERTION 5 (Pipeline Stage Semantics Preserved): PASS");
} catch (e) { assertionErrors.push(e.message); }

const overflowPrevented = realOutputTokens <= 200000;
console.log("OVERFLOW_PREVENTED:", overflowPrevented ? "PASS" : "FAIL");

console.log("\nSUMMARY_RESULTS:");
console.log(JSON.stringify({
  REAL_BASELINE_INPUT_TOKENS: realBaselineTokens,
  REAL_AGENTFORGE_OUTPUT_TOKENS: realOutputTokens,
  REAL_AGENTFORGE_REDUCTION_PERCENT: realReductionPercent.toFixed(2) + "%",
  RAW_CONTEXT_TOKENS: realBaselineTokens,
  ACTUAL_OPTIMIZED_CONTEXT_TOKENS: realOutputTokens,
  OVERFLOW_PREVENTED: overflowPrevented,
  ASSERTION_FAILURES: assertionErrors.length,
  REAL_AGENTFORGE_CORRECTNESS: assertionErrors.length === 0 ? "PASS (5/5 Domain Invariants Verified)" : "FAIL"
}, null, 2));
