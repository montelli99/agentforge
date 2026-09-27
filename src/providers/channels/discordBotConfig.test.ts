import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectDiscordBotConfig, readDiscordBotToken } from "./discordBotConfig.js";

const temporaryFiles: string[] = [];
afterEach(() => { for (const file of temporaryFiles.splice(0)) fs.rmSync(file, { force: true }); });

describe("Discord bot runtime configuration", () => {
  it("prefers a direct runtime token and supports an external token file", () => {
    expect(readDiscordBotToken({ AGENTFORGE_DISCORD_BOT_TOKEN: "direct" })).toBe("direct");
    const file = path.join(os.tmpdir(), `agentforge-discord-${Date.now()}.token`);
    temporaryFiles.push(file);
    fs.writeFileSync(file, "from-file\n", "utf8");
    expect(readDiscordBotToken({ AGENTFORGE_DISCORD_BOT_TOKEN_FILE: file })).toBe("from-file");
  });

  it("reports secret-safe readiness", () => {
    expect(inspectDiscordBotConfig({})).toEqual({ configured: false, missing: ["AGENTFORGE_DISCORD_BOT_TOKEN or AGENTFORGE_DISCORD_BOT_TOKEN_FILE"] });
    expect(inspectDiscordBotConfig({ AGENTFORGE_DISCORD_BOT_TOKEN: "secret" })).toEqual({ configured: true, missing: [] });
  });
});
