import { describe, expect, it } from "vitest";
import { ModelPlanDraftProvider } from "./modelPlanDraftProvider.js";

describe("ModelPlanDraftProvider", () => {
  const task = { id: "task-1", title: "Run checks", contract: { requiredChecks: [] } } as never;
  it("validates a model draft but refuses to treat it as approval", async () => {
    const model = { generate: async (options: { thinking?: string }) => {
      expect(options.thinking).toBe("disabled");
      return { id: "m", model: "test", content: JSON.stringify({ commands: [{ checkName: "tests", command: "pnpm test" }] }), usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } };
    } } as never;
    const provider = new ModelPlanDraftProvider(model, "test");
    const draft = await provider.draft(task);
    expect(draft.source).toBe("model");
    expect(draft.commands).toHaveLength(1);
    await expect(provider.getPlan()).rejects.toThrow(/not an approved/i);
  });
  it("rejects malformed model output", async () => {
    const model = { generate: async () => ({ content: "not-json" }) } as never;
    await expect(new ModelPlanDraftProvider(model, "test").draft(task)).rejects.toThrow(/invalid execution-plan/i);
  });
  it("accepts a JSON fenced plan without loosening schema validation", async () => {
    const model = { generate: async () => ({ content: "```json\n{\"commands\":[{\"checkName\":\"custom_script\",\"command\":\"node -v\"}]}\n```" }) } as never;
    const draft = await new ModelPlanDraftProvider(model, "test").draft(task);
    expect(draft.commands[0]?.checkName).toBe("custom_script");
  });
  it("supplies task details and execution boundaries to the planner", async () => {
    const boundedTask = { id: "task-2", title: "Artifact task", description: "Write a synthetic artifact", contract: {
      scope: { allowedPaths: ["artifacts/**"], protectedPaths: [".env"] },
      authority: { networkOutbound: false }, requiredChecks: [{ type: "custom_script", command: "node -v" }],
    } } as never;
    const model = { generate: async (options: { messages: Array<{ content: string }> }) => {
      const input = JSON.parse(options.messages[1].content) as Record<string, unknown>;
      expect(input.description).toBe("Write a synthetic artifact");
      expect(input.scope).toEqual({ allowedPaths: ["artifacts/**"], protectedPaths: [".env"] });
      expect(input.authority).toEqual({ networkOutbound: false });
      expect(input.checks).toEqual([{ type: "custom_script", command: "node -v" }]);
      return { content: '{"commands":[{"checkName":"custom_script","command":"node -v"}]}' };
    } } as never;
    await new ModelPlanDraftProvider(model, "test").draft(boundedTask);
  });
});
