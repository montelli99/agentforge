// AgentForge watchdog — keeps AgentForge running on :3000.
// Auto-restarts if the process dies. Checks every 30 seconds.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const AGENTFORGE_DIR = path.resolve(process.env.AGENTFORGE_DIR ?? path.join(SCRIPT_DIRECTORY, ".."));
const ENTRY_POINT = path.join(AGENTFORGE_DIR, "src", "server", "start.ts");
const NODE_EXE = process.env.NODE_EXE ?? process.execPath;
const LOG_DIR = path.join(os.homedir(), ".agentforge", "logs");

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
    `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress`,
  ], { encoding: "utf8" });
  if (ps.status !== 0 || !ps.stdout?.trim()) return null;
  try {
    const parsed = JSON.parse(ps.stdout);
    const processes = Array.isArray(parsed) ? parsed : [parsed];
    const match = processes.find(value =>
      typeof value === "object" && value !== null
      && "ProcessId" in value && typeof value.ProcessId === "number"
      && "CommandLine" in value && typeof value.CommandLine === "string"
      && value.CommandLine.toLowerCase().includes(ENTRY_POINT.toLowerCase()));
    return match && "ProcessId" in match && typeof match.ProcessId === "number" ? match.ProcessId : null;
  } catch {
    return null;
  }
}

async function startAgentForge() {
  await fs.access(ENTRY_POINT);
  await fs.mkdir(LOG_DIR, { recursive: true });
  const out = await fs.open(path.join(LOG_DIR, "agentforge-watchdog.log"), "a");
  const err = await fs.open(path.join(LOG_DIR, "agentforge-watchdog.err.log"), "a");
  const child = spawn(NODE_EXE, ["--import", "tsx", ENTRY_POINT], {
    cwd: AGENTFORGE_DIR,
    env: { ...process.env, PORT: String(PORT), AGENTFORGE_HOST: "127.0.0.1" },
    detached: true,
    stdio: ["ignore", out.fd, err.fd],
    windowsHide: true,
  });
  await Promise.all([out.close(), err.close()]);
  child.unref();
  console.log(`[agentforge-watchdog] started pid=${child.pid ?? "unknown"}`);
}

async function main() {
  if (process.platform !== "win32") {
    throw new Error("The AgentForge process watchdog currently supports Windows only.");
  }
  if (!Number.isSafeInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error("PORT must be a valid TCP port number.");
  }
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
