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

it("preserves a corrupt identity rather than silently replacing it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-identity-"));
  try {
    const file = path.join(dir, "device.json"); fs.writeFileSync(file, "broken identity");
    expect(() => new OpenClawGatewayTransport({ url: "ws://127.0.0.1:18789", identityPath: file })).toThrow(/existing file preserved/);
    expect(fs.readFileSync(file, "utf8")).toBe("broken identity");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
it("reuses valid identity bytes and rejects a mismatched fingerprint", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-identity-"));
  try {
    const file = path.join(dir, "device.json"); const options = { url: "ws://127.0.0.1:18789", identityPath: file };
    new OpenClawGatewayTransport(options); const original = fs.readFileSync(file, "utf8");
    new OpenClawGatewayTransport(options); expect(fs.readFileSync(file, "utf8")).toBe(original);
    const tampered = JSON.parse(original); tampered.deviceId = "invalid";
    fs.writeFileSync(file, JSON.stringify(tampered)); const before = fs.readFileSync(file, "utf8");
    expect(() => new OpenClawGatewayTransport(options)).toThrow(/existing file preserved/);
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

it('binds recovery to stable gateway configuration without exposing credentials',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agentforge-binding-'));
 try{
  const options={url:'ws://127.0.0.1:18789',token:'synthetic-token',identityPath:path.join(dir,'device.json')};
  const original=new OpenClawGatewayTransport(options), id=original.getConnectionId();
  expect(new OpenClawGatewayTransport({...options,url:options.url+'/'}).getConnectionId()).toBe(id);
  expect(new OpenClawGatewayTransport({...options,token:'changed'}).getConnectionId()).not.toBe(id);
  expect(new OpenClawGatewayTransport({...options,url:'ws://127.0.0.1:18790'}).getConnectionId()).not.toBe(id);
  expect(new OpenClawGatewayTransport({...options,identityPath:path.join(dir,'other.json')}).getConnectionId()).not.toBe(id);
  options.token='mutated';expect(original.getConnectionId()).toBe(id);
  expect(id).toMatch(/^openclaw-[a-f0-9]{64}$/);
  expect(new OpenClawGatewayTransport({...options,url:'ws://[::1]:18789'}).isConnected()).toBe(false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
