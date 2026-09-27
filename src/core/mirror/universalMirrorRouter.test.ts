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

    const messages = store.listMessages("chan-general");
    expect(messages.some(m => m.content === "Progress update on sprint tasks")).toBe(true);

    // Loop suppression must ensure 0 outbound messages back to Telegram
    expect(tgOutboundCount).toBe(0);
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
