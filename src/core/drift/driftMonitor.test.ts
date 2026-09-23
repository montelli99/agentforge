import { describe, it, expect, beforeEach } from "vitest";
import { DriftMonitor } from "./driftMonitor.js";
import { WorkspaceStore } from "../store/workspaceStore.js";

describe("DriftMonitor", () => {
  let store: WorkspaceStore;
  let monitor: DriftMonitor;

  beforeEach(() => {
    store = new WorkspaceStore();
    monitor = new DriftMonitor(store);
  });

  it("establishes baseline on first evaluation run if none exists", () => {
    const analysis = monitor.evaluate({
      runId: "run-1",
      targetId: "model-unseen-target",
      targetType: "model",
      targetVersion: "1.0.0",
      passRatePct: 96.0,
      avgLatencyMs: 420,
      testCaseResults: { "case-1": true, "case-2": true, "case-3": true },
      executedAt: new Date().toISOString(),
    });

    expect(analysis.action).toBe("HEALTHY");
    expect(analysis.passRateDriftPct).toBe(0);
    expect(analysis.regressions).toHaveLength(0);

    const baseline = monitor.getBaseline("model", "model-unseen-target");
    expect(baseline).toBeDefined();
    expect(baseline?.passRatePct).toBe(96.0);
  });

  it("detects minor degradation and flags WARN_CONTAINMENT", () => {
    monitor.registerBaseline({
      id: "base-1",
      targetId: "harness-pi",
      targetType: "harness",
      targetVersion: "1.0.0",
      passRatePct: 95.0,
      avgLatencyMs: 200,
      createdAt: new Date().toISOString(),
      testCaseResults: { "c1": true, "c2": true, "c3": true, "c4": true },
    });

    const analysis = monitor.evaluate({
      runId: "run-candidate-1",
      targetId: "harness-pi",
      targetType: "harness",
      targetVersion: "1.0.1",
      passRatePct: 91.0, // -4% drift
      avgLatencyMs: 270, // +35% latency
      testCaseResults: { "c1": true, "c2": true, "c3": true, "c4": false },
      executedAt: new Date().toISOString(),
    });

    expect(analysis.action).toBe("WARN_CONTAINMENT");
    expect(analysis.passRateDriftPct).toBe(-4.0);
    expect(analysis.regressions).toEqual(["c4"]);
  });

  it("quarantines model when tool misuse or hallucinated claims are detected", () => {
    monitor.registerBaseline({
      id: "base-2",
      targetId: "gpt-4o",
      targetType: "model",
      targetVersion: "2024-08",
      passRatePct: 98.0,
      avgLatencyMs: 350,
      createdAt: new Date().toISOString(),
      testCaseResults: { "t1": true, "t2": true },
    });

    const analysis = monitor.evaluate({
      runId: "run-candidate-2",
      targetId: "gpt-4o",
      targetType: "model",
      targetVersion: "2024-09",
      passRatePct: 98.0,
      avgLatencyMs: 360,
      toolMisuseCount: 2,
      testCaseResults: { "t1": true, "t2": true },
      executedAt: new Date().toISOString(),
    });

    expect(analysis.action).toBe("QUARANTINE");
    expect(analysis.toolMisuseDetected).toBe(true);
    expect(analysis.explanation).toContain("Tool misuse detected");
  });

  it("enforces automatic ROLLBACK when severe quality regressions occur", () => {
    monitor.registerBaseline({
      id: "base-3",
      targetId: "ollama-deepseek",
      targetType: "model",
      targetVersion: "v1.2",
      passRatePct: 92.0,
      avgLatencyMs: 180,
      createdAt: new Date().toISOString(),
      testCaseResults: { "r1": true, "r2": true, "r3": true, "r4": true, "r5": true },
    });

    const analysis = monitor.evaluate({
      runId: "run-candidate-3",
      targetId: "ollama-deepseek",
      targetType: "model",
      targetVersion: "v1.3-quant",
      passRatePct: 70.0, // -22% drift
      avgLatencyMs: 320,
      testCaseResults: { "r1": false, "r2": false, "r3": false, "r4": true, "r5": true },
      executedAt: new Date().toISOString(),
    });

    expect(analysis.action).toBe("ROLLBACK");
    expect(analysis.regressions).toHaveLength(3);
    expect(analysis.passRateDriftPct).toBe(-22.0);
    expect(analysis.explanation).toContain("Automatic rollback recommended");

    // Confirms audit record was created in store
    const auditLogs = store.listAuditEntries(10);
    expect(auditLogs.some(log => log.action === "DRIFT_EVALUATION_ROLLBACK")).toBe(true);
  });
});
