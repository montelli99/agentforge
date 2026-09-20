
import { compressPrompt } from './src/compression.ts';
import { deduplicateWithContext } from './src/context.ts';
import { MemoryContextOptimizer } from './src/memoryContextOptimizer.ts';
import { estimateTokens } from './src/tokenAccounting.ts';

const systemPrompt = "System: You are Prolificclawd operating for Prolific Capital.";
const conversationHistory = "User: Check status.\nAssistant: Ok.\n".repeat(2000); // ~70k tokens
const rawToolOutput = "Tool Output [Audit Log]: " + "x".repeat(399975); // 400,000 chars (~100k tokens)

const rawFullPrompt = systemPrompt + "\n" + conversationHistory + "\n" + rawToolOutput;
const rawToolChars = rawToolOutput.length;
const baselineTokens = estimateTokens(rawFullPrompt);

// Pass directly through AgentForge MemoryContextOptimizer.eliminateLargeContext (first time)
const optimizer = new MemoryContextOptimizer({ enabled: true, largeContextElimination: true });
const largeResult = optimizer.eliminateLargeContext({
  content: rawToolOutput,
  tokenCount: estimateTokens(rawToolOutput),
  tenantId: 'prolific-capital',
  provider: 'codex',
  model: 'gpt-5.4-mini'
});

// Pass through dedup & compress without manual slicing
const dedupResult = deduplicateWithContext(systemPrompt + "\n" + conversationHistory + "\n" + largeResult.replacedWith);
const compResult = compressPrompt(dedupResult.deduped);

const nativeOutputText = compResult.compressed;
const nativeOutputChars = nativeOutputText.length;
const nativeOutputTokens = estimateTokens(nativeOutputText);
const nativeReductionPercent = (((baselineTokens - nativeOutputTokens) / baselineTokens) * 100).toFixed(2);
const nativeOverflowPrevented = nativeOutputTokens <= 200000;

console.log("RAW_TOOL_CHARS:", rawToolChars);
console.log("AGENTFORGE_NATIVE_VISIBLE_CHARS:", nativeOutputChars);
console.log("BASELINE_TOKENS:", baselineTokens);
console.log("NATIVE_AGENTFORGE_OUTPUT_TOKENS:", nativeOutputTokens);
console.log("NATIVE_REDUCTION_PERCENT:", nativeReductionPercent + "%");
console.log("NATIVE_OVERFLOW_PREVENTED:", nativeOverflowPrevented);

console.log("\nNATIVE_GUARD_EXISTS_CHECK:");
console.log("AGENTFORGE_NATIVE_400K_GUARD_EXISTS:", nativeOutputTokens > 100000 ? "false (Lacks native raw tool-result truncation guard on first-time inputs)" : "true");
