/**
 * Teammate Agent Entity & Policies
 * Represents persistent AI teammates with assigned roles, harness policies,
 * model policies, compute environments, and execution authority.
 */

import type { ExecutionContract } from "./contract.js";

export type AgentStatus = "idle" | "working" | "paused" | "waiting_approval" | "error" | "offline";

export interface HarnessPolicy {
  preferredHarnessId: "pi" | "pydantic" | "native" | string;
  fallbackHarnessId?: string;
  maxSessionDurationSeconds?: number;
  autoResume: boolean;
}

export interface ModelPolicy {
  preferredTier: 0 | 1 | 2 | 3 | 4;
  preferredModel: string;
  preferredProvider: string;
  allowCloudFallback: boolean;
  maxTokensPerRequest?: number;
  maxCostUsdPerTask?: number;
}

export interface DecisionPolicy {
  useSystem1Router: boolean;
  decisionProviderId?: string;
}

export interface ComputePolicy {
  environment: "none" | "local_workspace" | "local_sandbox" | "docker" | "cloud";
  sandboxTimeoutSeconds?: number;
  allowedNetworkOutbound?: string[];
}

export interface AgentTeammate {
  id: string;
  name: string;
  avatarUrl?: string;
  role: string;
  description: string;
  status: AgentStatus;
  currentTaskId?: string;

  // Policies
  harnessPolicy: HarnessPolicy;
  modelPolicy: ModelPolicy;
  decisionPolicy: DecisionPolicy;
  computePolicy: ComputePolicy;
  memoryNamespace: string;

  // Authorities and tools
  tools: string[];
  permissions: string[];
  assignedChannelIds: string[];

  // Default contract template for tasks initiated by or assigned to this agent
  defaultExecutionContract?: Partial<ExecutionContract>;

  createdAt: string;
  updatedAt: string;
}
