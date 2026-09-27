import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (packageJson.main !== "dist/index.js" || packageJson.exports?.["."] !== "./dist/index.js") {
  throw new Error("Package metadata does not point at the public AgentForge entrypoint.");
}
const entrypoint = path.join(root, "dist", "index.js");
if (!fs.existsSync(entrypoint)) throw new Error("Built public entrypoint dist/index.js is missing. Run pnpm build first.");
const listFiles = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? listFiles(target) : [path.relative(root, target).replaceAll(path.sep, "/")];
});
const generatedFiles = listFiles(path.join(root, "dist"));
const staleBuildFiles = generatedFiles.filter(file => /(?:\.ts$|\.test\.[cm]?js$|\/tests?\/)/.test(file));
if (staleBuildFiles.length > 0) {
  throw new Error(`Public package build contains stale source or test artifacts: ${staleBuildFiles.join(", ")}`);
}
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const privateTerms = ["openclaw.json", "Just" + "Call", "GoHigh" + "Level", "seller", "CRM"];
if (privateTerms.some(term => source.toLowerCase().includes(term.toLowerCase()))) {
  throw new Error("Public entrypoint contains a private integration identifier.");
}
const module = await import(pathToFileURL(entrypoint).href);
if (!Array.isArray(module.PUBLIC_SYSTEM_MANIFEST)
  || typeof module.WorkflowEngine !== "function"
  || typeof module.ProcessAgentBridge !== "function"
  || typeof module.ProcessCompiler !== "function"
  || typeof module.ScribeProcessProvider !== "function") {
  throw new Error("Built public entrypoint does not expose the AgentForge system surface.");
}
console.log("PASS: built public package surface is emitted, mapped, importable, and private-integration free.");

// The source surface and the tarball surface are different boundaries. Run the
// archive inspection here so `test:package:surface` and `verify:public` both
// prove what npm would actually publish.
await import("./public-archive-privacy-acceptance.mjs");
