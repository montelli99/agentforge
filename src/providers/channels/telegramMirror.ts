/**
 * Telegram Mirror & Remote Control Channel Provider
 * Section 12: Telegram Mirror (Two-way mirroring between Telegram topics and AgentForge channels)
 * Section 18: Telegram as Remote Control Surface (/status, /tasks, /approvals, interactive callbacks)
 */

import crypto from "node:crypto";
import type {
  ChannelProvider,
  ChannelProviderType,
  InboundChannelEvent,
  OutboundChannelMessage,
  OutboundTopicUpdate,
  ChannelProviderReadiness,
} from "../../core/providers/channel.js";
import type { ApprovalRequest } from "../../core/types/approval.js";
import { TelegramGatewayRelay, type TelegramGatewayBridge } from "./telegramGatewayRelay.js";
import type { TelegramLiveTransport } from "./telegramLiveTransport.js";
import type { TelegramUserSessionTransport } from "./telegramUserSessionTransport.js";

export interface TelegramTopicBinding {
  chatId: string;
  topicId: number;
  canonicalChannelId: string;
  topicName: string;
}

export type TelegramCutoverPhase =
  | "SOURCE_AUTHORITATIVE"
  | "AGENTFORGE_SHADOW"
  | "CUTOVER_READY"
  | "AGENTFORGE_AUTHORITATIVE"
  | "ROLLBACK";

export interface TelegramWebhookInfo {
  url: string;
  hasCustomCertificate: boolean;
  pendingUpdateCount: number;
  lastErrorDate?: number;
  lastErrorMessage?: string;
  maxConnections?: number;
  ipAddress?: string;
}

export interface TelegramOwnershipConflict {
  hasConflict: boolean;
  state: "NO_CONFLICT" | "CONFLICT_EXISTING_WEBHOOK" | "POLLING_ACTIVE";
  existingWebhookUrl?: string;
  sourceProvider?: string;
  recommendedAction: "PROCEED" | "INSPECT" | "PREPARE_MIGRATION" | "CANCEL";
  conflictMessage?: string;
  options: Array<"Inspect" | "Prepare Migration" | "Cancel">;
}

export class TelegramMirrorProvider implements ChannelProvider {
  readonly id = "telegram_mirror";
  readonly type: ChannelProviderType = "telegram";

  readiness(): ChannelProviderReadiness {
    const botHealthy = this.liveTransport
      ? (this.liveTransport.isHealthy?.() ?? this.liveTransport.isRunning())
      : false;
    const live = Boolean(botHealthy || this.userSessionTransport?.isRunning() || this.gatewayRelay?.status() === "connected");
    return {
      status: live ? "live" : "sandbox",
        summary: live
        ? "Telegram is connected through an AgentForge-owned transport and routed through the canonical AgentForge mirror."
        : "Telegram mirror contracts are wired; configure an AgentForge-owned BotFather bot, an advanced MTProto user session, or an optional migration relay to go live.",
      capabilities: ["topic binding", "inbound event normalization", "remote-control policy handling", "outbound message contract", "BotFather Bot API transport", "native MTProto user-session transport", "optional migration relay"],
      missing: live ? [] : ["AgentForge BotFather token, MTProto session, or migration relay", "live provider acceptance"],
    };
  }

  /** Attach to an existing gateway owner without creating a Telegram poller. */
  createGatewayRelay(bridge: TelegramGatewayBridge): TelegramGatewayRelay {
    this.gatewayRelay = new TelegramGatewayRelay(this, bridge);
    return this.gatewayRelay;
  }

  private eventHandlers: Array<(event: InboundChannelEvent) => Promise<void>> = [];
  private topicBindings = new Map<string, TelegramTopicBinding>(); // key: `${chatId}:${topicId}`
  private channelToTopic = new Map<string, TelegramTopicBinding>(); // key: canonicalChannelId
  private sentMessages: Array<{ messageId: string; targetChannel: string; text: string }> = [];
  private cutoverPhase: TelegramCutoverPhase = "SOURCE_AUTHORITATIVE";
  private simulatedWebhookInfo: TelegramWebhookInfo | null = null;
  private liveTransport?: TelegramLiveTransport;
  private userSessionTransport?: TelegramUserSessionTransport;
  private gatewayRelay?: TelegramGatewayRelay;

