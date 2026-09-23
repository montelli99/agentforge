/**
 * AgentForge vNext Web Control Plane Launcher
 */

import http from "node:http";
import path from "node:path";
import { AgentForgeWebServer } from "./webServer.js";
import { getDefaultWorkspaceFilePath, WorkspaceStore } from "../core/store/workspaceStore.js";
import { CompletionEngine } from "../core/completion/completionEngine.js";
import { JsonCompletionSessionStore } from "../core/completion/completionSessionStore.js";

const port = parseInt(process.env.PORT || "3000", 10);
const workspaceFilePath = getDefaultWorkspaceFilePath();
const completionStorePath = path.join(path.dirname(workspaceFilePath), "completion-sessions.json");
const server = new AgentForgeWebServer(
  new WorkspaceStore(workspaceFilePath),
  port,
  new CompletionEngine(undefined, new JsonCompletionSessionStore(completionStorePath)),
);

// Start autonomous task worker runtime
server.taskWorkerRuntime.start();

server.start().then(() => {
  const workerReady = server.taskWorkerRuntime.canExecuteTasks() && server.taskWorkerRuntime.isRunning();
  console.log(workerReady
    ? `[AgentForge vNext] TaskWorkerRuntime active with ${server.taskWorkerRuntime.getActiveWorkerCount()} workers.`
    : `[AgentForge vNext] Task execution is offline: ${server.taskWorkerRuntime.getExecutionBlockReason() || "worker stopped"}`);

  // Dual-port forwarder on 3460 to preserve existing user browser tab
  if (port !== 3460) {
    try {
      const secondaryServer = http.createServer((req, res) => {
        const proxyReq = http.request({
          hostname: "127.0.0.1",
          port: port,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: `127.0.0.1:${port}` },
        }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });
        proxyReq.on("error", (proxyErr) => {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end(`Secondary proxy to port ${port} failed: ${(proxyErr as Error).message}`);
        });
        req.pipe(proxyReq, { end: true });
      });
      secondaryServer.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          console.log(`[AgentForge vNext] Port 3460 is already in use; primary active on http://127.0.0.1:${port}`);
        } else {
          console.warn("[AgentForge vNext] Secondary listener error:", err.message);
        }
      });
      secondaryServer.listen(3460, "127.0.0.1", () => {
        console.log(`[AgentForge vNext] Secondary listener active at http://127.0.0.1:3460/ (preserving user browser tabs)`);
      });
    } catch (secErr) {
      console.warn("[AgentForge vNext] Could not start secondary 3460 listener:", secErr);
    }
  }
}).catch(err => {
  console.error("Failed to start AgentForge vNext Web Server:", err);
  process.exit(1);
});
