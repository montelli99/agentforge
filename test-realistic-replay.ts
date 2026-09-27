
import { compressPrompt } from './src/compression.ts';
import { deduplicateWithContext } from './src/context.ts';
import { estimateTokens } from './src/tokenAccounting.ts';

// Synthetic context-stress fixture. It intentionally contains no production workflow,
// customer, provider, contact, address, or vertical-specific information.
const intakeMessage = "Thanks for your request. To help our team review it, reply with the supporting files and the details that matter most. You can also use the secure workspace upload link. Reply STOP to opt out.";

const systemBootstrap = "System: You are ExampleBot in a fictional operations workspace. Invariants: 1. Approved intake copy: " + intakeMessage + " 2. A do-not-contact preference suppresses automatic replies. 3. Records assigned to a human owner suppress automatic outreach. 4. Realtime intake runs continuously; scheduled work runs during the configured business window. 5. New requests begin in Intake and move to Evidence Requested when supporting material is needed.";

const toolSchemas = JSON.stringify({
  tools: [
    { name: "sync_request", description: "Sync a request stage and review status" },
    { name: "send_notification", description: "Send an approved request for supporting material through a compliance gateway" },
    { name: "query_reference_records", description: "Query fictional reference records for a review" }
  ]
}, null, 2);

const projectContext = "Project Context: generic CLI gateway, scheduled notification relay, and sample request-ingress adapter.";
const turns = "User: Check the status for Example Request 789.\nAssistant: The request is in Evidence Requested. Owner assigned: none. Do-not-contact: false. Supporting files received: false.\n".repeat(300); // ~10.5k tokens
const memoryResult = "Memory Recall [Previous Interaction]: A requester asked for a review of Example Request 789.";
const implementationGuide = "Implementation Guide: " + "Step details for automated evidence intake and generic event routing. ".repeat(200); // ~4k tokens
const toolResultData = "Tool Result [Example Request Sync Audit]:\n" + "x".repeat(35000); // ~8.7k tokens

const fullRealisticFixture = systemBootstrap + "\n\n" + toolSchemas + "\n\n" + projectContext + "\n\n" + turns + "\n\n" + memoryResult + "\n\n" + implementationGuide + "\n\n" + toolResultData;

const realisticBaselineTokens = estimateTokens(fullRealisticFixture);

// AgentForge Replay
const afDedup = deduplicateWithContext(fullRealisticFixture);
const afComp = compressPrompt(afDedup.deduped);
const realisticAfTokens = estimateTokens(afComp.compressed);
const realisticAfReduction = (((realisticBaselineTokens - realisticAfTokens) / realisticBaselineTokens) * 100).toFixed(2) + "%";

// Live OpenViking Replay
const BASE_URL = "http://127.0.0.1:1933";
let resSession = await fetch(`${BASE_URL}/api/v1/sessions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ description: "Realistic Replay Session" })
});
let sessionData = await resSession.json();
let sessionId = sessionData.result.session_id;

await fetch(`${BASE_URL}/api/v1/sessions/${sessionId}/messages/batch`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [
      { role: "system", content: systemBootstrap },
      { role: "user", content: fullRealisticFixture }
    ]
  })
});

let resCtx = await fetch(`${BASE_URL}/api/v1/sessions/${sessionId}/context`);
let ctxData = await resCtx.json();
let ovOutputText = JSON.stringify(ctxData.result);
let realisticOvTokens = estimateTokens(ovOutputText);
let realisticOvReduction = (((realisticBaselineTokens - realisticOvTokens) / realisticBaselineTokens) * 100).toFixed(2) + "%";

// Combined Replay
const combinedDedup = deduplicateWithContext(ovOutputText);
const combinedComp = compressPrompt(combinedDedup.deduped);
const realisticCombinedTokens = estimateTokens(combinedComp.compressed);
const realisticCombinedReduction = (((realisticBaselineTokens - realisticCombinedTokens) / realisticBaselineTokens) * 100).toFixed(2) + "%";

console.log("REALISTIC_BASELINE_TOKENS:", realisticBaselineTokens);
console.log("REALISTIC_AGENTFORGE_TOKENS:", realisticAfTokens, "(Reduction:", realisticAfReduction, ")");
console.log("REALISTIC_OPENVIKING_TOKENS:", realisticOvTokens, "(Reduction:", realisticOvReduction, ")");
console.log("REALISTIC_COMBINED_TOKENS:", realisticCombinedTokens, "(Reduction:", realisticCombinedReduction, ")");
