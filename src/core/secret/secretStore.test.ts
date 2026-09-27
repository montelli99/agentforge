import { describe, expect, it } from "vitest";
import { IsolatedSecretStore } from "./secretStore.js";

describe("IsolatedSecretStore.sanitizeData", () => {
  it("removes credential-shaped fields and values from durable payloads", () => {
    const store = new IsolatedSecretStore();

    expect(
      store.sanitizeData({
        authorization: "short",
        nested: { detail: "Bearer sk-secretstorefixture123456789" },
      }),
    ).toEqual({
      authorization: "[REDACTED_SECRET]",
      nested: { detail: "Bearer [REDACTED_SECRET]" },
    });
  });
});
