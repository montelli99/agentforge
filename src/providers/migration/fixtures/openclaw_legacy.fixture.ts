/**
 * Sanitized OpenClaw Legacy Production Architecture Fixture
 * Section 13: Legacy OpenClaw Fixture
 * 
 * STRICT PRIVACY GUARANTEE:
 * ZERO seller PII, ZERO production credentials, ZERO phone numbers, ZERO live tokens.
 * Accurately models the structural characteristics of the owner's legacy production OpenClaw stack.
 */

export const OPENCLAW_LEGACY_FIXTURE = {
  version: "openclaw-2026.04.1-legacy",
  environment: "production-sanitized-fixture",
  config: {
    telegram: {
      botUsername: "SanitizedClawBot",
      groupChatId: "-1001928374650",
      topics: [
        { id: 1, name: "General" },
        { id: 42, name: "Engineering / Dev" },
        { id: 108, name: "Acquisitions / PPC Leads" },
        { id: 250, name: "Approvals & Hotfixes" },
      ],
      enableTopicMirroring: true,
      hasCredentialsConfigured: true, // Reports PRESENT, does not expose secret
    },
    models: {
      defaultProvider: "ollama",
      defaultModel: "llama3:8b",
      decisionProvider: "jev-router-mock",
      fallbackChain: ["ollama/llama3:8b", "ollama/deepseek-coder:33b", "openai/gpt-4o"],
      hasOpenAiKey: true,
      hasAnthropicKey: false,
    },
    memory: {
      provider: "sqlite-vector",
      namespace: "openclaw-main",
      embeddingModel: "text-embedding-3-small",
    },
    agents: [
      {
        id: "claw-agent-dev",
        name: "DevBot",
        systemPrompt: "You are a senior full-stack developer assisting the workspace owner with code, tests, and deployments.",
        tools: ["bash", "git", "vitest", "file_editor"],
        assignedTopicId: 42,
        model: "openai/gpt-4o",
      },
      {
        id: "claw-agent-lead-intake",
        name: "LeadBot",
        systemPrompt: "You qualify incoming real estate leads from webhooks and forms. Mark unqualified leads politely.",
        tools: ["crm_read", "crm_write", "sms_send"],
        assignedTopicId: 108,
        model: "ollama/llama3:8b",
      },
    ],
    tools: [
      { name: "bash", category: "compute", requiresApproval: true },
      { name: "git", category: "vcs", requiresApproval: false },
      { name: "crm_write", category: "crm", requiresApproval: true },
      { name: "sms_send", category: "messaging", requiresApproval: true },
    ],
    schedules: [
      { id: "cron-morning-scan", cron: "0 8 * * *", task: "Scan uncontacted leads", agentId: "claw-agent-lead-intake" },
      { id: "cron-git-health", cron: "0 0 * * 0", task: "Prune stale branches", agentId: "claw-agent-dev" },
    ],
    durableState: {
      activeTasksCount: 3,
      pendingApprovalsCount: 1,
    },
  },
};
