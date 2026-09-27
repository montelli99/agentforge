import crypto from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import type { ArtifactRecord, FileDiffRecord } from "../types/evidence.js";

const MAX_ARTIFACT_BYTES = 32 * 1024 * 1024;

/**
 * Capture generated task artifacts from the conventional artifacts/ directory.
 *
 * Only files already observed in the Git diff are eligible. This prevents an
 * executor from attaching arbitrary workspace files or following a symlink
 * outside the isolated worktree while still making generated deliverables
 * inspectable and tamper-evident in the evidence pack.
 */
export async function collectExecutionArtifacts(
  worktreePath: string,
  filesChanged: FileDiffRecord[],
): Promise<ArtifactRecord[]> {
  const root = path.resolve(worktreePath);
  const candidates = filesChanged.filter(file =>
    file.status !== "deleted" && file.filePath.replace(/\\/g, "/").startsWith("artifacts/"),
  );
  const artifacts: ArtifactRecord[] = [];

  for (const file of candidates) {
    const normalizedPath = file.filePath.replace(/\\/g, "/");
    if (normalizedPath.includes("\0") || normalizedPath.split("/").some(segment => segment === "..")) {
      throw new Error(`Cannot safely collect artifact outside the worktree: ${file.filePath}`);
    }
    const absolutePath = path.resolve(root, normalizedPath);
    const relativePath = path.relative(root, absolutePath);
    if (relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
      throw new Error(`Cannot safely collect artifact outside the worktree: ${file.filePath}`);
    }

    const metadata = await lstat(absolutePath);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error(`Execution artifact must be a regular file: ${file.filePath}`);
    }
    if (metadata.size > MAX_ARTIFACT_BYTES) {
      throw new Error(`Execution artifact exceeds the ${MAX_ARTIFACT_BYTES} byte evidence limit: ${file.filePath}`);
    }
    const content = await readFile(absolutePath);
    artifacts.push({
      name: path.basename(normalizedPath),
      path: normalizedPath,
      sha256: crypto.createHash("sha256").update(content).digest("hex"),
      sizeBytes: content.byteLength,
      mimeType: inferMimeType(normalizedPath),
    });
  }
  return artifacts;
}

function inferMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".json") return "application/json";
  if ([".txt", ".md", ".log", ".csv"].includes(extension)) return "text/plain";
  if (extension === ".html") return "text/html";
  if (extension === ".xml") return "application/xml";
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".png") return "image/png";
  if ([".jpg", ".jpeg"].includes(extension)) return "image/jpeg";
  return "application/octet-stream";
}
