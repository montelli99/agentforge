/**
 * Universal Workspace Mirror & Remote Control Router
 * Sections 7, 8, 10, 12, 18, 19
 * 
 * Synchronizes Telegram, Discord, and Native Web into the canonical WorkspaceStore.
 * Handles remote control slash commands and button callbacks with server-side RBAC and audit.
 */

import crypto from "node:crypto";
import type { WorkspaceStore } from "../store/workspaceStore.js";
import type { TelegramMirrorProvider } from "../../providers/channels/telegramMirror.js";
import type { DiscordMirrorProvider } from "../../providers/channels/discordMirror.js";
import type { NativeWebChannelProvider } from "../../providers/channels/nativeWebChannel.js";
import type { SlackMirrorProvider } from "../../providers/channels/slackMirror.js";
import type { InboundChannelEvent } from "../providers/channel.js";
import type { CanonicalMessage } from "../types/workspace.js";
import { AgentForgeController } from "../../controller/agentController.js";
import type { MemoryProvider } from "../providers/memory.js";
import { redactRuntimeError } from "../secret/runtimeRedaction.js";
import type { ChannelConversation } from "./channelConversation.js";
import { localChannelReply } from "./localChannelReply.js";
import { resolveNaturalCommand } from "./naturalCommand.js";
import type { ModelMessage } from "../providers/model.js";

export class UniversalMirrorRouter {
  private readonly pendingTelegramLinks = new Map<string, { userId: string; expiresAt: number }>();
  private readonly controller: AgentForgeController;

  private replyTopicId(event: InboundChannelEvent): number | undefined {
    // Only an actual provider thread belongs in message_thread_id; General is synthetic.
    return event.externalThreadId ? Number(event.externalThreadId) || undefined : undefined;
  }

  constructor(
    private readonly store: WorkspaceStore,
    private readonly telegram?: TelegramMirrorProvider,
    private readonly discord?: DiscordMirrorProvider,
    private readonly web?: NativeWebChannelProvider,
    memory?: MemoryProvider,
    private readonly slack?: SlackMirrorProvider,
    private readonly conversation?: ChannelConversation,
  ) {
    this.controller = new AgentForgeController(undefined, memory);
    this.setupListeners();
  }

  private setupListeners(): void {
    if (this.telegram) {
      this.telegram.onEvent(evt => this.handleInboundEvent(evt));
    }
    if (this.discord) {
      this.discord.onEvent(evt => this.handleInboundEvent(evt));
    }
    if (this.web) {
      this.web.onEvent(evt => this.handleInboundEvent(evt));
    }
    if (this.slack) {
      this.slack.onEvent(evt => this.handleInboundEvent(evt));
    }
    this.store.subscribe((evt) => {
      if (evt.type === "message_created" && evt.entity === "message") {
        const msg = evt.data as CanonicalMessage;
        if (msg && msg.channelId && msg.content && !msg.externalProvider) {
          this.broadcastCanonicalMessage(msg.channelId, msg.content, msg.authorId).catch(() => {});
        }
      }
    });
  }

