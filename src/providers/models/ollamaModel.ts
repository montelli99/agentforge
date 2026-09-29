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
    const url = `${this.baseUrl}/api/chat`;
    const bodyPayload: Record<string, unknown> = {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      options: { num_predict: options.maxTokens },
      stream: false,
    };

    if (options.responseFormat === "json") {
      bodyPayload.format = "json";
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
      signal: options.signal ?? AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ollama generate error ${res.status}: ${redactRuntimeText(text.slice(0, 200))}`);
    }

    const json = await res.json() as {
      model?: string;
      message?: { content?: string };
      done?: boolean;
      done_reason?: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };
    const promptTokens = json.prompt_eval_count || 0;
    const completionTokens = json.eval_count || 0;

    return {
      id: `ollama-${Date.now()}`,
      model: options.model,
      content: json.message?.content || "",
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCostUsd: 0, // Local compute is $0 external cost
      },
      finishReason: json.done_reason ?? (json.done ? "stop" : undefined),
    };
  }

  async *stream(options: ModelRequestOptions): AsyncIterable<StreamChunk> {
    const url = `${this.baseUrl}/api/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        options: { num_predict: options.maxTokens },
        stream: true,
      }),
      signal: options.signal,
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
        if (!trimmed) continue;
        try {
          const data = JSON.parse(trimmed) as { model?: string; message?: { content?: string }; done?: boolean; done_reason?: string };
          yield { id: `ollama-${Date.now()}`, deltaText: data.message?.content, finishReason: data.done ? (data.done_reason ?? "stop") : undefined };
        } catch {
          // Ignore malformed partial lines; the next chunk completes the JSON.
        }
      }
    }
  }
}
