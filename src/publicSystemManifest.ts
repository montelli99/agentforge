export type PublicSubsystemId = "agentforge" | "workflow-engine" | "jev";

export interface PublicSubsystemManifest {
  id: PublicSubsystemId;
  name: string;
  purpose: string;
  owns: string[];
  doesNotOwn: string[];
  entrypoints: string[];
  status: "implemented" | "partial" | "planned";
}

/** Public architecture boundary. No private CRM, seller, account, or credential data belongs here. */
export const PUBLIC_SYSTEM_MANIFEST: readonly PublicSubsystemManifest[] = [
  {
    id: "agentforge",
    name: "AgentForge",
    purpose: "Public workforce operating system for setup, memory, context transport, permissions, evidence, channels, and agent lifecycle.",
    owns: ["workspace", "agents", "roles", "memory", "context packets", "approvals", "audit", "channel adapters", "browser action policy", "browser action loop", "browser session ownership", "cost-aware routing"],
    doesNotOwn: ["business records", "CRM data", "private credentials", "vendor-specific lead logic"],
    entrypoints: ["setup orchestrator", "controller", "workspace API", "native gateway", "channel runtime registry", "browser action policy", "browser action loop", "browser session registry", "process-agent bridge"],
    status: "partial",
  },
  {
    id: "workflow-engine",
    name: "Workflow Engine",
    purpose: "Public, domain-neutral workflow and process engine for turning an outcome into repeatable stages, checks, handoffs, and evidence.",
    owns: ["workflow stages", "process compilation", "stage transitions", "handoff contracts", "completion evidence", "retry and recovery policy"],
    doesNotOwn: ["a specific CRM", "seller data", "telephony accounts", "private business automations"],
    entrypoints: ["process compiler", "process-agent bridge", "completion engine", "approved-plan runtime", "evidence packs"],
    // The public compiler/facade and evidence contracts exist; live execution
    // still depends on the approved runtime and remains separately gated.
    status: "partial",
  },
  {
    id: "jev",
    name: "JEv System-1 Decision Layer",
    purpose: "Cheap deterministic classification and policy routing used inside the controller and workflow engine.",
    owns: ["intent classification", "workflow selection", "approval classification", "fast routing"],
    doesNotOwn: ["long-form generation", "credentials", "external side effects", "final business decisions without policy"],
    entrypoints: ["AgentForgeController", "empirical router target"],
    status: "implemented",
  },
];
