import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname);
const html = await readFile(resolve(root, "index.html"), "utf8");
const required = [
  "Illustrative sample workspace — not live runtime data",
  "id=\"operator-replay\"",
  "data-replay-step=\"setup\"",
  "data-replay-step=\"review\"",
  "const replaySteps = {",
  "setReplayStep('setup')",
  "@media (prefers-reduced-motion: no-preference)",
];
const forbidden = [/montelli/i, /prolific/i, /justcall/i, /gohighlevel/i, /kayla/i];

for (const value of required) {
  if (!html.includes(value)) throw new Error(`Missing required static-demo marker: ${value}`);
}
for (const pattern of forbidden) {
  if (pattern.test(html)) throw new Error(`Private or product-specific identifier found: ${pattern}`);
}
if (/(?:src|href)=["']https?:\/\//i.test(html)) {
  throw new Error("The self-contained site must not fetch external page assets.");
}
console.log("PASS: static site has a privacy-safe, self-contained illustrative operator replay.");
