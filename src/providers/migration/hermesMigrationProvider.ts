/**
 * Hermes Migration Provider
 * Section 19: Hermes Migration Provider
 */

import type { MigrationProvider } from "../../core/providers/migration.js";
import type {
  MigrationSource,
  MigrationInspection,
  MigrationPlan,
  MigrationDryRun,
  MigrationVerification,
  MigrationComparison,
  MigrationCutoverPlan,
  MigrationRollbackPlan,
  MigrationArtifact,
} from "../../core/types/migration.js";
import type { WorkspaceStore } from "../../core/store/workspaceStore.js";
import { HERMES_FIXTURE } from "./fixtures/hermes_and_grok.fixture.js";

export class HermesMigrationProvider implements MigrationProvider {
  readonly id = "migration-hermes";
  readonly source: MigrationSource = "HERMES";

  async discover(_data?: unknown) {
    return { available: true, version: HERMES_FIXTURE.version };
  }

  async inspect(_data?: unknown): Promise<MigrationInspection> {
    return {
      source: "HERMES",
      sourceVersion: HERMES_FIXTURE.version,
      inspectedAt: new Date().toISOString(),
      discovered: {
        agentsCount: HERMES_FIXTURE.agents.length,
        channelsCount: HERMES_FIXTURE.channels.length,
        toolsCount: 3,
        modelsCount: 1,
        tasksCount: 0,
        schedulesCount: 0,
        projectsCount: 1,
      },
      secretRequirements: [
        {
          provider: "hermes-api",
          keyName: "SEARCH_API_KEY",
          description: "Search API key for autonomous research tool",
          requiredFor: ["search_web"],
          reconnectRequired: true,
        },
      ],
      rawMetadata: { platform: "hermes" },
    };
  }

  async plan(inspection: MigrationInspection): Promise<MigrationPlan> {
    return {
      id: `plan-hermes-${Date.now()}`,
      source: "HERMES",
      createdAt: new Date().toISOString(),
      items: [
        {
          id: "hermes-item-agent-1",
          sourceType: "agent",
          sourceId: "hermes-agent-research",
          sourceName: "HermesResearcher",
          targetCategory: "agent",
          targetName: "HermesResearcher",
          status: "TRANSFORM",
          transformDetails: "Mapped Hermes autonomous directive into AgentForge goal and tools.",
          canonicalPayload: {
            id: "agent-migrated-hermes",
            name: "HermesResearcher",
            role: "Research Specialist",
            description: HERMES_FIXTURE.agents[0].directive,
            status: "idle",
            tools: HERMES_FIXTURE.agents[0].toolsGranted,
          },
        },
      ],
      conflicts: [],
      secretRequirements: inspection.secretRequirements,
      summary: { direct: 0, transform: 1, manualReview: 0, unsupported: 0, secretRequired: 1, dangerous: 0 },
      readinessScore: 100,
    };
  }

  async dryRun(plan: MigrationPlan): Promise<MigrationDryRun> {
    return {
      planId: plan.id,
      executedAt: new Date().toISOString(),
      simulatedImportsCount: 1,
      simulatedErrorsCount: 0,
      validationWarnings: ["Hermes graph store mapped to AgentForge engineering memory"],
      wouldMutateProduction: false,
      wouldConnectExternalChannels: false,
      dryRunPassed: true,
    };
  }

  async importToStore(plan: MigrationPlan, targetStore: WorkspaceStore) {
    const runId = `run-hermes-${Date.now()}`;
    for (const item of plan.items) {
      if (item.canonicalPayload) {
        targetStore.createAgent(item.canonicalPayload as any);
      }
    }
    return { runId, importedCount: plan.items.length };
  }

  async verify(runId: string, targetStore: WorkspaceStore): Promise<MigrationVerification> {
    const hasAgent = targetStore.listAgents().some(a => a.id === "agent-migrated-hermes");
    return {
      migrationRunId: runId,
      verifiedAt: new Date().toISOString(),
      checks: [{ name: "Hermes Agent Imported", passed: hasAgent, details: "Verified in store" }],
      overallPassed: hasAgent,
      privilegeExpansionDetected: false,
    };
  }

  async compare() { return []; }
  async prepareCutover(planId: string): Promise<MigrationCutoverPlan> {
    return {
      planId,
      strategy: "shadow_validate_then_cutover",
      steps: [{ stepNumber: 1, name: "Hermes Cutover", action: "Switch feed to AgentForge channel", requiresOwnerApproval: true, isExecuted: false }],
      rollbackPlanId: `rollback-${planId}`,
      status: "DRAFT_ONLY_NO_LIVE_EXECUTION",
    };
  }
  async prepareRollback(cutoverPlanId: string): Promise<MigrationRollbackPlan> {
    return {
      planId: `rollback-${cutoverPlanId}`,
      cutoverPlanId,
      steps: [{ stepNumber: 1, name: "Restore Hermes Feed", restoreAction: "Resume Hermes webhook" }],
      preservesSourceData: true,
      destructiveOperations: false,
    };
  }
  exportSanitizedArtifact(plan: MigrationPlan): MigrationArtifact {
    return { id: `art-${plan.id}`, planId: plan.id, createdAt: new Date().toISOString(), exportedManifest: {}, sanitized: true };
  }
}
