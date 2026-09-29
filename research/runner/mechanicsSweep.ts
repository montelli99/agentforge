import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { adaptLegacy, runners } from "./mechanicsAdapters.js";
import { executeChild, parseObject, validateEnvelope, type Envelope } from "./mechanicsHarness.js";

import { prepareSandbox, runIsolated, verifyDenial, dockerPolicy } from "./mechanicsSandbox.js";
const root = resolve(import.meta.dirname, "../..");
const runId = `mechanics-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
const startedAt = new Date().toISOString();
const inputHashes: Record<string, string> = {};
async function hashTree(directory: string): Promise<void> {
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await hashTree(file);
    else if (entry.isFile()) inputHashes[file] = createHash("sha256").update(await readFile(resolve(root, file))).digest("hex");
  }
}
// Hash the working files as well as HEAD: local modifications are part of the evidence.
for (const directory of ["src", "research/runner", "research/tasks", "research/config", "docs/research"]) await hashTree(directory);
for (const file of ["package.json", "pnpm-lock.yaml"]) inputHashes[file] = createHash("sha256").update(await readFile(resolve(root, file))).digest("hex");
const revision = (await executeChild("git", ["rev-parse", "HEAD"], root)).trim();
const directory = resolve(root, "research/results", runId);
await mkdir(directory, { recursive: true });
// Use only a pre-existing image, pinned to its inspected content ID; never pull.
const imageId = (await executeChild("docker", ["image", "inspect", "node:22-alpine", "--format", "{{.Id}}"], root)).trim();
if (!/^sha256:[a-f0-9]{64}$/.test(imageId)) throw new Error("missing local Docker image identity");
const sandbox = await prepareSandbox(root, Object.keys(inputHashes), runners);
const denialProbe = await verifyDenial(sandbox, imageId, root);
const isolation = { backend: "docker", imageId, policy: dockerPolicy, denialProbe, mountedInputs: "allowlisted source, research fixtures/configuration and research documentation only; no host credentials or node_modules", callCounts: "unmeasured" };
const results: Envelope[] = [];
const errors: string[] = [];
const seen = new Set<string>();
for (const checkId of runners) {
  const start = new Date().toISOString();
  try {
    const stdout = await runIsolated(sandbox, imageId, [`research/runner/${checkId}.mjs`], root);
    const raw = parseObject(stdout);
    const artifact = relative(root, resolve(directory, `${checkId}.json`)).replaceAll("\\", "/");
    await writeFile(resolve(root, artifact), stdout, { flag: "wx" });
    const assertions = adaptLegacy(checkId, raw, inputHashes);
    const envelope: Envelope = { schemaVersion: 1, checkId, runId, revision, inputHashes, startedAt: start, endedAt: new Date().toISOString(), passed: assertions.every(a => a.passed), assertions, artifacts: [artifact], errors: [], adapter: "legacy-mechanics-v1", raw };
    await validateEnvelope(envelope, { checkId, runId }, seen, root);
    results.push(envelope);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${checkId}: ${message}`);
    results.push({ schemaVersion: 1, checkId, runId, revision, inputHashes, startedAt: start, endedAt: new Date().toISOString(), passed: false, assertions: [], artifacts: [], errors: [message] });
    process.stderr.write(`${checkId}: ${message}\n`);
  }
}
const result = { schemaVersion: 1, runId, revision, startedAt, endedAt: new Date().toISOString(), passed: !errors.length && results.length === runners.length, requiredChecks: runners, isolation, networkCalls: "unmeasured", providerCalls: "unmeasured", interpretation: "Legacy output assertions validated inside a Docker network-denial boundary; legacy call counts are self-reported and are not measurement. No model quality acceptance is implied.", results, errors };
await writeFile(resolve(directory, "consolidated.json"), JSON.stringify(result, null, 2), { flag: "wx" });
await writeFile(resolve(directory, "README.md"), `# Generated mechanics evidence\n\nRun: ${runId}\n\n[Consolidated machine-readable result](./consolidated.json). Generated from actual child outputs and input hashes. Historical dated results are preserved and are not replaced by this run. Network/provider call counts remain unmeasured; Docker network denial is separately verified. This is engineering mechanics evidence, not model-quality or scientific scorer acceptance.\n`, { flag: "wx" });
console.log(JSON.stringify({ ...result, artifact: relative(root, resolve(directory, "consolidated.json")).replaceAll("\\", "/") }));
if (!result.passed) process.exitCode = 1;
