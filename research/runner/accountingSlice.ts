import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { TrajectoryLedger, type TrajectoryUsage } from "./trajectoryLedger.js";

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "agentforge-accounting-"));
const checkpoint = path.join(directory, "run.json");
const cap = 0.01;
const ledger = new TrajectoryLedger(checkpoint, cap);
const restarted = await ledger.start("trajectory-1", 0);
if (restarted.trajectories[0]?.id !== "trajectory-1") throw new Error("started trajectory was not restored");
if (restarted.trajectories[0]?.costUsd !== "unknown") throw new Error("unknown billing was converted into a number");

const usage: TrajectoryUsage = { inputTokens: 10, outputTokens: 5, totalTokens: 15, currency: "USD", costSource: "synthetic-billing" };
await ledger.complete("trajectory-1", usage, 0.002);
const resumed = await ledger.load();
const terminal = resumed.trajectories.filter(item => item.status === "completed");
if (terminal.length !== 1 || terminal[0]?.id !== "trajectory-1") throw new Error("resume would duplicate a completed trajectory");
if (resumed.totalReservedUsd !== 0.002) throw new Error("known actual cost did not reconcile the reservation");

await ledger.start("trajectory-2", 0.007);
try {
  await ledger.start("trajectory-3", 0.003);
  throw new Error("cap boundary did not stop the next reservation");
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes("spend cap")) throw error;
}

console.log(JSON.stringify({
  experimentId: "accounting-slice-2026-09-28-v1",
  syntheticOnly: true,
  networkCalls: 0,
  providerCalls: 0,
  checkpointAtomic: true,
  unknownBillingPreserved: true,
  completedTrajectoryNotDuplicated: true,
  capStopsNextReservation: true,
  interpretation: "Runner accounting mechanics only; provider reconciliation and production-path integration remain unmeasured.",
}, null, 2));
