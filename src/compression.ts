import type { CompressionResult } from "./optimization-types.js";
import { estimateTokens } from "./cost.js";

const SYSTEM_PATTERNS = [
  /^system:/im,
  /^developer:/im,
  /^security:/im,
  /^policy:/im,
  /^instruction:/im,
  /^you are/i,
  /^act as/i,
  /^role:/im,
];

const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const WHITESPACE_PATTERN = /[ \t]+/g;
const NEWLINE_PATTERN = /\n{3,}/g;
const REPEATED_INSTRUCTION_PATTERN = /^(.+)\n\1$/gm;

function isSystemContent(text: string): boolean {
  return SYSTEM_PATTERNS.some((pattern) => pattern.test(text));
}

function extractCodeBlocks(text: string): { cleaned: string; blocks: string[] } {
  const blocks: string[] = [];
  const cleaned = text.replace(CODE_BLOCK_PATTERN, (match) => {
    blocks.push(match);
    return `__CODE_BLOCK_${blocks.length - 1}__`;
  });
  return { cleaned, blocks };
}

function restoreCodeBlocks(text: string, blocks: string[]): string {
  let result = text;
  for (let i = 0; i < blocks.length; i++) {
    result = result.replace(`__CODE_BLOCK_${i}__`, blocks[i]);
  }
  return result;
}

function removeDuplicateLines(text: string): string {
  const lines = text.split("\n");
  const seen: Set<string> = new Set();
  const unique: string[] = [];
  for (const line of lines) {
    const normalized = line.trim().toLowerCase();
    if (normalized === "" || !seen.has(normalized)) {
      seen.add(normalized);
      unique.push(line);
    }
  }
  return unique.join("\n");
}

function collapseRepeatedInstructions(text: string): string {
  return text.replace(REPEATED_INSTRUCTION_PATTERN, "$1");
}

function normalizeWhitespace(text: string): string {
  let result = text;
  result = result.replace(WHITESPACE_PATTERN, " ");
  result = result.replace(NEWLINE_PATTERN, "\n\n");
  return result.trim();
}

function splitSections(text: string): { system: string; user: string } {
  const lines = text.split("\n");
  const systemLines: string[] = [];
  const userLines: string[] = [];
  let inSystem = false;

  for (const line of lines) {
    if (isSystemContent(line)) {
      inSystem = true;
    }
    if (inSystem) {
      systemLines.push(line);
    } else {
      userLines.push(line);
    }
  }

  return {
    system: systemLines.join("\n"),
    user: userLines.join("\n"),
  };
}

export function compressPrompt(text: string): CompressionResult {
  const originalTokens = estimateTokens(text);
  const techniques: string[] = [];

  const { cleaned, blocks } = extractCodeBlocks(text);

  let compressed = cleaned;

  const deduped = removeDuplicateLines(compressed);
  if (deduped !== compressed) {
    techniques.push("duplicate-line-removal");
    compressed = deduped;
  }

  const collapsed = collapseRepeatedInstructions(compressed);
  if (collapsed !== compressed) {
    techniques.push("repeated-instruction-collapse");
    compressed = collapsed;
  }

  const normalized = normalizeWhitespace(compressed);
  if (normalized !== compressed) {
    techniques.push("whitespace-normalization");
    compressed = normalized;
  }

  compressed = restoreCodeBlocks(compressed, blocks);

  const compressedTokens = estimateTokens(compressed);
  const savingsPercent = originalTokens.total > 0
    ? (originalTokens.total - compressedTokens.total) / originalTokens.total
    : 0;

  const confidence = techniques.length > 0 ? 0.9 : 1.0;

  return {
    compressed,
    originalTokens: originalTokens.total,
    compressedTokens: compressedTokens.total,
    savingsPercent,
    confidence,
    techniques,
  };
}

export function compressWithContext(
  text: string,
  context: { preserveSystem?: boolean; preserveCode?: boolean } = {},
): CompressionResult {
  const { preserveSystem = true, preserveCode = true } = context;

  if (preserveSystem) {
    const { system, user } = splitSections(text);
    if (system && user) {
      const userResult = compressPrompt(user);
      const systemTokens = estimateTokens(system);
      const totalOriginal = systemTokens.total + userResult.originalTokens;
      const totalCompressed = systemTokens.total + userResult.compressedTokens;
      return {
        compressed: `${system}\n\n${userResult.compressed}`,
        originalTokens: totalOriginal,
        compressedTokens: totalCompressed,
        savingsPercent: totalOriginal > 0
          ? (totalOriginal - totalCompressed) / totalOriginal
          : 0,
        confidence: userResult.confidence,
        techniques: userResult.techniques,
      };
    }
  }

  if (preserveCode) {
    return compressPrompt(text);
  }

  const originalTokens = estimateTokens(text);
  const compressed = normalizeWhitespace(text);
  const compressedTokens = estimateTokens(compressed);
  return {
    compressed,
    originalTokens: originalTokens.total,
    compressedTokens: compressedTokens.total,
    savingsPercent: originalTokens.total > 0
      ? (originalTokens.total - compressedTokens.total) / originalTokens.total
      : 0,
    confidence: 0.8,
    techniques: ["whitespace-normalization"],
  };
}

export interface LLMCompressionProvider {
  compress(text: string): Promise<string>;
}

export async function compressWithLLM(
  text: string,
  provider: LLMCompressionProvider,
): Promise<CompressionResult> {
  const originalTokens = estimateTokens(text);
  const compressed = await provider.compress(text);
  const compressedTokens = estimateTokens(compressed);
  return {
    compressed,
    originalTokens: originalTokens.total,
    compressedTokens: compressedTokens.total,
    savingsPercent: originalTokens.total > 0
      ? (originalTokens.total - compressedTokens.total) / originalTokens.total
      : 0,
    confidence: 0.85,
    techniques: ["llm-compression"],
  };
}