  /**
   * Routes inbound events from any provider through deduplication,
   * canonical normalization, execution, and real-time broadcast.
   */
  async handleInboundEvent(event: InboundChannelEvent): Promise<void> {
    // 1. Deduplicate via EventLedger
    const { entry, isDuplicate } = await this.store.eventLedger.recordInboundEvent({
      eventId: event.id,
      origin: event.provider,
      eventType: event.eventType,
      payload: event.payload,
    });

    if (isDuplicate && entry.status !== "accepted") return;

    // 2. Resolve Canonical User Identity & Authorization
    const user = this.store.findUserByExternalId(event.provider, event.externalUserId);

    // 3. Resolve or Create Canonical Channel Binding
    let canonicalChannel = this.store.findMirroredChannel(
      event.provider as "telegram" | "discord" | "slack",
      event.externalChannelId,
    );

    if (!canonicalChannel && event.provider === "telegram" && this.telegram) {
      const binding = this.telegram.getBindingByTopic(event.externalWorkspaceId, Number(event.externalThreadId) || 1);
      if (binding) {
        canonicalChannel = this.store.getChannel(binding.canonicalChannelId);
      }
    }

    if (!canonicalChannel && event.provider !== "telegram" && (event.externalChannelId === "1" || !event.externalChannelId)) {
      canonicalChannel = this.store.getChannel("chan-general");
    }

    if (!canonicalChannel) {
      // Find or create external space
      const spaces = this.store.listSpaces();
      let providerSpace = spaces.find(s => s.provider === event.provider &&
        (event.provider !== "telegram" || s.externalId === event.externalWorkspaceId));
      if (!providerSpace) {
        providerSpace = this.store.createSpace({
          workspaceId: "ws-default",
        name: `${event.provider.toUpperCase()} Mirror`,
          provider: event.provider as any,
          externalId: event.externalWorkspaceId,
        });
      }

      canonicalChannel = this.store.createChannel({
        workspaceId: "ws-default",
        spaceId: providerSpace.id,
        name: event.provider === "telegram" && !event.externalWorkspaceId.startsWith("-")
          ? "Private chat" : `Topic ${event.externalThreadId || "General"}`,
        visibility: event.provider === "telegram" && !event.externalWorkspaceId.startsWith("-") ? "private" : "public",
        archived: false,
        provider: event.provider as any,
        externalId: event.externalChannelId,
      });

      this.store.eventLedger.registerBinding({
        provider: event.provider,
        externalWorkspaceId: event.externalWorkspaceId,
        externalChannelId: event.externalChannelId,
        agentforgeWorkspaceId: "ws-default",
        agentforgeChannelId: canonicalChannel.id,
        syncDirection: "bidirectional",
        syncState: "active",
      });
      // Keep the provider's outbound routing map in sync with the canonical
      // binding created for a newly discovered Telegram topic.
      if (event.provider === "telegram" && this.telegram) {
        this.telegram.bindTopic(
          event.externalWorkspaceId,
          Number(event.externalThreadId) || 1,
          canonicalChannel.id,
          `Topic ${event.externalThreadId || "General"}`,
        );
      }
    }

    if (event.provider === "telegram" && this.telegram &&
        !this.telegram.getBindingByChannel(canonicalChannel.id)) {
      this.telegram.bindTopic(event.externalWorkspaceId, Number(event.externalThreadId) || 1,
        canonicalChannel.id, canonicalChannel.name);
    }

    // Every channel event receives the same bounded controller handoff as API
    // task routing. This keeps Telegram, Discord, Slack, and the web surface
    // on one decision path without granting the channel direct execution power.
    const eventText = typeof event.payload.text === "string" ? event.payload.text : event.eventType;
    const inspection = await this.controller.inspect(eventText, {
      provider: event.provider,
      eventType: event.eventType,
      channelId: canonicalChannel.id,
      externalUserId: event.externalUserId,
    });
    this.store.recordAudit({
      origin: "api",
      actorId: user?.id || "external-unlinked",
      actorType: "system",
      action: "channel_controller_inspected",
      targetType: "channel",
      targetId: canonicalChannel.id,
      details: {
        provider: event.provider,
        eventId: event.id,
        intent: inspection.intent,
        requiresApproval: inspection.requiresApproval,
        contextPacketId: inspection.contextPacket.id,
        packedTokens: inspection.contextPacket.packedTokens,
      },
    });

    // 4. Handle Slash Commands / Remote Control Actions
    if (event.eventType === "command") {
      if (event.provider === "telegram" && event.payload.command?.toLowerCase() === "/link") {
        await this.handleTelegramLinkCommand(event, canonicalChannel.id, entry.id);
        return;
      }
      if (!user) {
        this.store.eventLedger.updateEventStatus(entry.id, "failed", "Unlinked external identity.");
        await this.rejectUnlinkedRemoteAction(event, canonicalChannel.id);
        return;
      }
      await this.handleCommand(event, canonicalChannel.id, user.id);
      this.store.eventLedger.updateEventStatus(entry.id, "applied");
      return;
    }

    if (event.eventType === "action_button_clicked") {
      if (!user) {
        this.store.eventLedger.updateEventStatus(entry.id, "failed", "Unlinked external identity.");
        await this.rejectUnlinkedRemoteAction(event, canonicalChannel.id);
        return;
      }
      await this.handleActionButton(event, canonicalChannel.id, user.id);
      this.store.eventLedger.updateEventStatus(entry.id, "applied");
      return;
    }

    // 5. Standard Message Normalization
    if (event.eventType === "message" && event.payload.text) {
      const priorMessage = this.store.findExternalMessage(canonicalChannel.id, event.provider, event.id);
      const canonicalMsg = priorMessage || this.store.createMessage({
        channelId: canonicalChannel.id,
        authorId: user?.id || `ext-${event.externalUserId}`,
        authorType: "user",
        content: event.payload.text,
        externalMessageId: event.id,
        externalProvider: event.provider as any,
      });

      if (!priorMessage) this.store.recordAudit({
        origin: event.provider,
        actorId: user?.id || event.externalUserId,
        actorType: "user",
        action: "message.sent",
        targetType: "message",
        targetId: canonicalMsg.id,
        details: { channelId: canonicalChannel.id, textLength: event.payload.text.length },
      });

      // In a group, answer only a linked user's explicit read-only request.
      // Keep open-ended chat and task mutations in the private conversation.
      if (event.provider === "telegram" && this.telegram && user &&
          event.externalWorkspaceId.startsWith("-")) {
        const natural = resolveNaturalCommand(event.payload.text, this.store);
        if (natural && "command" in natural &&
            ["/tasks", "/agents", "/approvals"].includes(natural.command)) {
          await this.handleCommand({ ...event, eventType: "command",
            payload: { ...event.payload, command: natural.command, commandArgs: natural.args } },
          canonicalChannel.id, user.id);
        }
        this.store.eventLedger.updateEventStatus(entry.id, "applied");
        return;
      }
      // A private linked chat can converse through the explicitly configured,
      // read-only model route. Keep group mirroring separate from direct replies.
      if (event.provider === "telegram" && this.telegram && user &&
          !event.externalWorkspaceId.startsWith("-")) {
          const natural = resolveNaturalCommand(event.payload.text, this.store);
          if (natural) {
            if ("clarification" in natural) {
              const outbound = await this.telegram.sendReply(event.externalWorkspaceId, natural.clarification);
              this.store.createMessage({ channelId: canonicalChannel.id, authorId: "agent-agentforge-coordinator",
                authorType: "agent", content: natural.clarification, externalMessageId: outbound.externalMessageId,
                externalProvider: "telegram", replyToMessageId: canonicalMsg.id });
            } else {
              // The existing command path owns RBAC, audit, and mutation policy.
              await this.handleCommand({ ...event, eventType: "command",
                payload: { ...event.payload, command: natural.command, commandArgs: natural.args } },
              canonicalChannel.id, user.id);
            }
            this.store.eventLedger.updateEventStatus(entry.id, "applied");
            return;
          }
          const started = performance.now();
          const local = localChannelReply(event.payload.text, this.store);
          const durableHistory: ModelMessage[] = this.store.listMessages(canonicalChannel.id, 13)
            .filter(message => message.id !== canonicalMsg.id && (message.authorType === "user" || message.authorType === "agent"))
            .slice(-12).map(message => ({ role: message.authorType === "agent" ? "assistant" : "user",
              content: message.content.slice(0, 4000) }));
          let reply: { text: string; modelMs: number | null; fallback?: boolean };
          try {
            reply = local
              ? { text: local, modelMs: null }
              : this.conversation
                ? await this.conversation.reply(event.externalWorkspaceId, event.payload.text,
                  canonicalChannel.id, inspection.intent, durableHistory)
                : { text: "I can show workspace status, tasks, and approvals, but open-ended chat needs a configured model in AgentForge Settings.", modelMs: null };
          } catch (error) {
            reply = { text: redactRuntimeError(error, "I couldn't complete that reply. Please try again."),
              modelMs: null, fallback: true };
          }
          const outbound = await this.telegram.sendReply(event.externalWorkspaceId, reply.text);
          this.store.createMessage({ channelId: canonicalChannel.id, authorId: "agent-agentforge-coordinator",
            authorType: "agent", content: reply.text, externalMessageId: outbound.externalMessageId,
            externalProvider: "telegram", replyToMessageId: canonicalMsg.id });
          this.store.recordAudit({
            origin: "telegram", actorId: user.id, actorType: "user", action: "conversation.replied",
            targetType: "message", targetId: canonicalMsg.id,
            details: { outboundMessageId: outbound.externalMessageId, route: local ? "local" : this.conversation ? "configured_read_only" : "unconfigured",
              modelMs: reply.modelMs, fallback: "fallback" in reply && reply.fallback === true,
              roundTripMs: Math.round(performance.now() - started) },
          });
          this.store.eventLedger.updateEventStatus(entry.id, "applied");
      }
      if (entry.status === "accepted") this.store.eventLedger.updateEventStatus(entry.id, "applied");
    }
  }

