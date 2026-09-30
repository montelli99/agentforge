#!/usr/bin/env node

/**
 * Read-only preflight for live provider acceptance.
 * It reports configuration shape only; it never contacts a provider and never
 * prints secret values.
 */
const fs = await import("node:fs/promises");

const has = (name) => Boolean(process.env[name]?.trim());
const hasFile = async (name) => {
  const value = process.env[name]?.trim();
  if (!value) return false;
  try {
    await fs.access(value);
    return true;
  } catch {
    return false;
  }
};

const configured = async (direct, file) => ({
  configured: has(direct) || (await hasFile(file)),
  source: has(direct) ? "environment" : (await hasFile(file) ? "private-file" : "missing"),
});

const providers = {
  telegram: {
    botToken: await configured("AGENTFORGE_TELEGRAM_BOT_TOKEN", "AGENTFORGE_TELEGRAM_BOT_TOKEN_FILE"),
    mtproto: has("AGENTFORGE_TELEGRAM_API_ID") && has("AGENTFORGE_TELEGRAM_API_HASH") && has("AGENTFORGE_TELEGRAM_SESSION"),
    relay: has("AGENTFORGE_GATEWAY_URL"),
  },
  discord: {
    botToken: await configured("AGENTFORGE_DISCORD_BOT_TOKEN", "AGENTFORGE_DISCORD_BOT_TOKEN_FILE"),
  },
  slack: {
    appToken: await configured("AGENTFORGE_SLACK_APP_TOKEN", "AGENTFORGE_SLACK_APP_TOKEN_FILE"),
    botToken: await configured("AGENTFORGE_SLACK_BOT_TOKEN", "AGENTFORGE_SLACK_BOT_TOKEN_FILE"),
  },
};

const ready = Object.values(providers).some((provider) =>
  Object.values(provider).some((value) => value === true || value?.configured === true),
);
console.log(JSON.stringify({
  readOnly: true,
  contactedProviders: false,
  providers,
  nextStep: ready ? "run the provider-specific live acceptance runbook" : "configure a private disposable provider target",
}, null, 2));
