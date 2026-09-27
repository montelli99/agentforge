import { describe, expect, it } from "vitest";
import { ScribeProcessProvider } from "./scribeProvider.js";
import { McpJsonRpcClient } from "../mcp/mcpJsonRpcClient.js";

describe("ScribeProcessProvider MCP ingestion", () => {
  it("ingests a text resource through the provider-neutral MCP client", async () => {
    const client = new McpJsonRpcClient({ endpoint: "http://127.0.0.1:9999/mcp", request: async request => {
      if (request.method === "initialize") return { result: {} };
      return { result: { contents: [{ uri: "sop://demo", text: "# Intake\n1. Review the request\n2. Ask for approval" }] } };
    } });
    await client.initialize();
    const process = await new ScribeProcessProvider().ingestFromMcp(client, "sop://demo");
    expect(process.title).toBe("Intake");
    expect(process.steps).toHaveLength(2);
    expect(process.sourceUri).toBe("sop://demo");
  });
});
