export type TelegramSessionConfig = {
  apiId: number;
  apiHash: string;
  session: string;
};

export type TelegramSessionConfigStatus = {
  configured: boolean;
  missing: Array<"AGENTFORGE_TELEGRAM_API_ID" | "AGENTFORGE_TELEGRAM_API_HASH" | "AGENTFORGE_TELEGRAM_SESSION">;
};

type StoredTelegramCredentials = {
  apiId?: unknown;
  apiHash?: unknown;
  session?: unknown;
};

function readStoredCredentials(path: string): TelegramSessionConfig | undefined {
  try {
    const stored = JSON.parse(fs.readFileSync(path, "utf8")) as StoredTelegramCredentials;
    const apiId = Number(stored.apiId || 0);
    const apiHash = typeof stored.apiHash === "string" ? stored.apiHash.trim() : "";
    const session = typeof stored.session === "string" ? stored.session.trim() : "";
    if (!apiId || !apiHash || !session) return undefined;
    return { apiId, apiHash, session };
  } catch {
    return undefined;
  }
}

/** Reads only the native MTProto session configuration; values are never returned in status objects. */
export function readTelegramSessionConfig(env: NodeJS.ProcessEnv = process.env): TelegramSessionConfig | undefined {
  const apiId = Number(env.AGENTFORGE_TELEGRAM_API_ID || 0);
  const apiHash = env.AGENTFORGE_TELEGRAM_API_HASH?.trim();
  const session = env.AGENTFORGE_TELEGRAM_SESSION?.trim();
  if (apiId && apiHash && session) return { apiId, apiHash, session };

  // Deployment-only discovery: share the already-authorized local user session
  // with OpenClaw's login helper when present. The file is never copied or
  // returned through status endpoints, and environment values always win.
  const configuredPath = env.AGENTFORGE_TELEGRAM_CREDENTIAL_FILE?.trim();
  const defaultPath = `${process.env.USERPROFILE || process.env.HOME || ""}/.openclaw/credentials/telegram-history/credentials.json`;
  return readStoredCredentials(configuredPath || defaultPath);
}

export function inspectTelegramSessionConfig(env: NodeJS.ProcessEnv = process.env): TelegramSessionConfigStatus {
  if (readTelegramSessionConfig(env)) return { configured: true, missing: [] };
  const missing: TelegramSessionConfigStatus["missing"] = [];
  if (!Number(env.AGENTFORGE_TELEGRAM_API_ID || 0)) missing.push("AGENTFORGE_TELEGRAM_API_ID");
  if (!env.AGENTFORGE_TELEGRAM_API_HASH?.trim()) missing.push("AGENTFORGE_TELEGRAM_API_HASH");
  if (!env.AGENTFORGE_TELEGRAM_SESSION?.trim()) missing.push("AGENTFORGE_TELEGRAM_SESSION");
  return { configured: missing.length === 0, missing };
}
import fs from "node:fs";
