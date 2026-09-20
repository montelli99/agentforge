import type { ContextDedupResult, TokenEstimate } from "./optimization-types.js";
import { estimateTokens } from "./cost.js";

const BLOCK_SEPARATOR = "\n---BLOCK---\n";
const MAX_BLOCK_LENGTH = 10000;

function splitIntoBlocks(text: string): string[] {
  return text.split(BLOCK_SEPARATOR).filter((block) => block.trim().length > 0);
}

function normalizeBlock(block: string): string {
  return block
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function hashBlock(block: string): string {
  const normalized = normalizeBlock(block);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

function detectDuplicateBlocks(blocks: string[]): {
  unique: string[];
  duplicates: number;
} {
  const seen: Map<string, number> = new Map();
  const unique: string[] = [];
  let duplicates = 0;

  for (const block of blocks) {
    const hash = hashBlock(block);
    const count = seen.get(hash) || 0;
    seen.set(hash, count + 1);
    if (count === 0) {
      unique.push(block);
    } else {
      duplicates++;
    }
  }

  return { unique, duplicates };
}

function collapseRepeatedPatterns(text: string): string {
  const lines = text.split("\n");
  const collapsed: string[] = [];
  let repeatCount = 0;
  let lastLine = "";

  for (const line of lines) {
    if (line === lastLine) {
      repeatCount++;
      if (repeatCount <= 2) {
        collapsed.push(line);
      }
    } else {
      if (repeatCount > 2) {
        collapsed.push(`... (${repeatCount - 2} repeated lines removed)`);
      }
      repeatCount = 1;
      collapsed.push(line);
    }
    lastLine = line;
  }

  if (repeatCount > 2) {
    collapsed.push(`... (${repeatCount - 2} repeated lines removed)`);
  }

  return collapsed.join("\n");
}

function trimOversizedBlocks(blocks: string[], maxChars: number): string[] {
  return blocks.map((block) => {
    if (block.length <= maxChars) return block;
    const head = block.slice(0, maxChars / 2);
    const tail = block.slice(-maxChars / 2);
    return `${head}\n... [trimmed ${block.length - maxChars} chars] ...\n${tail}`;
  });
}

export function deduplicateContext(text: string): ContextDedupResult {
  const originalTokens = estimateTokens(text);

  let processed = text;

  const blocks = splitIntoBlocks(processed);
  if (blocks.length > 1) {
    const { unique, duplicates } = detectDuplicateBlocks(blocks);
    if (duplicates > 0) {
      processed = unique.join(BLOCK_SEPARATOR);
    }
  }

  processed = collapseRepeatedPatterns(processed);

  const dedupedTokens = estimateTokens(processed);
  const removedBlocks = blocks.length - splitIntoBlocks(processed).length;

  return {
    deduped: processed,
    originalTokens: originalTokens.total,
    dedupedTokens: dedupedTokens.total,
    removedBlocks,
    savingsEstimate: {
      input: originalTokens.total - dedupedTokens.total,
      output: 0,
      total: originalTokens.total - dedupedTokens.total,
    },
  };
}

export function deduplicateWithContext(
  text: string,
  context: { maxBlockSize?: number; preserveSystem?: boolean } = {},
): ContextDedupResult {
  const { maxBlockSize = MAX_BLOCK_LENGTH, preserveSystem = true } = context;
  const originalTokens = estimateTokens(text);

  let processed = text;

  if (preserveSystem) {
    const systemEnd = findSystemEnd(processed);
    if (systemEnd > 0) {
      const systemPart = processed.slice(0, systemEnd);
      const userPart = processed.slice(systemEnd);
      const userResult = deduplicateContext(userPart);
      return {
        deduped: systemPart + userResult.deduped,
        originalTokens: originalTokens.total,
        dedupedTokens: estimateTokens(systemPart).total + userResult.dedupedTokens,
        removedBlocks: userResult.removedBlocks,
        savingsEstimate: {
          input: originalTokens.total - (estimateTokens(systemPart).total + userResult.dedupedTokens),
          output: 0,
          total: originalTokens.total - (estimateTokens(systemPart).total + userResult.dedupedTokens),
        },
      };
    }
  }

  const blocks = splitIntoBlocks(processed);
  if (blocks.length > 1) {
    const trimmed = trimOversizedBlocks(blocks, maxBlockSize);
    processed = trimmed.join(BLOCK_SEPARATOR);
  }

  const result = deduplicateContext(processed);
  return result;
}

function findSystemEnd(text: string): number {
  const lines = text.split("\n");
  let lastSystemLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase().trim();
    if (
      line.startsWith("system:") ||
      line.startsWith("developer:") ||
      line.startsWith("security:") ||
      line.startsWith("policy:") ||
      line.startsWith("instruction:")
    ) {
      lastSystemLine = i;
    }
  }

  if (lastSystemLine >= 0) {
    for (let i = lastSystemLine + 1; i < lines.length; i++) {
      if (lines[i].trim() === "") {
        return lines.slice(0, i + 1).join("\n").length;
      }
    }
  }

  return 0;
}

export function estimateContextSavings(
  original: string,
  deduped: string,
): TokenEstimate {
  const originalTokens = estimateTokens(original);
  const dedupedTokens = estimateTokens(deduped);
  return {
    input: originalTokens.total - dedupedTokens.total,
    output: 0,
    total: originalTokens.total - dedupedTokens.total,
  };
}
