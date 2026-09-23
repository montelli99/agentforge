import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.AGENTFORGE_PORT || "3000", 10);

// Import server.ts to start the server
await import("./server.js");

// Keep process alive
setInterval(() => {}, 1000 * 60 * 60);
