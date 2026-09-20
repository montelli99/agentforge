
import assert from 'node:assert';
import { guardToolResult, retrieveDeferredToolResult } from './src/contextGuard.ts';

// Turn 1: Huge tool result with unique secret fact
const secretFact = "UNIQUE_FACT_X=escrow_closing_code_99482";
const toolResultTurn1 = "Audit Log Turn 1:\n" + "x".repeat(300000) + "\n" + secretFact + "\n" + "y".repeat(99950);

const guardRes1 = guardToolResult({
  toolResult: toolResultTurn1,
  currentContextTokens: 150000
});

const immediateFactVisible = guardRes1.guardedContent.includes("escrow_closing_code_99482");
const referenceCreated = guardRes1.telemetry.toolResultReference.startsWith("ref_tool_");

// Deferred Retrieval 1
const retrieved1 = retrieveDeferredToolResult(guardRes1.telemetry.toolResultReference, "UNIQUE_FACT_X");
const deferredRetrieval1 = retrieved1 !== null && retrieved1.includes("escrow_closing_code_99482");

// Turn 2: Unrelated tool result turn processed afterwards
const toolResultTurn2 = "Audit Log Turn 2:\n" + "z".repeat(200000);
const guardRes2 = guardToolResult({
  toolResult: toolResultTurn2,
  currentContextTokens: 150000
});

// Deferred Retrieval after Turn 2
const retrieved2 = retrieveDeferredToolResult(guardRes1.telemetry.toolResultReference, "UNIQUE_FACT_X");
const deferredRetrievalAfterTurn2 = retrieved2 !== null && retrieved2.includes("escrow_closing_code_99482");

console.log("IMMEDIATE_FACT_VISIBLE:", immediateFactVisible);
console.log("REFERENCE_CREATED:", referenceCreated, "(Ref:", guardRes1.telemetry.toolResultReference, ")");
console.log("DEFERRED_RETRIEVAL_1:", deferredRetrieval1);
console.log("DEFERRED_RETRIEVAL_AFTER_NEXT_TURN:", deferredRetrievalAfterTurn2);
