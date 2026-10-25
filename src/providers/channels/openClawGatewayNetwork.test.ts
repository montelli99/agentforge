import { expect, it } from "vitest";
import { WebSocketServer } from "ws";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { OpenClawGatewayTransport } from "./openClawGatewayTransport.js";

it("authenticates over a real socket and reconnects without replaying an interrupted send", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-network-gateway-"));
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await once(server, "listening");
  const address = server.address();
  if (typeof address === "string" || !address) throw new Error("missing address");
  let authenticated = 0;
  let sends = 0;
  const failures: string[] = [];
  server.on("connection", socket => {
    const ts = Date.now(); const nonce = crypto.randomUUID();
    socket.send(JSON.stringify({ type: "event", event: "connect.challenge", payload: { nonce, ts } }));
    socket.on("message", raw => {
      try {
        const frame = JSON.parse(raw.toString());
        if (frame.method === "connect") {
          const p = frame.params;
          expect(p).toMatchObject({ minProtocol: 4, maxProtocol: 4, device: { nonce, signedAt: ts } });
          const key = crypto.createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(p.device.publicKey, "base64url")]), format: "der", type: "spki" });
          const signed = ["v2", p.device.id, p.client.id, p.client.mode, p.role, p.scopes.join(","), String(ts), "", nonce].join("|");
          expect(crypto.verify(null, Buffer.from(signed), key, Buffer.from(p.device.signature, "base64url"))).toBe(true);
          authenticated++;
          socket.send(JSON.stringify({ type: "res", id: frame.id, ok: true, payload: { type: "hello-ok", protocol: 4, auth: { role: "operator", scopes: ["operator.read", "operator.write"] } } }));
        } else if (frame.method === "send") {
          sends++;
          if (sends === 1) socket.terminate();
          else socket.send(JSON.stringify({ type: "res", id: frame.id, ok: true, payload: { messageId: 81 } }));
        }
      } catch (error) { failures.push(String(error)); socket.terminate(); }
    });
  });
  const client = new OpenClawGatewayTransport({ url: `ws://127.0.0.1:${address.port}`, identityPath: path.join(dir, "device.json") });
  try {
    client.start(); await expect.poll(() => client.isConnected()).toBe(true);
    await expect(client.sendMessage(1, "first synthetic message")).rejects.toThrow(/uncertain/);
    expect(sends).toBe(1);
    client.start(); await expect.poll(() => client.isConnected()).toBe(true);
    expect(authenticated).toBe(2); expect(sends).toBe(1);
    await expect(client.sendMessage(1, "second explicit message")).resolves.toBe(81);
    expect(sends).toBe(2); expect(failures).toEqual([]);
  } finally {
    client.stop(); for (const socket of server.clients) socket.terminate();
    await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(dir, { recursive: true, force: true });
  }
}, 15_000);
