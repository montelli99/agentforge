import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAgentForgeContext } from "./afPilotContext.js";
test("AF context uses the AgentForge memory optimizer with synthetic tenant scope", async () => {
  const result = await buildAgentForgeContext("Recall the synthetic deadline from earlier context");
  assert.equal(result.tenantId, "synthetic-pilot-tenant");
  assert.equal(typeof result.prompt, "string");
  assert.equal(result.memoryHit, true);
  assert.match(result.prompt, /Friday/);
  const otherTenant = await buildAgentForgeContext("Recall the synthetic deadline from earlier context", "other-synthetic-tenant");
  assert.equal(otherTenant.memoryHit, false);
});
