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
  thinking?: "enabled" | "disabled";
  stop?: string[];
  stream?: boolean;
  signal?: AbortSignal;
}

export interface ModelResponseUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Included in promptTokens; never add these categories to totalTokens again. */
  cachedInputTokens?: number;
  cacheWriteInputTokens?: number;
  estimatedCostUsd?: number;
}

export interface ModelResponse {
  id: string;
  /** Requested route remains in model; this is only what the provider returned, if present. */
  reportedModel?: string;
  model: string;
  content: string;
  toolCalls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  /** Undefined means provider did not report valid token accounting; never infer zero. */
  usage?: ModelResponseUsage;
  finishReason?: string;
}

/** Model identifiers are metadata; reject arbitrary provider text before persistence. */
export function isReportedModelId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value);
}

export interface StreamChunk {
  id: string;
    /** Provider-reported cumulative usage for this request, not a token delta.
     * Missing means unreported; consumers must not assume zero. */
    usage?: ModelResponseUsage;
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
  /** Exact credential-free body sent by generate, when the provider supports request auditing. */
  auditGenerateBody?(options: ModelRequestOptions): string | undefined;
  stream(options: ModelRequestOptions): AsyncIterable<StreamChunk>;
}
export class ModelProviderError extends Error { constructor(message:string, readonly usage?:ModelResponseUsage, readonly responseDigest?:string){super(message);this.name="ModelProviderError";} }
