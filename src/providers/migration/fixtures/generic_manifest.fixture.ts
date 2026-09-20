/**
 * Generic AgentForge Migration Manifest Format
 * Section 21: Generic Migration Manifest (agentforge-migration.json)
 */

export const GENERIC_MIGRATION_FIXTURE = {
  $schema: "https://agentforge.dev/schemas/migration-v1.json",
  version: "1.0.0",
  sourceSystem: "custom-in-house-framework",
  exportedAt: "2026-09-20T11:00:00Z",
  workspace: {
    name: "Exported Team Workspace",
    description: "Exported from generic manifest",
  },
  agents: [
    {
      id: "agent-doc-writer",
      name: "DocWriter",
      role: "Technical Writer",
      description: "Writes markdown documentation",
      systemPrompt: "You write clear, concise documentation.",
      modelPolicy: { preferredTier: 2, preferredModel: "llama3:8b" },
      tools: ["markdown_linter", "file_writer"],
      permissions: ["workspace:read", "workspace:write"],
    },
  ],
  channels: [
    { name: "documentation", visibility: "public" },
  ],
  tasks: [
    { title: "Review API documentation", status: "completed" },
  ],
};
