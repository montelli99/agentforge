import type { AgentForgeContext } from "./types.js";

export type ReflectionVerdict = {
  decision: "approve" | "revise" | "reject";
  score: number;
  reasons: string[];
};

export class ReflectionEngine {
  preflight(context: AgentForgeContext): ReflectionVerdict {
    const reasons: string[] = [];
    if (context.reflection.preflight === "reject") {
      return { decision: "reject", score: 0.1, reasons: ["explicit preflight reject"] };
    }
    if (context.reflection.preflight === "revise") {
      return { decision: "revise", score: 0.6, reasons: ["explicit preflight revise"] };
    }
    if (context.sideEffecting) {
      reasons.push("side effect acknowledged");
    }
    return { decision: "approve", score: 0.95, reasons };
  }

  postResult(context: AgentForgeContext): ReflectionVerdict {
    const reasons: string[] = [];
    if (context.reflection.postResult === "reject") {
      return { decision: "reject", score: 0.2, reasons: ["explicit post-result reject"] };
    }
    if (context.reflection.postResult === "revise") {
      return { decision: "revise", score: 0.7, reasons: ["explicit post-result revise"] };
    }
    if (!context.auditAvailable) {
      reasons.push("audit unavailable");
    }
    return { decision: "approve", score: 0.9, reasons };
  }
}
