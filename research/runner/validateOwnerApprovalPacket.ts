import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packetPath = path.join(root, "docs/research/OWNER_APPROVAL_PACKET.md");
const templatePath = path.join(root, "research/config/owner-approval-template.json");
const packet = await readFile(packetPath, "utf8");
const template = JSON.parse(await readFile(templatePath, "utf8")) as Record<string, unknown>;

const requiredHeadings = [
  "Model routes",
  "Pricing",
  "Budget",
  "Review",
  "Runtime",
  "Publication",
];
const missingHeadings = requiredHeadings.filter((heading) => !packet.includes(`**${heading}:**`));
const forbiddenPatterns = [
  /(?:sk|pk|api)[-_]?[a-z0-9]{12,}/i,
  /(?:password|secret|token)\s*[:=]\s*\S+/i,
  /@gmail\.com|@outlook\.com|@yahoo\.com/i,
];
const leakedPattern = forbiddenPatterns.find((pattern) => pattern.test(packet));

const status = packet.includes("Status: awaiting owner decisions.") || packet.includes("Status: delegated local-study decisions recorded");
const failures = [
  ...missingHeadings.map((heading) => `missing required decision: ${heading}`),
  ...(status ? [] : ["packet must remain awaiting owner decisions until explicitly approved"]),
  ...(leakedPattern ? ["approval packet contains a credential or personal-data pattern"] : []),
  ...(template.status !== "awaiting_owner_decisions" ? ["owner template must remain awaiting_owner_decisions until explicitly approved"] : []),
  ...(template.budget && typeof template.budget === "object" && (template.budget as Record<string, unknown>).smokeAuthorization !== false ? ["owner template must default to no smoke authorization"] : []),
  ...(template.budget && typeof template.budget === "object" && (template.budget as Record<string, unknown>).pilotAuthorization !== false ? ["owner template must default to no pilot authorization"] : []),
];

if (failures.length) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  valid: true,
  status: "template validated; current-study decisions are separate",
  requiredDecisions: requiredHeadings.length,
  template: "research/config/owner-approval-template.json",
  providerCallsAuthorized: false,
  spendAuthorized: false,
}, null, 2));
