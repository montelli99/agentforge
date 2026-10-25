import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// This is an explicit public source/build/license/document allowlist. Runtime
// state, browser profiles, caches, screenshots, generated artifacts, research
// working trees, and private engineering handoffs are intentionally absent.
export const publicReleaseAllowlist = [
  ".github",
  "src",
  "scripts",
  "website",
  ".env.example",
  ".gitignore",
  ".gitattributes",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "Dockerfile",
  "docker-compose.yml",
  "FIRST_TESTER_GUIDE.md",
  "LAUNCH_CHECKLIST.md",
  "LICENSE",
  "package.json",
  "pnpm-lock.yaml",
  "QUICKSTART.md",
  "README.md",
  "render.yaml",
  "SECURITY.md",
  "start-server.mjs",
  "start.bat",
  "tsconfig.json",
  "tsconfig.vnext.json",
  "vitest.config.ts",
  "docs/.npmignore",
  "docs/requirements",
  "docs/AGENT_QUALITY_FLYWHEEL.md",
  "docs/APPROVAL_EXECUTION_MAP.md",
  "docs/BROWSER_OPERATIONS.md",
  "docs/CHAT_SETUP.md",
  "docs/MODEL_CONNECTIONS.md",
  "docs/CONVERSATION_EXECUTION.md",
  "docs/RELEASE_COMPLETION_PLAN.md",
  "docs/COMPLETION_AUDIT_2026-09-27.md",
  "docs/CURRENT_BUILD_RECEIPT_2026-10-03.md",
  "docs/DEPLOYMENT_ACCEPTANCE_CHECKLIST.md",
  "docs/DEPLOYMENT_OPTIONS.md",
  "docs/DISCORD_SETUP.md",
  "docs/GOAL_EXECUTION_MAP.md",
  "docs/LIVE_PROVIDER_ACCEPTANCE.md",
  "docs/LOCAL_OPERATIONS.md",
  "docs/NATIVE_GATEWAY_OPERATIONS.md",
  "docs/PRODUCTION_EXECUTION_BOUNDARY.md",
  "docs/PROJECT_FILES.md",
  "docs/PUBLIC_SYSTEM_ARCHITECTURE.md",
  "docs/RELEASE_NEXT_ACTIONS.md",
  "docs/RELEASE_RUNBOOK.md",
  "docs/RELEASE_STATUS.md",
  "docs/RELEASE_VERIFICATION_LOG.md",
  "docs/SLACK_SETUP.md",
];

export async function stagePublicRelease(outputArgument) {
  if (!outputArgument) throw new Error("Usage: node scripts/public-release-stage.mjs <new-output-directory>");
  const output = path.resolve(outputArgument);
  const relativeToRoot = path.relative(root, output);
  if (!relativeToRoot || (!relativeToRoot.startsWith("..") && !path.isAbsolute(relativeToRoot))) {
    throw new Error("Release staging output must be outside the source repository.");
  }
  if (fs.existsSync(output)) throw new Error(`Release staging output already exists: ${output}`);

  await fsp.mkdir(output, { recursive: true });
  for (const relative of publicReleaseAllowlist) {
    const source = path.join(root, relative);
    if (!fs.existsSync(source)) throw new Error(`Required public allowlist input is missing: ${relative}`);
    const destination = path.join(output, relative);
    await fsp.mkdir(path.dirname(destination), { recursive: true });
    await fsp.cp(source, destination, { recursive: true, errorOnExist: true, force: false });
  }

  console.log(JSON.stringify({ output, allowlist: publicReleaseAllowlist, entries: publicReleaseAllowlist.length, passed: true }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await stagePublicRelease(process.argv[2]);
}
