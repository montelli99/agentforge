import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OpenClawGatewayTransport } from "./openClawGatewayTransport.js";
class Socket extends EventTarget {
  static OPEN = 1;
  static CONNECTING = 0;
  static latest: Socket;
  readyState = 1;
  sent: any[] = [];
  constructor(_url: string) { super(); Socket.latest = this; }
  send(raw: string) { this.sent.push(JSON.parse(raw)); }
  close() { this.readyState = 3; this.dispatchEvent(new Event("close")); }
  receive(frame: unknown) { this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(frame) })); }
}
const dirs: string[] = [];
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });
function setup(enableTaskDelegation = false) {
  vi.stubGlobal("WebSocket", Socket);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-handshake-")); dirs.push(dir);
  const client = new OpenClawGatewayTransport({ url: "ws://127.0.0.1:18789", identityPath: path.join(dir, "device.json"), enableTaskDelegation });
  client.start(); return { client, socket: Socket.latest };
}
function authenticate(socket: Socket, admin = false) {
  socket.receive({ type: "event", event: "connect.challenge", payload: { nonce: "test-challenge", ts: 123456789 } });
  socket.receive({ type: "res", id: socket.sent[0].id, ok: true, payload: { type: "hello-ok", protocol: 4, auth: { role: "operator", scopes: ["operator.read", "operator.write", ...(admin ? ["operator.admin"] : [])] } } });
}
describe("gateway authentication and interrupted delivery", () => {
  it("requires the matching challenge response before sends or inbound events", async () => {
    const { client, socket } = setup(); const inbound = vi.fn(); client.subscribe(inbound);
    expect(client.isConnected()).toBe(false); expect(client.isConnecting()).toBe(true);
    expect(socket.sent).toHaveLength(0);
    socket.receive({ type: "res", id: "unrelated", ok: true, payload: { type: "hello-ok", protocol: 4, auth: { role: "operator", scopes: ["operator.read", "operator.write"] } } });
    socket.receive({ type: "event", event: "chat", payload: { text: "untrusted", chatId: 1 } });
    expect(inbound).not.toHaveBeenCalled();
    await expect(client.sendMessage(1, "test")).rejects.toThrow(/authentication/);
    authenticate(socket); expect(client.isConnected()).toBe(true);
    const result = client.sendMessage(1, "test");
    socket.receive({ type: "res", id: socket.sent[1].id, ok: true, payload: { messageId: 42 } });
    await expect(result).resolves.toBe(42); client.stop();
  });
  it("rejects pending work on stop and ignores the old socket after restart", async () => {
    const { client, socket } = setup(); authenticate(socket);
    const result = client.sendMessage(1, "test"); const rejected = expect(result).rejects.toThrow(/uncertain/);
    client.stop(); await rejected; client.start(); const next = Socket.latest;
    socket.close(); expect(client.isConnecting()).toBe(true);
    authenticate(next); expect(client.isConnected()).toBe(true); expect(next.sent).toHaveLength(1); client.stop();
  });
  it("reports an uncertain timeout without retrying the message", async () => {
    vi.useFakeTimers(); const { client, socket } = setup(); authenticate(socket);
    const result = client.sendMessage(1, "test"); const rejected = expect(result).rejects.toThrow(/uncertain/);
    await vi.advanceTimersByTimeAsync(30_000); await rejected;
    expect(socket.sent).toHaveLength(2); client.stop();
  });
});

describe("gateway failure boundaries", () => {
  it("bounds missing challenge and failed authentication", async () => {
    vi.useFakeTimers(); const { client, socket } = setup();
    socket.receive(null); socket.receive([]);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(client.isConnecting()).toBe(false); expect(socket.sent).toHaveLength(0);
    client.start(); const next = Socket.latest;
    next.receive({ type: "event", event: "connect.challenge", payload: { nonce: "test", ts: 123456789 } });
    next.receive({ type: "res", id: next.sent[0].id, ok: false });
    expect(client.isConnected()).toBe(false); expect(client.isConnecting()).toBe(false);
  });
  it("does not invent a receipt for an acknowledged send with no message ID", async () => {
    const { client, socket } = setup(); authenticate(socket);
    const sent = client.sendMessage(1, "test");
    socket.receive({ type: "res", id: socket.sent[1].id, ok: true, payload: {} });
    await expect(sent).rejects.toThrow(/no valid message receipt/); client.stop();
  });
  it("rejects pending sends on a network error and allows a fresh handshake", async () => {
    const { client, socket } = setup(); authenticate(socket);
    const sent = client.sendMessage(1, "test");
    socket.dispatchEvent(new Event("error"));
    await expect(sent).rejects.toThrow(/uncertain/);
    expect(client.isConnected()).toBe(false);
    client.start(); authenticate(Socket.latest); expect(client.isConnected()).toBe(true); client.stop();
  });
});

