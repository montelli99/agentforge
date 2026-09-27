import { describe, expect, it } from "vitest";
import { workspaceTheme } from "./workspaceTheme.js";

describe("workspace visual contract", () => {
  it("uses the shared graphite, lavender, mint, blue, and amber product palette", () => {
    expect(workspaceTheme).toContain("--bg-void:#121315");
    expect(workspaceTheme).toContain("--accent:#c4b5fd");
    expect(workspaceTheme).toContain("--green:#7cd4af");
    expect(workspaceTheme).toContain("--amber:#e9bc77");
    expect(workspaceTheme).toContain("--red:#ed939f");
  });

  it("does not reintroduce the retired pink marketing palette", () => {
    expect(workspaceTheme).not.toMatch(/#ec4899|#a855f7|#f43f5e|gradient-accent/i);
  });

  it("reserves the rose token for failure, cancellation, and error states", () => {
    const roseUses = [...workspaceTheme.matchAll(/[^{}]+\{[^{}]*#ed939f[^{}]*\}/g)].map(match => match[0]);
    expect(roseUses.length).toBeGreaterThan(0);
    for (const use of roseUses) {
      expect(use).toMatch(/red|failed|cancelled|cancel|notice|critical|error|danger/i);
    }
  });
});