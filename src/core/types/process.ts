/**
 * Process Knowledge & Process-to-Agent Domain Model
 * Sections 9, 10, 11, 12, 13, 14, 15
 * 
 * CRITICAL PRINCIPLE: SOP IS NOT AUTHORITY.
 * An SOP describes how someone performs work; it does not authorize the action.
 * The Process Compiler detects UnresolvedBusinessRules and pairs them with
 * ExecutionContracts and deterministic policies.
 */

export type ProcessSourceType =
  | "scribe"
  | "tango"
  | "notion"
  | "confluence"
  | "markdown"
  | "html"
  | "pdf"
  | "manual"
  | "agentforge_capture";

export interface ProcessInput {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ProcessOutput {
  name: string;
  type: string;
  description?: string;
}

export interface ProcessDecision {
  id: string;
  question: string;
  condition: string;
  branches: Array<{
    label: string;
    targetStepId: string;
  }>;
  requiresHumanReview?: boolean;
}

export interface ProcessException {
  id: string;
  trigger: string;
  handlerAction: string;
  escalationRole?: string;
}

export interface ProcessStep {
  id: string;
  sequence: number;
  title: string;
  instruction: string;
  toolRequirements?: string[];
  permissionsRequired?: string[];
  expectedEvidence?: string[];
  decisionPoint?: ProcessDecision;
  exceptionHandler?: ProcessException;
}

export interface UnresolvedBusinessRule {
  id: string;
  processId: string;
  stepId: string;
  question: string;
  description: string;
  severity: "blocker" | "warning" | "advisory";
  resolved: boolean;
  resolvedRuleStatement?: string;
  resolvedByUserId?: string;
}

export interface ProcessDefinition {
  id: string;
  title: string;
  description: string;
  sourceType: ProcessSourceType;
  sourceUri?: string;
  version: number;
  steps: ProcessStep[];
  inputs: ProcessInput[];
  outputs: ProcessOutput[];
  unresolvedRules: UnresolvedBusinessRule[];
  rawContent?: string;
  lastSynchronizedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessDiff {
  processId: string;
  previousVersion: number;
  newVersion: number;
  addedSteps: ProcessStep[];
  modifiedSteps: Array<{ stepId: string; changes: Record<string, unknown> }>;
  deletedStepIds: string[];
  newUnresolvedRules: UnresolvedBusinessRule[];
  affectedAgentIds: string[];
  detectedAt: string;
}

export interface ProcessAgentBinding {
  processId: string;
  agentId: string;
  assignedRole: string;
  boundAt: string;
}

export interface AgentSpecification {
  agentRole: string;
  name: string;
  systemPrompt: string;
  requiredTools: string[];
  requiredPermissions: string[];
  unresolvedRules: UnresolvedBusinessRule[];
  suggestedExecutionContract: Record<string, unknown>;
  testScenarios: Array<{ name: string; input: string; expectedOutput: string }>;
}
