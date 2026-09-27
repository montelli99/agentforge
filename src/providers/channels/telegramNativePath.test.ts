import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("native Telegram connection boundary", () => {
  it("keeps MTProto primary and supports the BotFather fallback", () => {
    const launcher = fs.readFileSync(path.resolve(process.cwd(), "src/server/start.ts"), "utf8");
    expect(launcher).toContain("TeleprotoTelegramUserSessionClient");
    expect(launcher).toContain("readTelegramSessionConfig");
    expect(launcher).toContain('server.nativeGateway.start(configuredChannels)');
    expect(launcher).toContain("TelegramBotApiTransport");
    expect(launcher).toContain("readTelegramBotToken");
  });

  it("keeps the emitted launcher on the native path when a production build exists", () => {
    const builtPath = path.resolve(process.cwd(), "dist/server/start.js");
    if (!fs.existsSync(builtPath)) return;
    const built = fs.readFileSync(builtPath, "utf8");
    expect(built).toContain("TeleprotoTelegramUserSessionClient");
    expect(built).toContain("TelegramBotApiTransport");
    expect(built).toContain("readTelegramBotToken");
  });
});
