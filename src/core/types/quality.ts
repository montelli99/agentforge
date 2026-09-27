/** Durable, source-backed quality records for benchmark and drift review. */
export type QualityTargetType = "model" | "harness" | "agent";
export type QualityContainmentAction = "HEALTHY" | "WARN_CONTAINMENT" | "QUARANTINE" | "ROLLBACK";

export interface QualityBaseline {
  id: string;
  targetId: string;
  targetType: QualityTargetType;
  targetVersion: string;
  passRatePct: number;
  avgLatencyMs: number;
  avgTokensPerTask?: number;
  toolAccuracyPct?: number;
  createdAt: string;
  testCaseResults: Record<string, boolean>;
}

export interface QualityAnalysis {
  analysisId: string;
  /** Immutable evaluation run that produced this analysis. */
  runId: string;
  targetId: string;
  targetType: QualityTargetType;
  baselineVersion: string;
  candidateVersion: string;
  latencyDriftMs: number;
  latencyDriftPct: number;
  passRateDriftPct: number;
  regressions: string[];
  corrections: string[];
  hallucinationDetected: boolean;
  toolMisuseDetected: boolean;
  action: QualityContainmentAction;
  explanation: string;
  analyzedAt: string;
}
