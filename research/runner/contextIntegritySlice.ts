import { buildContextPacket } from "../../src/contextPacket.js";

const requiredFact = "synthetic-deadline=Friday";
const packet = buildContextPacket([
  { id: "goal-1", kind: "goal", text: `Complete the synthetic task. Required constraint: ${requiredFact}.` },
  { id: "memory-1", kind: "memory", text: `The same constraint is recorded for handoff: ${requiredFact}.` },
  { id: "distractor-1", kind: "memory", text: "Synthetic distractor text repeated for compression and deduplication." },
  { id: "distractor-2", kind: "memory", text: "Synthetic distractor text repeated for compression and deduplication." },
]);
const provenance = new Set(packet.sources.map(source => source.id));
const preservedRequiredFact = packet.content.includes(requiredFact);
const sourceProvenancePreserved = provenance.has("goal-1") && provenance.has("memory-1");
const bounded = packet.packedTokens <= 12_000;
const compressionObserved = packet.packedTokens <= packet.originalTokens;
if (!preservedRequiredFact || !sourceProvenancePreserved || !bounded || !compressionObserved) {
  console.error(JSON.stringify({ valid: false, preservedRequiredFact, sourceProvenancePreserved, bounded, compressionObserved, packet }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  experimentId: "context-integrity-slice-2026-09-29-v1",
  syntheticOnly: true,
  networkCalls: 0,
  providerCalls: 0,
  preservedRequiredFact,
  sourceProvenancePreserved,
  compressionObserved,
  originalTokens: packet.originalTokens,
  packedTokens: packet.packedTokens,
  interpretation: "Context-packing mechanics only; matched model retention and provider-billed savings remain unmeasured.",
}, null, 2));
