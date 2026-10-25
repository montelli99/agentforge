/** Real-process lost-update check against the built public workspace store. */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createInterface } from "node:readline";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WorkspaceStore } from "../dist/core/store/workspaceStore.js";

if (process.argv[2] === "--child") {
  const store = new WorkspaceStore(process.argv[3]);
  process.stdout.write("READY\n");
  await once(process.stdin, "data");
  try {
    store.createWorkspace({ name: "Stale child", description: "must not replace parent" });
    process.stdout.write("OVERWROTE\n");
    process.exitCode = 1;
  } catch (error) {
    if (!String(error).includes("snapshot changed since this store loaded")) throw error;
    process.stdout.write("CONFLICT\n");
  }
} else {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentforge-concurrency-"));
  let child;
  let deadline;
  try {
    const snapshotPath = path.join(root, "workspace.json");
    const first = new WorkspaceStore(snapshotPath);
    child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--child", snapshotPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    deadline = setTimeout(() => child.kill(), 15_000);
    const exited = once(child, "exit");
    const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
    const ready = await lines.next();
    if (ready.value !== "READY") throw new Error("Second process did not load the workspace");
    const retained = first.createWorkspace({ name: "Parent writer", description: "must survive" });
    child.stdin.end("GO\n");
    const result = await lines.next();
    const [exitCode] = await exited;
    if (result.value !== "CONFLICT" || exitCode !== 0) throw new Error("Stale process was not rejected");
    const restored = new WorkspaceStore(snapshotPath);
    if (restored.getWorkspace(retained.id)?.name !== "Parent writer" ||
      restored.listWorkspaces().some(workspace => workspace.name === "Stale child")) {
      throw new Error("Concurrent writer lost or added workspace data");
    }
    console.log("PASS: a stale second process was rejected and the first process's durable change survived.");
  } finally {
    if (deadline) clearTimeout(deadline);
    if (child && child.exitCode === null) child.kill();
    await rm(root, { recursive: true, force: true });
  }
}
