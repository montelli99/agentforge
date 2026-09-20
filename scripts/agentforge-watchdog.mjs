// AgentForge watchdog — keeps AgentForge running on :3000.
// Auto-restarts if the process dies. Checks every 30 seconds.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PORT = 3000;
const AGENTFORGE_DIR = process.env.AGENTFORGE_DIR ?? "C:/Users/mscott/AI_Workspace/OpenClaw/agentforge";
const NODE_EXE = process.env.NODE_EXE ?? "C:\\Program Files\\nodejs\\node.exe";
const LOG_DIR = path.join(os.homedir(), ".openclaw", "logs");

let isShuttingDown = false;

function isListening() {
  const ps = spawnSync("powershell", [
    "-NoProfile",
    "-Command",
    `Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty State`,
  ], { encoding: "utf8" });
  return (ps.stdout ?? "").toLowerCase().includes("listen");
}

function getAgentForgePid() {
  const ps = spawnSync("powershell", [
    "-NoProfile",
    "-Command",
    `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*server.ts*' } | Select-Object -First 1 -ExpandProperty ProcessId`,
  ], { encoding: "utf8" });
  return parseInt((ps.stdout ?? "").trim(), 10) || null;
}

async function startAgentForge() {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const out = await fs.open(path.join(LOG_DIR, "agentforge-watchdog.log"), "a");
  const err = await fs.open(path.join(LOG_DIR, "agentforge-watchdog.err.log"), "a");
  const child = spawn(NODE_EXE, ["--import", "tsx", "src/server.ts"], {
    cwd: AGENTFORGE_DIR,
    detached: true,
    stdio: ["ignore", out.fd, err.fd],
    windowsHide: true,
  });
  child.unref();
  console.log(`[agentforge-watchdog] started pid=${child.pid ?? "unknown"}`);
}

async function main() {
  console.log(`[agentforge-watchdog] starting, monitoring port ${PORT}`);

  while (!isShuttingDown) {
    const listening = isListening();
    const pid = getAgentForgePid();

    if (!listening && !pid) {
      console.log(`[agentforge-watchdog] not running, starting...`);
      try {
        await startAgentForge();
        await new Promise((r) => setTimeout(r, 5000));
      } catch (error) {
        console.error(`[agentforge-watchdog] start failed:`, error);
      }
    } else if (!listening && pid) {
      console.log(`[agentforge-watchdog] pid ${pid} exists but port not listening, killing and restarting`);
      try {
        spawnSync("powershell", ["-NoProfile", "-Command", `Stop-Process -Id ${pid} -Force`], { encoding: "utf8" });
        await new Promise((r) => setTimeout(r, 2000));
      } catch {}
    } else {
      console.log(`[agentforge-watchdog] healthy (pid=${pid})`);
    }

    await new Promise((r) => setTimeout(r, 30000));
  }
}

process.on("SIGINT", () => { isShuttingDown = true; });
process.on("SIGTERM", () => { isShuttingDown = true; });

main().catch((error) => {
  console.error("[agentforge-watchdog] fatal");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
