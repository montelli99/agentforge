/** Explicit disposable-target handshake probe. Never sends chat or starts inference. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { OpenClawGatewayTransport } from "../src/providers/channels/openClawGatewayTransport.js";

const url = process.argv[2];
if (!url) throw new Error("Provide an explicit disposable loopback gateway WebSocket URL.");
const target = new URL(url);
if (target.protocol !== "ws:" || !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) || target.username || target.password) {
  throw new Error("This acceptance probe accepts a disposable loopback target only.");
}
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-upstream-handshake-"));
const client = new OpenClawGatewayTransport({ url, token: process.env.AGENTFORGE_PROBE_GATEWAY_TOKEN, identityPath: path.join(directory, "identity.json") });
try {
  const started = Date.now();
  client.start();
  while (!client.isConnected() && client.isConnecting() && Date.now() - started < 35_000) await delay(50);
  if (!client.isConnected()) throw new Error("Disposable upstream gateway did not authenticate; inspect its disposable server log. No chat sent.");
  console.log(JSON.stringify({ passed: true, proof: "authenticated-upstream-handshake", protocol: 4, elapsedMs: Date.now() - started, inferenceStarted: false, messageSent: false, delegationVerified: false }));
} finally {
  client.stop();
  fs.rmSync(directory, { recursive: true, force: true });
}
