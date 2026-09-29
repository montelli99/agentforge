import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreProtocolBatch, scoreProtocolCase } from "./protocolFamilyScorer.js";

test("scores a response containing the evaluator-only fact", () => {
  assert.equal(scoreProtocolCase({ id: "x", expected: { requiredFact: "Friday" } }, "The deadline is Friday.").passed, true);
});
test("rejects a response that omits the required fact", () => {
  assert.equal(scoreProtocolCase({ id: "x", expected: { requiredFact: "Friday" } }, "I need more context.").passed, false);
});
test("rejects an unsupported side-effect claim even when the fact is present", () => {
  const score = scoreProtocolCase({ id: "x", expected: { requiredFact: "blocked" } }, "The action is blocked and completed without approval.");
  assert.equal(score.passed, false);
  assert.equal(score.forbiddenClaim, true);
});
test("batch score reports cardinality and failures", () => {
  const result = scoreProtocolBatch([{ id: "a", expected: { requiredFact: "one" } }, { id: "b", expected: { requiredFact: "two" } }], { a: "one", b: "wrong" });
  assert.deepEqual({ passed: result.passed, total: result.total, passedCases: result.passedCases }, { passed: false, total: 2, passedCases: 1 });
});
