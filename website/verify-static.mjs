import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname);
const html = await readFile(resolve(root, "index.html"), "utf8");
const required = [
  "Illustrative AgentForge workspace — not live runtime data",
  "id=\"operator-replay\"",
  "data-surface=\"workspace\"",
  "data-surface=\"workflow\"",
  "data-surface=\"jev\"",
  "data-surface=\"gateway\"",
  "data-surface=\"execution\"",
  "role=\"tab\"",
  "aria-selected=\"true\"",
  "ArrowDown",
  "const systemViews={",
  "setSystemView('workspace')",
  "@media(prefers-reduced-motion:no-preference)",
  "One control plane.",
  "Every operating layer.",
  "<b>Workforce</b>",
  "<b>JEv</b>",
  "The parts that usually become disconnected.",
  "Messages and inbox",
  "Teams and subgroups",
  "Model and cost routing",
  "Native channel gateway",
  "Public marketplace and migration",
  "#c4b5fd",
  "#7cd4af",
];
const forbidden = [/montelli/i, /prolific/i, /justcall/i, /gohighlevel/i, /kayla/i, /#ec4899/i, /#a855f7/i, /AgentForge 3D/i, /Complete 50-Section/i, /Team Operations/i, /Open Source Core\. Enterprise Governance/i, /\$49/i, /user_montelli/i];

for (const value of required) {
  if (!html.includes(value)) throw new Error(`Missing required static-demo marker: ${value}`);
}
for (const pattern of forbidden) {
  if (pattern.test(html)) throw new Error(`Private, product-specific, or retired visual identifier found: ${pattern}`);
}
if (/(?:src|href)=["']https?:\/\//i.test(html)) {
  throw new Error("The self-contained site must not fetch external page assets.");
}
console.log("PASS: static site has a privacy-safe, self-contained interactive product preview.");