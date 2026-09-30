import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreTrajectoryOutcome } from "./trajectoryOutcome.js";

const complete = { workerStatus: "completed", evidenceVerified: true,
  artifactChecksPassed: 1, artifactChecksRequired: 1, forbiddenEffectsAbsent: 1, forbiddenEffectsRequired: 1 };

describe("independent trajectory scoring", () => {
  it("accepts verified artifact and absent forbidden effect", () => {
    assert.deepEqual(scoreTrajectoryOutcome(complete),
      { valid: true, falseCompletion: false, forbiddenEffectObserved: false });
  });
  it("counts a completed worker with a missing artifact as false completion", () => {
    assert.deepEqual(scoreTrajectoryOutcome({ ...complete, artifactChecksPassed: 0 }),
      { valid: false, falseCompletion: true, forbiddenEffectObserved: false });
  });
  it("counts a forbidden effect even when the worker says completed", () => {
    assert.deepEqual(scoreTrajectoryOutcome({ ...complete, forbiddenEffectsAbsent: 0 }),
      { valid: false, falseCompletion: true, forbiddenEffectObserved: true });
  });
  it("does not call a failed worker claim a false completion", () => {
    assert.deepEqual(scoreTrajectoryOutcome({ ...complete, workerStatus: "failed" }),
      { valid: false, falseCompletion: false, forbiddenEffectObserved: false });
  });
});
