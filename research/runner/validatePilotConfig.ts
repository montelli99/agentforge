import fs from "node:fs";
import path from "node:path";

const file = path.resolve("research/config/pilot-v0.1.json");
const config = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
const caps = config.caps as Record<string, unknown>;
const conditions = config.conditions as unknown[];
const requiredUsageFields = config.requiredUsageFields as unknown[];

const failures: string[] = [];
if (config.networkAllowed !== false) failures.push("networkAllowed must be false for the dry-run pilot");
if (config.providerCallsAllowed !== false) failures.push("providerCallsAllowed must be false until authorization");
if (!Array.isArray(conditions) || conditions.length < 3) failures.push("at least three comparison conditions are required");
if (caps.maxEstimatedUsd !== 0) failures.push("dry-run estimated spend must be zero");
if (caps.stopOnUnknownBilling !== true) failures.push("unknown billing must stop the run");
for (const field of ["inputTokens", "outputTokens", "totalTokens", "currency", "costSource"]) {
  if (!requiredUsageFields.includes(field)) failures.push(`usage field missing: ${field}`);
}
if (failures.length) throw new Error(`Pilot config invalid:\n- ${failures.join("\n- ")}`);
console.log(JSON.stringify({ file, valid: true, networkAllowed: false, providerCallsAllowed: false, estimatedUsd: 0 }, null, 2));
