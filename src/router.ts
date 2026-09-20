import crypto from "node:crypto";
export const DEFAULT_PROVIDER = "openai";
export const DEFAULT_MODEL = "gpt-4o-mini";
import { validateEnvelope, translateEnvelope } from "./adapters.js";
import { PolicyEngine } from "./policy.js";
import { ReflectionEngine } from "./reflection.js";
import { AgentForgeOptimizer, createOptimizer } from "./optimizer.js";
import type { AgentForgeContext, CanonicalEnvelope, RuntimeRequest, ScenarioOutcome } from "./types.js";
import type { OptimizationConfig, OptimizationTelemetry } from "./optimization-types.js";

export type RoutedRun = {
  outcome: ScenarioOutcome;
  notes: string[];
  envelope?: CanonicalEnvelope;
  request?: RuntimeRequest;
  optimization?: OptimizationTelemetry;
};

export class AgentForgeBroker {
  private optimizer: AgentForgeOptimizer | null = null;

  constructor(
    private readonly policy = new PolicyEngine(),
    private readonly reflection = new ReflectionEngine(),
    optimizationConfig?: Partial<OptimizationConfig>,
  ) {
    if (optimizationConfig?.enabled) {
      this.optimizer = createOptimizer(optimizationConfig);
    }
  }

  route(context: AgentForgeContext): RoutedRun {
    if (context.fault === "ambiguous-route" || context.fault === "fallback-exhausted") {
      return { outcome: "reject", notes: ["no deterministic runtime choice"] };
    }

    const policyDecision = this.policy.decide(context);
    if (!policyDecision.allowed) {
      return { outcome: "reject", notes: [policyDecision.reason] };
    }

    const preflight = this.reflection.preflight(context);
    if (preflight.decision === "reject") {
      return { outcome: "reject", notes: preflight.reasons };
    }
    if (preflight.decision === "revise") {
      return { outcome: "reroute", notes: preflight.reasons.length > 0 ? preflight.reasons : ["preflight reflection requested revision"] };
    }

    const envelope: CanonicalEnvelope = {
      runId: crypto.randomUUID(),
      runtimeId: context.selectedRuntime ?? "other",
      transport: context.selectedTransport ?? "stdio",
      trustTier: context.trustTier,
      sideEffecting: context.sideEffecting,
      idempotencyKey: context.sideEffecting ? `idem-${crypto.randomUUID()}` : undefined,
      model: context.selectedModel ?? { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL },
      imageModel: context.imageModel,
      request: { tenantId: context.tenantId },
      policy: { allowed: true },
      reflection: {
        preflight: context.reflection.preflight,
        postResult: context.reflection.postResult,
      },
    };

    const envelopeErrors = validateEnvelope(envelope);
    if (envelopeErrors.length > 0) {
      return { outcome: "reject", notes: envelopeErrors };
    }

    if (context.fault === "adapter-schema-drift") {
      return { outcome: "reject", notes: ["canonical envelope failed adapter translation"] };
    }

    if (context.fault === "auth-failure") {
      return { outcome: "reject", notes: ["transport authentication failed"] };
    }

    if (context.fault === "partial-response") {
      return { outcome: "quarantine", notes: ["stream ended before terminal signal"] };
    }

    if (context.fault === "post-result-reject") {
      return { outcome: "quarantine", notes: ["post-result reflection vetoed output"] };
    }

    if (context.fault === "audit-unavailable") {
      return { outcome: "fail-closed", notes: ["audit store unavailable for side effecting request"] };
    }

    let finalEnvelope = envelope;
    let optimizationTelemetry: OptimizationTelemetry | undefined;

    if (this.optimizer) {
      try {
        const request = translateEnvelope(envelope);
        const optimizationResult = this.optimizer.optimize(envelope, request);
        if (optimizationResult.optimized) {
          finalEnvelope = optimizationResult.envelope;
          optimizationTelemetry = optimizationResult.telemetry;
        }
      } catch (error) {
        // Optimization failed, fall back to original envelope
      }
    }

    const request = translateEnvelope(finalEnvelope);
    if (!request.headers["x-agentforge-run-id"]) {
      return { outcome: "reject", notes: ["translation lost run id"] };
    }

    if (!context.auditAvailable && context.sideEffecting) {
      return { outcome: "fail-closed", notes: ["audit unavailable for side effecting request"] };
    }

    if (context.reflection.postResult === "reject") {
      return { outcome: "quarantine", notes: ["post-result reflection vetoed output"] };
    }

    if (context.reflection.postResult === "revise") {
      return { outcome: "retry", notes: ["post-result reflection requested repair"] };
    }

    const notes = [
      `runtime=${context.selectedRuntime}`,
      `model=${finalEnvelope.model.provider}/${finalEnvelope.model.model}`,
      `transport=${context.selectedTransport}`,
      `headers=${Object.keys(request.headers).length}`,
    ];

    if (optimizationTelemetry) {
      notes.push(`optimization=${optimizationTelemetry.savingsPercent > 0 ? "applied" : "no-op"}`);
      notes.push(`savings=${(optimizationTelemetry.savingsPercent * 100).toFixed(1)}%`);
    }

    return {
      outcome: "pass",
      notes,
      envelope: finalEnvelope,
      request,
      optimization: optimizationTelemetry,
    };
  }
}
