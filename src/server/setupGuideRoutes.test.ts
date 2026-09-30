import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { WorkspaceStore } from "../core/store/workspaceStore.js";
import { AgentForgeWebServer } from "./webServer.js";

async function availablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") return reject(new Error("Could not allocate test port."));
      probe.close(error => error ? reject(error) : resolve(address.port));
    });
  });
}

describe("Setup Guide API", () => {
  it("uses the inner JEv controller for natural-language intent", async () => {
    const port = await availablePort();
    server = new AgentForgeWebServer(new WorkspaceStore(), port);
    await server.start();
    const response = await fetch(`http://127.0.0.1:${port}/api/controller/inspect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: "set up a research team" }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ intent: "setup", requiresApproval: false, decision: { providerId: "jev" } });
  });

  it("lets the setup guide inspect local readiness without exposing or changing credentials", async () => {
    const port = await availablePort();
    server = new AgentForgeWebServer(new WorkspaceStore(), port);
    await server.start();
    const response = await fetch(`http://127.0.0.1:${port}/api/setup/auto-detect`, { method: "POST" });
    expect(response.status).toBe(200);
    const result = await response.json() as {
      available: boolean;
      externalChanges: boolean;
      capabilities: Array<{ id: string; configured: boolean; detail: string; runtimeState?: string }>;
    };
    expect(result).toMatchObject({ available: true, externalChanges: false });
    expect(result.capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "model", configured: expect.any(Boolean) }),
      expect.objectContaining({ id: "telegram", configured: expect.any(Boolean) }),
      expect.objectContaining({ id: "execution", configured: expect.any(Boolean) }),
    ]));
    expect(result.capabilities.filter(capability => ["telegram", "discord", "slack"].includes(capability.id))
      .every(capability => typeof capability.runtimeState === "string")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("AGENTFORGE_CHAT_API_KEY");
  });

  it("exposes the public AgentForge, Workflow Engine, and JEv boundaries", async () => {
    const port = await availablePort();
    server = new AgentForgeWebServer(new WorkspaceStore(), port);
    await server.start();
    const response = await fetch(`http://127.0.0.1:${port}/api/system/manifest`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      privateDataIncluded: false,
      subsystems: expect.arrayContaining([
        expect.objectContaining({ id: "agentforge" }),
        expect.objectContaining({ id: "workflow-engine" }),
        expect.objectContaining({ id: "jev" }),
      ]),
    });
  });

  it("starts a durable workflow goal without external side effects", async () => {
    const port = await availablePort();
    const store = new WorkspaceStore();
    server = new AgentForgeWebServer(store, port);
    await server.start();
    const response = await fetch(`http://127.0.0.1:${port}/api/workflows/goals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "Review a process and produce completion evidence." }),
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      session: { originalGoal: { rawText: "Review a process and produce completion evidence." } },
      externalChanges: false,
    });
  });

  it("persists owner answers for another model to resume", async () => {
    const port = await availablePort();
    const store = new WorkspaceStore();
    server = new AgentForgeWebServer(store, port);
    await server.start();
    const response = await fetch(`http://127.0.0.1:${port}/api/setup-guide/answers`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: "execution.boundary", answer: "Sandbox only until I approve external actions." }),
    });
    expect(response.status).toBe(201);
    expect(store.listOperationalMemories("setup-guide")).toEqual(expect.arrayContaining([
      expect.objectContaining({ metadata: expect.objectContaining({ kind: "setup_answer", questionId: "execution.boundary" }) }),
    ]));
  });

  it("keeps prior setup plans as revisions", async () => {
    const port = await availablePort();
    const store = new WorkspaceStore();
    server = new AgentForgeWebServer(store, port);
    await server.start();
    const prepare = (goal: string) => fetch(`http://127.0.0.1:${port}/api/setup-guide/prepare`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rawGoalText: goal }),
    });
    await prepare("Research a topic and prepare a workflow.");
    await prepare("Research a topic, prepare a workflow, and monitor it daily.");
    const status = await fetch(`http://127.0.0.1:${port}/api/setup-guide/status`).then(response => response.json());
    expect(status.setupRevisions.length).toBeGreaterThanOrEqual(1);
  });
  let server: AgentForgeWebServer | undefined;
  let dataDirectory: string | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
    if (dataDirectory) fs.rmSync(dataDirectory, { recursive: true, force: true });
    dataDirectory = undefined;
  });

  it("keeps first-run setup out of a Telegram mirror created before onboarding", async () => {
    const port = await availablePort();
    dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-setup-mirror-"));
    const store = new WorkspaceStore(path.join(dataDirectory, "workspace.json"));
    const workspace = store.getWorkspace()!;
    const mirror = store.createSpace({ workspaceId: workspace.id, name: "Telegram Mirror",
      provider: "telegram", externalId: "synthetic-chat" });
    store.createChannel({ workspaceId: workspace.id, spaceId: mirror.id, name: "Private chat",
      visibility: "private", archived: false, provider: "telegram", externalId: "dm:synthetic-chat" });
    server = new AgentForgeWebServer(store, port);
    await server.start();
    const before = await fetch(`http://127.0.0.1:${port}/api/setup-guide/status`).then(response => response.json());
    expect(before.prepared).toBe(false);
    const response = await fetch(`http://127.0.0.1:${port}/api/setup-guide/prepare`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ rawGoalText: "Build a research assistant with reviewable evidence." }),
    });
    expect(response.status).toBe(201);
    const prepared = await response.json();
    expect(prepared.project.provider).toBe("agentforge");
    expect(prepared.project.id).not.toBe(mirror.id);
    expect(prepared.channel.spaceId).toBe(prepared.project.id);
    const status = await fetch(`http://127.0.0.1:${port}/api/setup-guide/status`).then(reply => reply.json());
    expect(status.project.id).toBe(prepared.project.id);
  });

  it("creates a safe local project structure and a persisted guide from an outcome", async () => {
    const port = await availablePort();
    // A durable installation starts empty apart from the owner workspace.
    dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-setup-guide-"));
    const store = new WorkspaceStore(path.join(dataDirectory, "workspace.json"));
    server = new AgentForgeWebServer(store, port);
    await server.start();
    const unpreparedStatus = await fetch(`http://127.0.0.1:${port}/api/setup-guide/status`);
    expect(unpreparedStatus.status).toBe(200);
    expect(await unpreparedStatus.json()).toMatchObject({
      prepared: false,
      requirementCount: 0,
      openQuestions: [],
      nextAction: "Tell the guide the outcome you want to achieve.",
      gates: expect.arrayContaining([expect.objectContaining({ key: "modelPlanning", ready: false })]),
    });
    const response = await fetch(`http://127.0.0.1:${port}/api/setup-guide/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ rawGoalText: "Build a reviewable local-first agent workspace." }),
    });

    expect(response.status).toBe(201);
    const prepared = await response.json() as {
      project: { id: string; name: string };
      channel: { id: string; spaceId: string; name: string };
      guide: { id: string; name: string; tools: string[]; permissions: string[]; computePolicy: { environment: string } };
      thread: { id: string; channelId: string; title: string };
      session: { originalGoal: { rawText: string } };
      missing: string[];
      preparedAgents: Array<{ name: string; tools: string[]; modelPolicy: { preferredModel: string }; computePolicy: { environment: string } }>;
      sandboxOnly: boolean;
    };
    expect(prepared.project.name).toBe("Build a reviewable local-first agent workspace");
    expect(store.getWorkspace()?.experience).toBe("studio");
    expect(prepared.channel).toMatchObject({ spaceId: prepared.project.id, name: "General" });
    expect(prepared.thread).toMatchObject({ channelId: prepared.channel.id, title: "Workspace setup" });
    expect(prepared.guide).toMatchObject({
      id: "agent-setup-guide",
      name: "Setup Guide",
      tools: [],
      permissions: [],
      computePolicy: { environment: "none" },
    });
    expect(prepared.session.originalGoal.rawText).toBe("Build a reviewable local-first agent workspace.");
    expect(prepared.missing.length).toBeGreaterThan(0);
    expect(prepared.sandboxOnly).toBe(true);
    expect(prepared.preparedAgents.map(agent => agent.name)).toEqual([
      "AgentForge Coordinator", "Workflow Engine", "JEv System-1 Router", "Outcome coordinator",
    ]);
    expect(prepared.preparedAgents.every(agent =>
      agent.modelPolicy.preferredModel === "unconfigured"
      && agent.computePolicy.environment === "none"
      && agent.tools.every(tool => tool === "process-compiler"),
    )).toBe(true);

    const preparedGuideStatus = await fetch(`http://127.0.0.1:${port}/api/setup-guide/status`).then(response => response.json()) as {
      openQuestions: Array<{ id: string }>;
      nextQuestion?: { id: string };
    };
    expect(preparedGuideStatus.nextQuestion?.id).toBe("execution.boundary");
    expect(preparedGuideStatus.openQuestions.map(question => question.id)).toContain("execution.boundary");

    const savedAnswer = await fetch(`http://127.0.0.1:${port}/api/setup-guide/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ questionId: "execution.boundary", answer: "Keep the first run in sandbox mode." }),
    });
    expect(savedAnswer.status).toBe(201);
    const answeredGuideStatus = await fetch(`http://127.0.0.1:${port}/api/setup-guide/status`).then(response => response.json()) as {
      openQuestions: unknown[];
      nextQuestion?: unknown;
      setupAnswers: Array<{ questionId: string; answer: string }>;
    };
    expect(answeredGuideStatus).toMatchObject({
      openQuestions: [],
      setupAnswers: expect.arrayContaining([expect.objectContaining({ questionId: "execution.boundary", answer: "Keep the first run in sandbox mode." })]),
    });
    expect(answeredGuideStatus.nextQuestion).toBeUndefined();

    const deniedProvision = await fetch(`http://127.0.0.1:${port}/api/setup-guide/provision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ rawGoalText: "Research and monitor this workflow daily", approved: false }),
    });
    expect(deniedProvision.status).toBe(400);

    const provision = await fetch(`http://127.0.0.1:${port}/api/setup-guide/provision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ rawGoalText: "Research and monitor this workflow daily", approved: true }),
    });
    expect(provision.status).toBe(201);
    const provisioned = await provision.json() as { agents: Array<{ name: string; tools: string[]; modelPolicy: { preferredModel: string } }>; sandboxOnly: boolean };
    expect(provisioned.sandboxOnly).toBe(true);
    expect(provisioned.agents.map(agent => agent.name)).toEqual([
      "AgentForge Coordinator", "Workflow Engine", "JEv System-1 Router",
      "Research analyst", "Operations coordinator",
    ]);
    expect(provisioned.agents.filter(agent => ["Research analyst", "Operations coordinator"].includes(agent.name))
      .every(agent => agent.tools.length === 0 && agent.modelPolicy.preferredModel === "unconfigured")).toBe(true);

    const capabilities = await fetch(`http://127.0.0.1:${port}/api/setup-guide/capabilities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ rawGoalText: "Draft replies and monitor this workflow daily" }),
    });
    expect(capabilities.status).toBe(200);
    const capabilityPlan = await capabilities.json() as { externalChanges: boolean; readiness: { canStartSandbox: boolean; automaticCapabilities: string[]; approvalRequiredCapabilities: string[]; nextAction: string }; capabilities: Array<{ capability: string; setupMode: string }> };
    expect(capabilityPlan.externalChanges).toBe(false);
    expect(capabilityPlan.capabilities.some(item => item.capability === "channel" && item.setupMode === "approval_required")).toBe(true);
    expect(capabilityPlan.readiness).toMatchObject({
      canStartSandbox: true,
      automaticCapabilities: expect.arrayContaining(["workspace", "agent", "memory"]),
      approvalRequiredCapabilities: expect.arrayContaining(["channel", "schedule"]),
    });

    const execution = await fetch(`http://127.0.0.1:${port}/api/setup-guide/execute-capabilities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ rawGoalText: "Draft replies and monitor this workflow daily", approved: [] }),
    });
    expect(execution.status).toBe(200);
    const executionResult = await execution.json() as { externalChanges: boolean; results: Array<{ status: string }> };
    expect(executionResult.externalChanges).toBe(false);
    expect(executionResult.results.some(result => result.status === "approval_required")).toBe(true);
    await expect(fetch(`http://127.0.0.1:${port}/api/setup-guide/status`).then(response => response.json())).resolves.toMatchObject({
      capabilityState: expect.objectContaining({ goal: "Draft replies and monitor this workflow daily", approved: [] }),
    });

    const connection = await fetch(`http://127.0.0.1:${port}/api/setup-guide/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ provider: "slack", mode: "live", credentialReference: "secret-ref-test", approved: false }),
    });
    expect(connection.status).toBe(200);
    const connectionResult = await connection.json() as { record: { id: string; state: string }; check: { externalChanges: boolean } };
    expect(connectionResult.record.state).toBe("live_pending_approval");
    expect(connectionResult.check.externalChanges).toBe(false);
    await expect(fetch(`http://127.0.0.1:${port}/api/setup-guide/connections`).then(response => response.json())).resolves.toMatchObject({
      connections: expect.arrayContaining([expect.objectContaining({ id: connectionResult.record.id, provider: "slack" })]),
      externalChanges: false,
    });
    await expect(fetch(`http://127.0.0.1:${port}/api/setup-guide/connections/health`).then(response => response.json())).resolves.toMatchObject({
      checks: expect.arrayContaining([expect.objectContaining({ id: connectionResult.record.id, adapterAvailable: true, approvalRequired: true })]),
      externalChanges: false,
    });

    const callback = await fetch(`http://127.0.0.1:${port}/api/setup-guide/connections/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({
        recordId: connectionResult.record.id,
        provider: "slack",
        externalWorkspaceId: "workspace-sandbox-001",
        credentialReference: "secret-ref-test",
        approved: true,
      }),
    });
    expect(callback.status).toBe(200);
    await expect(callback.json()).resolves.toMatchObject({
      record: { state: "live_connected", externalWorkspaceId: "workspace-sandbox-001" },
      check: { externalChanges: false },
      externalChanges: false,
    });

    const runtime = await fetch(`http://127.0.0.1:${port}/api/setup-guide/channel-runtime`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ provider: "slack", action: "start" }),
    });
    expect(runtime.status).toBe(200);
    const runtimeResult = await runtime.json() as { status: { state: string; readiness: { status: string; missing: string[] } }; externalChanges: boolean };
    // A sandbox registration is configured but has not authenticated a live
    // provider session, so the runtime must not present it as ready.
    expect(runtimeResult.status.state).toBe("starting");
    expect(runtimeResult.status.readiness.status).toBe("sandbox");
    expect(runtimeResult.status.readiness.missing).toContain("live provider acceptance");
    expect(runtimeResult.externalChanges).toBe(false);

    const runtimeConfig = await fetch(`http://127.0.0.1:${port}/api/setup-guide/channel-runtime`);
    expect(runtimeConfig.status).toBe(200);
    await expect(runtimeConfig.json()).resolves.toMatchObject({
      nativeSlackSocketMode: { configured: false, missing: expect.arrayContaining(["AGENTFORGE_SLACK_APP_TOKEN or AGENTFORGE_SLACK_APP_TOKEN_FILE", "AGENTFORGE_SLACK_BOT_TOKEN or AGENTFORGE_SLACK_BOT_TOKEN_FILE"]) },
    });

    const preparedStatus = await fetch(`http://127.0.0.1:${port}/api/setup-guide/status`);
    expect(preparedStatus.status).toBe(200);
    expect(await preparedStatus.json()).toMatchObject({
      prepared: true,
      project: { id: prepared.project.id },
      channel: { id: prepared.channel.id },
      guide: { id: "agent-setup-guide" },
      thread: { id: prepared.thread.id },
      outcome: "Build a reviewable local-first agent workspace.",
      requirementCount: expect.any(Number),
      requirements: expect.arrayContaining([
        expect.objectContaining({ id: expect.any(String), title: expect.any(String), acceptanceCriteria: expect.any(Array) }),
      ]),
      runtimeReadiness: expect.objectContaining({
        available: true,
        externalChanges: false,
        capabilities: expect.arrayContaining([expect.objectContaining({ id: "telegram", runtimeState: expect.any(String) })]),
      }),
      nextAction: "Choose a model route",
    });
    expect(store.listThreadMessages(prepared.thread.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({ authorId: "agent-setup-guide", authorType: "agent", content: expect.stringContaining("I prepared this workspace") }),
    ]));

    const question = await fetch(`http://127.0.0.1:${port}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ channelId: prepared.channel.id, threadId: prepared.thread.id, content: "What remains?" }),
    });
    expect(question.status).toBe(201);
    expect(store.listThreadMessages(prepared.thread.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        authorId: "agent-setup-guide",
        content: expect.stringMatching(/I have the project, private channel, guide conversation, and requirement plan organized\.[\s\S]*Local readiness:/),
      }),
    ]));

    const setupQuestion = await fetch(`http://127.0.0.1:${port}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ channelId: prepared.channel.id, threadId: prepared.thread.id, content: "Can you set this up for me?" }),
    });
    expect(setupQuestion.status).toBe(201);
    expect(store.listThreadMessages(prepared.thread.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({ authorId: "agent-setup-guide", content: expect.stringContaining("I can prepare the project, private channel, durable guide conversation, and reviewable plan") }),
    ]));

    const planQuestion = await fetch(`http://127.0.0.1:${port}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ channelId: prepared.channel.id, threadId: prepared.thread.id, content: "What is in the plan?" }),
    });
    expect(planQuestion.status).toBe(201);
    expect(store.listThreadMessages(prepared.thread.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({ authorId: "agent-setup-guide", content: expect.stringContaining("The saved plan has") }),
    ]));

    const nextQuestion = await fetch(`http://127.0.0.1:${port}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ channelId: prepared.channel.id, threadId: prepared.thread.id, content: "What should I do next?" }),
    });
    expect(nextQuestion.status).toBe(201);
    expect(store.listThreadMessages(prepared.thread.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({ authorId: "agent-setup-guide", content: expect.stringContaining("I can also explain the plan") }),
    ]));

    const second = await fetch(`http://127.0.0.1:${port}/api/setup-guide/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ rawGoalText: "Prepare another plan without duplicating the guide." }),
    });
    expect(second.status).toBe(201);
    expect(store.listAgents().filter(agent => agent.id === "agent-setup-guide")).toHaveLength(1);
    expect(store.listSpaces("ws-default").filter(space => !space.archived)).toHaveLength(1);
    expect(store.listThreads(prepared.channel.id).filter(thread => thread.title === "Workspace setup" && !thread.archived)).toHaveLength(1);
    expect(store.listThreadMessages(prepared.thread.id).filter(message => message.authorId === "agent-setup-guide")).toHaveLength(5);
  });

  it("rejects empty outcomes", async () => {
    const port = await availablePort();
    server = new AgentForgeWebServer(new WorkspaceStore(), port);
    await server.start();
    const response = await fetch(`http://127.0.0.1:${port}/api/setup-guide/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ rawGoalText: " " }),
    });
    expect(response.status).toBe(400);
  });
});
