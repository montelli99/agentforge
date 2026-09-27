import { describe, expect, it } from "vitest";
import { OperationalMemoryProvider } from "./providers/memory/operationalMemory.js";
import { evaluateMemoryProvider } from "./memoryEvaluation.js";

describe("memory evaluation", () => {
  it("measures relevance, isolation, and packet compression", async () => {
    const provider = new OperationalMemoryProvider();
    const relevant = await provider.record({ namespace: "workspace", projectId: "alpha", category: "project_constraint", title: "Docker approval rule", content: "Docker execution requires explicit approval.", tags: ["docker"] });
    const unrelatedProject = await provider.record({ namespace: "workspace", projectId: "beta", category: "general_fact", title: "Docker note", content: "A separate project uses Docker.", tags: ["docker"] });
    const report = await evaluateMemoryProvider(provider, [{
      name: "alpha docker query",
      namespace: "workspace",
      projectId: "alpha",
      queryText: "docker approval",
      expectedIds: [relevant.id],
      forbiddenIds: [unrelatedProject.id],
    }]);
    expect(report.passed).toBe(true);
    expect(report.relevantAtTop).toBe(1);
    expect(report.isolationPassed).toBe(1);
    expect(report.averageSavingsPercent).toBeGreaterThanOrEqual(0);
  });
});
