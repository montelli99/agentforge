import { afterEach, describe, expect, it } from "vitest";
import { AgentForgeWebServer } from "./webServer.js";

describe("Workflow Engine routes", () => {
  let server: AgentForgeWebServer | undefined;
  afterEach(async () => { await server?.stop(); server = undefined; });

  it("exposes a durable inspectable goal lifecycle without external changes", async () => {
    server = new AgentForgeWebServer(undefined, 0);
    await server.start();
    const base = server.getBaseUrl();
    const created = await fetch(`${base}/api/workflows/goals`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "Create and verify a release checklist" }),
    });
    expect(created.status).toBe(201);
    const createdBody = await created.json() as { session: { taskId: string; prd: { requirements: Array<{ id: string }> } }; externalChanges: boolean };
    expect(createdBody.externalChanges).toBe(false);
    const taskId = createdBody.session.taskId;
    const requirementId = createdBody.session.prd.requirements[0]?.id;
    expect(requirementId).toBeTruthy();

    const fetched = await fetch(`${base}/api/workflows/goals/${encodeURIComponent(taskId)}`);
    expect(fetched.status).toBe(200);
    expect((await fetched.json() as { session: { taskId: string } }).session.taskId).toBe(taskId);

    const traced = await fetch(`${base}/api/workflows/goals/${encodeURIComponent(taskId)}/traceability`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ requirementId, update: { testNames: ["release-checklist.test.ts"] } }),
    });
    expect(traced.status).toBe(200);
    const started = await fetch(`${base}/api/workflows/goals/${encodeURIComponent(taskId)}/start`, { method: "POST" });
    expect(started.status).toBe(200);
    expect((await started.json() as { session: { state: string } }).session.state).toBe("EXECUTING");
  });
});
