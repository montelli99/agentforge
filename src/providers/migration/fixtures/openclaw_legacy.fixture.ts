/**
 * Generic sanitized legacy workspace fixture.
 * It exercises migration without representing a real customer, workflow, or integration.
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
        { id: 108, name: "Operations / Intake" },
        { id: 250, name: "Approvals & Hotfixes" },
      ],
      enableTopicMirroring: true,
      hasCredentialsConfigured: true,
    },
    models: {
      defaultProvider: "ollama",
      defaultModel: "llama3:8b",
      decisionProvider: "router-mock",
      fallbackChain: ["ollama/llama3:8b", "ollama/deepseek-coder:33b", "openai/gpt-4o"],
      hasOpenAiKey: true,
      hasAnthropicKey: false,
    },
    memory: {
      provider: "sqlite-vector",
      namespace: "legacy-workspace",
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
        id: "claw-agent-intake",
        name: "IntakeBot",
        systemPrompt: "You organize incoming requests and route them to the right workspace process.",
        tools: ["records_read", "records_write", "message_send"],
        assignedTopicId: 108,
        model: "ollama/llama3:8b",
      },
    ],
    tools: [
      { name: "bash", category: "compute", requiresApproval: true },
      { name: "git", category: "vcs", requiresApproval: false },
      { name: "records_write", category: "records", requiresApproval: true },
      { name: "message_send", category: "messaging", requiresApproval: true },
    ],
    schedules: [
      { id: "cron-intake-review", cron: "0 8 * * *", task: "Review untriaged requests", agentId: "claw-agent-intake" },
      { id: "cron-git-health", cron: "0 0 * * 0", task: "Prune stale branches", agentId: "claw-agent-dev" },
    ],
    durableState: {
      activeTasksCount: 3,
      pendingApprovalsCount: 1,
    },
  },
};