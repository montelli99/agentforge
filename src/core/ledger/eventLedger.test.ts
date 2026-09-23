/**
 * Section 12: Durable Event Ledger — Idempotency, Concurrency & Replay Tests
 * Section 13: Real-Time Web — SSE Reconnect & Last-Event-ID Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EventLedger } from "./eventLedger.js";
import { AgentForgeWebServer } from "../../server/webServer.js";
import { WorkspaceStore } from "../store/workspaceStore.js";
import http from "node:http";
import net from "node:net";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: find a free port
// ─────────────────────────────────────────────────────────────────────────────
async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      srv.close(() => resolve((addr as net.AddressInfo).port));
    });
    srv.on("error", reject);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 12: EventLedger
// ─────────────────────────────────────────────────────────────────────────────
describe("Section 12: Durable Event Ledger — Idempotency & Concurrency", () => {
  let ledger: EventLedger;

  beforeEach(() => {
    ledger = new EventLedger();
  });

  it("accepts a new event and marks it accepted", async () => {
    const { entry, isDuplicate } = await ledger.recordInboundEvent({
      eventId: "evt-001",
      origin: "telegram",
      eventType: "message",
      payload: { text: "Hello" },
    });
    expect(isDuplicate).toBe(false);
    expect(entry.status).toBe("accepted");
    expect(entry.eventId).toBe("evt-001");
    expect(entry.id).toMatch(/^ledg-/);
  });

  it("is idempotent: duplicate eventId returns the original entry without a new record", async () => {
    const first = await ledger.recordInboundEvent({
      eventId: "evt-dup",
      origin: "discord",
      eventType: "button_click",
      payload: { action: "approve" },
    });
    expect(first.isDuplicate).toBe(false);

    // Same eventId again — must be deduped
    const second = await ledger.recordInboundEvent({
      eventId: "evt-dup",
      origin: "discord",
      eventType: "button_click",
      payload: { action: "approve" },
    });
    expect(second.isDuplicate).toBe(true);
    expect(second.entry.id).toBe(first.entry.id);

    // Only one entry in the ledger
    expect(ledger.getAllEntries()).toHaveLength(1);
  });

  it("handles concurrent duplicate writes idempotently (race simulation)", async () => {
    const eventId = "evt-race";
    // Fire 10 concurrent writes with the same eventId
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        ledger.recordInboundEvent({
          eventId,
          origin: "api",
          eventType: "task_update",
          payload: { taskId: "t-1" },
        })
      )
    );
    // Exactly one should NOT be a duplicate
    const nonDuplicates = results.filter(r => !r.isDuplicate);
    expect(nonDuplicates).toHaveLength(1);
    // All duplicates return the same entry id
    const ids = new Set(results.map(r => r.entry.id));
    expect(ids.size).toBe(1);
    // Only one entry persisted
    expect(ledger.getAllEntries()).toHaveLength(1);
  });

  it("updates event status through valid transitions", async () => {
    const { entry } = await ledger.recordInboundEvent({
      eventId: "evt-status",
      origin: "web",
      eventType: "workspace_created",
      payload: {},
    });
    expect(entry.status).toBe("accepted");

    ledger.updateEventStatus(entry.id, "applied");
    const updated = ledger.getAllEntries().find(e => e.id === entry.id)!;
    expect(updated.status).toBe("applied");
    expect(updated.appliedAt).toBeDefined();
  });

  it("records error reason on failure transition", async () => {
    const { entry } = await ledger.recordInboundEvent({
      eventId: "evt-fail",
      origin: "cli",
      eventType: "agent_run",
      payload: {},
    });
    ledger.updateEventStatus(entry.id, "failed", "Timeout after 30s");
    const failed = ledger.getAllEntries().find(e => e.id === entry.id)!;
    expect(failed.status).toBe("failed");
    expect(failed.error).toBe("Timeout after 30s");
  });

  it("replays events filtered by origin and eventType", async () => {
    await ledger.recordInboundEvent({ eventId: "e1", origin: "telegram", eventType: "message", payload: {} });
    await ledger.recordInboundEvent({ eventId: "e2", origin: "discord", eventType: "message", payload: {} });
    await ledger.recordInboundEvent({ eventId: "e3", origin: "telegram", eventType: "task_update", payload: {} });
    await ledger.recordInboundEvent({ eventId: "e4", origin: "api", eventType: "message", payload: {} });

    const telegramMessages = ledger.replayEvents({ origin: "telegram", eventType: "message" });
    expect(telegramMessages).toHaveLength(1);
    expect(telegramMessages[0].eventId).toBe("e1");

    const allTelegram = ledger.replayEvents({ origin: "telegram" });
    expect(allTelegram).toHaveLength(2);
  });

  it("persists and restores state correctly across a simulated restart", async () => {
    await ledger.recordInboundEvent({ eventId: "e-persist-1", origin: "web", eventType: "created", payload: { x: 1 } });
    await ledger.recordInboundEvent({ eventId: "e-persist-2", origin: "api", eventType: "deleted", payload: { x: 2 } });

    // Simulate snapshot round-trip
    const snapshot = { entries: ledger.getAllEntries(), bindings: ledger.getAllBindings() };

    const restoredLedger = new EventLedger();
    restoredLedger.restore(snapshot.entries, snapshot.bindings);

    // Duplicate check must work after restore
    const dup = await restoredLedger.recordInboundEvent({
      eventId: "e-persist-1",
      origin: "web",
      eventType: "created",
      payload: {},
    });
    expect(dup.isDuplicate).toBe(true);

    // All entries are present
    expect(restoredLedger.getAllEntries()).toHaveLength(2);
  });

  it("manages external bindings — register, find, list", () => {
    const binding = ledger.registerBinding({
      provider: "telegram",
      externalChannelId: "tg-chat-99",
      agentforgeWorkspaceId: "ws-1",
      agentforgeChannelId: "ch-1",
      syncDirection: "bidirectional",
      syncState: "active",
    });
    expect(binding.id).toMatch(/^bind-/);

    const found = ledger.findBinding("telegram", "tg-chat-99");
    expect(found).toBeDefined();
    expect(found!.agentforgeWorkspaceId).toBe("ws-1");

    // Unknown binding returns undefined
    expect(ledger.findBinding("discord", "tg-chat-99")).toBeUndefined();

    // All bindings
    expect(ledger.getAllBindings()).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 13: Real-Time Web — SSE Reconnect & Last-Event-ID
// ─────────────────────────────────────────────────────────────────────────────
describe("Section 13: Real-Time Web — SSE Event IDs & Last-Event-ID Reconnect", () => {
  let server: AgentForgeWebServer;
  let store: WorkspaceStore;
  let port: number;

  beforeEach(async () => {
    port = await getFreePort();
    store = new WorkspaceStore();
    server = new AgentForgeWebServer(store, port);
    await server.start();

    // Emit a few events to populate the ring-buffer BEFORE any client connects
    store.emit("workspace_created", "workspace", { id: "ws-test-1" });
    store.emit("task_created", "task", { id: "t-test-1" });
    store.emit("message_created", "message", { id: "msg-test-1" });
    // Give the sync emit loop a tick
    await new Promise(r => setImmediate(r));
  }, 10000);

  afterEach(async () => {
    await server.stop();
  });

  it("GET /api/realtime returns Content-Type: text/event-stream", async () => {
    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.request(
        { hostname: "127.0.0.1", port, path: "/api/realtime", method: "GET" },
        resolve
      );
      req.on("error", reject);
      req.end();
    });
    expect(res.headers["content-type"]).toContain("text/event-stream");
    res.destroy();
  });

  it("ring-buffer tracks events emitted before a client connects", () => {
    // We emitted 3 events in beforeEach
    const missed = server.getSseEventsAfter(0);
    expect(missed.length).toBeGreaterThanOrEqual(3);
    // First event has id=1 (sequence starts at 1)
    expect(missed[0].id).toBeGreaterThanOrEqual(1);
  });

  it("getSseEventsAfter(lastId) returns only events after that ID", () => {
    const all = server.getSseEventsAfter(0);
    expect(all.length).toBeGreaterThanOrEqual(3);

    const afterFirst = server.getSseEventsAfter(1);
    // All returned IDs must be > 1
    expect(afterFirst.every(e => e.id > 1)).toBe(true);
    expect(afterFirst.length).toBe(all.length - 1);
  });

  it("Last-Event-ID header triggers replay of missed events in SSE response", async () => {
    // Get the current highest event ID seen
    const allSoFar = server.getSseEventsAfter(0);
    const lastSeenId = allSoFar.length > 0 ? allSoFar[allSoFar.length - 1].id : 0;

    // Emit one more event so there's exactly 1 to replay
    store.emit("agent_updated", "agent", { id: "agent-sse-test" });
    await new Promise(r => setImmediate(r));

    // Reconnect with Last-Event-ID
    const responseBody = await new Promise<string>((resolve, reject) => {
      const chunks: string[] = [];
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/realtime",
          method: "GET",
          headers: { "last-event-id": String(lastSeenId) },
        },
        res => {
          res.on("data", (chunk: Buffer) => {
            chunks.push(chunk.toString());
            const body = chunks.join("");
            // Once we have enough data containing the missed event, abort
            if (body.includes("agent_updated")) {
              res.destroy();
            }
          });
          res.on("close", () => resolve(chunks.join("")));
          res.on("error", () => resolve(chunks.join("")));
        }
      );
      req.on("error", reject);
      req.end();
      // Timeout safety — close after 3s
      setTimeout(() => req.destroy(), 3000);
    });

    // The replayed event should appear before the connection joins live set
    expect(responseBody).toContain("agent_updated");
  }, 10000);

  it("ring-buffer caps at SSE_RING_BUFFER_SIZE (500) — oldest events evicted", () => {
    // Fill the buffer beyond capacity
    for (let i = 0; i < 510; i++) {
      store.emit("task_created", "task", { id: `t-bulk-${i}` });
    }
    const all = server.getSseEventsAfter(0);
    // Should be at most 500
    expect(all.length).toBeLessThanOrEqual(500);
    // Oldest event ID should be > 1 (evicted)
    if (all.length > 0) {
      expect(all[0].id).toBeGreaterThan(1);
    }
  });
});
