/**
 * AgentForge vNext Web Control Plane Launcher
 */

import { AgentForgeWebServer } from "./webServer.js";

const port = parseInt(process.env.PORT || "3000", 10);
const server = new AgentForgeWebServer(undefined, port);

server.start().catch(err => {
  console.error("Failed to start AgentForge vNext Web Server:", err);
  process.exit(1);
});
