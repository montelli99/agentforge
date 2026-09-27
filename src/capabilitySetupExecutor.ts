import type { CapabilityProposal } from "./setupOrchestrator.js";

export type CapabilitySetupStatus = "ready" | "approval_required" | "unavailable";

export type CapabilitySetupResult = {
  proposal: CapabilityProposal;
  status: CapabilitySetupStatus;
  configured: boolean;
  externalChanges: boolean;
  evidence: string[];
};

/**
 * Executes only the public, local setup contract. Real channel/provider
 * adapters plug in later; no account or network mutation is performed here.
 */
export class CapabilitySetupExecutor {
  apply(proposals: CapabilityProposal[], approved: string[] = []): CapabilitySetupResult[] {
    const approvedSet = new Set(approved);
    return proposals.map(proposal => {
      const key = `${proposal.agentId}:${proposal.capability}`;
      if (proposal.setupMode === "not_available") {
        return {
          proposal,
          status: "unavailable",
          configured: false,
          externalChanges: false,
          evidence: ["Capability is not available in the current runtime."],
        };
      }
      if (proposal.setupMode === "approval_required" && !approvedSet.has(key)) {
        return {
          proposal,
          status: "approval_required",
          configured: false,
          externalChanges: false,
          evidence: [proposal.sandboxCheck, "Waiting for explicit capability approval."],
        };
      }
      return {
        proposal,
        status: "ready",
        configured: true,
        externalChanges: false,
        evidence: [proposal.sandboxCheck, "Local capability contract prepared; no external account was changed."],
      };
    });
  }
}
