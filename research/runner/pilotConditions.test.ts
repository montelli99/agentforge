import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPilotPrompt, conditionInstruction } from "./pilotConditions.js";
test("conditions have distinct explicit policies", () => {
  const values = ["B0", "B1", "AF"].map((item) => conditionInstruction(item as "B0" | "B1" | "AF"));
  assert.equal(new Set(values).size, 3);
  assert.match(buildPilotPrompt("AF", "synthetic task"), /governed context/);
  assert.match(buildPilotPrompt("B1", "synthetic task"), /rolling summary/);
  assert.doesNotMatch(buildPilotPrompt("B0", "synthetic task"), /rolling summary/);
});
