
import { compressPrompt } from './src/compression.ts';
import { deduplicateWithContext } from './src/context.ts';
import { estimateTokens } from './src/tokenAccounting.ts';

// 1. Construct realistic OpenClaw pipeline fixture
const photoMsg = "Congratulations! We are interested in proceeding with an offer for your property at 789 Oak Ave, Austin TX 78704.\n\nTo get qualified immediately for an offer, please reply to this text with interior photos of the kitchen and bathrooms, as well as the living spaces. You can also email the photos to montelliscottrei@gmail.com.\n\nThe sooner you submit photos, the sooner cash gets in your pocket! Looking forward to working with you in getting this across the finish line.\n\nReply STOP to unsubscribe.";

const systemBootstrap = "System: You are Prolificclawd operating for Prolific Capital. Invariants: 1. Locked seller copy: " + photoMsg + " 2. Contact DND/STOP suppresses autoresponder. 3. Leads assigned to Kayla or Seth suppress automated outreach. 4. Realtime leads run 24/7 immediately; Monday campaign window is 12 PM - 7 PM ET. 5. Entry stage is New Lead (d31c50be-0148-4769-b3bd-cf32c2a16bff), photo stage is Awaiting Photos (0bac4afa-7cd0-4019-84ad-6f2a2dc33422).";

const toolSchemas = JSON.stringify({
  tools: [
    { name: "ghl_sync_lead", description: "Sync lead stage and opportunity status in GoHighLevel" },
    { name: "send_sms_notification", description: "Send outbound seller photo request SMS via compliance gateway" },
    { name: "query_property_records", description: "Query Travis County tax assessment and owner title data" }
  ]
}, null, 2);

const projectContext = "Project Context: OpenClaw CLI gateway, Monday outreach scheduler, JustCall SMS relay, GHL webhook ingress at /webhook/ghl.";
const turns = "User: Check lead status for 789 Oak Ave.\nAssistant: Lead is in Awaiting Photos stage. Owner assigned: none. DND: false. Photos received: false.\n".repeat(300); // ~10.5k tokens
const memoryResult = "Memory Recall [Previous Interaction]: Seller requested cash offer for 789 Oak Ave on 2026-08-20.";
const implementationGuide = "Implementation Guide: " + "Step details for automated photo ingestion pipeline and webhook routing. ".repeat(200); // ~4k tokens
const toolResultData = "Tool Result [GHL Lead Sync Audit]:\n" + "x".repeat(35000); // ~8.7k tokens

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
