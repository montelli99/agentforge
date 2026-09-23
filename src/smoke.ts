import http from "node:http";

const BASE = process.env.AGENTFORGE_URL || "http://localhost:3000";

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function get(path: string): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode || 0, body: JSON.parse(Buffer.concat(chunks).toString()) });
        } catch {
          resolve({ status: res.statusCode || 0, body: {} });
        }
      });
    }).on("error", reject);
  });
}

function getRaw(path: string): Promise<{ status: number; body: string; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks).toString(),
          headers: res.headers as Record<string, string>,
        });
      });
    }).on("error", reject);
  });
}

async function runSmoke(): Promise<void> {
  console.log("=== AgentForge Smoke Test ===\n");
  let failed = 0;

  console.log("1. GET /health");
  try {
    const res = await get("/health");
    if (res.status === 200 && res.body.status === "ok") {
      console.log("   PASS\n");
    } else {
      console.log(`   FAIL: status=${res.status} body=${JSON.stringify(res.body)}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   FAIL: ${e}\n`);
    failed++;
  }

  console.log("2. GET /version");
  try {
    const res = await get("/version");
    if (res.status === 200 && typeof res.body.version === "string") {
      console.log(`   PASS (v${res.body.version}, commit=${res.body.gitCommit})\n`);
    } else {
      console.log(`   FAIL: status=${res.status} body=${JSON.stringify(res.body)}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   FAIL: ${e}\n`);
    failed++;
  }

  console.log("3. GET /dashboard.json");
  try {
    const res = await get("/dashboard.json");
    if (res.status === 200 && typeof res.body.requests === "number") {
      console.log(`   PASS (requests=${res.body.requests})\n`);
    } else {
      console.log(`   FAIL: status=${res.status} body=${JSON.stringify(res.body)}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   FAIL: ${e}\n`);
    failed++;
  }

  console.log("4. GET /dashboard (HTML)");
  try {
    const res = await get("/dashboard");
    if (res.status === 200) {
      console.log("   PASS\n");
    } else {
      console.log(`   FAIL: status=${res.status}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   FAIL: ${e}\n`);
    failed++;
  }

  console.log("5. GET /metrics.csv");
  try {
    const res = await getRaw("/metrics.csv");
    if (res.status === 200 && res.headers["content-type"]?.includes("text/csv")) {
      const lines = res.body.split("\n");
      const hasHeader = lines[0]?.includes("timestamp") && lines[0]?.includes("requestId");
      console.log(`   PASS (lines=${lines.length}, header=${hasHeader})\n`);
    } else {
      console.log(`   FAIL: status=${res.status} content-type=${res.headers["content-type"]}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   FAIL: ${e}\n`);
    failed++;
  }

  console.log("6. GET /summary/daily");
  try {
    const res = await get("/summary/daily");
    if (res.status === 200 && typeof res.body.date === "string" && typeof res.body.requests === "number") {
      console.log(`   PASS (date=${res.body.date}, requests=${res.body.requests})\n`);
    } else {
      console.log(`   FAIL: status=${res.status} body=${JSON.stringify(res.body)}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   FAIL: ${e}\n`);
    failed++;
  }

  console.log("7. GET /events (SSE)");
  try {
    const res = await new Promise<{ status: number; headers: Record<string, string>; body: string }>((resolve) => {
      const req = http.get(`${BASE}/events`, (r) => {
        const chunks: Buffer[] = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => {
          resolve({
            status: r.statusCode || 0,
            headers: r.headers as Record<string, string>,
            body: Buffer.concat(chunks).toString(),
          });
        });
        setTimeout(() => req.destroy(), 100);
      }).on("error", (e) => { throw e; });
    });
    if (res.status === 200 && res.headers["content-type"]?.includes("text/event-stream")) {
      console.log(`   PASS (body=${res.body.trim().slice(0, 50)})\n`);
    } else {
      console.log(`   FAIL: status=${res.status} content-type=${res.headers["content-type"]}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   FAIL: ${e}\n`);
    failed++;
  }

  console.log("8. POST /v1/chat/completions (expect 503 without API key)");
  try {
    const data = JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "test" }] });
    const res = await new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: new URL(BASE).hostname,
          port: new URL(BASE).port || 3000,
          path: "/v1/chat/completions",
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
        },
        (r) => {
          const chunks: Buffer[] = [];
          r.on("data", (c) => chunks.push(c));
          r.on("end", () => {
            try {
              resolve({ status: r.statusCode || 0, body: JSON.parse(Buffer.concat(chunks).toString()) });
            } catch {
              resolve({ status: r.statusCode || 0, body: {} });
            }
          });
        },
      );
      req.on("error", reject);
      req.write(data);
      req.end();
    });
    if (res.status === 503 && getErrorCode(res.body.error) === "provider_key_missing") {
      console.log("   PASS (503 provider_key_missing)\n");
    } else {
      console.log(`   FAIL: status=${res.status} body=${JSON.stringify(res.body)}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   FAIL: ${e}\n`);
    failed++;
  }

  console.log("9. GET /nonexistent (expect 404)");
  try {
    const res = await get("/nonexistent");
    if (res.status === 404) {
      console.log("   PASS\n");
    } else {
      console.log(`   FAIL: expected 404, got ${res.status}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   FAIL: ${e}\n`);
    failed++;
  }

  console.log("10. POST /v1/chat/completions with valid request body");
  try {
    const data = JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "What is 2+2?" }] });
    const res = await new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: new URL(BASE).hostname,
          port: new URL(BASE).port || 3000,
          path: "/v1/chat/completions",
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
        },
        (r) => {
          const chunks: Buffer[] = [];
          r.on("data", (c) => chunks.push(c));
          r.on("end", () => {
            try {
              resolve({ status: r.statusCode || 0, body: JSON.parse(Buffer.concat(chunks).toString()) });
            } catch {
              resolve({ status: r.statusCode || 0, body: {} });
            }
          });
        },
      );
      req.on("error", reject);
      req.write(data);
      req.end();
    });
    if (res.status === 503 && getErrorCode(res.body.error) === "provider_key_missing") {
      console.log("   PASS (503 provider_key_missing)\n");
    } else if (res.status === 200) {
      console.log(`   PASS (200 response with provider forwarding)\n`);
    } else {
      console.log(`   FAIL: status=${res.status} body=${JSON.stringify(res.body)}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   FAIL: ${e}\n`);
    failed++;
  }

  if (failed === 0) {
    console.log("=== All smoke tests passed ===");
  } else {
    console.log(`=== ${failed} smoke test(s) failed ===`);
    process.exit(1);
  }
}

runSmoke().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
