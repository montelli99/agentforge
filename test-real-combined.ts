
import assert from 'node:assert';
import { guardToolResult } from './src/contextGuard.ts';
import { compressPrompt } from './src/compression.ts';
import { deduplicateWithContext } from './src/context.ts';
import { estimateTokens } from './src/tokenAccounting.ts';

// 1. Fetch real OpenViking output from live session
const BASE_URL = "http://127.0.0.1:1933";

// Create Session
let resSession = await fetch(`${BASE_URL}/api/v1/sessions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ description: "Real Combined Test Session" })
});
let sessionData = await resSession.json();
let sessionId = sessionData.result.session_id;

const photoMsg = "Congratulations! We are interested in proceeding with an offer for your property at 789 Oak Ave, Austin TX 78704.";
const systemPrompt = "System Prompt: Prolificclawd Agent rules and system context.\n" + photoMsg;
const turnChunk = "User: Query lead state for 789 Oak Ave.\nAssistant: Stage is Awaiting Photos. Owner: Unassigned. DND: false.\n";
const preContextText = systemPrompt + "\n" + turnChunk.repeat(4300);

const secretFact = "UNIQUE_FACT_X=escrow_closing_code_99482";
const rawToolOutput = "GHL Sync Log Entry [Audit Dump]:\n" + "x".repeat(200000) + "\n" + secretFact + "\n" + "y".repeat(199950);

// Post messages to OpenViking
await fetch(`${BASE_URL}/api/v1/sessions/${sessionId}/messages/batch`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: turnChunk.repeat(4300) },
      { role: "user", content: rawToolOutput }
    ]
  })
});

// Fetch assembled OpenViking context
let resCtx = await fetch(`${BASE_URL}/api/v1/sessions/${sessionId}/context`);
let ctxData = await resCtx.json();
let ovOutputText = JSON.stringify(ctxData.result);
let ovOutputTokens = estimateTokens(ovOutputText);

console.log("REAL_OPENVIKING_RAW_OUTPUT_TOKENS:", ovOutputTokens);

// 2. Pass real OpenViking output into real AgentForge non-overlapping compression
const guardRes = guardToolResult({
  toolResult: ovOutputText,
  currentContextTokens: 60000
});

const dedupRes = deduplicateWithContext(guardRes.guardedContent);
const compRes = compressPrompt(dedupRes.deduped);
const combinedFinalText = compRes.compressed;
const combinedFinalTokens = estimateTokens(combinedFinalText);

const rawBaselineTokens = 216246;
const combinedReductionPercent = (((rawBaselineTokens - combinedFinalTokens) / rawBaselineTokens) * 100).toFixed(2);

console.log("COMBINED_RAW_TOKENS:", rawBaselineTokens);
console.log("COMBINED_FINAL_TOKENS:", combinedFinalTokens);
console.log("COMBINED_REDUCTION_PERCENT:", combinedReductionPercent + "%");
console.log("COMBINED_OVERFLOW_PREVENTED:", combinedFinalTokens <= 200000);
