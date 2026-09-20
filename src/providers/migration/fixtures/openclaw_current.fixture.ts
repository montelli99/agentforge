/**
 * Sanitized OpenClaw Current / Modern Upstream Architecture Fixture
 * Section 14: Current OpenClaw Fixture
 */

export const OPENCLAW_CURRENT_FIXTURE = {
  version: "openclaw-2026.09-current",
  environment: "upstream-stable-isolated-fixture",
  config: {
    workspaces: [
      {
        id: "oc-ws-default",
        name: "Upstream OpenClaw Team",
        channels: [
          { id: "oc-chan-main", name: "general", platform: "telegram", externalId: "topic-1" },
          { id: "oc-chan-qa", name: "qa-testing", platform: "discord", externalId: "thread-888" },
        ],
      },
    ],
    agents: [
      {
        id: "oc-agent-qa",
        name: "ModernQABot",
        role: "Quality Assurance Specialist",
        instructions: "Run automated tests, inspect regressions, and create tickets.",
        modelConfig: {
          tier: 3,
          primary: "deepseek-coder:v2",
          fallbacks: ["gpt-4o-mini"],
        },
        mcpServers: [
          { name: "github-mcp", command: "npx @modelcontextprotocol/server-github" },
          { name: "sqlite-mcp", command: "npx @modelcontextprotocol/server-sqlite" },
        ],
        tools: ["github_pr", "run_test", "sqlite_query"],
      },
    ],
    secretsPresent: ["TELEGRAM_BOT_TOKEN", "GITHUB_PERSONAL_ACCESS_TOKEN", "OPENAI_API_KEY"],
  },
};
