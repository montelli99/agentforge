import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { GenerativeModelProvider, ModelRequestOptions, ModelResponse } from "../core/providers/model.js";
import { WorkspaceStore } from "../core/store/workspaceStore.js";
import { AgentForgeWebServer } from "./webServer.js";

class HeldResponseProvider implements GenerativeModelProvider {
  readonly id = "held-test-provider";
  readonly name = "Held test provider";
  readonly defaultTier = 1 as const;
  started!: () => void;
  readonly responseStarted = new Promise<void>(resolve => { this.started = resolve; });

  async isAvailable() { return true; }
  async listModels() { return ["held-model"]; }
  async generate(_options: ModelRequestOptions): Promise<ModelResponse> { throw new Error("This test only uses streaming."); }
  async *stream(options: ModelRequestOptions) {
    this.started();
    await new Promise<void>(resolve => {
      if (options.signal?.aborted) resolve();
      else options.signal?.addEventListener("abort", () => resolve(), { once: true });
    });
  }
}

async function availablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") return reject(new Error("Could not allocate a test port."));
      probe.close(error => error ? reject(error) : resolve(address.port));
    });
  });
}

describe("conversation move API", () => {
  let server: AgentForgeWebServer | undefined;
  let dataDirectory: string | undefined;

  afterEach(async () => {
    await server?.stop();
    if (dataDirectory) fs.rmSync(dataDirectory, { recursive: true, force: true });
    server = undefined;
    dataDirectory = undefined;
  });

  it("moves an entire local private conversation without losing attachments, replies, revisions, or IDs", async () => {
    dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-thread-move-"));
    const port = await availablePort();
    const store = new WorkspaceStore(path.join(dataDirectory, "workspace.json"));
    server = new AgentForgeWebServer(store, port);
    await server.start();
    const base = `http://127.0.0.1:${port}`;
    const call = async (route: string, method = "GET", body?: unknown) => {
      const response = await fetch(base + route, { method, headers: { "Content-Type": "application/json", Connection: "close" }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() as Record<string, unknown> };
    };

    const sourceProject = (await call("/api/projects", "POST", { name: "Source" })).body;
    const destinationProject = (await call("/api/projects", "POST", { name: "Destination" })).body;
    const sourceChannel = (await call(`/api/channels?spaceId=${sourceProject.id}`)).body as unknown as Array<{ id: string }>;
    const destinationChannel = (await call(`/api/channels?spaceId=${destinationProject.id}`)).body as unknown as Array<{ id: string }>;
    const thread = (await call("/api/threads", "POST", { channelId: sourceChannel[0]!.id, title: "Preserve every record" })).body;
    const message = await call("/api/messages", "POST", {
      channelId: sourceChannel[0]!.id,
      threadId: thread.id,
      content: "Original detail",
      attachments: [{ filename: "brief.txt", mimeType: "text/plain", base64: Buffer.from("attachment bytes").toString("base64") }],
    });
    expect(message.status).toBe(201);
    const revised = await call(`/api/threads/${thread.id}/messages/${message.body.id}`, "PATCH", { content: "Corrected detail", expectedContent: "Original detail" });
    expect(revised.status).toBe(200);
    const reply = await call("/api/messages", "POST", { channelId: sourceChannel[0]!.id, threadId: thread.id, content: "Saved reply", replyToMessageId: message.body.id });
    expect(reply.status).toBe(201);
    const listed = await call("/api/threads");
    const listRow = (listed.body as unknown as Array<{ id: string; lastMessagePreview?: { authorType: string; content: string; attachmentCount: number } }>).find(item => item.id === thread.id);
    expect(listRow?.lastMessagePreview).toMatchObject({ authorType: "user", content: "Saved reply", attachmentCount: 0 });

    const moved = await call(`/api/threads/${thread.id}/move`, "POST", { channelId: destinationChannel[0]!.id });
    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({ id: thread.id, channelId: destinationChannel[0]!.id });
    const after = await call(`/api/threads/${thread.id}/messages`);
    const [restoredMessage, restoredReply] = after.body as unknown as Array<{ id: string; channelId: string; attachments: Array<{ sha256: string }>; revisions: Array<{ content: string }>; replyToMessageId?: string }>;
    expect(restoredMessage).toMatchObject({ id: message.body.id, channelId: destinationChannel[0]!.id, revisions: [{ content: "Original detail" }] });
    expect(restoredMessage.attachments[0]!.sha256).toBe((message.body.attachments as Array<{ sha256: string }>)[0]!.sha256);
    expect(restoredReply).toMatchObject({ id: reply.body.id, channelId: destinationChannel[0]!.id, replyToMessageId: message.body.id });

    const publicDestination = store.createChannel({ workspaceId: "ws-default", spaceId: destinationProject.id as string, name: "Public", visibility: "public", archived: false, provider: "agentforge" });
    const archivedDestination = store.createChannel({ workspaceId: "ws-default", spaceId: destinationProject.id as string, name: "Archived", visibility: "private", archived: true, provider: "agentforge" });
    const externalDestination = store.createChannel({ workspaceId: "ws-default", spaceId: destinationProject.id as string, name: "Telegram", visibility: "private", archived: false, provider: "telegram" });
    const otherWorkspace = store.createWorkspace({ name: "Other workspace" });
    const otherProject = store.createSpace({ workspaceId: otherWorkspace.id, name: "Other project", provider: "agentforge" });
    const crossWorkspaceDestination = store.createChannel({ workspaceId: otherWorkspace.id, spaceId: otherProject.id, name: "Other workspace", visibility: "private", archived: false, provider: "agentforge" });
    for (const channelId of ["missing-channel", publicDestination.id, archivedDestination.id, externalDestination.id, crossWorkspaceDestination.id]) {
      const refused = await call(`/api/threads/${thread.id}/move`, "POST", { channelId });
      expect(refused.status).toBe(400);
      expect((await call(`/api/threads/${thread.id}/messages`)).body).toHaveLength(2);
      expect((await call("/api/threads")).body).toMatchObject([{ id: thread.id, channelId: destinationChannel[0]!.id }]);
    }
  });

  it("refuses a move if generation starts while the move request body is still arriving", async () => {
    dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-thread-move-race-"));
    const port = await availablePort();
    const store = new WorkspaceStore(path.join(dataDirectory, "workspace.json"));
    const provider = new HeldResponseProvider();
    server = new AgentForgeWebServer(store, port, undefined, undefined, { conversation: { provider, models: ["held-model"] } });
    await server.start();
    const base = `http://127.0.0.1:${port}`;
    const call = async (route: string, method = "GET", body?: unknown) => {
      const response = await fetch(base + route, { method, headers: { "Content-Type": "application/json", Connection: "close" }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() as Record<string, unknown> };
    };

    const sourceProject = (await call("/api/projects", "POST", { name: "Source" })).body;
    const destinationProject = (await call("/api/projects", "POST", { name: "Destination" })).body;
    const sourceChannel = (await call(`/api/channels?spaceId=${sourceProject.id}`)).body as unknown as Array<{ id: string }>;
    const destinationChannel = (await call(`/api/channels?spaceId=${destinationProject.id}`)).body as unknown as Array<{ id: string }>;
    const thread = (await call("/api/threads", "POST", { channelId: sourceChannel[0]!.id, title: "Keep response in its source" })).body;
    const prompt = await call("/api/messages", "POST", { channelId: sourceChannel[0]!.id, threadId: thread.id, content: "Start a response" });
    expect(prompt.status).toBe(201);

    let finishMoveBody!: () => void;
    const bodyStream = new ReadableStream<Uint8Array>({ start(controller) { finishMoveBody = () => { controller.enqueue(new TextEncoder().encode(JSON.stringify({ channelId: destinationChannel[0]!.id }))); controller.close(); }; } });
    const moveResponsePromise = fetch(base + `/api/threads/${thread.id}/move`, {
      method: "POST", headers: { "Content-Type": "application/json", Connection: "close" }, body: bodyStream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const generationResponsePromise = fetch(base + `/api/threads/${thread.id}/respond`, {
      method: "POST", headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ messageId: prompt.body.id, model: "held-model" }),
    });
    const generationResponse = await generationResponsePromise;
    expect(generationResponse.status).toBe(200);
    await provider.responseStarted;
    finishMoveBody();

    const moveResponse = await moveResponsePromise;
    expect(moveResponse.status).toBe(409);
    expect(await moveResponse.json()).toMatchObject({ error: "Stop the response before moving this conversation." });
    expect((await call(`/api/threads/${thread.id}/messages`)).body).toHaveLength(1);
    expect((await call("/api/threads")).body).toMatchObject([{ id: thread.id, channelId: sourceChannel[0]!.id }]);

    await call(`/api/threads/${thread.id}/stop`, "POST", {});
    expect(await generationResponse.text()).toContain('"status":"stopped"');
  });
});
