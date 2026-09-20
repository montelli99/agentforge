/**
 * Provider Readiness Reality Matrix
 * Sections 36, 37, 38, 39: Honest Readiness Labels
 * 
 * "Do NOT call a skeleton production-ready."
 * Accurately reports the implementation state of every provider candidate in AgentForge vNext.
 */

export type ProviderReadiness =
  | "REAL_INTEGRATION"
  | "PARTIAL"
  | "MOCK"
  | "SKELETON"
  | "TEST_IMPLEMENTATION";

export interface ProviderReadinessInfo {
  providerId: string;
  name: string;
  category: "harness" | "generative_model" | "decision" | "voice" | "process" | "channel" | "memory";
  readiness: ProviderReadiness;
  summary: string;
  productionReady: boolean;
  notes: string;
}

export const PROVIDER_READINESS_REGISTRY: ProviderReadinessInfo[] = [
  {
    providerId: "harness-pi",
    name: "Pi Harness Provider",
    category: "harness",
    readiness: "TEST_IMPLEMENTATION",
    summary: "Simulated native Pi execution candidate with task lifecycle and resume tokens.",
    productionReady: false,
    notes: "Default candidate protocol implemented in staging. Real binary linkage requires packaging.",
  },
  {
    providerId: "harness-pydantic",
    name: "Pydantic AI Harness",
    category: "harness",
    readiness: "PARTIAL",
    summary: "Structured output validation, schema enforcement, and tool extraction layer.",
    productionReady: false,
    notes: "Validation contract active. Python backend service is pluggable via RPC/REST.",
  },
  {
    providerId: "harness-native",
    name: "AgentForge Native Harness",
    category: "harness",
    readiness: "REAL_INTEGRATION",
    summary: "Native boundary-enforcing harness executing strictly within ExecutionContract gates.",
    productionReady: true,
    notes: "Enforces path sandboxing, spend limits, bash pattern blocking, and evidence generation.",
  },
  {
    providerId: "decision-jev",
    name: "Jev Decision Provider",
    category: "decision",
    readiness: "TEST_IMPLEMENTATION",
    summary: "In-memory fast System-1 intent and risk classifier.",
    productionReady: false,
    notes: "Does NOT touch production Vercel. Simulates sub-50ms deterministic classification for staging.",
  },
  {
    providerId: "model-ollama",
    name: "Ollama Model Provider",
    category: "generative_model",
    readiness: "PARTIAL",
    summary: "Local REST adapter for Ollama endpoint (/api/chat, /api/generate).",
    productionReady: false,
    notes: "Adapter skeleton complete. Falls back to mock responses if local Ollama daemon is offline.",
  },
  {
    providerId: "model-openai",
    name: "OpenAI Model Provider",
    category: "generative_model",
    readiness: "PARTIAL",
    summary: "Standard OpenAI ChatCompletions REST adapter with fallback chain.",
    productionReady: false,
    notes: "Adapter skeleton ready. Requires owner-supplied staging API key; production keys are blocked.",
  },
  {
    providerId: "voice-retell",
    name: "Retell Voice Provider",
    category: "voice",
    readiness: "SKELETON",
    summary: "Provider-neutral telephony contract skeleton for Retell AI.",
    productionReady: false,
    notes: "Does NOT place live telephony calls. Outbound calls produce simulated workspace events.",
  },
  {
    providerId: "voice-mock",
    name: "Mock Voice Simulator",
    category: "voice",
    readiness: "REAL_INTEGRATION",
    summary: "Full-fidelity voice call simulator emitting audio transcripts, tool calls, and dispositions.",
    productionReady: true,
    notes: "Provides deterministic simulation for UI testing, staging QA, and workspace event integration.",
  },
  {
    providerId: "process-scribe",
    name: "Scribe Process Provider",
    category: "process",
    readiness: "REAL_INTEGRATION",
    summary: "Full Markdown, HTML, and Scribe step-by-step SOP parser.",
    productionReady: true,
    notes: "Parses procedures, conditional branches, and flags UnresolvedBusinessRules deterministically.",
  },
];
