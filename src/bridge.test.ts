import { describe, expect, it } from "vitest";
import { resolveAgentForgeBridgeProfile } from "./bridge.js";

describe("resolveAgentForgeBridgeProfile", () => {
  it("normalizes the configured text and image model choices", () => {
    const profile = resolveAgentForgeBridgeProfile({
      agents: {
        defaults: {
          model: "fast-chat",
          imageModel: {
            primary: "vision-suite/v1",
            fallbacks: ["vision-suite/v0"],
          },
          models: {
            "anthropic/claude-sonnet-4-5": {
              alias: "fast-chat",
            },
          },
        },
      },
    });

    expect(profile.model).toEqual({ provider: "anthropic", model: "claude-sonnet-4-5" });
    expect(profile.imageModel).toEqual({ provider: "vision-suite", model: "v1" });
  });
});
