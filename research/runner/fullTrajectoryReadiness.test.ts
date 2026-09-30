import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fullTrajectoryReadiness, type FullTrajectoryCase } from "./fullTrajectoryReadiness.js";

describe("full trajectory readiness", () => {
  it("rejects a phrase-only case even if it has an expected answer", () => {
    const issues = fullTrajectoryReadiness([{ id: "case-1", input: { task: "Recall the deadline" }, expected: { requiredFact: "Friday" } }]);
    assert.deepEqual(issues.map(issue => issue.field), [
      "input.setup", "input.events", "expected.observableChecks", "expected.forbiddenEffects", "limits",
    ]);
  });

  it("accepts a case with observable state, negative control and bounded execution", () => {
    const item: FullTrajectoryCase = {
      id: "case-2",
      input: { task: "Recover a synthetic failed step", setup: [{ kind: "file", payload: { path: "fixture.txt" } }],
        events: [{ kind: "failure", payload: { step: "build" } }] },
      expected: { observableChecks: [{ kind: "file", target: "artifact.txt", expected: "verified" }],
        forbiddenEffects: [{ kind: "file", target: "protected.txt" }] },
      limits: { timeoutMs: 30_000, maxAttempts: 2 },
    };
    assert.deepEqual(fullTrajectoryReadiness([item]), []);
  });
});
