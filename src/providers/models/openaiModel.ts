/**
 * OpenAI / OpenAI-Compatible Generative Model Provider
 * Frontier and cloud model execution (Tier 4) or compatible gateway.
 */

import type {
  GenerativeModelProvider,
  ModelTier,
  ModelRequestOptions,
  ModelResponse,
  StreamChunk,
} from "../../core/providers/model.js";
import { isReportedModelId } from "../../core/providers/model.js";
import { redactRuntimeText } from "../../core/secret/runtimeRedaction.js";

/** Convert internal conversation fields to the Chat Completions wire schema. */
export function chatCompletionMessages(messages: ModelRequestOptions["messages"]) {
  return messages.map(({ toolCalls, toolCallId, ...message }) => ({
    ...message,
    ...(toolCalls ? { tool_calls: toolCalls } : {}),
    ...(toolCallId ? { tool_call_id: toolCallId } : {}),
  }));
}

function toChatCompletionBody(options: ModelRequestOptions, stream: boolean): Record<string, unknown> {
  return {
    model: options.model,
    messages: chatCompletionMessages(options.messages),
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    tools: options.tools,
    tool_choice: options.toolChoice,
    response_format: options.responseFormat === "json" ? { type: "json_object" } : undefined,
    stop: options.stop,
    stream,
  };
}

export function reportedChatCompletionUsage(value: unknown): ModelResponse["usage"] {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const counts = [raw.prompt_tokens, raw.completion_tokens, raw.total_tokens];
  if (counts.some(count => typeof count !== "number" || !Number.isSafeInteger(count) || count < 0)) return undefined;
  const [promptTokens, completionTokens, totalTokens] = counts as number[];
  if (totalTokens !== promptTokens + completionTokens) return undefined;
  const details=raw.prompt_tokens_details;
  if(details!==undefined && (!details || typeof details!=="object" || Array.isArray(details))) return undefined;
  const reported=details as Record<string,unknown>|undefined;
  const cached=reported?.cached_tokens;
  const written=reported?.cache_write_tokens;
  for(const category of [cached,written]) if(category!==undefined && (!Number.isSafeInteger(category) || Number(category)<0 || Number(category)>promptTokens)) return undefined;
  if(Number(cached??0)+Number(written??0)>promptTokens) return undefined;
  return { promptTokens, completionTokens, totalTokens,
    ...(cached===undefined?{}:{cachedInputTokens:Number(cached)}),
    ...(written===undefined?{}:{cacheWriteInputTokens:Number(written)}) };
}

export class OpenAIModelProvider implements GenerativeModelProvider {
  readonly id: string;
  readonly name: string;
  readonly defaultTier: ModelTier = 4;

  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY || "",
    private readonly baseUrl = "https://api.openai.com/v1",
    id = "openai",
    name = "OpenAI Cloud",
  ) {
    this.id = id;
    this.name = name;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async listModels(): Promise<string[]> {
    if (!this.apiKey) return [];
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return ["gpt-4o", "gpt-4o-mini", "o1-preview"];
      const json = await res.json() as { data: Array<{ id: string }> };
      return json.data.map(m => m.id);
    } catch {
      return ["gpt-4o", "gpt-4o-mini"];
    }
  }

  async generate(options: ModelRequestOptions): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: this.auditGenerateBody(options),
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI error ${res.status}: ${redactRuntimeText(text.slice(0, 200))}`);
    }

    const json = await res.json() as {
      id: string;
      model?: string;
      choices: Array<{
        message: {
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason?: string;
      }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return {
      id: json.id,
      model: options.model,
      ...(isReportedModelId(json.model)?{reportedModel:json.model}:{}),
      content: json.choices?.[0]?.message?.content || "",
      toolCalls: json.choices?.[0]?.message?.tool_calls,
      // Missing or inconsistent counts are unknown, never a fabricated zero.
      usage: reportedChatCompletionUsage(json.usage),
      finishReason: json.choices?.[0]?.finish_reason,
    };
  }

  auditGenerateBody(options: ModelRequestOptions): string {
    return JSON.stringify(toChatCompletionBody(options, false));
  }

  async *stream(options: ModelRequestOptions): AsyncIterable<StreamChunk> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(toChatCompletionBody(options, true)),
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000),
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenAI stream error ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const toolIdsByIndex = new Map<number, string>();

    try { while (true) {
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
            const delta = data.choices?.[0]?.delta;
            const toolCalls = delta?.tool_calls?.map((call: {
              index?: number;
              id?: string;
              function?: { name?: string; arguments?: string };
            }, position: number) => {
              const index = call.index ?? position;
              const id = call.id ?? toolIdsByIndex.get(index) ?? `tool-index-${index}`;
              toolIdsByIndex.set(index, id);
              return {
                id,
                type: "function" as const,
                function: {
                  name: call.function?.name,
                  arguments: call.function?.arguments,
                },
              };
            });
            yield {
              id: data.id,
              deltaText: delta?.content,
              toolCalls: toolCalls?.length ? toolCalls : undefined,
              finishReason: data.choices?.[0]?.finish_reason,
            };
          } catch {
            // Ignore parse errors on partial chunks
          }
        }
      }
    } } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}
