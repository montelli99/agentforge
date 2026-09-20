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
import path from "node:path";
import type {
  CanonicalWorkspace,
  CanonicalSpace,
  CanonicalChannel,
  CanonicalThread,
  CanonicalMessage,
} from "../types/workspace.js";
import type { AgentTeammate } from "../types/agent.js";
import type { Task, TaskStatus } from "../types/task.js";
import type { ApprovalRequest } from "../types/approval.js";
import type { ProcessDefinition } from "../types/process.js";
import type { Call } from "../types/voice.js";
import type { PackageManifest, PackageInstallation } from "../types/package.js";
import type { BenchmarkResult } from "../types/benchmark.js";
import type { AuditEntry } from "../types/audit.js";
import type { AgentForgeUser } from "../types/identity.js";
import { EventLedger } from "../ledger/eventLedger.js";

export type RealtimeListener = (event: { type: string; entity: string; data: unknown }) => void;

export class WorkspaceStore {
  // Canonical Maps
  private workspaces = new Map<string, CanonicalWorkspace>();
  private spaces = new Map<string, CanonicalSpace>();
  private channels = new Map<string, CanonicalChannel>();
  private threads = new Map<string, CanonicalThread>();
  private messages = new Map<string, CanonicalMessage[]>(); // key: channelId
  private users = new Map<string, AgentForgeUser>();
  private agents = new Map<string, AgentTeammate>();
  private tasks = new Map<string, Task>();
  private approvals = new Map<string, ApprovalRequest>();
  private processes = new Map<string, ProcessDefinition>();
  private calls = new Map<string, Call>();
  private packages = new Map<string, PackageManifest>();
  private installations = new Map<string, PackageInstallation>();
  private benchmarkResults: BenchmarkResult[] = [];
  private auditEntries: AuditEntry[] = [];

  readonly eventLedger = new EventLedger();
  private realtimeListeners: RealtimeListener[] = [];

