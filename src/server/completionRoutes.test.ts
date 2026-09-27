import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CompletionEngine } from "../core/completion/completionEngine.js";
import { JsonCompletionSessionStore } from "../core/completion/completionSessionStore.js";
import { WorkspaceStore } from "../core/store/workspaceStore.js";
import { AgentForgeWebServer } from "./webServer.js";

async function availablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") return reject(new Error("Could not allocate test port."));
      const port = address.port;
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

describe("completion goal API", () => {
  let server: AgentForgeWebServer | undefined;
  let dataDirectory: string | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
    if (dataDirectory) fs.rmSync(dataDirectory, { recursive: true, force: true });
    dataDirectory = undefined;
  });

  it("creates a goal plan and restores it through the persistent launcher store", async () => {
    dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-goal-api-"));
    const storePath = path.join(dataDirectory, "completion-sessions.json");
    const port = await availablePort();
    const createServer = () => new AgentForgeWebServer(
      new WorkspaceStore(),
      port,
      new CompletionEngine(undefined, new JsonCompletionSessionStore(storePath)),
    );
    server = createServer();
    await server.start();
    const base = `http://127.0.0.1:${port}`;
    const goalText = [
      "Build a reliable local-first AI workforce platform.",
      "- Persist the original goal and requirement plan.",
      "- Verify the implementation with tests.",
      "- Do not write to production services.",
    ].join("\n");

    const created = await fetch(`${base}/api/completion/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ taskId: "goal-persistence-check", rawGoalText: goalText }),
    });
    expect(created.status).toBe(201);
    const session = await created.json() as {
      taskId: string;
      originalGoal: { rawText: string; immutableHash: string };
      prd: { requirements: Array<{ id: string }> };
      state: string;
    };
    expect(session.taskId).toBe("goal-persistence-check");
    expect(session.originalGoal.rawText).toBe(goalText);
    expect(session.originalGoal.immutableHash).toMatch(/^[a-f0-9]{64}$/);
    expect(session.prd.requirements.length).toBeGreaterThan(1);

    const requirementId = session.prd.requirements[0]!.id;
    const traceability = await fetch(`${base}/api/completion/sessions/goal-persistence-check/traceability/${requirementId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({
        codeArtifacts: ["src/planner.ts"],
        testNames: ["src/planner.test.ts"],
        evidencePackIds: ["evidence/planner.json"],
      }),
    });
    expect(traceability.status).toBe(200);
    const traced = await traceability.json() as { traceability: Array<{ requirementId: string; taskIds: string[]; codeArtifacts: string[]; testNames: string[]; evidencePackIds: string[] }> };
    expect(traced.traceability.find(item => item.requirementId === requirementId)).toMatchObject({
      taskIds: ["goal-persistence-check"],
      codeArtifacts: ["src/planner.ts"],
      testNames: ["src/planner.test.ts"],
      evidencePackIds: ["evidence/planner.json"],
    });

    const malformedTraceability = await fetch(`${base}/api/completion/sessions/goal-persistence-check/traceability/${requirementId}`, {
      method: "POST", headers: { "Content-Type": "application/json", Connection: "close" }, body: JSON.stringify({ codeArtifacts: [""] }),
    });
    expect(malformedTraceability.status).toBe(400);

    const duplicate = await fetch(`${base}/api/completion/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ taskId: "goal-persistence-check", rawGoalText: goalText }),
    });
    expect(duplicate.status).toBe(409);

    await server.stop();
    server = createServer();
    await server.start();
    const restored = await fetch(`${base}/api/completion/sessions/goal-persistence-check`, { headers: { Connection: "close" } });
    expect(restored.status).toBe(200);
    const recovered = await restored.json() as typeof session;
    expect(recovered.originalGoal).toEqual(session.originalGoal);
    expect(recovered.prd.requirements.map(requirement => requirement.id)).toEqual(session.prd.requirements.map(requirement => requirement.id));
    expect((recovered as typeof recovered & { traceability: Array<{ requirementId: string; evidencePackIds: string[] }> }).traceability
      .find(record => record.requirementId === requirementId)?.evidencePackIds).toEqual(["evidence/planner.json"]);

    const listed = await fetch(`${base}/api/completion/sessions`, { headers: { Connection: "close" } });
    expect((await listed.json() as Array<{ taskId: string }>).map(item => item.taskId)).toEqual(["goal-persistence-check"]);
  });

  it("rejects oversized or empty goals and reports absent sessions", async () => {
    const port = await availablePort();
    server = new AgentForgeWebServer(new WorkspaceStore(), port);
    await server.start();
    const base = `http://127.0.0.1:${port}`;
    const empty = await fetch(`${base}/api/completion/sessions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawGoalText: " " }),
    });
    expect(empty.status).toBe(400);
    const oversized = await fetch(`${base}/api/completion/sessions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawGoalText: "x".repeat(40_001) }),
    });
    expect(oversized.status).toBe(400);
    const missing = await fetch(`${base}/api/completion/sessions/not-here`);
    expect(missing.status).toBe(404);
  });

  it("recovers goal sessions from the backup snapshot when the primary is damaged", async () => {
    dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-goal-recovery-"));
    const storePath = path.join(dataDirectory, "completion-sessions.json");
    const port = await availablePort();
    const createServer = () => new AgentForgeWebServer(
      new WorkspaceStore(),
      port,
      new CompletionEngine(undefined, new JsonCompletionSessionStore(storePath)),
    );
    server = createServer();
    await server.start();
    const base = `http://127.0.0.1:${port}`;
    const first = await fetch(`${base}/api/completion/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ taskId: "backup-session", rawGoalText: "Keep the first durable goal session." }),
    });
    expect(first.status).toBe(201);
    const second = await fetch(`${base}/api/completion/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ taskId: "backup-session-second", rawGoalText: "Create a backup snapshot." }),
    });
    expect(second.status).toBe(201);
    expect(fs.existsSync(`${storePath}.bak`)).toBe(true);
    await server.stop();
    fs.writeFileSync(storePath, "{ damaged", "utf8");

    server = createServer();
    await server.start();
    const restored = await fetch(`${base}/api/completion/sessions/backup-session`, { headers: { Connection: "close" } });
    expect(restored.status).toBe(200);
    expect((await restored.json() as { taskId: string }).taskId).toBe("backup-session");

    // A write after recovery must repair the primary without replacing the
    // valid backup with the damaged source file.
    const repair = await fetch(`${base}/api/completion/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ taskId: "post-recovery-session", rawGoalText: "Repair the recovered primary snapshot." }),
    });
    expect(repair.status).toBe(201);
    expect(() => JSON.parse(fs.readFileSync(`${storePath}.bak`, "utf8"))).not.toThrow();
  });

  it("recovers a stale completion-session writer lock", async () => {
    dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-goal-lock-"));
    const storePath = path.join(dataDirectory, "completion-sessions.json");
    const port = await availablePort();
    server = new AgentForgeWebServer(
      new WorkspaceStore(),
      port,
      new CompletionEngine(undefined, new JsonCompletionSessionStore(storePath)),
    );
    await server.start();
    const lockPath = `${storePath}.lock`;
    fs.writeFileSync(lockPath, JSON.stringify({ pid: 1, createdAt: "old" }), "utf8");
    const stale = new Date(Date.now() - 60_000);
    fs.utimesSync(lockPath, stale, stale);

    const created = await fetch(`http://127.0.0.1:${port}/api/completion/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ taskId: "stale-lock-session", rawGoalText: "Recover the stale local writer lock." }),
    });
    expect(created.status).toBe(201);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it("keeps completion execution fail-closed until a real worker backend is installed", async () => {
    const port = await availablePort();
    const store = new WorkspaceStore();
    // Seed operational memory record
    store.saveOperationalMemory({
      id: "mem-test-arch",
      namespace: "default",
      category: "project_constraint",
      title: "Hardened Staging Execution",
      content: "All test execution must happen in isolated scratch or worktree boundaries.",
      tags: ["security", "staging"],
      createdAt: new Date().toISOString(),
    });

    server = new AgentForgeWebServer(store, port);
    await server.start();
    const base = `http://127.0.0.1:${port}`;
    const goalText = [
      "BUILD COMPREHENSIVE MULTI-CHANNEL AGENTFORGE PLATFORM",
      "- Implement bidirectional Web, Telegram, and Discord mirroring",
      "- Ensure absolute staging and production isolation with zero writes to production",
      "- Provide deterministic System-1 intent routing and empirical model selection",
      "- Enforce strict Git worktree execution contracts below model layer",
      "- Implement tamper-evident EvidencePack generation and verification",
      "- Support Scribe SOP ingestion and business rule extraction",
      "- Deliver unified actionable inbox and multi-view web control plane",
    ].join("\n");

    // 1. Create session
    const createRes = await fetch(`${base}/api/completion/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "session-e2e-proof", rawGoalText: goalText }),
    });
    expect(createRes.status).toBe(201);
    const sessionData = await createRes.json() as { taskId: string; state: string };
    expect(sessionData.taskId).toBe("session-e2e-proof");
    expect(sessionData.state).toBe("PLANNING");

    // 2. Advance to EXECUTING via /start
    const startRes = await fetch(`${base}/api/completion/sessions/session-e2e-proof/start`, { method: "POST" });
    expect(startRes.status).toBe(200);
    const startedData = await startRes.json() as { state: string };
    expect(startedData.state).toBe("EXECUTING");

    // 3. Create the corresponding task. The server has no executor by default.
    store.createTask({
      id: "session-e2e-proof",
      title: "Hardened Staging Execution",
      status: "ready",
      priority: "high",
      contract: {
        id: "contract-e2e-proof",
        taskId: "session-e2e-proof",
        version: 1,
        repository: { baseBranch: "vnext", baseSha: "abc1234" },
        workspace: { requireIsolatedWorktree: false },
        scope: { allowedPaths: ["src/**"], protectedPaths: [".env"] },
        authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
        requiredChecks: [{ type: "unit_tests", required: true }],
        completion: { requireEvidencePack: true, requireHumanApproval: false },
        createdAt: new Date().toISOString(),
      },
    });

    const runRes = await fetch(`${base}/api/completion/sessions/session-e2e-proof/run`, { method: "POST" });
    expect(runRes.status).toBe(409);
    expect((await runRes.json() as { error: string }).error).toMatch(/not connected/i);
    expect(store.getTask("session-e2e-proof")?.status).toBe("ready");

    // 4. A progress report may exist, but it cannot claim verified completion.
    const reportRes = await fetch(`${base}/api/completion/sessions/session-e2e-proof/report`);
    expect(reportRes.status).toBe(200);
    const report = (await reportRes.json() as { report: string }).report;
    expect(report).not.toContain("COMPLETE_VERIFIED");
    expect(report).not.toContain("YES (Verified)");
  });
});
