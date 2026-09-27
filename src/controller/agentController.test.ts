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