describe("current gateway protocol contract", () => {
  it("uses protocol 4 and the server challenge time rather than the local clock", () => {
    const { client, socket } = setup(); authenticate(socket);
    expect(socket.sent[0].params).toMatchObject({ minProtocol: 4, maxProtocol: 4, device: { signedAt: 123456789, nonce: "test-challenge" } }); client.stop();
  });
  it.each([undefined, -1, 1.5, "123"])("rejects an invalid challenge timestamp %s", ts => {
    const { client, socket } = setup();
    socket.receive({ type: "event", event: "connect.challenge", payload: { nonce: "test", ts } });
    expect(socket.sent).toHaveLength(0); expect(client.isConnecting()).toBe(false);
  });
  it("does not send under a read-only grant", async () => {
    const { client, socket } = setup();
    socket.receive({ type: "event", event: "connect.challenge", payload: { nonce: "test", ts: 123 } });
    socket.receive({ type: "res", id: socket.sent[0].id, ok: true, payload: { type: "hello-ok", protocol: 4, auth: { role: "operator", scopes: ["operator.read"] } } });
    expect(client.isConnected()).toBe(true);
    await expect(client.sendMessage(1, "test")).rejects.toThrow(/write permission/);
    expect(socket.sent).toHaveLength(1); client.stop();
  });
});

it('lists bounded metadata without transcript import or implicit session selection', async()=>{
 const {client,socket}=setup();authenticate(socket);
 const page=client.listSessions(2,4);
 expect(socket.sent[1]).toMatchObject({method:'sessions.list',params:{limit:2,offset:4,rowMode:'compact'}});
 socket.receive({type:'res',id:socket.sent[1].id,ok:true,payload:{sessions:[{key:'agent:main:chosen',displayName:'Chosen agent',messages:['not imported']}],nextOffset:8}});
 expect(await page).toEqual({sessions:[{key:'agent:main:chosen',name:'Chosen agent'}],nextOffset:8});
 await expect(client.listSessions(101)).rejects.toThrow(/bounds/);
 const bad=client.listSessions();
 socket.receive({type:'res',id:socket.sent[2].id,ok:true,payload:{sessions:[{key:'same'},{key:'same'}]}});
 await expect(bad).rejects.toThrow(/duplicate/);
 expect(socket.sent).toHaveLength(3);client.stop();
});

it('reads only the selected session and preserves unknown active-run state', async () => {
  const {client, socket} = setup(); authenticate(socket);
  const result = client.readSessionHistory('agent:main:synthetic-probe', 10);
  expect(socket.sent[1]).toMatchObject({method: 'chat.history', params: {sessionKey: 'agent:main:synthetic-probe', limit: 10}});
  socket.receive({type: 'res', id: socket.sent[1].id, ok: true, payload: {messages: [], sessionInfo: {hasActiveRun: true}}});
  expect(await result).toEqual({messages: [], sessionInfo: {hasActiveRun: true}});
  await expect(client.readSessionHistory('')).rejects.toThrow(/explicit/);
  await expect(client.readSessionHistory('selected', 101)).rejects.toThrow(/limit/);
  expect(socket.sent).toHaveLength(2); client.stop();
});

it('retries temporary network failure but stops on rejected authentication', async () => {
  vi.useFakeTimers(); const {client, socket} = setup();
  const ready = client.connectWhenReady(2000);
  socket.dispatchEvent(new Event('error'));
  await vi.advanceTimersByTimeAsync(30);
  const next = Socket.latest;
  expect(next).not.toBe(socket);
  next.receive({type:'event',event:'connect.challenge',payload:{nonce:'test',ts:123}});
  next.receive({type:'res',id:next.sent[0].id,ok:false,error:{code:'UNAUTHORIZED'}});
  const rejected = expect(ready).rejects.toThrow(/rejected/);
  await vi.advanceTimersByTimeAsync(30); await rejected;
  await vi.advanceTimersByTimeAsync(2000); expect(Socket.latest).toBe(next);
});
it('cancels pending startup when explicitly stopped', async () => {
  vi.useFakeTimers(); const {client} = setup();
  const ready = client.connectWhenReady(2000); const rejected = expect(ready).rejects.toThrow(/cancelled/);
  client.stop(); await vi.advanceTimersByTimeAsync(30); await rejected;
  expect(client.isConnecting()).toBe(false);
});

