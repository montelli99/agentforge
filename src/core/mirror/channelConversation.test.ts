import { describe, expect, it } from "vitest";
import type { GenerativeModelProvider, ModelRequestOptions, ModelResponse, StreamChunk } from "../providers/model.js";
import { WorkspaceStore } from "../store/workspaceStore.js";
import { TelegramMirrorProvider } from "../../providers/channels/telegramMirror.js";
import { UniversalMirrorRouter } from "./universalMirrorRouter.js";
import { ChannelConversation } from "./channelConversation.js";

describe("linked private Telegram conversation", () => {
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
    expect(sent).toEqual([{ chatId: "101", text: "Reply 1" }, { chatId: "101", text: "Reply 2" }, { chatId: "202", text: "Reply 3" },
      { chatId: "101", text: expect.stringContaining("Workspace status:") }]);
    expect(requests).toHaveLength(3);
    expect(requests[1].messages.some(message => message.content === "First")).toBe(true);
    expect(requests[2].messages.some(message => message.content === "First")).toBe(false);
  });
});
