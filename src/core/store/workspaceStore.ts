/**
 * Canonical Workspace State Engine & In-Memory / File Store
 * Section 6: Canonical Workspace
 * Section 11: Identity + RBAC
 * Section 12: Durable Event Ledger
 * Section 13: Real-Time Web Events
 * 
 * AgentForge owns IDs and canonical state. External IDs map onto canonical objects.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { redactRuntimeValue } from "../secret/runtimeRedaction.js";
import type {
  CanonicalWorkspace,
  WorkspaceExperience,
  CanonicalSpace,
  CanonicalChannel,
  CanonicalThread,
  CanonicalMessage,
} from "../types/workspace.js";
import type { AgentTeammate } from "../types/agent.js";
import type { Task, TaskStatus } from "../types/task.js";
import type { ExecutionContract } from "../types/contract.js";
import type { ApprovalRequest } from "../types/approval.js";
import type { ProcessAgentBinding, ProcessDefinition, ProcessDiff, ProcessRevisionProposal } from "../types/process.js";
import type { Call } from "../types/voice.js";
import type { PackageManifest, PackageInstallation } from "../types/package.js";
import type { BenchmarkResult } from "../types/benchmark.js";
import type { QualityAnalysis, QualityBaseline } from "../types/quality.js";
import type { CorrectionProposal } from "../quality/correctionRegistry.js";
import type { AuditEntry, AuditOrigin } from "../types/audit.js";
import { computeAuditHash, GENESIS_AUDIT_HASH } from "../types/audit.js";
import type { AgentForgeUser, ExternalIdentity, UserRole, UserSummary } from "../types/identity.js";
import type { OperationalMemoryRecord } from "../providers/memory.js";
import {
  AuthSession,
  ApiKeyRecord,
  DEFAULT_ROLE_PERMISSIONS,
  hashPassword,
  verifyPassword,
  generateSessionToken,
  generateApiKey,
  hashApiKey,
} from "../auth/authService.js";
import { EventLedger } from "../ledger/eventLedger.js";
import { redactRuntimeError } from "../secret/runtimeRedaction.js";

export type RealtimeListener = (event: { type: string; entity: string; data: unknown }) => void;

/** The version written by WorkspaceStore snapshots and consumed by acceptance gates. */
export const WORKSPACE_SNAPSHOT_SCHEMA_VERSION = 7;

const auditTargetTypes = new Set<AuditEntry["targetType"]>([
  "task", "agent", "contract", "approval", "message", "file", "model", "worktree", "channel",
  "workspace", "space", "process", "process_revision", "processAgentBinding", "call", "package",
  "installation", "memory", "benchmark", "user", "system", "harness",
]);

export interface UnifiedInboxItem {
  id: string;
  type: "approval_needed" | "task_failed" | "task_completed" | "agent_question" | "voice_event" | "system_warning" | "provider_error";
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  sourceId: string;
  timestamp: string;
  actionable: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}
type PersistedWorkspaceSnapshot = {
  schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  workspaces: CanonicalWorkspace[];
  spaces: CanonicalSpace[];
  channels: CanonicalChannel[];
  threads: CanonicalThread[];
  messages: Array<[string, CanonicalMessage[]]>;
  users: AgentForgeUser[];
  agents: AgentTeammate[];
  tasks: Task[];
  approvals: ApprovalRequest[];
  processes: ProcessDefinition[];
  processRevisionHistory: Array<[string, ProcessDefinition[]]>;
  processRevisionProposals: ProcessRevisionProposal[];
  processAgentBindings: ProcessAgentBinding[];
  calls: Call[];
  packages: PackageManifest[];
  installations: PackageInstallation[];
  benchmarkResults: BenchmarkResult[];
  qualityBaselines?: QualityBaseline[];
  qualityAnalyses?: QualityAnalysis[];
  qualityCorrections?: CorrectionProposal[];
  auditEntries: AuditEntry[];
  auditPrunedCheckpoint?: { prunedCount: number; lastPrunedHash: string; timestamp: string };
  operationalMemories: OperationalMemoryRecord[];
  apiKeys?: ApiKeyRecord[];
  eventLedger: ReturnType<EventLedger["getAllEntries"]>;
  externalBindings: ReturnType<EventLedger["getAllBindings"]>;
};

export class WorkspaceStore {
  // Canonical Maps
  private workspaces = new Map<string, CanonicalWorkspace>();
  private spaces = new Map<string, CanonicalSpace>();
  private channels = new Map<string, CanonicalChannel>();
  private threads = new Map<string, CanonicalThread>();
  private messages = new Map<string, CanonicalMessage[]>(); // key: channelId
  private users = new Map<string, AgentForgeUser>();
  private sessions = new Map<string, AuthSession>();
  private apiKeys = new Map<string, ApiKeyRecord>();
  private agents = new Map<string, AgentTeammate>();
  private tasks = new Map<string, Task>();
  private approvals = new Map<string, ApprovalRequest>();
  private processes = new Map<string, ProcessDefinition>();
  private processRevisionHistory = new Map<string, ProcessDefinition[]>();
  private processRevisionProposals = new Map<string, ProcessRevisionProposal>();
  private processAgentBindings = new Map<string, ProcessAgentBinding>();
  private calls = new Map<string, Call>();
  private packages = new Map<string, PackageManifest>();
  private installations = new Map<string, PackageInstallation>();
  private benchmarkResults: BenchmarkResult[] = [];
  private qualityBaselines: QualityBaseline[] = [];
  private qualityAnalyses: QualityAnalysis[] = [];
  private qualityCorrections: CorrectionProposal[] = [];
  private auditEntries: AuditEntry[] = [];
  private auditPrunedCheckpoint?: { prunedCount: number; lastPrunedHash: string; timestamp: string };
  private operationalMemories = new Map<string, OperationalMemoryRecord>();

  readonly eventLedger: EventLedger;
  private realtimeListeners: RealtimeListener[] = [];
  private restoring = false;
  private loadedLegacySnapshot = false;

  get persistenceMode(): "local_json" | "in_memory" {
    return this.persistFilePath ? "local_json" : "in_memory";
  }

  constructor(private readonly persistFilePath?: string) {
    this.eventLedger = new EventLedger(() => this.persistIfConfigured());
    // A durable installation starts with a workspace, not a pre-made project.
    // In-memory stores retain the starter project/channel fixture used by isolated tests.
    this.seedDefaultWorkspace(!persistFilePath);
    if (persistFilePath) {
      if (fs.existsSync(persistFilePath) || fs.existsSync(`${persistFilePath}.bak`)) {
        const source = this.loadFromFile(persistFilePath);
        if (source === "backup" || this.loadedLegacySnapshot) {
          // Persist the restored or migrated snapshot without rotating the source snapshot over itself.
          this.writeSnapshot(persistFilePath, false);
        }
      } else {
        this.saveToFile(persistFilePath);
      }
    }
  }

  // --- Realtime Event System ---
  subscribe(listener: RealtimeListener): () => void {
    this.realtimeListeners.push(listener);
    return () => {
      this.realtimeListeners = this.realtimeListeners.filter(l => l !== listener);
    };
  }

  emit(type: string, entity: string, data: unknown): void {
    const payload = { type, entity, data };
    if (type !== "audit_entry") {
      const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
      const entityId = [record.id, record[`${entity}Id`], record.processId, record.taskId, record.agentId]
        .find((value): value is string => typeof value === "string" && value.length > 0);
      const targetType = auditTargetTypes.has(entity as AuditEntry["targetType"])
        ? entity as AuditEntry["targetType"]
        : "system";
      this.appendAuditEntry({
        origin: "system",
        actorId: "workspace-store",
        actorType: "system",
        action: type,
        targetType,
        targetId: entityId || entity,
        details: { eventType: type, entity },
      });
    }
    this.persistIfConfigured();
    for (const listener of this.realtimeListeners) {
      try {
        listener(payload);
      } catch {
        // Prevent listener failures from breaking store operations
      }
    }
  }

