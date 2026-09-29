import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";

export type Assertion = { id: string; passed: boolean };
export type Envelope = {
  schemaVersion: 1; checkId: string; runId: string; revision: string;
  inputHashes: Record<string, string>; startedAt: string; endedAt: string;
  passed: boolean; assertions: Assertion[]; artifacts: string[]; errors: string[];
  adapter?: string; raw?: unknown;
};
export async function executeChild(command: string, args: string[], cwd: string, timeoutMs = 30_000, maxBytes = 2_000_000): Promise<string> {
  if (!(timeoutMs > 0) || !Number.isFinite(timeoutMs)) throw new Error("invalid timeout");
  return new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" });
    let stdout = ""; let stderr = ""; let bytes = 0; let stopped = false;
    const stop = (reason: string) => {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      if (process.platform === "win32" && child.pid) {
        const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
        killer.on("error", () => child.kill("SIGKILL"));
      } else if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); } }
      child.stdout.destroy(); child.stderr.destroy(); child.unref();
      reject(new Error(reason));
    };
    const timer = setTimeout(() => stop("child timeout"), timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > maxBytes) stop("child output limit"); else stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > maxBytes) stop("child output limit"); else stderr += chunk.toString(); });
    child.once("error", error => { clearTimeout(timer); if (!stopped) { stopped = true; reject(error); } });
    child.once("close", code => {
      clearTimeout(timer);
      if (stopped) return;
      stopped = true;
      if (stderr) process.stderr.write(stderr);
      if (code !== 0) reject(new Error(`child exited ${code}: ${stderr.slice(-2000)}`));
      else accept(stdout);
    });
  });
}
export function parseObject(stdout: string): Record<string, unknown> {
  const value: unknown = JSON.parse(stdout);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("missing result object");
  return value as Record<string, unknown>;
}
export async function validateEnvelope(value: Envelope, expected: { checkId: string; runId: string }, seen: Set<string>, root: string) {
  if (value.schemaVersion !== 1 || value.checkId !== expected.checkId || value.runId !== expected.runId) throw new Error("wrong envelope identity/version");
  if (seen.has(value.checkId)) throw new Error("duplicate check ID");
  if (!value.revision || !value.inputHashes || !Object.keys(value.inputHashes).length || !Object.values(value.inputHashes).every(hash => /^[a-f0-9]{64}$/.test(hash))) throw new Error("missing provenance");
  if (!Number.isFinite(Date.parse(value.startedAt)) || !Number.isFinite(Date.parse(value.endedAt)) || Date.parse(value.endedAt) < Date.parse(value.startedAt)) throw new Error("invalid timestamps");
  if (value.passed !== true || !Array.isArray(value.errors) || value.errors.length) throw new Error("failed result");
  if (!Array.isArray(value.assertions) || !value.assertions.length || value.assertions.some(a => !a.id || a.passed !== true) || new Set(value.assertions.map(a => a.id)).size !== value.assertions.length) throw new Error("failed or invalid assertions");
  if (!Array.isArray(value.artifacts) || value.artifacts.some(a => typeof a !== "string" || !a)) throw new Error("invalid artifacts");
  for (const artifact of value.artifacts) if (!(await stat(resolve(root, artifact))).isFile()) throw new Error(`missing artifact: ${artifact}`);
  seen.add(value.checkId);
}
