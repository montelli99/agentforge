import { describe, expect, it } from "vitest";
import { executeJevBrowserAction, JevUltrafastBrowserPolicy, runJevUltrafastBrowser, type BrowserObservation } from "./jevUltrafastBrowser.js";

const observation: BrowserObservation = {
  id: "obs-1", url: "https://example.test", capturedAt: new Date().toISOString(),
  elements: [
    { index: 1, role: "button", name: "Continue", visible: true },
    { index: 2, role: "combobox", name: "State", options: ["Open", "Closed"], visible: true },
  ],
};

describe("Jev Ultrafast browser policy", () => {
  it("accepts only observed compatible targets", async () => {
    const executed: string[] = [];
    const result = await executeJevBrowserAction({ observe: async () => observation, execute: async action => { executed.push(action.operation); } }, new JevUltrafastBrowserPolicy(), observation, { operation: "CLICK", targetIndex: 1, observationId: "obs-1" });
    expect(result.accepted).toBe(true);
    expect(executed).toEqual(["CLICK"]);
  });

  it("rejects stale, hidden, and unobserved select actions", () => {
    const policy = new JevUltrafastBrowserPolicy();
    expect(policy.validate(observation, { operation: "CLICK", targetIndex: 1, observationId: "old" }).accepted).toBe(false);
    expect(policy.validate(observation, { operation: "CLICK", targetIndex: 99, observationId: "obs-1" }).accepted).toBe(false);
    expect(policy.validate(observation, { operation: "SELECT", targetIndex: 2, option: "Unknown", observationId: "obs-1" }).accepted).toBe(false);
  });

  it("rejects expired observations and payloads on non-target operations", () => {
    const policy = new JevUltrafastBrowserPolicy({ now: () => Date.parse("2026-09-26T10:00:00.000Z") });
    const old = { ...observation, capturedAt: "2026-09-26T09:59:00.000Z" };
    expect(policy.validate(old, { operation: "CLICK", targetIndex: 1, observationId: "obs-1" }).accepted).toBe(false);
    expect(policy.validate(observation, { operation: "DONE", targetIndex: 1, observationId: "obs-1" }).accepted).toBe(false);
  });

  it("rejects unsupported operations, future captures, and ambiguous element tables", () => {
    const policy = new JevUltrafastBrowserPolicy({ now: () => Date.parse("2026-09-26T10:00:00.000Z") });
    expect(policy.validate({ ...observation, capturedAt: "2026-09-26T10:00:06.000Z" }, { operation: "CLICK", targetIndex: 1, observationId: "obs-1" }).accepted).toBe(false);
    expect(policy.validate({ ...observation, elements: [...observation.elements, { ...observation.elements[0] }] }, { operation: "CLICK", targetIndex: 1, observationId: "obs-1" }).accepted).toBe(false);
    expect(policy.validate(observation, { operation: "OPEN_NEW_TAB" as never, observationId: "obs-1" }).accepted).toBe(false);
  });

  it("re-observes immediately before standalone execution", async () => {
    const changed = { ...observation, id: "obs-2", capturedAt: new Date().toISOString() };
    const result = await executeJevBrowserAction({ observe: async () => changed, execute: async () => { throw new Error("must not execute"); } }, new JevUltrafastBrowserPolicy(), observation, { operation: "CLICK", targetIndex: 1, observationId: "obs-1" });
    expect(result).toEqual({ accepted: false, reason: "stale browser observation" });
  });
});

describe("Jev Ultrafast browser loop", () => {
  it("re-observes after actions and requires independent DONE verification", async () => {
    const executed: string[] = [];
    let cycle = 0;
    const bridge = {
      observe: async () => ({ id: `obs-${cycle++}`, url: "https://example.test", capturedAt: new Date().toISOString(), elements: [{ index: 1, role: "button", name: "Continue", visible: true }] }),
      execute: async (action: { operation: string }) => { executed.push(action.operation); },
    };
    const result = await runJevUltrafastBrowser(bridge, ({ observation, step }) => step === 0
      ? { operation: "CLICK", targetIndex: 1, observationId: observation.id }
      : { operation: "DONE", observationId: observation.id }, { verifyDone: () => true });
    expect(result).toMatchObject({ status: "DONE", steps: 1, observations: 2 });
    expect(executed).toEqual(["CLICK"]);
  });

  it("stops safely on a stale selected action", async () => {
    const result = await runJevUltrafastBrowser({ observe: async () => observation, execute: async () => undefined }, () => ({ operation: "CLICK", targetIndex: 99, observationId: "stale" }));
    expect(result.status).toBe("BLOCKED");
    expect(result.reason).toContain("stale browser observation");
  });

  it("returns MAX_STEPS instead of looping indefinitely", async () => {
    let cycle = 0;
    const result = await runJevUltrafastBrowser({
      observe: async () => ({ id: `loop-${cycle++}`, url: "https://example.test", capturedAt: new Date().toISOString(), elements: [] }),
      execute: async () => undefined,
    }, ({ observation }) => ({ operation: "WAIT", observationId: observation.id }), { maxSteps: 2 });
    expect(result).toMatchObject({ status: "MAX_STEPS", steps: 2, observations: 2 });
  });
});
