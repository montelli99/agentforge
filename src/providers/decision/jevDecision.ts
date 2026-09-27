/**
 * Jev Decision Provider (System-1 Model)
 * Section 8 & 9: DecisionProvider for fast, cheap classification and routing.
 * NOT treated as a conversational generative model.
 */

import type {
  DecisionProvider,
  DecisionRequest,
  DecisionOutcome,
} from "../../core/providers/decision.js";

const CONTROLLER_WORKFLOWS = ["setup", "route", "review", "execute"] as const;

function isControllerWorkflowSet(candidates: string[]): boolean {
  return CONTROLLER_WORKFLOWS.every(candidate => candidates.includes(candidate));
}

function classifyControllerWorkflow(input: string): string | undefined {
  if (/\b(run|execute|send|apply|change|delete|start|stop|connect|deploy|publish)\b/.test(input)) return "execute";
  if (/\b(review|audit|verify|validate|inspect|check)\b/.test(input)) return "review";
  if (/\b(set[ -]?up|configure|onboard|create (?:a |an )?(?:team|workspace|agent)|add (?:an )?agent)\b/.test(input)) return "setup";
  if (/\b(what|where|when|who|which|show|find|list|status|next|remaining|help)\b/.test(input)) return "route";
  return undefined;
}

export class JevDecisionProvider implements DecisionProvider {
  readonly id = "jev";
  readonly name = "Jev System-1 Classifier";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async classify(request: DecisionRequest): Promise<DecisionOutcome> {
    const startTime = Date.now();
    const normalizedInput = request.input.toLowerCase();

    // Fast deterministic / heuristic categorization for System-1 routing
    let bestCandidate = request.candidates[0] || "general";
    let confidence = 0.85;
    let reason = "System-1 intent pattern match";

    for (const candidate of request.candidates) {
      if (normalizedInput.includes(candidate.toLowerCase())) {
        bestCandidate = candidate;
        confidence = 0.96;
        reason = "Explicit workflow name in request";
        break;
      }
    }

    // Specific domain detection
    if (normalizedInput.includes("fix") || normalizedInput.includes("bug") || normalizedInput.includes("error")) {
      if (request.candidates.includes("bug_fix")) {
        bestCandidate = "bug_fix";
        confidence = 0.95;
        reason = "Bug-fix intent pattern match";
      }
    } else if (normalizedInput.includes("test") || normalizedInput.includes("vitest")) {
      if (request.candidates.includes("test_run")) {
        bestCandidate = "test_run";
        confidence = 0.95;
        reason = "Test intent pattern match";
      }
    } else if (normalizedInput.includes("deploy") || normalizedInput.includes("release")) {
      if (request.candidates.includes("deployment")) {
        bestCandidate = "deployment";
        confidence = 0.95;
        reason = "Deployment intent pattern match";
      }
    }

    // AgentForge's four controller workflows use ordinary-language verbs. Do
    // not fall back to the first candidate ("setup") for questions such as
    // "what remains?"; it made the setup guide feel forgetful after a plan
    // had already been prepared.
    if (isControllerWorkflowSet(request.candidates)) {
      const workflow = classifyControllerWorkflow(normalizedInput);
      if (workflow) {
        bestCandidate = workflow;
        confidence = 0.94;
        reason = "Controller workflow intent pattern match";
      }
    }

    return {
      requestId: request.id,
      providerId: this.id,
      selectedCandidate: bestCandidate,
      confidence,
      rankings: [
        { category: bestCandidate, confidence, reason },
      ],
      latencyMs: Date.now() - startTime,
      // JEv is local deterministic code; no paid provider call occurred.
      costUsd: 0,
    };
  }
}
