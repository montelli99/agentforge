import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectSlackSocketModeConfig, readSlackSocketModeConfig } from "./slackSocketModeConfig.js";

const files: string[] = [];
afterEach(() => { for (const file of files.splice(0)) fs.rmSync(file, { force: true }); });

describe("Slack Socket Mode runtime configuration", () => {
  it("reads app and bot credentials from direct values or external files", () => {
    expect(readSlackSocketModeConfig({ AGENTFORGE_SLACK_APP_TOKEN: "app", AGENTFORGE_SLACK_BOT_TOKEN: "bot" })).toEqual({ appToken: "app", botToken: "bot" });
    const app = path.join(os.tmpdir(), `agentforge-slack-app-${Date.now()}.token`);
    const bot = path.join(os.tmpdir(), `agentforge-slack-bot-${Date.now()}.token`);
    files.push(app, bot); fs.writeFileSync(app, "app-file\n"); fs.writeFileSync(bot, "bot-file\n");
    expect(readSlackSocketModeConfig({ AGENTFORGE_SLACK_APP_TOKEN_FILE: app, AGENTFORGE_SLACK_BOT_TOKEN_FILE: bot })).toEqual({ appToken: "app-file", botToken: "bot-file" });
  });

  it("reports missing values without returning secrets", () => {
    expect(inspectSlackSocketModeConfig({})).toEqual({ configured: false, missing: ["AGENTFORGE_SLACK_APP_TOKEN or AGENTFORGE_SLACK_APP_TOKEN_FILE", "AGENTFORGE_SLACK_BOT_TOKEN or AGENTFORGE_SLACK_BOT_TOKEN_FILE"] });
    expect(inspectSlackSocketModeConfig({ AGENTFORGE_SLACK_APP_TOKEN: "app", AGENTFORGE_SLACK_BOT_TOKEN: "bot" })).toEqual({ configured: true, missing: [] });
  });
});
