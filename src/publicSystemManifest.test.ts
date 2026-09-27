import { describe, expect, it } from "vitest";
import { PUBLIC_SYSTEM_MANIFEST } from "./publicSystemManifest.js";

describe("public system manifest", () => {
  it("contains only the three public subsystems and no private integration ownership", () => {
    expect(PUBLIC_SYSTEM_MANIFEST.map(item => item.id)).toEqual(["agentforge", "workflow-engine", "jev"]);
    expect(PUBLIC_SYSTEM_MANIFEST.every(item => item.doesNotOwn.some(value => /private|crm|seller|credential|telephony/i.test(value)))).toBe(true);
    expect(PUBLIC_SYSTEM_MANIFEST.find(item => item.id === "workflow-engine")?.status).toBe("partial");
  });
});