  issueTelegramLinkCode(userId: string): { code: string; expiresAt: string } {
    const user = this.store.getUser(userId);
    if (!user || user.role !== "owner") throw new Error("Only a workspace owner can issue a Telegram link code");

    const now = Date.now();
    for (const [hash, pending] of this.pendingTelegramLinks) {
      if (pending.expiresAt <= now) this.pendingTelegramLinks.delete(hash);
    }

    const code = crypto.randomBytes(9).toString("base64url").toUpperCase();
    const expiresAt = now + 10 * 60 * 1000;
    this.pendingTelegramLinks.set(this.hashLinkCode(code), { userId, expiresAt });
    return { code, expiresAt: new Date(expiresAt).toISOString() };
  }

  private async handleTelegramLinkCommand(
    event: InboundChannelEvent,
    canonicalChannelId: string,
    ledgerEntryId: string,
  ): Promise<void> {
    const code = ((event.payload.commandArgs || []) as string[])[0]?.trim().replace(/[.,;:!?]+$/, "").toUpperCase();
    const pending = code ? this.pendingTelegramLinks.get(this.hashLinkCode(code)) : undefined;
    const isPrivateChat = !event.externalWorkspaceId.startsWith("-");
    if (code && pending && isPrivateChat) this.pendingTelegramLinks.delete(this.hashLinkCode(code));

    let replyText = "That Telegram link code is missing, expired, or already used. Create a fresh code in the local AgentForge Settings page and send /link CODE from your authorized Telegram session in a private chat.";
    let linkedUserId: string | undefined;
    if (!isPrivateChat && pending) {
      replyText = "For safety, Telegram accounts can only be linked in a private chat from your authorized Telegram session. Your code remains valid; send /link CODE privately.";
    } else if (pending && pending.expiresAt > Date.now()) {
      try {
        this.store.linkExternalIdentity(pending.userId, {
          provider: "telegram",
          externalUserId: event.externalUserId,
          externalUsername: event.externalUsername,
          linkedAt: new Date().toISOString(),
        });
        linkedUserId = pending.userId;
        replyText = "Telegram is linked to your AgentForge owner account. You can now use its authorized read and control features. This did not connect Telegram or change any external bot configuration.";
      } catch (error) {
        replyText = redactRuntimeError(error, "Telegram identity could not be linked.");
      }
    }

    const outboundMessageId = this.telegram
      ? (await this.telegram.sendReply(event.externalWorkspaceId, replyText, this.replyTopicId(event))).externalMessageId
      : undefined;
    this.store.recordAudit({
      origin: "telegram",
      actorId: linkedUserId || event.externalUserId,
      actorType: "user",
      action: linkedUserId ? "identity.telegram.linked" : "identity.telegram.link_rejected",
      targetType: "channel",
      targetId: canonicalChannelId,
      details: { linkedUserId, username: event.externalUsername, accepted: Boolean(linkedUserId), outboundMessageId },
    });
    this.store.eventLedger.updateEventStatus(ledgerEntryId, linkedUserId ? "applied" : "failed", linkedUserId ? undefined : "Invalid, expired, or conflicting Telegram link code.");
  }

