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
  it.each([
    [null], [false], [[]],
    [{checkName: 'tests', command: 'x'.repeat(20001)}],
    [{checkName: 'x'.repeat(201), command: 'node -v'}],
    Array.from({length: 101}, () => ({checkName: 'tests', command: 'node -v'})),
  ].map(commands => ({commands})))('rejects malformed or unapprovable command batches', async ({commands}) => {
    const model = {generate: async () => ({content: JSON.stringify({commands})})} as never;
    await expect(new ModelPlanDraftProvider(model, 'test').draft(task)).rejects.toThrow(/schema validation/);
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
      completion: { requiredArtifacts: [{ path: "artifacts/result.txt" }] },
    } } as never;
    const model = { generate: async (options: { messages: Array<{ content: string }> }) => {
      const input = JSON.parse(options.messages[1].content) as Record<string, unknown>;
      expect(input.description).toBe("Write a synthetic artifact");
      expect(input.scope).toEqual({ allowedPaths: ["artifacts/**"], protectedPaths: [".env"] });
      expect(input.authority).toEqual({ networkOutbound: false });
      expect(input.requiredArtifacts).toEqual([{ path: "artifacts/result.txt" }]);
      expect(input.sandboxTools).toEqual(["sh", "node"]);
      expect(input.checks).toEqual([{ type: "custom_script", command: "node -v" }]);
      return { content: '{"commands":[{"checkName":"custom_script","command":"node -v"}]}' };
    } } as never;
    await new ModelPlanDraftProvider(model, "test", ["sh", "node"]).draft(boundedTask);
  });

  it("rejects a plan requiring a tool absent from the declared sandbox", async () => {
    const model = { generate: async () => ({ content: JSON.stringify({ commands: [
      { checkName: "custom_script", command: "jq . state/job.json" },
    ] }) }) } as never;
    await expect(new ModelPlanDraftProvider(model, "test", ["sh", "node"]).draft(task))
      .rejects.toThrow(/unavailable sandbox tool: jq/i);
  });
});

it('rejects a combined check before approval and accepts a separate exact check',async()=>{
 const task={id:'required',title:'Create output',contract:{requiredChecks:[{type:'unit_tests',required:true,command:'test -s artifacts/report.json'}]}} as never;
 const work={checkName:'unit_tests',command:'node build.js && test -s artifacts/report.json'};
 const model=(commands:unknown[])=>({generate:async()=>({content:JSON.stringify({commands})})}) as never;
 await expect(new ModelPlanDraftProvider(model([work]),'test').draft(task)).rejects.toThrow('exact required check');
 const exact={checkName:'unit_tests',command:'test -s artifacts/report.json'};
 const draft=await new ModelPlanDraftProvider(model([work,exact]),'test').draft(task);
 expect(draft.commands).toEqual([work,exact]);expect(draft.source).toBe('model');
});
