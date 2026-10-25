#!/usr/bin/env node
/**
 * AgentForge CLI Entry point
 */

import { AgentForgeCli } from "./agentforge-cli.js";
import { inspectClaudeCliCapabilities, inspectClaudeCliAuthentication } from "../providers/models/claudeCliCapabilities.js";
import { inspectGeminiCliCapabilities } from "../providers/models/geminiCliCapabilities.js";

const cli = new AgentForgeCli();
const args = process.argv.slice(2);
const cmd = args[0];

async function main() {
  if (cmd === "connections" && args[1] === "inspect-gemini") {
    if (!args[2] || args.length !== 3) throw new Error("Usage: agentforge connections inspect-gemini <absolute-official-client-bundle>");
    const result = await inspectGeminiCliCapabilities(args[2]);
    console.log(JSON.stringify(result, null, 2));
    if (!result.controlsAvailable) process.exitCode = 1;
    return;
  }
  if (cmd === "connections" && args[1] === "claude-status") {
    if (!args[2] || !args[3] || args.length !== 4) throw new Error("Usage: agentforge connections claude-status <absolute-official-client-path> <absolute-profile-directory>");
    const result = await inspectClaudeCliAuthentication(args[2], args[3]);
    console.log(JSON.stringify(result, null, 2));
    if (!result.loggedIn) process.exitCode = 1;
    return;
  }
  if (cmd === "connections" && args[1] === "inspect-claude") {
    if (!args[2] || args.length !== 3) throw new Error("Usage: agentforge connections inspect-claude <absolute-official-client-path>");
    const result = await inspectClaudeCliCapabilities(args[2]);
    console.log(JSON.stringify(result, null, 2));
    if (!result.controlsAvailable) process.exitCode = 1;
    return;
  }
  if (cmd === "status") {
    console.log(JSON.stringify(cli.status(), null, 2));
    return;
  }

  if (cmd === "pack") {
    const sub = args[1];
    if (sub === "init") {
      const name = args[2] || "my-agentforge-pack";
      const res = cli.packInit(process.cwd(), name);
      console.log(`Initialized package: ${res.createdPath}`);
      return;
    }
    if (sub === "validate") {
      const target = args[2] || process.cwd();
      const res = cli.packValidate(target);
      console.log(`Validation: ${res.valid ? "PASSED" : "FAILED"}`);
      if (!res.valid) console.error(res.errors);
      return;
    }
    if (sub === "inspect-archive") {
      const target = args[2] || process.cwd();
      const archive = args[3];
      if (!archive) throw new Error("Usage: agentforge pack inspect-archive <package-directory> <archive.zip>");
      const res = cli.packInspectArchive(target, archive);
      console.log(`Archive inspection: ${res.valid ? "PASSED" : "FAILED"}`);
      if (res.entries.length > 0) console.log(`Files inspected: ${res.entries.length}`);
      if (!res.valid) console.error(res.errors);
      return;
    }
    if (sub === "test") {
      const target = args[2] || process.cwd();
      const res = cli.packTest(target);
      console.log(res.output);
      return;
    }
    if (sub === "benchmark") {
      const target = args[2] || process.cwd();
      const res = await cli.packBenchmark(target);
      console.log(`Benchmark score: ${res.score}/100 in ${res.latencyMs}ms`);
      return;
    }
  }

  console.log("Usage: agentforge [status | pack init <name> | pack validate <path> | pack inspect-archive <package-directory> <archive.zip> | pack test <path> | pack benchmark <path>]");
  console.log("Connection inspection: agentforge connections inspect-claude <absolute-official-client-path>");
  console.log("Account status: agentforge connections claude-status <absolute-official-client-path> <absolute-profile-directory>");
}

main().catch(err => {
  console.error("CLI error:", err);
  process.exit(1);
});