  private hashLinkCode(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
  }

  private async rejectUnlinkedRemoteAction(event: InboundChannelEvent, canonicalChannelId: string): Promise<void> {
    const reason = "External identity is not linked to an AgentForge user.";
    this.store.recordAudit({
      origin: event.provider,
      actorId: event.externalUserId,
      actorType: "user",
      action: "remote_action.rejected",
      targetType: "channel",
      targetId: canonicalChannelId,
      details: { eventType: event.eventType, reason },
    });
    if (event.provider === "telegram" && this.telegram) {
      await this.telegram.sendReply(event.externalWorkspaceId, "Access denied. This Telegram account is not linked to an AgentForge user. Ask the workspace owner to link it before using remote commands or approval buttons.", this.replyTopicId(event));
    } else if (event.provider === "discord" && this.discord) {
      await this.discord.sendMessage({
        canonicalChannelId,
        text: "Access denied. This Discord account is not linked to an AgentForge user.",
      });
    }
  }

  /**
   * Handles remote slash commands (/status, /tasks, /agents, /approvals, /models, /compute, /pause, /resume, /cancel, /approve, /reject, /diff, /evidence, /retry, /ask)
   * Enforces Section 10: All actions go through canonical identity, authorization, policy, execution contract, and audit.
   */
  private async handleCommand(
    event: InboundChannelEvent,
    canonicalChannelId: string,
    userId: string,
  ): Promise<void> {
    const rawCmd = event.payload.command || "";
    const cmd = rawCmd.toLowerCase();
    const args = (event.payload.commandArgs || []) as string[];
    const user = this.store.getUser(userId);
    if (!user) return;

    let replyText = "";

    // Read-only commands (accessible by all authenticated users)
    if (cmd === "/status") {
      const agents = this.store.listAgents();
      const activeTasks = this.store.listTasks("in_progress");
      const pendingApprovals = this.store.listApprovals("pending");
      replyText = `📊 *AgentForge Status*\n• Active Agents: ${agents.length}\n• In-Progress Tasks: ${activeTasks.length}\n• Pending Approvals: ${pendingApprovals.length}`;
    } else if (cmd === "/tasks") {
      const tasks = this.store.listTasks();
      replyText = `📋 *AgentForge Tasks (${tasks.length})*\n` +
        (tasks.length ? tasks.slice(0, 8).map(t => `- [${t.id}] ${t.title} (${t.status})`).join("\n") : "No tasks found.");
    } else if (cmd === "/agents") {
      const agents = this.store.listAgents();
      replyText = `🤖 *AgentForge Teammates (${agents.length})*\n` +
        agents.map(a => `- ${a.avatarUrl || "🤖"} *${a.name}* (${a.role}) - Status: ${a.status.toUpperCase()} [Tier ${a.modelPolicy?.preferredTier ?? "N/A"}]`).join("\n");
    } else if (cmd === "/approvals") {
      const pending = this.store.listApprovals("pending");
      replyText = `🚨 *Pending Approvals (${pending.length})*\n` +
        (pending.length ? pending.map(a => `- [${a.id}] Task ${a.taskId}: ${a.action} (Risk: ${a.risk})`).join("\n") : "No pending approvals.");
    } else if (cmd === "/models") {
      replyText = `🧠 *Model Routing*\n` +
        `The local control plane can show registered providers, but Telegram does not yet run or validate a model request. Check the AgentForge Models view for current registry readiness.`;
    } else if (cmd === "/compute") {
      replyText = `⚙️ *Compute & Sandbox Status*\n` +
        `• Tracked isolated worktrees: ${this.store.listTasks().filter(task => task.worktree?.isIsolated).length}\n` +
        `• Sandbox providers: not configured\n` +
        `• Host resource telemetry: not connected`;
    } else if (cmd === "/diff") {
      const taskId = args[0];
      if (!taskId) {
        replyText = `Usage: /diff <taskId>`;
      } else {
        const task = this.store.getTask(taskId);
        replyText = !task
          ? `Task not found: ${taskId}`
          : task.evidencePack
            ? `📄 *Verified Diff for ${taskId}*\nFiles: ${task.evidencePack.diffStat.filesCount}\nInsertions: ${task.evidencePack.diffStat.insertions}\nDeletions: ${task.evidencePack.diffStat.deletions}\nBase: ${task.evidencePack.baseSha}\nFinal: ${task.evidencePack.finalSha || "not recorded"}`
            : `No verified diff is attached to ${taskId}.`;
      }
    } else if (cmd === "/evidence") {
      const taskId = args[0];
      if (!taskId) {
        replyText = `Usage: /evidence <taskId>`;
      } else {
        const task = this.store.getTask(taskId);
        if (!task) {
          replyText = `Task not found: ${taskId}`;
        } else if (!task.evidencePack) {
          replyText = `No evidence pack has been generated for ${taskId}; I cannot report its diff or test status as verified.`;
        } else {
          const passed = task.evidencePack.testResults.filter(test => test.passed).length;
          replyText = `📦 *Evidence Pack for ${taskId}*\n` +
            `• Task: ${task.title}\n• Status: ${task.status}\n• Contract verified: ${task.evidencePack.verifiedPassed ? "yes" : "no"}\n` +
            `• Tests: ${passed}/${task.evidencePack.testResults.length} passed\n• Files changed: ${task.evidencePack.diffStat.filesCount}\n` +
            `• Base: ${task.evidencePack.baseSha}\n• Final: ${task.evidencePack.finalSha || "not recorded"}`;
        }
      }
    } else if (cmd === "/ask") {
      const agentId = args[0];
      const question = args.slice(1).join(" ");
      if (!agentId || !question) {
        replyText = `Usage: /ask <agentId> <question>`;
      } else {
        const agent = this.store.getAgent(agentId);
        if (!agent) {
          replyText = `Agent not found: ${agentId}`;
        } else {
          replyText = `💬 *${agent.name}* is listed in the workspace, but Telegram has no connected agent execution route yet. Your inquiry was not submitted or executed.`;
        }
      }
    }
    // Mutating commands require an explicit server-side permission.
    else if (this.getRequiredPermission(cmd) && !this.hasPermission(user, this.getRequiredPermission(cmd)!)) {
      const permission = this.getRequiredPermission(cmd)!;
      replyText = `⛔ *Access Denied*: User "${userId}" is not authorized for ${permission}.`;
      this.store.recordAudit({
        origin: event.provider,
        actorId: userId,
        actorType: "user",
        action: `command.rejected`,
        targetType: "channel",
        targetId: canonicalChannelId,
        details: { command: rawCmd, permission, role: user.role, reason: "RBAC permission denied" },
      });
      if (event.provider === "telegram" && this.telegram) {
        await this.telegram.sendReply(event.externalWorkspaceId, replyText, this.replyTopicId(event));
      }
      return;
    } else if (cmd === "/pause") {
      const taskId = args[0];
      const task = taskId ? this.store.getTask(taskId) : undefined;
      if (!task) {
        replyText = `Usage: /pause <taskId> (Task not found)`;
      } else {
        this.store.updateTask(task.id, { status: "paused" as any });
        replyText = `⏸️ Task [${task.id}] "${task.title}" has been paused.`;
      }
    } else if (cmd === "/resume") {
      const taskId = args[0];
      const task = taskId ? this.store.getTask(taskId) : undefined;
      if (!task) {
        replyText = `Usage: /resume <taskId> (Task not found)`;
      } else {
        replyText = `Cannot resume task [${task.id}] "${task.title}": no agent worker is connected. Its status remains ${task.status}; no work was queued or run.`;
      }
    } else if (cmd === "/cancel") {
      const taskId = args[0];
      const task = taskId ? this.store.getTask(taskId) : undefined;
      if (!task) {
        replyText = `Usage: /cancel <taskId> (Task not found)`;
      } else {
        this.store.updateTask(task.id, { status: "cancelled" as any });
        replyText = `🛑 Task [${task.id}] "${task.title}" has been cancelled.`;
      }
    } else if (cmd === "/retry") {
      const taskId = args[0];
      const task = taskId ? this.store.getTask(taskId) : undefined;
      if (!task) {
        replyText = `Usage: /retry <taskId> (Task not found)`;
      } else {
        replyText = `Cannot retry task [${task.id}] "${task.title}": no agent worker is connected. Its status remains ${task.status}; no retry was queued.`;
      }
    } else if (cmd === "/approve" || cmd === "/reject") {
      const targetId = args[0];
      const isApprove = cmd === "/approve";
      const approvals = this.store.listApprovals();
      const approval = approvals.find(a => a.id === targetId || a.taskId === targetId);

      if (!approval || approval.status !== "pending") {
        replyText = `No pending approval found for target: ${targetId}`;
      } else {
        this.store.resolveApproval({
          approvalId: approval.id,
          status: isApprove ? "approved" : "rejected",
          approverUserId: userId,
          decisionOrigin: event.provider as any,
          decisionNotes: `Resolved via slash command ${cmd}`,
        });
        const task = this.store.getTask(approval.taskId);
        if (task) {
          this.store.updateTask(task.id, {
            status: isApprove ? "approved" : "failed",
          });
        }
        replyText = `${isApprove ? "✅ Approved" : "❌ Rejected"} approval [${approval.id}] for task ${approval.taskId}.`;
      }
    } else {
      replyText = `Unknown command: ${cmd}.\nSupported: /status, /tasks, /agents, /approvals, /models, /compute, /diff, /evidence, /ask, /pause, /resume, /cancel, /retry, /approve, /reject`;
    }

    let outboundMessageId: string | undefined;
    if (event.provider === "telegram" && this.telegram) {
      outboundMessageId = (await this.telegram.sendReply(event.externalWorkspaceId, replyText, this.replyTopicId(event))).externalMessageId;
    } else if (event.provider === "discord" && this.discord) {
      outboundMessageId = (await this.discord.sendMessage({
        canonicalChannelId,
        text: replyText,
      })).externalMessageId;
    }

    // Keep command responses in the same durable channel history as ordinary
    // conversation, including requests entered in natural language.
    if (outboundMessageId) {
      this.store.createMessage({ channelId: canonicalChannelId, authorId: "agent-agentforge-coordinator",
        authorType: "agent", content: replyText, externalMessageId: outboundMessageId,
        externalProvider: event.provider as "telegram" | "discord" });
    }

    this.store.recordAudit({
      origin: event.provider,
      actorId: userId,
      actorType: "user",
      action: `command.${cmd?.replace("/", "")}`,
      targetType: "channel",
      targetId: canonicalChannelId,
      details: { command: rawCmd, args, replyLength: replyText.length, outboundMessageId },
    });
  }

