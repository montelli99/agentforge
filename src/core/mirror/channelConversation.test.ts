import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { GenerativeModelProvider, ModelRequestOptions, ModelResponse, StreamChunk } from "../providers/model.js";
import { WorkspaceStore } from "../store/workspaceStore.js";
import { TelegramMirrorProvider } from "../../providers/channels/telegramMirror.js";
import { UniversalMirrorRouter } from "./universalMirrorRouter.js";
import { ChannelConversation } from "./channelConversation.js";
import { OperationalMemoryProvider } from "../../providers/memory/operationalMemory.js";
import { productFallbackFor, productKnowledgeFor } from "./productKnowledge.js";

describe("linked private Telegram conversation", () => {
  it("answers an approvals question immediately through the native Telegram route", async () => {
    const store = new WorkspaceStore();
    store.linkExternalIdentity("user-owner", { provider: "telegram", externalUserId: "owner",
      linkedAt: new Date().toISOString() });
    const telegram = new TelegramMirrorProvider();
    const sent: string[] = [];
    telegram.attachLiveTransport({ start: async () => {}, stop: () => {}, isRunning: () => true,
      sendMessage: async (_chatId, text) => { sent.push(text); return 301; } });
    const provider: GenerativeModelProvider = {
      id: "test", name: "test", defaultTier: 1, isAvailable: async () => true,
      listModels: async () => ["test-model"],
      generate: async () => { throw new Error("Approvals answer must not wait for the model"); },
      async *stream(): AsyncIterable<StreamChunk> { throw new Error("not used"); },
    };
    new UniversalMirrorRouter(store, telegram, undefined, undefined, undefined, undefined,
      new ChannelConversation(provider, "test-model"));
    await telegram.ingestInboundUpdate({ updateId: 8100, chatId: "private-one", userId: "owner",
      text: "In two sentences, how does AgentForge handle approvals?" });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain("authorized reviewer");
    expect(store.listAuditEntries().find(entry => entry.action === "conversation.replied")?.details)
      .toMatchObject({ route: "local", modelMs: null });
  });
  it("restores the linked private conversation after a fresh workspace process", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-telegram-context-"));
    try {
      const file = path.join(directory, "workspace.json");
      const requests: ModelRequestOptions[] = [];
      const provider: GenerativeModelProvider = {
        id: "test", name: "test", defaultTier: 1, isAvailable: async () => true,
        listModels: async () => ["test-model"],
        generate: async options => { requests.push(options); return { id: String(requests.length), model: "test-model",
          content: requests.length === 1 ? "Remembered response" : "Continued response",
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, finishReason: "stop" }; },
        async *stream(): AsyncIterable<StreamChunk> { throw new Error("not used"); },
      };
      const firstStore = new WorkspaceStore(file);
      firstStore.linkExternalIdentity("user-owner", { provider: "telegram", externalUserId: "owner",
        linkedAt: new Date().toISOString() });
      const firstTelegram = new TelegramMirrorProvider();
      firstTelegram.attachLiveTransport({ start: async () => {}, stop: () => {}, isRunning: () => true,
        sendMessage: async () => 101 });
      new UniversalMirrorRouter(firstStore, firstTelegram, undefined, undefined, undefined, undefined,
        new ChannelConversation(provider, "test-model"));
      await firstTelegram.ingestInboundUpdate({ updateId: 8101, chatId: "private-one", userId: "owner", text: "First question" });
      const secondStore = new WorkspaceStore(file);
      const secondTelegram = new TelegramMirrorProvider();
      secondTelegram.attachLiveTransport({ start: async () => {}, stop: () => {}, isRunning: () => true,
        sendMessage: async () => 102 });
      new UniversalMirrorRouter(secondStore, secondTelegram, undefined, undefined, undefined, undefined,
        new ChannelConversation(provider, "test-model"));
      await secondTelegram.ingestInboundUpdate({ updateId: 8102, chatId: "private-one", userId: "owner", text: "Continue" });
      expect(requests[1].messages.some(message => message.content === "Remembered response")).toBe(true);
      expect(secondStore.findMirroredChannel("telegram", "dm:private-one")?.visibility).toBe("private");
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
  it("retrieves bounded public setup guidance without private repository content", () => {
    const context = productKnowledgeFor("How do I configure a MiMo conversation route?");
    expect(context).toContain("CHAT_SETUP.md");
    expect(context).toContain("MIMO_API_KEY");
    expect(context.length).toBeLessThan(4500);
    expect(productFallbackFor("Please approve my deployment")).toBeUndefined();
  });
  it("returns a verified answer when a slow model is cancelled", async () => {
    const provider: GenerativeModelProvider = {
      id: "slow", name: "slow", defaultTier: 1, isAvailable: async () => true,
      listModels: async () => ["slow"],
      generate: options => new Promise<ModelResponse>((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
      async *stream(): AsyncIterable<StreamChunk> { throw new Error("not used"); },
    };
    const response = await new ChannelConversation(provider, "slow", undefined, 10)
      .reply("chat", "In two sentences, how does AgentForge handle approvals?", "channel", "review");
    expect(response.text).toContain("authorized reviewer");
    expect(response.modelMs).toBeGreaterThanOrEqual(0);
    expect(response.fallback).toBe(true);
  });
  it("does not send an incomplete model reply as a product answer", async () => {
    const provider: GenerativeModelProvider = {
      id: "incomplete", name: "incomplete", defaultTier: 1, isAvailable: async () => true,
      listModels: async () => ["incomplete"],
      generate: async () => ({ id: "1", model: "incomplete", content: "", finishReason: "length",
        usage: { promptTokens: 1, completionTokens: 600, totalTokens: 601 } }),
      async *stream(): AsyncIterable<StreamChunk> { throw new Error("not used"); },
    };
    const response = await new ChannelConversation(provider, "incomplete")
      .reply("chat", "How do I configure a MiMo conversation route?", "channel", "route");
    expect(response.text).toContain("AGENTFORGE_CHAT_PROVIDER=mimo");
    expect(response.fallback).toBe(true);
  });
  it("supplies verified product facts and only same-channel memory to the model", async () => {
    const requests: ModelRequestOptions[] = [];
    const provider: GenerativeModelProvider = {
      id: "test", name: "test", defaultTier: 1, isAvailable: async () => true,
      listModels: async () => ["test-model"],
      generate: async options => { requests.push(options); return { id: "1", model: "test-model", content: "Authorized reviewers decide pending approvals.",
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, finishReason: "stop" }; },
      async *stream(): AsyncIterable<StreamChunk> { throw new Error("not used"); },
    };
    const memory = new OperationalMemoryProvider();
    for (const [projectId, content] of [["chan-one", "First channel approval note"], ["chan-two", "Secret second channel approval note"], [undefined, "Unscoped approval note"]] as const) {
      await memory.record({ namespace: "agentforge-chat", category: "general_fact", title: "Approvals note", content,
        tags: [], projectId });
    }
    const conversation = new ChannelConversation(provider, "test-model", memory);
    await conversation.reply("chat-one", "How do approvals work?", "chan-one", "review");
    const system = requests[0].messages[0].content;
    expect(system).toContain("An approval starts pending");
    expect(system).toContain("JEv intent hint: review");
    expect(system).toContain("First channel approval note");
    expect(system).not.toContain("Secret second channel approval note");
    expect(system).not.toContain("Unscoped approval note");
    await new ChannelConversation(provider, "test-model", memory).reply("chat-one", "What did we discuss?",
      "chan-one", "route", [{ role: "user", content: "Prior question" },
        { role: "assistant", content: "Prior answer" }]);
    expect(requests[1].messages.some(message => message.content === "Prior answer")).toBe(true);
    await conversation.reply("chat-one", "Summarize the latest context", "chan-one", "route",
      Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? "assistant" as const : "user" as const,
        content: `Message ${index} ${"x".repeat(4000)}` })));
    expect(requests[2].messages.slice(1, -1).reduce((total, message) => total + message.content.length, 0))
      .toBeLessThanOrEqual(4000);
  });
  it("keeps context per chat and rejects unlinked or group messages", async () => {
    const requests: ModelRequestOptions[] = [];
    const provider: GenerativeModelProvider = {
      id: "test", name: "test", defaultTier: 1,
      isAvailable: async () => true,
      listModels: async () => ["test-model"],
      generate: async (options): Promise<ModelResponse> => {
        requests.push(options);
        return { id: String(requests.length), model: "test-model", content: `Reply ${requests.length}`,
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, finishReason: "stop" };
      },
      async *stream(): AsyncIterable<StreamChunk> { throw new Error("not used"); },
    };
    const store = new WorkspaceStore();
    store.linkExternalIdentity("user-owner", { provider: "telegram", externalUserId: "linked", linkedAt: new Date().toISOString() });
    const telegram = new TelegramMirrorProvider();
    const sent: Array<{ chatId: string | number; text: string }> = [];
    telegram.attachLiveTransport({ start: async () => {}, stop: () => {}, isRunning: () => true,
      sendMessage: async (chatId, text) => { sent.push({ chatId, text }); return sent.length; } });
    new UniversalMirrorRouter(store, telegram, undefined, undefined, undefined, undefined,
      new ChannelConversation(provider, "test-model"));
    await telegram.ingestInboundUpdate({ updateId: 9001, chatId: "101", userId: "linked", text: "First" });
    await telegram.ingestInboundUpdate({ updateId: 9002, chatId: "101", userId: "linked", text: "Second" });
    await telegram.ingestInboundUpdate({ updateId: 9003, chatId: "202", userId: "linked", text: "Other chat" });
    await telegram.ingestInboundUpdate({ updateId: 9004, chatId: "303", userId: "unlinked", text: "Unknown" });
    await telegram.ingestInboundUpdate({ updateId: 9005, chatId: "-100999", userId: "linked", text: "Group" });
    await telegram.ingestInboundUpdate({ updateId: 9006, chatId: "101", userId: "linked", text: "What's the workspace status?" });
    await telegram.ingestInboundUpdate({ updateId: 9007, chatId: "101", userId: "linked", text: "How do approvals work?" });
    expect(sent).toEqual([{ chatId: "101", text: "Reply 1" }, { chatId: "101", text: "Reply 2" }, { chatId: "202", text: "Reply 3" },
      { chatId: "101", text: expect.stringContaining("Workspace status:") },
      { chatId: "101", text: expect.stringContaining("authorized reviewer") }]);
    expect(requests).toHaveLength(3);
    expect(requests[1].messages.some(message => message.content === "First")).toBe(true);
    expect(requests[2].messages.some(message => message.content === "First")).toBe(false);
  });
});
