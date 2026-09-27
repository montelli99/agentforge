import { spawnSync } from "node:child_process";

const result = spawnSync(
  "docker",
  ["run", "--rm", "--network", "none", "alpine:latest", "sh", "-c", "printf agentforge-docker-ok"],
  { encoding: "utf8", timeout: 60_000 },
);

if (result.error) throw result.error;
if (result.status !== 0) {
  process.stderr.write(result.stderr || "Docker acceptance failed.\n");
  process.exit(result.status ?? 1);
}

const output = result.stdout.trim();
if (output !== "agentforge-docker-ok") {
  throw new Error(`Unexpected Docker acceptance output: ${JSON.stringify(output)}`);
}

console.log("PASS: Docker engine executed an isolated network-disabled container.");
