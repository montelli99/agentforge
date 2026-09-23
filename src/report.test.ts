import { describe, expect, it } from "vitest";
import { formatReport } from "./report.js";

describe("lab report evidence boundary", () => {
  it("states that scenario passes do not prove live provider or production behavior", () => {
    const report = formatReport({
      generatedAt: "2026-09-22T00:00:00.000Z",
      passed: true,
      total: 0,
      failed: 0,
      results: [],
    });

    expect(report).toContain("local deterministic lab scenarios");
    expect(report).toContain("not evidence of a live provider");
    expect(report).toContain("production security");
  });
});
