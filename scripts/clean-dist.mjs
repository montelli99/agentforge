import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");

// dist is generated output only. Rebuilding from an empty directory prevents
// stale source files or earlier test artifacts from entering an npm package.
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
