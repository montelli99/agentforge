export type SetupCapability =
  | "workspace"
  | "agent"
  | "channel"
  | "model"
  | "memory"
  | "tool"
  | "browser"
  | "approval"
  | "schedule";

export type SetupQuestion = {
  id: string;
  prompt: string;
  reason: string;
  required: boolean;
  affects: SetupCapability[];
};

export type AgentRoleProposal = {
  id: string;
  name: string;
  purpose: string;
  capabilities: SetupCapability[];
  permissionMode: "sandbox" | "approval_required";
  evaluationCases: string[];
};

export type SetupPlan = {
  goal: string;
  summary: string;
  capabilities: SetupCapability[];
  roles: AgentRoleProposal[];
  questions: SetupQuestion[];
  automaticSteps: string[];
  approvalSteps: string[];
  safetyNotes: string[];
};

export type AgentProvisionDraft = {
  id: string;
  name: string;
  role: string;
  description: string;
  status: "idle";
  harnessPolicy: { preferredHarnessId: "native"; autoResume: false };
  modelPolicy: { preferredTier: 2; preferredModel: "unconfigured"; preferredProvider: "unconfigured"; allowCloudFallback: false };
  decisionPolicy: { useSystem1Router: true; decisionProviderId: "jev" };
  computePolicy: { environment: "none" };
  memoryNamespace: string;
  tools: string[];
  permissions: string[];
  assignedChannelIds: string[];
};

export type CapabilityProposal = {
  agentId: string;
  capability: SetupCapability;
  requested: string;
  reason: string;
  setupMode: "automatic" | "approval_required" | "not_available";
  sandboxCheck: string;
};

/**
 * A concise, machine-readable answer to "what can AgentForge set up now?".
 * The setup guide can use this to do all local preparation immediately and
 * present only the decisions that would expose an account or create ongoing
 * external activity.
 */
export type SetupReadiness = {
  canStartSandbox: boolean;
  automaticCapabilities: SetupCapability[];
  approvalRequiredCapabilities: SetupCapability[];
  unavailableCapabilities: SetupCapability[];
  nextAction: string;
};

/** Core public subsystems are provisioned as visible teammates, not merely a prose promise. */
export function buildCoreSystemAgentDrafts(channelId: string): AgentProvisionDraft[] {
  const common: Pick<AgentProvisionDraft, "status" | "harnessPolicy" | "modelPolicy" | "computePolicy" | "assignedChannelIds"> = { status: "idle", harnessPolicy: { preferredHarnessId: "native", autoResume: false }, modelPolicy: { preferredTier: 2, preferredModel: "unconfigured", preferredProvider: "unconfigured", allowCloudFallback: false }, computePolicy: { environment: "none" }, assignedChannelIds: [channelId] };
  return [
    { ...common, id: "agent-agentforge-coordinator", name: "AgentForge Coordinator", role: "Workforce coordinator", description: "Coordinates workspace state, approvals, memory, context, and agent lifecycle.", decisionPolicy: { useSystem1Router: true, decisionProviderId: "jev" }, memoryNamespace: "agentforge/coordinator", tools: [], permissions: ["workspace:read", "tasks:create", "approvals:request"] },
    { ...common, id: "agent-workflow-engine", name: "Workflow Engine", role: "Workflow engineer", description: "Compiles repeatable processes into governed stages, checks, handoffs, and evidence.", decisionPolicy: { useSystem1Router: true, decisionProviderId: "jev" }, memoryNamespace: "agentforge/workflows", tools: ["process-compiler"], permissions: ["processes:read", "tasks:create", "evidence:record"] },
    { ...common, id: "agent-jev-router", name: "JEv System-1 Router", role: "Decision router", description: "Classifies intent and selects bounded workflows before expensive model work.", decisionPolicy: { useSystem1Router: true, decisionProviderId: "jev" }, memoryNamespace: "agentforge/jev", tools: [], permissions: ["routing:classify"] },
  ];
}

const includesAny = (value: string, terms: string[]) => terms.some(term => value.includes(term));

/**
 * Goal-first setup planning. This deliberately proposes configuration without
 * mutating providers or granting permissions; execution belongs to the durable
 * controller after the user approves the generated plan.
 */
