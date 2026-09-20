#!/usr/bin/env node
/**
 * AgentForge CLI Entry point
 */

import { AgentForgeCli } from "./agentforge-cli.js";

const cli = new AgentForgeCli();
const args = process.argv.slice(2);
const cmd = args[0];

async function main() {
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

  console.log("Usage: agentforge [status | pack init <name> | pack validate <path> | pack test <path> | pack benchmark <path>]");
}

main().catch(err => {
  console.error("CLI error:", err);
  process.exit(1);
});
