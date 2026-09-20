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

    for (const candidate of request.candidates) {
      if (normalizedInput.includes(candidate.toLowerCase())) {
        bestCandidate = candidate;
        confidence = 0.96;
        break;
      }
    }

    // Specific domain detection
    if (normalizedInput.includes("fix") || normalizedInput.includes("bug") || normalizedInput.includes("error")) {
      if (request.candidates.includes("bug_fix")) {
        bestCandidate = "bug_fix";
        confidence = 0.95;
      }
    } else if (normalizedInput.includes("test") || normalizedInput.includes("vitest")) {
      if (request.candidates.includes("test_run")) {
        bestCandidate = "test_run";
        confidence = 0.95;
      }
    } else if (normalizedInput.includes("deploy") || normalizedInput.includes("release")) {
      if (request.candidates.includes("deployment")) {
        bestCandidate = "deployment";
        confidence = 0.95;
      }
    }

    return {
      requestId: request.id,
      providerId: this.id,
      selectedCandidate: bestCandidate,
      confidence,
      rankings: [
        { category: bestCandidate, confidence, reason: "System-1 intent pattern match" },
      ],
      latencyMs: Date.now() - startTime,
      costUsd: 0.00001, // Sub-cent operational cost
    };
  }
}
