import { loadConfig, type OpenClawConfig } from "../../OpenClaw/src/config/config.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../../OpenClaw/src/agents/defaults.js";
import { resolveConfiguredModelRef } from "../../OpenClaw/src/agents/model-selection.js";
import type { AgentForgeModelChoice } from "./types.js";

export type AgentForgeBridgeProfile = {
  model: AgentForgeModelChoice;
  imageModel?: AgentForgeModelChoice;
};

type ModelSelectionValue = string | { primary?: string; fallbacks?: string[] };

export const DEFAULT_AGENTFORGE_BRIDGE_PROFILE: AgentForgeBridgeProfile = {
  model: { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL },
};

function resolveConfiguredChoice(params: {
  cfg: OpenClawConfig;
  raw: unknown;
}): AgentForgeModelChoice | undefined {
  if (!params.raw) {
    return undefined;
  }

  const nextCfg = {
    ...params.cfg,
    agents: {
      ...params.cfg.agents,
      defaults: {
        ...params.cfg.agents?.defaults,
        model: params.raw as ModelSelectionValue,
      },
    },
  } satisfies OpenClawConfig;

  const ref = resolveConfiguredModelRef({
    cfg: nextCfg,
    defaultProvider: DEFAULT_PROVIDER,
    defaultModel: DEFAULT_MODEL,
  });
  return { provider: ref.provider, model: ref.model };
}

export function resolveAgentForgeBridgeProfile(cfg: OpenClawConfig): AgentForgeBridgeProfile {
  const modelRef = resolveConfiguredModelRef({
    cfg,
    defaultProvider: DEFAULT_PROVIDER,
    defaultModel: DEFAULT_MODEL,
  });
  return {
    model: { provider: modelRef.provider, model: modelRef.model },
    imageModel: resolveConfiguredChoice({ cfg, raw: cfg.agents?.defaults?.imageModel }),
  };
}

export function loadAgentForgeBridgeProfile(): AgentForgeBridgeProfile {
  return resolveAgentForgeBridgeProfile(loadConfig());
}
