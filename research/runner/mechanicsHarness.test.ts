import { test } from "node:test";
import assert from "node:assert/strict";
import { executeChild, parseObject, validateEnvelope, type Envelope } from "./mechanicsHarness.js";
import { adaptLegacy } from "./mechanicsAdapters.js";
const root = process.cwd();
const child = (source: string, timeout = 3000, limit = 10000) => executeChild(process.execPath, ["-e", source], root, timeout, limit);
const envelope = (): Envelope => ({ schemaVersion: 1, checkId: "test", runId: "run", revision: "revision", inputHashes: { file: "a".repeat(64) }, startedAt: new Date(0).toISOString(), endedAt: new Date(1).toISOString(), passed: true, assertions: [{ id: "ok", passed: true }], artifacts: [], errors: [] });
const validate = (value: Envelope, seen = new Set<string>()) => validateEnvelope(value, { checkId: "test", runId: "run" }, seen, root);
test("accept actual child JSON", async () => { assert.deepEqual(parseObject(await child('console.log(JSON.stringify({valid:true}))')), { valid: true }); await validate(envelope()); });
test("reject exit-zero false result", async () => { const raw = parseObject(await child('console.log(JSON.stringify({passed:false}))')); assert.throws(() => adaptLegacy("validateProtocol", raw, {}), /failure/); });
test("reject malformed real child outputs", async () => { for (const output of ["not json", "null", "{}\n{}", "[]"]) { const stdout = await child(`process.stdout.write(${JSON.stringify(output)})`); assert.throws(() => parseObject(stdout)); } });
test("missing real child output", async () => { const stdout = await child(''); assert.throws(() => parseObject(stdout)); });
test("reject nonzero child", async () => { await assert.rejects(child('process.exit(4)'), /exited 4/); });
test("bound hanging and overflowing children", async () => { await assert.rejects(child('setInterval(()=>{},1000)', 150), /timeout/); await assert.rejects(child('console.log("x".repeat(20000))', 3000, 100), /output limit/); });
test("reject wrong/duplicate IDs and version", async () => { for (const value of [{ ...envelope(), checkId: "wrong" }, { ...envelope(), runId: "wrong" }, { ...envelope(), schemaVersion: 2 }]) await assert.rejects(validate(value as Envelope), /identity/); await assert.rejects(validate(envelope(), new Set(["test"])), /duplicate/); });
test("reject failed assertions, result, artifacts and provenance", async () => {
  for (const value of [{ ...envelope(), passed: false }, { ...envelope(), assertions: [] }, { ...envelope(), assertions: [{ id: "bad", passed: false }] }, { ...envelope(), errors: ["bad"] }, { ...envelope(), artifacts: ["missing-artifact-that-does-not-exist"] }, { ...envelope(), inputHashes: {} }, { ...envelope(), endedAt: "invalid" }]) await assert.rejects(validate(value));
});
test("legacy assertions distinguish expected false from failure", () => { assert.equal(adaptLegacy("workflowRecoverySlice", { blockedPrerequisiteReported: true, completionClaimed: false }, {}).every(a => a.passed), true); assert.equal(adaptLegacy("workflowRecoverySlice", { blockedPrerequisiteReported: false, completionClaimed: false }, {}).every(a => a.passed), false); assert.equal(adaptLegacy("validateProtocol", {}, {}).every(a => a.passed), false); });


test("fixture validators require identities and cardinalities beyond valid true", () => {
  for (const id of ["validateTaskFixtures", "validateProtocolFamilies", "validateHeldoutProtocolFamilies"]) assert.equal(adaptLegacy(id, { valid: true }, {}).every(a => a.passed), false);
  const valid = { valid: true, fixture: "research-protocol-families-v1", families: 6, developmentCases: 12 };
  assert.equal(adaptLegacy("validateProtocolFamilies", valid, {}).every(a => a.passed), true);
  assert.equal(adaptLegacy("validateProtocolFamilies", { ...valid, developmentCases: 11 }, {}).every(a => a.passed), false);
  assert.throws(() => adaptLegacy("validateProtocolFamilies", { ...valid, passed: "true" }, {}), /failure/);
});
