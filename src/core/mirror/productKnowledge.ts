/** Public, code-verified facts for the bounded channel assistant. */
const facts = [
  { terms: /approv|permission|authoriz|contract/i, text: "Approvals: privileged actions require an authorized reviewer. An approval starts pending; an authorized decision records the approver and time. For a task waiting on verified completion evidence, approval can complete the task and rejection can fail it. Approval does not by itself run a new external action." },
  { terms: /memory|context|handoff|forget/i, text: "Memory: AgentForge stores durable operational records, including task history, constraints, approvals, and do-not-repeat rules. JEv can select bounded context for a workflow. Private chat memory must be scoped to its canonical channel; no cross-chat records are supplied." },
  { terms: /jev|routing|intent|decid/i, text: "JEv: a bounded System-1 classifier selects setup, route, review, or execute intent. It does not write long-form responses or perform external actions. Execution requires an approval boundary." },
  { terms: /workflow|process|stage|task/i, text: "Workflow Engine: it compiles processes into stages, checks, handoff contracts, completion evidence, and retry or recovery rules. Preparing a process run creates a reviewable task and restricted execution contract; preparation alone does not start a worker." },
  { terms: /telegram|discord|slack|gateway|channel/i, text: "Channels: AgentForge owns a native gateway and channel adapters. A live provider connection still requires that provider's authorization. OpenClaw and Hermes are optional migration bridges, not required for native channel sessions." },
  { terms: /harness|agentforge|system|feature|help/i, text: "AgentForge: the workforce control plane owns workspaces, agents, roles, durable memory, permissions, approvals, audit events, channels, runtime lifecycle, and model routing. Native execution is its default path; Pi and Pydantic are optional engines." },
];

export function productKnowledgeFor(question: string): string {
  const selected = facts.filter(fact => fact.terms.test(question)).slice(0, 3);
  return selected.length ? selected.map(fact => fact.text).join("\n") : "";
}
