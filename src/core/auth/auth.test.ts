import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  generateApiKey,
  hasPermission,
  DEFAULT_ROLE_PERMISSIONS,
} from "./authService.js";
import { WorkspaceStore } from "../store/workspaceStore.js";
import { AgentForgeWebServer } from "../../server/webServer.js";

describe("Section 11: Identity, Authentication & Multi-User RBAC", () => {
  describe("Cryptographic Utilities & Permission Matching", () => {
    it("should hash and verify passwords using PBKDF2 with constant-time equality", () => {
      const password = "StrongProductionPassword#2026";
      const { salt, passwordHash } = hashPassword(password);

      expect(salt).toHaveLength(32);
      expect(passwordHash).toHaveLength(128); // 64 bytes in hex

      // Verification succeeds with correct password
      expect(verifyPassword(password, salt, passwordHash)).toBe(true);

      // Verification fails with wrong password
      expect(verifyPassword("WrongPassword", salt, passwordHash)).toBe(false);
    });

    it("should evaluate wildcard and domain permissions correctly", () => {
      // Owner wildcard
      expect(hasPermission(["*"], "tasks:create")).toBe(true);
      expect(hasPermission(["*"], "settings:write")).toBe(true);
      expect(hasPermission(["*"], "anything:arbitrary")).toBe(true);

      // Domain wildcard
      expect(hasPermission(["tasks:*", "agents:read"], "tasks:create")).toBe(true);
      expect(hasPermission(["tasks:*", "agents:read"], "tasks:execute")).toBe(true);
      expect(hasPermission(["tasks:*", "agents:read"], "agents:read")).toBe(true);
      expect(hasPermission(["tasks:*", "agents:read"], "agents:create")).toBe(false);
      expect(hasPermission(["tasks:*", "agents:read"], "settings:write")).toBe(false);

      // Viewer permissions
      const viewerPerms = DEFAULT_ROLE_PERMISSIONS.viewer;
      expect(hasPermission(viewerPerms, "tasks:read")).toBe(true);
      expect(hasPermission(viewerPerms, "tasks:create")).toBe(false);
      expect(hasPermission(viewerPerms, "approvals:decide")).toBe(false);
      expect(hasPermission(viewerPerms, "settings:write")).toBe(false);
    });

    it("should generate cryptographically strong tokens and API keys", () => {
      const sessionToken = generateSessionToken();
      expect(sessionToken.startsWith("af_sess_")).toBe(true);
      expect(sessionToken.length).toBeGreaterThan(40);

      const { rawKey, keyPrefix, keyHash } = generateApiKey();
      expect(rawKey.startsWith("af_key_")).toBe(true);
      expect(keyPrefix.length).toBe(8);
      expect(keyHash).toHaveLength(64);
    });
  });

  describe("WorkspaceStore User & Session Management", () => {
    let store: WorkspaceStore;

    beforeEach(() => {
      store = new WorkspaceStore();
    });

    it("should seed default owner and allow creating and listing multi-tenant users", () => {
      const users = store.listUsers();
      expect(users.length).toBeGreaterThanOrEqual(1);

      const owner = users.find(u => u.role === "owner");
      expect(owner).toBeDefined();
      expect(owner?.username).toBe("owner");

      // Create new engineer
      const engineer = store.createUser({
        username: "dev_lead",
        displayName: "Dev Lead",
        role: "engineer",
        email: "lead@agentforge.dev",
        password: "LeadSecurePassword123!",
      });

      expect(engineer.id).toMatch(/^user-/);
      expect(engineer.role).toBe("engineer");
      expect(engineer.passwordHash).toBeDefined();

      // Duplicate username fails
      expect(() => {
        store.createUser({
          username: "dev_lead",
          displayName: "Duplicate",
          role: "viewer",
        });
      }).toThrow(/already taken/);
    });

    it("should prevent demoting or deleting the last active owner", () => {
      const owner = store.listUsers().find(u => u.role === "owner")!;

      // Demoting sole owner throws
      expect(() => {
        store.updateUser(owner.id, { role: "engineer" });
      }).toThrow(/Cannot demote the only active workspace owner/);

      // Deleting sole owner throws
      expect(() => {
        store.deleteUser(owner.id);
      }).toThrow(/Cannot delete the only active workspace owner/);

      // Once another owner exists, first owner can be updated
      const secondOwner = store.createUser({
        username: "co_owner",
        displayName: "Co-Owner",
        role: "owner",
      });

      expect(() => {
        store.updateUser(owner.id, { role: "admin" });
      }).not.toThrow();

      expect(store.getUser(owner.id)?.role).toBe("admin");
    });

    it("should authenticate users and manage session lifecycles", () => {
      const user = store.createUser({
        username: "alice_operator",
        displayName: "Alice Operator",
        role: "operator",
        password: "AlicePassword#2026",
      });

      // Authentication with wrong credentials fails
      expect(store.authenticateUser("alice_operator", "WrongPassword")).toBeNull();
      expect(store.authenticateUser("nonexistent", "Password")).toBeNull();

      // Authentication with valid credentials succeeds
      const authUser = store.authenticateUser("alice_operator", "AlicePassword#2026");
      expect(authUser).toBeDefined();
      expect(authUser?.id).toBe(user.id);

      // Create session
      const session = store.createSession(user.id, 1); // 1 hour TTL
      expect(session.token).toMatch(/^af_sess_/);

      // Validate session
      const validated = store.validateSession(session.token);
      expect(validated).toBeDefined();
      expect(validated?.userId).toBe(user.id);
      expect(validated?.role).toBe("operator");

      // Revoke session
      expect(store.revokeSession(session.token)).toBe(true);
      expect(store.validateSession(session.token)).toBeNull();
    });

    it("should issue and validate API keys with role inheritance", () => {
      const user = store.createUser({
        username: "ci_bot",
        displayName: "CI Integration Bot",
        role: "engineer",
      });

      const { keyRecord, rawKey } = store.createApiKey(user.id, "CI Runner Key");
      expect(keyRecord.id).toMatch(/^key-/);
      expect(keyRecord.name).toBe("CI Runner Key");

      // Validate raw API key
      const validatedKey = store.validateApiKey(rawKey);
      expect(validatedKey).toBeDefined();
      expect(validatedKey?.userId).toBe(user.id);
      expect(validatedKey?.role).toBe("engineer");

      // Invalid key returns null
      expect(store.validateApiKey("af_key_invalid_random_string")).toBeNull();

      // Revocation
      store.revokeApiKey(keyRecord.id);
      expect(store.validateApiKey(rawKey)).toBeNull();
    });
  });

  describe("AgentForgeWebServer REST Auth & RBAC Endpoints", () => {
    let server: AgentForgeWebServer;
    let port: number;
    let baseUrl: string;

    beforeEach(async () => {
      const store = new WorkspaceStore();
      port = 58000 + Math.floor(Math.random() * 1000);
      server = new AgentForgeWebServer(store, port);
      baseUrl = `http://127.0.0.1:${port}`;
      await server.start();
    });

    afterEach(async () => {
      await server.stop();
    });

    it("should allow login, return session token, and report caller via /api/auth/me", async () => {
      // Create user in store
      server.store.createUser({
        username: "test_engineer",
        displayName: "Test Engineer",
        role: "engineer",
        password: "SecretEngineerPass123!",
      });

      // Login via POST /api/auth/login
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "test_engineer",
          password: "SecretEngineerPass123!",
        }),
      });

      expect(loginRes.status).toBe(200);
      const loginBody = await loginRes.json();
      expect(loginBody.token).toMatch(/^af_sess_/);
      expect(loginBody.user.username).toBe("test_engineer");
      expect(loginBody.user.role).toBe("engineer");

      // Access /api/auth/me with Bearer token
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${loginBody.token}` },
      });
      expect(meRes.status).toBe(200);
      const meBody = await meRes.json();
      expect(meBody.authenticated).toBe(true);
      expect(meBody.user.username).toBe("test_engineer");
      expect(meBody.user.role).toBe("engineer");

      // Logout
      const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${loginBody.token}` },
      });
      expect(logoutRes.status).toBe(200);

      // Token is now invalidated
      const postLogoutMe = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${loginBody.token}` },
      });
      const postLogoutBody = await postLogoutMe.json();
      expect(postLogoutBody.user?.username).not.toBe("test_engineer");
    });

    it("should enforce RBAC gates: forbid viewers from mutating tasks, approvals, or settings", async () => {
      // Create a viewer user and session
      const viewerUser = server.store.createUser({
        username: "read_only_auditor",
        displayName: "Auditor",
        role: "viewer",
        password: "AuditorPassword!2026",
      });
      const session = server.store.createSession(viewerUser.id);
      const viewerHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      };

      // Viewer CAN read tasks (GET /api/tasks)
      const getTasksRes = await fetch(`${baseUrl}/api/tasks`, { headers: viewerHeaders });
      expect(getTasksRes.status).toBe(200);

      // Viewer CANNOT create a task (POST /api/tasks) -> 403 Forbidden
      const createTaskRes = await fetch(`${baseUrl}/api/tasks`, {
        method: "POST",
        headers: viewerHeaders,
        body: JSON.stringify({
          title: "Unauthorized task attempt",
          description: "This should be blocked by RBAC",
        }),
      });
      expect(createTaskRes.status).toBe(403);
      const createErr = await createTaskRes.json();
      expect(createErr.error).toBe("RBAC permission denied");
      expect(createErr.required).toBe("tasks:create");

      // Viewer CANNOT create agents (POST /api/agents) -> 403 Forbidden
      const createAgentRes = await fetch(`${baseUrl}/api/agents`, {
        method: "POST",
        headers: viewerHeaders,
        body: JSON.stringify({
          name: "Rogue Agent",
          role: "Intruder",
        }),
      });
      expect(createAgentRes.status).toBe(403);

      // Viewer CANNOT resolve approvals (POST /api/approvals/resolve) -> 403 Forbidden
      const resolveAppRes = await fetch(`${baseUrl}/api/approvals/resolve`, {
        method: "POST",
        headers: viewerHeaders,
        body: JSON.stringify({
          approvalId: "app-test-1",
          status: "approved",
        }),
      });
      expect(resolveAppRes.status).toBe(403);

      // Viewer CANNOT modify settings (POST /api/settings) -> 403 Forbidden
      const settingsRes = await fetch(`${baseUrl}/api/settings`, {
        method: "POST",
        headers: viewerHeaders,
        body: JSON.stringify({ provider: "rogue-provider" }),
      });
      expect(settingsRes.status).toBe(403);
    });

    it("should authenticate and enforce RBAC via API keys", async () => {
      const engineer = server.store.createUser({
        username: "engineer_bot",
        displayName: "Bot",
        role: "engineer",
      });
      const { rawKey } = server.store.createApiKey(engineer.id, "Engineer Bot Key");

      // Create task with API key -> Succeeds for engineer
      const createTaskRes = await fetch(`${baseUrl}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": rawKey,
        },
        body: JSON.stringify({
          title: "Engineer authorized task",
          status: "backlog",
          priority: "high",
        }),
      });

      expect(createTaskRes.status).toBe(201);
      const created = await createTaskRes.json();
      expect(created.title).toBe("Engineer authorized task");
    });
  });
});
