import { afterEach, describe, expect, it } from "vitest";
import { AgentForgeWebServer } from "./webServer.js";

describe("public system manifest route", () => {
  let server: AgentForgeWebServer | undefined;
  afterEach(async () => { await server?.stop(); server = undefined; });

  it("exposes public subsystem boundaries without private configuration", async () => {
    server = new AgentForgeWebServer(undefined, 0);
    await server.start();
    const response = await fetch(`${server.getBaseUrl()}/api/system/manifest`);
    expect(response.status).toBe(200);
    const body = await response.json() as { product: string; privateDataIncluded: boolean; subsystems: Array<{ id: string; doesNotOwn: string[] }> };
    expect(body.product).toBe("AgentForge public system");
    expect(body.privateDataIncluded).toBe(false);
    expect(body.subsystems.map(item => item.id)).toEqual(["agentforge", "workflow-engine", "jev"]);
    expect(body.subsystems.flatMap(item => item.doesNotOwn).join(" ")).toMatch(/seller data|private credentials/i);
  });

  it("exposes a truthful release gate", async () => {
    server = new AgentForgeWebServer(undefined, 0);
    await server.start();
    const response = await fetch(`${server.getBaseUrl()}/api/release-readiness`);
    expect(response.status).toBe(200);
    const body = await response.json() as { ready: boolean; blockers: string[]; execution: { ready: boolean } };
    expect(body.ready).toBe(false);
    expect(body.execution.ready).toBe(false);
    expect(body.blockers.length).toBeGreaterThan(0);
  });

  it("validates browser actions against the current indexed observation", async () => {
    server = new AgentForgeWebServer(undefined, 0);
    await server.start();
    const response = await fetch(`${server.getBaseUrl()}/api/browser/validate-action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        observation: { id: "obs-1", url: "https://example.test", capturedAt: new Date().toISOString(), elements: [{ index: 1, role: "button", name: "Continue", visible: true }] },
        action: { operation: "CLICK", targetIndex: 1, observationId: "obs-1" },
      }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ accepted: true });
  });

  it("exposes browser ownership and write approval lifecycle", async () => {
    server = new AgentForgeWebServer(undefined, 0);
    await server.start();
    const base = server.getBaseUrl();
    const attach = await fetch(`${base}/api/browser/sessions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "session-1", profileReference: "profile-ref" }) });
    expect(attach.status).toBe(201);
    const observation = { id: "obs-1", url: "https://example.test", capturedAt: new Date().toISOString(), elements: [{ index: 1, role: "button", name: "Continue", visible: true }] };
    await fetch(`${base}/api/browser/sessions/session-1/observe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ observation }) });
    const requestWrite = await fetch(`${base}/api/browser/sessions/session-1/request-write`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ observation, action: { operation: "CLICK", targetIndex: 1, observationId: "obs-1" } }) });
    expect(requestWrite.status).toBe(200);
    const malformed = await fetch(`${base}/api/browser/sessions/session-1/request-write`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: { operation: "CLICK", targetIndex: 1, observationId: "obs-1" } }) });
    expect(malformed.status).toBe(400);
    const unseen = await fetch(`${base}/api/browser/sessions/session-1/request-write`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ observation, action: { operation: "CLICK", targetIndex: 99, observationId: "obs-1" } }) });
    expect(unseen.status).toBe(400);
    const approve = await fetch(`${base}/api/browser/sessions/session-1/approve-write`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ observationId: "obs-1" }) });
    expect(approve.status).toBe(200);
    await expect(approve.json()).resolves.toMatchObject({ operation: "CLICK" });
    const takeover = await fetch(`${base}/api/browser/sessions/session-1/takeover`, { method: "POST" });
    await expect(takeover.json()).resolves.toMatchObject({ mode: "human" });
    expect(server.store.listAuditEntries().some(entry => entry.action === "browser_session_attached")).toBe(true);
    expect(server.store.listAuditEntries().some(entry => entry.action === "browser_session_approve_write")).toBe(true);
  });
});
