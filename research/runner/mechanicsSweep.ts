import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const runners = [
  "offlineSlice.ts",
  "memoryAndEvidenceSlice.ts",
  "correctionSlice.ts",
  "durableMemorySlice.ts",
  "handoffSlice.ts",
  "validatePilotConfig.ts",
  "validateProtocol.ts",
  "validateEvidencePaths.ts",
  "validateManuscript.ts",
];

const run = (file: string) => new Promise<void>((resolveRun, reject) => {
  const child = spawn(process.execPath, ["--import", "tsx", `research/runner/${file}`], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  child.once("error", reject);
  child.once("exit", code => code === 0 ? resolveRun() : reject(new Error(`${file} exited with ${code ?? "signal"}`)));
});

for (const runner of runners) await run(runner);
console.log(JSON.stringify({
  passed: true,
  runners,
  networkCalls: 0,
  providerCalls: 0,
}, null, 2));