  private getRequiredPermission(command: string): string | undefined {
    if (command === "/approve" || command === "/reject") return "approvals:decide";
    if (["/pause", "/resume", "/cancel", "/retry"].includes(command)) return "tasks:control";
    return undefined;
  }

  private hasPermission(user: { role: string; permissions: string[] }, permission: string): boolean {
    return user.role !== "viewer" && (user.permissions.includes("*") || user.permissions.includes(permission));
  }

  /**
   * Handles remote interactive button clicks (Approve, Reject, Cancel, View Diff)
   */
  private async handleActionButton(
    event: InboundChannelEvent,
    canonicalChannelId: string,
    userId: string,
  ): Promise<void> {
    const actionId = event.payload.actionId;
    const targetId = event.payload.actionPayload?.targetId as string;
    const user = this.store.getUser(userId);

    // Approval callbacks are privileged actions; unknown users are rejected before this method.
    if (!user || !this.hasPermission(user, "approvals:decide")) {
      const errMsg = `⛔ Action rejected: User "${userId}" is not authorized to decide approvals.`;
      if (event.provider === "telegram" && this.telegram) {
        await this.telegram.sendReply(event.externalWorkspaceId, errMsg, this.replyTopicId(event));
      }
      this.store.recordAudit({
        origin: event.provider,
        actorId: userId,
        actorType: "user",
        action: "remote_action.rejected",
        targetType: "channel",
        targetId: canonicalChannelId,
        details: { actionId, reason: "RBAC permission denied" },
      });
      return;
    }

    if (actionId === "approve" || actionId === "reject") {
      const approvals = this.store.listApprovals();
      const approval = approvals.find(a => a.id === targetId || a.taskId === targetId);

      if (approval && approval.status === "pending") {
        this.store.resolveApproval({
          approvalId: approval.id,
          status: actionId === "approve" ? "approved" : "rejected",
          approverUserId: userId,
          decisionOrigin: event.provider as any,
          decisionNotes: `Resolved remotely via ${event.provider}`,
        });

        // Update task status if linked
        const task = this.store.getTask(approval.taskId);
        if (task) {
          this.store.updateTask(task.id, {
            status: actionId === "approve" ? "approved" : "failed",
          });
        }

        this.store.recordAudit({
          origin: event.provider,
          actorId: userId,
          actorType: "user",
          action: `approval.${actionId}`,
          targetType: "approval",
          targetId: approval.id,
          details: { taskId: approval.taskId, decisionOrigin: event.provider },
        });

        const confirmMsg = `✅ Approval ${approval.id} for task ${approval.taskId} marked *${actionId.toUpperCase()}* via ${event.provider}`;
        if (event.provider === "telegram" && this.telegram) {
          await this.telegram.sendReply(event.externalWorkspaceId, confirmMsg, this.replyTopicId(event));
        } else if (event.provider === "discord" && this.discord) {
          await this.discord.sendMessage({ canonicalChannelId, text: confirmMsg });
        }
      }
    }
  }

  /**
   * Outbound sync: Web message sent -> mirror to external providers
   */
  async broadcastCanonicalMessage(
    canonicalChannelId: string,
    text: string,
    authorId: string,
  ): Promise<void> {
    const channel = this.store.getChannel(canonicalChannelId);
    if (!channel) return;

    if (channel.provider === "telegram" && this.telegram) {
      await this.telegram.sendMessage({
        canonicalChannelId,
        text,
      });
    } else if (channel.provider === "discord" && this.discord) {
      await this.discord.sendMessage({
        canonicalChannelId,
        text,
      });
    }
  }
}
