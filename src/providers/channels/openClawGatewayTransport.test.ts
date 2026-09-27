import { describe, expect, it } from "vitest";
import { OpenClawGatewayTransport } from "./openClawGatewayTransport.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("OpenClawGatewayTransport", () => {
  it("rejects non-loopback plaintext gateways", () => {
    expect(() => new OpenClawGatewayTransport({ url: "ws://gateway.example", identityPath: path.join(os.tmpdir(), "agentforge-test-device.json") })).toThrow(/wss/);
  });

  it("creates a local device identity without provider credentials", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-gateway-")), "device.json");
    const transport = new OpenClawGatewayTransport({ url: "ws://127.0.0.1:18789", identityPath: file });
    expect(transport.isConnected()).toBe(false);
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toMatchObject({ deviceId: expect.any(String), publicKeyPem: expect.any(String) });
  });
});
