import { describe, expect, it } from "vitest";
import { McpJsonRpcClient } from "./mcpJsonRpcClient.js";

describe("McpJsonRpcClient", () => {
  it("runs an injected MCP session without persisting credentials", async () => {
    const calls: string[] = [];
    const client = new McpJsonRpcClient({ endpoint: "http://127.0.0.1:9999/mcp", headers: { Authorization: "Bearer test-only" }, request: async request => {
      calls.push(request.method);
      if (request.method === "initialize") return { jsonrpc: "2.0", id: request.id, result: { protocolVersion: "2025-06-18" } };
      if (request.method === "tools/list") return { jsonrpc: "2.0", id: request.id, result: { tools: [{ name: "read" }] } };
      if (request.method === "tools/call") return { jsonrpc: "2.0", id: request.id, result: { content: [{ type: "text", text: "called" }] } };
      return { jsonrpc: "2.0", id: request.id, result: { contents: [{ uri: "memory://one", text: "hello" }] } };
    } });
    await client.initialize();
    await expect(client.listTools()).resolves.toEqual([{ name: "read" }]);
    await expect(client.callTool("read", { uri: "memory://one" })).resolves.toMatchObject({ content: [{ text: "called" }] });
    await expect(client.readResource("memory://one")).resolves.toMatchObject({ contents: [{ text: "hello" }] });
    expect(calls).toEqual(["initialize", "notifications/initialized", "tools/list", "tools/call", "resources/read"]);
  });

  it("rejects insecure remote endpoints and calls before initialization", async () => {
    expect(() => new McpJsonRpcClient({ endpoint: "http://remote.example/mcp" })).toThrow(/HTTPS/);
    expect(() => new McpJsonRpcClient({ endpoint: "https://remote.example/mcp" })).toThrow(/allowOutbound/);
    const client = new McpJsonRpcClient({ endpoint: "https://remote.example/mcp", allowOutbound: true, request: async () => ({ result: {} }) });
    await expect(client.listTools()).rejects.toThrow(/Initialize/);
  });
});
