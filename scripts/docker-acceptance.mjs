import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const image = process.env.AGENTFORGE_DOCKER_ACCEPTANCE_IMAGE?.trim() || "alpine:latest";
const containerName = `agentforge-docker-acceptance-${randomUUID().slice(0, 8)}`;
const result = spawnSync(
  "docker",
  [
    "run", "--name", containerName, "--rm", "--pull=never",
    "--network", "none",
    "--read-only",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--pids-limit", "64",
    "--memory", "64m",
    "--cpus", "0.5",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
    image, "sh", "-c", "printf agentforge-docker-ok",
  ],
  { encoding: "utf8", timeout: 60_000 },
);

const cleanup = spawnSync("docker", ["rm", "--force", containerName], { encoding: "utf8", timeout: 10_000 });
if (cleanup.error) throw cleanup.error;
if (cleanup.status !== 0 && !/No such container/i.test(cleanup.stderr)) {
  throw new Error(`Docker acceptance cleanup failed: ${cleanup.stderr || `exit ${cleanup.status}`}`);
}

if (result.error) throw result.error;
if (result.status !== 0) {
  process.stderr.write(result.stderr || "Docker acceptance failed.\n");
  process.exit(result.status ?? 1);
}

const output = result.stdout.trim();
if (output !== "agentforge-docker-ok") {
  throw new Error(`Unexpected Docker acceptance output: ${JSON.stringify(output)}`);
}

console.log(`PASS: Docker engine executed an isolated network-disabled container with ${image}.`);
