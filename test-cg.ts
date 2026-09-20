
import { guardToolResult, retrieveDeferredToolResult } from './src/contextGuard.ts';

const rawToolResult = "Line 1: Status OK\nLine 2: Stage ID d31c50be-0148-4769-b3bd-cf32c2a16bff\n" + "x".repeat(400000) + "\nUNIQUE_FACT_X=secret_val_99";

const res = guardToolResult({
  toolResult: rawToolResult,
  currentContextTokens: 150000
});

console.log("Truncated:", res.truncated);
console.log("Raw Tokens:", res.telemetry.rawToolTokens);
console.log("Visible Tokens:", res.telemetry.visibleToolTokens);
console.log("Ref ID:", res.telemetry.toolResultReference);
console.log("Retrieval Available:", res.telemetry.retrievalAvailable);

const retrieved = retrieveDeferredToolResult(res.telemetry.toolResultReference, "UNIQUE_FACT_X");
console.log("Retrieved Fact:", retrieved);
