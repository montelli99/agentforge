/**
 * GenerativeModelProvider Interface
 * Section 8: Model Architecture
 * Clean typed abstraction for generative LLM providers.
 */

export type ModelTier = 0 | 1 | 2 | 3 | 4;

export interface ModelMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export interface ModelRequestOptions {
  model: string;
  messages: ModelMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: unknown[];
  toolChoice?: unknown;
  responseFormat?: "json";
  stop?: string[];
  stream?: boolean;
  signal?: AbortSignal;
}

export interface ModelResponseUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number;
}

export interface ModelResponse {
  id: string;
  model: string;
  content: string;
  toolCalls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  usage: ModelResponseUsage;
  finishReason?: string;
}

export interface StreamChunk {
  id: string;
  deltaText?: string;
  toolCalls?: Array<{
    id: string;
    type: "function";
    function: { name?: string; arguments?: string };
  }>;
  finishReason?: string;
}

export interface GenerativeModelProvider {
  readonly id: string;
  readonly name: string;
  readonly defaultTier: ModelTier;

  isAvailable(): Promise<boolean>;
  listModels(): Promise<string[]>;
  generate(options: ModelRequestOptions): Promise<ModelResponse>;
  stream(options: ModelRequestOptions): AsyncIterable<StreamChunk>;
}
