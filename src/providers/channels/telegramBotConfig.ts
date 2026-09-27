import { readRuntimeSecret } from "./runtimeSecretFile.js";

export type TelegramBotConfigStatus = { configured: boolean; missing: string[] };

/** Resolve a BotFather token from runtime-only configuration. Never logs or returns it in status data. */
export function readTelegramBotToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return readRuntimeSecret(env.AGENTFORGE_TELEGRAM_BOT_TOKEN, env.AGENTFORGE_TELEGRAM_BOT_TOKEN_FILE);
}

export function inspectTelegramBotConfig(env: NodeJS.ProcessEnv = process.env): TelegramBotConfigStatus {
  return readTelegramBotToken(env)
    ? { configured: true, missing: [] }
    : { configured: false, missing: ["AGENTFORGE_TELEGRAM_BOT_TOKEN or AGENTFORGE_TELEGRAM_BOT_TOKEN_FILE"] };
}
