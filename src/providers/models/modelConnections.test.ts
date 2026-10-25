import { afterEach, describe, expect, it, vi } from "vitest";
import { configureModelConnections, modelConnectionCatalog } from "./modelConnections.js";

afterEach(() => vi.unstubAllGlobals());
describe("explicit model connections", () => {
  it("routes the selected model and key without billing fallback", async () => {
    const requests: Array<{ url: string; key: string; body: { model: string } }> = [];
    vi.stubGlobal("fetch", async (url: string, options: RequestInit) => {
      requests.push({ url, key: (options.headers as Record<string, string>).Authorization, body: JSON.parse(options.body as string) });
      return new Response(JSON.stringify({ id: "fixture", choices: [{ message: { content: "fixture" }, finish_reason: "stop" }] }), { status: 200 });
    });
    const config = configureModelConnections([
      { id: "first", provider: "openai", models: ["fixture-model"], apiKeyEnv: "AGENTFORGE_KEY_FIRST" },
      { id: "second", provider: "deepseek", models: ["fixture-model"], apiKeyEnv: "AGENTFORGE_KEY_SECOND" },
    ], { AGENTFORGE_KEY_FIRST: "synthetic-first", AGENTFORGE_KEY_SECOND: "synthetic-second" });
    await config.provider.generate({ model: "second::fixture-model", messages: [{ role: "user", content: "synthetic" }] });
    expect(requests).toEqual([{ url: "https://api.deepseek.com/chat/completions", key: "Bearer synthetic-second", body: expect.objectContaining({ model: "fixture-model" }) }]);
    expect(JSON.stringify(config.connections)).not.toContain("synthetic-second");
    await expect(config.provider.generate({ model: "unknown", messages: [] })).rejects.toThrow("No automatic billing fallback");
    expect(requests).toHaveLength(1);
  });
  it("supports local endpoints without adopting an unrelated key", () => {
    const config = configureModelConnections([{ id: "local", provider: "local", models: ["fixture"] }], { OPENAI_API_KEY: "unrelated" });
    expect(config.models).toEqual(["local::fixture"]);
    expect(config.connections[0].billing).toContain("Local compute");
  });
  it("rejects embedded secrets, unscoped keys, missing credentials and unsafe endpoints", () => {
    expect(() => configureModelConnections([{ id: "test", provider: "openai", models: ["fixture"], apiKey: "secret" } as never], {})).toThrow("never credentials");
    expect(() => configureModelConnections([{ id: "test", provider: "openai", models: ["fixture"], apiKeyEnv: "OPENAI_API_KEY" }], {})).toThrow("dedicated");
    expect(() => configureModelConnections([{ id: "test", provider: "openai", models: ["fixture"] }], {})).toThrow("credential");
    for (const baseUrl of ["http://example.com/v1", "https://user:secret@example.com/v1", "https://example.com/v1?key=secret"]) {
      expect(() => configureModelConnections([{ id: "test", provider: "compatible", models: ["fixture"], baseUrl }], {})).toThrow("HTTPS");
    }
    expect(() => configureModelConnections([{ id: "test", provider: "local", models: ["fixture"], baseUrl: "https://example.com/v1" }], {})).toThrow("loopback");
  });
  it("has distinct official API presets and refuses subscription-token profiles", () => {
    expect(modelConnectionCatalog.map(item => item.id)).toEqual(["openai", "anthropic", "google", "deepseek", "xai", "local", "compatible"]);
    expect(() => configureModelConnections([{ id: "sub", provider: "claude-subscription", models: ["fixture"] }], {})).toThrow("subscription credentials");
  });
});
