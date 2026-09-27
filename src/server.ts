import http from "node:http";
import https from "node:https";
import httpImport from "node:http";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { createOptimizer } from "./optimizer.js";
import { aggregateTelemetry } from "./telemetry.js";
import { getCostLedger } from "./costLedger.js";
import { PROVIDER_READINESS_REGISTRY } from "./core/types/providerReadiness.js";
import { globalStore } from "./core/store/workspaceStore.js";
import { estimateTokens } from "./tokenAccounting.js";
import type { OptimizationConfig } from "./optimization-types.js";
import type { CanonicalEnvelope } from "./types.js";
import { getSemanticMatchCount, getMemoryRetrievalCount } from "./semanticMemory.js";

const ENV_FILE = path.join(process.cwd(), ".env");

function readEnvFile(): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(ENV_FILE)) return result;
  const content = fs.readFileSync(ENV_FILE, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function writeEnvFile(settings: Record<string, string>): void {
  const lines: string[] = [];
  lines.push("# AgentForge Server Configuration");
  lines.push("");
  lines.push("# Provider: openai, ollama");
  lines.push(`AGENTFORGE_PROVIDER=${settings.AGENTFORGE_PROVIDER || "openai"}`);
  lines.push("");
  lines.push("# OpenAI API key (required when provider=openai)");
  lines.push(`OPENAI_API_KEY=${settings.OPENAI_API_KEY || ""}`);
  lines.push("");
  lines.push("# Ollama configuration (required when provider=ollama)");
  lines.push(`OLLAMA_BASE_URL=${settings.OLLAMA_BASE_URL || "http://localhost:11434"}`);
  lines.push(`OLLAMA_API_KEY=${settings.OLLAMA_API_KEY || ""}`);
  lines.push("");
  lines.push("# Xiaomi MiMo configuration (required when provider=mimo)");
  lines.push(`MIMO_API_KEY=${settings.MIMO_API_KEY || ""}`);
  lines.push(`MIMO_BASE_URL=${settings.MIMO_BASE_URL || "https://token-plan-sgp.xiaomimimo.com/v1"}`);
  lines.push("");
  lines.push("# Model name");
  lines.push(`AGENTFORGE_MODEL=${settings.AGENTFORGE_MODEL || "gpt-4o-mini"}`);
  lines.push("");
  lines.push("# Server port");
  lines.push(`AGENTFORGE_PORT=${settings.AGENTFORGE_PORT || "3460"}`);
  lines.push("");
  lines.push("# Optimization (true/false)");
  lines.push(`AGENTFORGE_OPTIMIZATION=${settings.AGENTFORGE_OPTIMIZATION || "true"}`);
  lines.push("");
  lines.push("# Metadata in responses (true/false)");
  lines.push(`AGENTFORGE_METADATA=${settings.AGENTFORGE_METADATA || "true"}`);
  lines.push("");
  fs.writeFileSync(ENV_FILE, lines.join("\n"), "utf-8");
}

// Load .env file into process.env before reading config
const envFromDisk = readEnvFile();
for (const [key, value] of Object.entries(envFromDisk)) {
  if (!process.env[key]) process.env[key] = value;
}

const PORT = parseInt(process.env.AGENTFORGE_PORT || "3460", 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const PROVIDER = process.env.AGENTFORGE_PROVIDER || "openai";
const MODEL = process.env.AGENTFORGE_MODEL || "gpt-4o-mini";
const OPTIMIZATION_ENABLED = process.env.AGENTFORGE_OPTIMIZATION !== "false";
const METADATA_ENABLED = process.env.AGENTFORGE_METADATA !== "false";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";
const MIMO_API_KEY = process.env.MIMO_API_KEY || "";
const MIMO_BASE_URL = process.env.MIMO_BASE_URL || "https://token-plan-sgp.xiaomimimo.com/v1";
const EMBEDDING_PROVIDER = process.env.AGENTFORGE_EMBEDDING_PROVIDER || "ollama";
const EMBEDDING_MODEL = process.env.AGENTFORGE_EMBEDDING_MODEL || "nomic-embed-text";
const EMBEDDING_BASE_URL = process.env.AGENTFORGE_EMBEDDING_BASE_URL || OLLAMA_BASE_URL;
const KEEP_WARM_ENABLED = process.env.OLLAMA_KEEP_WARM === "true";
const KEEP_WARM_MODELS = (process.env.OLLAMA_KEEP_WARM_MODELS || "gemma4:e4b,llama3.1:8b")
  .split(",").map(s => s.trim()).filter(Boolean);
const KEEP_WARM_INTERVAL_MS = parseInt(process.env.OLLAMA_KEEP_WARM_INTERVAL_MS || "240000", 10);
const VERSION = "0.1.0";
const BUILD_DATE = new Date().toISOString();

const optimizer = createOptimizer({
  enabled: OPTIMIZATION_ENABLED,
  semanticCache: true,
  exactCache: true,
  promptCompression: true,
  contextDeduplication: true,
  // OpenClaw owns model selection/fallbacks. AgentForge should optimize the
  // prompt, not silently reroute requests to providers without configured keys.
  costAwareRouting: false,
  providerFailover: false,
  respectRequestedModel: true,
  semanticMemory: true,
  memoryBypass: true,
  largeContextElimination: true,
  providerOptimization: true,
  costLedger: true,
});

const ledger = getCostLedger();
const telemetryHistory: import("./optimization-types.js").OptimizationTelemetry[] = [];
const sseClients: Set<http.ServerResponse> = new Set();

type RequestLog = {
  timestamp: string;
  requestId: string;
  model: string;
  baselineTokens: number;
  optimizedTokens: number;
  tokensPrevented: number;
  reductionPercent: number;
  providerCalled: boolean;
  bypass: boolean;
  optimizationType: string;
  latencyMs: number;
  error: string | null;
  source: string;
  channel: string;
  project: string;
  session: string;
};

const requestLog: RequestLog[] = [];
const MAX_LOG_ENTRIES = 10000;

type TopSavingsEvent = {
  timestamp: string;
  requestId: string;
  model: string;
  type: string;
  beforeTokens: number;
  afterTokens: number;
  savedTokens: number;
  description: string;
};

type HourlyBucket = {
  hour: string;
  seen: number;
  prevented: number;
};

type DashboardMetrics = {
  requests: number;
  providerCallsAvoided: number;
  tokensPrevented: number;
  tokensSeen: number;
  estimatedCostSaved: number;
  averageReductionPercent: number;
  memoryBypassHits: number;
  contextEliminationHits: number;
  cacheHits: number;
  compressionSavings: number;
  repoContextSavings: number;
  conversationSavings: number;
  ragSavings: number;
  lastHourRequests: number;
  lastHourTokensPrevented: number;
  latestRequests: RequestLog[];
  topSavingsEvents: TopSavingsEvent[];
  hourlyData: HourlyBucket[];
  optimizationStatus: {
    providerActive: boolean;
    embeddingsActive: boolean;
    memoryBypassActive: boolean;
    currentCapability: string;
    blockers: string[];
    embeddingProvider?: string;
    embeddingModel?: string;
    embeddingDimension?: number;
    semanticMatches?: number;
    memoryRetrievals?: number;
  };
};

function getWarnings(): string[] {
  const w: string[] = [];
  if (!OPENAI_API_KEY && PROVIDER !== "ollama") w.push("Provider API key not configured");
  if (!OPTIMIZATION_ENABLED) w.push("Optimization is disabled");
  if (!METADATA_ENABLED) w.push("Metadata responses are disabled");
  return w;
}

let embeddingProviderStatus: { active: boolean; provider: string; model: string; mode: string; dimension: number } = {
  active: false,
  provider: "none",
  model: "none",
  mode: "hash-fallback",
  dimension: 0,
};
let memoryBypassEnabled = false;

export function setEmbeddingProviderStatus(status: typeof embeddingProviderStatus): void {
  embeddingProviderStatus = status;
}

export function setMemoryBypassEnabled(enabled: boolean): void {
  memoryBypassEnabled = enabled;
}

function getOptimizationStatus(): DashboardMetrics["optimizationStatus"] {
  const providerActive = !!(OPENAI_API_KEY || PROVIDER === "ollama" || (PROVIDER === "mimo" && MIMO_API_KEY));
  const embeddingsActive = embeddingProviderStatus.active && embeddingProviderStatus.mode === "real";
  const memBypassActive = memoryBypassEnabled && embeddingsActive;
  const blockers: string[] = [];
  if (!providerActive) blockers.push("No provider API key configured");
  if (!embeddingsActive) blockers.push("Embeddings in hash-fallback mode");
  if (!memBypassActive) blockers.push("Memory bypass requires real embeddings");

  let capability = "Basic Fingerprinting";
  if (providerActive) capability = "Provider Forwarding + Fingerprinting";
  if (embeddingsActive) capability = "Semantic Caching + Fingerprinting";
  if (memBypassActive) capability = "Memory Bypass + Semantic Caching";
  if (embeddingsActive && providerActive) capability = "Full Optimization Pipeline";

  return {
    providerActive,
    embeddingsActive,
    memoryBypassActive: memBypassActive,
    currentCapability: capability,
    blockers,
    embeddingProvider: embeddingProviderStatus.provider,
    embeddingModel: embeddingProviderStatus.model,
    embeddingDimension: embeddingProviderStatus.dimension || undefined,
    semanticMatches: getSemanticMatchCount(),
    memoryRetrievals: getMemoryRetrievalCount(),
  };
}

function collectMetrics(): DashboardMetrics {
  const agg = aggregateTelemetry(telemetryHistory);
  const compressionSavings = telemetryHistory.reduce(
    (s, t) => s + Math.max(0, t.originalTokens.total - t.optimizedTokens.total),
    0,
  );
  const tokensPrevented = compressionSavings + agg.memoryBypassTokensSaved + agg.largeContextTokensSaved;
  const tokensSeen = requestLog.reduce((s, r) => s + r.baselineTokens, 0);
  const estimatedCostSaved = agg.memoryBypassCostSavedUsd +
    (agg.totalCostBefore - agg.totalCostAfter);

  const oneHourAgo = Date.now() - 3600000;
  const lastHour = requestLog.filter(r => new Date(r.timestamp).getTime() > oneHourAgo);

  const topEvents: TopSavingsEvent[] = requestLog
    .filter(r => r.tokensPrevented > 0)
    .sort((a, b) => b.tokensPrevented - a.tokensPrevented)
    .slice(0, 5)
    .map(r => ({
      timestamp: r.timestamp,
      requestId: r.requestId,
      model: r.model,
      type: r.optimizationType,
      beforeTokens: r.baselineTokens,
      afterTokens: r.optimizedTokens,
      savedTokens: r.tokensPrevented,
      description: r.bypass ? "Memory bypass returned cached response" : "Context eliminated from prompt",
    }));

  const hourlyBuckets: HourlyBucket[] = [];
  for (let i = 23; i >= 0; i--) {
    const hourStart = new Date();
    hourStart.setHours(hourStart.getHours() - i, 0, 0, 0);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);
    const hourLabel = hourStart.toISOString().slice(11, 13) + ":00";
    const hourReqs = requestLog.filter(r => {
      const t = new Date(r.timestamp).getTime();
      return t >= hourStart.getTime() && t < hourEnd.getTime();
    });
    hourlyBuckets.push({
      hour: hourLabel,
      seen: hourReqs.reduce((s, r) => s + r.baselineTokens, 0),
      prevented: hourReqs.reduce((s, r) => s + r.tokensPrevented, 0),
    });
  }

  return {
    requests: telemetryHistory.length,
    providerCallsAvoided: agg.providerCallsAvoided,
    tokensPrevented,
    tokensSeen,
    estimatedCostSaved,
    averageReductionPercent: agg.totalSavingsPercent * 100,
    memoryBypassHits: agg.memoryBypassesApplied,
    contextEliminationHits: agg.largeContextsEliminated,
    cacheHits: agg.cacheHits,
    compressionSavings: agg.compressionsApplied,
    repoContextSavings: agg.largeContextTokensSaved,
    conversationSavings: 0,
    ragSavings: 0,
    lastHourRequests: lastHour.length,
    lastHourTokensPrevented: lastHour.reduce((s, r) => s + r.tokensPrevented, 0),
    latestRequests: requestLog.slice(-50).reverse(),
    topSavingsEvents: topEvents,
    hourlyData: hourlyBuckets,
    optimizationStatus: getOptimizationStatus(),
  };
}

function logRequestEntry(entry: RequestLog): void {
  requestLog.push(entry);
  if (requestLog.length > MAX_LOG_ENTRIES) {
    requestLog.splice(0, requestLog.length - MAX_LOG_ENTRIES);
  }
  const ts = new Date().toISOString();
  console.log(
    `[${ts}] ${entry.requestId} model=${entry.model} ` +
    `baseline=${entry.baselineTokens} optimized=${entry.optimizedTokens} ` +
    `prevented=${entry.tokensPrevented} provider=${entry.providerCalled ? "yes" : "no"} ` +
    `bypass=${entry.bypass ? "yes" : "no"} latency=${entry.latencyMs}ms`
  );
  broadcastSSE(entry);
}

function broadcastSSE(entry: RequestLog): void {
  const data = JSON.stringify(entry);
  for (const client of sseClients) {
    client.write(`data: ${data}\n\n`);
  }
}

function buildOpenAIResponse(params: {
  content: string;
  model: string;
  toolCalls?: unknown[];
  agentforge?: Record<string, unknown>;
}): Record<string, unknown> {
  const message: Record<string, unknown> = {
    role: "assistant",
    content: params.content,
  };
  if (params.toolCalls && params.toolCalls.length > 0) {
    message.tool_calls = params.toolCalls;
  }
  const response: Record<string, unknown> = {
    id: `chatcmpl-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: params.model,
    choices: [
      {
        index: 0,
        message,
        finish_reason: params.toolCalls && params.toolCalls.length > 0 ? "tool_calls" : "stop",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };

  if (METADATA_ENABLED && params.agentforge) {
    response.agentforge = params.agentforge;
  }

  return response;
}

function extractMessages(body: Record<string, unknown>): string {
  const messages = body.messages as Array<{ role: string; content: string }> | undefined;
  if (!messages || !Array.isArray(messages)) return "";
  return messages.map(m => m.content).join("\n");
}

function buildEnvelope(prompt: string, model: string, provider: string): CanonicalEnvelope {
  return {
    runId: crypto.randomUUID(),
    runtimeId: "openclaw",
    transport: "public-ingress",
    trustTier: "T2",
    sideEffecting: false,
    model: { provider, model },
    request: { prompt },
    policy: { tenantId: "default" },
    reflection: { preflight: "approve", postResult: "approve" },
  };
}

async function forwardToProvider(params: {
  prompt: string;
  model: string;
  provider: string;
  apiKey: string;
  originalBody: Record<string, unknown>;
}): Promise<{ content: string; toolCalls?: unknown[]; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  // Auto-detect provider from model name if the configured provider doesn't match.
  // e.g., "openrouter/..." models should go to OpenRouter, "ollama/..." to Ollama,
  // "minimax/..." or "MiniMax-M3" to MiniMax.
  let effectiveProvider = params.provider;
  if (params.model.includes("/")) {
    const prefix = params.model.split("/")[0].toLowerCase();
    if (prefix === "openrouter" || prefix === "openai" || prefix === "groq" || prefix === "anthropic" || prefix === "minimax") {
      effectiveProvider = prefix;
    }
  } else if (/^minimax[-/]?/i.test(params.model) || params.model.toLowerCase().includes("minimax")) {
    effectiveProvider = "minimax";
  }
  const isOllama = effectiveProvider === "ollama";

  if (isOllama) {
    const url = new URL(`${OLLAMA_BASE_URL}/v1/chat/completions`);
    const body = JSON.stringify({ ...params.originalBody, model: params.model });
    return new Promise((resolve, reject) => {
      const req = httpImport.request(
        {
          hostname: url.hostname,
          port: url.port || 11434,
          path: url.pathname,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(params.apiKey ? { Authorization: `Bearer ${params.apiKey}` } : {}),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              const message = choice?.message;
              resolve({
                content: typeof message?.content === "string" ? message.content : "",
                toolCalls: Array.isArray(message?.tool_calls) ? message.tool_calls : undefined,
                usage: parsed.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              });
            } catch {
              reject(new Error(`Ollama response parse error: ${data.slice(0, 200)}`));
            }
          });
        },
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  if (!params.apiKey) {
    return {
      content: "[AgentForge] No provider API key configured. Optimization ran but response is simulated.",
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  // OpenRouter: use their API endpoint
  if (effectiveProvider === "openrouter") {
    const openrouterKey = OPENROUTER_API_KEY || params.apiKey;
    if (!openrouterKey) {
      return {
        content: "[AgentForge] OpenRouter API key not configured. Set OPENROUTER_API_KEY.",
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    }
    const body = JSON.stringify({ ...params.originalBody, model: params.model });
    const url = new URL("https://openrouter.ai/api/v1/chat/completions");
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: url.hostname,
          port: 443,
          path: url.pathname,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://openclaw.ai",
            "X-Title": "AgentForge",
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              const message = choice?.message;
              resolve({
                content: typeof message?.content === "string" ? message.content : "",
                toolCalls: Array.isArray(message?.tool_calls) ? message.tool_calls : undefined,
                usage: parsed.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              });
            } catch {
              reject(new Error(`OpenRouter response parse error: ${data.slice(0, 200)}`));
            }
          });
        },
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  // OpenAI: use their API endpoint
  if (effectiveProvider === "openai") {
    const body = JSON.stringify({ ...params.originalBody, model: params.model });
    const url = new URL("https://api.openai.com/v1/chat/completions");
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: url.hostname,
          port: 443,
          path: url.pathname,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${params.apiKey}`,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              const message = choice?.message;
              resolve({
                content: typeof message?.content === "string" ? message.content : "",
                toolCalls: Array.isArray(message?.tool_calls) ? message.tool_calls : undefined,
                usage: parsed.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              });
            } catch {
              reject(new Error(`Provider response parse error: ${data.slice(0, 200)}`));
            }
          });
        },
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  // MiniMax: use their OpenAI-compatible endpoint at https://api.minimax.io/v1
  if (effectiveProvider === "minimax") {
    const minimaxKey = process.env.MINIMAX_API_KEY || params.apiKey;
    if (!minimaxKey) {
      return {
        content: "[AgentForge] MiniMax API key not configured. Set MINIMAX_API_KEY.",
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    }
    // Strip "minimax/" prefix for the API call — MiniMax uses bare model ids.
    const bareModel = params.model.replace(/^minimax\//i, "");
    const body = JSON.stringify({ ...params.originalBody, model: bareModel });
    const url = new URL("https://api.minimax.io/v1/chat/completions");
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: url.hostname,
          port: 443,
          path: url.pathname,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${minimaxKey}`,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              const message = choice?.message;
              resolve({
                content: typeof message?.content === "string" ? message.content : "",
                toolCalls: Array.isArray(message?.tool_calls) ? message.tool_calls : undefined,
                usage: parsed.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              });
            } catch {
              reject(new Error(`MiniMax response parse error: ${data.slice(0, 200)}`));
            }
          });
        },
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  // Fallback: return simulated response for unsupported providers
  return {
    content: `[AgentForge] Provider "${effectiveProvider}" not implemented yet. Model: ${params.model}`,
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

async function handleChatCompletions(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  let error: string | null = null;

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Invalid JSON", type: "invalid_request_error" } }));
    return;
  }

  const prompt = extractMessages(body);
  const requestedModel = (body.model as string) || MODEL;
  // Auto-detect provider from model name prefix (e.g., "openrouter/..." -> "openrouter")
  let provider = PROVIDER;
  if (requestedModel.includes("/")) {
    const prefix = requestedModel.split("/")[0].toLowerCase();
    if (["openrouter", "ollama", "openai", "groq", "anthropic", "minimax"].includes(prefix)) {
      provider = prefix;
    }
  } else if (/^MiniMax-/i.test(requestedModel)) {
    provider = "minimax";
  }

  // Extract source headers from OpenClaw
  const source = (req.headers["x-agentforge-source"] as string) || "unknown";
  const channel = (req.headers["x-agentforge-channel"] as string) || "unknown";
  const project = (req.headers["x-agentforge-project"] as string) || "unknown";
  const session = (req.headers["x-agentforge-session"] as string) || "unknown";

  const envelope = buildEnvelope(prompt, requestedModel, provider);
  const result = await optimizer.optimize(envelope, {
    runtime: "openclaw",
    transport: "public-ingress",
    model: { provider, model: requestedModel },
    payload: body,
    headers: {},
  });

  telemetryHistory.push(result.telemetry);

  const baselineTokens = result.telemetry.originalTokens.total;
  const optimizedTokens = result.telemetry.optimizedTokens.total;
  const compressionSavings = Math.max(0, baselineTokens - optimizedTokens);
  const tokensPrevented = compressionSavings + result.telemetry.memoryBypassTokensSaved + result.telemetry.largeContextTokensSaved;
  const reductionPercent = baselineTokens > 0 ? ((baselineTokens - optimizedTokens) / baselineTokens) * 100 : 0;
  const providerCallSkipped = result.telemetry.providerCallsAvoided > 0;

  const agentforgeMeta = {
    tokensPrevented,
    estimatedCostSaved:
      result.telemetry.memoryBypassCostSavedUsd +
      (result.telemetry.estimatedCostBefore.totalCostUsd - result.telemetry.estimatedCostAfter.totalCostUsd),
    providerCallSkipped,
    optimizationReasons: result.notes,
  };

  if (providerCallSkipped) {
    const bypassAnswer = result.envelope.request.optimizedPrompt as string || result.envelope.request.prompt as string;
    const response = buildOpenAIResponse({
      content: bypassAnswer,
      model: requestedModel,
      agentforge: agentforgeMeta,
    });
    const latencyMs = Date.now() - startTime;
    logRequestEntry({
      timestamp: new Date().toISOString(),
      requestId,
      model: requestedModel,
      baselineTokens,
      optimizedTokens,
      tokensPrevented,
      reductionPercent,
      providerCalled: false,
      bypass: true,
      optimizationType: result.notes[0] || "memory_bypass",
      latencyMs,
      error: null,
      source,
      channel,
      project,
      session,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
    return;
  }

  if (!OPENAI_API_KEY && provider !== "ollama" && provider !== "minimax" && provider !== "mimo") {
    const latencyMs = Date.now() - startTime;
    error = "Provider API key not configured";
    logRequestEntry({
      timestamp: new Date().toISOString(),
      requestId,
      model: requestedModel,
      baselineTokens,
      optimizedTokens,
      tokensPrevented,
      reductionPercent,
      providerCalled: false,
      bypass: false,
      optimizationType: result.notes[0] || "none",
      latencyMs,
      error,
      source,
      channel,
      project,
      session,
    });
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: {
        message: "Provider API key not configured. Set OPENAI_API_KEY to enable provider forwarding.",
        type: "server_error",
        code: "provider_key_missing",
      },
    }));
    return;
  }

  try {
    const optimizedPrompt = (result.envelope.request as Record<string, unknown>).optimizedPrompt as string || prompt;
    const providerResult = await forwardToProvider({
      prompt: optimizedPrompt,
      model: result.envelope.model.model,
      provider: result.envelope.model.provider,
      apiKey: OPENAI_API_KEY || OLLAMA_API_KEY,
      originalBody: body,
    });

    const response = buildOpenAIResponse({
      content: providerResult.content,
      toolCalls: providerResult.toolCalls,
      model: requestedModel,
      agentforge: {
        ...agentforgeMeta,
        actualInputTokens: providerResult.usage.prompt_tokens,
        actualOutputTokens: providerResult.usage.completion_tokens,
      },
    });
    const latencyMs = Date.now() - startTime;
    logRequestEntry({
      timestamp: new Date().toISOString(),
      requestId,
      model: requestedModel,
      baselineTokens,
      optimizedTokens,
      tokensPrevented,
      reductionPercent,
      providerCalled: true,
      bypass: false,
      optimizationType: result.notes[0] || "none",
      latencyMs,
      error: null,
      source,
      channel,
      project,
      session,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error = msg;
    const latencyMs = Date.now() - startTime;
    logRequestEntry({
      timestamp: new Date().toISOString(),
      requestId,
      model: requestedModel,
      baselineTokens,
      optimizedTokens,
      tokensPrevented,
      reductionPercent,
      providerCalled: true,
      bypass: false,
      optimizationType: result.notes[0] || "none",
      latencyMs,
      error,
      source,
      channel,
      project,
      session,
    });
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: `Provider error: ${msg}`, type: "server_error" } }));
  }
}

function handleHealth(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const metrics = collectMetrics();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    version: VERSION,
    optimization: {
      enabled: OPTIMIZATION_ENABLED,
      provider: PROVIDER,
      model: MODEL,
    },
    provider: {
      available: !!(OPENAI_API_KEY || PROVIDER === "ollama" || (PROVIDER === "mimo" && MIMO_API_KEY)),
      forwardingEnabled: !!(OPENAI_API_KEY || PROVIDER === "ollama" || (PROVIDER === "mimo" && MIMO_API_KEY)),
    },
    memory: {
      providerActive: true,
      embeddingMode: embeddingProviderStatus.mode,
      embeddingProvider: embeddingProviderStatus.provider,
      embeddingModel: embeddingProviderStatus.model,
      embeddingDimension: embeddingProviderStatus.dimension || undefined,
    },
    metadata: {
      enabled: METADATA_ENABLED,
    },
    metrics: {
      requests: metrics.requests,
      tokensPrevented: metrics.tokensPrevented,
    },
    keepWarm: {
      enabled: keepWarmStatus.enabled,
      models: keepWarmStatus.models,
      intervalMs: keepWarmStatus.intervalMs,
      lastRun: keepWarmStatus.lastRun,
    },
  }));
}

function handleVersion(_req: http.IncomingMessage, res: http.ServerResponse): void {
  let gitCommit = "unknown";
  try {
    gitCommit = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch { /* ignore */ }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    version: VERSION,
    gitCommit,
    buildDate: BUILD_DATE,
    optimizationEngine: "1.0.0",
  }));
}

function handleEvents(_req: http.IncomingMessage, res: http.ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  sseClients.add(res);
  _req.on("close", () => sseClients.delete(res));
}

function handleMetricsCsv(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const header = "timestamp,requestId,model,baselineTokens,optimizedTokens,tokensPrevented,reductionPercent,providerCalled,bypass,optimizationType,latencyMs,estimatedCostSaved";
  const rows = requestLog.map(r => {
    const costSaved = (r.tokensPrevented / 1000) * 0.002;
    return [
      r.timestamp,
      r.requestId,
      r.model,
      r.baselineTokens,
      r.optimizedTokens,
      r.tokensPrevented,
      r.reductionPercent.toFixed(1),
      r.providerCalled,
      r.bypass,
      `"${r.optimizationType}"`,
      r.latencyMs,
      costSaved.toFixed(6),
    ].join(",");
  });
  res.writeHead(200, {
    "Content-Type": "text/csv",
    "Content-Disposition": "attachment; filename=agentforge-metrics.csv",
  });
  res.end([header, ...rows].join("\n"));
}

function handleDailySummary(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();

  const todayRequests = requestLog.filter(r => new Date(r.timestamp).getTime() >= todayTs);
  const tokensPrevented = todayRequests.reduce((s, r) => s + r.tokensPrevented, 0);
  const costSaved = todayRequests.reduce((s, r) => s + (r.tokensPrevented / 1000) * 0.002, 0);
  const providerCallsAvoided = todayRequests.filter(r => r.bypass).length;

  const modelCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  let biggestSavings: RequestLog | null = null;

  for (const r of todayRequests) {
    modelCounts[r.model] = (modelCounts[r.model] || 0) + 1;
    typeCounts[r.optimizationType] = (typeCounts[r.optimizationType] || 0) + 1;
    if (!biggestSavings || r.tokensPrevented > biggestSavings.tokensPrevented) {
      biggestSavings = r;
    }
  }

  const topModels = Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([model, count]) => ({ model, requests: count }));

  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, requests: count }));

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    date: new Date().toISOString().split("T")[0],
    requests: todayRequests.length,
    tokensPrevented,
    estimatedCostSaved: costSaved,
    providerCallsAvoided,
    topModels,
    topOptimizationTypes: topTypes,
    biggestSavingsRequest: biggestSavings,
  }, null, 2));
}

function handleDashboardJson(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const metrics = collectMetrics();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(metrics, null, 2));
}

function handleApp(_req: http.IncomingMessage, res: http.ServerResponse): void {
  // The vNext workspace is the only supported AgentForge product surface.
  // Keep this historical runtime from exposing a competing, stale UI.
  res.writeHead(307, { Location: "http://127.0.0.1:3460/" });
  res.end();
}

function handleDashboard(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const m = collectMetrics();
  const warnings = getWarnings();

  const warningHtml = warnings.length > 0
    ? warnings.map(w => `<div class="warning-banner"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>${w}</span></div>`).join("")
    : "";

  const requestRows = m.latestRequests.map(r => {
    const badgeClass = r.bypass ? "badge-bypass" : r.providerCalled ? "badge-forward" : "badge-error";
    const badgeText = r.bypass ? "cached" : r.providerCalled ? "forwarded" : "failed";
    return `<tr>
      <td class="td-time">${r.timestamp.slice(11, 19)}</td>
      <td class="td-id">${r.requestId}</td>
      <td><span class="source-tag">${r.source}</span><span class="channel-tag">${r.channel}</span></td>
      <td><span class="model-tag">${r.model}</span></td>
      <td class="td-num">${r.baselineTokens.toLocaleString()}</td>
      <td class="td-num">${r.optimizedTokens.toLocaleString()}</td>
      <td class="td-num td-green">${r.tokensPrevented.toLocaleString()}</td>
      <td><span class="reduction-pill">${r.reductionPercent.toFixed(1)}%</span></td>
      <td><span class="${badgeClass}">${badgeText}</span></td>
      <td class="td-type">${r.optimizationType}</td>
      <td class="td-num">${r.latencyMs}<span class="unit">ms</span></td>
      <td class="${r.error ? 'td-error' : 'td-empty'}">${r.error || "&mdash;"}</td>
    </tr>`;
  }).join("");

  const optStatus = m.optimizationStatus;
  const statusColor = optStatus.blockers.length === 0 ? "green" : "amber";
  const statusIcon = optStatus.blockers.length === 0
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  const openclawRequests = m.latestRequests.filter(r => r.source === "openclaw");
  const openclawDetected = openclawRequests.length > 0;
  const openclawCount = openclawRequests.length;
  const telegramCount = m.latestRequests.filter(r => r.channel === "telegram").length;

  const topEventsHtml = m.topSavingsEvents.length > 0
    ? m.topSavingsEvents.map(e => `
      <div class="event-card">
        <div class="event-header">
          <span class="event-time">${e.timestamp.slice(11, 19)}</span>
          <span class="event-type">${e.type}</span>
        </div>
        <div class="event-desc">${e.description}</div>
        <div class="event-flow">
          <div class="flow-item">
            <span class="flow-label">Before</span>
            <span class="flow-value">${e.beforeTokens.toLocaleString()} tokens</span>
          </div>
          <div class="flow-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
          <div class="flow-item">
            <span class="flow-label">After</span>
            <span class="flow-value green">${e.afterTokens.toLocaleString()} tokens</span>
          </div>
          <div class="flow-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
          <div class="flow-item highlight">
            <span class="flow-label">Saved</span>
            <span class="flow-value green">${e.savedTokens.toLocaleString()}</span>
          </div>
        </div>
      </div>`).join("")
    : `<div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2v20M2 12h20"/>
        </svg>
        <div class="empty-title">No savings events yet</div>
        <div class="empty-desc">Send repeated requests to see token elimination in action</div>
      </div>`;

  const chartMax = Math.max(...m.hourlyData.map(d => d.seen), 1);
  const chartBars = m.hourlyData.map(d => {
    const seenH = Math.round((d.seen / chartMax) * 100);
    const preventedH = Math.round((d.prevented / chartMax) * 100);
    return `<div class="chart-col"><div class="chart-bar-stack"><div class="chart-bar seen" style="height:${seenH}%"></div><div class="chart-bar prevented" style="height:${preventedH}%"></div></div><span class="chart-label">${d.hour}</span></div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentForge &mdash; Command Center</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg-root: #09090b;
    --bg-surface: #111113;
    --bg-elevated: #18181b;
    --bg-hover: #1f1f23;
    --border: #27272a;
    --border-subtle: #1e1e22;
    --text-primary: #fafafa;
    --text-secondary: #a1a1aa;
    --text-muted: #52525b;
    --accent: #8b5cf6;
    --accent-dim: rgba(139, 92, 246, 0.12);
    --accent-glow: rgba(139, 92, 246, 0.25);
    --green: #22c55e;
    --green-dim: rgba(34, 197, 94, 0.12);
    --blue: #3b82f6;
    --blue-dim: rgba(59, 130, 246, 0.12);
    --amber: #f59e0b;
    --amber-dim: rgba(245, 158, 11, 0.12);
    --red: #ef4444;
    --red-dim: rgba(239, 68, 68, 0.12);
    --radius: 12px;
    --radius-sm: 8px;
    --radius-xs: 6px;
    --shadow: 0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px var(--border-subtle);
    --shadow-lg: 0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px var(--border-subtle);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg-root);
    color: var(--text-primary);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  .app { max-width: 1400px; margin: 0 auto; padding: 2rem 2.5rem 3rem; }

  .header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border);
  }
  .header-left { display: flex; align-items: center; gap: 1rem; }
  .logo {
    width: 40px; height: 40px;
    background: linear-gradient(135deg, var(--accent) 0%, #6d28d9 100%);
    border-radius: 10px; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 20px var(--accent-glow);
  }
  .logo svg { width: 22px; height: 22px; color: white; }
  .header-title { display: flex; flex-direction: column; gap: 0.15rem; }
  .header-title h1 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; }
  .header-title .tagline { font-size: 0.8rem; color: var(--text-muted); }
  .header-right { display: flex; align-items: center; gap: 0.75rem; }
  .status-pill {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.4rem 0.75rem; background: var(--green-dim);
    border: 1px solid rgba(34,197,94,0.2); border-radius: 20px;
    font-size: 0.75rem; font-weight: 500; color: var(--green);
  }
  .status-dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--green);
    animation: glow 2s ease-in-out infinite;
  }
  @keyframes glow {
    0%,100% { box-shadow: 0 0 4px var(--green); opacity: 1; }
    50% { box-shadow: 0 0 8px var(--green); opacity: 0.7; }
  }
  .version-tag {
    font-family: 'JetBrains Mono', monospace; font-size: 0.7rem;
    color: var(--text-muted); padding: 0.35rem 0.6rem;
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-xs);
  }

  /* Dogfood Mode Banner */
  .dogfood-banner {
    background: linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(34,197,94,0.08) 100%);
    border: 1px solid rgba(139,92,246,0.3); border-radius: var(--radius);
    padding: 0.85rem 1.25rem; margin-bottom: 1.5rem;
    box-shadow: 0 0 24px rgba(139,92,246,0.08);
  }
  .dogfood-banner-content {
    display: flex; align-items: center; gap: 0.85rem;
  }
  .dogfood-pulse {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--accent); flex-shrink: 0;
    animation: dogfood-glow 1.5s ease-in-out infinite;
  }
  @keyframes dogfood-glow {
    0%,100% { box-shadow: 0 0 8px var(--accent), 0 0 16px rgba(139,92,246,0.3); opacity: 1; }
    50% { box-shadow: 0 0 16px var(--accent), 0 0 32px rgba(139,92,246,0.5); opacity: 0.8; }
  }
  .dogfood-text { display: flex; flex-direction: column; gap: 0.15rem; }
  .dogfood-text strong {
    font-size: 0.8rem; font-weight: 700; color: var(--accent);
    letter-spacing: 0.05em; text-transform: uppercase;
  }
  .dogfood-text span { font-size: 0.75rem; color: var(--text-secondary); }

  /* Status Card */
  .status-card {
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 1.5rem; margin-bottom: 1.5rem;
  }
  .status-card-header {
    display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;
  }
  .status-card-icon { color: var(--${statusColor}); }
  .status-card-title { font-size: 1rem; font-weight: 600; }
  .status-card-capability {
    font-family: 'JetBrains Mono', monospace; font-size: 1.5rem;
    font-weight: 700; color: var(--${statusColor}); margin-bottom: 1rem;
  }
  .status-checks { display: flex; flex-direction: column; gap: 0.5rem; }
  .status-check {
    display: flex; align-items: center; gap: 0.6rem; font-size: 0.8rem;
  }
  .check-icon { width: 16px; height: 16px; flex-shrink: 0; }
  .check-active { color: var(--green); }
  .check-inactive { color: var(--text-muted); }
  .check-label-active { color: var(--text-secondary); }
  .check-label-inactive { color: var(--text-muted); }
  .blockers {
    margin-top: 1rem; padding: 0.75rem 1rem; background: var(--amber-dim);
    border: 1px solid rgba(245,158,11,0.2); border-radius: var(--radius-sm);
  }
  .blockers-title { font-size: 0.75rem; font-weight: 600; color: var(--amber); margin-bottom: 0.4rem; }
  .blocker-item { font-size: 0.75rem; color: var(--amber); opacity: 0.9; }

  /* Metrics */
  .metrics-grid {
    display: grid; grid-template-columns: repeat(6, 1fr);
    gap: 1rem; margin-bottom: 1.5rem;
  }
  .metric-card {
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 1.25rem;
  }
  .metric-label {
    font-size: 0.7rem; font-weight: 500; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.5rem;
  }
  .metric-value {
    font-size: 1.75rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1;
  }
  .metric-value.green { color: var(--green); }
  .metric-value.blue { color: var(--blue); }
  .metric-value.accent { color: var(--accent); }
  .metric-sub { font-size: 0.7rem; color: var(--text-muted); margin-top: 0.4rem; }

  /* Two Column */
  .two-col {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1.5rem; margin-bottom: 1.5rem;
  }
  .three-col {
    display: grid; grid-template-columns: 340px 1fr;
    gap: 1.5rem; margin-bottom: 1.5rem;
  }

  /* Sections */
  .section {
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
  }
  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);
  }
  .section-title { font-size: 0.8rem; font-weight: 600; }
  .section-badge {
    font-family: 'JetBrains Mono', monospace; font-size: 0.65rem;
    color: var(--text-muted); padding: 0.2rem 0.5rem;
    background: var(--bg-elevated); border-radius: var(--radius-xs);
  }

  /* Stats */
  .stats-list { padding: 0.5rem 0; }
  .stat-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.6rem 1.25rem; transition: background 0.15s;
  }
  .stat-row:hover { background: var(--bg-hover); }
  .stat-row-label { font-size: 0.8rem; color: var(--text-secondary); }
  .stat-row-value {
    font-family: 'JetBrains Mono', monospace; font-size: 0.8rem;
    font-weight: 500; color: var(--text-primary);
  }
  .stat-row-value.green { color: var(--green); }
  .stat-row-value.blue { color: var(--blue); }
  .stat-row-value.accent { color: var(--accent); }

  /* Chart */
  .chart-container {
    padding: 1.25rem; height: 220px; display: flex; flex-direction: column;
  }
  .chart-legend {
    display: flex; gap: 1.5rem; margin-bottom: 1rem;
  }
  .legend-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; color: var(--text-muted); }
  .legend-dot { width: 8px; height: 8px; border-radius: 2px; }
  .legend-dot.seen { background: var(--text-muted); }
  .legend-dot.prevented { background: var(--green); }
  .chart-area {
    flex: 1; display: flex; align-items: flex-end; gap: 2px;
    padding-bottom: 20px; position: relative;
  }
  .chart-col {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  }
  .chart-bar-stack {
    width: 100%; display: flex; flex-direction: column; align-items: center;
    justify-content: flex-end; height: 100%; gap: 2px;
  }
  .chart-bar {
    width: 60%; border-radius: 2px 2px 0 0; transition: height 0.3s;
    min-height: 1px;
  }
  .chart-bar.seen { background: rgba(255,255,255,0.08); }
  .chart-bar.prevented { background: var(--green); opacity: 0.8; }
  .chart-label {
    font-family: 'JetBrains Mono', monospace; font-size: 0.55rem;
    color: var(--text-muted); position: absolute; bottom: 0;
  }

  /* Top Savings Events */
  .events-list { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .event-card {
    background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 1rem;
  }
  .event-header {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;
  }
  .event-time {
    font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text-muted);
  }
  .event-type {
    font-size: 0.7rem; font-weight: 500; color: var(--accent);
    padding: 0.15rem 0.5rem; background: var(--accent-dim); border-radius: var(--radius-xs);
  }
  .event-desc { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem; }
  .event-flow { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .flow-item {
    display: flex; flex-direction: column; gap: 0.15rem;
    padding: 0.5rem 0.75rem; background: var(--bg-root); border-radius: var(--radius-xs);
    border: 1px solid var(--border-subtle);
  }
  .flow-item.highlight { border-color: var(--green); background: var(--green-dim); }
  .flow-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
  .flow-value {
    font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;
    font-weight: 600; color: var(--text-primary);
  }
  .flow-value.green { color: var(--green); }
  .flow-arrow { color: var(--text-muted); }

  /* Table */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  thead th {
    text-align: left; padding: 0.75rem 1rem; font-size: 0.7rem; font-weight: 500;
    color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;
    background: var(--bg-elevated); border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 1;
  }
  tbody tr { border-bottom: 1px solid var(--border-subtle); transition: background 0.15s; }
  tbody tr:hover { background: var(--bg-hover); }
  tbody tr:last-child { border-bottom: none; }
  td { padding: 0.6rem 1rem; color: var(--text-secondary); white-space: nowrap; }
  .td-time, .td-id { font-family: 'JetBrains Mono', monospace; color: var(--text-muted); font-size: 0.75rem; }
  .td-num { font-family: 'JetBrains Mono', monospace; text-align: right; }
  .td-green { color: var(--green) !important; }
  .td-type { font-size: 0.75rem; color: var(--text-muted); }
  .td-error { color: var(--red); font-size: 0.75rem; }
  .td-empty { color: var(--text-muted); }
  .unit { color: var(--text-muted); font-size: 0.7rem; margin-left: 1px; }
  .model-tag {
    display: inline-block; padding: 0.15rem 0.5rem;
    background: var(--accent-dim); border: 1px solid rgba(139,92,246,0.15);
    border-radius: var(--radius-xs); font-size: 0.7rem; font-weight: 500;
    color: var(--accent); font-family: 'JetBrains Mono', monospace;
  }
  .source-tag {
    display: inline-block; padding: 0.15rem 0.4rem; margin-right: 0.3rem;
    background: var(--blue-dim); border: 1px solid rgba(59,130,246,0.15);
    border-radius: var(--radius-xs); font-size: 0.65rem; font-weight: 500;
    color: var(--blue); font-family: 'JetBrains Mono', monospace;
  }
  .channel-tag {
    display: inline-block; padding: 0.15rem 0.4rem;
    background: rgba(168,85,247,0.12); border: 1px solid rgba(168,85,247,0.15);
    border-radius: var(--radius-xs); font-size: 0.65rem; font-weight: 500;
    color: #a855f7; font-family: 'JetBrains Mono', monospace;
  }
  .reduction-pill {
    display: inline-block; padding: 0.15rem 0.5rem; background: var(--green-dim);
    border-radius: var(--radius-xs); font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem; font-weight: 500; color: var(--green);
  }
  .badge-cached, .badge-forward, .badge-error {
    display: inline-block; padding: 0.15rem 0.5rem; border-radius: var(--radius-xs);
    font-size: 0.7rem; font-weight: 500;
  }
  .badge-cached { background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(139,92,246,0.15); }
  .badge-forward { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(59,130,246,0.15); }
  .badge-error { background: var(--red-dim); color: var(--red); border: 1px solid rgba(239,68,68,0.15); }

  /* Empty State */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 3rem 2rem; text-align: center;
  }
  .empty-icon { width: 48px; height: 48px; margin-bottom: 1rem; color: var(--text-muted); opacity: 0.5; }
  .empty-title { font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.3rem; }
  .empty-desc { font-size: 0.8rem; color: var(--text-muted); }

  /* Footer */
  .footer {
    display: flex; align-items: center; justify-content: space-between;
    padding-top: 1.5rem; margin-top: 1.5rem; border-top: 1px solid var(--border);
    font-size: 0.7rem; color: var(--text-muted);
  }
  .footer-links { display: flex; gap: 1.5rem; }
  .footer-links a { color: var(--text-muted); text-decoration: none; transition: color 0.15s; }
  .footer-links a:hover { color: var(--accent); }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  @media (max-width: 1200px) {
    .metrics-grid { grid-template-columns: repeat(3, 1fr); }
    .two-col, .three-col { grid-template-columns: 1fr; }
  }
  @media (max-width: 768px) {
    .app { padding: 1.25rem; }
    .metrics-grid { grid-template-columns: repeat(2, 1fr); }
    .header { flex-direction: column; align-items: flex-start; gap: 1rem; }
  }
