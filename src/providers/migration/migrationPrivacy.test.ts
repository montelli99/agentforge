import { describe, expect, it } from "vitest";
import { OpenClawMigrationProvider } from "./openclawMigrationProvider.js";
import type { MigrationPlan } from "../../core/types/migration.js";

describe("migration artifact privacy", () => {
  it("exports only a sanitized summary, never source item payloads or credentials", () => {
    const secret = "sk-migrationfixture123456789";
    const plan: MigrationPlan = {
      id: "plan-private-fixture",
      source: "OPENCLAW_CURRENT",
      createdAt: new Date().toISOString(),
      items: [{
        id: "source-item", sourceType: "fixture", sourceId: "source-id", sourceName: "Private source name",
        targetCategory: "agent", targetName: "Imported agent", status: "DIRECT",
        canonicalPayload: { credential: secret, ownerOnly: "private value" },
      }],
      conflicts: [], secretRequirements: [],
      summary: { direct: 1, transform: 0, manualReview: 0, unsupported: 0, secretRequired: 0, dangerous: 0 },
      readinessScore: 100,
    };

    const artifact = new OpenClawMigrationProvider("current").exportSanitizedArtifact(plan);
    const serialized = JSON.stringify(artifact);
    expect(artifact.sanitized).toBe(true);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("Private source name");
    expect(serialized).not.toContain("ownerOnly");
    expect(artifact.exportedManifest).toEqual({ source: "OPENCLAW_CURRENT", itemCount: 1, itemsSummary: plan.summary });
  });
});
