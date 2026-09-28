import { describe, expect, it } from "vitest";
import { WorkflowEngine } from "./workflowEngine.js";
import type { ProcessDefinition } from "./core/types/process.js";

const processDefinition: ProcessDefinition = {
  id: "qualification",
  title: "Qualification",
  description: "Qualify an inbound request and prepare evidence.",
  sourceType: "manual",
  version: 1,
  steps: [
    {
      id: "underwrite",
      sequence: 1,
      title: "Underwrite",
      instruction: "Underwrite the request after evidence is collected.",
      toolRequirements: ["evidence-store"],
      permissionsRequired: ["evidence:read"],
    },
  ],
  inputs: [],
  outputs: [],
  unresolvedRules: [],
  lastSynchronizedAt: new Date(0).toISOString(),
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe("WorkflowEngine integration", () => {
  it("compiles a process and blocks privileged execution without an explicit rule", () => {
    const engine = new WorkflowEngine();
    const inspection = engine.inspect(processDefinition);

    expect(inspection.processId).toBe("qualification");
    expect(inspection.specification.requiredTools).toEqual(["evidence-store"]);
    expect(inspection.specification.unresolvedRules).toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: "blocker", resolved: false })]),
    );
    expect(inspection.canExecute).toBe(false);
  });

  it("creates a durable session through the workflow facade", () => {
    const engine = new WorkflowEngine();
    const session = engine.beginGoal("Prepare a qualification evidence pack", "integration-test");

    expect(session.taskId).toMatch(/^workflow-/);
    expect(engine.getSession(session.taskId)?.originalGoal.rawText).toBe("Prepare a qualification evidence pack");
  });
});