  /** Attach a transport only at an explicit migration boundary. */
  attachLiveTransport(transport: TelegramLiveTransport): void {
    this.liveTransport = transport;
  }

  /** Attach an AgentForge-owned authenticated user session (MTProto adapter). */
  attachUserSessionTransport(transport: TelegramUserSessionTransport): void {
    this.userSessionTransport = transport;
    transport.bind(async update => this.ingestInboundUpdate(update));
  }

  attachGatewayRelay(relay: TelegramGatewayRelay): void { this.gatewayRelay = relay; }

  async initialize(): Promise<void> {
    if (this.liveTransport) await this.liveTransport.start();
    if (this.userSessionTransport) await this.userSessionTransport.start();
    // A relay may be attached before its upstream gateway completes its
    // handshake. Leave that startup to the gateway owner in that case rather
    // than turning the whole channel runtime into an error.
    if (this.gatewayRelay && this.gatewayRelay.status() !== "disconnected") this.gatewayRelay.start();
  }

  async shutdown(): Promise<void> {
    this.liveTransport?.stop();
    if (this.userSessionTransport) await this.userSessionTransport.stop();
    this.gatewayRelay?.stop();
    this.eventHandlers = [];
  }

  onEvent(handler: (event: InboundChannelEvent) => Promise<void>): void {
    this.eventHandlers.push(handler);
  }

  // Bind a Telegram topic to an AgentForge canonical channel
  bindTopic(chatId: string, topicId: number, canonicalChannelId: string, topicName: string): void {
    const binding: TelegramTopicBinding = { chatId, topicId, canonicalChannelId, topicName };
    this.topicBindings.set(`${chatId}:${topicId}`, binding);
    this.channelToTopic.set(canonicalChannelId, binding);
  }

  getBindingByTopic(chatId: string, topicId: number): TelegramTopicBinding | undefined {
    return this.topicBindings.get(`${chatId}:${topicId}`);
  }

  getBindingByChannel(channelId: string): TelegramTopicBinding | undefined {
    return this.channelToTopic.get(channelId);
  }

  // Simulate or process an inbound Telegram event (Webhook / Polling)
  async ingestInboundUpdate(update: {
    updateId: number;
    chatId: string;
    topicId?: number;
    userId: string;
    username?: string;
    text?: string;
    callbackData?: string;
    messageId?: number;
    replyToMessageId?: number;
  }): Promise<void> {
    const eventId = `tg-${update.updateId}`;
    const topicId = update.topicId || 1; // Default General topic
    // Provider topic IDs repeat across chats. Include the chat ID in the
    // canonical key so private conversations and groups cannot share a record.
    const channelKey = update.chatId.startsWith("-")
      ? `group:${update.chatId}:topic:${topicId}`
      : `dm:${update.chatId}`;

    // Handle interactive button callback (e.g. "approve:AF-142", "reject:AF-142")
    if (update.callbackData) {
      const [action, targetId] = update.callbackData.split(":");
      const event: InboundChannelEvent = {
        id: eventId,
        provider: "telegram",
        eventType: "action_button_clicked",
        externalWorkspaceId: update.chatId,
        externalChannelId: channelKey,
        externalThreadId: update.topicId ? String(update.topicId) : undefined,
        externalUserId: update.userId,
        externalUsername: update.username,
        payload: {
          actionId: action,
          actionPayload: { targetId },
        },
        timestamp: new Date().toISOString(),
      };
      for (const h of this.eventHandlers) await h(event);
      return;
    }

    // Handle slash commands (e.g. "/status", "/approvals", "/tasks")
    if (update.text?.startsWith("/")) {
      const parts = update.text.trim().split(/\s+/);
      const command = parts[0];
      const commandArgs = parts.slice(1);
      const event: InboundChannelEvent = {
        id: eventId,
        provider: "telegram",
        eventType: "command",
        externalWorkspaceId: update.chatId,
        externalChannelId: channelKey,
        externalThreadId: update.topicId ? String(update.topicId) : undefined,
        externalUserId: update.userId,
        externalUsername: update.username,
        payload: { command, commandArgs },
        timestamp: new Date().toISOString(),
      };
      for (const h of this.eventHandlers) await h(event);
      return;
    }

    // Regular conversation message
    const event: InboundChannelEvent = {
      id: eventId,
      provider: "telegram",
      eventType: "message",
      externalWorkspaceId: update.chatId,
      externalChannelId: channelKey,
      externalThreadId: update.topicId ? String(update.topicId) : undefined,
      externalUserId: update.userId,
      externalUsername: update.username,
      payload: {
        text: update.text || "",
        replyToExternalMessageId: update.replyToMessageId ? String(update.replyToMessageId) : undefined,
      },
      timestamp: new Date().toISOString(),
    };
    for (const h of this.eventHandlers) await h(event);
  }

