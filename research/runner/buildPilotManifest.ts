import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const configPath = resolve(root, "research/config/pilot-v0.1.json");
const config = JSON.parse(await readFile(configPath, "utf8")) as { experimentId: string; protocolVersion: string; conditions: string[]; developmentTasks: number; replicatesPerCondition: number; providerCallsAllowed: boolean; networkAllowed: boolean; caps: Record<string, unknown> };
if (config.providerCallsAllowed || config.networkAllowed) throw new Error("pilot manifest refuses enabled provider/network flags");
const tasks = JSON.parse(await readFile(resolve(root, "research/tasks/protocol-families-v1.json"), "utf8")) as { families: Array<{ cases: Array<{ id: string }> }> };
const taskIds = tasks.families.flatMap((family) => family.cases.map((item) => item.id));
if (taskIds.length !== config.developmentTasks) throw new Error(`expected ${config.developmentTasks} tasks, found ${taskIds.length}`);
const trajectories = config.conditions.flatMap((condition) => taskIds.flatMap((taskId) => Array.from({ length: config.replicatesPerCondition }, (_, replicate) => ({ trajectoryId: `${config.experimentId}:${condition}:${taskId}:r${replicate + 1}`, condition, taskId, replicate: replicate + 1, status: "planned", usage: "unknown", cost: "unknown" }))));
const manifest = { schemaVersion: 1, experimentId: config.experimentId, protocolVersion: config.protocolVersion, createdAt: new Date().toISOString(), providerCallsAllowed: false, networkAllowed: false, conditions: config.conditions, trajectories, plannedTrajectories: trajectories.length, caps: config.caps, inputHashes: { config: createHash("sha256").update(JSON.stringify(config)).digest("hex"), tasks: createHash("sha256").update(JSON.stringify(tasks)).digest("hex") } };
const output = resolve(root, "research/results/pilot-manifest-v0.1.json");
await writeFile(output, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ output, plannedTrajectories: trajectories.length, conditions: config.conditions, providerCallsAllowed: false, networkAllowed: false }, null, 2));
