import { describe, expect, it } from "vitest";
import { TeamCoordinator } from "./teamCoordinator.js";
import { WorkspaceStore } from "./core/store/workspaceStore.js";

const agent = (name: string) => ({ name, role: "specialist", description: name, status: "idle" as const, harnessPolicy: { preferredHarnessId: "native", autoResume: false }, modelPolicy: { preferredTier: 1 as const, preferredModel: "test", preferredProvider: "test", allowCloudFallback: false }, decisionPolicy: { useSystem1Router: true }, computePolicy: { environment: "none" as const }, memoryNamespace: `test/${name}`, tools: [], permissions: [], assignedChannelIds: [] });

describe("TeamCoordinator", () => {
  it("plans a governed lead/specialist run and queues an in-team handoff without executing", () => {
    const store = new WorkspaceStore();
    const lead = store.createAgent(agent("Lead"));
    const specialist = store.createAgent(agent("Researcher"));
    const coordinator = new TeamCoordinator(store);
    const run = coordinator.startRun({ title: "Research", objective: "Prepare a bounded comparison", leadAgentId: lead.id, specialistAgentIds: [specialist.id] });
    expect(run.status).toBe("planned");
    expect(store.getTask(run.taskId)?.status).toBe("ready");
    const handoff = coordinator.queueHandoff(run, lead.id, specialist.id, "Collect the comparison inputs.");
    expect(coordinator.acceptHandoff(run, handoff.id, specialist.id).status).toBe("accepted");
    expect(store.getTask(run.taskId)?.status).toBe("ready");
    expect(store.listMessages(run.channelId)).toHaveLength(3);
  });
});
