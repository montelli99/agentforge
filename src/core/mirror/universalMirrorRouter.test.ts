import { describe, it, expect, beforeEach } from "vitest";
import { WorkspaceStore } from "../store/workspaceStore.js";
import { TelegramMirrorProvider } from "../../providers/channels/telegramMirror.js";
import { DiscordMirrorProvider } from "../../providers/channels/discordMirror.js";
import { UniversalMirrorRouter } from "./universalMirrorRouter.js";

describe("UniversalMirrorRouter (Sections 8, 9, 10: Telegram & Discord Remote Control)", () => {
  let store: WorkspaceStore;
  let telegram: TelegramMirrorProvider;
  let discord: DiscordMirrorProvider;
  let router: UniversalMirrorRouter;

  beforeEach(() => {
    store = new WorkspaceStore();
    telegram = new TelegramMirrorProvider();
    discord = new DiscordMirrorProvider();
    router = new UniversalMirrorRouter(store, telegram, discord);
  });

  it("routes a linked owner's plain-language task control through the command permission path", async () => {
    const sent: string[] = [];
    telegram.attachLiveTransport({ start: async () => {}, stop: () => {}, isRunning: () => true,
      sendMessage: async (_chatId, text) => { sent.push(text); return 51; } });
    store.linkExternalIdentity("user-owner", { provider: "telegram", externalUserId: "owner-tg",
      linkedAt: new Date().toISOString() });
    const task = store.createTask({ id: "AF-NATURAL-1", title: "Prepare launch review",
      priority: "medium", status: "in_progress" });
    await telegram.ingestInboundUpdate({ updateId: 304, chatId: "123456789", userId: "owner-tg",
      text: "pause task Prepare launch review" });
    expect(store.getTask(task.id)?.status).toBe("paused");
    expect(sent[0]).toContain("has been paused");
    expect(store.listAuditEntries().some(entry => entry.action === "command.pause")).toBe(true);
    const privateChannel = store.findMirroredChannel("telegram", "dm:123456789");
    expect(store.listMessages(privateChannel!.id).some(message =>
      message.authorType === "agent" && message.content.includes("has been paused"))).toBe(true);
  });

  it("does not guess among duplicate task titles or act for an unlinked sender", async () => {
    const sent: string[] = [];
    telegram.attachLiveTransport({ start: async () => {}, stop: () => {}, isRunning: () => true,
      sendMessage: async (_chatId, text) => { sent.push(text); return 52; } });
    store.linkExternalIdentity("user-owner", { provider: "telegram", externalUserId: "owner-tg",
      linkedAt: new Date().toISOString() });
    const first = store.createTask({ id: "AF-NATURAL-2", title: "Review release", priority: "medium", status: "in_progress" });
    const second = store.createTask({ id: "AF-NATURAL-3", title: "Review release", priority: "medium", status: "in_progress" });
    await telegram.ingestInboundUpdate({ updateId: 305, chatId: "123456789", userId: "owner-tg",
      text: "cancel task Review release" });
    await telegram.ingestInboundUpdate({ updateId: 306, chatId: "999999999", userId: "unlinked",
      text: `pause task ${first.id}` });
    expect(sent[0]).toContain("multiple tasks");
    expect(store.getTask(first.id)?.status).toBe("in_progress");
    expect(store.getTask(second.id)?.status).toBe("in_progress");
  });

  it("answers a linked owner's read-only question in the originating group topic", async () => {
    const sent: Array<{ chatId: string | number; text: string; topicId?: number }> = [];
    telegram.attachLiveTransport({ start: async () => {}, stop: () => {}, isRunning: () => true,
      sendMessage: async (chatId, text, topicId) => { sent.push({ chatId, text, topicId }); return 53; } });
    store.linkExternalIdentity("user-owner", { provider: "telegram", externalUserId: "owner-tg",
      linkedAt: new Date().toISOString() });
    await telegram.ingestInboundUpdate({ updateId: 307, chatId: "-100123", topicId: 389,
      userId: "owner-tg", text: "What needs my approval?" });
    expect(sent).toEqual([{ chatId: "-100123", topicId: 389,
      text: expect.stringContaining("Pending Approvals") }]);
    const channel = store.findMirroredChannel("telegram", "group:-100123:topic:389");
    expect(store.listMessages(channel!.id).some(message => message.authorType === "agent" &&
      message.content.includes("Pending Approvals"))).toBe(true);
    await telegram.ingestInboundUpdate({ updateId: 308, chatId: "-100123", topicId: 389,
      userId: "owner-tg", text: "pause task AF-1" });
    expect(sent).toHaveLength(1);
  });

  it("sends a private Telegram link reply to the originating chat without a topic ID", async () => {
    const sent: Array<{ chatId: string | number; text: string; topicId?: number }> = [];
    telegram.attachLiveTransport({
      start: async () => {},
      stop: () => {},
      isRunning: () => true,
      sendMessage: async (chatId, text, topicId) => { sent.push({ chatId, text, topicId }); return 42; },
    });
    const { code } = router.issueTelegramLinkCode("user-owner");
    await telegram.ingestInboundUpdate({
      updateId: 301,
      chatId: "123456789",
      userId: "owner-tg",
      text: `/link ${code}, then /status`,
    });
    expect(sent).toEqual([{ chatId: "123456789", text: expect.stringContaining("linked"), topicId: undefined }]);
    expect(store.findUserByExternalId("telegram", "owner-tg")?.id).toBe("user-owner");
    expect(store.listAuditEntries().find(entry => entry.action === "identity.telegram.linked")?.details).toMatchObject({ outboundMessageId: "42" });
  });

  it("uses a Telegram thread ID only when the inbound group message has one", async () => {
    const sent: Array<{ chatId: string | number; topicId?: number }> = [];
    telegram.attachLiveTransport({
      start: async () => {},
      stop: () => {},
      isRunning: () => true,
      sendMessage: async (chatId, _text, topicId) => { sent.push({ chatId, topicId }); return 43; },
    });
    await telegram.ingestInboundUpdate({ updateId: 302, chatId: "-100123", userId: "unlinked", text: "/status" });
    await telegram.ingestInboundUpdate({ updateId: 303, chatId: "-100123", topicId: 7, userId: "unlinked", text: "/status" });
    expect(sent).toEqual([
      { chatId: "-100123", topicId: undefined },
      { chatId: "-100123", topicId: 7 },
    ]);
  });

  it("suppresses echoes: does not reflect inbound external message back to same origin", async () => {
    let tgOutboundCount = 0;
    let dcOutboundCount = 0;

    telegram.sendMessage = async () => {
      tgOutboundCount++;
      return { externalMessageId: "tg-out-1" };
    };
    discord.sendMessage = async () => {
      dcOutboundCount++;
      return { externalMessageId: "dc-out-1" };
    };

    // Inbound from Telegram
    await telegram.ingestInboundUpdate({
      updateId: 1001,
      chatId: "tg-chat-1",
      userId: "user-owner",
      text: "Progress update on sprint tasks",
    });

    const privateChannel = store.findMirroredChannel("telegram", "dm:tg-chat-1");
    expect(privateChannel?.visibility).toBe("private");
    const messages = store.listMessages(privateChannel!.id);
    expect(messages.some(m => m.content === "Progress update on sprint tasks")).toBe(true);

    // Loop suppression must ensure 0 outbound messages back to Telegram
    expect(tgOutboundCount).toBe(0);
  });

  it("separates private chats and repeated group topic IDs in canonical storage", async () => {
    await telegram.ingestInboundUpdate({ updateId: 1101, chatId: "101", userId: "one", text: "First private" });
    await telegram.ingestInboundUpdate({ updateId: 1102, chatId: "202", userId: "two", text: "Second private" });
    await telegram.ingestInboundUpdate({ updateId: 1103, chatId: "-1001", topicId: 7, userId: "one", text: "First group" });
    await telegram.ingestInboundUpdate({ updateId: 1104, chatId: "-1002", topicId: 7, userId: "two", text: "Second group" });
    const ids = ["dm:101", "dm:202", "group:-1001:topic:7", "group:-1002:topic:7"];
    const channels = ids.map(id => store.findMirroredChannel("telegram", id));
    expect(channels.every(Boolean)).toBe(true);
    expect(new Set(channels.map(channel => channel!.id)).size).toBe(4);
    expect(channels.map(channel => store.listMessages(channel!.id).length)).toEqual([1, 1, 1, 1]);
    expect(channels.slice(0, 2).every(channel => channel!.visibility === "private")).toBe(true);
  });

  it("keeps external adapters visibly bounded to sandbox readiness", () => {
    expect(telegram.readiness?.().status).toBe("sandbox");
    expect(discord.readiness?.().status).toBe("sandbox");
    expect(telegram.readiness?.().missing).toContain("live provider acceptance");
    expect(discord.readiness?.().missing).toContain("live provider acceptance");
  });

  it("mirrors native workspace messages out to bound Discord channels", async () => {
    let sentToDiscord: { channelId: string; text: string } | null = null;
    discord.sendMessage = async (msg) => {
      sentToDiscord = { channelId: msg.canonicalChannelId, text: msg.text };
      return { externalMessageId: "dc-out-2" };
    };

    // Create a mirrored channel for Discord
    const discordChannel = store.createChannel({
      workspaceId: "ws-default",
      spaceId: "space-native",
      name: "discord-ops",
      visibility: "public",
      archived: false,
      provider: "discord",
      externalId: "dc-chan-888",
    });

    // Send a message to the mirrored channel
    store.createMessage({
      channelId: discordChannel.id,
      authorId: "user-owner",
      authorType: "user",
      content: "Deployment complete for vNext release.",
    });

    // Allow async tick for event dispatching
    await new Promise(r => setTimeout(r, 50));

    expect(sentToDiscord).not.toBeNull();
    expect((sentToDiscord as { channelId: string; text: string } | null)?.text).toContain("Deployment complete");
  });

  it("processes Discord remote control commands and logs audit trails", async () => {
    // Link Discord external identity to user-owner
    store.linkExternalIdentity("user-owner", {
      provider: "discord",
      externalUserId: "dc-user-owner",
      externalUsername: "owner_discord",
      linkedAt: new Date().toISOString(),
    });

    let replyReceived = "";
    discord.sendMessage = async (msg) => {
      replyReceived = msg.text;
      return { externalMessageId: "dc-cmd-reply" };
    };

    await discord.ingestInboundInteraction({
      interactionId: "int-cmd-1",
      guildId: "guild-main",
      channelId: "chan-ops",
      userId: "dc-user-owner",
      command: "status",
    });

    expect(replyReceived).toContain("AgentForge Status");

    const audits = store.listAuditEntries().filter(a => a.origin === "discord");
    expect(audits.length).toBeGreaterThan(0);
    expect(audits.some(a => a.action === "command.status")).toBe(true);
  });

  it("executes interactive button callback approvals from Discord", async () => {
    // Link Discord identity
    store.linkExternalIdentity("user-owner", {
      provider: "discord",
      externalUserId: "dc-user-owner",
      externalUsername: "owner_discord",
      linkedAt: new Date().toISOString(),
    });

    const approval = store.createApproval({
      taskId: "task-deploy-101",
      requesterAgentId: "agent-1",
      action: "Deploy release vNext to production",
      description: "Requires explicit owner signoff",
      risk: "high",
    });

    let confirmReceived = "";
    discord.sendMessage = async (msg) => {
      confirmReceived = msg.text;
      return { externalMessageId: "dc-btn-confirm" };
    };

    // User clicks Approve button on Discord
    await discord.ingestInteraction({
      interactionId: "btn-int-1",
      guildId: "guild-main",
      channelId: "chan-ops",
      userId: "dc-user-owner",
      username: "owner_discord",
      customId: `approve:${approval.id}`,
    });

    expect(confirmReceived).toContain("APPROVE");
    const updatedApproval = store.getApproval(approval.id);
    expect(updatedApproval?.status).toBe("approved");
    expect(updatedApproval?.approverUserId).toBe("user-owner");
  });

  it("fails closed when unlinked or unknown user attempts mutating command", async () => {
    await discord.ingestInboundInteraction({
      interactionId: "int-unauth-1",
      guildId: "guild-main",
      channelId: "chan-ops",
      userId: "unknown-hacker-999",
      command: "approve",
    });

    // The audit trail must record authorization denial or unlinked caller notice
    const audits = store.listAuditEntries().filter(a => a.origin === "discord");
    expect(audits.length).toBeGreaterThan(0);
    expect(audits.some(a => a.action === "remote_action.rejected")).toBe(true);
  });
});