</style>
</head>
<body>
<div class="app">
  <header class="header">
    <div class="header-left">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      </div>
      <div class="header-title">
        <h1>AgentForge</h1>
        <span class="tagline">Token elimination layer for AI builders</span>
      </div>
    </div>
    <div class="header-right">
      <span class="status-pill"><span class="status-dot"></span>Live</span>
      <span class="version-tag">v${VERSION}</span>
    </div>
  </header>

  ${openclawDetected ? `
  <!-- Dogfood Mode Banner -->
  <div class="dogfood-banner">
    <div class="dogfood-banner-content">
      <span class="dogfood-pulse"></span>
      <div class="dogfood-text">
        <strong>DOGFOOD MODE ACTIVE</strong>
        <span>OpenClaw traffic detected &middot; ${openclawCount} request${openclawCount !== 1 ? 's' : ''}${telegramCount > 0 ? ` &middot; ${telegramCount} Telegram` : ''}</span>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Optimization Status -->
  <div class="status-card">
    <div class="status-card-header">
      <span class="status-card-icon">${statusIcon}</span>
      <span class="status-card-title">Optimization Status</span>
    </div>
    <div class="status-card-capability">${optStatus.currentCapability}</div>
    <div class="status-checks">
      <div class="status-check">
        <svg class="check-icon ${optStatus.providerActive ? 'check-active' : 'check-inactive'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${optStatus.providerActive ? 'M22 11.08V12a10 10 0 1 1-5.93-9.14' : 'M10 15l2-6m2 6l2-6M9 9h6m-6 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4'}/><polyline points="${optStatus.providerActive ? '22 4 12 14.01 9 11.01' : ''}"/></svg>
        <span class="${optStatus.providerActive ? 'check-label-active' : 'check-label-inactive'}">Provider Forwarding</span>
      </div>
      <div class="status-check">
        <svg class="check-icon ${optStatus.embeddingsActive ? 'check-active' : 'check-inactive'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${optStatus.embeddingsActive ? 'M22 11.08V12a10 10 0 1 1-5.93-9.14' : 'M10 15l2-6m2 6l2-6M9 9h6m-6 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4'}/><polyline points="${optStatus.embeddingsActive ? '22 4 12 14.01 9 11.01' : ''}"/></svg>
        <span class="${optStatus.embeddingsActive ? 'check-label-active' : 'check-label-inactive'}">Real Embeddings</span>
      </div>
      <div class="status-check">
        <svg class="check-icon ${optStatus.memoryBypassActive ? 'check-active' : 'check-inactive'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${optStatus.memoryBypassActive ? 'M22 11.08V12a10 10 0 1 1-5.93-9.14' : 'M10 15l2-6m2 6l2-6M9 9h6m-6 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4'}/><polyline points="${optStatus.memoryBypassActive ? '22 4 12 14.01 9 11.01' : ''}"/></svg>
        <span class="${optStatus.memoryBypassActive ? 'check-label-active' : 'check-label-inactive'}">Memory Bypass</span>
      </div>
    </div>
    ${optStatus.blockers.length > 0 ? `
    <div class="blockers">
      <div class="blockers-title">Current Limitations</div>
      ${optStatus.blockers.map(b => `<div class="blocker-item">- ${b}</div>`).join("")}
    </div>
    ` : ""}
  </div>

  <!-- Metrics -->
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label">Tokens Seen</div>
      <div class="metric-value" id="tokensSeen">${m.tokensSeen.toLocaleString()}</div>
      <div class="metric-sub">traffic observed</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Tokens Prevented</div>
      <div class="metric-value green" id="tokensPrevented">${m.tokensPrevented.toLocaleString()}</div>
      <div class="metric-sub">never reached model</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Cost Saved</div>
      <div class="metric-value green" id="costSaved">$${m.estimatedCostSaved.toFixed(4)}</div>
      <div class="metric-sub">estimated USD</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Calls Avoided</div>
      <div class="metric-value blue" id="callsAvoided">${m.providerCallsAvoided}</div>
      <div class="metric-sub">provider requests skipped</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Avg Reduction</div>
      <div class="metric-value accent" id="avgReduction">${m.averageReductionPercent.toFixed(1)}%</div>
      <div class="metric-sub">token savings rate</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Requests</div>
      <div class="metric-value" id="totalReqs">${m.requests}</div>
      <div class="metric-sub">${m.lastHourRequests} in last hour</div>
    </div>
  </div>

  <!-- Top Savings Events -->
  <div class="section" style="margin-bottom:1.5rem">
    <div class="section-header">
      <span class="section-title">Top Savings Events</span>
      <span class="section-badge">${m.topSavingsEvents.length} events</span>
    </div>
    <div class="events-list">
      ${topEventsHtml}
    </div>
  </div>

  <!-- Chart + Stats -->
  <div class="two-col">
    <div class="section">
      <div class="section-header">
        <span class="section-title">Tokens Over Time</span>
        <span class="section-badge">24h</span>
      </div>
      <div class="chart-container">
        <div class="chart-legend">
          <div class="legend-item"><span class="legend-dot seen"></span>Tokens Seen</div>
          <div class="legend-item"><span class="legend-dot prevented"></span>Tokens Prevented</div>
        </div>
        <div class="chart-area">
          ${chartBars}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">Engine Stats</span>
        <span class="section-badge">${m.requests} total</span>
      </div>
      <div class="stats-list">
        <div class="stat-row"><span class="stat-row-label">Memory Bypass</span><span class="stat-row-value green" id="memBypass">${m.memoryBypassHits}</span></div>
        <div class="stat-row"><span class="stat-row-label">Context Elimination</span><span class="stat-row-value blue" id="ctxElim">${m.contextEliminationHits}</span></div>
        <div class="stat-row"><span class="stat-row-label">Cache Hits</span><span class="stat-row-value accent" id="cacheHits">${m.cacheHits}</span></div>
        <div class="stat-row"><span class="stat-row-label">Compressions</span><span class="stat-row-value" id="compressions">${m.compressionSavings}</span></div>
        <div class="stat-row"><span class="stat-row-label">Context Elim. Tokens</span><span class="stat-row-value green" id="repoSavings">${m.repoContextSavings.toLocaleString()}</span></div>
        <div class="stat-row"><span class="stat-row-label">Memory Bypass Tokens</span><span class="stat-row-value green" id="memSavings">${(m.tokensPrevented - m.repoContextSavings).toLocaleString()}</span></div>
      </div>
    </div>
  </div>

  <!-- Request Log -->
  <div class="section" style="margin-bottom:1.5rem">
    <div class="section-header">
      <span class="section-title">Request Log</span>
      <span class="section-badge">live</span>
    </div>
    ${m.latestRequests.length === 0 ? `
    <div class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <div class="empty-title">No requests yet</div>
      <div class="empty-desc">Send a request to /v1/chat/completions to see live data</div>
    </div>
    ` : `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Time</th><th>ID</th><th>Source</th><th>Model</th>
            <th style="text-align:right">Base</th><th style="text-align:right">Opt</th>
            <th style="text-align:right">Saved</th><th>%</th>
            <th>Status</th><th>Type</th>
            <th style="text-align:right">Latency</th><th>Error</th>
          </tr>
        </thead>
        <tbody id="requestTable">${requestRows}</tbody>
      </table>
    </div>
    `}
  </div>

  <footer class="footer">
    <span>AgentForge v${VERSION} &mdash; ${PROVIDER}/${MODEL}</span>
    <div class="footer-links">
      <a href="/settings">Settings</a>
      <a href="/health">Health</a>
      <a href="/metrics.csv">Export CSV</a>
      <a href="/summary/daily">Daily Summary</a>
      <a href="/dashboard.json">JSON</a>
    </div>
  </footer>
</div>

<script>
const evtSource = new EventSource("/events");
evtSource.onmessage = (e) => {
  try {
    const entry = JSON.parse(e.data);
    if (entry.type === "connected") return;

    let tbody = document.getElementById("requestTable");
    if (!tbody) {
      const section = document.querySelector(".section:last-of-type .section-header");
      if (section && section.nextElementSibling) section.nextElementSibling.remove();
      const tableSection = document.querySelector(".section:last-of-type");
      if (tableSection) {
        tableSection.insertAdjacentHTML("beforeend",
          '<div class="table-wrap"><table><thead><tr>' +
          '<th>Time</th><th>ID</th><th>Source</th><th>Model</th><th style="text-align:right">Base</th>' +
          '<th style="text-align:right">Opt</th><th style="text-align:right">Saved</th>' +
          '<th>%</th><th>Status</th><th>Type</th><th style="text-align:right">Latency</th><th>Error</th>' +
          '</tr></thead><tbody id="requestTable"></tbody></table></div>');
        tbody = document.getElementById("requestTable");
      }
    }

    const badgeClass = entry.bypass ? "badge-cached" : entry.providerCalled ? "badge-forward" : "badge-error";
    const badgeText = entry.bypass ? "cached" : entry.providerCalled ? "forwarded" : "failed";
    const row = document.createElement("tr");
    row.innerHTML =
      '<td class="td-time">' + entry.timestamp.slice(11,19) + '</td>' +
      '<td class="td-id">' + entry.requestId + '</td>' +
      '<td><span class="source-tag">' + (entry.source || 'unknown') + '</span><span class="channel-tag">' + (entry.channel || 'unknown') + '</span></td>' +
      '<td><span class="model-tag">' + entry.model + '</span></td>' +
      '<td class="td-num">' + entry.baselineTokens.toLocaleString() + '</td>' +
      '<td class="td-num">' + entry.optimizedTokens.toLocaleString() + '</td>' +
      '<td class="td-num td-green">' + entry.tokensPrevented.toLocaleString() + '</td>' +
      '<td><span class="reduction-pill">' + entry.reductionPercent.toFixed(1) + '%</span></td>' +
      '<td><span class="' + badgeClass + '">' + badgeText + '</span></td>' +
      '<td class="td-type">' + entry.optimizationType + '</td>' +
      '<td class="td-num">' + entry.latencyMs + '<span class="unit">ms</span></td>' +
      '<td class="' + (entry.error ? 'td-error' : 'td-empty') + '">' + (entry.error || '&mdash;') + '</td>';
    tbody.insertBefore(row, tbody.firstChild);
    while (tbody.children.length > 50) tbody.removeChild(tbody.lastChild);

    var seenEl = document.getElementById("tokensSeen");
    if (seenEl) seenEl.textContent = (parseInt(seenEl.textContent.replace(/,/g,"")) + entry.baselineTokens).toLocaleString();
  } catch {}
};
evtSource.onerror = () => {};
</script>
</body>
</html>`;

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function handleGetSettings(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const settings = readEnvFile();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    provider: settings.AGENTFORGE_PROVIDER || "openai",
    openaiApiKey: settings.OPENAI_API_KEY || "",
    ollamaBaseUrl: settings.OLLAMA_BASE_URL || "http://localhost:11434",
    ollamaApiKey: settings.OLLAMA_API_KEY || "",
    model: settings.AGENTFORGE_MODEL || "gpt-4o-mini",
    port: settings.AGENTFORGE_PORT || "3460",
    optimization: settings.AGENTFORGE_OPTIMIZATION !== "false",
    metadata: settings.AGENTFORGE_METADATA !== "false",
  }));
}

