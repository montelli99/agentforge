import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("website");
const pages = fs.readdirSync(root).filter(file => file.endsWith(".html"));
const failures = [];

for (const page of pages) {
  const content = fs.readFileSync(path.join(root, page), "utf8");
  if (!/name\s*=\s*(['"])viewport\1/i.test(content)) {
    failures.push(`${page}: missing viewport metadata`);
  }
  if (/width\s*:\s*\d{4,}px/i.test(content) && !/overflow-x\s*:\s*hidden/i.test(content)) {
    failures.push(`${page}: contains a large fixed width without an overflow guard`);
  }
}

assert.deepEqual(failures, [], `Website mobile acceptance failed:\n${failures.join("\n")}`);
console.log(`PASS: checked mobile metadata and fixed-width hazards on ${pages.length} pages.`);
