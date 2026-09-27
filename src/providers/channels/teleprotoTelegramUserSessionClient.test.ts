import { describe, expect, it } from "vitest";
import { normalizeTeleprotoMessage, TeleprotoTelegramUserSessionClient } from "./teleprotoTelegramUserSessionClient.js";

describe("TeleprotoTelegramUserSessionClient", () => {
  it("fails closed when an authorized session is not supplied", () => {
    expect(() => new TeleprotoTelegramUserSessionClient({ apiId: 12345, apiHash: "hash", session: "" })).toThrow(/authorized Telegram user session/);
  });

  it("rejects invalid MTProto API configuration before connecting", () => {
    expect(() => new TeleprotoTelegramUserSessionClient({ apiId: 0, apiHash: "hash", session: "session" })).toThrow(/API ID/);
    expect(() => new TeleprotoTelegramUserSessionClient({ apiId: 12345, apiHash: "", session: "session" })).toThrow(/API hash/);
  });

  it("preserves forum topic metadata when normalizing MTProto events", () => {
    expect(normalizeTeleprotoMessage({
      id: 41,
      chatId: 99,
      senderId: 7,
      message: { id: 41, chatId: 99, senderId: 7, message: "hello", replyTo: { replyToMsgId: 40, replyToTopId: 12 } },
    })).toMatchObject({ updateId: 41, chatId: "99", userId: "7", topicId: 12, replyToMessageId: 40, text: "hello" });
  });
});


