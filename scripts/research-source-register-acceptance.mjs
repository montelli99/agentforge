import { readFile } from "node:fs/promises";

const file = "docs/research/RELATED_WORK.md";
const text = await readFile(file, "utf8");
const required = [
  "https://openclaw.ai/integrations",
  "https://docs.openclaw.ai/channels/telegram",
  "https://hermes-agent.nousresearch.com/docs/getting-started/quickstart/",
  "https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/",
  "https://github.com/CopilotKit/openmuse",
  "https://arxiv.org/abs/2310.08560",
  "https://arxiv.org/abs/2410.10813",
  "https://arxiv.org/abs/2510.04550",
];
const missing = required.filter((url) => !text.includes(url));
const requiredPins = [
  "OpenClaw `openclaw/openclaw` HEAD:",
  "Hermes Agent `NousResearch/hermes-agent` `main`:",
  "OpenMuse `CopilotKit/openmuse` HEAD:",
];
const missingPins = requiredPins.filter((marker) => !text.includes(marker));
const hasBoundary = text.includes("No comparative run has been started") && text.includes("not a novelty determination");

if (missing.length || missingPins.length || !hasBoundary) {
  console.error(JSON.stringify({ passed: false, missing, missingPins, hasBoundary }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  passed: true,
  file,
  sourcesChecked: required.length,
  pinsChecked: requiredPins.length,
  comparisonBoundary: "present",
}, null, 2));
