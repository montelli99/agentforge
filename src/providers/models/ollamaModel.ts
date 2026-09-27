/**
 * Ollama Generative Model Provider
 * Fast/strong local model execution (Tier 2 and Tier 3).
 */

import type {
  GenerativeModelProvider,
  ModelTier,
  ModelRequestOptions,
  ModelResponse,
  StreamChunk,
} from "../../core/providers/model.js";
import { redactRuntimeText } from "../../core/secret/runtimeRedaction.js";

export class OllamaModelProvider implements GenerativeModelProvider {
  readonly id = "ollama";
  readonly name = "Ollama Local Models";
  readonly defaultTier: ModelTier = 2;

  constructor(private readonly baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434") {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/version`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return [];
      const json = await res.json() as { models: Array<{ name: string }> };
      return json.models.map(m => m.name);
    } catch {
      return [];
    }
  }

  async generate(options: ModelRequestOptions): Promise<ModelResponse> {
    const url = `${this.baseUrl}/v1/chat/completions`;
    const timeoutMs = 30000;
    const bodyPayload: Record<string, unknown> = {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: false,
    };

    if (options.responseFormat === "json") {
      bodyPayload.format = "json";
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ollama generate error ${res.status}: ${redactRuntimeText(text.slice(0, 200))}`);
    }

    const json = await res.json() as {
      id?: string;
      choices: Array<{ message: { content: string }; finish_reason?: string }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return {
      id: json.id || `ollama-${Date.now()}`,
      model: options.model,
      content: json.choices?.[0]?.message?.content || "",
      usage: {
        promptTokens: json.usage?.prompt_tokens || 0,
        completionTokens: json.usage?.completion_tokens || 0,
        totalTokens: json.usage?.total_tokens || 0,
        estimatedCostUsd: 0, // Local compute is $0 external cost
      },
      finishReason: json.choices?.[0]?.finish_reason,
    };
  }

  async *stream(options: ModelRequestOptions): AsyncIterable<StreamChunk> {
    const url = `${this.baseUrl}/v1/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama stream error ${res.status}`);
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
            // Ignore parse errors on partial chunks
          }
        }
      }
    }
  }
}
