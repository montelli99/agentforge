import { describe, expect, it } from "vitest";
import { OperationalMemoryProvider } from "./operationalMemory.js";

describe("OperationalMemoryProvider", () => {
  it("keeps project-scoped retrieval isolated while retaining shared rules", async () => {
    const memory = new OperationalMemoryProvider();
    const globalRule = await memory.record({
      namespace: "workspace",
      category: "do_not_repeat",
      title: "Workspace rule",
      content: "An explicitly shared rule is available in project lookups.",
      tags: ["safety"],
    });
    const projectRule = await memory.record({
      namespace: "workspace",
      category: "do_not_repeat",
      title: "Project alpha rule",
      content: "Keep alpha project evidence isolated.",
      tags: ["safety", "alpha"],
      projectId: "alpha",
    });
    const betaRule = await memory.record({
      namespace: "workspace",
      category: "repo_history",
      title: "Project beta history",
      content: "This belongs to a different project.",
      tags: ["beta"],
      projectId: "beta",
    });

    const scoped = await memory.query({
      namespace: "workspace",
      categories: ["do_not_repeat"],
      projectId: "alpha",
      tags: ["safety"],
    });
    expect(scoped.map(result => result.record.id)).toEqual([globalRule.id, projectRule.id]);
    expect(scoped.map(result => result.record.id)).not.toContain(betaRule.id);
    expect(await memory.getDoNotRepeatRules("workspace", "alpha")).toEqual([globalRule, projectRule]);
    expect(await memory.delete("workspace", projectRule.id)).toBe(true);
    expect(await memory.delete("workspace", projectRule.id)).toBe(false);
  });

  it("ranks title and content term matches ahead of weaker matches", async () => {
    const memory = new OperationalMemoryProvider();
    const weak = await memory.record({ namespace: "workspace", category: "general_fact", title: "Operating note", content: "Keep the process visible.", tags: [] });
    const strong = await memory.record({ namespace: "workspace", category: "general_fact", title: "Docker execution failure", content: "Docker execution failed because the daemon was unavailable.", tags: ["docker"] });
    const results = await memory.query({ namespace: "workspace", queryText: "docker execution", limit: 2 });
    expect(results[0]?.record.id).toBe(strong.id);
    expect(results.map(result => result.record.id)).not.toContain(weak.id);
  });
});
