import { describe, expect, it } from "vitest";
import { ChannelConnectionRegistry } from "./channelConnectionRegistry.js";

describe("channel connection registry", () => {
  it("keeps sandbox connections separate from live credentials", () => {
    const registry = new ChannelConnectionRegistry();
    const connection = registry.registerSandbox("telegram", "workspace-test");
    const check = registry.check(connection.id);
    expect(check.state).toBe("sandbox_ready");
    expect(check.externalChanges).toBe(false);
    expect(registry.get(connection.id)?.credentialReference).toBeUndefined();
  });

  it("requires approval before a live connection can become connected", () => {
    const registry = new ChannelConnectionRegistry();
    const connection = registry.requestLive("slack", "workspace-test", "secret-ref-test");
    expect(registry.check(connection.id).state).toBe("live_pending_approval");
    expect(registry.check(connection.id, true).state).toBe("live_connected");
    expect(registry.check(connection.id, true).externalChanges).toBe(false);
  });

  it("supports a gateway or user-session connection without a provider API secret", () => {
    const registry = new ChannelConnectionRegistry();
    const connection = registry.requestGateway("telegram", "workspace-test", "gateway://openclaw/local");
    expect(connection.connectionMode).toBe("gateway");
    expect(connection.credentialReference).toBe("gateway://openclaw/local");
    expect(registry.check(connection.id, true).state).toBe("live_connected");
  });

  it("records a generic provider callback without storing raw credentials", () => {
    const registry = new ChannelConnectionRegistry();
    const pending = registry.requestLive("telegram", "workspace-test", "secret://telegram/bot");
    const callback = registry.completeCallback(pending.id, "external-workspace", "secret://telegram/bot");
    expect(callback.state).toBe("live_pending_approval");
    expect(callback.externalWorkspaceId).toBe("external-workspace");
    expect(callback.credentialReference).toContain("secret://");
  });

  it("rejects a callback delivered for the wrong provider", () => {
    const registry = new ChannelConnectionRegistry();
    const pending = registry.requestLive("discord", "workspace-test", "secret://discord/bot");
    expect(() => registry.completeAuthCallback({
      connectionId: pending.id,
      provider: "slack",
      externalWorkspaceId: "external-workspace",
      credentialReference: "secret://discord/bot",
    })).toThrow("Callback provider does not match");
  });
});
