import { readRuntimeSecret } from "./runtimeSecretFile.js";

/** Read a Discord bot token from runtime-only configuration. */
export function readDiscordBotToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return readRuntimeSecret(env.AGENTFORGE_DISCORD_BOT_TOKEN, env.AGENTFORGE_DISCORD_BOT_TOKEN_FILE);
}

export function inspectDiscordBotConfig(env: NodeJS.ProcessEnv = process.env): { configured: boolean; missing: string[] } {
  return readDiscordBotToken(env)
    ? { configured: true, missing: [] }
    : { configured: false, missing: ["AGENTFORGE_DISCORD_BOT_TOKEN or AGENTFORGE_DISCORD_BOT_TOKEN_FILE"] };
}
