import crypto from "node:crypto";
import type { WorkspaceStore } from "./core/store/workspaceStore.js";
import type { TaskWorkerRuntime } from "./core/runtime/taskWorkerRuntime.js";

export type TeamRunStatus = "planned" | "awaiting_execution" | "completed" | "blocked";
export type TeamHandoffStatus = "queued" | "accepted" | "returned" | "blocked";

export interface TeamHandoff {
  id: string;
  runId: string;
  fromAgentId: string;
  toAgentId: string;
  instruction: string;
  status: TeamHandoffStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TeamRun {
  id: string;
  taskId: string;
  channelId: string;
  threadId: string;
  leadAgentId: string;
  specialistAgentIds: string[];
  objective: string;
  status: TeamRunStatus;
  handoffs: TeamHandoff[];
  createdAt: string;
}

export interface StartTeamRunInput {
  title: string;
  objective: string;
  leadAgentId: string;
  specialistAgentIds: string[];
  projectId?: string;
}

/**
 * Provider-neutral team coordination boundary.
 *
 * This creates the durable team record, work item, and agent-only conversation,
 * but never starts a model, tool, browser, or external runtime by itself.
 * A connected worker may consume the queued task later through the governed
 * execution path and its normal approval/evidence gates.
 */
export class TeamCoordinator {
  constructor(private readonly store: WorkspaceStore) {}

  startRun(input: StartTeamRunInput): TeamRun {
    const title = input.title.trim();
    const objective = input.objective.trim();
    if (!title || title.length > 180 || !objective || objective.length > 8000) {
      throw new Error("Team title and objective are required and bounded.");
    }
    const roster = [...new Set([input.leadAgentId, ...input.specialistAgentIds])].filter(Boolean);
    if (!input.leadAgentId || roster.length < 2) throw new Error("A team needs a lead and at least one specialist.");
    for (const id of roster) if (!this.store.getAgent(id)) throw new Error(`Team agent ${id} was not found.`);

    const space = this.store.listSpaces("ws-default")[0];
    if (!space) throw new Error("A workspace space is required before starting a team.");
    const channel = this.store.createChannel({
      workspaceId: space.workspaceId,
      spaceId: space.id,
      name: `team-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "run"}`,
      topic: "Governed AgentForge team run",
      visibility: "agent_only",
      archived: false,
      provider: "agentforge",
    });
    const thread = this.store.createThread(channel.id, title);
    const task = this.store.createTask({
      title,
      description: objective,
      projectId: input.projectId,
      priority: "medium",
      status: "ready",
      assignedAgentId: input.leadAgentId,
      originChannelId: channel.id,
      originThreadId: thread.id,
    });
    const now = new Date().toISOString();
    const run: TeamRun = {
      id: `team-${crypto.randomUUID().slice(0, 8)}`,
      taskId: task.id,
      channelId: channel.id,
      threadId: thread.id,
      leadAgentId: input.leadAgentId,
      specialistAgentIds: roster.filter(id => id !== input.leadAgentId),
      objective,
      status: "planned",
      handoffs: [],
      createdAt: now,
    };
    this.store.createMessage({
      channelId: channel.id,
      threadId: thread.id,
      authorId: input.leadAgentId,
      authorType: "agent",
      content: `Team run planned: ${objective}`,
    });
    return run;
  }

  queueHandoff(run: TeamRun, fromAgentId: string, toAgentId: string, instruction: string): TeamHandoff {
    const text = instruction.trim();
    if (!text || text.length > 8000) throw new Error("Handoff instruction is required and bounded.");
    const members = new Set([run.leadAgentId, ...run.specialistAgentIds]);
    if (!members.has(fromAgentId) || !members.has(toAgentId) || fromAgentId === toAgentId) {
      throw new Error("Handoff must stay within the team and change agent.");
    }
    const now = new Date().toISOString();
    const handoff: TeamHandoff = { id: `handoff-${crypto.randomUUID().slice(0, 8)}`, runId: run.id, fromAgentId, toAgentId, instruction: text, status: "queued", createdAt: now, updatedAt: now };
    run.handoffs.push(handoff);
    this.store.createMessage({ channelId: run.channelId, threadId: run.threadId, authorId: fromAgentId, authorType: "agent", content: `[handoff:${handoff.id}] To ${toAgentId}: ${text}` });
    return handoff;
  }

  acceptHandoff(run: TeamRun, handoffId: string, agentId: string): TeamHandoff {
    const handoff = run.handoffs.find(item => item.id === handoffId);
    if (!handoff || handoff.toAgentId !== agentId || handoff.status !== "queued") throw new Error("Handoff is not available to this agent.");
    handoff.status = "accepted";
    handoff.updatedAt = new Date().toISOString();
    this.store.createMessage({ channelId: run.channelId, threadId: run.threadId, authorId: agentId, authorType: "agent", content: `[handoff:${handoff.id}] Accepted.` });
    return handoff;
  }

  /** Execute only through the existing governed worker; never creates a bypass. */
  async execute(run: TeamRun, worker: Pick<TaskWorkerRuntime, "isRunning" | "executeTask">): Promise<unknown> {
    if (!worker.isRunning()) {
      run.status = "blocked";
      throw new Error("Team execution is unavailable: no governed worker is connected.");
    }
    const task = this.store.getTask(run.taskId);
    if (!task) throw new Error("Team task is missing from the workspace.");
    if (!task.approvedExecutionPlan && !task.executionRepairs?.length) {
      run.status = "awaiting_execution";
      throw new Error("Team execution requires a reviewed and approved task plan.");
    }
    run.status = "awaiting_execution";
    const result = await worker.executeTask(run.taskId);
    run.status = "completed";
    return result;
  }
}
