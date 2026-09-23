import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { WorkspaceStore } from "../store/workspaceStore.js";
import { GENESIS_AUDIT_HASH, computeAuditHash } from "../types/audit.js";
import { AgentForgeWebServer } from "../../server/webServer.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("Section 34: Activity & Cryptographic Audit Trail", () => {
  let store: WorkspaceStore;

  beforeEach(() => {
    store = new WorkspaceStore();
  });

  it("chains audit entries deterministically using SHA-256 and genesis hash", () => {
    const entry1 = store.recordAudit({
      origin: "web",
      actorId: "user-alice",
      actorType: "user",
      action: "task.created",
      targetType: "task",
      targetId: "task-001",
      details: { priority: "high" },
    });

    expect(entry1.previousHash).toBe(GENESIS_AUDIT_HASH);
    expect(entry1.hash).toBeDefined();
    expect(entry1.hash).toHaveLength(64);

    const entry2 = store.recordAudit({
      origin: "system",
      actorId: "system-scheduler",
      actorType: "system",
      action: "task.assigned",
      targetType: "task",
      targetId: "task-001",
      details: { agentId: "agent-bob" },
    });

    expect(entry2.previousHash).toBe(entry1.hash);
    expect(entry2.hash).toBeDefined();
    expect(entry2.hash).not.toBe(entry1.hash);

    const entry3 = store.recordAudit({
      origin: "discord",
      actorId: "user-carol",
      actorType: "user",
      action: "approval.resolved",
      targetType: "approval",
      targetId: "appr-001",
      details: { status: "approved" },
    });

    expect(entry3.previousHash).toBe(entry2.hash);

    const verification = store.verifyAuditChain();
    expect(verification.valid).toBe(true);
    expect(verification.totalEntries).toBe(3);
  });

  it("detects tampering when an audit entry is mutated", () => {
    store.recordAudit({
      origin: "web",
      actorId: "user-1",
      actorType: "user",
      action: "config.changed",
      targetType: "workspace",
      targetId: "ws-1",
      details: { key: "auth_mode", value: "strict" },
    });

    store.recordAudit({
      origin: "api",
      actorId: "user-2",
      actorType: "user",
      action: "deploy.triggered",
      targetType: "system",
      targetId: "staging",
      details: { version: "v1.2.3" },
    });

    store.recordAudit({
      origin: "system",
      actorId: "system",
      actorType: "system",
      action: "deploy.completed",
      targetType: "system",
      targetId: "staging",
      details: { status: "ok" },
    });

    expect(store.verifyAuditChain().valid).toBe(true);

    // Maliciously tamper with the details of the second entry
    const entries = store.listAuditEntries(10);
    entries[1].details.version = "v9.9.9-backdoor";

    const tamperedCheck = store.verifyAuditChain();
    expect(tamperedCheck.valid).toBe(false);
    expect(tamperedCheck.brokenAtIndex).toBe(1);
    expect(tamperedCheck.reason).toContain("hash mismatch");
  });

  it("detects broken chain when an entry previousHash is severed", () => {
    store.recordAudit({
      origin: "cli",
      actorId: "admin",
      actorType: "user",
      action: "secret.rotated",
      targetType: "system",
      targetId: "db-secret",
      details: {},
    });

    store.recordAudit({
      origin: "agent",
      actorId: "agent-1",
      actorType: "agent",
      action: "task.started",
      targetType: "task",
      targetId: "task-1",
      details: {},
    });

    const entries = store.listAuditEntries(10);
    entries[1].previousHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    const brokenCheck = store.verifyAuditChain();
    expect(brokenCheck.valid).toBe(false);
    expect(brokenCheck.brokenAtIndex).toBe(1);
    expect(brokenCheck.reason).toContain("previousHash mismatch");
  });

  it("prunes audit trail safely while preserving cryptographic integrity with pruned checkpoint anchor", () => {
    for (let i = 1; i <= 5; i++) {
      store.recordAudit({
        origin: "system",
        actorId: "cron",
        actorType: "system",
        action: `heartbeat.${i}`,
        targetType: "system",
        targetId: `node-${i}`,
        details: { seq: i },
      });
    }

    expect(store.listAuditEntries(10)).toHaveLength(5);
    expect(store.verifyAuditChain().valid).toBe(true);

    // Prune to retain only the last 2 entries
    const pruneResult = store.pruneAuditTrail({ maxEntries: 2 });
    expect(pruneResult.prunedCount).toBe(3);
    expect(pruneResult.remainingCount).toBe(2);

    const checkpoint = store.getAuditCheckpoint();
    expect(checkpoint).toBeDefined();
    expect(checkpoint?.prunedCount).toBe(3);
    expect(checkpoint?.lastPrunedHash).toBeDefined();

    // The remaining chain must still be cryptographically valid!
    const postPruneVerification = store.verifyAuditChain();
    expect(postPruneVerification.valid).toBe(true);
    expect(postPruneVerification.totalEntries).toBe(2);

    // And adding a new entry continues the unbroken cryptographic chain
    const newEntry = store.recordAudit({
      origin: "agent",
      actorId: "agent-3",
      actorType: "agent",
      action: "task.finish",
      targetType: "task",
      targetId: "task-99",
      details: {},
    });

    const currentEntries = store.listAuditEntries(10);
    expect(newEntry.previousHash).toBe(currentEntries[currentEntries.length - 2].hash);
    expect(store.verifyAuditChain().valid).toBe(true);
  });

  it("persists and restores audit chain and pruned checkpoint across snapshots", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "af-audit-test-"));
    const snapPath = path.join(tmpDir, "workspace.json");

    try {
      const persistingStore = new WorkspaceStore(snapPath);

      persistingStore.recordAudit({
        origin: "web",
        actorId: "alice",
        actorType: "user",
        action: "login",
        targetType: "user",
        targetId: "alice",
        details: { ip: "127.0.0.1" },
      });
      persistingStore.recordAudit({
        origin: "web",
        actorId: "alice",
        actorType: "user",
        action: "task.create",
        targetType: "task",
        targetId: "task-persisted",
        details: {},
      });

      persistingStore.pruneAuditTrail({ maxEntries: 1 });
      expect(persistingStore.verifyAuditChain().valid).toBe(true);

      // Restore in a fresh store
      const loadedStore = new WorkspaceStore(snapPath);
      expect(loadedStore.listAuditEntries(10)).toHaveLength(1);
      expect(loadedStore.getAuditCheckpoint()?.prunedCount).toBe(1);
      expect(loadedStore.verifyAuditChain().valid).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("filters audit query results by origin, actorId, and targetType", () => {
    store.recordAudit({
      origin: "web",
      actorId: "user-bob",
      actorType: "user",
      action: "edit",
      targetType: "task",
      targetId: "task-10",
      details: {},
    });

    store.recordAudit({
      origin: "telegram",
      actorId: "user-bob",
      actorType: "user",
      action: "message",
      targetType: "channel",
      targetId: "chan-1",
      details: {},
    });

    store.recordAudit({
      origin: "system",
      actorId: "system",
      actorType: "system",
      action: "clean",
      targetType: "system",
      targetId: "sys",
      details: {},
    });

    const webEntries = store.listAuditEntries({ origin: "web" });
    expect(webEntries).toHaveLength(1);
    expect(webEntries[0].origin).toBe("web");

    const bobEntries = store.listAuditEntries({ actorId: "user-bob" });
    expect(bobEntries).toHaveLength(2);

    const systemTargetEntries = store.listAuditEntries({ targetType: "system" });
    expect(systemTargetEntries).toHaveLength(1);
  });
});
