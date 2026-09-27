/**
/**
 * AgentForge Model & Harness Performance Drift Monitor
 * Sections 22, 23, 24, 25: Test Everything & Drift Containment Philosophy
 * 
 * Compares model/harness performance against versioned baselines,
 * detects regressions, tool misuse, and hallucinated claims,
 * and enforces auditable quarantine and rollback policies.
 */

import crypto from "node:crypto";
import type { WorkspaceStore } from "../store/workspaceStore.js";
import type { QualityAnalysis, QualityBaseline, QualityContainmentAction, QualityTargetType } from "../types/quality.js";

export type ContainmentAction = QualityContainmentAction;

export interface DriftBaseline extends QualityBaseline {}

export interface DriftCandidateRun {
  runId: string;
  targetId: string;
  targetType: QualityTargetType;
  targetVersion: string;
  passRatePct: number;
  avgLatencyMs: number;
  avgTokensPerTask?: number;
  toolAccuracyPct?: number;
  hallucinatedClaimsCount?: number;
  toolMisuseCount?: number;
  executedAt: string;
  testCaseResults: Record<string, boolean>; // caseId -> passed
}

export interface DriftAnalysis extends QualityAnalysis {}

export class DriftMonitor {
  private baselines = new Map<string, DriftBaseline>();
  private analyses: DriftAnalysis[] = [];

  constructor(
    private readonly store?: WorkspaceStore,
    options: { includeFixtureBaselines?: boolean } = {},
  ) {
    // A durable workspace starts with only saved evidence. Fixture baselines belong
    // only to ephemeral test stores and never appear in a real workspace.
    const saved = this.store?.getQualityState();
    for (const baseline of saved?.baselines || []) this.baselines.set(`${baseline.targetType}:${baseline.targetId}`, baseline);
    this.analyses = [...(saved?.analyses || [])];
    const includeFixtureBaselines = options.includeFixtureBaselines
      ?? this.store?.persistenceMode !== "local_json";
    if (includeFixtureBaselines && !saved?.baselines.length) this.seedFixtureBaselines();
  }

  private persistQualityState(): void {
    this.store?.setQualityState({ baselines: this.listBaselines(), analyses: this.listAnalyses() });
  }

  private seedFixtureBaselines(): void {
    const fixtureBaselines: DriftBaseline[] = [
      {
        id: "fixture-model-a",
        targetId: "fixture-model-a",
        targetType: "model",
        targetVersion: "fixture-v1",
        passRatePct: 96.5,
        avgLatencyMs: 380,
        avgTokensPerTask: 1240,
        toolAccuracyPct: 98.0,
        createdAt: "2026-09-23T00:00:00.000Z",
        testCaseResults: { "bench-code-1": true, "bench-sop-1": true, "bench-tool-1": true },
      },
      {
        id: "fixture-model-b",
        targetId: "fixture-model-b",
        targetType: "model",
        targetVersion: "fixture-v1",
        passRatePct: 94.0,
        avgLatencyMs: 195,
        avgTokensPerTask: 1800,
        toolAccuracyPct: 95.0,
        createdAt: "2026-09-23T00:00:00.000Z",
        testCaseResults: { "bench-code-1": true, "bench-sop-1": true, "bench-tool-1": true },
      },
      {
        id: "fixture-harness-a",
        targetId: "fixture-harness-a",
        targetType: "harness",
        targetVersion: "fixture-v1",
        passRatePct: 98.0,
        avgLatencyMs: 45,
        toolAccuracyPct: 99.0,
        createdAt: "2026-09-23T00:00:00.000Z",
        testCaseResults: { "bench-harness-1": true, "bench-harness-2": true },
      },
    ];

    for (const b of fixtureBaselines) {
      this.baselines.set(`${b.targetType}:${b.targetId}`, b);
    }
  }

  /**
   * Registers or updates a versioned performance baseline
   */
  registerBaseline(baseline: DriftBaseline): void {
    this.baselines.set(`${baseline.targetType}:${baseline.targetId}`, baseline);
    if (this.store) {
      this.store.recordAudit({
        origin: "system",
        actorId: "system",
        actorType: "system",
        action: "DRIFT_BASELINE_REGISTERED",
        targetType: baseline.targetType,
        targetId: baseline.targetId,
        details: { version: baseline.targetVersion, passRatePct: baseline.passRatePct, avgLatencyMs: baseline.avgLatencyMs },
      });
      this.persistQualityState();
    }
  }

  getBaseline(targetType: "model" | "harness" | "agent", targetId: string): DriftBaseline | undefined {
    return this.baselines.get(`${targetType}:${targetId}`);
  }

  listBaselines(): DriftBaseline[] {
    return Array.from(this.baselines.values());
  }

  listAnalyses(): DriftAnalysis[] {
    return [...this.analyses];
  }

