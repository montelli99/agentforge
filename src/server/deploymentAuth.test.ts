import { afterEach, describe, expect, it } from "vitest";
import { AgentForgeWebServer } from "./webServer.js";
import { WorkspaceStore } from "../core/store/workspaceStore.js";

describe("deployment authentication boundary", () => {
  let server: AgentForgeWebServer | undefined;
  const previous = process.env.AGENTFORGE_API_TOKEN;
  const previousHost = process.env.AGENTFORGE_HOST;
  const previousStrict = process.env.AGENTFORGE_AUTH_STRICT;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
    if (previous === undefined) delete process.env.AGENTFORGE_API_TOKEN;
    else process.env.AGENTFORGE_API_TOKEN = previous;
    if (previousHost === undefined) delete process.env.AGENTFORGE_HOST;
    else process.env.AGENTFORGE_HOST = previousHost;
    if (previousStrict === undefined) delete process.env.AGENTFORGE_AUTH_STRICT;
    else process.env.AGENTFORGE_AUTH_STRICT = previousStrict;
  });

  it("bootstraps the passwordless local owner exactly once and returns a session", async () => {
    process.env.AGENTFORGE_AUTH_STRICT = "1";
    server = new AgentForgeWebServer(undefined, 0);
    await server.start();
    const base = server.getBaseUrl();

    const bootstrapped = await fetch(`${base}/api/auth/bootstrap`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "a long bootstrap password", displayName: "Release Owner" }),
    });
    expect(bootstrapped.status).toBe(201);
    const session = await bootstrapped.json() as { token: string; user: { displayName: string; role: string } };
    expect(session.token).toMatch(/^af_sess_/);
    expect(session.user).toMatchObject({ displayName: "Release Owner", role: "owner" });
    const cookie = bootstrapped.headers.get("set-cookie");
    expect(cookie).toMatch(/agentforge_session=af_sess_/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");

    const cookieSession = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie!.split(";")[0] } });
    expect(await cookieSession.json()).toMatchObject({ authenticated: true, user: { role: "owner" } });
    const streamAbort = new AbortController();
    const eventStream = await fetch(`${base}/api/realtime`, {
      headers: { Cookie: cookie!.split(";")[0] },
      signal: streamAbort.signal,
    });
    expect(eventStream.status).toBe(200);
    expect(eventStream.headers.get("content-type")).toContain("text/event-stream");
    streamAbort.abort();

    const crossOriginWrite = await fetch(`${base}/api/agents`, {
      method: "POST",
      headers: {
        Cookie: cookie!.split(";")[0],
        Origin: "https://untrusted.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Cross-origin attempt", role: "operator" }),
    });
    expect(crossOriginWrite.status).toBe(403);
    expect(await crossOriginWrite.json()).toMatchObject({ error: "Requests must come from the local AgentForge origin." });
    expect((await (await fetch(`${base}/api/agents`, { headers: { Cookie: cookie!.split(";")[0] } })).json()).some((agent: { name: string }) => agent.name === "Cross-origin attempt")).toBe(false);

    const secondAttempt = await fetch(`${base}/api/auth/bootstrap`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "another long password" }),
    });
    expect(secondAttempt.status).toBe(409);
    const authenticated = await fetch(`${base}/api/workspaces`, { headers: { Authorization: `Bearer ${session.token}` } });
    expect(authenticated.status).toBe(200);

    const loggedOut = await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { Cookie: cookie!.split(";")[0] } });
    expect(loggedOut.status).toBe(200);
    expect(loggedOut.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("requires login for the workspace after local owner setup", async () => {
    delete process.env.AGENTFORGE_AUTH_STRICT;
    const store = new WorkspaceStore();
    server = new AgentForgeWebServer(store, 0);
    await server.start();
    const base = server.getBaseUrl();

    const before = await fetch(`${base}/api/auth/me`);
    expect(await before.json()).toMatchObject({ accessMode: "local_unlocked", ownerSetupRequired: true });
    const bootstrapped = await fetch(`${base}/api/auth/bootstrap`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "a long local owner password" }),
    });
    expect(bootstrapped.status).toBe(201);
    const session = await bootstrapped.json() as { token: string };

    const identity = await fetch(`${base}/api/auth/me`);
    expect(await identity.json()).toMatchObject({ accessMode: "authentication_required", ownerSetupRequired: false });
    expect((await fetch(`${base}/api/workspaces`)).status).toBe(401);
    expect((await fetch(`${base}/api/workspaces`, { headers: { Authorization: `Bearer ${session.token}` } })).status).toBe(200);
  });

  it("requires the configured bearer token for API access", async () => {
    process.env.AGENTFORGE_API_TOKEN = "test-deployment-token";
    server = new AgentForgeWebServer(undefined, 0);
    await server.start();
    const base = server.getBaseUrl();
    await expect(fetch(`${base}/api/status`)).resolves.toMatchObject({ status: 401 });
    await expect(fetch(`${base}/api/status`, { headers: { Authorization: "Bearer test-deployment-token" } }))
      .resolves.toMatchObject({ status: 200 });
  });

  it("treats a verified deployment token as the authenticated deployment owner in strict mode", async () => {
    process.env.AGENTFORGE_API_TOKEN = "test-deployment-token";
    process.env.AGENTFORGE_AUTH_STRICT = "1";
    server = new AgentForgeWebServer(undefined, 0);
    await server.start();
    const base = server.getBaseUrl();

    const unauthenticated = await fetch(`${base}/api/auth/me`);
    expect(unauthenticated.status).toBe(401);
    expect(await unauthenticated.json()).toMatchObject({ error: "Authentication required for this AgentForge deployment." });

    const authenticated = await fetch(`${base}/api/auth/me`, { headers: { Authorization: "Bearer test-deployment-token" } });
    expect(await authenticated.json()).toMatchObject({
      authenticated: true,
      accessMode: "authenticated",
      user: { id: "user-owner", role: "owner" },
    });

    const created = await fetch(`${base}/api/agents`, {
      method: "POST",
      headers: { Authorization: "Bearer test-deployment-token", "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Strict deployment agent", role: "reviewer" }),
    });
    expect(created.status).toBe(201);
  });

  it("keeps authenticated viewers read-only for an endpoint without a narrower route check", async () => {
    process.env.AGENTFORGE_AUTH_STRICT = "1";
    const store = new WorkspaceStore();
    const viewer = store.createUser({ username: "release-viewer", displayName: "Release viewer", role: "viewer" });
    const session = store.createSession(viewer.id);
    server = new AgentForgeWebServer(store, 0);
    await server.start();
    const base = server.getBaseUrl();

    const read = await fetch(`${base}/api/workspaces`, { headers: { Authorization: `Bearer ${session.token}` } });
    expect(read.status).toBe(200);
    const write = await fetch(`${base}/api/workspaces`, {
      method: "POST", headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Must stay read-only" }),
    });
    expect(write.status).toBe(403);
    expect(await write.json()).toMatchObject({ error: "A write-capable role is required for this action." });
  });

  it("binds a strict-mode approval decision to the authenticated reviewer", async () => {
    process.env.AGENTFORGE_AUTH_STRICT = "1";
    const store = new WorkspaceStore();
    const admin = store.createUser({ username: "release-admin", displayName: "Release admin", role: "admin" });
    const session = store.createSession(admin.id);
    const approval = store.createApproval({ taskId: "task-test", requesterAgentId: "agent-test", action: "Review a synthetic change", risk: "low" });
    server = new AgentForgeWebServer(store, 0);
    await server.start();
    const url = `${server.getBaseUrl()}/api/approvals/resolve`;
    const body = JSON.stringify({ approvalId: approval.id, status: "approved" });

    const anonymous = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    expect(anonymous.status).toBe(401);
    expect(store.getApproval(approval.id)?.status).toBe("pending");

    const authenticated = await fetch(url, {
      method: "POST", headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" }, body,
    });
    expect(authenticated.status).toBe(200);
    expect(store.getApproval(approval.id)).toMatchObject({
      status: "approved", approverUserId: admin.id, decisionOrigin: "web",
    });
  });

  it("does not accept an unsigned approval from an unlocked local client", async () => {
    delete process.env.AGENTFORGE_AUTH_STRICT;
    const store = new WorkspaceStore();
    const approval = store.createApproval({ taskId: "task-test", requesterAgentId: "agent-test", action: "Local synthetic review", risk: "low" });
    server = new AgentForgeWebServer(store, 0);
    await server.start();
    const response = await fetch(`${server.getBaseUrl()}/api/approvals/resolve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalId: approval.id, status: "approved" }),
    });
    expect(response.status).toBe(401);
    expect(store.getApproval(approval.id)).toMatchObject({ status: "pending" });
  });

  it("preserves a recoverable owner account when managing workspace access", async () => {
    process.env.AGENTFORGE_AUTH_STRICT = "1";
    const store = new WorkspaceStore();
    const owner = store.getUser("user-owner")!;
    const session = store.createSession(owner.id);
    server = new AgentForgeWebServer(store, 0);
    await server.start();
    const base = server.getBaseUrl();
    const headers = { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" };

    const demote = await fetch(`${base}/api/users/${owner.id}`, {
      method: "PUT", headers, body: JSON.stringify({ role: "admin" }),
    });
    expect(demote.status).toBe(409);
    expect(await demote.json()).toMatchObject({ error: "The final active workspace owner cannot be demoted." });

    const remove = await fetch(`${base}/api/users/${owner.id}`, { method: "DELETE", headers });
    expect(remove.status).toBe(409);
    expect(await remove.json()).toMatchObject({ error: "The final active workspace owner cannot be removed." });
    expect(store.getUser(owner.id)?.role).toBe("owner");
  });

  it("fails closed when a non-loopback control plane has no deployment token", async () => {
    delete process.env.AGENTFORGE_API_TOKEN;
    process.env.AGENTFORGE_HOST = "0.0.0.0";
    server = new AgentForgeWebServer(undefined, 0);

    await expect(server.start()).rejects.toThrow(/AGENTFORGE_API_TOKEN is required/);
    server = undefined;
  });

  it("allows an intentional non-loopback bind only with a bearer boundary", async () => {
    process.env.AGENTFORGE_API_TOKEN = "test-deployment-token";
    process.env.AGENTFORGE_HOST = "0.0.0.0";
    server = new AgentForgeWebServer(undefined, 0);
    await server.start();
    const port = new URL(server.getBaseUrl()).port;

    await expect(fetch(`http://127.0.0.1:${port}/api/status`)).resolves.toMatchObject({ status: 401 });
    await expect(fetch(`http://127.0.0.1:${port}/api/status`, {
      headers: { Authorization: "Bearer test-deployment-token" },
    })).resolves.toMatchObject({ status: 200 });
  });
});
