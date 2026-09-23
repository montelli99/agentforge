import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAgentForgeBridgeProfile } from "./bridge.js";
import { formatReport } from "./report.js";
import { getScenarios } from "./scenarios.js";
import { runLab } from "./simulator.js";
import type { OptimizationConfig } from "./optimization-types.js";
import { DEFAULT_OPTIMIZATION_CONFIG } from "./optimization-types.js";

function resolvePackageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function parseIterations(argv: string[]): number {
  const idx = argv.findIndex((value) => value === "--iterations" || value === "-n");
  const raw = idx >= 0 ? argv[idx + 1] : undefined;
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function parseOptimizationConfig(argv: string[]): Partial<OptimizationConfig> {
  const config: Partial<OptimizationConfig> = { ...DEFAULT_OPTIMIZATION_CONFIG };

  if (argv.includes("--optimization")) {
    config.enabled = true;
  }
  if (argv.includes("--cost-aware")) {
    config.costAwareRouting = true;
  }
  if (argv.includes("--cache")) {
    config.exactCache = true;
    config.semanticCache = true;
  }
  if (argv.includes("--compression")) {
    config.promptCompression = true;
    config.contextDeduplication = true;
  }

  return config;
}

async function main(): Promise<void> {
  const packageRoot = resolvePackageRoot();
  const reportDir = path.join(packageRoot, ".artifacts", "agentforge");
  const reportPath = path.join(reportDir, "report.md");
  const jsonPath = path.join(reportDir, "report.json");
  const iterations = parseIterations(process.argv.slice(2));
  const profile = loadAgentForgeBridgeProfile();
  const optimizationConfig = parseOptimizationConfig(process.argv.slice(2));

  const runs = await Promise.all(Array.from({ length: iterations }, () =>
    runLab(getScenarios(profile), profile, optimizationConfig),
  ));
  const report = runs[runs.length - 1] ?? await runLab(getScenarios(profile), profile, optimizationConfig);
  const markdown = formatReport(report);

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportPath, markdown, "utf8");
  await fs.writeFile(jsonPath, `${JSON.stringify({ iterations, runs }, null, 2)}\n`, "utf8");

  process.stdout.write(markdown);
  if (!report.passed) {
    process.exitCode = 1;
  }
}

void main();
