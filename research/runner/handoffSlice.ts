import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CompletionEngine, JsonCompletionSessionStore } from "../../src/core/completion/index.js";

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "agentforge-handoff-"));
const sessionPath = path.join(directory, "sessions.json");
const goal = "Complete the synthetic task while preserving the privacy boundary and evidence requirements.";
const first = new CompletionEngine(undefined, new JsonCompletionSessionStore(sessionPath));
const created = first.initializeSession("research-handoff-fixture", goal, "synthetic-owner");
first.startExecution(created.taskId);
const replacement = new CompletionEngine(undefined, new JsonCompletionSessionStore(sessionPath));
const restored = replacement.getSession(created.taskId);

console.log(JSON.stringify({
  experimentId: "handoff-slice-2026-09-28-v1",
  syntheticOnly: true,
  networkCalls: 0,
  restored: Boolean(restored),
  state: restored?.state,
  goalHashPreserved: restored?.originalGoal.immutableHash === created.originalGoal.immutableHash,
  requirementsPreserved: restored?.prd.requirements.length === created.prd.requirements.length,
  dagPreserved: restored?.dag.length === created.dag.length,
  interpretation: "Mechanics only; this verifies persisted execution state and immutable goal continuity, not a model's ability to resume useful work.",
}, null, 2));
