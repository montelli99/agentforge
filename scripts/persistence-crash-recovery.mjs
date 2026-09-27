import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-crash-recovery-"));
let child;
let childOutput = "";

function currentWorkspaceSnapshotSchemaVersion() {
  const sourcePath = path.join(process.cwd(), "src", "core", "store", "workspaceStore.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const match = source.match(/export const WORKSPACE_SNAPSHOT_SCHEMA_VERSION\s*=\s*(\d+)\s*;/);
  if (!match) throw new Error("Could not read the exported WorkspaceStore snapshot schema version.");
  return Number(match[1]);
}

const CURRENT_WORKSPACE_SNAPSHOT_SCHEMA_VERSION = currentWorkspaceSnapshotSchemaVersion();

async function availablePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("Could not select a local crash-recovery port.");
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return address.port;
}

async function startServer(port) {
  childOutput = "";
  child = spawn(process.execPath, ["dist/server/start.js"], {
    cwd: process.cwd(),
    env: { ...process.env, AGENTFORGE_DATA_DIR: dataDirectory, AGENTFORGE_HOST: "127.0.0.1", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.setEncoding("utf8").on("data", chunk => { childOutput += chunk; });
  child.stderr.setEncoding("utf8").on("data", chunk => { childOutput += chunk; });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited early (${child.exitCode}). ${childOutput}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/status`, { headers: { Connection: "close" } });
      if (response.ok) return;
    } catch {
      // The disposable launcher is still binding its loopback port.
    }
    await new Promise(resolve => setTimeout(resolve, 125));
  }
  throw new Error(`Server did not become ready. ${childOutput}`);
}

async function waitForExit(process) {
  const result = await Promise.race([
    new Promise(resolve => process.once("exit", resolve)),
    new Promise(resolve => setTimeout(() => resolve("timeout"), 5000)),
  ]);
  return result !== "timeout" || process.exitCode !== null;
}

async function forceStopServer() {
  if (!child || child.exitCode !== null) return;
  const current = child;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(current.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // A graceful shutdown can win the race while escalation is being prepared.
      // The exit wait below is the authority on whether the temporary child ended.
    }
  } else {
    current.kill("SIGKILL");
  }
  if (!await waitForExit(current)) {
    // Node can still deliver a process signal on Windows after taskkill has
    // already raced with a graceful shutdown request.
    current.kill("SIGKILL");
    if (!await waitForExit(current)) throw new Error("Temporary launcher did not exit after the forced-stop request.");
  }
  child = undefined;
}

async function stopServer() {
  if (!child || child.exitCode !== null) return;
  const current = child;
  current.kill();
  const exited = await Promise.race([
    new Promise(resolve => current.once("exit", resolve)),
    new Promise(resolve => setTimeout(() => resolve(false), 5000)),
  ]);
  if (exited === false && current.exitCode === null) await forceStopServer();
  child = undefined;
}

async function createWorkspace(port, name) {
  const response = await fetch(`http://127.0.0.1:${port}/api/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ name, description: "Abrupt shutdown durability acceptance." }),
  });
  assert.equal(response.status, 201, "temporary launcher must persist the workspace before forced termination");
  return response.json();
}

async function createGoalSession(port, taskId, rawGoalText) {
  const response = await fetch(`http://127.0.0.1:${port}/api/completion/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify({ taskId, rawGoalText }),
  });
  assert.equal(response.status, 201, "temporary launcher must persist the goal session before forced termination");
  return response.json();
}

function assertSnapshotIsReadable(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));
  assert.ok(snapshot && typeof snapshot === "object", "snapshot must parse to an object after abrupt termination");
  assert.equal(snapshot.schemaVersion, CURRENT_WORKSPACE_SNAPSHOT_SCHEMA_VERSION, "snapshot must retain the current schema after abrupt termination");
  return true;
}

try {
  const port = await availablePort();
  await startServer(port);
  const committed = await createWorkspace(port, "Committed before forced shutdown");
  const committedGoal = await createGoalSession(
    port,
    "committed-goal-before-forced-shutdown",
    "Keep this durable goal plan available after an abrupt local launcher shutdown.",
  );
  // The second saved session creates a known-good completion-session backup.
  await createGoalSession(
    port,
    "second-goal-before-forced-shutdown",
    "Create a completion-session backup before the forced shutdown test.",
  );

  // Start a second mutation, then terminate the real launcher rather than asking it to shut down.
  // Attach the expected connection-reset handler before terminating the process:
  // Node treats a rejected fetch without an immediate handler as an unhandled rejection.
  const racingWrite = createWorkspace(port, "Mutation racing forced shutdown").catch(() => undefined);
  await new Promise(resolve => setTimeout(resolve, 1));
  await forceStopServer();
  await racingWrite;

  const primaryPath = path.join(dataDirectory, "workspace.json");
  const backupPath = `${primaryPath}.bak`;
  const primaryReadable = assertSnapshotIsReadable(primaryPath);
  const backupReadable = assertSnapshotIsReadable(backupPath);
  assert.ok(primaryReadable || backupReadable, "a forced-stop must leave a readable primary or backup snapshot");

  await startServer(port);
  const workspaces = await (await fetch(`http://127.0.0.1:${port}/api/workspaces`, { headers: { Connection: "close" } })).json();
  assert.ok(
    workspaces.some(workspace => workspace.id === committed.id && workspace.name === "Committed before forced shutdown"),
    "a workspace confirmed before forced termination must survive recovery",
  );
  const restoredGoal = await (await fetch(
    `http://127.0.0.1:${port}/api/completion/sessions/${encodeURIComponent(committedGoal.taskId)}`,
    { headers: { Connection: "close" } },
  )).json();
  assert.equal(restoredGoal.taskId, committedGoal.taskId, "a goal session confirmed before forced termination must survive recovery");
  console.log("PASS: forced termination of a live launcher recovered both the previously committed workspace and goal session.");
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
} finally {
  await stopServer();
  fs.rmSync(dataDirectory, { recursive: true, force: true });
}
