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
  requiresVision?: boolean;
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
    const ollama = this.providers.get("ollama");
    const localTaskCapabilitiesUnverified = spec.requiresVision === true
      || spec.requiresToolCalling
      || spec.requiresStructuredOutput;
    const hasOllama = !localTaskCapabilitiesUnverified && !!ollama && await ollama.isAvailable();
    const ollamaModels = hasOllama ? await ollama.listModels().catch(() => []) : [];
    const selectLocalModel = (preferred: string): string | undefined =>
      ollamaModels.find(model => model === preferred) ?? ollamaModels[0];
    const hasOpenAI = this.providers.has("openai") && await this.providers.get("openai")!.isAvailable();
    const hasMiMo = this.providers.has("mimo") && await this.providers.get("mimo")!.isAvailable();

    // Route local work only to a model actually discovered on the local daemon.
    const simpleLocalModel = selectLocalModel("qwen2.5:3b");
    const moderateLocalModel = selectLocalModel("llama3.1:8b");
    if (spec.taskComplexity === "simple" && simpleLocalModel) {
      return {
        tier: 2,
        providerId: "ollama",
        model: simpleLocalModel,
        reason: "Simple task routed to a discovered local model; no external API cost",
      };
    }

    if (spec.taskComplexity === "moderate" && moderateLocalModel) {
      return {
        tier: 3,
        providerId: "ollama",
        model: moderateLocalModel,
        reason: "Moderate task routed to a discovered local model; no external API cost",
      };
    }

    if (spec.forceLocalOnly && !simpleLocalModel && !moderateLocalModel) {
      throw new Error("Local-only routing requested, but no suitable discovered local model is available for this task.");
    }

    // Complex/expert: prefer MiMo if available (cost-effective frontier)
    if (hasMiMo && !spec.forceLocalOnly) {
      const needsVision = spec.requiresVision === true;
      const model = needsVision ? "mimo-v2.5" : "mimo-v2.5-pro";
      return {
        tier: 4,
        providerId: "mimo",
        model,
        reason: `Routed to MiMo ${model} at Tier 4 (vision=${needsVision})`,
      };
    }

    // Fallback to OpenAI if available
    if (hasOpenAI && !spec.forceLocalOnly) {
      return {
        tier: 4,
        providerId: "openai",
        model: spec.taskComplexity === "expert" ? "gpt-4o" : "gpt-4o-mini",
        reason: `Routed to Tier 4 frontier model based on complexity=${spec.taskComplexity}`,
      };
    }

    // Fallback to local if available
    if (moderateLocalModel || simpleLocalModel) {
      return {
        tier: 3,
        providerId: "ollama",
        model: moderateLocalModel ?? simpleLocalModel!,
        reason: "Fallback to a discovered local model; no external API cost",
      };
    }

    // If the caller registered only a local provider, preserve that explicit
    // deployment choice even when discovery is temporarily unavailable. The
    // runtime will surface the availability error instead of silently routing
    // to an unregistered cloud provider.
    if (ollama && !hasOpenAI && !hasMiMo) {
      return {
        tier: 2,
        providerId: "ollama",
        model: "qwen2.5:3b",
        reason: "Only the local provider is registered; preserve the explicit local route for runtime diagnostics",
      };
    }

    // Default target
    return {
      tier: 4,
      providerId: hasMiMo ? "mimo" : "openai",
      model: hasMiMo ? "mimo-v2.5-pro" : (spec.taskComplexity === "expert" ? "gpt-4o" : "gpt-4o-mini"),
      reason: "Default configuration target",
    };
  }
}
