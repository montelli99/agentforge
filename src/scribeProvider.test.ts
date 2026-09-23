import { describe, expect, it } from "vitest";
import { ScribeProcessProvider } from "./providers/process/scribeProvider.js";

describe("Scribe process change detection", () => {
  it("reports edited, added, deleted steps and newly introduced review rules", async () => {
    const provider = new ScribeProcessProvider();
    const original = await provider.ingest({
      sourceType: "markdown",
      sourceUri: "file:///intake.md",
      rawContent: [
        "# Seller Intake",
        "1. Confirm the seller name",
        "2. Record bedroom count",
        "3. Record bathroom count",
        "4. Confirm property address",
      ].join("\n"),
    });

    const diff = await provider.detectDiff(original, [
      "# Seller Intake",
      "1. Confirm the seller name",
      "2. Record roof age",
      "3. Confirm property address",
      "4. If the seller asks for an offer, approve it",
    ].join("\n"));

    expect(diff.processId).toBe(original.id);
    expect(diff.previousVersion).toBe(1);
    expect(diff.newVersion).toBe(2);
    expect(diff.modifiedSteps).toHaveLength(1);
    expect(diff.modifiedSteps[0].changes.instruction).toEqual({
      previous: "Record bedroom count",
      updated: "Record roof age",
    });
    expect(diff.deletedStepIds).toEqual(["step-3"]);
    expect(diff.addedSteps.map(step => step.instruction)).toEqual(["If the seller asks for an offer, approve it"]);
    expect(diff.newUnresolvedRules).toHaveLength(1);
    expect(diff.newUnresolvedRules[0].severity).toBe("blocker");
  });

  it("refuses quadratic comparisons above the documented safe step limit", async () => {
    const provider = new ScribeProcessProvider();
    const steps = Array.from({ length: 1_001 }, (_, index) => `${index + 1}. Confirm item ${index + 1}`).join("\n");
    const process = await provider.ingest({ sourceType: "markdown", rawContent: `# Large SOP\n${steps}` });
    await expect(provider.detectDiff(process, `# Large SOP\n${steps}`)).rejects.toThrow(/safe step-comparison limit/);
  });

  it("compares stored snapshots directly when a process has no source text", async () => {
    const provider = new ScribeProcessProvider();
    const current = await provider.ingest({ sourceType: "manual", rawContent: "# Manual SOP\n1. Review the request" });
    delete current.rawContent;
    const target = {
      ...current,
      version: 2,
      steps: [{ ...current.steps[0], title: "Approve the request", instruction: "Approve the request" }],
    };

    const diff = provider.compareProcesses(current, target);
    expect(diff.modifiedSteps[0].changes.instruction).toEqual({
      previous: "Review the request",
      updated: "Approve the request",
    });
  });
});
