const fs = require("fs");
const path = require("path");

const docsRoot = path.resolve(process.cwd(), "docs");

function collect(directory, documents = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collect(fullPath, documents);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      documents.push(path.relative(docsRoot, fullPath).replaceAll(path.sep, "/"));
    }
  }
  return documents;
}

if (!fs.existsSync(docsRoot)) {
  throw new Error("The public docs directory is missing.");
}

const documents = collect(docsRoot).sort((left, right) => left.localeCompare(right));
console.log(`Public AgentForge documentation: ${documents.length} Markdown files`);
for (const document of documents) console.log(`- ${document}`);