async function handleSaveSettings(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();

  let body: Record<string, string>;
  try {
    body = JSON.parse(raw);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON" }));
    return;
  }

  const currentSettings = readEnvFile();
  const newSettings: Record<string, string> = {
    AGENTFORGE_PROVIDER: body.provider || currentSettings.AGENTFORGE_PROVIDER || "openai",
    OPENAI_API_KEY: body.openaiApiKey !== undefined ? body.openaiApiKey : currentSettings.OPENAI_API_KEY || "",
    OLLAMA_BASE_URL: body.ollamaBaseUrl || currentSettings.OLLAMA_BASE_URL || "http://localhost:11434",
    OLLAMA_API_KEY: body.ollamaApiKey !== undefined ? body.ollamaApiKey : currentSettings.OLLAMA_API_KEY || "",
    MIMO_API_KEY: body.mimoApiKey !== undefined ? body.mimoApiKey : currentSettings.MIMO_API_KEY || "",
    MIMO_BASE_URL: body.mimoBaseUrl || currentSettings.MIMO_BASE_URL || "https://token-plan-sgp.xiaomimimo.com/v1",
    AGENTFORGE_MODEL: body.model || currentSettings.AGENTFORGE_MODEL || "gpt-4o-mini",
    AGENTFORGE_PORT: body.port || currentSettings.AGENTFORGE_PORT || "3460",
    AGENTFORGE_OPTIMIZATION: body.optimization !== undefined ? String(body.optimization) : currentSettings.AGENTFORGE_OPTIMIZATION || "true",
    AGENTFORGE_METADATA: body.metadata !== undefined ? String(body.metadata) : currentSettings.AGENTFORGE_METADATA || "true",
  };

  writeEnvFile(newSettings);

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: true, message: "Settings saved. Restart server to apply." }));
}

