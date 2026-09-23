import type { AgentForgeModelChoice } from "./types.js";

export type AgentForgeBridgeConfig = {
  agents?: {
    defaults?: {
      model?: string | { primary?: string; fallbacks?: string[] };
      imageModel?: string | { primary?: string; fallbacks?: string[] };
      models?: Record<string, { alias?: string }>;
    };
  };
};

type ModelSelection = string | { primary?: string; fallbacks?: string[] };
type ModelAliases = Record<string, { alias?: string }>;

export type AgentForgeBridgeProfile = {
  model: AgentForgeModelChoice;
  imageModel?: AgentForgeModelChoice;
};

const DEFAULT_PROVIDER = "openai";
const DEFAULT_MODEL = "gpt-4o-mini";

export const DEFAULT_AGENTFORGE_BRIDGE_PROFILE: AgentForgeBridgeProfile = {
  model: { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL },
};

function resolveModelChoice(raw: ModelSelection | undefined, models?: ModelAliases): AgentForgeModelChoice | undefined {
  const selected = typeof raw === "string" ? raw : raw?.primary;
  if (!selected) return undefined;

  const aliasEntry = Object.entries(models ?? {}).find(([, entry]) => entry.alias === selected);
  const reference = aliasEntry?.[0] ?? selected;
  const separator = reference.indexOf("/");
  const provider = separator > 0 ? reference.slice(0, separator) : DEFAULT_PROVIDER;
  const model = separator > 0 ? reference.slice(separator + 1) : reference;
  if (!provider || !model) return undefined;
  return { provider, model };
}

export function resolveAgentForgeBridgeProfile(cfg: AgentForgeBridgeConfig): AgentForgeBridgeProfile {
  const defaults = cfg.agents?.defaults;
  return {
    model: resolveModelChoice(defaults?.model, defaults?.models) ?? DEFAULT_AGENTFORGE_BRIDGE_PROFILE.model,
    imageModel: resolveModelChoice(defaults?.imageModel, defaults?.models),
  };
}

/** Reads only non-secret model selectors; it never imports or reads another runtime's config. */
export function loadAgentForgeBridgeProfile(): AgentForgeBridgeProfile {
  const provider = process.env.AGENTFORGE_PROVIDER || DEFAULT_PROVIDER;
  const model = process.env.AGENTFORGE_MODEL || DEFAULT_MODEL;
  const imageModel = process.env.AGENTFORGE_IMAGE_MODEL;
  return resolveAgentForgeBridgeProfile({
    agents: {
      defaults: {
        model: `${provider}/${model}`,
        imageModel: imageModel ? `${provider}/${imageModel}` : undefined,
      },
    },
  });
}