  /**
   * Compares candidate run against baseline and determines containment policy
   */
  evaluate(candidate: DriftCandidateRun): DriftAnalysis {
    const key = `${candidate.targetType}:${candidate.targetId}`;
    const baseline = this.baselines.get(key);

    const analysisId = `drift-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const hallucinationDetected = (candidate.hallucinatedClaimsCount || 0) > 0;
    const toolMisuseDetected = (candidate.toolMisuseCount || 0) > 0;

    if (!baseline) {
      // A first run can establish a baseline only when it is clean. Otherwise
      // the system would normalize a hallucination or tool violation and make
      // future degraded behavior look healthy by comparison.
      const action: ContainmentAction = toolMisuseDetected || hallucinationDetected ? "QUARANTINE" : "HEALTHY";
      const initialAnalysis: DriftAnalysis = {
        analysisId,
        runId: candidate.runId,
        targetId: candidate.targetId,
        targetType: candidate.targetType,
        baselineVersion: candidate.targetVersion,
        candidateVersion: candidate.targetVersion,
        latencyDriftMs: 0,
        latencyDriftPct: 0,
        passRateDriftPct: 0,
        regressions: [],
        corrections: [],
        hallucinationDetected,
        toolMisuseDetected,
        action,
        explanation: action === "HEALTHY"
          ? "No prior baseline registered. Baseline established from this clean run."
          : toolMisuseDetected
            ? "No prior baseline registered. Tool misuse prevents this run from establishing a trusted baseline."
            : "No prior baseline registered. Unsupported/hallucinated claims prevent this run from establishing a trusted baseline.",
        analyzedAt: now,
      };
      if (action === "HEALTHY") {
        this.registerBaseline({
          id: `base-${candidate.targetId}-${candidate.targetVersion}`,
          targetId: candidate.targetId,
          targetType: candidate.targetType,
          targetVersion: candidate.targetVersion,
          passRatePct: candidate.passRatePct,
          avgLatencyMs: candidate.avgLatencyMs,
          avgTokensPerTask: candidate.avgTokensPerTask,
          toolAccuracyPct: candidate.toolAccuracyPct,
          createdAt: now,
          testCaseResults: candidate.testCaseResults,
        });
      } else if (this.store) {
        this.store.recordAudit({
          origin: "system",
          actorId: "system",
          actorType: "system",
          action: `DRIFT_EVALUATION_${action}`,
          targetType: candidate.targetType,
          targetId: candidate.targetId,
          details: {
            candidateVersion: candidate.targetVersion,
            runId: candidate.runId,
            action,
            hallucinationDetected,
            toolMisuseDetected,
            explanation: initialAnalysis.explanation,
          },
        });
      }
      this.analyses.push(initialAnalysis);
      this.persistQualityState();
      return initialAnalysis;
    }

    const latencyDriftMs = candidate.avgLatencyMs - baseline.avgLatencyMs;
    const latencyDriftPct = baseline.avgLatencyMs > 0 ? (latencyDriftMs / baseline.avgLatencyMs) * 100 : 0;
    const passRateDriftPct = candidate.passRatePct - baseline.passRatePct;

    // Detect test-case regressions and corrections
    const regressions: string[] = [];
    const corrections: string[] = [];

    for (const [caseId, passed] of Object.entries(candidate.testCaseResults)) {
      const basePassed = baseline.testCaseResults[caseId];
      if (basePassed === true && !passed) {
        regressions.push(caseId);
      } else if (basePassed === false && passed) {
        corrections.push(caseId);
      }
    }

    // Containment policy determination
    let action: ContainmentAction = "HEALTHY";
    let explanation = "Target performance is within baseline variance tolerance.";

    if (passRateDriftPct < -15 || regressions.length >= 3) {
      action = "ROLLBACK";
      explanation = `Severe quality regression: pass rate dropped by ${Math.abs(passRateDriftPct).toFixed(1)} percentage points with ${regressions.length} regressions. Automatic rollback recommended.`;
    } else if (toolMisuseDetected || hallucinationDetected || passRateDriftPct < -7) {
      action = "QUARANTINE";
      explanation = toolMisuseDetected
        ? "Tool misuse detected during evaluation. Target quarantined to prevent execution breaches."
        : hallucinationDetected
        ? "Unsupported/hallucinated claims detected. Target quarantined pending prompt containment."
        : `Moderate pass rate regression of ${Math.abs(passRateDriftPct).toFixed(1)} percentage points. Quarantine recommended.`;
    } else if (passRateDriftPct < -2 || latencyDriftPct > 25) {
      action = "WARN_CONTAINMENT";
      explanation = `Slight performance degradation observed (latency ${latencyDriftPct > 0 ? "+" : ""}${latencyDriftPct.toFixed(1)}%, pass rate ${passRateDriftPct.toFixed(1)} percentage points). Monitoring recommended.`;
    }

    const analysis: DriftAnalysis = {
      analysisId,
      runId: candidate.runId,
      targetId: candidate.targetId,
      targetType: candidate.targetType,
      baselineVersion: baseline.targetVersion,
      candidateVersion: candidate.targetVersion,
      latencyDriftMs,
      latencyDriftPct: Math.round(latencyDriftPct * 10) / 10,
      passRateDriftPct: Math.round(passRateDriftPct * 10) / 10,
      regressions,
      corrections,
      hallucinationDetected,
      toolMisuseDetected,
      action,
      explanation,
      analyzedAt: now,
    };

    this.analyses.push(analysis);

    if (this.store) {
      this.store.recordAudit({
        origin: "system",
        actorId: "system",
        actorType: "system",
        action: `DRIFT_EVALUATION_${action}`,
        targetType: candidate.targetType,
        targetId: candidate.targetId,
        details: {
          candidateVersion: candidate.targetVersion,
          runId: candidate.runId,
          baselineVersion: baseline.targetVersion,
          action,
          passRateDriftPct: analysis.passRateDriftPct,
          latencyDriftMs,
          regressionsCount: regressions.length,
          explanation,
        },
      });
    }

    this.persistQualityState();
    return analysis;
  }
}


