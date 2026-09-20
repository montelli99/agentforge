import type { AgentForgeContext, TransportKind, TrustTier } from "./types.js";

export type PolicyDecision = {
  allowed: boolean;
  reason: string;
  transport?: TransportKind;
  trustTier?: TrustTier;
};

export class PolicyEngine {
  decide(context: AgentForgeContext): PolicyDecision {
    if (!context.tenantId) {
      return { allowed: false, reason: "missing tenant" };
    }
    if (!context.selectedRuntime) {
      return { allowed: false, reason: "missing runtime choice" };
    }
    if (!context.selectedTransport) {
      return { allowed: false, reason: "missing transport" };
    }
    return {
      allowed: true,
      reason: "allowed",
      transport: context.selectedTransport,
      trustTier: context.trustTier,
    };
  }
}
