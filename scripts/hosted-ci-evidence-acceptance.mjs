import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const doc = fs.readFileSync(path.join(root, "docs", "research", "HOSTED_CI_VERIFICATION.md"), "utf8");
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const commits = [...doc.matchAll(/- Commit: `([0-9a-f]{40})`/g)].map((match) => match[1]);
const latestCommit = commits[0];
let isAncestor = false;
if (latestCommit) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", latestCommit, head], { cwd: root, stdio: "ignore" });
    isAncestor = true;
  } catch {
    isAncestor = false;
  }
}
if (!latestCommit || !isAncestor || !doc.includes("- Result: all 7 jobs passed.")) {
  throw new Error(`hosted CI evidence does not match the current history (${head})`);
}
console.log(JSON.stringify({ passed: true, verifiedCommit: latestCommit, head, jobs: 7 }, null, 2));
