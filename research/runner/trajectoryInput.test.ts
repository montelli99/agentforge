import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { trajectoryInputForModel } from "./trajectoryInput.js";

describe("trajectory model input", () => {
  it("excludes evaluator answers, checks and reference commands", () => {
    const item = { id: "synthetic", input: { task: "Read the event", setup: [{ kind: "file", payload: { path: "state.json", content: "prior context" } }],
      events: [{ kind: "file", payload: { path: "event.json", content: "new event" } }] },
    expected: { requiredFact: "SECRET_ANSWER", observableChecks: [{ kind: "file", target: "result.txt", expected: "SECRET_ANSWER" }] },
    referenceCommand: "EVALUATOR_COMMAND" };
    const prompt = trajectoryInputForModel(item);
    assert.match(prompt, /prior context/);
    assert.match(prompt, /new event/);
    assert.doesNotMatch(prompt, /SECRET_ANSWER|EVALUATOR_COMMAND|observableChecks/);
  });
});
