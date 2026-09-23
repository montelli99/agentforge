/**
 * AgentForge Developer CLI
 * Section 28 & 43: Package Developer UX
 * Commands:
 *   agentforge pack init <name>
 *   agentforge pack validate <path>
 *   agentforge pack test <path>
 *   agentforge pack benchmark <path>
 *   agentforge status
 */

import fs from "node:fs";
import path from "node:path";
import type { PackageManifest } from "../core/types/package.js";
import { LocalPackageProvider } from "../providers/marketplace/localPackageProvider.js";
import { BenchmarkRunner } from "../providers/benchmark/benchmarkRunner.js";

export class AgentForgeCli {
  private packageProvider = new LocalPackageProvider();
  private benchmarkRunner = new BenchmarkRunner();

  /**
   * Initializes a new agentforge-pack directory structure
   */
  packInit(targetDir: string, packageName: string): { success: boolean; createdPath: string } {
    if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(packageName)
      || packageName.endsWith(".")
      || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(packageName)) {
      throw new Error("Package name must be a safe 1-64 character slug.");
    }
    const resolvedTargetDir = path.resolve(targetDir);
    const packPath = path.resolve(resolvedTargetDir, packageName);
    if (path.dirname(packPath) !== resolvedTargetDir) {
      throw new Error("Package path must stay inside the selected target directory.");
    }
    if (fs.existsSync(packPath)) {
      throw new Error(`Directory ${packPath} already exists`);
    }

    const subdirs = [
      "agents",
      "processes",
      "skills",
      "workflows",
      "tools",
      "channels",
      "voice",
      "policies",
      "contracts",
      "memory",
      "ui",
      "tests",
    ];

    for (const dir of subdirs) {
      fs.mkdirSync(path.join(packPath, dir), { recursive: true });
    }

    const initialManifest: PackageManifest = {
      schemaVersion: "1.0.0",
      name: packageName,
      version: "0.1.0",
      publisher: {
        id: "pub-local-developer",
        name: "Local Developer",
        verified: false,
      },
      description: `AgentForge package: ${packageName}`,
      license: "UNLICENSED",
      agentforgeVersion: ">=0.1.0",
      capabilities: [
        {
          id: `cap-${packageName}`,
          name: `${packageName} Capability`,
          description: "Primary capability",
          type: "agent",
        },
      ],
      permissions: {
        filesystem: { workspace: { read: false, write: false } },
        git: { read: false, branch: false, commit: false, forcePush: false },
        network: { outbound: false },
      },
      files: ["manifest.json", "README.md"],
      testsPath: "tests",
      documentationPath: "README.md",
    };

    fs.writeFileSync(
      path.join(packPath, "manifest.json"),
      JSON.stringify(initialManifest, null, 2),
      "utf-8",
    );

    fs.writeFileSync(
      path.join(packPath, "README.md"),
      `# ${packageName}\n\nAgentForge package starter.\n\nSelect a license and review the manifest before publishing.\n`,
      "utf-8",
    );

    return { success: true, createdPath: packPath };
  }

  /**
   * Validates manifest and permission declaration of an existing package
   */
  packValidate(packDir: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const manifestPath = path.join(packDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      return { valid: false, errors: ["Missing manifest.json"], warnings: [] };
    }

    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return { valid: false, errors: ["Manifest must be a JSON object"], warnings: [] };
      }
      const manifestRecord = parsed as Record<string, unknown>;
      if (manifestRecord.dependencies !== undefined && !Array.isArray(manifestRecord.dependencies)) {
        return { valid: false, errors: ["Manifest dependencies must be an array"], warnings: [] };
      }
      if (manifestRecord.files !== undefined
        && (!Array.isArray(manifestRecord.files) || manifestRecord.files.some(file => typeof file !== "string"))) {
        return { valid: false, errors: ["Manifest files must be an array of paths"], warnings: [] };
      }
      const res = this.packageProvider.validatePackage(manifestRecord as unknown as PackageManifest);
      return { valid: res.valid, errors: res.violations, warnings: res.warnings };
    } catch (err) {
      return { valid: false, errors: [`JSON parse error: ${err}`], warnings: [] };
    }
  }

  /** Inspects a ZIP package against its manifest without extracting or executing it. */
  packInspectArchive(packDir: string, archivePath: string): { valid: boolean; errors: string[]; entries: string[] } {
    const manifestPath = path.join(packDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) return { valid: false, errors: ["Missing manifest.json"], entries: [] };
    try {
      const stat = fs.lstatSync(archivePath);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        return { valid: false, errors: ["Archive path must be a regular, non-symlink file."], entries: [] };
      }
      if (stat.size > 25 * 1024 * 1024) {
        return { valid: false, errors: ["Archive exceeds the 25 MiB inspection limit."], entries: [] };
      }
      const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return { valid: false, errors: ["Manifest must be a JSON object"], entries: [] };
      }
      const result = this.packageProvider.inspectPackageArchive(
        parsed as PackageManifest,
        fs.readFileSync(archivePath),
      );
      return { valid: result.valid, errors: result.errors, entries: result.entries.map(entry => entry.path) };
    } catch (error) {
      return { valid: false, errors: [`Archive inspection failed: ${String(error)}`], entries: [] };
    }
  }

  /**
   * Tests a package bundle using its declared tests
   */
  packTest(packDir: string): { passed: boolean; testCount: number; output: string } {
    const validation = this.packValidate(packDir);
    if (!validation.valid) {
      return { passed: false, testCount: 0, output: `Validation failed: ${validation.errors.join("; ")}` };
    }

    return {
      passed: false,
      testCount: 0,
      output: `Package test execution is not implemented yet; no tests were run for ${path.basename(packDir)}.`,
    };
  }

  /**
   * Benchmarks a package bundle against performance thresholds
   */
  async packBenchmark(packDir: string): Promise<{ passed: boolean; score: number; latencyMs: number }> {
    const suite = {
      id: "pack-bench-standard",
      name: "Package Standard Benchmark",
      targetType: "PACKAGE" as const,
      cases: [
        {
          id: "c1",
          name: "Manifest Read",
          description: "Measure local manifest validation",
          input: { dir: packDir },
          expectedOutput: { ok: true },
          timeoutMs: 500,
          tags: ["manifest"],
        },
      ],
      thresholds: [{ metricName: "pass_rate", comparison: "gte" as const, targetValue: 100 }],
    };

    const result = await this.benchmarkRunner.runSuite(suite, path.basename(packDir), async () => {
      const start = performance.now();
      const validation = this.packValidate(packDir);
      const latencyMs = performance.now() - start;
      return { output: { ok: validation.valid }, latencyMs };
    });

    return {
      passed: result.passedOverall,
      score: result.metrics.find(metric => metric.name === "pass_rate")?.value ?? 0,
      latencyMs: result.durationMs,
    };
  }

  /**
   * Returns current AgentForge system status
   */
  status(): { version: string; status: "staging_not_release_ready"; components: string[] } {
    return {
      version: "vNext-0.1.0",
      status: "staging_not_release_ready",
      components: [
        "Universal Mirror (Telegram/Discord/Web)",
        "Execution Control Plane",
        "Process Knowledge Compiler",
        "Voice Subsystem",
        "Marketplace & Package Engine",
        "Empirical Benchmark Runner",
      ],
    };
  }
}
