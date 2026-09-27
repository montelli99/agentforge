import { describe, expect, it } from "vitest";
import { ModelPlanDraftProvider } from "./modelPlanDraftProvider.js";

describe("ModelPlanDraftProvider", () => {
  const task = { id: "task-1", title: "Run checks", contract: { requiredChecks: [] } } as never;
  it("validates a model draft but refuses to treat it as approval", async () => {
    const model = { generate: async () => ({ id: "m", model: "test", content: JSON.stringify({ commands: [{ checkName: "tests", command: "pnpm test" }] }), usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } }) } as never;
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
});
