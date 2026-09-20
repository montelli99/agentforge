/**
 * Migration Provider Contract
 * Sections 7 & 8: Migration Provider & Canonical Lifecycle
 */

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
} from "../types/migration.js";
import type { WorkspaceStore } from "../store/workspaceStore.js";

export interface MigrationProvider {
  readonly id: string;
  readonly source: MigrationSource;

  // 1. Discovery & Inspection
  discover(sourcePathOrConfig: unknown): Promise<{ available: boolean; version?: string }>;
  inspect(sourceData: unknown): Promise<MigrationInspection>;

  // 2. Planning & Dry Run
  plan(inspection: MigrationInspection): Promise<MigrationPlan>;
  dryRun(plan: MigrationPlan): Promise<MigrationDryRun>;

  // 3. Execution (Synthetic / Isolated Staging)
  importToStore(plan: MigrationPlan, targetStore: WorkspaceStore): Promise<{ runId: string; importedCount: number }>;
  verify(runId: string, targetStore: WorkspaceStore): Promise<MigrationVerification>;

  // 4. Shadow Comparison
  compare(sampleEvents: unknown[]): Promise<MigrationComparison[]>;

  // 5. Governance & Cutover Design (Design only, no live cutover)
  prepareCutover(planId: string): Promise<MigrationCutoverPlan>;
  prepareRollback(cutoverPlanId: string): Promise<MigrationRollbackPlan>;
  exportSanitizedArtifact(plan: MigrationPlan): MigrationArtifact;
}