  // --- Seed Initial Default Workspace ---
  private seedDefaultWorkspace(includeStarterProject = true): void {
    const defaultWs: CanonicalWorkspace = {
      id: "ws-default",
      name: "AgentForge Workspace",
      description: "Canonical AI Workforce Platform Control Plane",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workspaces.set(defaultWs.id, defaultWs);

    if (!includeStarterProject) {
      this.createDefaultOwnerUser();
      return;
    }

    // Test-only starter space and channels for in-memory API coverage.
    const nativeSpace: CanonicalSpace = {
      id: "space-native",
      workspaceId: defaultWs.id,
      name: "AgentForge Native",
      provider: "agentforge",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.spaces.set(nativeSpace.id, nativeSpace);

    // Native Channels
    const channels = ["General", "Development", "Tasks", "Alerts", "Calls"];
    for (const name of channels) {
      const chan: CanonicalChannel = {
        id: `chan-${name.toLowerCase()}`,
        workspaceId: defaultWs.id,
        spaceId: nativeSpace.id,
        name,
        visibility: "public",
        archived: false,
        provider: "agentforge",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.channels.set(chan.id, chan);
      this.messages.set(chan.id, []);
    }

    this.createDefaultOwnerUser();
  }

  private createDefaultOwnerUser(): void {
    // Default Owner User
    const ownerUser: AgentForgeUser = {
      id: "user-owner",
      username: "owner",
      displayName: "Workspace Owner",
      role: "owner",
      permissions: ["*"],
      status: "active",
      // Real Telegram/Discord identities must be linked by the workspace owner.
      externalIdentities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(ownerUser.id, ownerUser);
  }

  // --- Workspaces & Spaces ---
  getWorkspace(id = "ws-default"): CanonicalWorkspace | undefined {
    return this.workspaces.get(id);
  }

  listWorkspaces(): CanonicalWorkspace[] {
    return Array.from(this.workspaces.values());
  }

  updateWorkspace(id: string, changes: Pick<Partial<CanonicalWorkspace>, "name" | "description" | "experience">): CanonicalWorkspace {
    const existing = this.workspaces.get(id);
    if (!existing) throw new Error("Workspace not found");
    const workspace = { ...existing, ...changes, updatedAt: new Date().toISOString() };
    this.workspaces.set(id, workspace);
    this.emit("workspace_updated", "workspace", workspace);
    return workspace;
  }

  createWorkspace(params: Omit<CanonicalWorkspace, "id" | "createdAt" | "updatedAt">): CanonicalWorkspace {
    const id = `ws-${crypto.randomUUID().slice(0, 8)}`;
    const ws: CanonicalWorkspace = {
      ...params,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workspaces.set(id, ws);
    this.emit("workspace_created", "workspace", ws);
    return ws;
  }

  createSpace(params: Omit<CanonicalSpace, "id" | "createdAt" | "updatedAt">): CanonicalSpace {
    if (params.parentSpaceId) {
      const parent = this.spaces.get(params.parentSpaceId);
      if (!parent || parent.workspaceId !== params.workspaceId) {
        throw new Error("Parent space must exist in the same workspace");
      }
    }
    const id = `space-${crypto.randomUUID().slice(0, 8)}`;
    const space: CanonicalSpace = {
      ...params,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.spaces.set(id, space);
    this.emit("space_created", "space", space);
    return space;
  }

  getSpace(id: string): CanonicalSpace | undefined { return this.spaces.get(id); }

  updateSpace(id: string, changes: Pick<Partial<CanonicalSpace>, "name" | "description" | "instructions" | "repositoryPath" | "repositoryAccess" | "archived">): CanonicalSpace {
    const existing = this.spaces.get(id);
    if (!existing) throw new Error("Project not found");
    const space = { ...existing, ...changes, updatedAt: new Date().toISOString() };
    this.spaces.set(id, space);
    this.emit("space_updated", "space", space);
    return space;
  }

  listSpaces(workspaceId = "ws-default"): CanonicalSpace[] {
    return Array.from(this.spaces.values()).filter(s => s.workspaceId === workspaceId);
  }

  // --- Channels & Mirroring ---
  createChannel(params: Omit<CanonicalChannel, "id" | "createdAt" | "updatedAt">): CanonicalChannel {
    const space = this.spaces.get(params.spaceId);
    if (!space || space.workspaceId !== params.workspaceId) {
      throw new Error("Channel space must exist in the same workspace");
    }
    const externalProvider = params.provider === "telegram" || params.provider === "discord" || params.provider === "slack" ? params.provider : undefined;
    if (params.externalId && externalProvider && this.findMirroredChannel(externalProvider, params.externalId)) {
      throw new Error("External channel is already mirrored");
    }
    const id = `chan-${crypto.randomUUID().slice(0, 8)}`;
    const channel: CanonicalChannel = {
      ...params,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.channels.set(id, channel);
    this.messages.set(id, []);
    this.emit("channel_created", "channel", channel);
    return channel;
  }

  getChannel(id: string): CanonicalChannel | undefined {
    return this.channels.get(id);
  }

  listChannels(spaceId?: string): CanonicalChannel[] {
    const all = Array.from(this.channels.values());
    return spaceId ? all.filter(c => c.spaceId === spaceId) : all;
  }

  findMirroredChannel(provider: "telegram" | "discord" | "slack", externalId: string): CanonicalChannel | undefined {
    return Array.from(this.channels.values()).find(
      c => c.provider === provider && c.externalId === externalId
    );
  }

  // --- Messages & Threads ---
  createThread(channelId: string, title: string): CanonicalThread {
    if (!this.channels.has(channelId)) throw new Error("Channel not found");
    const now = new Date().toISOString();
    const thread: CanonicalThread = { id: crypto.randomUUID(), channelId, title, archived: false, pinned: false, createdAt: now, updatedAt: now };
    this.threads.set(thread.id, thread);
    this.emit("thread_created", "thread", thread);
    return thread;
  }

  getThread(id: string): CanonicalThread | undefined { return this.threads.get(id); }

  listThreads(channelId?: string): CanonicalThread[] {
    return Array.from(this.threads.values()).filter(t => !channelId || t.channelId === channelId)
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt.localeCompare(a.updatedAt));
  }

  updateThread(id: string, changes: Pick<Partial<CanonicalThread>, "title" | "pinned" | "archived">): CanonicalThread {
    const existing = this.threads.get(id);
    if (!existing) throw new Error("Conversation not found");
    const thread = { ...existing, ...changes, updatedAt: new Date().toISOString() };
    this.threads.set(id, thread);
    this.emit("thread_updated", "thread", thread);
    return thread;
  }

  listThreadMessages(id: string): CanonicalMessage[] {
    const thread = this.threads.get(id);
    return thread ? (this.messages.get(thread.channelId) || []).filter(message => message.threadId === id) : [];
  }

  moveThread(id: string, channelId: string): CanonicalThread {
    const thread = this.threads.get(id);
    const source = thread && this.channels.get(thread.channelId);
    const target = this.channels.get(channelId);
    const targetProject = target && this.spaces.get(target.spaceId);
    if (!thread || !source || !target || thread.archived || target.archived
      || target.visibility !== "private" || source.workspaceId !== target.workspaceId
      || !["agentforge", "web"].includes(source.provider) || !["agentforge", "web"].includes(target.provider)
      || !targetProject || targetProject.archived || targetProject.workspaceId !== source.workspaceId) throw new Error("Choose an active private project channel in this workspace.");
    if (thread.channelId === channelId) return thread;
    const previousChannelId = thread.channelId;
    const sourceMessages = this.messages.get(previousChannelId) || [];
    const moving = sourceMessages.filter(message => message.threadId === id);
    this.messages.set(previousChannelId, sourceMessages.filter(message => message.threadId !== id));
    this.messages.set(channelId, [...(this.messages.get(channelId) || []), ...moving.map(message => ({ ...message, channelId }))]);
    const updated = { ...thread, channelId, updatedAt: new Date().toISOString() };
    this.threads.set(id, updated);
    this.emit("thread_moved", "thread", { ...updated, previousChannelId });
    return updated;
  }

  editThreadMessage(threadId: string, messageId: string, authorId: string, content: string, expectedContent: string): CanonicalMessage {
    const thread = this.threads.get(threadId);
    const message = this.listThreadMessages(threadId).find(item => item.id === messageId);
    if (!thread || thread.archived || !message || message.authorType !== "user" || message.authorId !== authorId) throw new Error("Message cannot be edited by this user.");
    if (message.content !== expectedContent) throw new Error("Message changed since you opened it. Reload before editing.");
    if (content.length > 40000 || (!content.trim() && !message.attachments?.length)) throw new Error("Enter message text.");
    if (content === message.content) return message;
    const now = new Date().toISOString();
    message.revisions = [...(message.revisions || []), { content: message.content, editedAt: now, editedBy: authorId }];
    message.content = content;
    message.updatedAt = now;
    thread.updatedAt = now;
    this.emit("message_edited", "message", message);
    return message;
  }

  branchThread(threadId: string, throughMessageId: string): CanonicalThread {
    const source = this.threads.get(threadId);
    const messages = this.listThreadMessages(threadId);
    const cutoff = messages.findIndex(message => message.id === throughMessageId);
    if (!source || cutoff < 0) throw new Error("Choose a message in this conversation.");
    const now = new Date().toISOString();
    const branch: CanonicalThread = { id: crypto.randomUUID(), channelId: source.channelId, title: (source.title || "Conversation").slice(0, 180) + " · branch", parentThreadId: source.id, parentMessageId: throughMessageId, createdAt: now, updatedAt: now };
    const selected = messages.slice(0, cutoff + 1);
    const ids = new Map(selected.map(message => [message.id, `msg-${crypto.randomUUID()}`]));
    const copies = selected.map(message => ({ ...structuredClone(message), id: ids.get(message.id)!, threadId: branch.id, replyToMessageId: message.replyToMessageId ? ids.get(message.replyToMessageId) : undefined, generation: message.generation ? { ...message.generation, promptMessageId: ids.get(message.generation.promptMessageId) || message.generation.promptMessageId } : undefined, externalMessageId: undefined }));
    // Persist the branch and its history together, never a partially copied conversation.
    this.threads.set(branch.id, branch);
    this.messages.set(source.channelId, [...(this.messages.get(source.channelId) || []), ...copies]);
    this.emit("thread_branched", "thread", branch);
    return branch;
  }

  createMessage(params: Omit<CanonicalMessage, "id" | "createdAt" | "updatedAt">): CanonicalMessage {
    const id = `msg-${crypto.randomUUID().slice(0, 8)}`;
    const msg: CanonicalMessage = {
      ...params,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (params.threadId) {
      const thread = this.threads.get(params.threadId);
      if (!thread || thread.channelId !== params.channelId || thread.archived) throw new Error("Conversation is unavailable");
      this.threads.set(thread.id, { ...thread, updatedAt: msg.createdAt });
    }
    const list = this.messages.get(params.channelId) || [];
    list.push(msg);
    this.messages.set(params.channelId, list);
    this.emit("message_created", "message", msg);
    return msg;
  }

  listMessages(channelId: string, limit = 100): CanonicalMessage[] {
    const list = this.messages.get(channelId) || [];
    return list.slice(-limit);
  }

  // --- Agents ---
  createAgent(agent: Omit<AgentTeammate, "createdAt" | "updatedAt" | "id"> & { id?: string }): AgentTeammate {
    const id = agent.id || `agent-${crypto.randomUUID().slice(0, 8)}`;
    if (this.agents.has(id)) throw new Error(`Agent ${id} already exists`);
    const fullAgent: AgentTeammate = {
      ...agent,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.agents.set(id, fullAgent);
    this.emit("agent_created", "agent", fullAgent);
    return fullAgent;
  }

  getAgent(id: string): AgentTeammate | undefined {
    return this.agents.get(id);
  }

  updateAgent(id: string, updates: Partial<AgentTeammate>): AgentTeammate {
    const existing = this.agents.get(id);
    if (!existing) throw new Error(`Agent ${id} not found`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.agents.set(id, updated);
    this.emit("agent_updated", "agent", updated);
    return updated;
  }

  listAgents(): AgentTeammate[] {
    return Array.from(this.agents.values());
  }

  /**
   * Remove records produced only by the pre-release in-memory showcase.
   *
   * Early desktop builds accidentally persisted these reserved IDs in a few
   * local workspaces.  They are not user-created records, and leaving them in
   * place makes a new installation look as though agents and work are already
   * running.  The allowlist is deliberately ID/name specific: ordinary user
   * records are never selected by this migration.
   */
  removeLegacyFixtureRecords(): { agents: number; tasks: number; approvals: number; packages: number } {
    const fixtureAgentIds = new Set(["agent-alex", "agent-reviewer"]);
    const fixtureTaskIds = new Set(["AF-142"]);
    const fixturePackageNames = new Set(["workspace-operations-pack", "analytics-reporting-pack"]);
    let agents = 0;
    let tasks = 0;
    let approvals = 0;
    let packages = 0;

    for (const id of fixtureAgentIds) {
      if (this.agents.delete(id)) agents += 1;
    }
    for (const id of fixtureTaskIds) {
      if (this.tasks.delete(id)) tasks += 1;
    }
    for (const [id, approval] of this.approvals) {
      if (fixtureTaskIds.has(approval.taskId) || /fixture|example approval/i.test(`${approval.action} ${approval.description || ""}`)) {
        this.approvals.delete(id);
        approvals += 1;
      }
    }
    for (const name of fixturePackageNames) {
      if (this.packages.delete(name)) packages += 1;
    }

    if (agents || tasks || approvals || packages) {
      this.emit("legacy_fixture_records_removed", "workspace", { agents, tasks, approvals, packages });
    }
    return { agents, tasks, approvals, packages };
  }

  // --- Tasks ---
  createTask(task: {
    id?: string;
    projectId?: string;
    title: string;
    description?: string;
    priority: Task["priority"];
    status: TaskStatus;
    assignedAgentId?: string;
    originChannelId?: string;
    originThreadId?: string;
    contract?: ExecutionContract;
    processId?: string;
  }): Task {
    let id = task.id;
    if (!id) {
      do {
        id = `AF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      } while (this.tasks.has(id));
    }
    if (this.tasks.has(id)) throw new Error(`Task ${id} already exists`);
    if (task.contract && task.contract.taskId !== id) {
      throw new Error(`Execution contract taskId must match task id ${id}`);
    }
    const contract = task.contract ?? this.createRestrictedDefaultContract(id);
    const fullTask: Task = {
      ...task,
      projectId: task.projectId ?? "proj-default",
      description: task.description ?? "",
      contract,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, fullTask);
    this.emit("task_created", "task", fullTask);
    return fullTask;
  }

  private createRestrictedDefaultContract(taskId: string): ExecutionContract {
    return {
      id: `contract-${taskId}`,
      taskId,
      version: 1,
      repository: { baseBranch: "unresolved", baseSha: "unresolved" },
      workspace: { requireIsolatedWorktree: true },
      scope: { allowedPaths: [], protectedPaths: ["**"] },
      authority: {
        externalMessage: false,
        productionWrite: false,
        deployment: false,
        forcePush: false,
        deleteFiles: false,
        networkOutbound: false,
      },
      requiredChecks: [],
      completion: { requireEvidencePack: true, requireHumanApproval: true },
      createdAt: new Date().toISOString(),
    };
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  updateTask(id: string, updates: Partial<Task>): Task {
    const existing = this.tasks.get(id);
    if (!existing) throw new Error(`Task ${id} not found`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    this.emit("task_updated", "task", updated);
    return updated;
  }

  listTasks(status?: TaskStatus): Task[] {
    const all = Array.from(this.tasks.values());
    return status ? all.filter(t => t.status === status) : all;
  }

  // --- Approvals ---
  createApproval(approval: Omit<ApprovalRequest, "id" | "status" | "createdAt" | "description"> & { description?: string }): ApprovalRequest {
    const id = `appr-${crypto.randomUUID().slice(0, 8)}`;
    const fullApproval: ApprovalRequest = {
      ...approval,
      description: approval.description ?? approval.action,
      id,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.approvals.set(id, fullApproval);
    this.emit("approval_created", "approval", fullApproval);
    return fullApproval;
  }

  getApproval(id: string): ApprovalRequest | undefined {
    return this.approvals.get(id);
  }

  resolveApproval(params: {
    approvalId: string;
    status: "approved" | "rejected";
    approverUserId: string;
    decisionOrigin: "web" | "telegram" | "discord" | "api";
    decisionNotes?: string;
  }): ApprovalRequest {
    const appr = this.approvals.get(params.approvalId);
    if (!appr) throw new Error(`Approval ${params.approvalId} not found`);
    if (appr.status !== "pending") throw new Error("Approval has already been resolved");
    appr.status = params.status;
    appr.approverUserId = params.approverUserId;
    appr.decisionOrigin = params.decisionOrigin;
    appr.decisionNotes = params.decisionNotes;
    appr.decidedAt = new Date().toISOString();
    if (appr.taskId) {
      const task = this.tasks.get(appr.taskId);
      if (task && task.status === "waiting_approval") {
        if (params.status === "approved") {
          // Process-step authorization is not proof of task completion.
          if (task.evidencePack?.verifiedPassed && task.evidencePack.approvalId === appr.id) {
            task.status = "completed";
            task.completedAt = new Date().toISOString();
            task.evidencePack.approvedBy = params.approverUserId;
            task.evidencePack.approvalSource = params.decisionOrigin;
          }
        } else if (params.status === "rejected") {
          task.status = "failed";
          task.error = `Human review rejected: ${params.decisionNotes || "Rejected by reviewer"}`;
          task.completedAt = new Date().toISOString();
        }
        this.emit("task_updated", "task", task);
      }
    }
    this.emit("approval_resolved", "approval", appr);
    return appr;
  }

  listApprovals(status?: ApprovalRequest["status"]): ApprovalRequest[] {
    const all = Array.from(this.approvals.values());
    return status ? all.filter(a => a.status === status) : all;
  }

  // --- Processes ---
  createProcess(process: ProcessDefinition): ProcessDefinition {
    if (this.processes.has(process.id)) throw new Error(`Process ${process.id} already exists`);
    this.processes.set(process.id, process);
    this.emit("process_created", "process", process);
    return process;
  }

  updateProcess(process: ProcessDefinition, expectedVersion: number): ProcessDefinition {
    const existing = this.processes.get(process.id);
    if (!existing) throw new Error(`Process ${process.id} not found`);
    if (!Number.isSafeInteger(expectedVersion) || existing.version !== expectedVersion) {
      throw new Error(`Process ${process.id} version conflict: expected ${expectedVersion}, current ${existing.version}`);
    }
    if (process.version !== expectedVersion + 1) {
      throw new Error(`Process ${process.id} revision must increment version by exactly one`);
    }
    const history = this.processRevisionHistory.get(process.id) ?? [];
    history.push(structuredClone(existing));
    this.processRevisionHistory.set(process.id, history);
    const updated = structuredClone(process);
    this.processes.set(process.id, updated);
    this.emit("process_updated", "process", updated);
    return updated;
  }

  listProcessRevisions(processId: string): ProcessDefinition[] {
    return (this.processRevisionHistory.get(processId) ?? []).map(revision => structuredClone(revision));
  }

  rollbackProcess(processId: string, targetVersion: number, expectedVersion: number): ProcessDefinition {
    const current = this.processes.get(processId);
    if (!current) throw new Error(`Process ${processId} not found`);
    if (!Number.isSafeInteger(expectedVersion) || current.version !== expectedVersion) {
      throw new Error(`Process ${processId} version conflict: expected ${expectedVersion}, current ${current.version}`);
    }
    const history = this.processRevisionHistory.get(processId) ?? [];
    const target = history.find(revision => revision.version === targetVersion);
    if (!target || targetVersion >= current.version) {
      throw new Error(`Process ${processId} historical version ${targetVersion} was not found`);
    }
    history.push(structuredClone(current));
    this.processRevisionHistory.set(processId, history);
    const restored: ProcessDefinition = {
      ...structuredClone(target),
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      lastSynchronizedAt: new Date().toISOString(),
    };
    this.processes.set(processId, restored);
    this.emit("process_rolled_back", "process", { processId, fromVersion: current.version, targetVersion, restoredVersion: restored.version });
    return restored;
  }

  createProcessRevisionProposal(params: {
    processId: string;
    expectedVersion: number;
    revision: ProcessDefinition;
    diff: ProcessDiff;
  }): ProcessRevisionProposal {
    const current = this.processes.get(params.processId);
    if (!current) throw new Error(`Process ${params.processId} not found`);
    if (!Number.isSafeInteger(params.expectedVersion) || current.version !== params.expectedVersion) {
      throw new Error(`Process ${params.processId} version conflict: expected ${params.expectedVersion}, current ${current.version}`);
    }
    if (params.revision.id !== params.processId || params.revision.version !== params.expectedVersion + 1) {
      throw new Error("A proposed process revision must target this process and increment its version by exactly one.");
    }
    const now = new Date().toISOString();
    const proposal: ProcessRevisionProposal = {
      id: `process-revision-${crypto.randomUUID()}`,
      processId: params.processId,
      expectedVersion: params.expectedVersion,
      revision: structuredClone(params.revision),
      diff: structuredClone(params.diff),
      status: "pending",
      createdAt: now,
    };
    this.processRevisionProposals.set(proposal.id, proposal);
    this.emit("process_revision_proposed", "process_revision", proposal);
    return structuredClone(proposal);
  }

  listProcessRevisionProposals(processId?: string): ProcessRevisionProposal[] {
    return Array.from(this.processRevisionProposals.values())
      .filter(proposal => !processId || proposal.processId === processId)
      .map(proposal => structuredClone(proposal));
  }

  resolveProcessRevisionProposal(params: {
    proposalId: string;
    status: "approved" | "rejected";
    approverUserId: string;
  }): { proposal: ProcessRevisionProposal; process?: ProcessDefinition } {
    const proposal = this.processRevisionProposals.get(params.proposalId);
    if (!proposal) throw new Error(`Process revision proposal ${params.proposalId} not found`);
    if (proposal.status !== "pending") throw new Error(`Process revision proposal is already ${proposal.status}`);
    const now = new Date().toISOString();
    const current = this.processes.get(proposal.processId);
    if (!current) throw new Error(`Process ${proposal.processId} not found`);
    if (current.version !== proposal.expectedVersion) {
      proposal.status = "stale";
      proposal.resolvedAt = now;
      proposal.resolvedByUserId = params.approverUserId;
      this.emit("process_revision_stale", "process_revision", proposal);
      return { proposal: structuredClone(proposal) };
    }
    proposal.status = params.status;
    proposal.resolvedAt = now;
    proposal.resolvedByUserId = params.approverUserId;
    if (params.status === "rejected") {
      this.emit("process_revision_rejected", "process_revision", proposal);
      return { proposal: structuredClone(proposal) };
    }
    const history = this.processRevisionHistory.get(proposal.processId) ?? [];
    history.push(structuredClone(current));
    this.processRevisionHistory.set(proposal.processId, history);
    const approved = { ...structuredClone(proposal.revision), updatedAt: now };
    this.processes.set(proposal.processId, approved);
    this.emit("process_revision_approved", "process_revision", proposal);
    this.emit("process_updated", "process", approved);
    return { proposal: structuredClone(proposal), process: structuredClone(approved) };
  }

  getProcess(id: string): ProcessDefinition | undefined {
    return this.processes.get(id);
  }

  listProcesses(): ProcessDefinition[] {
    return Array.from(this.processes.values());
  }

  bindProcessToAgent(params: { processId: string; agentId: string; assignedRole: string }): ProcessAgentBinding {
    if (!this.processes.has(params.processId)) throw new Error(`Process ${params.processId} not found`);
    if (!this.agents.has(params.agentId)) throw new Error(`Agent ${params.agentId} not found`);
    const assignedRole = params.assignedRole.trim();
    if (!assignedRole || assignedRole.length > 120) throw new Error("Assigned process role must be 1 to 120 characters.");
    const key = `${params.processId}:${params.agentId}`;
    const existing = this.processAgentBindings.get(key);
    if (existing?.assignedRole === assignedRole) return structuredClone(existing);
    const binding: ProcessAgentBinding = {
      processId: params.processId,
      agentId: params.agentId,
      assignedRole,
      boundAt: new Date().toISOString(),
    };
    this.processAgentBindings.set(key, binding);
    this.emit("process_agent_bound", "processAgentBinding", binding);
    return structuredClone(binding);
  }

  listProcessAgentBindings(filter: { processId?: string; agentId?: string } = {}): ProcessAgentBinding[] {
    return Array.from(this.processAgentBindings.values())
      .filter(binding => (!filter.processId || binding.processId === filter.processId)
        && (!filter.agentId || binding.agentId === filter.agentId))
      .map(binding => structuredClone(binding));
  }

  // --- Calls ---
  createCall(call: Call): Call {
    this.calls.set(call.id, call);
    this.emit("call_created", "call", call);
    return call;
  }

  getCall(id: string): Call | undefined {
    return this.calls.get(id);
  }

  updateCall(id: string, updates: Partial<Call>): Call {
    const existing = this.calls.get(id);
    if (!existing) throw new Error(`Call ${id} not found`);
    const updated = { ...existing, ...updates };
    this.calls.set(id, updated);
    this.emit("call_updated", "call", updated);
    return updated;
  }

  listCalls(channelId?: string): Call[] {
    const all = Array.from(this.calls.values());
    return channelId ? all.filter(c => c.canonicalChannelId === channelId) : all;
  }

  // --- Packages & Marketplace ---
  registerPackage(pkg: PackageManifest): void {
    this.packages.set(pkg.name, pkg);
    this.emit("package_registered", "package", pkg);
  }

  getPackage(name: string): PackageManifest | undefined {
    return this.packages.get(name);
  }

  listPackages(): PackageManifest[] {
    return Array.from(this.packages.values());
  }

  recordInstallation(inst: PackageInstallation): void {
    this.installations.set(inst.packageId, inst);
    this.emit("package_installed", "installation", inst);
  }

  getInstallation(packageId: string): PackageInstallation | undefined {
    return this.installations.get(packageId);
  }

  removeInstallation(packageId: string): boolean {
    const existing = this.installations.get(packageId);
    if (!existing) return false;
    this.installations.delete(packageId);
    this.emit("package_uninstalled", "installation", { packageId });
    return true;
  }

  listInstallations(): PackageInstallation[] {
    return Array.from(this.installations.values());
  }

  // --- Benchmarks ---
  recordBenchmarkResult(result: BenchmarkResult): void {
    this.benchmarkResults.push(result);
    this.emit("benchmark_recorded", "benchmark", result);
  }

  listBenchmarkResults(targetId?: string): BenchmarkResult[] {
    return targetId
      ? this.benchmarkResults.filter(r => r.targetId === targetId)
      : [...this.benchmarkResults];
  }

  // --- Quality evidence ---
  // Baselines and comparison reports are stored separately from raw benchmark
  // artifacts so the quality dashboard remains restart-safe and source-backed.
  getQualityState(): { baselines: QualityBaseline[]; analyses: QualityAnalysis[] } {
    return { baselines: structuredClone(this.qualityBaselines), analyses: structuredClone(this.qualityAnalyses) };
  }

  setQualityState(state: { baselines: QualityBaseline[]; analyses: QualityAnalysis[] }): void {
    this.qualityBaselines = structuredClone(state.baselines);
    this.qualityAnalyses = structuredClone(state.analyses);
    this.persistIfConfigured();
  }

  /** Privacy-reviewed correction metadata only; raw evidence stays external. */
  listQualityCorrections(): CorrectionProposal[] {
    return structuredClone(this.qualityCorrections);
  }

  setQualityCorrections(corrections: CorrectionProposal[]): void {
    this.qualityCorrections = structuredClone(corrections);
    this.persistIfConfigured();
  }
  // --- Audit ---
  private appendAuditEntry(entry: {
    id?: string;
    timestamp?: string;
    origin: AuditOrigin;
    actorId: string;
    actorType: "user" | "agent" | "system";
    action: string;
    targetType: AuditEntry["targetType"];
    targetId: string;
    details: Record<string, unknown>;
    ipAddress?: string;
    previousHash?: string;
    hash?: string;
  }): AuditEntry {
    // Audit metadata is durable and may be displayed or exported later. Keep the
    // ledger useful while preventing credentials from becoming permanent records.
    const details = redactRuntimeValue(entry.details) as Record<string, unknown>;
    const id = entry.id || `audit-${crypto.randomUUID().slice(0, 8)}`;
    const timestamp = entry.timestamp || new Date().toISOString();
    const lastEntry = this.auditEntries[this.auditEntries.length - 1];
    const previousHash = entry.previousHash || (lastEntry?.hash ?? this.auditPrunedCheckpoint?.lastPrunedHash ?? GENESIS_AUDIT_HASH);
    const hash = entry.hash || computeAuditHash({
      id,
      timestamp,
      origin: entry.origin,
      actorId: entry.actorId,
      actorType: entry.actorType,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      details,
      ipAddress: entry.ipAddress,
      previousHash,
    });
    const fullEntry: AuditEntry = {
      ...entry,
      details,
      id,
      timestamp,
      previousHash,
      hash,
    };
    this.auditEntries.push(fullEntry);
    return fullEntry;
  }

  recordAudit(entry: Omit<AuditEntry, "id" | "timestamp" | "previousHash" | "hash"> & {
    id?: string;
    timestamp?: string;
    previousHash?: string;
    hash?: string;
  }): AuditEntry {
    const fullEntry = this.appendAuditEntry(entry);
    this.emit("audit_entry", "audit", fullEntry);
    return fullEntry;
  }

  listAuditEntries(options: number | { limit?: number; origin?: AuditOrigin; actorId?: string; targetType?: string; targetId?: string } = 100): AuditEntry[] {
    const limit = typeof options === "number" ? options : (options.limit ?? 100);
    let entries = this.auditEntries;
    if (typeof options === "object") {
      if (options.origin) entries = entries.filter(e => e.origin === options.origin);
      if (options.actorId) entries = entries.filter(e => e.actorId === options.actorId);
      if (options.targetType) entries = entries.filter(e => e.targetType === options.targetType);
      if (options.targetId) entries = entries.filter(e => e.targetId === options.targetId);
    }
    return entries.slice(-limit);
  }

  verifyAuditChain(): { valid: boolean; totalEntries: number; brokenAtIndex?: number; reason?: string } {
    const totalEntries = this.auditEntries.length;
    if (totalEntries === 0) {
      return { valid: true, totalEntries: 0 };
    }

    const initialPrevHash = this.auditPrunedCheckpoint?.lastPrunedHash || GENESIS_AUDIT_HASH;

    for (let i = 0; i < totalEntries; i++) {
      const entry = this.auditEntries[i];
      const expectedPrevHash = i === 0 ? initialPrevHash : this.auditEntries[i - 1].hash;

      if (entry.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          totalEntries,
          brokenAtIndex: i,
          reason: `previousHash mismatch at index ${i}: expected "${expectedPrevHash}", got "${entry.previousHash}"`,
        };
      }

      const expectedHash = computeAuditHash({
        id: entry.id,
        timestamp: entry.timestamp,
        origin: entry.origin,
        actorId: entry.actorId,
        actorType: entry.actorType,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        details: entry.details,
        ipAddress: entry.ipAddress,
        previousHash: entry.previousHash,
      });

      if (entry.hash !== expectedHash) {
        return {
          valid: false,
          totalEntries,
          brokenAtIndex: i,
          reason: `hash mismatch at index ${i}: computed "${expectedHash}", got "${entry.hash}"`,
        };
      }
    }

    return { valid: true, totalEntries };
  }

  pruneAuditTrail(options: { retentionDays?: number; maxEntries?: number } = {}): { prunedCount: number; remainingCount: number } {
    if (this.auditEntries.length === 0) {
      return { prunedCount: 0, remainingCount: 0 };
    }

    let cutoffIndex = 0;

    if (options.retentionDays !== undefined && options.retentionDays > 0) {
      const cutoffTime = Date.now() - options.retentionDays * 86400000;
      for (let i = 0; i < this.auditEntries.length; i++) {
        const entryTime = Date.parse(this.auditEntries[i].timestamp);
        if (Number.isFinite(entryTime) && entryTime < cutoffTime) {
          cutoffIndex = i + 1;
        } else {
          break;
        }
      }
    }

    if (options.maxEntries !== undefined && options.maxEntries >= 0) {
      const maxCutoff = Math.max(0, this.auditEntries.length - options.maxEntries);
      if (maxCutoff > cutoffIndex) {
        cutoffIndex = maxCutoff;
      }
    }

    if (cutoffIndex === 0) {
      return { prunedCount: 0, remainingCount: this.auditEntries.length };
    }

    const lastPrunedEntry = this.auditEntries[cutoffIndex - 1];
    this.auditPrunedCheckpoint = {
      prunedCount: (this.auditPrunedCheckpoint?.prunedCount || 0) + cutoffIndex,
      lastPrunedHash: lastPrunedEntry.hash || GENESIS_AUDIT_HASH,
      timestamp: new Date().toISOString(),
    };

    const prunedCount = cutoffIndex;
    this.auditEntries = this.auditEntries.slice(cutoffIndex);
    this.persistIfConfigured();

    return { prunedCount, remainingCount: this.auditEntries.length };
  }

  getAuditCheckpoint(): { prunedCount: number; lastPrunedHash: string; timestamp: string } | undefined {
    return this.auditPrunedCheckpoint ? { ...this.auditPrunedCheckpoint } : undefined;
  }

  // --- Durable operational memory ---
  listOperationalMemories(namespace: string): OperationalMemoryRecord[] {
    return Array.from(this.operationalMemories.values()).filter(record => record.namespace === namespace);
  }

  saveOperationalMemory(record: OperationalMemoryRecord): void {
    this.operationalMemories.set(record.id, record);
    this.emit("operational_memory_saved", "memory", {
      id: record.id,
      namespace: record.namespace,
      category: record.category,
      title: record.title,
    });
    this.persistIfConfigured();
  }

  deleteOperationalMemory(namespace: string, id: string): boolean {
    const record = this.operationalMemories.get(id);
    if (!record || record.namespace !== namespace) return false;
    this.operationalMemories.delete(id);
    this.emit("operational_memory_deleted", "memory", { id, namespace });
    this.persistIfConfigured();
    return true;
  }

  searchOperationalMemory(queryText: string, namespace = "default"): OperationalMemoryRecord[] {
    const lower = queryText.toLowerCase().trim();
    if (!lower) return this.listOperationalMemories(namespace);
    return this.listOperationalMemories(namespace).filter(record =>
      record.title.toLowerCase().includes(lower) ||
      record.content.toLowerCase().includes(lower) ||
      record.tags?.some(tag => tag.toLowerCase().includes(lower))
    );
  }

  // --- Users & RBAC ---
  getUser(id: string): AgentForgeUser | undefined {
    return this.users.get(id);
  }

  getUserByUsername(username: string): AgentForgeUser | undefined {
    return Array.from(this.users.values()).find(
      u => u.username.toLowerCase() === username.toLowerCase()
    );
  }

  listUsers(): UserSummary[] {
    return Array.from(this.users.values()).map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      role: u.role,
      permissions: u.permissions,
      status: u.status || "active",
      externalIdentities: u.externalIdentities,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  createUser(params: {
    username: string;
    displayName: string;
    role: UserRole;
    email?: string;
    password?: string;
    permissions?: string[];
  }): AgentForgeUser {
    const existing = this.getUserByUsername(params.username);
    if (existing) {
      throw new Error(`Username '${params.username}' is already taken`);
    }

    const id = `user-${crypto.randomUUID().slice(0, 8)}`;
    const permissions = params.permissions || DEFAULT_ROLE_PERMISSIONS[params.role] || ["tasks:read"];
    let passwordHash: string | undefined;
    let salt: string | undefined;

    if (params.password) {
      const creds = hashPassword(params.password);
      passwordHash = creds.passwordHash;
      salt = creds.salt;
    }

    const user: AgentForgeUser = {
      id,
      username: params.username,
      displayName: params.displayName,
      email: params.email,
      role: params.role,
      permissions,
      passwordHash,
      salt,
      status: "active",
      externalIdentities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.set(id, user);
    this.emit("user_created", "user", { id, username: user.username, role: user.role });
    return user;
  }

  updateUser(
    id: string,
    updates: Partial<{ displayName: string; role: UserRole; permissions: string[]; status: "active" | "suspended"; password?: string }>
  ): AgentForgeUser {
    const user = this.getUser(id);
    if (!user) throw new Error(`User ${id} not found`);

    if (updates.role && updates.role !== user.role) {
      if (user.role === "owner" && updates.role !== "owner") {
        const activeOwners = Array.from(this.users.values()).filter(u => u.role === "owner" && u.status === "active");
        if (activeOwners.length <= 1) {
          throw new Error("Cannot demote the only active workspace owner");
        }
      }
      user.role = updates.role;
      user.permissions = updates.permissions || DEFAULT_ROLE_PERMISSIONS[updates.role];
    } else if (updates.permissions) {
      user.permissions = updates.permissions;
    }

    if (updates.displayName !== undefined) user.displayName = updates.displayName;
    if (updates.status !== undefined) user.status = updates.status;

    if (updates.password) {
      const creds = hashPassword(updates.password);
      user.passwordHash = creds.passwordHash;
      user.salt = creds.salt;
    }

    user.updatedAt = new Date().toISOString();
    this.emit("user_updated", "user", { id: user.id, role: user.role, status: user.status });
    return user;
  }

  deleteUser(id: string): boolean {
    const user = this.getUser(id);
    if (!user) return false;
    if (user.role === "owner") {
      const activeOwners = Array.from(this.users.values()).filter(u => u.role === "owner" && u.status === "active");
      if (activeOwners.length <= 1) {
        throw new Error("Cannot delete the only active workspace owner");
      }
    }

    this.users.delete(user.id);
    // Invalidate sessions and API keys
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === user.id) this.sessions.delete(token);
    }
    for (const [keyId, apiKey] of this.apiKeys.entries()) {
      if (apiKey.userId === user.id) this.apiKeys.delete(keyId);
    }
    this.emit("user_deleted", "user", { id: user.id });
    return true;
  }

  authenticateUser(username: string, password: string): AgentForgeUser | null {
    const user = this.getUserByUsername(username);
    if (!user || !user.passwordHash || !user.salt) return null;
    if (user.status === "suspended") return null;

    if (verifyPassword(password, user.salt, user.passwordHash)) {
      return user;
    }
    return null;
  }

  createSession(userId: string, ttlHours = 24): AuthSession {
    const user = this.getUser(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    if (user.status === "suspended") throw new Error("User account is suspended");

    const token = generateSessionToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 3600 * 1000).toISOString();

    const session: AuthSession = {
      token,
      userId: user.id,
      role: user.role,
      permissions: user.permissions,
      expiresAt,
      createdAt: now.toISOString(),
      lastUsedAt: now.toISOString(),
    };

    this.sessions.set(token, session);
    return session;
  }

  validateSession(token: string): AuthSession | null {
    const session = this.sessions.get(token);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.sessions.delete(token);
      return null;
    }

    const user = this.getUser(session.userId);
    if (!user || user.status === "suspended") {
      this.sessions.delete(token);
      return null;
    }

    session.role = user.role;
    session.permissions = user.permissions;
    session.lastUsedAt = new Date().toISOString();
    return session;
  }

  revokeSession(token: string): boolean {
    return this.sessions.delete(token);
  }

  createApiKey(userId: string, name: string): { keyRecord: ApiKeyRecord; rawKey: string } {
    const user = this.getUser(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    const { rawKey, keyPrefix, keyHash } = generateApiKey();
    const id = `key-${crypto.randomUUID().slice(0, 8)}`;
    const keyRecord: ApiKeyRecord = {
      id,
      name,
      keyHash,
      keyPrefix,
      userId: user.id,
      role: user.role,
      permissions: user.permissions,
      createdAt: new Date().toISOString(),
      revoked: false,
    };

    this.apiKeys.set(id, keyRecord);
    this.persistIfConfigured();
    return { keyRecord, rawKey };
  }

  validateApiKey(rawKey: string): ApiKeyRecord | null {
    const keyHash = hashApiKey(rawKey);
    const key = Array.from(this.apiKeys.values()).find(k => k.keyHash === keyHash && !k.revoked);
    if (!key) return null;

    const user = this.getUser(key.userId);
    if (!user || user.status === "suspended") return null;

    key.role = user.role;
    key.permissions = user.permissions;
    key.lastUsedAt = new Date().toISOString();
    return key;
  }

  revokeApiKey(keyId: string): boolean {
    const key = this.apiKeys.get(keyId);
    if (!key) return false;
    key.revoked = true;
    this.persistIfConfigured();
    return true;
  }

  listApiKeys(userId?: string): ApiKeyRecord[] {
    const all = Array.from(this.apiKeys.values());
    if (userId) return all.filter(k => k.userId === userId);
    return all;
  }

  findUserByExternalId(provider: string, externalUserId: string): AgentForgeUser | undefined {
    return Array.from(this.users.values()).find(u =>
      u.externalIdentities.some(e => e.provider === provider && e.externalUserId === externalUserId)
    );
  }

  linkExternalIdentity(userId: string, identity: ExternalIdentity): AgentForgeUser {
    const user = this.getUser(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    const existingOwner = this.findUserByExternalId(identity.provider, identity.externalUserId);
    if (existingOwner && existingOwner.id !== userId) {
      throw new Error(`This ${identity.provider} identity is already linked to another workspace user`);
    }

    const linked = user.externalIdentities.find(item =>
      item.provider === identity.provider && item.externalUserId === identity.externalUserId
    );
    if (linked) {
      linked.externalUsername = identity.externalUsername;
      linked.linkedAt = identity.linkedAt;
    } else {
      user.externalIdentities.push(identity);
    }
    user.updatedAt = identity.linkedAt;
    this.emit("user_identity_linked", "user", user);
    return user;
  }

  // --- Unified Inbox (Section 16: Deterministic Actionable Aggregation) ---
  getUnifiedInbox(): UnifiedInboxItem[] {
    const items: UnifiedInboxItem[] = [];

    // 1. Pending Approvals (Critical / Actionable)
    for (const app of this.approvals.values()) {
      if (app.status === "pending") {
        items.push({
          id: `inbox-app-${app.id}`,
          type: "approval_needed",
          title: `Approval Required: ${app.action}`,
          description: `Task ${app.taskId} requires sign-off. Risk: ${app.risk}. ${app.description}`,
          severity: app.risk === "high" || app.risk === "critical" ? "critical" : "warning",
          sourceId: app.id,
          timestamp: app.createdAt,
          actionable: true,
          actionUrl: `/approvals?id=${app.id}`,
          metadata: { taskId: app.taskId, risk: app.risk },
        });
      }
    }

    // 2. Failed & Completed Tasks
    for (const task of this.tasks.values()) {
      if (task.status === "failed") {
        items.push({
          id: `inbox-task-${task.id}`,
          type: "task_failed",
          title: `Task Failed: ${task.title}`,
          description: `Task ${task.id} failed execution. Inspect logs or retry with fresh worktree.`,
          severity: "critical",
          sourceId: task.id,
          timestamp: task.updatedAt,
          actionable: true,
          actionUrl: `/tasks?id=${task.id}`,
          metadata: { assignedAgentId: task.assignedAgentId },
        });
      } else if (task.status === "completed") {
        items.push({
          id: `inbox-task-comp-${task.id}`,
          type: "task_completed",
          title: `Task Completed: ${task.title}`,
          description: `Task ${task.id} completed. Evidence pack is ready for verification.`,
          severity: "info",
          sourceId: task.id,
          timestamp: task.updatedAt,
          actionable: false,
          actionUrl: `/tasks?id=${task.id}`,
        });
      }
    }

    // 3. Voice Call Events
    for (const call of this.calls.values()) {
      if (call.status === "FAILED") {
        const recipient = call.participants.find(participant => participant.role === "caller" || participant.role === "transferee");
        const recipientPhone = recipient?.phoneNumber ?? "unknown number";
        items.push({
          id: `inbox-call-${call.id}`,
          type: "voice_event",
          title: `Voice Call Failed to ${recipientPhone}`,
          description: `Call to ${recipient?.name || recipientPhone} failed during telephony session.`,
          severity: "warning",
          sourceId: call.id,
          timestamp: call.startedAt,
          actionable: true,
        });
      }
    }

    // 4. Security & Audit Warnings
    for (const audit of this.auditEntries) {
      if (audit.action.includes("rejected") || audit.action.includes("failed")) {
        items.push({
          id: `inbox-audit-${audit.id}`,
          type: "system_warning",
          title: `Security Alert: ${audit.action}`,
          description: `Actor ${audit.actorId} attempted ${audit.action} on ${audit.targetType} [${audit.targetId}].`,
          severity: "warning",
          sourceId: audit.id,
          timestamp: audit.timestamp,
          actionable: false,
          metadata: audit.details,
        });
      }
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // --- Persistence ---
  private persistIfConfigured(): void {
    if (this.persistFilePath && !this.restoring) this.saveToFile(this.persistFilePath);
  }

  saveToFile(filePath = this.persistFilePath): void {
    if (!filePath) throw new Error("A workspace persistence path is required.");
    this.writeSnapshot(filePath, true);
  }

  private writeSnapshot(filePath: string, rotateBackup: boolean): void {
    const data: PersistedWorkspaceSnapshot = {
      schemaVersion: WORKSPACE_SNAPSHOT_SCHEMA_VERSION,
      workspaces: Array.from(this.workspaces.values()),
      spaces: Array.from(this.spaces.values()),
      channels: Array.from(this.channels.values()),
      threads: Array.from(this.threads.values()),
      messages: Array.from(this.messages.entries()),
      users: Array.from(this.users.values()),
      agents: Array.from(this.agents.values()),
      tasks: Array.from(this.tasks.values()),
      approvals: Array.from(this.approvals.values()),
      processes: Array.from(this.processes.values()),
      processRevisionHistory: Array.from(this.processRevisionHistory.entries()),
      processRevisionProposals: Array.from(this.processRevisionProposals.values()),
      processAgentBindings: Array.from(this.processAgentBindings.values()),
      calls: Array.from(this.calls.values()),
      packages: Array.from(this.packages.values()),
      installations: Array.from(this.installations.values()),
      benchmarkResults: this.benchmarkResults,
      qualityBaselines: this.qualityBaselines,
      qualityAnalyses: this.qualityAnalyses,
      qualityCorrections: this.qualityCorrections,
      auditEntries: this.auditEntries,
      auditPrunedCheckpoint: this.auditPrunedCheckpoint ? { ...this.auditPrunedCheckpoint } : undefined,
      operationalMemories: Array.from(this.operationalMemories.values()),
      apiKeys: Array.from(this.apiKeys.values()),
      eventLedger: this.eventLedger.getAllEntries(),
      externalBindings: this.eventLedger.getAllBindings(),
    };
    const json = JSON.stringify(data, null, 2);
    const tempPath = `${filePath}.tmp.${process.pid}.${crypto.randomUUID()}`;
    const backupPath = `${filePath}.bak`;
    const lockPath = `${filePath}.lock`;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    let lockFd: number | undefined;
    try {
      // Serialize writers across launcher processes. The snapshot rename is
      // atomic, but without this lock two valid snapshots could race and one
      // writer could silently overwrite the other's state. A stale lock is
      // recoverable after a bounded lease so a crashed writer cannot wedge the store.
      const waitBuffer = new Int32Array(new SharedArrayBuffer(4));
      // Snapshot writes can overlap during startup and crash-recovery. Allow a
      // bounded handoff window long enough for the active writer to finish,
      // while still failing instead of waiting forever on a broken lock.
      for (let attempt = 0; attempt < 2000; attempt += 1) {
        try {
          lockFd = fs.openSync(lockPath, "wx");
          fs.writeSync(lockFd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
          try {
            const ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
            let ownerAlive = true;
            try {
              const lock = JSON.parse(fs.readFileSync(lockPath, "utf8")) as { pid?: unknown };
              if (typeof lock.pid === "number" && lock.pid !== process.pid) {
                try { process.kill(lock.pid, 0); } catch { ownerAlive = false; }
              }
            } catch {
              // A partially written lock is safe to recover once it is old.
            }
            if (!ownerAlive || ageMs > 30_000) fs.unlinkSync(lockPath);
          } catch {
            // The competing writer may have released the lock between calls.
          }
          Atomics.wait(waitBuffer, 0, 0, 10);
        }
      }
      if (lockFd === undefined) throw new Error("Timed out waiting for the workspace snapshot lock.");
      fs.writeFileSync(tempPath, json, { encoding: "utf-8", flag: "wx" });
      if (rotateBackup && fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
      }
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {
        // Preserve the original write error.
      }
      throw error;
    } finally {
      if (lockFd !== undefined) {
        try { fs.closeSync(lockFd); } catch { /* preserve the write result */ }
        try { fs.unlinkSync(lockPath); } catch { /* another recovery path may have removed it */ }
      }
    }
  }

  loadFromFile(filePath: string): "primary" | "backup" {
    const candidates = [
      { path: filePath, source: "primary" as const },
      { path: `${filePath}.bak`, source: "backup" as const },
    ];
    const errors: string[] = [];
    for (const candidate of candidates) {
      if (!fs.existsSync(candidate.path)) continue;
      try {
        const parsed: unknown = JSON.parse(fs.readFileSync(candidate.path, "utf-8"));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Snapshot root must be an object.");
        }
        this.restoreSnapshot(parsed as Partial<PersistedWorkspaceSnapshot> & Record<string, unknown>);
        return candidate.source;
      } catch (error) {
        errors.push(`${candidate.source}: ${redactRuntimeError(error)}`);
      }
    }
    throw new Error(`Unable to load workspace snapshot. ${errors.join("; ") || "No snapshot or backup exists."}`);
  }

  private restoreSnapshot(data: Partial<PersistedWorkspaceSnapshot> & Record<string, unknown>): void {
    if (data.schemaVersion !== undefined && data.schemaVersion !== 1 && data.schemaVersion !== 2 && data.schemaVersion !== 3 && data.schemaVersion !== 4 && data.schemaVersion !== 5 && data.schemaVersion !== 6 && data.schemaVersion !== 7) {
      throw new Error(`Unsupported snapshot schema version '${String(data.schemaVersion)}'.`);
    }
    if (data.schemaVersion === 1 || data.schemaVersion === 2 || data.schemaVersion === 3 || data.schemaVersion === 4 || data.schemaVersion === 5 || data.schemaVersion === 6 || data.schemaVersion === 7) {
      const requiredV1: Array<keyof PersistedWorkspaceSnapshot> = [
        "workspaces", "spaces", "channels", "threads", "messages", "users", "agents", "tasks",
        "approvals", "processes", "calls", "packages", "installations", "benchmarkResults",
        "auditEntries", "eventLedger", "externalBindings",
      ];
      const required: Array<keyof PersistedWorkspaceSnapshot> = data.schemaVersion === 1
        ? requiredV1
        : [...requiredV1, "operationalMemories", ...(data.schemaVersion >= 3 ? ["processRevisionHistory" as const] : []), ...(data.schemaVersion >= 4 ? ["processRevisionProposals" as const] : []), ...(data.schemaVersion >= 5 ? ["processAgentBindings" as const] : []), ...(data.schemaVersion >= 6 ? ["qualityBaselines" as const, "qualityAnalyses" as const] : []), ...(data.schemaVersion >= 7 ? ["qualityCorrections" as const] : [])];
      const missing = required.filter(key => data[key] === undefined);
      if (missing.length) throw new Error(`Snapshot is missing required collections: ${missing.join(", ")}.`);
    }
    this.loadedLegacySnapshot = data.schemaVersion === 1 || data.schemaVersion === 2 || data.schemaVersion === 3 || data.schemaVersion === 4 || data.schemaVersion === 5 || data.schemaVersion === 6;
    const readArray = <T>(key: keyof PersistedWorkspaceSnapshot): T[] => {
      const value = data[key];
      if (value === undefined) return [];
      if (!Array.isArray(value)) throw new Error(`Snapshot collection '${String(key)}' must be an array.`);
      if (value.some(record => !record || typeof record !== "object" || Array.isArray(record))) {
        throw new Error(`Snapshot collection '${String(key)}' contains a non-object record.`);
      }
      return value as T[];
    };
    const readMessages = (): Array<[string, CanonicalMessage[]]> => {
      const value = data.messages;
      if (value === undefined) return [];
      if (!Array.isArray(value) || value.some(item => !Array.isArray(item) || typeof item[0] !== "string" || !Array.isArray(item[1]))) {
        throw new Error("Snapshot messages must be [channelId, messages] pairs.");
      }
      if (value.some(([, channelMessages]) => channelMessages.some(message => !message || typeof message !== "object" || Array.isArray(message) || typeof message.id !== "string"))) {
        throw new Error("Snapshot messages contain an invalid message record.");
      }
      return value as Array<[string, CanonicalMessage[]]>;
    };
    const readRecords = <T extends { id: string }>(key: keyof PersistedWorkspaceSnapshot): T[] => {
      const records = readArray<T>(key);
      if (records.some(record => !record || typeof record.id !== "string")) {
        throw new Error(`Snapshot collection '${String(key)}' contains an invalid record.`);
      }
      return records;
    };

    // Parse and validate every collection first. A bad snapshot must not partially mutate the live store.
    const workspaces = readRecords<CanonicalWorkspace>("workspaces");
    const spaces = readRecords<CanonicalSpace>("spaces");
    const channels = readRecords<CanonicalChannel>("channels");
    const threads = readRecords<CanonicalThread>("threads");
    const messages = readMessages();
    const users = readRecords<AgentForgeUser>("users");
    const agents = readRecords<AgentTeammate>("agents");
    const tasks = readRecords<Task>("tasks");
    const approvals = readRecords<ApprovalRequest>("approvals");
    const processes = readRecords<ProcessDefinition>("processes");
    const processRevisionHistory = data.processRevisionHistory === undefined
      ? []
      : data.processRevisionHistory;
    if (!Array.isArray(processRevisionHistory) || processRevisionHistory.some(entry =>
      !Array.isArray(entry)
      || typeof entry[0] !== "string"
      || !Array.isArray(entry[1])
      || entry[1].some(revision => !revision || typeof revision !== "object" || revision.id !== entry[0] || !Number.isSafeInteger(revision.version)),
    )) {
      throw new Error("Snapshot process revision history is invalid.");
    }
    const processRevisionProposals = readRecords<ProcessRevisionProposal>("processRevisionProposals");
    if (processRevisionProposals.some(proposal =>
      typeof proposal.processId !== "string"
      || !Number.isSafeInteger(proposal.expectedVersion)
      || !proposal.revision || proposal.revision.id !== proposal.processId
      || !["pending", "approved", "rejected", "stale"].includes(proposal.status),
    )) {
      throw new Error("Snapshot process revision proposals are invalid.");
    }
    const processAgentBindings = readArray<ProcessAgentBinding>("processAgentBindings");
    const bindingKeys = new Set<string>();
    if (processAgentBindings.some(binding => {
      if (typeof binding.processId !== "string" || !binding.processId
        || typeof binding.agentId !== "string" || !binding.agentId
        || !processes.some(process => process.id === binding.processId)
        || !agents.some(agent => agent.id === binding.agentId)
        || typeof binding.assignedRole !== "string" || !binding.assignedRole.trim() || binding.assignedRole.length > 120
        || typeof binding.boundAt !== "string" || !Number.isFinite(Date.parse(binding.boundAt))) return true;
      const key = `${binding.processId}:${binding.agentId}`;
      if (bindingKeys.has(key)) return true;
      bindingKeys.add(key);
      return false;
    })) {
      throw new Error("Snapshot process-agent bindings are invalid.");
    }
    const calls = readRecords<Call>("calls");
    const packages = readArray<PackageManifest>("packages");
    if (packages.some(item => !item || typeof item.name !== "string")) throw new Error("Snapshot contains an invalid package record.");
    const installations = readArray<PackageInstallation>("installations");
    if (installations.some(item => !item || typeof item.packageId !== "string")) throw new Error("Snapshot contains an invalid installation record.");
    const benchmarkResults = readArray<BenchmarkResult>("benchmarkResults");
    const auditEntries = readArray<AuditEntry>("auditEntries");
    const qualityBaselines = readArray<QualityBaseline>("qualityBaselines");
    const qualityAnalyses = readArray<QualityAnalysis>("qualityAnalyses");
    const qualityCorrections = readArray<CorrectionProposal>("qualityCorrections");
    const operationalMemories = readRecords<OperationalMemoryRecord>("operationalMemories");
    const eventEntries = readRecords<ReturnType<EventLedger["getAllEntries"]>[number]>("eventLedger");
    const bindings = readRecords<ReturnType<EventLedger["getAllBindings"]>[number]>("externalBindings");

    this.restoring = true;
    try {
      if (data.schemaVersion === 1 || data.schemaVersion === 2 || data.schemaVersion === 3 || data.schemaVersion === 4 || data.schemaVersion === 5 || data.schemaVersion === 6 || data.schemaVersion === 7) {
        this.workspaces.clear();
        this.spaces.clear();
        this.channels.clear();
        this.threads.clear();
        this.messages.clear();
        this.users.clear();
        this.agents.clear();
        this.tasks.clear();
        this.approvals.clear();
        this.processes.clear();
        this.processRevisionHistory.clear();
        this.processRevisionProposals.clear();
        this.processAgentBindings.clear();
        this.calls.clear();
        this.packages.clear();
        this.installations.clear();
        this.operationalMemories.clear();
        this.apiKeys.clear();
      }
      for (const item of workspaces) this.workspaces.set(item.id, item);
      for (const item of spaces) this.spaces.set(item.id, item);
      for (const item of channels) this.channels.set(item.id, item);
      for (const item of threads) this.threads.set(item.id, item);
      for (const [channelId, channelMessages] of messages) this.messages.set(channelId, channelMessages);
      for (const item of users) this.users.set(item.id, item);
      for (const item of agents) this.agents.set(item.id, item);
      for (const item of tasks) this.tasks.set(item.id, item);
      for (const item of approvals) this.approvals.set(item.id, item);
      for (const item of processes) this.processes.set(item.id, item);
      for (const [processId, revisions] of processRevisionHistory as Array<[string, ProcessDefinition[]]>) {
        this.processRevisionHistory.set(processId, revisions);
      }
      for (const proposal of processRevisionProposals) this.processRevisionProposals.set(proposal.id, proposal);
      for (const binding of processAgentBindings) this.processAgentBindings.set(`${binding.processId}:${binding.agentId}`, binding);
      for (const item of calls) this.calls.set(item.id, item);
      for (const item of packages) this.packages.set(item.name, item);
      for (const item of installations) this.installations.set(item.packageId, item);
      this.benchmarkResults = benchmarkResults;
      this.qualityBaselines = qualityBaselines;
      this.qualityAnalyses = qualityAnalyses;
      this.qualityCorrections = qualityCorrections;
      if (data.auditPrunedCheckpoint && typeof data.auditPrunedCheckpoint === "object") {
        this.auditPrunedCheckpoint = {
          prunedCount: Number(data.auditPrunedCheckpoint.prunedCount) || 0,
          lastPrunedHash: String(data.auditPrunedCheckpoint.lastPrunedHash || ""),
          timestamp: String(data.auditPrunedCheckpoint.timestamp || new Date().toISOString()),
        };
      } else {
        this.auditPrunedCheckpoint = undefined;
      }
      this.auditEntries = auditEntries;
      let prevHash = this.auditPrunedCheckpoint?.lastPrunedHash || GENESIS_AUDIT_HASH;
      for (const entry of this.auditEntries) {
        if (!entry.previousHash) {
          entry.previousHash = prevHash;
        }
        if (!entry.hash) {
          entry.hash = computeAuditHash(entry);
        }
        prevHash = entry.hash;
      }
      for (const record of operationalMemories) this.operationalMemories.set(record.id, record);
      if (Array.isArray(data.apiKeys)) {
        for (const item of data.apiKeys) {
          if (item && typeof item === "object" && typeof item.id === "string") {
            this.apiKeys.set(item.id, item);
          }
        }
      }
      this.eventLedger.restore(eventEntries, bindings);
    } finally {
      this.restoring = false;
    }
  }
}

export function getDefaultWorkspaceFilePath(): string {
  const dataRoot = process.env.AGENTFORGE_DATA_DIR ||
    path.join(process.env.LOCALAPPDATA || os.homedir(), ".agentforge");
  return path.join(dataRoot, "workspace.json");
}

// Test and embedded callers get an isolated in-memory store unless they opt into persistence.
export const globalStore = new WorkspaceStore();
