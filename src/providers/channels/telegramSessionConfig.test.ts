import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectTelegramSessionConfig, readTelegramSessionConfig } from "./telegramSessionConfig.js";

describe("Telegram native session configuration", () => {
  it("reports missing fields without exposing values", () => {
    expect(inspectTelegramSessionConfig({ AGENTFORGE_TELEGRAM_API_ID: "12" })).toEqual({ configured: false, missing: ["AGENTFORGE_TELEGRAM_API_HASH", "AGENTFORGE_TELEGRAM_SESSION"] });
    expect(readTelegramSessionConfig({ AGENTFORGE_TELEGRAM_API_ID: "12", AGENTFORGE_TELEGRAM_API_HASH: "hash", AGENTFORGE_TELEGRAM_SESSION: "session" })).toEqual({ apiId: 12, apiHash: "hash", session: "session" });
  });

  it("discovers a shared runtime credential file without exposing it", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentforge-telegram-"));
    const path = join(dir, "credentials.json");
    writeFileSync(path, JSON.stringify({ apiId: 12, apiHash: "hash", session: "session" }));
    try {
      const env = { AGENTFORGE_TELEGRAM_CREDENTIAL_FILE: path };
      expect(readTelegramSessionConfig(env)).toEqual({ apiId: 12, apiHash: "hash", session: "session" });
      expect(inspectTelegramSessionConfig(env)).toEqual({ configured: true, missing: [] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
