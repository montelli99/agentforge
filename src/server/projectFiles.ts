import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { CanonicalSpace } from "../core/types/workspace.js";

const MAX_PREVIEW = 256 * 1024;
const HIDDEN_NAMES = new Set([".git", "node_modules", ".ssh", ".aws", ".azure", ".codex", ".openclaw", ".gnupg", ".npmrc", ".netrc", "credentials", "secrets"]);
const SAFE_DOTFILES = new Set([".gitignore", ".gitattributes", ".editorconfig", ".prettierignore", ".dockerignore"]);

export class ProjectFileError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function permittedName(name: string): boolean {
  const value = name.toLowerCase();
  return !HIDDEN_NAMES.has(value) && (!value.startsWith(".") || SAFE_DOTFILES.has(value))
    && !/\.(pem|key|p12|pfx|keystore)$/i.test(value) && !/^id_(rsa|ed25519|ecdsa)/i.test(value);
}

/** Explicit read-only connection; a repository reference alone never grants access. */
export async function connectProjectFolder(input: string, actor: string): Promise<NonNullable<CanonicalSpace["repositoryAccess"]>> {
  if (!path.isAbsolute(input) || input.includes("\0") || input.startsWith("\\\\")) throw new ProjectFileError("Choose an absolute local project folder.");
  const root = await fs.realpath(input).catch(() => { throw new ProjectFileError("Project folder was not found.", 404); });
  if (root === path.parse(root).root || root === await fs.realpath(os.homedir())) throw new ProjectFileError("Choose a project folder, not your home folder or an entire drive.");
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) throw new ProjectFileError("Choose a folder.");
  return { rootPath: root, mode: "read", grantedBy: actor, grantedAt: new Date().toISOString(), device: stat.dev, inode: stat.ino };
}

async function resolveFile(project: CanonicalSpace, relative: string) {
  const access = project.repositoryAccess;
  if (!access || access.mode !== "read") throw new ProjectFileError("Connect a project folder before browsing files.", 409);
  if (project.archived) throw new ProjectFileError("Restore this project before browsing its files.", 409);
  if (relative.length > 2000 || relative.includes("\0") || relative.includes(":")) throw new ProjectFileError("Invalid project path.");
  const parts = relative.replaceAll("\\", "/").split("/").filter(Boolean);
  if (path.isAbsolute(relative) || parts.some(part => part === ".." || part === "." || !permittedName(part))) throw new ProjectFileError("This path is outside the available project files.", 403);
  const rootStat = await fs.stat(access.rootPath).catch(() => { throw new ProjectFileError("Connected folder is no longer available.", 409); });
  if (await fs.realpath(access.rootPath) !== access.rootPath || rootStat.dev !== access.device || rootStat.ino !== access.inode) throw new ProjectFileError("The connected folder changed. Reconnect it before browsing.", 409);
  let target = access.rootPath;
  for (const part of parts) {
    target = path.join(target, part);
    const info = await fs.lstat(target).catch(() => { throw new ProjectFileError("File or folder was not found.", 404); });
    if (info.isSymbolicLink()) throw new ProjectFileError("Linked folders and files are excluded from this connection.", 403);
  }
  const real = await fs.realpath(target);
  const fromRoot = path.relative(access.rootPath, real);
  if (fromRoot.startsWith(".." + path.sep) || fromRoot === ".." || path.isAbsolute(fromRoot)) throw new ProjectFileError("File is outside the connected folder.", 403);
  return { target: real, relative: parts.join("/") };
}

export async function listProjectFiles(project: CanonicalSpace, relative = "") {
  const location = await resolveFile(project, relative);
  if (!(await fs.stat(location.target)).isDirectory()) throw new ProjectFileError("Choose a folder to browse.");
  const items = await fs.readdir(location.target, { withFileTypes: true });
  const available = items.filter(item => permittedName(item.name) && !item.isSymbolicLink() && (item.isDirectory() || item.isFile()));
  available.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
  return {
    path: location.relative,
    entries: available.slice(0, 1000).map(item => ({ name: item.name, path: [location.relative, item.name].filter(Boolean).join("/"), kind: item.isDirectory() ? "directory" : "file" })),
    truncated: available.length > 1000,
    excludedCount: items.length - available.length,
  };
}

export async function readProjectFile(project: CanonicalSpace, relative: string) {
  const location = await resolveFile(project, relative);
  const before = await fs.lstat(location.target);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink > 1) throw new ProjectFileError("Only regular, unlinked files can be previewed.", 403);
  if (before.size > MAX_PREVIEW) throw new ProjectFileError("This file exceeds the 256 KiB preview limit.", 413);
  const handle = await fs.open(location.target, "r");
  try {
    const info = await handle.stat();
    if (info.ino !== before.ino || info.dev !== before.dev || !info.isFile() || info.nlink > 1) throw new ProjectFileError("The file changed during preview. Try again.", 409);
    const buffer = Buffer.alloc(MAX_PREVIEW + 1);
    let offset = 0;
    while (offset < buffer.length) { const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset); if (!bytesRead) break; offset += bytesRead; }
    if (offset > MAX_PREVIEW) throw new ProjectFileError("This file exceeds the 256 KiB preview limit.", 413);
    const bytes = buffer.subarray(0, offset);
    if (bytes.includes(0)) throw new ProjectFileError("Binary files are not supported in the text preview.", 415);
    let content: string;
    try { content = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new ProjectFileError("This file is not UTF-8 text.", 415); }
    return { path: location.relative, content, sizeBytes: offset, modifiedAt: info.mtime.toISOString() };
  } finally { await handle.close(); }
}
