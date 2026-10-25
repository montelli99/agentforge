/**
 * Generic Migration Manifest Provider
 * Sections 21 & 22: Generic Migration Manifest & Extensible SDK
 */

import { randomUUID } from "node:crypto";
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
import { GENERIC_MIGRATION_FIXTURE } from "./fixtures/generic_manifest.fixture.js";

export class GenericMigrationProvider implements MigrationProvider {
  private inspections = new WeakMap<MigrationInspection, typeof GENERIC_MIGRATION_FIXTURE>();
  private runs=new Map<string,{ids:string[];expected:number}>();
  readonly id = "migration-generic";
  readonly source: MigrationSource = "GENERIC";

  async discover(_data?: unknown) {
    return { available: true, version: GENERIC_MIGRATION_FIXTURE.version };
  }

  async inspect(manifestData?: unknown): Promise<MigrationInspection> {
    const data = structuredClone(manifestData === undefined ? GENERIC_MIGRATION_FIXTURE : manifestData) as typeof GENERIC_MIGRATION_FIXTURE;
    const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(entry => typeof entry === 'string');
    if (!data || typeof data.version !== 'string' || typeof data.sourceSystem !== 'string'
      || !Array.isArray(data.agents) || !Array.isArray(data.channels) || !Array.isArray(data.tasks)
      || data.agents.some(agent => !agent || ![agent.id, agent.name, agent.role, agent.description].every(value => typeof value === 'string')
        || !agent.id || !strings(agent.tools) || !strings(agent.permissions))
      || new Set(data.agents.map(agent => agent.id)).size !== data.agents.length
      || data.channels.some(channel => !channel || typeof channel.name !== 'string' || typeof channel.visibility !== 'string')) {
      throw new Error('Invalid generic migration manifest');
    }
    const inspection: MigrationInspection = {
      source: "GENERIC",
      sourceVersion: data.version,
      inspectedAt: new Date().toISOString(),
      discovered: {
        agentsCount: data.agents?.length || 0,
        channelsCount: data.channels?.length || 0,
        toolsCount: new Set(data.agents.flatMap(agent => agent.tools)).size,
        modelsCount: 1,
        tasksCount: data.tasks?.length || 0,
        schedulesCount: 0,
        projectsCount: 1,
      },
      secretRequirements: [],
      rawMetadata: { sourceSystem: data.sourceSystem },
    };
    this.inspections.set(inspection, data);
    return inspection;
  }

  async plan(inspection: MigrationInspection): Promise<MigrationPlan> {
    const data = this.inspections.get(inspection);
    if (!data) throw new Error('Inspect the manifest with this provider before planning');
    const items: MigrationItem[] = [];

    // Map agents
    for (const agent of data.agents) {
      items.push({
        id: `item-gen-agent-${agent.id}`,
        sourceType: "generic_agent",
        sourceId: agent.id,
        sourceName: agent.name,
        targetCategory: "agent",
        targetName: agent.name,
        status: "DIRECT",
        transformDetails: "Direct import from standard schema",
        canonicalPayload: {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          description: agent.description,
          status: "idle",
          tools: agent.tools,
          permissions: agent.permissions,
        },
      });
    }

    // Map channels
    for (const ch of data.channels) {
      items.push({
        id: `item-gen-chan-${ch.name}`,
        sourceType: "generic_channel",
        sourceId: ch.name,
        sourceName: ch.name,
        targetCategory: "channel",
        targetName: ch.name,
        status: "UNSUPPORTED",
        canonicalPayload: {
          name: ch.name,
          visibility: ch.visibility,
          provider: "agentforge",
        },
      });
    }

    return {
      id: `plan-generic-${Date.now()}`,
      source: "GENERIC",
      createdAt: new Date().toISOString(),
      items,
      conflicts: [],
      secretRequirements: [],
      summary: { direct: data.agents.length, transform: 0, manualReview: 0, unsupported: data.channels.length, secretRequired: 0, dangerous: 0 },
      readinessScore: items.length ? Math.round(100*data.agents.length/items.length) : 0,
    };
  }

  async dryRun(plan: MigrationPlan): Promise<MigrationDryRun> {
    const unsupported=plan.items.filter(item=>item.status!=='DIRECT'||item.targetCategory!=='agent'||!item.canonicalPayload);
    return {
      planId: plan.id,
      executedAt: new Date().toISOString(),
      simulatedImportsCount: plan.items.length-unsupported.length,
      simulatedErrorsCount: unsupported.length,
      validationWarnings: unsupported.map(item=>`Item ${item.id} has no implemented import handler`),
      wouldMutateProduction: false,
      wouldConnectExternalChannels: false,
      dryRunPassed: unsupported.length===0,
    };
  }

  async importToStore(plan: MigrationPlan, targetStore: WorkspaceStore) {
    const preview = await this.dryRun(plan);
    if (!plan.items.length || !preview.dryRunPassed) {
      throw new Error('Migration plan contains unsupported or unreviewed items; nothing was imported');
    }
    const plannedIds = plan.items.map(item => item.canonicalPayload?.id);
    if (plannedIds.some(id => typeof id !== 'string' || !id)
      || new Set(plannedIds).size !== plannedIds.length
      || plannedIds.some(id => targetStore.getAgent(id as string))) {
      throw new Error('Migration agent identities are invalid, repeated or already present; nothing was imported');
    }
    const runId = `run-generic-${randomUUID()}`;
    let importedCount=0;
    const ids:string[]=[];
    for (const item of plan.items) {
      if (item.targetCategory === "agent" && item.canonicalPayload) {
        const created=targetStore.createAgent(item.canonicalPayload as any);
        ids.push(created.id);
        importedCount++;
      }
    }
    this.runs.set(runId,{ids,expected:plan.items.length});
    return { runId, importedCount };
  }

  async verify(runId: string, targetStore: WorkspaceStore): Promise<MigrationVerification> {
    const run=this.runs.get(runId);
    const hasAgent=Boolean(run&&run.ids.length>0&&run.ids.length===run.expected&&run.ids.every(id=>targetStore.listAgents().some(agent=>agent.id===id)));
    return {
      migrationRunId: runId,
      verifiedAt: new Date().toISOString(),
      checks: [{ name: "Generic Agent Imported", passed: hasAgent, details: "Checks created agent identities for this run; partial or unknown runs do not pass" }],
      overallPassed: hasAgent,
      privilegeExpansionDetected: false,
    };
  }

  async compare() { return []; }
  async prepareCutover(planId: string): Promise<MigrationCutoverPlan> {
    return { planId, strategy: "shadow_validate_then_cutover", steps: [], rollbackPlanId: `rollback-${planId}`, status: "DRAFT_ONLY_NO_LIVE_EXECUTION" };
  }
  async prepareRollback(cutoverPlanId: string): Promise<MigrationRollbackPlan> {
    return { planId: `rollback-${cutoverPlanId}`, cutoverPlanId, steps: [], preservesSourceData: true, destructiveOperations: false };
  }
  exportSanitizedArtifact(plan: MigrationPlan): MigrationArtifact {
    return { id: `art-${plan.id}`, planId: plan.id, createdAt: new Date().toISOString(), exportedManifest: {}, sanitized: true };
  }
}
