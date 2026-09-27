import { readRuntimeSecret } from "./runtimeSecretFile.js";

export function readSlackSocketModeConfig(env: NodeJS.ProcessEnv = process.env): { appToken?: string; botToken?: string } {
  return { appToken: readRuntimeSecret(env.AGENTFORGE_SLACK_APP_TOKEN, env.AGENTFORGE_SLACK_APP_TOKEN_FILE), botToken: readRuntimeSecret(env.AGENTFORGE_SLACK_BOT_TOKEN, env.AGENTFORGE_SLACK_BOT_TOKEN_FILE) };
}

export function inspectSlackSocketModeConfig(env: NodeJS.ProcessEnv = process.env): { configured: boolean; missing: string[] } {
  const config = readSlackSocketModeConfig(env);
  const missing: string[] = [];
  if (!config.appToken) missing.push("AGENTFORGE_SLACK_APP_TOKEN or AGENTFORGE_SLACK_APP_TOKEN_FILE");
  if (!config.botToken) missing.push("AGENTFORGE_SLACK_BOT_TOKEN or AGENTFORGE_SLACK_BOT_TOKEN_FILE");
  return { configured: missing.length === 0, missing };
}
