import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectTelegramBotConfig, readTelegramBotToken } from "./telegramBotConfig.js";

describe("Telegram BotFather runtime configuration", () => {
  it("reads a token from a private runtime file without exposing it in status", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentforge-bot-"));
    const file = join(dir, "token");
    writeFileSync(file, "123456:abcdefghijklmnopqrstuvwxyz");
    try {
      const env = { AGENTFORGE_TELEGRAM_BOT_TOKEN_FILE: file };
      expect(readTelegramBotToken(env)).toBe("123456:abcdefghijklmnopqrstuvwxyz");
      expect(inspectTelegramBotConfig(env)).toEqual({ configured: true, missing: [] });
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("prefers the direct runtime token", () => {
    expect(readTelegramBotToken({ AGENTFORGE_TELEGRAM_BOT_TOKEN: "direct" })).toBe("direct");
    expect(inspectTelegramBotConfig({})).toEqual({ configured: false, missing: ["AGENTFORGE_TELEGRAM_BOT_TOKEN or AGENTFORGE_TELEGRAM_BOT_TOKEN_FILE"] });
  });
});
