export type TrustTier = "T0" | "T1" | "T2" | "T3";
export type TransportKind = "stdio" | "mcp" | "mesh" | "tunnel" | "public-ingress";
export type RuntimeKind = "openclaw" | "hermes" | "other";
export type ReflectionDecision = "approve" | "revise" | "reject";
export type ScenarioOutcome =
  | "pass"
  | "reject"
  | "retry"
  | "reroute"
  | "quarantine"
  | "fail-closed"
  | "buffer-and-alert";

export type AgentForgeModelChoice = {
  provider: string;
  model: string;
};

export type AgentForgeContext = {
  tenantId?: string;
  selectedRuntime?: RuntimeKind;
  selectedTransport?: TransportKind;
  selectedModel?: AgentForgeModelChoice;
  imageModel?: AgentForgeModelChoice;
  trustTier: TrustTier;
  sideEffecting: boolean;
  auditAvailable: boolean;
  fault?: string;
  reflection: {
    preflight: ReflectionDecision;
    postResult: ReflectionDecision;
  };
};

export type CanonicalEnvelope = {
  runId: string;
  runtimeId: RuntimeKind;
  transport: TransportKind;
  trustTier: TrustTier;
  sideEffecting: boolean;
  idempotencyKey?: string;
  model: AgentForgeModelChoice;
  imageModel?: AgentForgeModelChoice;
  request: Record<string, unknown>;
  policy: Record<string, unknown>;
  reflection: {
    preflight: ReflectionDecision;
    postResult: ReflectionDecision;
  };
};

export type RuntimeRequest = {
  runtime: RuntimeKind;
  transport: TransportKind;
  model: AgentForgeModelChoice;
  imageModel?: AgentForgeModelChoice;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
};

export type ScenarioResult = {
  id: string;
  name: string;
  expected: ScenarioOutcome;
  actual: ScenarioOutcome;
  passed: boolean;
  notes: string[];
  optimization?: import("./optimization-types.js").OptimizationTelemetry;
};

export type LabReport = {
  generatedAt: string;
  passed: boolean;
  total: number;
  failed: number;
  profile?: {
    model: AgentForgeModelChoice;
    imageModel?: AgentForgeModelChoice;
  };
  results: ScenarioResult[];
};
