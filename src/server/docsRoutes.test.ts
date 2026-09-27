import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { AgentForgeWebServer } from "./webServer.js";

async function availablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") return reject(new Error("Could not allocate test port."));
      const port = address.port;
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

describe("Documentation Explorer & Drift API Routes", () => {
  let server: AgentForgeWebServer | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it("lists public repository documentation via GET /api/docs", async () => {
    const port = await availablePort();
    server = new AgentForgeWebServer(undefined, port);
    await server.start();
    const base = `http://127.0.0.1:${port}`;

    const res = await fetch(`${base}/api/docs`);
    expect(res.status).toBe(200);
    const docs = await res.json() as Array<{ name: string; title: string; category: string; isMasterSpec: boolean; sizeBytes: number }>;
    expect(Array.isArray(docs)).toBe(true);
    expect(docs.length).toBeGreaterThanOrEqual(20);

    // Verify key master specifications exist in catalog
    const filenames = docs.map(d => d.name);
    expect(filenames).toContain("COMPLETE_AUTONOMOUS_ROADMAP.md");
    expect(filenames).toContain("COMPLETION_ENGINE_SPECIFICATION.md");
    expect(filenames).toContain("SPECIFICATION_INDEX.md");

    const masterDoc = docs.find(d => d.name === "COMPLETE_AUTONOMOUS_ROADMAP.md");
    expect(masterDoc?.isMasterSpec).toBe(true);
    expect(masterDoc?.sizeBytes).toBeGreaterThan(1000);
    expect(filenames).not.toContain("USER.md");
    expect(filenames).not.toContain("TOOLS.md");
  });

  it("reads a specific markdown document via GET /api/docs/:filename", async () => {
    const port = await availablePort();
    server = new AgentForgeWebServer(undefined, port);
    await server.start();
    const base = `http://127.0.0.1:${port}`;

    const res = await fetch(`${base}/api/docs/COMPLETE_AUTONOMOUS_ROADMAP.md`);
    expect(res.status).toBe(200);
    const doc = await res.json() as { name: string; content: string; sizeBytes: number; modifiedAt: string };
    expect(doc.name).toBe("COMPLETE_AUTONOMOUS_ROADMAP.md");
    expect(doc.content).toContain("AgentForge");
    expect(doc.sizeBytes).toBeGreaterThan(0);
    expect(doc.modifiedAt).toBeDefined();
  });

  it("rejects path traversal attempts on /api/docs/:filename", async () => {
    const port = await availablePort();
    server = new AgentForgeWebServer(undefined, port);
    await server.start();
    const base = `http://127.0.0.1:${port}`;

    const res = await fetch(`${base}/api/docs/..%2Fpackage.json`);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Invalid document filename");
  });

  it("returns 404 for non-existent documents", async () => {
    const port = await availablePort();
    server = new AgentForgeWebServer(undefined, port);
    await server.start();
    const base = `http://127.0.0.1:${port}`;

    const res = await fetch(`${base}/api/docs/non_existent_doc_xyz123.md`);
    expect(res.status).toBe(404);
  });

  it("exposes drift monitoring baselines and evaluation via /api/drift/*", async () => {
    const port = await availablePort();
    server = new AgentForgeWebServer(undefined, port);
    await server.start();
    const base = `http://127.0.0.1:${port}`;

    const qualityStatusRes = await fetch(`${base}/api/drift/status`);
    expect(qualityStatusRes.status).toBe(200);
    expect(await qualityStatusRes.json()).toMatchObject({
      persistenceMode: "in_memory",
      baselineCount: expect.any(Number),
      comparisonCount: expect.any(Number),
      correctionCount: expect.any(Number),
      pendingCorrectionCount: expect.any(Number),
    });
    const correctionsRes = await fetch(`${base}/api/quality/corrections`);
    expect(correctionsRes.status).toBe(200);
    expect(await correctionsRes.json()).toEqual([]);
    // Test baselines endpoint
    const baselinesRes = await fetch(`${base}/api/drift/baselines`);
    expect(baselinesRes.status).toBe(200);
    const baselines = await baselinesRes.json() as Array<{ targetId: string; avgLatencyMs: number }>;
    expect(baselines.length).toBeGreaterThanOrEqual(3);
    const modelIds = baselines.map(b => b.targetId);
    expect(modelIds).toContain("fixture-model-a");
    expect(modelIds).toContain("fixture-model-b");

    // Test drift evaluation endpoint
    const evalRes = await fetch(`${base}/api/drift/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelId: "fixture-model-a",
        measuredPassRate: 0.96,
        measuredLatencyMs: 380,
        unauthorizedToolAttempts: 0,
        hallucinatedCapabilities: 0,
      }),
    });
    const evalText = await evalRes.text();
    if (evalRes.status !== 200) {
      console.error("evalRes error body:", evalText);
    }
    expect(evalRes.status).toBe(200);
    const report = JSON.parse(evalText) as { status: string; passed: boolean; modelId: string };
    expect(report.modelId).toBe("fixture-model-a");
    expect(report.status).toBe("HEALTHY");
    expect(report.passed).toBe(true);

    // Test reports endpoint includes the new evaluation
    const reportsRes = await fetch(`${base}/api/drift/reports`);
    expect(reportsRes.status).toBe(200);
    const reports = await reportsRes.json() as Array<{ targetId: string }>;
    expect(reports.some(r => r.targetId === "fixture-model-a")).toBe(true);
  });
});

