import { describe, expect, it } from "vitest";
import { CapabilitySetupExecutor } from "./capabilitySetupExecutor.js";
import { proposeCapabilitySetup, proposeSetupPlan } from "./setupOrchestrator.js";

describe("capability setup executor", () => {
  it("keeps approval-required capabilities pending and makes no external changes", () => {
    const plan = proposeSetupPlan("Draft replies and monitor the workflow daily");
    const results = new CapabilitySetupExecutor().apply(proposeCapabilitySetup(plan));
    expect(results.some(result => result.status === "approval_required")).toBe(true);
    expect(results.every(result => result.externalChanges === false)).toBe(true);
  });

  it("prepares an explicitly approved capability without connecting an account", () => {
    const plan = proposeSetupPlan("Draft replies and monitor the workflow daily");
    const proposals = proposeCapabilitySetup(plan);
    const approval = proposals.find(item => item.setupMode === "approval_required");
    expect(approval).toBeDefined();
    const result = new CapabilitySetupExecutor().apply(proposals, [`${approval!.agentId}:${approval!.capability}`])
      .find(item => item.proposal === approval);
    expect(result).toMatchObject({ status: "ready", configured: true, externalChanges: false });
  });
});
