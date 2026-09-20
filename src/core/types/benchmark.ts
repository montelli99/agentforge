/**
 * Benchmark Domain Model & Test Everything Philosophy
 * Sections 22, 23, 24, 25
 * "DO NOT TRUST PROVIDER CLAIMS. MEASURE."
 */

export type BenchmarkTargetType =
  | "MODEL"
  | "HARNESS"
  | "VOICE_PROVIDER"
  | "MEMORY_PROVIDER"
  | "TOOL"
  | "PACKAGE"
  | "COMPUTE";

export interface BenchmarkCase {
  id: string;
  name: string;
  description: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  timeoutMs: number;
  tags: string[];
}

export interface BenchmarkMetric {
  name: string;
  unit: "ms" | "usd" | "percent" | "tokens" | "count" | "ratio";
  value: number;
  passedThreshold?: boolean;
}

export interface QualityThreshold {
  metricName: string;
  comparison: "lte" | "gte" | "eq";
  targetValue: number;
}

export interface BenchmarkResult {
  id: string;
  suiteId: string;
  targetType: BenchmarkTargetType;
  targetId: string;
  targetVersion?: string;

  totalCases: number;
  passedCases: number;
  failedCases: number;

  metrics: BenchmarkMetric[];
  artifacts: Array<{ name: string; url: string }>;

  passedOverall: boolean;
  executedAt: string;
  durationMs: number;
}

export interface CompatibilityResult {
  targetType: BenchmarkTargetType;
  targetId: string;
  compatible: boolean;
  supportedFeatures: string[];
  unsupportedFeatures: string[];
  knownFailures: string[];
  recommendedTiers: string[];
  testedAt: string;
}

export interface BenchmarkSuite {
  id: string;
  name: string;
  targetType: BenchmarkTargetType;
  cases: BenchmarkCase[];
  thresholds: QualityThreshold[];
}
