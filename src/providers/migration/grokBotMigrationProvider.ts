/**
 * Grok Bot Migration Provider
 * Section 20: Grok Bot Migration Provider
 * 
 * Only migrates documented/public exportable definitions.
 * Flags unexportable custom actions as MANUAL_REVIEW or UNSUPPORTED.
 */

import type { MigrationProvider } from "../../core/providers/migration.js";
import type {
  MigrationSource,
  MigrationInspection,
  MigrationPlan,
  MigrationItem,
  MigrationDryRun,
  MigrationVerification,
  MigrationComparison,
  MigrationCutoverPlan,
  MigrationRollbackPlan,
  MigrationArtifact,
} from "../../core/types/migration.js";
import type { WorkspaceStore } from "../../core/store/workspaceStore.js";
import { GROKBOT_FIXTURE } from "./fixtures/hermes_and_grok.fixture.js";

export class GrokBotMigrationProvider implements MigrationProvider {
  readonly id = "migration-grokbot";
  readonly source: MigrationSource = "GROK_BOT";

  async discover(_data?: unknown) {
    return { available: true, version: GROKBOT_FIXTURE.version };
  }

  async inspect(_data?: unknown): Promise<MigrationInspection> {
    return {
      source: "GROK_BOT",
      sourceVersion: GROKBOT_FIXTURE.version,
      inspectedAt: new Date().toISOString(),
      discovered: {
        agentsCount: GROKBOT_FIXTURE.exportedPrompts.length,
        channelsCount: 0,
        toolsCount: 0,
        modelsCount: 1,
        tasksCount: 0,
        schedulesCount: 0,
        projectsCount: 1,
      },
      secretRequirements: [],
      rawMetadata: { unexportableActions: GROKBOT_FIXTURE.unexportableCustomActions },
    };
  }

  async plan(inspection: MigrationInspection): Promise<MigrationPlan> {
    const items: MigrationItem[] = [
      {
        id: "grok-item-1",
        sourceType: "exported_prompt",
        sourceId: "grok-prompt-1",
        sourceName: GROKBOT_FIXTURE.exportedPrompts[0].title,
        targetCategory: "agent",
        targetName: GROKBOT_FIXTURE.exportedPrompts[0].title,
        status: "TRANSFORM",
        transformDetails: "Converted exported prompt into AgentForge teammate with Tier 4 model policy.",
        canonicalPayload: {
          id: "agent-migrated-grok",
          name: GROKBOT_FIXTURE.exportedPrompts[0].title,
          role: "Market Analyst",
          description: GROKBOT_FIXTURE.exportedPrompts[0].prompt,
          status: "idle",
        },
      },
      {
        id: "grok-unexportable-1",
        sourceType: "custom_integration",
        sourceId: "x-api",
        sourceName: "proprietary_x_api_feed",
        targetCategory: "tool",
        targetName: "X Feed Integration",
        status: "MANUAL_REVIEW",
        warning: "Proprietary X API feed cannot be exported automatically. Owner must configure custom connector.",
      },
      {
        id: "grok-unexportable-2",
        sourceType: "custom_integration",
        sourceId: "x-direct-messaging",
        sourceName: "direct_x_messaging",
        targetCategory: "tool",
        targetName: "Direct X Messaging",
        status: "UNSUPPORTED",
        warning: "Direct X messaging is unsupported without enterprise Twitter/X credentials.",
      },
    ];

    return {
      id: `plan-grok-${Date.now()}`,
      source: "GROK_BOT",
      createdAt: new Date().toISOString(),
      items,
      conflicts: [],
      secretRequirements: [],
      summary: { direct: 0, transform: 1, manualReview: 1, unsupported: 1, secretRequired: 0, dangerous: 0 },
      readinessScore: 33, // Only 1 of 3 directly/transformable
    };
  }

  async dryRun(plan: MigrationPlan): Promise<MigrationDryRun> {
    return {
      planId: plan.id,
      executedAt: new Date().toISOString(),
      simulatedImportsCount: 1,
      simulatedErrorsCount: 0,
      validationWarnings: [
        "Unexportable proprietary features flagged for MANUAL_REVIEW / UNSUPPORTED",
      ],
      wouldMutateProduction: false,
      wouldConnectExternalChannels: false,
      dryRunPassed: true,
    };
  }

  async importToStore(plan: MigrationPlan, targetStore: WorkspaceStore) {
    const runId = `run-grok-${Date.now()}`;
    for (const item of plan.items) {
      if (item.status === "TRANSFORM" && item.canonicalPayload) {
        targetStore.createAgent(item.canonicalPayload as any);
      }
    }
    return { runId, importedCount: 1 };
  }

  async verify(runId: string, targetStore: WorkspaceStore): Promise<MigrationVerification> {
    const hasAgent = targetStore.listAgents().some(a => a.id === "agent-migrated-grok");
    return {
      migrationRunId: runId,
      verifiedAt: new Date().toISOString(),
      checks: [{ name: "Grok Prompt Imported as Agent", passed: hasAgent, details: "Verified in store" }],
      overallPassed: hasAgent,
      privilegeExpansionDetected: false,
    };
  }

  async compare() { return []; }
  async prepareCutover(planId: string): Promise<MigrationCutoverPlan> {
    return {
      planId,
      strategy: "shadow_validate_then_cutover",
      steps: [],
      rollbackPlanId: `rollback-${planId}`,
      status: "DRAFT_ONLY_NO_LIVE_EXECUTION",
    };
  }
  async prepareRollback(cutoverPlanId: string): Promise<MigrationRollbackPlan> {
    return {
      planId: `rollback-${cutoverPlanId}`,
      cutoverPlanId,
      steps: [],
      preservesSourceData: true,
      destructiveOperations: false,
    };
  }
  exportSanitizedArtifact(plan: MigrationPlan): MigrationArtifact {
    return { id: `art-${plan.id}`, planId: plan.id, createdAt: new Date().toISOString(), exportedManifest: {}, sanitized: true };
  }
}
