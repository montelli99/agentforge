import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TrajectoryLedger } from "./trajectoryLedger.js";
test("ledger checkpoints a bounded retry and rejects a third attempt", async () => {
  const dir = await mkdtemp(join(tmpdir(), "af-ledger-"));
  const ledger = new TrajectoryLedger(join(dir, "ledger.json"), 1);
  await ledger.start("t1", 0.25);
  await ledger.fail("t1");
  const retry = await ledger.start("t1", 0.25);
  assert.equal(retry.trajectories[0].attempts, 2);
  await ledger.fail("t1");
  await assert.rejects(ledger.start("t1", 0.25), /retry cap/);
});
