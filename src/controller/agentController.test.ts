import { describe, expect, it } from "vitest";
import { AgentForgeController } from "./agentController.js";
import { OperationalMemoryProvider } from "../providers/memory/operationalMemory.js";

describe("AgentForge controller memory handoff", () => {
  it("retrieves bounded relevant operational memory into the context packet", async () => {
    const memory = new OperationalMemoryProvider();
    await memory.record({ namespace: "agentforge-controller", category: "project_constraint", title: "Safety rule", content: "Never execute without explicit approval.", tags: ["safety"] });
    const inspection = await new AgentForgeController(undefined, memory).inspect("execute a task");
    expect(inspection.contextPacket.sources.some(source => source.kind === "memory")).toBe(true);
    expect(inspection.contextPacket.content).toContain("Never execute without explicit approval.");
  });

  it("keeps durable rules alongside topical memories without crossing channel boundaries", async () => {
    const memory = new OperationalMemoryProvider();
    await memory.record({ namespace: "agentforge-controller", category: "do_not_repeat",
      title: "Global safeguard", content: "Never skip the signed manifest.", tags: [] });
    await memory.record({ namespace: "agentforge-controller", projectId: "channel-alpha",
      category: "general_fact", title: "Launch checkpoint", content: "The launch checklist is current.", tags: [] });
    await memory.record({ namespace: "agentforge-controller", projectId: "channel-beta",
      category: "general_fact", title: "Launch private beta", content: "Private beta material.", tags: [] });
    const controller = new AgentForgeController(undefined, memory);
    const scoped = await controller.inspect("Review the launch checklist", { channelId: "channel-alpha" });
    expect(scoped.contextPacket.content).toContain("Never skip the signed manifest.");
    expect(scoped.contextPacket.content).toContain("The launch checklist is current.");
    expect(scoped.contextPacket.content).not.toContain("Private beta material.");
    const global = await controller.inspect("Review the launch checklist");
    expect(global.contextPacket.content).toContain("Never skip the signed manifest.");
    expect(global.contextPacket.content).not.toContain("The launch checklist is current.");
    expect(global.contextPacket.content).not.toContain("Private beta material.");
  });

  it("routes natural-language questions without defaulting every request to setup", async () => {
    const controller = new AgentForgeController();

    await expect(controller.inspect("What remains before launch?")).resolves.toMatchObject({
      intent: "route",
      requiresApproval: false,
      decision: { selectedCandidate: "route" },
    });
    await expect(controller.inspect("Review the current plan")).resolves.toMatchObject({
      intent: "review",
      requiresApproval: false,
      decision: { selectedCandidate: "review" },
    });
    await expect(controller.inspect("Connect the approved channel now")).resolves.toMatchObject({
      intent: "execute",
      requiresApproval: true,
      decision: { selectedCandidate: "execute" },
    });
  });
});
