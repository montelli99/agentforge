import crypto from "crypto";
import { estimateTokens } from "./tokenAccounting.js";

export type ContextBudgetConfig = {
  modelContextLimit: number;
  systemReservedTokens: number;
  toolSchemaReservedTokens: number;
  outputReservedTokens: number;
  safetyMarginTokens: number;
};

export const DEFAULT_CONTEXT_BUDGET_CONFIG: ContextBudgetConfig = {
  modelContextLimit: 200000,
  systemReservedTokens: 4000,
  toolSchemaReservedTokens: 2000,
  outputReservedTokens: 4000,
  safetyMarginTokens: 4000,
};

export type ContextGuardTelemetry = {
  rawToolTokens: number;
  visibleToolTokens: number;
  omittedToolTokens: number;
  toolResultReference: string;
  truncationReason: string;
  retrievalAvailable: boolean;
};

export type GuardResult = {
  guardedContent: string;
  truncated: boolean;
  telemetry: ContextGuardTelemetry;
};

// In-memory deferred tool result store for staging
const deferredToolStore = new Map<string, string>();

export function storeDeferredToolResult(id: string, content: string): void {
  deferredToolStore.set(id, content);
}

export function retrieveDeferredToolResult(id: string, query?: string): string | null {
  const content = deferredToolStore.get(id);
  if (!content) return null;

  if (!query) return content;

  // Search content for query match
  const lines = content.split("\n");
  const matches = lines.filter((l) => l.toLowerCase().includes(query.toLowerCase()));
  if (matches.length > 0) {
    return matches.join("\n");
  }

  // Fallback: check regex or return full content if short
  const lowerContent = content.toLowerCase();
  const idx = lowerContent.indexOf(query.toLowerCase());
  if (idx !== -1) {
    const start = Math.max(0, idx - 100);
    const end = Math.min(content.length, idx + query.length + 100);
    return content.slice(start, end);
  }

  return content;
}

export function calculateAvailableToolTokens(
  currentContextTokens: number,
  config: ContextBudgetConfig = DEFAULT_CONTEXT_BUDGET_CONFIG
): number {
  const reserved =
    config.systemReservedTokens +
    config.toolSchemaReservedTokens +
    config.outputReservedTokens +
    config.safetyMarginTokens;
  
  const budget = config.modelContextLimit - (currentContextTokens + reserved);
  return Math.max(2000, budget); // Ensure minimum 2000 tokens for tool result
}

export function guardToolResult(params: {
  toolResult: string;
  currentContextTokens: number;
  tenantId?: string;
  config?: Partial<ContextBudgetConfig>;
}): GuardResult {
  const cfg: ContextBudgetConfig = { ...DEFAULT_CONTEXT_BUDGET_CONFIG, ...params.config };
  const rawTokens = estimateTokens(params.toolResult);
  const availableTokens = calculateAvailableToolTokens(params.currentContextTokens, cfg);

  if (rawTokens <= availableTokens) {
    return {
      guardedContent: params.toolResult,
      truncated: false,
      telemetry: {
        rawToolTokens: rawTokens,
        visibleToolTokens: rawTokens,
        omittedToolTokens: 0,
        toolResultReference: "",
        truncationReason: "Within context budget",
        retrievalAvailable: false,
      },
    };
  }

  // Truncation required to prevent context overflow
  const hash = crypto.createHash("sha256").update(params.toolResult).digest("hex").slice(0, 16);
  const refId = `ref_tool_${hash}`;
  
  // Store full raw tool output in deferred store
  storeDeferredToolResult(refId, params.toolResult);

  // Extract structured identifiers & key lines (UUIDs, stage IDs, status codes, errors)
  const lines = params.toolResult.split("\n");
  const structuredLines: string[] = [];
  const statusPattern = /(status|stage|id|uuid|error|locked|suppress|dnd|stop|owner|assigned|stage_id|[0-9a-f]{8}-[0-9a-f]{4})/i;

  for (const line of lines) {
    if (statusPattern.test(line)) {
      structuredLines.push(line);
      if (structuredLines.length >= 50) break;
    }
  }

  // Target visible char limit based on available tokens
  const targetChars = availableTokens * 4;
  const headChars = Math.floor(targetChars * 0.4);
  const tailChars = Math.floor(targetChars * 0.4);

  const headSlice = params.toolResult.slice(0, headChars);
  const tailSlice = params.toolResult.slice(params.toolResult.length - tailChars);

  const referenceNotice = `\n\n[AgentForge Context Guard: Large Tool Result Omitted (${rawTokens} raw tokens > ${availableTokens} budget tokens).\nPreserved key state: ${structuredLines.slice(0, 5).join(" | ")}\nDeferred Retrieval Reference ID: ${refId}. Deferred retrieval active.]\n\n`;

  const guardedContent = headSlice + referenceNotice + tailSlice;
  const visibleToolTokens = estimateTokens(guardedContent);
  const omittedToolTokens = Math.max(0, rawTokens - visibleToolTokens);

  return {
    guardedContent,
    truncated: true,
    telemetry: {
      rawToolTokens: rawTokens,
      visibleToolTokens,
      omittedToolTokens,
      toolResultReference: refId,
      truncationReason: `Tool result (${rawTokens} tokens) exceeded context budget (${availableTokens} tokens available)`,
      retrievalAvailable: true,
    },
  };
}
