/**
 * Tiered Model Router
 * Section 8: Model Architecture (Tier 0 to Tier 4)
 * Deterministic code -> Decision / Jev -> Fast local -> Stronger local -> Frontier cloud.
 */

import type { GenerativeModelProvider, ModelTier } from "../../core/providers/model.js";

export interface ModelRoutingSpec {
  taskComplexity: "simple" | "moderate" | "complex" | "expert";
  requiresToolCalling: boolean;
  requiresStructuredOutput: boolean;
  maxCostUsd?: number;
  forceLocalOnly?: boolean;
}

export interface RouteTarget {
  tier: ModelTier;
  providerId: string;
  model: string;
  reason: string;
}

export class ModelRouter {
  private providers = new Map<string, GenerativeModelProvider>();

  registerProvider(provider: GenerativeModelProvider): void {
    this.providers.set(provider.id, provider);
  }

  async selectTarget(spec: ModelRoutingSpec): Promise<RouteTarget> {
    const hasOllama = this.providers.has("ollama") && await this.providers.get("ollama")!.isAvailable();
    const hasOpenAI = this.providers.has("openai") && await this.providers.get("openai")!.isAvailable();

    // If strictly simple and local is available -> Tier 2 (fast local)
    if (spec.taskComplexity === "simple" && hasOllama) {
      return {
        tier: 2,
        providerId: "ollama",
        model: "qwen2.5:3b",
        reason: "Simple task routed to fast local Tier 2 model for zero marginal cost",
      };
    }

    // If moderate complexity and local is available -> Tier 3 (strong local)
    if (spec.taskComplexity === "moderate" && hasOllama) {
      return {
        tier: 3,
        providerId: "ollama",
        model: "llama3.1:8b",
        reason: "Moderate complexity routed to stronger local Tier 3 model",
      };
    }

    // If complex/expert or requires advanced tools/cloud -> Tier 4
    if (hasOpenAI && !spec.forceLocalOnly) {
      return {
        tier: 4,
        providerId: "openai",
        model: spec.taskComplexity === "expert" ? "gpt-4o" : "gpt-4o-mini",
        reason: `Routed to Tier 4 frontier model based on complexity=${spec.taskComplexity}`,
      };
    }

    // Fallback to local if available
    if (hasOllama) {
      return {
        tier: 3,
        providerId: "ollama",
        model: "llama3.1:8b",
        reason: "Fallback to available local model",
      };
    }

    // Default target
    return {
      tier: 4,
      providerId: "openai",
      model: spec.taskComplexity === "expert" ? "gpt-4o" : "gpt-4o-mini",
      reason: "Default configuration target",
    };
  }
}
