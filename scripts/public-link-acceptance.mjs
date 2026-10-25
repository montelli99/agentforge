import fs from "node:fs";
import path from "node:path";
import { publicReleaseAllowlist } from "./public-release-stage.mjs";

const root = process.cwd();
const checkedExtensions = new Set([".html", ".md"]);
const membershipKey = target => {
  const resolved = path.resolve(target);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};

function entriesIn(target) {
  const stats = fs.lstatSync(target);
  if (stats.isSymbolicLink()) throw new Error(`Public link input is a symbolic link: ${path.relative(root, target)}`);
  if (stats.isDirectory()) {
    return [target, ...fs.readdirSync(target, { withFileTypes: true })
      .flatMap(entry => entriesIn(path.join(target, entry.name)))];
  }
  return [target];
}

const publicEntries = [...new Set(publicReleaseAllowlist.flatMap(relative => {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) throw new Error(`Required public link input is missing: ${relative}`);
  return entriesIn(target);
}))];
const publicMembership = new Set(publicEntries.map(membershipKey));
const publicFiles = publicEntries.filter(target => checkedExtensions.has(path.extname(target).toLowerCase()));

function localTarget(rawTarget) {
  let target = rawTarget.trim();
  if (target.startsWith("<") && target.includes(">")) target = target.slice(1, target.indexOf(">"));
  else target = target.split(/\s+["']/u, 1)[0];
  if (!target || target.startsWith("#") || target.startsWith("/")) return null;
  if (/^[a-z][a-z0-9+.-]*:/iu.test(target)) return null;
  target = target.split(/[?#]/u, 1)[0];
  if (!target) return null;
  try { return decodeURIComponent(target); } catch { return target; }
}

const broken = [];
let linksChecked = 0;
for (const file of publicFiles) {
  const content = fs.readFileSync(file, "utf8");
  const targets = [
    ...[...content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/gu)].map(match => match[1]),
    ...[...content.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gmu)].map(match => match[1]),
    ...[...content.matchAll(/\b(?:href|src)=["']([^"']+)["']/giu)].map(match => match[1]),
  ];
  for (const rawTarget of targets) {
    const target = localTarget(rawTarget);
    if (!target) continue;
    linksChecked += 1;
    const resolved = path.resolve(path.dirname(file), target);
    const relativeResolved = path.relative(root, resolved);
    if (relativeResolved.startsWith("..") || path.isAbsolute(relativeResolved)) {
      broken.push(`${path.relative(root, file)} -> ${target} escapes the public tree`);
      continue;
    }
    if (!fs.existsSync(resolved)) {
      broken.push(`${path.relative(root, file)} -> ${target}`);
      continue;
    }
    if (!publicMembership.has(membershipKey(resolved))) {
      broken.push(`${path.relative(root, file)} -> ${target} is excluded from the public export`);
    }
  }
}

if (broken.length) throw new Error(`Broken public links:\n${[...new Set(broken)].sort().join("\n")}`);
console.log(`PASS: ${linksChecked} local links resolve across ${publicFiles.length} allowlisted Markdown/HTML files.`);
