import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const registerPath = resolve(root, "docs/research/CAPABILITY_EVIDENCE.md");
const register = await readFile(registerPath, "utf8");

const citedPaths = [
  "src/semanticMemory.ts",
  "src/providers/memory/operationalMemory.ts",
  "src/memoryContextOptimizer.ts",
  "src/providers/decision/jevDecision.ts",
  "src/providers/benchmark/benchmarkRunner.ts",
  "src/core/completion/completionAuditor.ts",
  "src/core/completion/completionEngine.ts",
  "src/core/contract/contractEnforcer.ts",
  "src/core/quality/correctionRegistry.ts",
  "src/workflowEngine.ts",
  "src/core/router/empiricalRouter.ts",
  "src/providers/browser/jevUltrafastBrowser.ts",
  "src/nativeGateway.ts",
];

const missing: string[] = [];
for (const path of citedPaths) {
  if (!register.includes(path)) {
    missing.push(`register no longer cites ${path}`);
    continue;
  }
  try {
    await access(resolve(root, path));
  } catch {
    missing.push(`cited source is missing: ${path}`);
  }
}

if (missing.length > 0) {
  console.error(JSON.stringify({ valid: false, missing }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ valid: true, checkedSources: citedPaths.length }, null, 2));
