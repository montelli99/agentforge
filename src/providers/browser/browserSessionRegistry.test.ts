import { describe, expect, it } from "vitest";
import { BrowserSessionRegistry } from "./browserSessionRegistry.js";

describe("BrowserSessionRegistry", () => {
  it("supports agent ownership, human takeover, and return", () => {
    const registry = new BrowserSessionRegistry();
    registry.attach("session-1", "profile-ref");
    expect(registry.takeOver("session-1").mode).toBe("human");
    expect(registry.returnToAgent("session-1").mode).toBe("agent");
  });

  it("requires a fresh observation after human takeover", () => {
    const registry = new BrowserSessionRegistry();
    registry.attach("session-1", "profile-ref");
    const observation = { id: "obs-1", url: "https://example.test", capturedAt: new Date().toISOString(), elements: [{ index: 1, role: "button", name: "Continue", visible: true }] };
    registry.observe("session-1", observation);
    registry.takeOver("session-1");
    registry.returnToAgent("session-1");
    expect(() => registry.requestExternalWrite("session-1", { operation: "CLICK", targetIndex: 1, observationId: "obs-1" }, observation)).toThrow(/current browser observation/);
  });

  it("holds external writes until the operator approves the same observation", () => {
    const registry = new BrowserSessionRegistry();
    registry.attach("session-1", "profile-ref");
    const observation = { id: "obs-1", url: "https://example.test", capturedAt: new Date().toISOString(), elements: [{ index: 1, role: "button", name: "Continue", visible: true }] };
    registry.observe("session-1", observation);
    const action = { operation: "CLICK" as const, targetIndex: 1, observationId: "obs-1" };
    registry.requestExternalWrite("session-1", action, observation);
    expect(() => registry.approveExternalWrite("session-1", "obs-old")).toThrow();
    expect(registry.approveExternalWrite("session-1", "obs-1")).toEqual(action);
  });

  it("rejects a substituted observation that reuses the same ID", () => {
    const registry = new BrowserSessionRegistry();
    registry.attach("session-1", "profile-ref");
    const observed = { id: "obs-1", url: "https://example.test", capturedAt: new Date().toISOString(), elements: [{ index: 1, role: "button", name: "Continue", visible: true }] };
    registry.observe("session-1", observed);
    const substituted = { ...observed, elements: [{ index: 1, role: "button", name: "Delete account", visible: true }] };
    expect(() => registry.requestExternalWrite("session-1", { operation: "CLICK", targetIndex: 1, observationId: "obs-1" }, substituted)).toThrow(/current browser observation/);
  });

  it("expires a write approval when its observation is no longer fresh", () => {
    let now = Date.parse("2026-09-26T10:00:00.000Z");
    const registry = new BrowserSessionRegistry(() => now);
    registry.attach("session-1", "profile-ref");
    const observation = { id: "obs-1", url: "https://example.test", capturedAt: new Date(now).toISOString(), elements: [{ index: 1, role: "button", name: "Continue", visible: true }] };
    registry.observe("session-1", observation);
    registry.requestExternalWrite("session-1", { operation: "CLICK", targetIndex: 1, observationId: "obs-1" }, observation);
    now += 30_001;
    expect(() => registry.approveExternalWrite("session-1", "obs-1")).toThrow(/expired/);
  });
});
