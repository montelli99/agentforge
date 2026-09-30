import type { GenerativeModelProvider } from "../core/providers/model.js";

/** Select a conversational default without silently changing the operator's allowed models. */
export function selectTelegramChatModel(
  provider: GenerativeModelProvider,
  allowedModels: string[],
  explicitModel?: string,
): string | undefined {
  if (explicitModel) {
    if (!allowedModels.includes(explicitModel)) throw new Error("Telegram chat model must be in AGENTFORGE_CHAT_MODELS.");
    return explicitModel;
  }
  if (provider.id === "mimo" && allowedModels.includes("mimo-v2.5")) return "mimo-v2.5";
  return allowedModels[0];
}
