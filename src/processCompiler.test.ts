import { describe, expect, it } from "vitest";
import { ProcessCompiler } from "./providers/process/processCompiler.js";
import { ScribeProcessProvider } from "./providers/process/scribeProvider.js";

describe("ProcessCompiler authority rules", () => {
  it("adds an explicit authorization blocker even when a step has an unrelated resolved rule", async () => {
    const process = await new ScribeProcessProvider().ingest({
      sourceType: "markdown",
      rawContent: "# Seller Workflow\n1. Approve the seller offer",
    });
    process.unresolvedRules.push({
      id: "resolved-wording-rule",
      processId: process.id,
      stepId: "step-1",
      question: "Should this be done by email or phone?",
      description: "Preference supplied by the owner.",
      severity: "advisory",
      resolved: true,
      resolvedRuleStatement: "Use email.",
      resolvedByUserId: "owner",
    });

    const spec = new ProcessCompiler().compile(process);
    const authorizationBlocker = spec.unresolvedRules.find(rule =>
      rule.stepId === "step-1" && !rule.resolved && rule.severity === "blocker",
    );

    expect(authorizationBlocker?.question).toContain("explicit authorization criteria");
    expect(spec.suggestedExecutionContract).toMatchObject({
      authority: { productionWrite: false, externalMessage: false, networkOutbound: false },
      completion: { requireHumanApproval: true },
    });
  });
});
