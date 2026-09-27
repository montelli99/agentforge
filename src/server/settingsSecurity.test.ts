import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { WorkspaceStore } from "../core/store/workspaceStore.js";
import { AgentForgeWebServer } from "./webServer.js";

describe("AgentForge local settings boundary", () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("keeps provider credentials out of the local settings file and loaded settings", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-settings-"));
    temporaryDirectories.push(directory);
    const settingsFilePath = path.join(directory, "settings.json");
    const server = new AgentForgeWebServer(
      new WorkspaceStore(),
      0,
      undefined,
      undefined,
      { settingsFilePath },
    );

    server.saveSettings({
      provider: "example-provider",
      openaiApiKey: "must-not-persist",
      models: {
        defaultProvider: "example-provider",
        anthropicApiKey: "must-not-persist-either",
      },
      compute: {
        nested: { provider_api_key: "must-not-persist-deeply" },
      },
    });

    const saved = fs.readFileSync(settingsFilePath, "utf8");
    const loaded = server.loadSettings();
    expect(saved).not.toContain("must-not-persist");
    expect(loaded).not.toHaveProperty("openaiApiKey");
    expect(loaded.models).not.toHaveProperty("anthropicApiKey");
    expect(loaded.compute).not.toHaveProperty("nested.provider_api_key");
  });

  it("starts with no execution or automatic-evidence defaults", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-settings-"));
    temporaryDirectories.push(directory);
    const server = new AgentForgeWebServer(
      new WorkspaceStore(),
      0,
      undefined,
      undefined,
      { settingsFilePath: path.join(directory, "settings.json") },
    );

    const settings = server.loadSettings();
    expect(settings.provider).toBe("unconfigured");
    expect(settings.model).toBe("unconfigured");
    expect(settings.optimization).toBe(false);
    expect(settings.compute).toMatchObject({
      defaultHarness: "unconfigured",
      isolationLevel: "not_configured",
      maxConcurrentTasks: 0,
      autoEvidencePack: false,
    });
  });

  it("rejects credential-bearing settings payloads before persistence", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-settings-"));
    temporaryDirectories.push(directory);
    const store = new WorkspaceStore();
    const server = new AgentForgeWebServer(
      store,
      0,
      undefined,
      undefined,
      { settingsFilePath: path.join(directory, "settings.json") },
    );
    await server.start();
    try {
      const response = await fetch(`${server.getBaseUrl()}/api/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ models: { openaiApiKey: "must-not-persist" } }),
      });
      expect(response.status).toBe(422);
      await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("credentials") });
      expect(fs.existsSync(path.join(directory, "settings.json"))).toBe(false);
    } finally {
      await server.stop();
    }
  });

  it("refuses non-loopback local-model diagnostic targets", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-settings-"));
    temporaryDirectories.push(directory);
    const server = new AgentForgeWebServer(
      new WorkspaceStore(),
      0,
      undefined,
      undefined,
      { settingsFilePath: path.join(directory, "settings.json") },
    );
    await server.start();
    try {
      const response = await fetch(`${server.getBaseUrl()}/api/settings/test-ollama`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: "https://example.com" }),
      });
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("loopback") });
    } finally {
      await server.stop();
    }
  });
});
