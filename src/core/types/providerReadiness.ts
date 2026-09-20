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
    summary: "Pi harness adapter contract and subprocess execution protocol.",
    productionReady: false,
    notes: "Upstream official Pi package (@mariofg/pi or pi-ai) is not installed in local environment; clean public adapter and subprocess protocol active. Classified as TEST_IMPLEMENTATION pending packaging.",
  },
  {
    providerId: "harness-pydantic",
    name: "Pydantic AI Harness",
    category: "harness",
    readiness: "NOT_CONFIGURED",
    summary: "Structured output validation and schema enforcement layer (Python backend optional).",
    productionReady: false,
    notes: "Optional Python runtime not required for core AgentForge execution. When Python/pydantic service is absent, reports NOT_CONFIGURED (not BROKEN).",
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
    productionReady: true,
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
    summary: "Capability-separated process ingestion: file import (REAL), MCP (NOT_CONFIGURED), sync (UNIMPLEMENTED).",
    productionReady: true,
    notes: "Scribe file import is REAL_INTEGRATION; MCP is NOT_CONFIGURED; live sync is UNIMPLEMENTED.",
    capabilities: [
      { capability: "file_import", readiness: "REAL_INTEGRATION", notes: "Full Markdown, HTML, and SOP step parser" },
      { capability: "mcp_integration", readiness: "NOT_CONFIGURED", notes: "Scribe MCP server not configured in local environment" },
      { capability: "live_sync", readiness: "UNIMPLEMENTED", notes: "Continuous cloud workspace sync not implemented" },
    ],
  },
];
