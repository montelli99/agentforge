import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CompletionEngine, JsonCompletionSessionStore } from "../../src/core/completion/index.js";

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "agentforge-handoff-"));
const sessionPath = path.join(directory, "sessions.json");
const goal = "Complete the synthetic task while preserving the privacy boundary and evidence requirements.";
const first = new CompletionEngine(undefined, new JsonCompletionSessionStore(sessionPath));
const created = first.initializeSession("research-handoff-fixture", goal, "synthetic-owner");
const started = first.startExecution(created.taskId);
const replacement = new CompletionEngine(undefined, new JsonCompletionSessionStore(sessionPath));
const restored = replacement.getSession(created.taskId);

if (!restored) throw new Error("handoff session was not restored");
if (restored.originalGoal.immutableHash !== created.originalGoal.immutableHash) throw new Error("goal hash changed during handoff");
if (restored.state !== started.state) throw new Error("execution state changed during handoff");
if (JSON.stringify(restored.prd.requirements) !== JSON.stringify(started.prd.requirements)) throw new Error("requirements changed during handoff");
if (JSON.stringify(restored.dag) !== JSON.stringify(started.dag)) throw new Error("execution DAG changed during handoff");

console.log(JSON.stringify({
  experimentId: "handoff-slice-2026-09-28-v1",
  syntheticOnly: true,
  networkCalls: 0,
  restored: Boolean(restored),
  state: restored?.state,
  goalHashPreserved: restored?.originalGoal.immutableHash === created.originalGoal.immutableHash,
  statePreserved: restored?.state === started.state,
  requirementsPreserved: JSON.stringify(restored?.prd.requirements) === JSON.stringify(started.prd.requirements),
  dagPreserved: JSON.stringify(restored?.dag) === JSON.stringify(started.dag),
  interpretation: "Mechanics only; this verifies persisted execution state and immutable goal continuity, not a model's ability to resume useful work.",
}, null, 2));
