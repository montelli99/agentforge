/**
 * Provider Readiness Reality Matrix
 * Sections 36, 37, 38, 39: Honest Readiness Labels
 * 
 * "Do NOT call a skeleton production-ready."
 * Accurately reports the implementation state of every provider candidate in AgentForge vNext.
 */

export type ProviderReadiness =
  | "REAL_INTEGRATION"
  | "PARTIAL_INTEGRATION"
  | "PARTIAL"
  | "MOCK"
  | "SKELETON"
  | "TEST_IMPLEMENTATION"
  | "NOT_CONFIGURED"
  | "UNIMPLEMENTED";

export interface CapabilityReadiness {
  capability: string;
  readiness: ProviderReadiness;
  notes: string;
}

export interface ProviderReadinessInfo {
  providerId: string;
  name: string;
  category: "harness" | "generative_model" | "decision" | "voice" | "process" | "channel" | "memory";
  readiness: ProviderReadiness;
  summary: string;
  productionReady: boolean;
  notes: string;
  capabilities?: CapabilityReadiness[];
}

export const PROVIDER_READINESS_REGISTRY: ProviderReadinessInfo[] = [
  {
    providerId: "harness-pi",
    name: "Pi Harness Provider",
    category: "harness",
    readiness: "TEST_IMPLEMENTATION",
    summary: "Test fixture for the planned Pi harness adapter; no real task runtime is configured.",
    productionReady: false,
    notes: "Only explicit contract simulation is available. The official Pi SDK is not integrated, advertised runtime capabilities are disabled, and default task execution fails without running the task.",
  },
  {
    providerId: "harness-pydantic",
    name: "Pydantic AI Harness",
    category: "harness",
    readiness: "NOT_CONFIGURED",
    summary: "Optional Pydantic harness slot; no Python service adapter is implemented.",
    productionReady: false,
    notes: "A bridge URL alone does not configure the provider. Only explicit local simulation is available; default task execution fails without running the task.",
  },
  {
    providerId: "harness-native",
    name: "AgentForge Native Harness",
    category: "harness",
    readiness: "TEST_IMPLEMENTATION",
    summary: "Synthetic native harness that exercises the harness contract and selected contract checks.",
    productionReady: false,
    notes: "Returns simulated task results. It does not provide an OS sandbox or enforce every ExecutionContract field; do not use as a production execution boundary.",
  },
  {
    providerId: "decision-jev",
    name: "Jev Decision Provider",
    category: "decision",
    readiness: "TEST_IMPLEMENTATION",
    summary: "Standalone AgentForge-owned reference System-1 classifier.",
    productionReady: false,
    notes: "Does NOT touch production Vercel. Independent reference implementation without shared production credentials.",
  },
  {
    providerId: "model-ollama",
    name: "Ollama Model Provider",
    category: "generative_model",
    readiness: "PARTIAL_INTEGRATION",
    summary: "Local REST adapter for Ollama endpoint (/api/chat, /api/tags, /api/generate).",
    productionReady: false,
    notes: "Discovers models dynamically. Falls back cleanly with $0 external API cost if local daemon is offline.",
  },
  {
    providerId: "model-openai",
    name: "OpenAI-Compatible Model Provider",
    category: "generative_model",
    readiness: "PARTIAL_INTEGRATION",
    summary: "Provider-neutral ChatCompletions REST gateway (OpenAI, OpenRouter, LocalAI, vLLM).",
    productionReady: false,
    notes: "Configurable baseUrl and model routing. Zero production OpenAI credentials used or required in staging.",
  },
  {
    providerId: "model-mimo",
    name: "Xiaomi MiMo Model Provider",
    category: "generative_model",
    readiness: "PARTIAL_INTEGRATION",
    summary: "OpenAI-compatible adapter for Xiaomi MiMo Token Plan (mimo-v2.5, mimo-v2.5-pro).",
    productionReady: false,
    notes: "OpenAI-compatible adapter code exists. This registry does not contain a repeatable, current live-acceptance record; credentials and service behavior must be verified in the deployment environment.",
    capabilities: [
      { capability: "text_generation", readiness: "PARTIAL_INTEGRATION", notes: "Adapter request path is implemented; a repeatable current live smoke is not recorded here." },
      { capability: "vision", readiness: "TEST_IMPLEMENTATION", notes: "Provider/model capability has not been verified through an end-to-end image request in this project." },
      { capability: "tool_calling", readiness: "TEST_IMPLEMENTATION", notes: "OpenAI-compatible tool_calls format supported; not yet tested live" },
      { capability: "structured_output", readiness: "TEST_IMPLEMENTATION", notes: "JSON mode supported via OpenAI-compatible protocol; not yet tested live" },
      { capability: "streaming", readiness: "TEST_IMPLEMENTATION", notes: "SSE parsing is implemented; live end-to-end acceptance is not established here." },
    ],
  },
  {
    providerId: "voice-retell",
    name: "Retell Voice Provider",
    category: "voice",
    readiness: "SKELETON",
    summary: "Provider-neutral telephony contract skeleton for Retell AI.",
    productionReady: false,
    notes: "SKELETON only. No live calls placed or credentials required; awaiting owner staging credentials.",
  },
  {
    providerId: "voice-mock",
    name: "Mock Voice Simulator",
    category: "voice",
    readiness: "MOCK",
    summary: "Full-fidelity voice call simulator emitting audio transcripts, tool calls, and dispositions.",
    productionReady: false,
    notes: "Release demo provider for local QA, staging, and workspace event integration without telephony cost.",
  },
  {
    providerId: "voice-agni",
    name: "AGNI Voice Provider Slot",
    category: "voice",
    readiness: "UNIMPLEMENTED",
    summary: "Future benchmark candidate slot for AGNI voice integration.",
    productionReady: false,
    notes: "EXACT AGNI PRODUCT NOT YET VERIFIED. Future benchmark candidate.",
  },
  {
    providerId: "process-scribe",
    name: "Scribe Process Provider",
    category: "process",
    readiness: "PARTIAL_INTEGRATION",
    summary: "Capability-separated local process parser, with MCP and cloud sync not available.",
    productionReady: false,
    notes: "Local content parsing is implemented; this does not mean a Scribe cloud integration. MCP is NOT_CONFIGURED; live sync is UNIMPLEMENTED.",
    capabilities: [
      { capability: "file_import", readiness: "TEST_IMPLEMENTATION", notes: "Local Markdown, HTML, and SOP content parsing; no live Scribe service connection." },
      { capability: "mcp_integration", readiness: "NOT_CONFIGURED", notes: "Scribe MCP server not configured in local environment" },
      { capability: "live_sync", readiness: "UNIMPLEMENTED", notes: "Continuous cloud workspace sync not implemented" },
    ],
  },
];
