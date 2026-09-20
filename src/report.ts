import type { LabReport, ScenarioResult } from "./types.js";
import type { OptimizationTelemetry } from "./optimization-types.js";
import { aggregateTelemetry, formatTelemetry } from "./telemetry.js";

export function formatReport(report: LabReport): string {
  const lines: string[] = [];
  lines.push("# AgentForge Lab Report");
  lines.push(`Generated: ${report.generatedAt}`);
  if (report.profile) {
    lines.push(`Model: ${report.profile.model.provider}/${report.profile.model.model}`);
    if (report.profile.imageModel) {
      lines.push(
        `Image model: ${report.profile.imageModel.provider}/${report.profile.imageModel.model}`,
      );
    }
  }
  lines.push(`Passed: ${report.passed ? "yes" : "no"}`);
  lines.push(`Scenarios: ${report.total}`);
  lines.push(`Failed: ${report.failed}`);
  lines.push("");

  const optimizationResults = report.results.filter(
    (r) => r.optimization !== undefined,
  );

  if (optimizationResults.length > 0) {
    const telemetryList = optimizationResults
      .map((r) => r.optimization)
      .filter((t): t is OptimizationTelemetry => t !== undefined);
    const aggregated = aggregateTelemetry(telemetryList);

    lines.push("## Optimization Summary");
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`| --- | --- |`);
    lines.push(`| Total original tokens | ${aggregated.totalOriginalTokens} |`);
    lines.push(`| Total optimized tokens | ${aggregated.totalOptimizedTokens} |`);
    lines.push(`| Total savings | ${(aggregated.totalSavingsPercent * 100).toFixed(1)}% |`);
    lines.push(`| Total cost before | $${aggregated.totalCostBefore.toFixed(6)} |`);
    lines.push(`| Total cost after | $${aggregated.totalCostAfter.toFixed(6)} |`);
    lines.push(`| Cache hits | ${aggregated.cacheHits} |`);
    lines.push(`| Cache misses | ${aggregated.cacheMisses} |`);
    lines.push(`| Compressions applied | ${aggregated.compressionsApplied} |`);
    lines.push(`| Context dedups applied | ${aggregated.dedupsApplied} |`);
    lines.push(`| Fallbacks used | ${aggregated.fallbacksUsed} |`);
    lines.push("");
  }

  for (const result of report.results) {
    lines.push(`- ${result.id} ${result.name}: ${result.passed ? "PASS" : "FAIL"}`);
    lines.push(`  expected=${result.expected} actual=${result.actual}`);
    if (result.notes.length > 0) {
      lines.push(`  notes=${result.notes.join(" | ")}`);
    }
    if (result.optimization) {
      lines.push(`  optimization:`);
      lines.push(`    original_tokens=${result.optimization.originalTokens.total}`);
      lines.push(`    optimized_tokens=${result.optimization.optimizedTokens.total}`);
      lines.push(`    savings=${(result.optimization.savingsPercent * 100).toFixed(1)}%`);
      lines.push(`    cache=${result.optimization.cacheStatus}`);
      lines.push(`    model=${result.optimization.selectedModel.provider}/${result.optimization.selectedModel.model}`);
      lines.push(`    reason=${result.optimization.routingReason}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function formatOptimizationSummary(
  telemetry: OptimizationTelemetry,
): string {
  return formatTelemetry(telemetry);
}
