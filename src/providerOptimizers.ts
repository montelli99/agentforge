export type ProviderOptimizationResult = {
  provider: string;
  optimizedPrompt: string;
  techniques: string[];
  confidence: number;
  estimatedSavingsPercent: number;
};

export interface ProviderOptimizer {
  provider: string;
  optimize(prompt: string, context?: PromptContext): ProviderOptimizationResult;
}

export type PromptContext = {
  taskType?: "code" | "analysis" | "creative" | "qa" | "translation";
  maxTokens?: number;
  hasImages?: boolean;
  hasTools?: boolean;
};

export class AnthropicOptimizer implements ProviderOptimizer {
  provider = "anthropic";

  optimize(prompt: string, context?: PromptContext): ProviderOptimizationResult {
    const techniques: string[] = [];
    let optimized = prompt;

    optimized = this.collapseXmlTags(optimized);
    if (optimized !== prompt) techniques.push("xml-tag-collapse");

    optimized = this.removeRedundantInstructions(optimized);
    if (optimized !== prompt) techniques.push("redundant-instruction-removal");

    optimized = this.optimizeForLongContext(optimized);
    if (optimized !== prompt) techniques.push("long-context-optimization");

    return {
      provider: this.provider,
      optimizedPrompt: optimized,
      techniques,
      confidence: techniques.length > 0 ? 0.85 : 1.0,
      estimatedSavingsPercent: this.estimateSavings(prompt, optimized),
    };
  }

  private collapseXmlTags(text: string): string {
    return text
      .replace(/<([a-zA-Z]+)>\s*<\/\1>/g, "")
      .replace(/<([a-zA-Z]+)>\s*\n\s*<\/\1>/g, "");
  }

  private removeRedundantInstructions(text: string): string {
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

  private optimizeForLongContext(text: string): string {
    if (text.length < 10000) return text;

    const paragraphs = text.split("\n\n");
    if (paragraphs.length > 20) {
      const head = paragraphs.slice(0, 3);
      const tail = paragraphs.slice(-3);
      return [
        ...head,
        `\n... [${paragraphs.length - 6} paragraphs optimized for long context] ...\n`,
        ...tail,
      ].join("\n\n");
    }

    return text;
  }

  private estimateSavings(original: string, optimized: string): number {
    if (original.length === 0) return 0;
    return (original.length - optimized.length) / original.length;
  }
}

export class OpenAIOptimizer implements ProviderOptimizer {
  provider = "openai";

  optimize(prompt: string, context?: PromptContext): ProviderOptimizationResult {
    const techniques: string[] = [];
    let optimized = prompt;

    optimized = this.compressInstructions(optimized);
    if (optimized !== prompt) techniques.push("instruction-compression");

    optimized = this.removeWhitespace(optimized);
    if (optimized !== prompt) techniques.push("whitespace-removal");

    optimized = this.optimizeForGPT(optimized, context);
    if (optimized !== prompt) techniques.push("gpt-optimization");

    return {
      provider: this.provider,
      optimizedPrompt: optimized,
      techniques,
      confidence: techniques.length > 0 ? 0.8 : 1.0,
      estimatedSavingsPercent: this.estimateSavings(prompt, optimized),
    };
  }

  private compressInstructions(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private removeWhitespace(text: string): string {
    return text
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n");
  }

  private optimizeForGPT(text: string, context?: PromptContext): string {
    if (context?.taskType === "code") {
      return text.replace(/```(\w+)?\n/g, "```\n");
    }
    return text;
  }

  private estimateSavings(original: string, optimized: string): number {
    if (original.length === 0) return 0;
    return (original.length - optimized.length) / original.length;
  }
}

export class GeminiOptimizer implements ProviderOptimizer {
  provider = "google";

  optimize(prompt: string, context?: PromptContext): ProviderOptimizationResult {
    const techniques: string[] = [];
    let optimized = prompt;

    optimized = this.structureAsXML(optimized);
    if (optimized !== prompt) techniques.push("xml-structuring");

    optimized = this.removeRedundancy(optimized);
    if (optimized !== prompt) techniques.push("redundancy-removal");

    optimized = this.optimizeForGemini(optimized);
    if (optimized !== prompt) techniques.push("gemini-optimization");

    return {
      provider: this.provider,
      optimizedPrompt: optimized,
      techniques,
      confidence: techniques.length > 0 ? 0.82 : 1.0,
      estimatedSavingsPercent: this.estimateSavings(prompt, optimized),
    };
  }

  private structureAsXML(text: string): string {
    if (text.includes("<") && text.includes(">")) return text;

    const lines = text.split("\n");
    if (lines.length > 5) {
      const structured = lines.map((line) => {
        if (line.startsWith("# ")) return `<title>${line.slice(2)}</title>`;
        if (line.startsWith("## ")) return `<section>${line.slice(3)}</section>`;
        if (line.startsWith("- ")) return `<item>${line.slice(2)}</item>`;
        return `<line>${line}</line>`;
      });
      return structured.join("\n");
    }

    return text;
  }

  private removeRedundancy(text: string): string {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
    const unique: string[] = [];
    const seen: Set<string> = new Set();

    for (const sentence of sentences) {
      const normalized = sentence.trim().toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(sentence.trim());
      }
    }

    return unique.join(". ");
  }

  private optimizeForGemini(text: string): string {
    return text.replace(/\n{3,}/g, "\n\n");
  }

  private estimateSavings(original: string, optimized: string): number {
    if (original.length === 0) return 0;
    return (original.length - optimized.length) / original.length;
  }
}

export class GenericOptimizer implements ProviderOptimizer {
  provider = "generic";

  optimize(prompt: string, context?: PromptContext): ProviderOptimizationResult {
    const techniques: string[] = [];
    let optimized = prompt;

    optimized = this.removeDuplicateLines(optimized);
    if (optimized !== prompt) techniques.push("duplicate-line-removal");

    optimized = this.normalizeWhitespace(optimized);
    if (optimized !== prompt) techniques.push("whitespace-normalization");

    return {
      provider: this.provider,
      optimizedPrompt: optimized,
      techniques,
      confidence: techniques.length > 0 ? 0.75 : 1.0,
      estimatedSavingsPercent: this.estimateSavings(prompt, optimized),
    };
  }

  private removeDuplicateLines(text: string): string {
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

  private normalizeWhitespace(text: string): string {
    return text
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private estimateSavings(original: string, optimized: string): number {
    if (original.length === 0) return 0;
    return (original.length - optimized.length) / original.length;
  }
}

const OPTIMIZER_MAP: Record<string, ProviderOptimizer> = {
  anthropic: new AnthropicOptimizer(),
  openai: new OpenAIOptimizer(),
  google: new GeminiOptimizer(),
  generic: new GenericOptimizer(),
};

export function getProviderOptimizer(provider: string): ProviderOptimizer {
  return OPTIMIZER_MAP[provider] || OPTIMIZER_MAP.generic;
}

export function optimizeForProvider(
  provider: string,
  prompt: string,
  context?: PromptContext,
): ProviderOptimizationResult {
  const optimizer = getProviderOptimizer(provider);
  return optimizer.optimize(prompt, context);
}