export function proposeSetupPlan(goal: string): SetupPlan {
  const normalized = goal.trim().toLowerCase();
  if (!normalized) {
    return {
      goal,
      summary: "Tell me the outcome you want and I will assemble the required workspace.",
      capabilities: ["workspace"],
      roles: [],
      questions: [{
        id: "goal.outcome",
        prompt: "What result should the system produce?",
        reason: "The outcome determines the agents, tools, and verification needed.",
        required: true,
        affects: ["workspace", "agent"],
      }],
      automaticSteps: [],
      approvalSteps: [],
      safetyNotes: ["No accounts, tools, or external actions are configured until the goal is clear."],
    };
  }

  const capabilities = new Set<SetupCapability>(["workspace", "agent", "memory", "approval"]);
  const roles: AgentRoleProposal[] = [];
  const questions: SetupQuestion[] = [];
  const automaticSteps = [
    "Create a private workspace and durable task record.",
    "Create a sandbox execution policy and evidence ledger.",
    "Register AgentForge as the workforce coordinator, Workflow Engine as the workflow/evidence layer, and JEv as the deterministic routing layer.",
    "Attach a setup-guide agent that can explain missing capabilities and propose the next safe configuration step.",
    "Prepare a small acceptance test for the requested outcome.",
  ];
  const approvalSteps = ["Review the proposed agents, permissions, and success checks before execution."];

  const communication = includesAny(normalized, ["message", "email", "reply", "draft", "telegram", "discord", "slack", "contact"]);
  const research = includesAny(normalized, ["research", "compare", "analyze", "investigate", "report"]);
  const automation = includesAny(normalized, ["automate", "monitor", "schedule", "daily", "recurring", "workflow"]);
  const browser = includesAny(normalized, ["browser", "web page", "website", "navigate", "click", "form"]);

  if (communication) {
    capabilities.add("channel");
    capabilities.add("tool");
    roles.push({
      id: "role-communication",
      name: "Communication coordinator",
      purpose: "Draft and organize responses while preserving approval boundaries.",
      capabilities: ["channel", "tool", "approval", "memory"],
      permissionMode: "approval_required",
      evaluationCases: ["Uses the correct conversation context", "Does not send before approval", "Preserves user tone and constraints"],
    });
  }

  if (research) {
    capabilities.add("tool");
    roles.push({
      id: "role-research",
      name: "Research analyst",
      purpose: "Gather, compare, cite, and summarize evidence for the requested decision.",
      capabilities: ["tool", "memory", "approval"],
      permissionMode: "sandbox",
      evaluationCases: ["Cites source evidence", "Separates facts from inference", "Reports missing information"],
    });
  }

  if (browser) {
    capabilities.add("browser");
    capabilities.add("tool");
    roles.push({
      id: "role-browser",
      name: "Browser operator",
      purpose: "Use observed web controls to complete the requested browser task while rejecting stale or hidden targets.",
      capabilities: ["browser", "tool", "approval", "memory"],
      permissionMode: "approval_required",
      evaluationCases: ["Uses only observed visible controls", "Rejects stale page actions", "Verifies the requested outcome independently"],
    });
  }

  if (automation) {
    capabilities.add("schedule");
    roles.push({
      id: "role-operations",
      name: "Operations coordinator",
      purpose: "Monitor events, maintain queues, and surface work that needs attention.",
      capabilities: ["schedule", "tool", "memory", "approval"],
      permissionMode: "approval_required",
      evaluationCases: ["Does not duplicate work", "Recovers after restart", "Escalates blocked work"],
    });
  }

  if (roles.length === 0) {
    roles.push({
      id: "role-generalist",
      name: "Outcome coordinator",
      purpose: "Plan the work, identify missing capabilities, and coordinate specialist agents.",
      capabilities: ["agent", "memory", "approval"],
      permissionMode: "approval_required",
      evaluationCases: ["Restates the success criteria", "Asks only decision-changing questions", "Produces evidence of completion"],
    });
  }

  if (capabilities.has("channel")) {
    questions.push({
      id: "channel.selection",
      prompt: "Which channels should be connected for this workspace?",
      reason: "Channel connections can expose messages or enable external actions.",
      required: false,
      affects: ["channel", "approval"],
    });
  }

  questions.push({
    id: "execution.boundary",
    prompt: "Should the first run stay in sandbox mode, or may it perform approved external actions?",
    reason: "This controls whether tools can change anything outside the workspace.",
    required: true,
    affects: ["tool", "approval"],
  });

  if (automation) {
    questions.push({
      id: "schedule.window",
      prompt: "When may recurring work run, and how should failures be reported?",
      reason: "Scheduling and notifications can create ongoing activity and cost.",
      required: true,
      affects: ["schedule", "channel"],
    });
  }

  return {
    goal,
    summary: `I can assemble ${roles.length} agent${roles.length === 1 ? "" : "s"} for this outcome and test them in a sandbox before enabling external actions.`,
    capabilities: [...capabilities],
    roles,
    questions,
    automaticSteps,
    approvalSteps,
    safetyNotes: [
      "No provider account is connected automatically.",
      "External messages, account changes, and recurring jobs require explicit approval.",
      "Every created agent receives an evaluation set and an evidence record.",
    ],
  };
}