function handleSettingsPage(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const settings = readEnvFile();
  const provider = settings.AGENTFORGE_PROVIDER || "openai";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentForge - Settings</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg-root: #09090b; --bg-surface: #111113; --bg-elevated: #18181b;
    --bg-hover: #1f1f23; --border: #27272a; --border-subtle: #1e1e22;
    --text-primary: #fafafa; --text-secondary: #a1a1aa; --text-muted: #52525b;
    --accent: #8b5cf6; --accent-dim: rgba(139,92,246,0.12);
    --green: #22c55e; --green-dim: rgba(34,197,94,0.12);
    --red: #ef4444; --red-dim: rgba(239,68,68,0.12);
    --radius: 12px; --radius-sm: 8px; --radius-xs: 6px;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--bg-root); color: var(--text-primary);
    min-height: 100vh; -webkit-font-smoothing: antialiased;
  }
  .app { max-width: 720px; margin: 0 auto; padding: 2rem 2.5rem 3rem; }
  .header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border);
  }
  .header-left { display: flex; align-items: center; gap: 1rem; }
  .logo {
    width: 40px; height: 40px;
    background: linear-gradient(135deg, var(--accent) 0%, #6d28d9 100%);
    border-radius: 10px; display: flex; align-items: center; justify-content: center;
  }
  .logo svg { width: 22px; height: 22px; color: white; }
  .header-title h1 { font-size: 1.25rem; font-weight: 700; }
  .header-title .tagline { font-size: 0.8rem; color: var(--text-muted); }
  .back-link {
    font-size: 0.8rem; color: var(--accent); text-decoration: none;
    display: flex; align-items: center; gap: 0.4rem;
  }
  .back-link:hover { text-decoration: underline; }
  .section {
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: var(--radius); margin-bottom: 1.5rem; overflow: hidden;
  }
  .section-header {
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);
    font-size: 0.85rem; font-weight: 600;
  }
  .section-body { padding: 1.25rem; }
  .form-group { margin-bottom: 1.25rem; }
  .form-group:last-child { margin-bottom: 0; }
  .form-label {
    display: block; font-size: 0.75rem; font-weight: 500;
    color: var(--text-secondary); margin-bottom: 0.4rem;
  }
  .form-hint { font-size: 0.7rem; color: var(--text-muted); margin-top: 0.3rem; }
  .form-input, .form-select {
    width: 100%; padding: 0.6rem 0.75rem;
    background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: var(--radius-xs); color: var(--text-primary);
    font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;
    transition: border-color 0.15s;
  }
  .form-input:focus, .form-select:focus {
    outline: none; border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-dim);
  }
  .form-input::placeholder { color: var(--text-muted); }
  .form-select {
    font-family: 'Inter', sans-serif; cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2352525b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 0.75rem center;
    padding-right: 2rem;
  }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.75rem 0; border-bottom: 1px solid var(--border-subtle);
  }
  .toggle-row:last-child { border-bottom: none; }
  .toggle-label { font-size: 0.8rem; color: var(--text-secondary); }
  .toggle {
    position: relative; width: 40px; height: 22px; cursor: pointer;
  }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-slider {
    position: absolute; inset: 0; background: var(--bg-elevated);
    border: 1px solid var(--border); border-radius: 11px; transition: 0.2s;
  }
  .toggle-slider:before {
    content: ""; position: absolute; width: 16px; height: 16px;
    left: 2px; bottom: 2px; background: var(--text-muted);
    border-radius: 50%; transition: 0.2s;
  }
  .toggle input:checked + .toggle-slider { background: var(--accent-dim); border-color: var(--accent); }
  .toggle input:checked + .toggle-slider:before { transform: translateX(18px); background: var(--accent); }
  .btn-row { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
  .btn {
    padding: 0.6rem 1.5rem; border-radius: var(--radius-xs);
    font-size: 0.85rem; font-weight: 600; cursor: pointer;
    border: 1px solid transparent; transition: 0.15s;
  }
  .btn-primary {
    background: var(--accent); color: white;
  }
  .btn-primary:hover { opacity: 0.9; }
  .btn-secondary {
    background: var(--bg-elevated); color: var(--text-secondary);
    border-color: var(--border);
  }
  .btn-secondary:hover { background: var(--bg-hover); color: var(--text-primary); }
  .toast {
    position: fixed; bottom: 2rem; right: 2rem;
    padding: 0.75rem 1rem; border-radius: var(--radius-sm);
    font-size: 0.8rem; font-weight: 500;
    transform: translateY(100px); opacity: 0; transition: 0.3s;
    z-index: 100;
  }
  .toast.show { transform: translateY(0); opacity: 1; }
  .toast-success { background: var(--green-dim); color: var(--green); border: 1px solid rgba(34,197,94,0.2); }
  .toast-error { background: var(--red-dim); color: var(--red); border: 1px solid rgba(239,68,68,0.2); }
  .provider-section { display: none; }
  .provider-section.active { display: block; }
</style>
</head>
<body>
<div class="app">
  <header class="header">
    <div class="header-left">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      </div>
      <div class="header-title">
        <h1>Settings</h1>
        <span class="tagline">Configure your LLM provider and API keys</span>
      </div>
    </div>
    <a href="/dashboard" class="back-link">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
      Back to Dashboard
    </a>
  </header>

  <form id="settingsForm">
    <div class="section">
      <div class="section-header">Provider</div>
      <div class="section-body">
        <div class="form-group">
          <label class="form-label">LLM Provider</label>
          <select class="form-select" id="provider" onchange="toggleProvider()">
            <option value="openai" ${provider === "openai" ? "selected" : ""}>OpenAI</option>
            <option value="ollama" ${provider === "ollama" ? "selected" : ""}>Ollama (Local)</option>
            <option value="mimo" ${provider === "mimo" ? "selected" : ""}>Xiaomi MiMo (Token Plan)</option>
          </select>
          <div class="form-hint">Choose where AgentForge sends your requests</div>
        </div>
      </div>
    </div>

    <div class="section" id="openai-section">
      <div class="section-header">OpenAI Configuration</div>
      <div class="section-body">
        <div class="form-group">
          <label class="form-label">API Key</label>
          <input class="form-input" type="password" id="openaiApiKey" placeholder="sk-..." autocomplete="off">
          <div class="form-hint">Your OpenAI API key. Get it from platform.openai.com/api-keys</div>
        </div>
      </div>
    </div>

    <div class="section" id="ollama-section">
      <div class="section-header">Ollama Configuration</div>
      <div class="section-body">
        <div class="form-group">
          <label class="form-label">Base URL</label>
          <input class="form-input" type="text" id="ollamaBaseUrl" placeholder="http://localhost:11434">
          <div class="form-hint">Where Ollama is running. Default: http://localhost:11434</div>
        </div>
        <div class="form-group">
          <label class="form-label">API Key</label>
          <input class="form-input" type="password" id="ollamaApiKey" placeholder="ollama-local" autocomplete="off">
          <div class="form-hint">Usually "ollama-local" or leave empty</div>
        </div>
      </div>
    </div>

    <div class="section" id="mimo-section">
      <div class="section-header">Xiaomi MiMo Configuration</div>
      <div class="section-body">
        <div class="form-group">
          <label class="form-label">API Key</label>
          <input class="form-input" type="password" id="mimoApiKey" placeholder="tp-..." autocomplete="off">
          <div class="form-hint">Token Plan key (tp-...) from platform.xiaomimimo.com</div>
        </div>
        <div class="form-group">
          <label class="form-label">Base URL</label>
          <input class="form-input" type="text" id="mimoBaseUrl" placeholder="https://token-plan-sgp.xiaomimimo.com/v1">
          <div class="form-hint">Dedicated Base URL from your subscription page</div>
        </div>
        <div class="form-group">
          <label class="form-label">Model</label>
          <select class="form-select" id="mimoModel">
            <option value="mimo-v2.5-pro">mimo-v2.5-pro (coding/reasoning, no vision)</option>
            <option value="mimo-v2.5">mimo-v2.5 (text + vision)</option>
          </select>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">Model</div>
      <div class="section-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Model Name</label>
            <input class="form-input" type="text" id="model" placeholder="gpt-4o-mini">
            <div class="form-hint">e.g. gpt-4o-mini, llama3.1:8b, qwen2.5:14b</div>
          </div>
          <div class="form-group">
            <label class="form-label">Port</label>
            <input class="form-input" type="text" id="port" placeholder="3460">
            <div class="form-hint">AgentForge server port</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">Features</div>
      <div class="section-body">
        <div class="toggle-row">
          <span class="toggle-label">Token Optimization</span>
          <label class="toggle">
            <input type="checkbox" id="optimization" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="toggle-row">
          <span class="toggle-label">Metadata in Responses</span>
          <label class="toggle">
            <input type="checkbox" id="metadata" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="btn-row">
      <button type="submit" class="btn btn-primary">Save Settings</button>
      <a href="/dashboard" class="btn btn-secondary">Cancel</a>
    </div>
  </form>
</div>

<div class="toast" id="toast"></div>

<script>
function toggleProvider() {
  const provider = document.getElementById("provider").value;
  document.getElementById("openai-section").classList.toggle("active", provider === "openai");
  document.getElementById("ollama-section").classList.toggle("active", provider === "ollama");
  document.getElementById("mimo-section").classList.toggle("active", provider === "mimo");
}

function showToast(message, type) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast toast-" + type + " show";
  setTimeout(() => toast.classList.remove("show"), 3000);
}