  // Outbound: AgentForge Web -> Telegram Topic
  async sendMessage(message: OutboundChannelMessage): Promise<{ externalMessageId: string }> {
    const binding = this.channelToTopic.get(message.canonicalChannelId);
    const topicId = binding?.chatId.startsWith("-") && binding.topicId > 1 ? binding.topicId : undefined;
    if (this.gatewayRelay && binding) {
      const messageId = await this.gatewayRelay.sendMessage(binding.chatId, message.text, topicId);
      return { externalMessageId: String(messageId) };
    }
    if (this.liveTransport && binding) {
      const messageId = await this.liveTransport.sendMessage(binding.chatId, message.text, topicId);
      return { externalMessageId: String(messageId) };
    }
    if (this.userSessionTransport && binding) {
      const messageId = await this.userSessionTransport.sendMessage(binding.chatId, message.text, topicId);
      return { externalMessageId: String(messageId) };
    }
    const externalMessageId = `tg-msg-${crypto.randomUUID().slice(0, 8)}`;

    this.sentMessages.push({
      messageId: externalMessageId,
      targetChannel: message.canonicalChannelId,
      text: message.text,
    });

    return { externalMessageId };
  }

  /** Reply to the originating chat, avoiding a shared channel binding for private DMs. */
  async sendReply(chatId: string, text: string, topicId?: number): Promise<{ externalMessageId: string }> {
    if (this.liveTransport) {
      const id = await this.liveTransport.sendMessage(chatId, text, topicId);
      return { externalMessageId: String(id) };
    }
    if (this.userSessionTransport) {
      const id = await this.userSessionTransport.sendMessage(chatId, text, topicId);
      return { externalMessageId: String(id) };
    }
    if (this.gatewayRelay) {
      const id = await this.gatewayRelay.sendMessage(chatId, text, topicId);
      return { externalMessageId: String(id) };
    }
    const binding = this.getBindingByTopic(chatId, topicId ?? 1);
    return this.sendMessage({ canonicalChannelId: binding?.canonicalChannelId ?? "chan-general", text });
  }

  // Outbound: Web Channel created/renamed -> Telegram Topic created/renamed
  async updateTopic(update: OutboundTopicUpdate): Promise<{ externalTopicId: string }> {
    const externalTopicId = `topic-${Date.now()}`;
    return { externalTopicId };
  }

  // Post interactive approval card to Telegram with [View Diff] [Approve] [Reject]
  async postApprovalCard(channelId: string, approval: ApprovalRequest): Promise<{ externalMessageId: string }> {
    const cardText = `🚨 *Approval Required: Task ${approval.taskId}*\n` +
      `*Action:* ${approval.action}\n` +
      `*Risk:* ${approval.risk.toUpperCase()}\n` +
      `*Description:* ${approval.description}\n` +
      (approval.evidenceSummary ? `*Files Changed:* ${approval.evidenceSummary.filesCount} | *Tests:* ${approval.evidenceSummary.testsPassed ? "Passed ✓" : "Failed ✗"}` : "");

    return this.sendMessage({
      canonicalChannelId: channelId,
      text: cardText,
      interactiveActions: [
        { id: "view_diff", label: "View Diff", style: "secondary", payload: { taskId: approval.taskId } },
        { id: "approve", label: "Approve", style: "primary", payload: { approvalId: approval.id } },
        { id: "reject", label: "Reject", style: "danger", payload: { approvalId: approval.id } },
      ],
    });
  }

