import fs from "node:fs";
import path from "node:path";

function isInsideGitWorktree(filePath: string): boolean {
  let current = path.dirname(filePath);
  while (true) {
    if (fs.existsSync(path.join(current, ".git"))) return true;
    const parent = path.dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

/**
 * Reads a runtime-only secret without accepting an accidental repository file.
 * Direct environment values remain useful for ephemeral local development.
 */
export function readRuntimeSecret(direct: string | undefined, file: string | undefined): string | undefined {
  const value = direct?.trim();
  if (value) return value;
  const configuredPath = file?.trim();
  if (!configuredPath) return undefined;
  try {
    const filePath = path.resolve(configuredPath);
    if (isInsideGitWorktree(filePath)) return undefined;
    const entry = fs.lstatSync(filePath);
    if (!entry.isFile() || entry.isSymbolicLink()) return undefined;
    return fs.readFileSync(filePath, "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}
