import { describe, expect, it } from "vitest";
import { buildContextPacket } from "./contextPacket.js";

describe("context packets", () => {
  it("deduplicates and preserves source provenance", () => {
    const packet = buildContextPacket([
      { id: "goal-1", kind: "goal", text: "Research and review the release." },
      { id: "memory-1", kind: "memory", text: "Keep execution approval-gated." },
      { id: "memory-1", kind: "memory", text: "Keep execution approval-gated." },
    ]);
    expect(packet.sources).toHaveLength(3);
    expect(packet.content).toContain("goal:goal-1");
    expect(packet.content).toContain("memory:memory-1");
    expect(packet.packedTokens).toBeLessThanOrEqual(packet.originalTokens);
    expect(packet.truncated).toBe(false);
  });

  it("enforces the exact token budget even when the marker itself must shrink", () => {
    const packet = buildContextPacket([
      { id: "long", kind: "memory", text: "x".repeat(4_000) },
    ], 5);

    expect(packet.truncated).toBe(true);
    expect(packet.packedTokens).toBeLessThanOrEqual(5);
  });

  it("rejects an invalid packet budget instead of creating an unbounded handoff", () => {
    expect(() => buildContextPacket([], 0)).toThrow("positive integer");
  });
});