async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    const settings = await res.json();
    document.getElementById("provider").value = settings.provider;
    document.getElementById("openaiApiKey").value = settings.openaiApiKey;
    document.getElementById("ollamaBaseUrl").value = settings.ollamaBaseUrl;
    document.getElementById("ollamaApiKey").value = settings.ollamaApiKey;
    document.getElementById("model").value = settings.model;
    document.getElementById("port").value = settings.port;
    document.getElementById("optimization").checked = settings.optimization;
    document.getElementById("metadata").checked = settings.metadata;
    toggleProvider();
  } catch (e) {
    showToast("Failed to load settings", "error");
  }
}

document.getElementById("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    provider: document.getElementById("provider").value,
    openaiApiKey: document.getElementById("openaiApiKey").value,
    ollamaBaseUrl: document.getElementById("ollamaBaseUrl").value,
    ollamaApiKey: document.getElementById("ollamaApiKey").value,
    model: document.getElementById("model").value,
    port: document.getElementById("port").value,
    optimization: document.getElementById("optimization").checked,
    metadata: document.getElementById("metadata").checked,
  };
  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.success) {
      showToast("Settings saved! Restart server to apply.", "success");
    } else {
      showToast("Failed to save settings", "error");
    }
  } catch (e) {
    showToast("Failed to save settings", "error");
  }
});

