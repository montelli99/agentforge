import { createRequire } from "node:module";
import { mkdtemp, mkdir, copyFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { executeChild, parseObject } from "./mechanicsHarness.js";

type Builder = { build(options: Record<string, unknown>): Promise<unknown> };
const require = createRequire(import.meta.url);
const build = (createRequire(require.resolve("tsx"))("esbuild") as Builder).build;
export const dockerPolicy = ["--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--memory", "512m", "--cpus", "1", "--user", "65534:65534", "--tmpfs", "/tmp:rw,noexec,nosuid,size=128m"];
export async function prepareSandbox(root: string, files: string[], runners: string[]) {
  const directory = await mkdtemp(join(tmpdir(), "agentforge-mechanics-sandbox-"));
  for (const file of files) {
    const target = join(directory, file);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(root, file), target);
  }
  await writeFile(join(directory, "package.json"), JSON.stringify({ type: "module" }));
  await build({ entryPoints: runners.map(id => join(root, `research/runner/${id}.ts`)), outdir: join(directory, "research/runner"), outExtension: { ".js": ".mjs" }, bundle: true, platform: "node", format: "esm", target: "node22", logLevel: "silent", banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' } });
  return directory;
}
export async function runIsolated(directory: string, imageId: string, args: string[], root: string, timeoutMs = 30_000) {
  const name = `agentforge-mechanics-${randomUUID()}`;
  try {
    return await executeChild("docker", ["run", "--rm", "--pull", "never", "--name", name, ...dockerPolicy, "--mount", `type=bind,source=${directory},target=/workspace,readonly`, "--workdir", "/workspace", imageId, "node", ...args], root, timeoutMs);
  } finally {
    // Killing the Docker CLI alone does not stop a timed-out container.
    await executeChild("docker", ["rm", "--force", name], root, 5000).catch(() => {});
  }
}
export async function verifyDenial(directory: string, imageId: string, root: string) {
  const code = `const http = require('node:http');
const interfaces = require('node:os').networkInterfaces();
if (Object.values(interfaces).flat().some(i => !i.internal)) throw new Error('external interface present');
const request = http.get('http://192.0.2.1:80/mechanics-denial-probe', () => { process.exitCode = 1; console.log(JSON.stringify({denied:false})); });
request.setTimeout(1500, () => request.destroy(new Error('probe timeout is not denial evidence')));
request.on('error', error => { const denied = ['ENETUNREACH','EHOSTUNREACH','EACCES','EPERM'].includes(error.code); console.log(JSON.stringify({denied, code:error.code, externalInterfaces:0, attemptedHttpRequests:1})); if (!denied) process.exitCode = 1; });`;
  const result = parseObject(await runIsolated(directory, imageId, ["-e", code], root));
  if (result.denied !== true || result.attemptedHttpRequests !== 1 || result.externalInterfaces !== 0) throw new Error("network denial probe failed");
  return result;
}
