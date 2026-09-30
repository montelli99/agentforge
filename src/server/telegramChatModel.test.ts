import { describe, expect, it } from "vitest";
import type { GenerativeModelProvider } from "../core/providers/model.js";
import { selectTelegramChatModel } from "./telegramChatModel.js";

const provider = (id: string) => ({ id }) as GenerativeModelProvider;

describe("Telegram chat model selection", () => {
  it("uses the bounded MiMo text route when both MiMo models are allowed", () => {
    expect(selectTelegramChatModel(provider("mimo"), ["mimo-v2.5-pro", "mimo-v2.5"]))
      .toBe("mimo-v2.5");
  });

  it("honors a declared override and rejects an undeclared model", () => {
    const allowed = ["mimo-v2.5-pro", "mimo-v2.5"];
    expect(selectTelegramChatModel(provider("mimo"), allowed, "mimo-v2.5-pro"))
      .toBe("mimo-v2.5-pro");
    expect(() => selectTelegramChatModel(provider("mimo"), allowed, "other"))
      .toThrow("must be in AGENTFORGE_CHAT_MODELS");
  });

  it("keeps explicit ordering for other providers", () => {
    expect(selectTelegramChatModel(provider("openai"), ["first", "second"]))
      .toBe("first");
  });
});
