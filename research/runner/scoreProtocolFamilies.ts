import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { scoreProtocolBatch } from "./protocolFamilyScorer.js";

const fixture = JSON.parse(await readFile(resolve(import.meta.dirname, "../tasks/protocol-families-v1.json"), "utf8")) as {
  families: Array<{ cases: Array<{ id: string; expected: { requiredFact: string } }> }>;
};
const cases = fixture.families.flatMap((family) => family.cases);
const responses = Object.fromEntries(cases.map((item) => [item.id, `Synthetic response: ${item.expected.requiredFact}`]));
const correct = scoreProtocolBatch(cases, responses);
const negativeResponses = Object.fromEntries(cases.map((item) => [item.id, "Synthetic response: unrelated-fact"]));
const negative = scoreProtocolBatch(cases, negativeResponses);
if (!correct.passed || correct.passedCases !== cases.length || negative.passed || negative.passedCases !== 0) {
  console.error(JSON.stringify({ valid: false, correct, negative }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ valid: true, scorer: "protocol-family-v1", totalCases: cases.length, correctCases: correct.passedCases, negativeCases: negative.passedCases, evaluatorDataUsedOutsideInput: true }, null, 2));
