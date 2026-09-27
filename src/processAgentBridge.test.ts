import { describe, expect, it } from "vitest";
import { ProcessAgentBridge } from "./processAgentBridge.js";
import type { ProcessDefinition } from "./core/types/process.js";

const process: ProcessDefinition = {
  id: "process-qualification",
  title: "Qualification",
  description: "Qualify an intake",
  sourceType: "manual",
  version: 1,
  steps: [{ id: "step-1", sequence: 1, title: "Review", instruction: "Review the intake", expectedEvidence: ["review"] }],
  inputs: [], outputs: [], unresolvedRules: [],
  lastSynchronizedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

describe("ProcessAgentBridge", () => {
  it("prepares a bound process as a task contract without executing it", () => {
    const result = new ProcessAgentBridge().prepare({
      process,
      binding: { processId: process.id, agentId: "agent-1", assignedRole: "operator", boundAt: new Date().toISOString() },
      input: "Review case 42",
    });
    expect(result.agentId).toBe("agent-1");
    expect(result.instruction).toContain("Review case 42");
    expect(result.contract.authority.networkOutbound).toBe(false);
    expect(result.contract.completion.requireHumanApproval).toBe(true);
    expect(result.status).toBe("ready");
  });

  it("holds privileged SOP steps for explicit review", () => {
    const privileged = { ...process, steps: [{ ...process.steps[0], instruction: "Approve and deploy the change" }] };
    const result = new ProcessAgentBridge().prepare({
      process: privileged,
      binding: { processId: process.id, agentId: "agent-1", assignedRole: "operator", boundAt: new Date().toISOString() },
    });
    expect(result.status).toBe("waiting_approval");
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});
