#!/usr/bin/env node
/**
 * Metrics export script for dogfood monitoring.
 *
 * Fetches metrics from AgentForge and writes:
 *   reports/metrics-YYYY-MM-DD.json  (full data)
 *   reports/metrics-YYYY-MM-DD.csv   (per-request rows)
 *   reports/summary-YYYY-MM-DD.md    (human-readable daily report)
 */

import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.AGENTFORGE_URL || "http://localhost:3000";
const TODAY = new Date().toISOString().slice(0, 10);
const REPORTS_DIR = path.join(process.cwd(), "reports");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function fetchJson(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

async function fetchText(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.text();
}

function buildCsv(requests) {
  const header = [
    "timestamp",
    "requestId",
    "model",
    "source",
    "channel",
    "project",
    "session",
    "baselineTokens",
    "optimizedTokens",
    "tokensPrevented",
    "reductionPercent",
    "providerCalled",
    "bypass",
    "optimizationType",
    "latencyMs",
    "error",
  ].join(",");

  const rows = (requests || []).map((r) =>
    [
      r.timestamp,
      r.requestId,
      r.model,
      r.source,
      r.channel,
      r.project,
      r.session,
      r.baselineTokens,
      r.optimizedTokens,
      r.tokensPrevented,
      r.reductionPercent?.toFixed(2) || "0",
      r.providerCalled,
      r.bypass,
      (r.optimizationType || "").replace(/,/g, ";"),
      r.latencyMs,
      r.error || "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );

  return [header, ...rows].join("\n");
}

function buildSummaryMd(dashboard, daily) {
  const d = dashboard || {};
  const day = daily || {};

  const openclawRequests = (d.latestRequests || []).filter(
    (r) => r.source === "openclaw",
  ).length;
  const telegramRequests = (d.latestRequests || []).filter(
    (r) => r.channel === "telegram",
  ).length;

  const errors = (d.latestRequests || []).filter((r) => r.error).length;
  const avgLatency =
    (d.latestRequests || []).length > 0
      ? Math.round(
          (d.latestRequests || []).reduce((sum, r) => sum + (r.latencyMs || 0), 0) /
            (d.latestRequests || []).length,
        )
      : 0;

  const topEvents = (d.topSavingsEvents || []).slice(0, 5);
  const hour = new Date().toISOString().slice(0, 16).replace("T", " ");

  return [
    `# AgentForge Daily Summary - ${TODAY}`,
    "",
    `Generated: ${hour} UTC`,
    "",
    "## Overview",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Total requests | ${d.requests ?? 0} |`,
    `| OpenClaw requests | ${openclawRequests} |`,
    `| Telegram requests | ${telegramRequests} |`,
    `| Tokens seen | ${d.tokensSeen ?? 0} |`,
    `| Tokens prevented | ${d.tokensPrevented ?? 0} |`,
    `| Provider calls avoided | ${d.providerCallsAvoided ?? 0} |`,
    `| Estimated cost saved | $${(d.estimatedCostSaved ?? 0).toFixed(6)} |`,
    `| Average reduction | ${(d.averageReductionPercent ?? 0).toFixed(2)}% |`,
    `| Last hour requests | ${d.lastHourRequests ?? 0} |`,
    `| Errors | ${errors} |`,
    `| Avg provider latency | ${avgLatency}ms |`,
    "",
    "## Optimization Breakdown",
    "",
    `| Type | Count |`,
    `| --- | --- |`,
    `| Cache hits | ${d.cacheHits ?? 0} |`,
    `| Memory bypass hits | ${d.memoryBypassHits ?? 0} |`,
    `| Context elimination hits | ${d.contextEliminationHits ?? 0} |`,
    `| Compression savings | ${d.compressionSavings ?? 0} |`,
    "",
    "## Top Savings Events",
    "",
    topEvents.length === 0
      ? "_(no savings events yet)_"
      : topEvents
          .map(
            (e, i) =>
              `${i + 1}. **${e.tokensPrevented} tokens saved** (${e.reductionPercent?.toFixed(1)}% reduction)\n   - Source: ${e.source}/${e.channel}\n   - Model: ${e.model}\n   - Session: ${e.session}`,
          )
          .join("\n"),
    "",
    "## Daily Totals",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Date | ${day.date ?? TODAY} |`,
    `| Requests | ${day.requests ?? 0} |`,
    `| Tokens prevented | ${day.tokensPrevented ?? 0} |`,
    `| Cost saved | $${(day.estimatedCostSaved ?? 0).toFixed(6)} |`,
    `| Provider calls avoided | ${day.providerCallsAvoided ?? 0} |`,
    "",
  ].join("\n");
}

async function main() {
  ensureDir(REPORTS_DIR);

  console.log(`[export:metrics] Fetching from ${BASE_URL}...`);

  const [dashboard, daily, csvText] = await Promise.all([
    fetchJson("/dashboard.json"),
    fetchJson("/summary/daily"),
    fetchText("/metrics.csv"),
  ]);

  const jsonPath = path.join(REPORTS_DIR, `metrics-${TODAY}.json`);
  const csvPath = path.join(REPORTS_DIR, `metrics-${TODAY}.csv`);
  const mdPath = path.join(REPORTS_DIR, `summary-${TODAY}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify({ dashboard, daily, generated: new Date().toISOString() }, null, 2));
  fs.writeFileSync(csvPath, buildCsv(dashboard.latestRequests || []));
  fs.writeFileSync(mdPath, buildSummaryMd(dashboard, daily));

  console.log(`[export:metrics] Wrote:`);
  console.log(`  ${jsonPath}`);
  console.log(`  ${csvPath}`);
  console.log(`  ${mdPath}`);

  const openclawReqs = (dashboard.latestRequests || []).filter(
    (r) => r.source === "openclaw",
  ).length;
  const telegramReqs = (dashboard.latestRequests || []).filter(
    (r) => r.channel === "telegram",
  ).length;

  console.log(`\n[export:metrics] Summary:`);
  console.log(`  Total requests:      ${dashboard.requests}`);
  console.log(`  OpenClaw requests:   ${openclawReqs}`);
  console.log(`  Telegram requests:   ${telegramReqs}`);
  console.log(`  Tokens prevented:    ${dashboard.tokensPrevented}`);
  console.log(`  Provider calls avoided: ${dashboard.providerCallsAvoided}`);
  console.log(`  Avg reduction:       ${(dashboard.averageReductionPercent ?? 0).toFixed(2)}%`);
}

main().catch((err) => {
  console.error("[export:metrics] Error:", err.message);
  process.exit(1);
});
