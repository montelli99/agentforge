import { describe, expect, it } from "vitest";
import { SemanticMemory, type SemanticEntry, type SemanticMemoryPersistence } from "./semanticMemory.js";

class InMemoryPersistence implements SemanticMemoryPersistence {
  private entries: SemanticEntry[] = [];

  load(): SemanticEntry[] {
    return structuredClone(this.entries);
  }

  save(entries: SemanticEntry[]): void {
    this.entries = structuredClone(entries);
  }
}

const embeddings = {
  dimension: 2,
  async embed(text: string): Promise<number[]> {
    return text.includes("alpha") ? [1, 0] : [0, 1];
  },
};

describe("SemanticMemory persistence boundary", () => {
  it("loads entries after a new instance is created", async () => {
    const persistence = new InMemoryPersistence();
    const firstRun = new SemanticMemory(embeddings, 10, 0.8, persistence);
    await firstRun.store({ prompt: "alpha task", response: "saved answer", tenantId: "tenant-a", modelFamily: "test", tokenCount: 12 });

    const restarted = new SemanticMemory(embeddings, 10, 0.8, persistence);
    const result = await restarted.query({ prompt: "alpha follow-up", tenantId: "tenant-a", modelFamily: "test" });

    expect(result.hit).toBe(true);
    expect(result.entry?.response).toBe("saved answer");
  });

  it("does not return another tenant's persisted entry", async () => {
    const persistence = new InMemoryPersistence();
    const firstRun = new SemanticMemory(embeddings, 10, 0.8, persistence);
    await firstRun.store({ prompt: "alpha task", response: "private answer", tenantId: "tenant-a", modelFamily: "test", tokenCount: 12 });

    const restarted = new SemanticMemory(embeddings, 10, 0.8, persistence);
    const result = await restarted.query({ prompt: "alpha follow-up", tenantId: "tenant-b", modelFamily: "test" });

    expect(result.hit).toBe(false);
    expect(result.entry).toBeUndefined();
  });
});
