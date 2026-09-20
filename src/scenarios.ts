import {
  DEFAULT_AGENTFORGE_BRIDGE_PROFILE,
  type AgentForgeBridgeProfile,
} from "./bridge.js";
import type { AgentForgeContext, RuntimeKind, ScenarioOutcome } from "./types.js";

export type LabScenario = {
  id: string;
  name: string;
  expected: ScenarioOutcome;
  context: AgentForgeContext;
};

const base: Omit<
  AgentForgeContext,
  "selectedRuntime" | "selectedTransport" | "selectedModel" | "imageModel"
> = {
  tenantId: "tenant-a",
  trustTier: "T1",
  sideEffecting: false,
  auditAvailable: true,
  reflection: { preflight: "approve", postResult: "approve" },
};

function runtime(selectedRuntime: RuntimeKind): Pick<AgentForgeContext, "selectedRuntime"> {
  return { selectedRuntime };
}

function transport(selectedTransport: AgentForgeContext["selectedTransport"]): Pick<AgentForgeContext, "selectedTransport"> {
  return { selectedTransport };
}

export function getScenarios(
  profile: AgentForgeBridgeProfile = DEFAULT_AGENTFORGE_BRIDGE_PROFILE,
): LabScenario[] {
  return [
    {
      id: "S1",
      name: "OpenClaw local only",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
      },
    },
    {
      id: "S2",
      name: "Hermes private mesh",
      expected: "pass",
      context: {
        ...base,
        ...runtime("hermes"),
        ...transport("mesh"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
      },
    },
    {
      id: "S3",
      name: "Public ingress private origin",
      expected: "pass",
      context: {
        ...base,
        ...runtime("other"),
        ...transport("public-ingress"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
      },
    },
    {
      id: "S4",
      name: "Secure MCP tunnel",
      expected: "pass",
      context: {
        ...base,
        ...runtime("other"),
        ...transport("tunnel"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
      },
    },
    {
      id: "S5",
      name: "Side effecting request",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
        sideEffecting: true,
      },
    },
    {
      id: "S6",
      name: "Ambiguous runtime match",
      expected: "reject",
      context: { ...base, selectedRuntime: undefined, selectedTransport: undefined, fault: "ambiguous-route" },
    },
    {
      id: "S7",
      name: "Adapter schema drift",
      expected: "reject",
      context: { ...base, ...runtime("hermes"), ...transport("mesh"), fault: "adapter-schema-drift" },
    },
    {
      id: "S8",
      name: "Authentication failure",
      expected: "reject",
      context: { ...base, ...runtime("hermes"), ...transport("tunnel"), fault: "auth-failure" },
    },
    {
      id: "S9",
      name: "Partial runtime response",
      expected: "quarantine",
      context: {
        ...base,
        ...runtime("other"),
        ...transport("mcp"),
        fault: "partial-response",
        reflection: { preflight: "approve", postResult: "approve" },
      },
    },
    {
      id: "S10",
      name: "Conflicting reflection verdicts",
      expected: "quarantine",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        fault: "post-result-reject",
        reflection: { preflight: "approve", postResult: "reject" },
      },
    },
    {
      id: "S11",
      name: "Audit store failure",
      expected: "fail-closed",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        sideEffecting: true,
        auditAvailable: false,
        fault: "audit-unavailable",
      },
    },
    {
      id: "S12",
      name: "Concurrent run isolation",
      expected: "pass",
      context: { ...base, ...runtime("hermes"), ...transport("mesh") },
    },
    {
      id: "S13",
      name: "Fallback exhaustion",
      expected: "reject",
      context: { ...base, selectedRuntime: undefined, selectedTransport: undefined, fault: "fallback-exhausted" },
    },
    {
      id: "S14",
      name: "Preflight revision request",
      expected: "reroute",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        reflection: { preflight: "revise", postResult: "approve" },
      },
    },
    {
      id: "S15",
      name: "Optimization enabled - cost-aware routing",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: { provider: "anthropic", model: "claude-opus-4-6" },
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          costAwareRouting: true,
          maxCostUsd: 0.001,
        },
      },
    },
    {
      id: "S16",
      name: "Optimization enabled - compression",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          promptCompression: true,
          contextDeduplication: true,
        },
      },
    },
    {
      id: "S17",
      name: "Optimization enabled - cache hit",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          exactCache: true,
          semanticCache: true,
        },
      },
    },
    {
      id: "S18",
      name: "Optimization enabled - explicit model respected",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: { provider: "anthropic", model: "claude-opus-4-6" },
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          respectRequestedModel: true,
        },
      },
    },
    {
      id: "S19",
      name: "Optimization enabled - provider failover",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: { provider: "anthropic", model: "claude-opus-4-6" },
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          providerFailover: true,
        },
      },
    },
    {
      id: "S20",
      name: "Optimization disabled - no-op",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
        optimization: {
          enabled: false,
        },
      },
    },
    {
      id: "S21",
      name: "Optimization - policy blocks cheaper model",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: { provider: "anthropic", model: "claude-opus-4-6" },
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          costAwareRouting: true,
          maxCostUsd: 0.0001,
        },
      },
    },
    {
      id: "S22",
      name: "Optimization - high complexity task",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          costAwareRouting: true,
        },
      },
    },
    {
      id: "S23",
      name: "Delta transmission - multi-turn conversation",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          deltaTransmission: true,
        },
      },
    },
    {
      id: "S24",
      name: "Semantic memory - cross-request similarity",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          semanticCache: true,
          contextFingerprinting: true,
        },
      },
    },
    {
      id: "S25",
      name: "Provider-specific optimization - Claude",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: { provider: "anthropic", model: "claude-sonnet-4-6" },
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          providerOptimization: true,
        },
      },
    },
    {
      id: "S26",
      name: "Provider-specific optimization - OpenAI",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: { provider: "openai", model: "gpt-4o" },
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          providerOptimization: true,
        },
      },
    },
    {
      id: "S27",
      name: "Speculative execution - cheapest-first",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          speculativeExecution: true,
          speculativeStrategy: "cheapest-first",
        },
      },
    },
    {
      id: "S28",
      name: "Cost ledger - tenant tracking",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          costLedger: true,
        },
      },
    },
    {
      id: "S29",
      name: "Context fingerprinting - similarity matching",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          contextFingerprinting: true,
        },
      },
    },
    {
      id: "S30",
      name: "Full Phase 2 optimization stack",
      expected: "pass",
      context: {
        ...base,
        ...runtime("openclaw"),
        ...transport("stdio"),
        selectedModel: profile.model,
        imageModel: profile.imageModel,
        optimization: {
          enabled: true,
          costAwareRouting: true,
          exactCache: true,
          semanticCache: true,
          promptCompression: true,
          contextDeduplication: true,
          deltaTransmission: true,
          providerOptimization: true,
          speculativeExecution: true,
          costLedger: true,
          contextFingerprinting: true,
          semanticMemory: true,
        },
      },
    },
  ];
}
