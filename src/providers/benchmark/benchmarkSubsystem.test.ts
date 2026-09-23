import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BenchmarkRunner } from "./benchmarkRunner.js";
import {
  MODEL_INTENT_SUITE,
  HARNESS_ISOLATION_SUITE,
  PACKAGE_MANIFEST_SUITE,
} from "./benchmarkSuites.js";
import { EmpiricalRouter } from "../../core/router/empiricalRouter.js";
import { WorkspaceStore } from "../../core/store/workspaceStore.js";
import { AgentForgeWebServer } from "../../server/webServer.js";
import net from "node:net";

describe("Sections 47, 48, 49: Benchmark Domain, Benchmark Everything & Empirical Routing", () => {
  let runner: BenchmarkRunner;
  let router: EmpiricalRouter;
  let store: WorkspaceStore;

  beforeEach(() => {
    runner = new BenchmarkRunner();
    router = new EmpiricalRouter();
    store = new WorkspaceStore();
  });

  it("lists and retrieves standard benchmark suites with thresholds", () => {
    const suites = runner.listSuites();
    expect(suites.length).toBeGreaterThanOrEqual(4);

    const intentSuite = runner.getSuite("suite-model-intent-v1");
    expect(intentSuite).toBeDefined();
    expect(intentSuite?.targetType).toBe("MODEL");
    expect(intentSuite?.cases.length).toBe(3);
    expect(intentSuite?.thresholds.some(t => t.metricName === "pass_rate")).toBe(true);

    const harnessSuite = runner.getSuite("suite-harness-isolation-v1");
    expect(harnessSuite).toBeDefined();
    expect(harnessSuite?.targetType).toBe("HARNESS");
  });

  it("executes a benchmark suite and verifies metrics, thresholds, and compatibility", async () => {
    const result = await runner.executeBenchmark("suite-harness-isolation-v1", "agentforge-native");

    expect(result.id).toMatch(/^bench-/);
    expect(result.targetId).toBe("agentforge-native");
    expect(result.targetType).toBe("HARNESS");
    expect(result.totalCases).toBe(3);
    expect(result.passedCases).toBe(3);
    expect(result.failedCases).toBe(0);
    expect(result.passedOverall).toBe(true);

    const passRateMetric = result.metrics.find(m => m.name === "pass_rate");
    expect(passRateMetric?.value).toBe(100);
    expect(passRateMetric?.passedThreshold).toBe(true);

    // Evaluate compatibility
    const compat = runner.evaluateCompatibility("HARNESS", "agentforge-native", result);
    expect(compat.compatible).toBe(true);
    expect(compat.supportedFeatures).toContain("git_worktree_isolation");
    expect(compat.supportedFeatures).toContain("command_gating");
  });

  it("enforces empirical routing: unmeasured models cannot win critical tasks on reputation alone", () => {
    // Unmeasured routing for high-risk task
    const initialDecision = router.route({
      taskType: "bug_fix",
      risk: "high",
      complexityScore: 7,
      contextTokens: 16000,
      generativeModelRequired: true,
      toolUseRequired: true,
      structuredOutputRequired: true,
    });

    // When no empirical benchmark results exist, decision must indicate fallback / UNKNOWN quality
    expect(initialDecision.qualityStatus).toBe("UNKNOWN");
    expect(initialDecision.decisionRule).toContain("no_measured_candidate_meets_threshold");

    // Now record measured benchmark for target-tier2-llama3-8b with 100% pass rate
    router.recordBenchmarkResult({
      id: "bench-measured-01",
      suiteId: "suite-model-tools-v1",
      targetType: "MODEL",
      targetId: "target-tier2-llama3-8b",
      targetVersion: "llama3.1:8b",
      totalCases: 2,
      passedCases: 2,
      failedCases: 0,
      metrics: [
        { name: "pass_rate", unit: "percent", value: 100, passedThreshold: true },
        { name: "avg_latency", unit: "ms", value: 250, passedThreshold: true },
      ],
      artifacts: [],
      passedOverall: true,
      executedAt: new Date().toISOString(),
      durationMs: 500,
    });

    // Re-route with same requirements
    const measuredDecision = router.route({
      taskType: "bug_fix",
      risk: "high",
      complexityScore: 7,
      contextTokens: 16000,
      generativeModelRequired: true,
      toolUseRequired: true,
      structuredOutputRequired: true,
    });

    // With empirical proof, the cheaper demonstrated-capable model wins
    expect(measuredDecision.selectedTargetId).toBe("target-tier2-llama3-8b");
    expect(measuredDecision.qualityStatus).toBe("MEASURED");
    expect(measuredDecision.measuredPassRate).toBe(1.0);
    expect(measuredDecision.decisionRule).toContain("measured_pass_rate");
  });

  describe("Server Benchmark & Routing REST API", () => {
    let server: AgentForgeWebServer;
    let port: number;

    beforeEach(async () => {
      port = await new Promise<number>((resolve, reject) => {
        const probe = net.createServer();
        probe.once("error", reject);
        probe.listen(0, "127.0.0.1", () => {
          const address = probe.address();
          if (!address || typeof address === "string") return reject(new Error("Could not allocate test port."));
          const selectedPort = address.port;
          probe.close(error => error ? reject(error) : resolve(selectedPort));
        });
      });
      server = new AgentForgeWebServer(store, port);
      await server.start();
    });

    afterEach(async () => {
      await server.stop();
    });

    it("serves benchmark suites, runs benchmark, and updates empirical routing", async () => {
      const base = `http://127.0.0.1:${port}`;

      // 1. GET /api/benchmarks
      const listRes = await fetch(`${base}/api/benchmarks`);
      expect(listRes.status).toBe(200);
      const listData = await listRes.json() as { suites: Array<{ id: string }>; results: any[] };
      expect(listData.suites.length).toBeGreaterThanOrEqual(4);

      // 2. POST /api/benchmarks/run for target-tier2-llama3-8b
      const runRes = await fetch(`${base}/api/benchmarks/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suiteId: "suite-model-tools-v1",
          targetId: "target-tier2-llama3-8b",
        }),
      });
      expect(runRes.status).toBe(200);
      const runData = await runRes.json() as { result: any; compatibility: any };
      expect(runData.result.passedOverall).toBe(true);
      expect(runData.compatibility.compatible).toBe(true);

      // Verify audit entry was recorded
      const audits = store.listAuditEntries({ targetType: "benchmark" });
      expect(audits.length).toBeGreaterThanOrEqual(1);
      expect(audits.some(a => a.action === "benchmark_executed")).toBe(true);

      // 3. POST /api/route now selects the measured model
      const routeRes = await fetch(`${base}/api/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "bug_fix",
          risk: "medium",
          complexityScore: 5,
          contextTokens: 8000,
          generativeModelRequired: true,
          toolUseRequired: true,
          structuredOutputRequired: true,
        }),
      });
      expect(routeRes.status).toBe(200);
      const routeData = await routeRes.json() as { selectedTargetId: string; qualityStatus: string };
      expect(routeData.selectedTargetId).toBe("target-tier2-llama3-8b");
      expect(routeData.qualityStatus).toBe("MEASURED");
    });
  });
});
