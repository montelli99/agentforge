/**
 * Xiaomi MiMo Generative Model Provider
 * Token Plan / Pay-as-you-go via OpenAI-compatible protocol.
 *
 * Capabilities declared per model:
 *   mimo-v2.5:     text, vision/image, tool calling, structured output, reasoning
 *   mimo-v2.5-pro: text, coding/reasoning, tool calling, structured output (NO vision)
 */

import type {
  GenerativeModelProvider,
  ModelTier,
  ModelRequestOptions,
  ModelResponse,
  StreamChunk,
} from "../../core/providers/model.js";
import { redactRuntimeText } from "../../core/secret/runtimeRedaction.js";

export type MiMoCapability =
  | "text"
  | "vision"
  | "tool_calling"
  | "structured_output"
  | "reasoning"
  | "coding";

export interface MiMoModelDescriptor {
  id: string;
  displayName: string;
  capabilities: MiMoCapability[];
  contextWindow: number;
  maxOutput: number;
  costPerMillionPrompt: number;
  costPerMillionCompletion: number;
}

export const MIMO_MODEL_REGISTRY: Record<string, MiMoModelDescriptor> = {
  "mimo-v2.5": {
    id: "mimo-v2.5",
    displayName: "MiMo V2.5",
    capabilities: ["text", "vision", "tool_calling", "structured_output", "reasoning"],
    contextWindow: 1_048_576,
    maxOutput: 131_072,
    costPerMillionPrompt: 0,
    costPerMillionCompletion: 0,
  },
  "mimo-v2.5-pro": {
    id: "mimo-v2.5-pro",
    displayName: "MiMo V2.5 Pro",
    capabilities: ["text", "coding", "tool_calling", "structured_output", "reasoning"],
    contextWindow: 1_048_576,
    maxOutput: 131_072,
    costPerMillionPrompt: 0,
    costPerMillionCompletion: 0,
  },
};

const KNOWN_MODEL_IDS = Object.keys(MIMO_MODEL_REGISTRY);

export class MiMoModelProvider implements GenerativeModelProvider {
  readonly id = "mimo";
  readonly name: string;
  readonly defaultTier: ModelTier = 4;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    apiKey?: string,
    baseUrl?: string,
    name = "Xiaomi MiMo",
  ) {
    this.apiKey = apiKey || process.env.MIMO_API_KEY || "";
    this.baseUrl = baseUrl || "https://token-plan-sgp.xiaomimimo.com/v1";
    this.name = name;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  getDescriptor(modelId: string): MiMoModelDescriptor | undefined {
    return MIMO_MODEL_REGISTRY[modelId];
  }

  hasCapability(modelId: string, cap: MiMoCapability): boolean {
    const desc = MIMO_MODEL_REGISTRY[modelId];
    return desc ? desc.capabilities.includes(cap) : false;
  }

  async listModels(): Promise<string[]> {
    if (!this.apiKey) return [];
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [...KNOWN_MODEL_IDS];
      const json = await res.json() as { data: Array<{ id: string }> };
      return json.data.map(m => m.id);
    } catch {
      return [...KNOWN_MODEL_IDS];
    }
  }

  async generate(options: ModelRequestOptions): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error("MiMo API key not configured (set MIMO_API_KEY env var)");
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        tools: options.tools,
        tool_choice: options.toolChoice,
        stream: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`MiMo error ${res.status}: ${redactRuntimeText(text.slice(0, 300))}`);
    }

    const json = await res.json() as {
      id: string;
      choices: Array<{
        message: {
          content: string;
          tool_calls?: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason?: string;
      }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    const choice = json.choices?.[0];
    return {
      id: json.id,
      model: options.model,
      content: choice?.message?.content || "",
      toolCalls: choice?.message?.tool_calls,
      usage: {
        promptTokens: json.usage?.prompt_tokens || 0,
        completionTokens: json.usage?.completion_tokens || 0,
        totalTokens: json.usage?.total_tokens || 0,
      },
      finishReason: choice?.finish_reason,
    };
  }

  async *stream(options: ModelRequestOptions): AsyncIterable<StreamChunk> {
    if (!this.apiKey) {
      throw new Error("MiMo API key not configured (set MIMO_API_KEY env var)");
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok || !res.body) {
      throw new Error(`MiMo stream error ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            yield {
              id: data.id,
              deltaText: data.choices?.[0]?.delta?.content,
              finishReason: data.choices?.[0]?.finish_reason,
            };
          } catch {
            // Ignore parse errors on partial SSE chunks
          }
        }
      }
    }
  }
}
