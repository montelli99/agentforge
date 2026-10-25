import fs from "node:fs";
import path from "node:path";
import { OpenAIModelProvider } from "./openaiModel.js";
import type { GenerativeModelProvider, ModelRequestOptions } from "../../core/providers/model.js";

export const modelConnectionCatalog = [
  { id: "openai", name: "OpenAI API", baseUrl: "https://api.openai.com/v1", billing: "API usage", docs: "https://developers.openai.com/api/docs/quickstart" },
  { id: "anthropic", name: "Claude API (compatibility mode)", baseUrl: "https://api.anthropic.com/v1", billing: "API usage", docs: "https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk" },
  { id: "google", name: "Gemini API (compatibility mode)", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", billing: "API project quota/billing", docs: "https://ai.google.dev/gemini-api/docs/openai" },
  { id: "deepseek", name: "DeepSeek API", baseUrl: "https://api.deepseek.com", billing: "API usage", docs: "https://api-docs.deepseek.com/" },
  { id: "xai", name: "Grok API", baseUrl: "https://api.x.ai/v1", billing: "API usage", docs: "https://docs.x.ai/" },
  { id: "local", name: "Local OpenAI-compatible server", baseUrl: "http://127.0.0.1:11434/v1", billing: "Local compute; cloud-backed models may bill separately", docs: "https://docs.ollama.com/api/openai-compatibility" },
  { id: "compatible", name: "Custom compatible API", baseUrl: "", billing: "Endpoint owner's billing", docs: "https://developers.openai.com/api/docs/guides/text" },
] as const;

export const subscriptionConnectionCatalog = [
  { name: "ChatGPT / Codex", mode: "Official Codex CLI sign-in", setup: "Use codex login in a dedicated CODEX_HOME. The existing AgentForge codex-cli route is a bounded plan-draft adapter, not a general chat subscription API. Configure AGENTFORGE_PLAN_PROVIDER=codex-cli and AGENTFORGE_PLAN_CLI_CONFIG. No API fallback.", docs: "https://learn.chatgpt.com/docs/auth", integrated: "plan drafts only" },
  { name: "Claude subscription", mode: "Official unmodified Claude Code", setup: "Sign in through Claude Code itself. AgentForge does not collect Claude account tokens or route subscription tokens to its chat API. Use the Claude API connection for AgentForge chat; embedding a managed Claude Code worker remains separate work.", docs: "https://code.claude.com/docs/en/legal-and-compliance", integrated: "external client only" },
  { name: "Google account / AI Pro / Ultra", mode: "Official Gemini CLI", setup: "Run Gemini CLI and choose Sign in with Google using the eligible account. This does not create a Gemini API key. Use the Gemini API connection for AgentForge chat; a managed Gemini CLI worker is not yet integrated.", docs: "https://geminicli.com/docs/get-started/authentication/", integrated: "external client only" },
  { name: "Other chat subscriptions", mode: "Provider-specific", setup: "A consumer chat subscription is not an API credential. No subscription-token bridge is implemented for Grok or DeepSeek. Use their API keys unless the provider documents a supported integration.", docs: "https://api-docs.deepseek.com/", integrated: "not integrated" },
];

export interface ModelConnectionProfile { id: string; provider: string; models: string[]; apiKeyEnv?: string; baseUrl?: string }
export function readModelConnections(file: string, env: NodeJS.ProcessEnv = process.env) {
  if (!path.isAbsolute(file)) throw new Error("Model connections file must use an absolute path. Keep it outside the project.");
  if (fs.statSync(file).size > 65536) throw new Error("Model connections file exceeds 64 KB.");
  const profiles: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(profiles) || !profiles.length || profiles.length > 20) throw new Error("Supply 1–20 model connection profiles.");
  return configureModelConnections(profiles, env);
}

export function configureModelConnections(profiles: ModelConnectionProfile[], env: NodeJS.ProcessEnv) {
  const routes = new Map<string, { provider: GenerativeModelProvider; model: string; profile: string; billing: string; maxTokens?: number }>();
  const ids = new Set<string>();
  for (const profile of profiles) {
    if (!profile || Object.keys(profile).some(key => !["id", "provider", "models", "apiKeyEnv", "baseUrl"].includes(key))) throw new Error("Profiles contain only routing settings and secret environment-variable references, never credentials.");
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(profile.id) || ids.has(profile.id)) throw new Error("Connection IDs must be unique lowercase names.");
    ids.add(profile.id);
    const preset = modelConnectionCatalog.find(item => item.id === profile.provider);
    if (!preset) throw new Error("Unknown API connection provider; subscription credentials cannot be used as API keys.");
    if (!Array.isArray(profile.models) || !profile.models.length || profile.models.length > 50 || profile.models.some(model => typeof model !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(model))) throw new Error("Supply explicit model identifiers available to this account.");
    const base = profile.baseUrl || preset.baseUrl;
    if (!["local", "compatible"].includes(preset.id) && base.replace(/\/$/, "") !== preset.baseUrl) throw new Error("Use a custom compatible profile for a different endpoint; provider billing labels must match the destination.");
    const url = new URL(base);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || !(url.protocol === "https:" || (url.protocol === "http:" && loopback))) throw new Error("Use HTTPS or loopback HTTP without embedded credentials, query or fragment.");
    if (preset.id === "local" && !loopback) throw new Error("Local profiles must use a loopback server.");
    if (profile.apiKeyEnv && !/^AGENTFORGE_KEY_[A-Z0-9_]+$/.test(profile.apiKeyEnv)) throw new Error("Use a dedicated AGENTFORGE_KEY_* secret reference.");
    const key = profile.apiKeyEnv ? env[profile.apiKeyEnv] : undefined;
    if (preset.id !== "local" && !key?.trim()) throw new Error(`Connection ${profile.id} needs its dedicated API credential.`);
    const provider = new OpenAIModelProvider(key || "local-not-a-secret", base.replace(/\/$/, ""), profile.id, preset.name);
    for (const model of profile.models) {
      const route = `${profile.id}::${model}`;
      if (routes.has(route)) throw new Error("Duplicate model route.");
      routes.set(route, { provider, model, profile: profile.id, billing: preset.billing, ...(preset.id === "anthropic" ? { maxTokens: 4096 } : {}) });
    }
  }
  const select = (options: ModelRequestOptions) => {
    const route = routes.get(options.model);
    if (!route) throw new Error("Select a configured model route. No automatic billing fallback is allowed.");
    return { route, request: { ...options, model: route.model, maxTokens: options.maxTokens ?? route.maxTokens } };
  };
  const provider: GenerativeModelProvider = {
    id: "explicit-model-connections", name: "Explicit model connections", defaultTier: 4,
    isAvailable: async () => routes.size > 0, listModels: async () => [...routes.keys()],
    generate: async options => { const { route, request } = select(options); return route.provider.generate(request); },
    async *stream(options) { const { route, request } = select(options); yield* route.provider.stream(request); },
  };
  return { provider, models: [...routes.keys()], connections: [...routes].map(([model, route]) => ({ model, connection: route.profile, billing: route.billing, status: "configured; not live-verified" })) };
}