  constructor(private readonly persistFilePath?: string) {
    this.seedDefaultWorkspace();
    if (persistFilePath && fs.existsSync(persistFilePath)) {
      this.loadFromFile(persistFilePath);
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
    for (const listener of this.realtimeListeners) {
      try {
        listener(payload);
      } catch {
        // Prevent listener failures from breaking store operations
      }
    }
  }

  // --- Seed Initial Default Workspace ---
  private seedDefaultWorkspace(): void {
    const defaultWs: CanonicalWorkspace = {
      id: "ws-default",
      name: "AgentForge Workspace",
      description: "Canonical AI Workforce Platform Control Plane",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workspaces.set(defaultWs.id, defaultWs);

    // Native Space
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

    // Default Owner User
    const ownerUser: AgentForgeUser = {
      id: "user-montelli",
      username: "montelli",
      displayName: "Montelli",
      role: "owner",
      permissions: ["*"],
      externalIdentities: [
        { provider: "telegram", externalUserId: "12345678", linkedAt: new Date().toISOString() },
        { provider: "discord", externalUserId: "87654321", linkedAt: new Date().toISOString() },
      ],
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

  createSpace(params: Omit<CanonicalSpace, "id" | "createdAt" | "updatedAt">): CanonicalSpace {
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

  listSpaces(workspaceId = "ws-default"): CanonicalSpace[] {
    return Array.from(this.spaces.values()).filter(s => s.workspaceId === workspaceId);
  }

  // --- Channels & Mirroring ---
  createChannel(params: Omit<CanonicalChannel, "id" | "createdAt" | "updatedAt">): CanonicalChannel {
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

  findMirroredChannel(provider: "telegram" | "discord", externalId: string): CanonicalChannel | undefined {
    return Array.from(this.channels.values()).find(
      c => c.provider === provider && c.externalId === externalId
    );
  }

  // --- Messages & Threads ---
  createMessage(params: Omit<CanonicalMessage, "id" | "createdAt" | "updatedAt">): CanonicalMessage {
    const id = `msg-${crypto.randomUUID().slice(0, 8)}`;
    const msg: CanonicalMessage = {
      ...params,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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
  createAgent(agent: Omit<AgentTeammate, "createdAt" | "updatedAt">): AgentTeammate {
    const fullAgent: AgentTeammate = {
      ...agent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.agents.set(agent.id, fullAgent);
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

  // --- Tasks ---
  createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
    const id = `AF-${Math.floor(100 + Math.random() * 900)}`;
    const fullTask: Task = {
      ...task,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, fullTask);
    this.emit("task_created", "task", fullTask);
    return fullTask;
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
  createApproval(approval: Omit<ApprovalRequest, "id" | "status" | "createdAt">): ApprovalRequest {
    const id = `appr-${crypto.randomUUID().slice(0, 8)}`;
    const fullApproval: ApprovalRequest = {
      ...approval,
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
    appr.status = params.status;
    appr.approverUserId = params.approverUserId;
    appr.decisionOrigin = params.decisionOrigin;
    appr.decisionNotes = params.decisionNotes;
    appr.decidedAt = new Date().toISOString();
    this.emit("approval_resolved", "approval", appr);
    return appr;
  }

  listApprovals(status?: ApprovalRequest["status"]): ApprovalRequest[] {
    const all = Array.from(this.approvals.values());
    return status ? all.filter(a => a.status === status) : all;
  }

  // --- Processes ---
  createProcess(process: ProcessDefinition): ProcessDefinition {
    this.processes.set(process.id, process);
    this.emit("process_created", "process", process);
    return process;
  }

  getProcess(id: string): ProcessDefinition | undefined {
    return this.processes.get(id);
  }

  listProcesses(): ProcessDefinition[] {
    return Array.from(this.processes.values());
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

  // --- Audit ---
  recordAudit(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
    const fullEntry: AuditEntry = {
      ...entry,
      id: `audit-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditEntries.push(fullEntry);
    this.emit("audit_entry", "audit", fullEntry);
    return fullEntry;
  }

  listAuditEntries(limit = 100): AuditEntry[] {
    return this.auditEntries.slice(-limit);
  }

  // --- Users & RBAC ---
  getUser(id: string): AgentForgeUser | undefined {
    return this.users.get(id);
  }

  findUserByExternalId(provider: string, externalUserId: string): AgentForgeUser | undefined {
    return Array.from(this.users.values()).find(u =>
      u.externalIdentities.some(e => e.provider === provider && e.externalUserId === externalUserId)
    );
  }

  // --- Persistence ---
  saveToFile(filePath: string): void {
    const data = {
      workspaces: Array.from(this.workspaces.values()),
      spaces: Array.from(this.spaces.values()),
      channels: Array.from(this.channels.values()),
      agents: Array.from(this.agents.values()),
      tasks: Array.from(this.tasks.values()),
      approvals: Array.from(this.approvals.values()),
      processes: Array.from(this.processes.values()),
      calls: Array.from(this.calls.values()),
      packages: Array.from(this.packages.values()),
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  loadFromFile(filePath: string): void {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      data.workspaces?.forEach((w: CanonicalWorkspace) => this.workspaces.set(w.id, w));
      data.spaces?.forEach((s: CanonicalSpace) => this.spaces.set(s.id, s));
      data.channels?.forEach((c: CanonicalChannel) => this.channels.set(c.id, c));
      data.agents?.forEach((a: AgentTeammate) => this.agents.set(a.id, a));
      data.tasks?.forEach((t: Task) => this.tasks.set(t.id, t));
      data.approvals?.forEach((ap: ApprovalRequest) => this.approvals.set(ap.id, ap));
      data.processes?.forEach((p: ProcessDefinition) => this.processes.set(p.id, p));
      data.calls?.forEach((cl: Call) => this.calls.set(cl.id, cl));
      data.packages?.forEach((pkg: PackageManifest) => this.packages.set(pkg.name, pkg));
    } catch {
      // Ignore corrupt or incomplete file in development
    }
  }
}

// Global Singleton Instance
export const globalStore = new WorkspaceStore();
