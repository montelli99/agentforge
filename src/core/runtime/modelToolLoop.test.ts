import { describe, expect, it } from "vitest";
import type { GenerativeModelProvider, ModelResponse } from "../providers/model.js";
import type { ToolProvider } from "../providers/tools.js";
import { runModelToolLoop } from "./modelToolLoop.js";

function model(responses: ModelResponse[]): GenerativeModelProvider {
  return {
    id: "test-model", name: "Test model", defaultTier: 1,
    isAvailable: async () => true, listModels: async () => ["test"],
    generate: async () => responses.shift()!, stream: async function* () { yield { id: "stream" }; },
  };
}

const tools: ToolProvider = {
  id: "test-tools", name: "Test tools",
  getAvailableTools: () => [{ name: "lookup", description: "Look up a value", parameters: { type: "object" } }],
  executeTool: async (name, args) => ({ toolName: name, success: true, output: args, durationMs: 1 }),
};

describe("runModelToolLoop", () => {
  it("validates and feeds tool results back to the model", async () => {
    const result = await runModelToolLoop(model([
      { id: "1", model: "test", content: "", toolCalls: [{ id: "call-1", type: "function", function: { name: "lookup", arguments: '{"key":"value"}' } }], usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } },
      { id: "2", model: "test", content: "done", usage: { promptTokens: 2, completionTokens: 1, totalTokens: 3 } },
    ]), tools, { model: "test", agentId: "agent-1", messages: [{ role: "user", content: "look it up" }] });
    expect(result.response.content).toBe("done");
    expect(result.toolResults).toHaveLength(1);
    expect(result.messages.at(-1)?.role).toBe("tool");
  });

  it("fails closed when an approval-required tool is not approved", async () => {
    const approvalTools = { ...tools, getAvailableTools: () => [{ ...tools.getAvailableTools()[0], requiresApproval: true }] };
    await expect(runModelToolLoop(model([{ id: "1", model: "test", content: "", toolCalls: [{ id: "call-1", type: "function", function: { name: "lookup", arguments: "{}" } }], usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } }]), approvalTools, { model: "test", agentId: "agent-1", messages: [{ role: "user", content: "go" }] })).rejects.toThrow(/approval is required/i);
  });
});
