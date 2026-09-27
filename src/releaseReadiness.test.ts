import { describe, expect, it } from "vitest";
import { buildReleaseReadiness } from "./releaseReadiness.js";

describe("release readiness", () => {
  it("aggregates provider and execution blockers without hiding them", () => {
    const report = buildReleaseReadiness([
      { providerId: "ready", name: "Ready", category: "decision", readiness: "REAL_INTEGRATION", summary: "", productionReady: true, notes: "" },
      { providerId: "missing", name: "Missing", category: "channel", readiness: "NOT_CONFIGURED", summary: "", productionReady: false, notes: "" },
    ], {
      ready: false,
      blockers: ["Docker is unavailable."],
      capabilities: { modelPlanning: true, isolatedCompute: false, realVerification: false, evidenceCollection: false },
    });
    expect(report.ready).toBe(false);
    expect(report.providers).toEqual({ total: 2, productionReady: 1, notReady: ["missing"] });
    expect(report.blockers).toEqual(["Provider is not release-ready: missing", "Docker is unavailable."]);
  });
});