loadSettings();
</script>
</body>
</html>`;

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

// ── Canonical Store Integration ─────────────────────
// Seed demo data through the real WorkspaceStore (same as webServer.ts)
function seedDemoData(): void {
  // Agents
  if (globalStore.listAgents().length === 0) {
    globalStore.createAgent({
      id: "agent-alex", name: "Alex", avatarUrl: "🤖", role: "Full-Stack Engineer",
      description: "TypeScript, Python, testing, and Git worktree isolation.",
      status: "idle",
      harnessPolicy: { preferredHarnessId: "pi", autoResume: true },
      modelPolicy: { preferredTier: 4, preferredModel: "mimo-v2.5-pro", preferredProvider: "mimo", allowCloudFallback: true },
      decisionPolicy: { useSystem1Router: true }, computePolicy: { environment: "local_workspace" },
      memoryNamespace: "engineering", tools: ["git", "terminal", "vitest", "diff_viewer"],
      permissions: ["repo:read", "repo:branch", "test:run"], assignedChannelIds: ["chan-development"],
    });
    globalStore.createAgent({
      id: "agent-reviewer", name: "Sarah", avatarUrl: "💼", role: "Operations Reviewer",
      description: "Reviews incoming workspace requests and routes evidence for approval.",
      status: "idle",
      harnessPolicy: { preferredHarnessId: "pydantic", autoResume: true },
      modelPolicy: { preferredTier: 3, preferredModel: "mimo-v2.5-pro", preferredProvider: "mimo", allowCloudFallback: true },
      decisionPolicy: { useSystem1Router: true }, computePolicy: { environment: "none" },
      memoryNamespace: "operations", tools: ["records_client", "conversation_client", "knowledge_base"],
      permissions: ["records:read", "records:write", "voice:outbound"], assignedChannelIds: ["chan-general", "chan-calls"],
    });
  }
  // Tasks
  if (globalStore.listTasks().length === 0) {
    globalStore.createTask({
      id: "AF-142",
      projectId: "proj-agentforge", title: "Fix login session regression",
      description: "Ensure session tokens are preserved across worktree branches",
      priority: "high", status: "in_progress", assignedAgentId: "agent-alex",
      contract: { id: "contract-AF-142", taskId: "AF-142", version: 1, repository: { baseBranch: "origin/master", baseSha: "802e04a" }, workspace: { requireIsolatedWorktree: true }, scope: { allowedPaths: ["src/**"], protectedPaths: [".env", "package.json"] }, authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: true }, requiredChecks: [{ type: "unit_tests", required: true }], completion: { requireEvidencePack: true, requireHumanApproval: true }, createdAt: new Date().toISOString() },
    });
    globalStore.createTask({
      projectId: "proj-agentforge", title: "Implement MiMo provider adapter",
      description: "Add Xiaomi MiMo as a real generative model provider",
      priority: "medium", status: "completed", assignedAgentId: "agent-alex",
    });
    globalStore.createTask({
      projectId: "proj-agentforge", title: "UI Shell Redesign",
      description: "Replace token dashboard with AI Workforce OS interface",
      priority: "high", status: "in_progress", assignedAgentId: "agent-alex",
    });
  }
  // Approvals
  if (globalStore.listApprovals().length === 0) {
    globalStore.createApproval({
      taskId: "AF-142", requesterAgentId: "agent-alex",
      action: "Deploy auth session patch to Staging",
      description: "All 164 tests passing; diff scope verified within allowed contract boundaries.",
      risk: "medium",
      evidenceSummary: { filesCount: 2, testsPassed: true, diffSnippet: "+ export const SESSION_TIMEOUT = 3600;" },
    });
  }
  // Processes
  if (globalStore.listProcesses().length === 0) {
    globalStore.createProcess({
      id: "proc-request-review",
      title: "Request Review",
      version: 4,
      sourceType: "manual",
      description: "Sample request-review workflow for a generic workspace.",
      steps: [
        { id: "s1", sequence: 1, title: "Receive request", instruction: "Record the request details and source." },
        { id: "s2", sequence: 2, title: "Review request", instruction: "Confirm scope, priority, and any missing evidence." },
        { id: "s3", sequence: 3, title: "Collect evidence", instruction: "Collect the supporting files required before review." },
      ],
      inputs: [],
      outputs: [],
      unresolvedRules: [{
        id: "rule-request-escalation",
        processId: "proc-request-review",
        stepId: "s2",
        question: "When should a request be escalated?",
        description: "The escalation threshold has not been defined.",
        severity: "warning",
        resolved: false,
      }],
      lastSynchronizedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  // Messages (seed into general channel)
  const generalMessages = globalStore.listMessages("chan-general", 10);
  if (generalMessages.length === 0) {
    globalStore.createMessage({ channelId: "chan-general", authorId: "agent-alex", authorType: "agent", content: "Local demo workspace initialized. Provider connections are not configured." });
    globalStore.createMessage({ channelId: "chan-general", authorId: "user-owner", authorType: "user", content: "Run the local test suite and report status." });
    globalStore.createMessage({ channelId: "chan-general", authorId: "agent-alex", authorType: "agent", content: "This workspace contains sample data only; no external provider was contacted." });
  }
}
seedDemoData();

function handleApiRoute(req: http.IncomingMessage, res: http.ServerResponse, url: URL): void {
  const path = url.pathname;
  const method = req.method;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
    res.end();
    return;
  }

  try {
    if (method === "GET" && path === "/api/status") {
      const agents = globalStore.listAgents();
      const tasks = globalStore.listTasks();
      const approvals = globalStore.listApprovals("pending");
      const channels = globalStore.listChannels();
      res.writeHead(200);
      res.end(JSON.stringify({ status: "active", version: "0.1.0-alpha", agents: agents.length, tasks: tasks.length, approvals: approvals.length, channels: channels.length }));
    } else if (method === "GET" && path === "/api/agents") {
      res.writeHead(200);
      res.end(JSON.stringify(globalStore.listAgents()));
    } else if (method === "GET" && path === "/api/tasks") {
      res.writeHead(200);
      res.end(JSON.stringify(globalStore.listTasks()));
    } else if (method === "GET" && path === "/api/approvals") {
      res.writeHead(200);
      res.end(JSON.stringify(globalStore.listApprovals()));
    } else if (method === "POST" && path === "/api/approvals/resolve") {
      let body = "";
      req.on("data", (chunk: Buffer) => body += chunk);
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          const result = globalStore.resolveApproval({
            approvalId: parsed.id,
            status: parsed.action === "approve" ? "approved" : "rejected",
            approverUserId: "user-owner",
            decisionOrigin: "web",
          });
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, approval: result }));
        } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: String(e) })); }
      });
      return;
    } else if (method === "GET" && path === "/api/workspace") {
      const ws = globalStore.getWorkspace();
      const spaces = globalStore.listSpaces();
      const channels = globalStore.listChannels();
      res.writeHead(200);
      res.end(JSON.stringify({ workspace: ws, spaces, channels }));
    } else if (method === "GET" && path === "/api/processes") {
      res.writeHead(200);
      res.end(JSON.stringify(globalStore.listProcesses()));
    } else if (method === "GET" && path === "/api/messages") {
      const channelId = url.searchParams.get("channelId") || "chan-general";
      res.writeHead(200);
      res.end(JSON.stringify(globalStore.listMessages(channelId, 50)));
    } else if (method === "POST" && path === "/api/messages") {
      let body = "";
      req.on("data", (chunk: Buffer) => body += chunk);
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          const msg = globalStore.createMessage({ channelId: parsed.channelId || "chan-general", authorId: "user-owner", authorType: "user", content: parsed.content });
          res.writeHead(201);
          res.end(JSON.stringify(msg));
        } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: String(e) })); }
      });
      return;
    } else if (method === "POST" && path === "/api/tasks") {
      let body = "";
      req.on("data", (chunk: Buffer) => body += chunk);
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          const task = globalStore.createTask(parsed);
          res.writeHead(201);
          res.end(JSON.stringify(task));
        } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: String(e) })); }
      });
      return;
    } else if (method === "GET" && path === "/api/inbox") {
      res.writeHead(200);
      res.end(JSON.stringify(globalStore.getUnifiedInbox()));
    } else if (method === "GET" && path === "/api/packages") {
      res.writeHead(200);
      res.end(JSON.stringify(globalStore.listPackages()));
    } else if (method === "GET" && path === "/api/models") {
      res.writeHead(200);
      res.end(JSON.stringify(PROVIDER_READINESS_REGISTRY.filter(p => p.category === "generative_model")));
    } else if (method === "GET" && path === "/api/migration/sources") {
      res.writeHead(200);
      res.end(JSON.stringify([
        { id: "openclaw-legacy", name: "OpenClaw (Legacy)", status: "fixture_verified" },
        { id: "openclaw-current", name: "OpenClaw (Current)", status: "fixture_verified" },
        { id: "hermes", name: "Hermes Agent", status: "fixture_verified" },
        { id: "grok", name: "Grok Bot", status: "partial_support" },
        { id: "generic", name: "Generic Import", status: "supported" },
      ]));
    } else if (method === "GET" && path === "/api/readiness") {
      res.writeHead(200);
      res.end(JSON.stringify(PROVIDER_READINESS_REGISTRY));
    } else if (method === "GET" && path === "/api/calls") {
      res.writeHead(200);
      res.end(JSON.stringify(globalStore.listCalls()));
    } else if (method === "GET" && path === "/api/audit") {
      res.writeHead(200);
      res.end(JSON.stringify(globalStore.listAuditEntries(50)));
    } else if (method === "POST" && path === "/api/agents") {
      let body = "";
      req.on("data", (chunk: Buffer) => body += chunk);
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          const agent = globalStore.createAgent(parsed);
          res.writeHead(201);
          res.end(JSON.stringify(agent));
        } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: String(e) })); }
      });
      return;
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: { message: "Not found", type: "invalid_request_error" } }));
    }
  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: { message: String(e), type: "server_error" } }));
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  try {
    if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
      await handleChatCompletions(req, res);
    } else if (req.method === "GET" && url.pathname === "/health") {
      handleHealth(req, res);
    } else if (req.method === "GET" && url.pathname === "/version") {
      handleVersion(req, res);
    } else if (req.method === "GET" && url.pathname === "/events") {
      handleEvents(req, res);
    } else if (req.method === "GET" && url.pathname === "/metrics.csv") {
      handleMetricsCsv(req, res);
    } else if (req.method === "GET" && url.pathname === "/summary/daily") {
      handleDailySummary(req, res);
    } else if (req.method === "GET" && url.pathname === "/dashboard.json") {
      handleDashboardJson(req, res);
    } else if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/app")) {
      handleApp(req, res);
    } else if (req.method === "GET" && url.pathname === "/dashboard") {
      handleDashboard(req, res);
    } else if (req.method === "GET" && url.pathname === "/settings") {
      handleSettingsPage(req, res);
    } else if (req.method === "GET" && url.pathname === "/api/settings") {
      handleGetSettings(req, res);
    } else if (req.method === "POST" && url.pathname === "/api/settings") {
      await handleSaveSettings(req, res);
    } else if (url.pathname.startsWith("/api/")) {
      handleApiRoute(req, res, url);
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Not found", type: "invalid_request_error" } }));
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[AgentForge] Server error:", msg);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Internal server error", type: "server_error" } }));
  }
});

// --- Keep-Warm Daemon ---
// Sends periodic tiny requests to configured Ollama models to prevent eviction
// from the model's loaded-model cache (5-minute idle timeout by default).
interface KeepWarmStatus {
  enabled: boolean;
  models: string[];
  intervalMs: number;
  lastRun: Record<string, { timestamp: string; latencyMs: number; ok: boolean; error?: string }>;
}

const keepWarmStatus: KeepWarmStatus = {
  enabled: KEEP_WARM_ENABLED,
  models: KEEP_WARM_MODELS,
  intervalMs: KEEP_WARM_INTERVAL_MS,
  lastRun: {},
};

async function pingOllamaModel(model: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const url = `${OLLAMA_BASE_URL}/v1/chat/completions`;
  const body = JSON.stringify({
    model,
    messages: [{ role: "user", content: "." }],
    stream: false,
  });
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(120000),
    });
    const latency = Date.now() - start;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, latencyMs: latency, error: `${res.status}: ${text.slice(0, 100)}` };
    }
    return { ok: true, latencyMs: latency };
  } catch (err) {
    const latency = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, latencyMs: latency, error: msg };
  }
}

let keepWarmTimer: NodeJS.Timeout | null = null;

async function runKeepWarmCycle() {
  for (const model of KEEP_WARM_MODELS) {
    const result = await pingOllamaModel(model);
    keepWarmStatus.lastRun[model] = {
      timestamp: new Date().toISOString(),
      latencyMs: result.latencyMs,
      ok: result.ok,
      error: result.error,
    };
    if (result.ok) {
      console.log(`[keep-warm] ${model}: ok (${result.latencyMs}ms)`);
    } else {
      console.warn(`[keep-warm] ${model}: FAIL (${result.latencyMs}ms) ${result.error || ""}`);
    }
  }
}

if (KEEP_WARM_ENABLED) {
  console.log(`[AgentForge] Keep-warm: enabled for ${KEEP_WARM_MODELS.join(", ")} every ${KEEP_WARM_INTERVAL_MS}ms`);
  // Run first cycle after 10 seconds (let server fully start)
  setTimeout(() => {
    runKeepWarmCycle().catch(() => {});
    keepWarmTimer = setInterval(() => {
      runKeepWarmCycle().catch(() => {});
    }, KEEP_WARM_INTERVAL_MS);
  }, 10000);
}

// --- Real Embedding Provider Initialization ---
// Replaces hash-fallback with real embeddings (Ollama nomic-embed-text by default).
// This enables semantic memory, which in turn enables memory bypass.
import { getRealEmbeddingProvider, type RealEmbeddingProviderConfig } from "./embeddingAdapter.js";

const embeddingConfig: RealEmbeddingProviderConfig = {
  provider: (EMBEDDING_PROVIDER as RealEmbeddingProviderConfig["provider"]) || "ollama",
  baseUrl: EMBEDDING_BASE_URL,
  model: EMBEDDING_MODEL,
  fallbackToHash: true,
};

setTimeout(async () => {
  try {
    const provider = await getRealEmbeddingProvider(embeddingConfig);
    const status = provider.getStatus();
    setEmbeddingProviderStatus({
      active: status.active,
      provider: status.provider,
      model: status.model,
      mode: status.mode,
      dimension: status.dimension,
    });
    if (status.active && status.mode === "real") {
      console.log(`[AgentForge] Embeddings: real provider active (${status.provider}/${status.model}, dim=${status.dimension})`);
      setMemoryBypassEnabled(true);
    } else {
      console.log(`[AgentForge] Embeddings: hash-fallback (real provider unavailable: ${status.error || "unknown"})`);
    }
  } catch (error) {
    console.log(`[AgentForge] Embedding init failed: ${error}`);
  }
}, 2000);

if (process.argv[1] &&
    (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.js"))) {
  server.listen(PORT, () => {
    console.log(`[AgentForge] Server running on http://localhost:${PORT}`);
    console.log(`[AgentForge] Optimization: ${OPTIMIZATION_ENABLED ? "enabled" : "disabled"}`);
    console.log(`[AgentForge] Provider: ${PROVIDER}/${MODEL}`);
    console.log(`[AgentForge] API Key: ${OPENAI_API_KEY ? "configured" : "NOT SET (mock mode)"}`);
    console.log(`[AgentForge] Metadata: ${METADATA_ENABLED ? "enabled" : "disabled"}`);
    if (PROVIDER === "ollama") {
      console.log(`[AgentForge] Ollama URL: ${OLLAMA_BASE_URL}`);
    }
    if (PROVIDER === "mimo") {
      console.log(`[AgentForge] MiMo URL: ${MIMO_BASE_URL}`);
      console.log(`[AgentForge] MiMo Key: ${MIMO_API_KEY ? "configured" : "NOT SET"}`);
    }
    console.log(`[AgentForge] Dashboard: http://localhost:${PORT}/dashboard`);
  });
}

export { server, collectMetrics, buildOpenAIResponse, optimizer, requestLog, keepWarmStatus };