it('binds a turn to an explicit session and durable request ID without external delivery', async () => {
  const {client, socket} = setup(true); authenticate(socket, true);
  const result = client.submitSessionTurn('agent:main:synthetic', 'Synthetic task', 'request_12345');
  expect(socket.sent[1]).toMatchObject({method:'chat.send',params:{sessionKey:'agent:main:synthetic',message:'Synthetic task',idempotencyKey:'request_12345',deliver:false,suppressCommandInterpretation:true}});
  socket.receive({type:'res',id:socket.sent[1].id,ok:true,payload:{runId:'upstream-run-1'}});
  await expect(result).resolves.toEqual({runId:'upstream-run-1'});
  await expect(client.submitSessionTurn('selected','test','')).rejects.toThrow(/durable/);
  expect(socket.sent).toHaveLength(2); client.stop();
});
it('reports a missing run receipt as uncertain rather than completed', async () => {
  const {client, socket} = setup(true); authenticate(socket, true);
  const result = client.submitSessionTurn('agent:main:synthetic', 'Synthetic task', 'request_12345');
  socket.receive({type:'res',id:socket.sent[1].id,ok:true,payload:{status:'accepted'}});
  await expect(result).rejects.toThrow(/uncertain/); expect(socket.sent).toHaveLength(2); client.stop();
});

it('observes only the saved run and never turns a timeout into completion or replay', async () => {
  const {client, socket} = setup(); authenticate(socket);
  const observation = client.inspectRun('saved-run');
  expect(socket.sent[1]).toMatchObject({method:'agent.wait',params:{runId:'saved-run',timeoutMs:0}});
  socket.receive({type:'res',id:socket.sent[1].id,ok:true,payload:{runId:'saved-run',status:'timeout'}});
  await expect(observation).resolves.toEqual({runId:'saved-run',status:'timeout'});
  const wrong = client.inspectRun('saved-run');
  socket.receive({type:'res',id:socket.sent[2].id,ok:true,payload:{runId:'other-run',status:'ok'}});
  await expect(wrong).rejects.toThrow(/mismatched/);
  await expect(client.inspectRun('')).rejects.toThrow(/explicit/);
  expect(socket.sent.slice(1).every(frame=>frame.method==='agent.wait')).toBe(true);
  expect(socket.sent).toHaveLength(3); client.stop();
});

it('scopes Stop to a saved session and run without claiming an unrelated receipt',async()=>{
 const {client,socket}=setup();authenticate(socket);
 const result=client.requestRunStop('selected-session','saved-run');
 expect(socket.sent[1]).toMatchObject({method:'chat.abort',params:{sessionKey:'selected-session',runId:'saved-run',preserveSideRuns:true,discardPendingInput:false}});
 socket.receive({type:'res',id:socket.sent[1].id,ok:true,payload:{ok:true,aborted:true,runIds:['other-run']}});
 await expect(result).resolves.toEqual({acknowledged:false});
 await expect(client.requestRunStop('selected-session','')).rejects.toThrow(/explicit/);
 const matched=client.requestRunStop('selected-session','saved-run');
 socket.receive({type:'res',id:socket.sent[2].id,ok:true,payload:{ok:true,aborted:true,runIds:['saved-run']}});
 await expect(matched).resolves.toEqual({acknowledged:true});client.stop();
});
it('requires both explicit delegation enablement and granted admin scope without weakening suppression',async()=>{
 for(const [enabled,granted] of [[false,false],[true,false],[false,true]]){
  const {client,socket}=setup(enabled);authenticate(socket,granted);
  expect(socket.sent[0].params.scopes.includes('operator.admin')).toBe(enabled);
  await expect(client.submitSessionTurn('chosen','Synthetic task','request_12345')).rejects.toThrow('explicit enablement');
  expect(socket.sent).toHaveLength(1);client.stop();
 }
});
