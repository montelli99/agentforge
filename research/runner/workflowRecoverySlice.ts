import { WorkflowEngine } from "../../src/workflowEngine.js";
import type { ProcessDefinition } from "../../src/core/types/process.js";

const processDefinition: ProcessDefinition = {
  id: "synthetic-recovery",
  title: "Synthetic recovery workflow",
  description: "Exercise a failed prerequisite and honest escalation.",
  sourceType: "manual",
  version: 1,
  steps: [{ id: "verify", sequence: 1, title: "Verify prerequisite", instruction: "Verify the synthetic prerequisite before continuing." }],
  inputs: [], outputs: [],
  unresolvedRules: [{
    id: "rule-prerequisite", processId: "synthetic-recovery", stepId: "verify",
    question: "Who may approve the prerequisite?", description: "Approval owner is intentionally absent.",
    severity: "blocker", resolved: false,
  }],
  lastSynchronizedAt: new Date(0).toISOString(), createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(),
};
const inspection = new WorkflowEngine().inspect(processDefinition);
const blockedHonestly = inspection.canExecute === false
  && inspection.unresolvedRules.some(rule => rule.severity === "blocker" && !rule.resolved);
if (!blockedHonestly) {
  console.error(JSON.stringify({ valid: false, inspection }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  experimentId: "workflow-recovery-slice-2026-09-29-v1",
  syntheticOnly: true,
  networkCalls: 0,
  providerCalls: 0,
  blockedPrerequisiteReported: blockedHonestly,
  completionClaimed: false,
  interpretation: "Workflow recovery mechanics only; no model repair or external side effect was attempted.",
}, null, 2));
