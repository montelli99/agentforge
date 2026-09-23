/**
 * Built-in Standard Benchmark Suites
 * Sections 47, 48: Benchmark Everything & Benchmark Domain
 * Section 29: Voice Benchmarking
 */

import type { BenchmarkSuite } from "../../core/types/benchmark.js";

export const MODEL_INTENT_SUITE: BenchmarkSuite = {
  id: "suite-model-intent-v1",
  name: "Model Fast Intent Classification Benchmark",
  targetType: "MODEL",
  cases: [
    {
      id: "case-intent-greeting",
      name: "User Greeting Intent",
      description: "Classify high-level casual greeting",
      input: { text: "Hello! How are you today?" },
      expectedOutput: { intent: "greeting", confidence: "high" },
      timeoutMs: 1000,
      tags: ["intent", "fast_classifier"],
    },
    {
      id: "case-intent-bug",
      name: "Bug Report Intent",
      description: "Classify stack trace and error report",
      input: { text: "TypeError: Cannot read property 'map' of undefined at line 42" },
      expectedOutput: { intent: "bug_report", confidence: "high" },
      timeoutMs: 1000,
      tags: ["intent", "fast_classifier"],
    },
    {
      id: "case-intent-refactor",
      name: "Refactor Intent",
      description: "Classify code restructuring request",
      input: { text: "Please extract this helper method into a separate utility file" },
      expectedOutput: { intent: "refactor", confidence: "high" },
      timeoutMs: 1000,
      tags: ["intent", "fast_classifier"],
    },
  ],
  thresholds: [
    { metricName: "pass_rate", comparison: "gte", targetValue: 80 },
    { metricName: "avg_latency", comparison: "lte", targetValue: 1200 },
  ],
};

export const MODEL_TOOL_CALLING_SUITE: BenchmarkSuite = {
  id: "suite-model-tools-v1",
  name: "Model Structured Tool Calling Benchmark",
  targetType: "MODEL",
  cases: [
    {
      id: "case-tool-search",
      name: "Search Files Parameter Generation",
      description: "Generate structured search arguments",
      input: { prompt: "Find all typescript files in src/core" },
      expectedOutput: { tool: "find_by_name", pattern: "*.ts", directory: "src/core" },
      timeoutMs: 2500,
      tags: ["tools", "structured"],
    },
    {
      id: "case-tool-test",
      name: "Test Runner Invocation",
      description: "Generate vitest execution command",
      input: { prompt: "Run the task worker runtime unit tests" },
      expectedOutput: { tool: "run_command", command: "npx vitest run taskWorkerRuntime.test.ts" },
      timeoutMs: 2500,
      tags: ["tools", "structured"],
    },
  ],
  thresholds: [
    { metricName: "pass_rate", comparison: "gte", targetValue: 90 },
  ],
};

export const HARNESS_ISOLATION_SUITE: BenchmarkSuite = {
  id: "suite-harness-isolation-v1",
  name: "Harness Execution Isolation & Boundary Benchmark",
  targetType: "HARNESS",
  cases: [
    {
      id: "case-traversal-attack",
      name: "Directory Traversal Prevention",
      description: "Verify path escape ../../etc/passwd is blocked",
      input: { path: "../../etc/passwd", operation: "read" },
      expectedOutput: { blocked: true, reason: "PATH_OUTSIDE_WORKSPACE" },
      timeoutMs: 500,
      tags: ["security", "isolation"],
    },
    {
      id: "case-force-push-attack",
      name: "Git Force Push Rejection",
      description: "Verify unprivileged git force push is rejected",
      input: { command: "git push origin main --force", authority: { forcePush: false } },
      expectedOutput: { blocked: true, reason: "COMMAND_AUTHORITY_DENIED" },
      timeoutMs: 500,
      tags: ["security", "git"],
    },
    {
      id: "case-secret-leak-attack",
      name: "Environment Secret Access Prevention",
      description: "Verify access to .env is forbidden",
      input: { path: ".env", operation: "read" },
      expectedOutput: { blocked: true, reason: "PROTECTED_PATH" },
      timeoutMs: 500,
      tags: ["security", "secrets"],
    },
  ],
  thresholds: [
    { metricName: "pass_rate", comparison: "eq", targetValue: 100 },
  ],
};

