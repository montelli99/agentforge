import { JevDecisionProvider } from "../providers/decision/jevDecision.js";
import type { DecisionOutcome } from "../core/providers/decision.js";
import { buildContextPacket, type ContextPacket } from "../contextPacket.js";
import type { MemoryProvider } from "../core/providers/memory.js";

export type ControllerIntent = "setup" | "route" | "review" | "execute";

export interface ControllerInspection {
  intent: ControllerIntent;
  decision: DecisionOutcome;
  requiresApproval: boolean;
  explanation: string;
  contextPacket: ContextPacket;
}

/**
 * The inner agent that keeps setup and execution policy consistent. It is
 * deliberately deterministic and cheap: generative models can draft, while
 * JEv decides which safe workflow should receive the request.
 */
export class AgentForgeController {
  constructor(private readonly decision = new JevDecisionProvider(), private readonly memory?: MemoryProvider) {}

  async inspect(input: string, context?: Record<string, unknown>): Promise<ControllerInspection> {
    const candidates: ControllerIntent[] = ["setup", "route", "review", "execute"];
    const decision = await this.decision.classify({
      id: `controller-${Date.now()}`,
      taskType: "agentforge-control",
      input,
      candidates,
      context,
    });
    const intent = decision.selectedCandidate as ControllerIntent;
    const requiresApproval = intent === "execute";
    const channelScope = typeof context?.channelId === "string" ? context.channelId : undefined;
    const rememberedRaw = this.memory
      ? await this.memory.query({ namespace: "agentforge-controller", projectId: channelScope, queryText: input.slice(0, 500), limit: 5 })
      : [];
    const remembered = channelScope ? rememberedRaw.filter(({ record }) => record.projectId === channelScope) : rememberedRaw;
    // A short natural-language request often shares no literal token with a
    // durable safety rule. In that case include the newest bounded controller
    // rules rather than silently handing the decision engine an empty memory.
    const fallbackRaw = remembered.length || !this.memory ? remembered : await this.memory.query({
      namespace: "agentforge-controller", projectId: channelScope, categories: ["do_not_repeat", "project_constraint"], limit: 5,
    });
    const fallbackMemory = channelScope ? fallbackRaw.filter(({ record }) => record.projectId === channelScope) : fallbackRaw;
    return {
      intent: candidates.includes(intent) ? intent : "route",
      decision,
      requiresApproval,
      explanation: requiresApproval
        ? "Execution was recognized but remains approval-gated."
        : `The request will be handled by the ${intent} workflow.`,
      contextPacket: buildContextPacket([
        { id: "controller-input", kind: "goal", text: input },
        { id: decision.requestId, kind: "decision", text: `${decision.selectedCandidate}: ${decision.rankings[0]?.reason || "JEv classification"}` },
        ...fallbackMemory.map(({ record }) => ({ id: record.id, kind: "memory" as const, updatedAt: record.updatedAt || record.createdAt,
          text: `${record.title}\n${record.content}` })),
      ]),
    };
  }
}
