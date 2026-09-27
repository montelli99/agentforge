/**
 * Sanitized Hermes & Grok Bot Architecture Fixtures
 * Sections 19 & 20
 */

export const HERMES_FIXTURE = {
  platform: "hermes",
  version: "2.4.0",
  agents: [
    {
      id: "hermes-agent-research",
      name: "HermesResearcher",
      directive: "Conduct autonomous web research and synthesize competitive intelligence.",
      memoryStore: "local-graph-store",
      toolsGranted: ["search_web", "fetch_url", "write_memo"],
      hasApiKeys: true,
    },
  ],
  channels: [
    { name: "research-feed", type: "feed" },
    { name: "daily-briefings", type: "notification" },
  ],
};

export const GROKBOT_FIXTURE = {
  platform: "grok_bot",
  version: "web-export-v1",
  exportedPrompts: [
    {
      title: "Market Analysis Bot",
      prompt: "Analyze public economic and operational indicators for a generic planning review.",
      model: "grok-2",
    },
  ],
  // Unexportable items must be flagged as MANUAL_REVIEW / UNSUPPORTED
  unexportableCustomActions: ["proprietary_x_api_feed", "direct_x_messaging"],
};