  getSentMessages() {
    return this.sentMessages;
  }

  // --- Cutover Phase Management (Section 13) ---
  getCutoverPhase(): TelegramCutoverPhase {
    return this.cutoverPhase;
  }

  setCutoverPhase(phase: TelegramCutoverPhase): void {
    this.cutoverPhase = phase;
  }

  // --- Ownership Conflict Guard (Section 12) ---
  setSimulatedWebhookInfo(info: TelegramWebhookInfo | null): void {
    this.simulatedWebhookInfo = info;
  }

  async inspectWebhookState(token?: string): Promise<TelegramWebhookInfo> {
    if (this.simulatedWebhookInfo) {
      return this.simulatedWebhookInfo;
    }
    if (token) {
      if (!/^[0-9]{6,}:[A-Za-z0-9_-]{20,}$/.test(token)) {
        throw new Error("Telegram bot token format is invalid.");
      }
      const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`Telegram getWebhookInfo failed with HTTP ${response.status}.`);
      const payload = await response.json() as {
        ok?: boolean;
        result?: {
          url?: string;
          has_custom_certificate?: boolean;
          pending_update_count?: number;
          last_error_date?: number;
          last_error_message?: string;
          max_connections?: number;
          ip_address?: string;
        };
        description?: string;
      };
      if (!payload.ok || !payload.result) throw new Error(payload.description || "Telegram returned no webhook state.");
      return {
        url: payload.result.url || "",
        hasCustomCertificate: Boolean(payload.result.has_custom_certificate),
        pendingUpdateCount: payload.result.pending_update_count || 0,
        ...(payload.result.last_error_date ? { lastErrorDate: payload.result.last_error_date } : {}),
        ...(payload.result.last_error_message ? { lastErrorMessage: payload.result.last_error_message } : {}),
        ...(payload.result.max_connections ? { maxConnections: payload.result.max_connections } : {}),
        ...(payload.result.ip_address ? { ipAddress: payload.result.ip_address } : {}),
      };
    }
    return {
      url: "",
      hasCustomCertificate: false,
      pendingUpdateCount: 0,
    };
  }

  async detectOwnershipConflict(token?: string): Promise<TelegramOwnershipConflict> {
    const webhookInfo = await this.inspectWebhookState(token);

    if (webhookInfo.url && webhookInfo.url.length > 0) {
      const sourceProvider = webhookInfo.url.includes("openclaw") ? "OpenClaw Legacy Production"
        : webhookInfo.url.includes("hermes") ? "Hermes Autonomous"
        : "External Webhook Consumer";

      return {
        hasConflict: true,
        state: "CONFLICT_EXISTING_WEBHOOK",
        existingWebhookUrl: webhookInfo.url,
        sourceProvider,
        recommendedAction: "INSPECT",
        conflictMessage: `TELEGRAM OWNERSHIP CONFLICT: Bot has an active external webhook registered (${webhookInfo.url}). Starting polling or overriding will break the upstream source provider (${sourceProvider}).`,
        options: ["Inspect", "Prepare Migration", "Cancel"],
      };
    }

    return {
      hasConflict: false,
      state: "NO_CONFLICT",
      recommendedAction: "PROCEED",
      options: ["Inspect", "Prepare Migration", "Cancel"],
    };
  }

  async attemptTakeover(token?: string, force = false): Promise<{
    success: boolean;
    message: string;
    blockedByConflict?: boolean;
    conflict?: TelegramOwnershipConflict;
  }> {
    const conflict = await this.detectOwnershipConflict(token);

    if (conflict.hasConflict && !force) {
      return {
        success: false,
        blockedByConflict: true,
        conflict,
        message: "DO NOT START COMPETING CONSUMER: Takeover refused due to active external webhook. Resolve via migration or manual cutover.",
      };
    }

    this.cutoverPhase = "AGENTFORGE_AUTHORITATIVE";
    return {
      success: true,
      message: "AgentForge successfully assumed authoritative control of Telegram channel.",
    };
  }
}
