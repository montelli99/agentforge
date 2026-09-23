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

export type ContainmentAction = "HEALTHY" | "WARN_CONTAINMENT" | "QUARANTINE" | "ROLLBACK";

export interface DriftBaseline {
  id: string;
  targetId: string;
  targetType: "model" | "harness" | "agent";
  targetVersion: string;
  passRatePct: number;
  avgLatencyMs: number;
  avgTokensPerTask?: number;
  toolAccuracyPct?: number;
  createdAt: string;
  testCaseResults: Record<string, boolean>; // caseId -> passed
}

export interface DriftCandidateRun {
  runId: string;
  targetId: string;
  targetType: "model" | "harness" | "agent";
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

export interface DriftAnalysis {
  analysisId: string;
  targetId: string;
  targetType: "model" | "harness" | "agent";
  baselineVersion: string;
  candidateVersion: string;
  latencyDriftMs: number;
  latencyDriftPct: number;
  passRateDriftPct: number;
  regressions: string[];
  corrections: string[];
  hallucinationDetected: boolean;
  toolMisuseDetected: boolean;
  action: ContainmentAction;
  explanation: string;
  analyzedAt: string;
}

export class DriftMonitor {
  private baselines = new Map<string, DriftBaseline>();
  private analyses: DriftAnalysis[] = [];

  constructor(private readonly store?: WorkspaceStore) {
    this.seedDefaultBaselines();
  }

  private seedDefaultBaselines(): void {
    const defaultBaselines: DriftBaseline[] = [
      {
        id: "base-mimo-v2.5",
        targetId: "mimo-v2.5",
        targetType: "model",
        targetVersion: "2.5.0",
        passRatePct: 96.5,
        avgLatencyMs: 380,
        avgTokensPerTask: 1240,
        toolAccuracyPct: 98.0,
        createdAt: "2026-09-23T00:00:00.000Z",
        testCaseResults: { "bench-code-1": true, "bench-sop-1": true, "bench-tool-1": true },
      },
      {
        id: "base-ollama-deepseek",
        targetId: "ollama-deepseek",
        targetType: "model",
        targetVersion: "r1-8b",
        passRatePct: 94.0,
        avgLatencyMs: 195,
        avgTokensPerTask: 1800,
        toolAccuracyPct: 95.0,
        createdAt: "2026-09-23T00:00:00.000Z",
        testCaseResults: { "bench-code-1": true, "bench-sop-1": true, "bench-tool-1": true },
      },
      {
        id: "base-harness-pi",
        targetId: "harness-pi",
        targetType: "harness",
        targetVersion: "1.0.0",
        passRatePct: 98.0,
        avgLatencyMs: 45,
        toolAccuracyPct: 99.0,
        createdAt: "2026-09-23T00:00:00.000Z",
        testCaseResults: { "bench-harness-1": true, "bench-harness-2": true },
      },
    ];

    for (const b of defaultBaselines) {
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

    if (!baseline) {
      // First run establishes self as baseline if none exists
      const initialAnalysis: DriftAnalysis = {
        analysisId,
        targetId: candidate.targetId,
        targetType: candidate.targetType,
        baselineVersion: candidate.targetVersion,
        candidateVersion: candidate.targetVersion,
        latencyDriftMs: 0,
        latencyDriftPct: 0,
        passRateDriftPct: 0,
        regressions: [],
        corrections: [],
        hallucinationDetected: (candidate.hallucinatedClaimsCount || 0) > 0,
        toolMisuseDetected: (candidate.toolMisuseCount || 0) > 0,
        action: (candidate.toolMisuseCount || 0) > 0 ? "QUARANTINE" : "HEALTHY",
        explanation: "No prior baseline registered. Baseline established from this run.",
        analyzedAt: now,
      };
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
      this.analyses.push(initialAnalysis);
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

    const hallucinationDetected = (candidate.hallucinatedClaimsCount || 0) > 0;
    const toolMisuseDetected = (candidate.toolMisuseCount || 0) > 0;

    // Containment policy determination
    let action: ContainmentAction = "HEALTHY";
    let explanation = "Target performance is within baseline variance tolerance.";

    if (passRateDriftPct < -15 || regressions.length >= 3) {
      action = "ROLLBACK";
      explanation = `Severe quality regression: pass rate dropped by ${Math.abs(passRateDriftPct).toFixed(1)}% with ${regressions.length} regressions. Automatic rollback recommended.`;
    } else if (toolMisuseDetected || hallucinationDetected || passRateDriftPct < -7) {
      action = "QUARANTINE";
      explanation = toolMisuseDetected
        ? "Tool misuse detected during evaluation. Target quarantined to prevent execution breaches."
        : hallucinationDetected
        ? "Unsupported/hallucinated claims detected. Target quarantined pending prompt containment."
        : `Moderate pass rate regression of ${Math.abs(passRateDriftPct).toFixed(1)}%. Target quarantined.`;
    } else if (passRateDriftPct < -2 || latencyDriftPct > 25) {
      action = "WARN_CONTAINMENT";
      explanation = `Slight performance degradation observed (latency ${latencyDriftPct > 0 ? "+" : ""}${latencyDriftPct.toFixed(1)}%, pass rate ${passRateDriftPct.toFixed(1)}%). Monitored.`;
    }

    const analysis: DriftAnalysis = {
      analysisId,
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
          baselineVersion: baseline.targetVersion,
          action,
          passRateDriftPct: analysis.passRateDriftPct,
          latencyDriftMs,
          regressionsCount: regressions.length,
          explanation,
        },
      });
    }

    return analysis;
  }
}
