import crypto from "node:crypto";
import { compressWithContext } from "./compression.js";
import { deduplicateWithContext } from "./context.js";
import { estimateTokens } from "./cost.js";

export interface ContextSource {
  id: string;
  kind: "goal" | "memory" | "workflow" | "decision" | "evidence";
  text: string;
  updatedAt?: string;
}

export interface ContextPacket {
  id: string;
  createdAt: string;
  sources: Array<Pick<ContextSource, "id" | "kind" | "updatedAt">>;
  content: string;
  originalTokens: number;
  packedTokens: number;
  savingsPercent: number;
  /** True when content was cut to honor the caller's exact token budget. */
  truncated: boolean;
}

const TRUNCATION_MARKER = "\n[context truncated at packet boundary]";

function truncateToBudget(text: string, maxTokens: number): { content: string; truncated: boolean } {
  if (estimateTokens(text).total <= maxTokens) return { content: text, truncated: false };

  // The token estimator is character based today, but enforce the budget with
  // the estimator instead of assuming that a character slice remains valid if
  // its implementation changes. The marker makes an incomplete handoff clear.
  const marker = estimateTokens(TRUNCATION_MARKER).total <= maxTokens
    ? TRUNCATION_MARKER
    : "[truncated]";
  const markerTokens = estimateTokens(marker).total;
  let candidate = text.slice(0, Math.max(0, (maxTokens - markerTokens) * 4)) + marker;
  while (candidate.length > 0 && estimateTokens(candidate).total > maxTokens) {
    candidate = candidate.slice(0, -1);
  }
  return { content: candidate, truncated: true };
}

/** Bounded handoff shared by AgentForge, workflows, and JEv. */
export function buildContextPacket(sources: ContextSource[], maxTokens = 12000): ContextPacket {
  if (!Number.isInteger(maxTokens) || maxTokens < 1) {
    throw new Error("Context packet maxTokens must be a positive integer.");
  }
  const raw = sources.map(source => `[${source.kind}:${source.id}]\n${source.text}`).join("\n---BLOCK---\n");
  const originalTokens = estimateTokens(raw).total;
  const deduped = deduplicateWithContext(raw, { preserveSystem: true }).deduped;
  const compressed = compressWithContext(deduped, { preserveSystem: true, preserveCode: true }).compressed;
  const { content, truncated } = truncateToBudget(compressed, maxTokens);
  const packedTokens = estimateTokens(content).total;
  return {
    id: `ctx-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    sources: sources.map(({ id, kind, updatedAt }) => ({ id, kind, updatedAt })),
    content,
    originalTokens,
    packedTokens,
    savingsPercent: originalTokens > 0 ? (originalTokens - packedTokens) / originalTokens : 0,
    truncated,
  };
}