/** Build safe, unconnected agent records after the user approves a setup plan. */
export function buildAgentProvisionDrafts(plan: SetupPlan, channelId: string): AgentProvisionDraft[] {
  return plan.roles.map(role => ({
    id: `agent-${role.id}`,
    name: role.name,
    role: role.name,
    description: role.purpose,
    status: "idle",
    harnessPolicy: { preferredHarnessId: "native", autoResume: false },
    modelPolicy: { preferredTier: 2, preferredModel: "unconfigured", preferredProvider: "unconfigured", allowCloudFallback: false },
    decisionPolicy: { useSystem1Router: true, decisionProviderId: "jev" },
    computePolicy: { environment: "none" },
    memoryNamespace: `agentforge/${role.id}`,
    tools: [],
    permissions: role.permissionMode === "approval_required" ? ["review:request"] : [],
    assignedChannelIds: [channelId],
  }));
}

export function proposeCapabilitySetup(plan: SetupPlan): CapabilityProposal[] {
  return plan.roles.flatMap(role => role.capabilities.map(capability => {
    const requested = capability === "channel" ? "channel adapter"
      : capability === "model" ? "model provider"
        : capability === "tool" ? "scoped tool catalog"
          : capability === "browser" ? "browser action policy and harness"
            : capability === "schedule" ? "scheduler"
            : capability === "memory" ? "scoped memory store"
              : capability === "approval" ? "approval policy"
                : "workspace state";
    const approvalRequired = capability === "channel" || capability === "tool" || capability === "browser" || capability === "schedule";
    return {
      agentId: role.id,
      capability,
      requested,
      reason: `${role.name} needs ${requested} to fulfill: ${role.purpose}`,
      setupMode: approvalRequired ? "approval_required" : "automatic",
      sandboxCheck: capability === "channel"
        ? "Verify a sandbox channel can receive and acknowledge a test event."
        : capability === "tool"
          ? "Run a read-only tool call and verify scoped output."
          : capability === "browser"
            ? "Validate a dry-run action against a current indexed observation; do not submit external forms."
            : capability === "schedule"
            ? "Create a dry-run schedule event without dispatching external work."
            : `Validate ${requested} with a deterministic acceptance check.`,
    } satisfies CapabilityProposal;
  }));
}

/**
 * Derive a deterministic setup status without asking the operator to manually
 * inspect every role or capability. Local preparation is always safe to start;
 * only external-capability approvals remain as decisions.
 */
export function summarizeSetupReadiness(plan: SetupPlan): SetupReadiness {
  const proposals = proposeCapabilitySetup(plan);
  const byMode = (mode: CapabilityProposal["setupMode"]) => [...new Set(
    proposals.filter(proposal => proposal.setupMode === mode).map(proposal => proposal.capability),
  )];
  const automaticCapabilities = [...new Set<SetupCapability>([
    "workspace", "agent", "memory", "approval",
    ...byMode("automatic"),
  ])];
  const approvalRequiredCapabilities = byMode("approval_required");
  const unavailableCapabilities = byMode("not_available");

  return {
    canStartSandbox: Boolean(plan.goal.trim()),
    automaticCapabilities,
    approvalRequiredCapabilities,
    unavailableCapabilities,
    nextAction: !plan.goal.trim()
      ? "Describe the outcome so AgentForge can assemble a workspace."
      : approvalRequiredCapabilities.length > 0
        ? "Prepare the local workspace and sandbox checks now; request approval only for external capabilities."
        : "Prepare the local workspace and run the sandbox acceptance check.",
  };
}
