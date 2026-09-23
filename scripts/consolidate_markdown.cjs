const fs = require("fs");
const path = require("path");

const stagingDir = "c:/Users/mscott/AI_Workspace/AgentForge-Staging";
const workspaceDir = "c:/Users/mscott/AI_Workspace";
const destDir = path.join(stagingDir, "all_markdown_files");

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function walkDir(dir, fileList = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (
        item.name === "node_modules" ||
        item.name === ".git" ||
        item.name === "dist" ||
        item.name === "all_markdown_files" ||
        item.name === ".worktrees"
      ) {
        continue;
      }
      walkDir(fullPath, fileList);
    } else if (item.isFile() && item.name.endsWith(".md")) {
      fileList.push({ name: item.name, fullPath, origin: "AgentForge-Staging" });
    }
  }
  return fileList;
}

const markdownFiles = walkDir(stagingDir);

// Include brain conversation artifacts
const brainArtifacts = [
  "C:/Users/mscott/.gemini/antigravity/brain/ac3b4feb-d600-4b20-aa2c-7f357c9266fd/implementation_plan.md",
  "C:/Users/mscott/.gemini/antigravity/brain/ac3b4feb-d600-4b20-aa2c-7f357c9266fd/walkthrough.md"
];
for (const artifact of brainArtifacts) {
  if (fs.existsSync(artifact)) {
    markdownFiles.push({ name: path.basename(artifact), fullPath: artifact, origin: "AgentForge Artifacts" });
  }
}

// Include top-level AI_Workspace markdown files
const topLevelItems = fs.readdirSync(workspaceDir, { withFileTypes: true });
for (const item of topLevelItems) {
  if (item.isFile() && item.name.endsWith(".md")) {
    markdownFiles.push({
      name: item.name,
      fullPath: path.join(workspaceDir, item.name),
      origin: "AI_Workspace Root",
    });
  }
}

console.log(`Total markdown files found: ${markdownFiles.length}`);

const copied = [];
for (const file of markdownFiles) {
  let targetName = file.name;
  if (file.name === "report.md") {
    targetName = "agentforge_report.md";
  }
  const targetPath = path.join(destDir, targetName);
  fs.copyFileSync(file.fullPath, targetPath);
  copied.push({
    name: targetName,
    original: file.fullPath,
    origin: file.origin,
    size: fs.statSync(targetPath).size,
  });
  console.log(`Copied [${file.origin}]: ${file.name} -> ${targetName} (${fs.statSync(targetPath).size} bytes)`);
}

// Generate updated INDEX.md
const indexContent = `# AgentForge & AI Workforce Consolidated Markdown Documentation Index

All **${copied.length}** documentation and specification files collected into a single directory:
\`${destDir}\`

| File Name | Size (Bytes) | Origin / Scope | Description |
|-----------|--------------|----------------|-------------|
${copied.map(c => {
  let desc = "Platform Documentation";
  if (c.name.includes("COMPLETION_ENGINE")) desc = "Anti-Spoon-Feeding & Verified Completion Engine Specification";
  else if (c.name.includes("COMPLETE_AUTONOMOUS_ROADMAP")) desc = "Master Autonomous RC2 → RC40+ Roadmap to Public Release";
  else if (c.name.includes("AUTONOMOUS_MASTER_BUILD_GOAL")) desc = "Autonomous Master Build Goal & Specifications";
  else if (c.name.includes("EXTENSION_GUIDE")) desc = "Process-to-Agent + Voice + Marketplace Guide";
  else if (c.name.includes("RELEASE_CANDIDATE_GOAL")) desc = "Autonomous Release Candidate Goal & Gates";
  else if (c.name.includes("VALIDATION_MIGRATION")) desc = "Master Validation, Migration & Hardening Goal";
  else if (c.name.includes("DURABILITY_DECISION")) desc = "Atomic JSON vs SQLite Durability Decision Record";
  else if (c.name.includes("LICENSE_DECISION")) desc = "Apache 2.0 Evaluation & License Matrix";
  else if (c.name.includes("PROVIDER_READINESS")) desc = "Granular Provider Readiness Audit";
  else if (c.name.includes("MEMORY_AUDIT")) desc = "Operational Memory & Optimizer Audit";
  else if (c.name.includes("PRODUCTION_ISOLATION")) desc = "Strict Staging & Production Isolation Contract";
  else if (c.name.includes("SOUL.md")) desc = "System Persona, Directives & Operating Axioms";
  else if (c.name.includes("AGENTS.md")) desc = "Agent Architecture & Roles";
  else if (c.name.includes("MISSION_CONTROL")) desc = "Mission Control Operator & Operational Bible";
  else if (c.name.includes("TOOLS.md")) desc = "Tools & CLI Registry";
  else if (c.name.includes("IDENTITY.md")) desc = "Identity & Persona Definition";
  else if (c.name.includes("HEARTBEAT.md")) desc = "Operational Heartbeat & State Synchronization";
  return `| [\`${c.name}\`](./${c.name}) | ${c.size} | ${c.origin} | ${desc} |`;
}).join("\n")}
`;

fs.writeFileSync(path.join(destDir, "INDEX.md"), indexContent, "utf-8");
console.log(`Generated INDEX.md in ${destDir} with ${copied.length} files.`);