export const PACKAGE_MANIFEST_SUITE: BenchmarkSuite = {
  id: "suite-package-manifest-v1",
  name: "Package Manifest Conformance Benchmark",
  targetType: "PACKAGE",
  cases: [
    {
      id: "case-valid-manifest",
      name: "Standard Conforming Manifest",
      description: "Validate valid minimal package manifest",
      input: {
        name: "test-pkg",
        version: "1.0.0",
        permissions: { filesystem: { workspace: { read: true, write: false } } },
      },
      expectedOutput: { valid: true },
      timeoutMs: 500,
      tags: ["package", "validation"],
    },
    {
      id: "case-traversal-manifest",
      name: "Package Path Traversal Rejection",
      description: "Reject manifest with unsafe additional path",
      input: {
        name: "malicious-pkg",
        version: "1.0.0",
        permissions: { filesystem: { additionalPaths: ["../../secret"] } },
      },
      expectedOutput: { valid: false },
      timeoutMs: 500,
      tags: ["package", "security"],
    },
  ],
  thresholds: [
    { metricName: "pass_rate", comparison: "eq", targetValue: 100 },
  ],
};

/**
 * Voice Agent Benchmark Suite — Section 29
 *
 * Covers: webhook signature verification, outbound call gating,
 * transcript normalization, and call lifecycle event dispatch.
 * Measured against MockVoiceProvider to produce repeatable evidence;
 * the same cases can be executed against RetellVoiceProvider when
 * live credentials are available (AGENTFORGE_LIVE_TESTS=1).
 */
export const VOICE_AGENT_SUITE: BenchmarkSuite = {
  id: "suite-voice-agent-v1",
  name: "Voice Agent Provider & Lifecycle Benchmark",
  targetType: "MODEL",
  cases: [
    {
      id: "case-voice-health-check",
      name: "Voice Provider Health Reporting",
      description: "Provider must report NOT_CONFIGURED without credentials, not throw",
      input: { action: "health_check", credentials: null },
      expectedOutput: { healthy: false, reason: "NOT_CONFIGURED" },
      timeoutMs: 500,
      tags: ["voice", "health", "fail_closed"],
    },
    {
      id: "case-voice-outbound-gate",
      name: "Outbound Call Authority Gate",
      description: "Outbound call must be rejected when provider is unconfigured",
      input: { action: "initiate_call", to: "+15551234567", credentials: null },
      expectedOutput: { allowed: false, reason: "PROVIDER_NOT_CONFIGURED" },
      timeoutMs: 500,
      tags: ["voice", "gate", "fail_closed"],
    },
    {
      id: "case-voice-webhook-verification",
      name: "HMAC Webhook Signature Verification",
      description: "A tampered webhook signature must be rejected with 401",
      input: {
        action: "verify_webhook",
        signature: "sha256=tampered_signature",
        body: "{}",
        secret: "test-secret",
      },
      expectedOutput: { verified: false, httpStatus: 401 },
      timeoutMs: 500,
      tags: ["voice", "security", "hmac"],
    },
    {
      id: "case-voice-transcript-normalization",
      name: "Call Transcript Canonical Normalization",
      description: "Raw provider transcript entries normalize to CallTranscript type",
      input: {
        action: "normalize_transcript",
        raw: [{ role: "user", content: "Hello" }, { role: "agent", content: "Hi there!" }],
      },
      expectedOutput: { normalized: true, entryCount: 2, hasTimestamps: false },
      timeoutMs: 500,
      tags: ["voice", "normalization", "domain"],
    },
    {
      id: "case-voice-lifecycle-dispatch",
      name: "Call Lifecycle Event Dispatch",
      description: "Call completion triggers task creation and operational memory record",
      input: {
        action: "dispatch_lifecycle",
        outcome: "completed",
        duration_seconds: 120,
        commitments: ["Follow up on project plan"],
      },
      expectedOutput: { tasksCreated: true, memoryRecorded: true },
      timeoutMs: 1000,
      tags: ["voice", "lifecycle", "governance"],
    },
  ],
  thresholds: [
    { metricName: "pass_rate", comparison: "eq", targetValue: 100 },
    { metricName: "avg_latency", comparison: "lte", targetValue: 800 },
  ],
};

export const STANDARD_BENCHMARK_SUITES: BenchmarkSuite[] = [
  MODEL_INTENT_SUITE,
  MODEL_TOOL_CALLING_SUITE,
  HARNESS_ISOLATION_SUITE,
  PACKAGE_MANIFEST_SUITE,
  VOICE_AGENT_SUITE,
];

