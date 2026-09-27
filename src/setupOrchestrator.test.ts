import { describe, expect, it } from "vitest";
import { buildAgentProvisionDrafts, buildCoreSystemAgentDrafts, proposeCapabilitySetup, proposeSetupPlan, summarizeSetupReadiness } from "./setupOrchestrator.js";

describe("setup orchestrator", () => {
  it("assembles roles from an outcome instead of requiring manual configuration", () => {
    const plan = proposeSetupPlan("Research competitors, draft replies, and monitor the workflow daily");

    expect(plan.roles.map(role => role.name)).toEqual([
      "Communication coordinator",
      "Research analyst",
      "Operations coordinator",
    ]);
    expect(plan.capabilities).toEqual(expect.arrayContaining(["channel", "tool", "schedule", "memory"]));
    expect(plan.questions.some(question => question.id === "execution.boundary")).toBe(true);
    expect(plan.roles.every(role => role.evaluationCases.length > 0)).toBe(true);
    expect(plan.automaticSteps.some(step => step.includes("Workflow Engine") && step.includes("JEv"))).toBe(true);
  });

  it("does not configure an empty goal or silently grant access", () => {
    const plan = proposeSetupPlan(" ");
    expect(plan.questions[0]?.required).toBe(true);
    expect(plan.safetyNotes[0]).toContain("No accounts");
  });

  it("creates unconnected sandbox drafts only after approval", () => {
    const plan = proposeSetupPlan("Monitor a workflow daily");
    const drafts = buildAgentProvisionDrafts(plan, "channel-test");
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.every(agent => agent.modelPolicy.preferredModel === "unconfigured")).toBe(true);
    expect(drafts.every(agent => agent.tools.length === 0)).toBe(true);
    expect(drafts.every(agent => agent.assignedChannelIds[0] === "channel-test")).toBe(true);
  });

  it("materializes the public control layers as explicit teammates", () => {
    const drafts = buildCoreSystemAgentDrafts("channel-test");
    expect(drafts.map(agent => agent.id)).toEqual([
      "agent-agentforge-coordinator", "agent-workflow-engine", "agent-jev-router",
    ]);
    expect(drafts.every(agent => agent.computePolicy.environment === "none")).toBe(true);
    expect(drafts.every(agent => agent.assignedChannelIds[0] === "channel-test")).toBe(true);
  });

  it("plans capability setup without mutating external connections", () => {
    const plan = proposeSetupPlan("Draft replies and monitor the workflow daily");
    const capabilities = proposeCapabilitySetup(plan);
    expect(capabilities.some(item => item.capability === "channel" && item.setupMode === "approval_required")).toBe(true);
    expect(capabilities.some(item => item.capability === "schedule" && item.sandboxCheck.includes("dry-run"))).toBe(true);
  });

  it("proposes a guarded browser operator for web outcomes", () => {
    const plan = proposeSetupPlan("Navigate the website and fill the application form");
    expect(plan.capabilities).toContain("browser");
    expect(plan.roles).toContainEqual(expect.objectContaining({ name: "Browser operator", permissionMode: "approval_required" }));
    const browserCapability = proposeCapabilitySetup(plan).find(item => item.capability === "browser");
    expect(browserCapability).toMatchObject({ setupMode: "approval_required" });
    expect(browserCapability?.sandboxCheck).toContain("indexed observation");
  });

  it("separates automatic local setup from the few external decisions", () => {
    const readiness = summarizeSetupReadiness(proposeSetupPlan("Draft replies and monitor the workflow daily"));
    expect(readiness.canStartSandbox).toBe(true);
    expect(readiness.automaticCapabilities).toEqual(expect.arrayContaining(["workspace", "agent", "memory", "approval"]));
    expect(readiness.approvalRequiredCapabilities).toEqual(expect.arrayContaining(["channel", "tool", "schedule"]));
    expect(readiness.nextAction).toContain("Prepare the local workspace");
  });

  it("does not claim an empty goal can start setup", () => {
    const readiness = summarizeSetupReadiness(proposeSetupPlan(" "));
    expect(readiness.canStartSandbox).toBe(false);
    expect(readiness.nextAction).toContain("Describe the outcome");
  });
});
