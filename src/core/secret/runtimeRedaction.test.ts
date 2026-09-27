import { describe, expect, it } from "vitest";
import { redactRuntimeError, redactRuntimeText, redactRuntimeValue } from "./runtimeRedaction.js";

describe("redactRuntimeText", () => {
  it("redacts common provider credentials and authorization headers", () => {
    const value = "token=abc123456789012345 Bearer abcdefghijklmnopqrstu xoxb-1234567890-abcdefghijk";
    expect(redactRuntimeText(value)).not.toContain("abc123456789012345");
    expect(redactRuntimeText(value)).not.toContain("abcdefghijklmnopqrstu");
    expect(redactRuntimeText(value)).not.toContain("xoxb-1234567890-abcdefghijk");
    expect(redactRuntimeText(value)).toContain("Bearer [REDACTED_SECRET]");
    expect(redactRuntimeText("Basic dXNlcm5hbWU6c2hvcnQ=")).toBe("[REDACTED_SECRET]");
    expect(redactRuntimeText("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvcGVyYXRvciJ9.signaturevalue123")).toBe("[REDACTED_SECRET]");
  });

  it("redacts configured secret values without persisting their source", () => {
    const key = "AGENTFORGE_TEST_PRIVATE_TOKEN";
    const previous = process.env[key];
    process.env[key] = "runtime-secret-value-123";
    try {
      expect(redactRuntimeText("failure: runtime-secret-value-123")).toBe("failure: [REDACTED_SECRET]");
    } finally {
      if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
    }
  });

  it("redacts unknown errors and nested diagnostic values", () => {
    const secret = "sk-privatefixturevalue123456789";
    expect(redactRuntimeError(new Error(`provider failed: Bearer ${secret}`))).toBe("provider failed: Bearer [REDACTED_SECRET]");
    expect(redactRuntimeValue({ nested: [`token=${secret}`], authorization: "short" })).toEqual({ nested: ["[REDACTED_SECRET]"], authorization: "[REDACTED_SECRET]" });
  });
});
