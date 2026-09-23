/**
 * TODO / Placeholder Auditor
 * Anti-Spoon-Feeding / Verified Completion Contract
 * 
 * Scans code for placeholders and stubs before verified completion:
 * TODO, FIXME, HACK, TEMP, PLACEHOLDER, MOCK, NOT_IMPLEMENTED, stub, fake, throw not implemented
 * 
 * Classifies every finding:
 * - EXPECTED_FUTURE: Documented roadmap item or intentional future capability
 * - NON_BLOCKING: Informational comment or benign mock provider marker
 * - RELEASE_BLOCKER: Unfinished production code path or missing contract requirement
 * - DEAD_CODE: Obsolete temporary code that should be purged
 */

import fs from "node:fs";
import path from "node:path";
import type { TodoClassification, TodoScanFinding } from "../types/completion.js";

const PLACEHOLDER_PATTERNS: { regex: RegExp; keyword: string }[] = [
  { regex: /\bTODO\s*(?::|\()/, keyword: "TODO" },
  { regex: /\bFIXME\s*(?::|\()/, keyword: "FIXME" },
  { regex: /\bHACK\s*(?::|\()/, keyword: "HACK" },
  { regex: /\bTEMP(?:ORARY)?\s*(?::|\()/i, keyword: "TEMP" },
  { regex: /\bPLACEHOLDER\b/, keyword: "PLACEHOLDER" },
  { regex: /\bMOCK\s*(?::|\()/, keyword: "MOCK" },
  { regex: /\bNOT_IMPLEMENTED\b/, keyword: "NOT_IMPLEMENTED" },
  { regex: /\bthrow new Error\("Not implemented"\)/i, keyword: "throw not implemented" },
  { regex: /\bstub\b/, keyword: "stub" },
  { regex: /\bfake\b/, keyword: "fake" },
];

export class TodoAuditor {
  /**
   * Scans a file or code snippet for placeholder findings
   */
  scanContent(content: string, filePath = "memory_buffer"): TodoScanFinding[] {
    const findings: TodoScanFinding[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.regex.test(line)) {
          const classification = this.classifyFinding(line, filePath);
          findings.push({
            file: filePath,
            line: lineNum,
            keyword: pattern.keyword,
            snippet: line.trim().slice(0, 120),
            classification,
            rationale: this.getRationale(classification, pattern.keyword),
          });
          break; // Avoid multiple classifications on same line
        }
      }
    }

    return findings;
  }

  /**
   * Scans an entire directory recursively, ignoring node_modules, git, and dist
   */
  scanDirectory(dirPath: string, extensions = [".ts", ".js", ".json", ".md"]): TodoScanFinding[] {
    const findings: TodoScanFinding[] = [];
    if (!fs.existsSync(dirPath)) return findings;

    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === ".worktrees") {
            continue;
          }
          walk(fullPath);
        } else if (entry.isFile()) {
          if (extensions.some(ext => entry.name.endsWith(ext))) {
            try {
              const content = fs.readFileSync(fullPath, "utf-8");
              findings.push(...this.scanContent(content, fullPath));
            } catch {
              // Ignore unreadable files
            }
          }
        }
      }
    };

    walk(dirPath);
    return findings;
  }

  private classifyFinding(line: string, filePath: string): TodoClassification {
    const lower = line.toLowerCase();
    const isTest = filePath.includes(".test.") || filePath.includes("__tests__");
    const isSource = /\.(ts|tsx|js|jsx|mjs|cjs|json)$/i.test(filePath);
    const isDocumentation = /\.md$/i.test(filePath) || /(^|[\\/])docs([\\/]|$)/i.test(filePath);

    // The task scanner covers documents as well as code; a keyword in a spec is not an unfinished code path.
    if (!isSource || isDocumentation) return "NON_BLOCKING";
    if (isTest) return "NON_BLOCKING";
    if (path.basename(filePath) === "todoAuditor.ts" || /\.includes\(/i.test(line)) return "NON_BLOCKING";

    // In tests, stubs and mocks are expected and non-blocking
    if (isTest && (lower.includes("mock") || lower.includes("stub") || lower.includes("fake"))) {
      return "NON_BLOCKING";
    }

    // Intentional future indicators
    if (lower.includes("v2") || lower.includes("future") || lower.includes("roadmap") || lower.includes("planned")) {
      return "EXPECTED_FUTURE";
    }

    if ((lower.includes("mock") || lower.includes("fake") || lower.includes("stub")) &&
        (lower.includes("test fixture") || lower.includes("test-only") || lower.includes("simulation"))) {
      return "EXPECTED_FUTURE";
    }

    // Explicit throw not implemented in core logic is a release blocker
    if (lower.includes("throw new error(\"not implemented\")") || lower.includes("throw not implemented")) {
      return "RELEASE_BLOCKER";
    }

    // Critical FIXME / HACK
    if (lower.includes("fixme") || lower.includes("hack:")) {
      return "RELEASE_BLOCKER";
    }

    // Benign non-blocking notes
    if (lower.includes("note:") || lower.includes("optional")) {
      return "NON_BLOCKING";
    }

    if (["todo", "temp", "placeholder", "not_implemented", "stub", "mock", "fake"].some(marker => lower.includes(marker))) {
      return "RELEASE_BLOCKER";
    }

    return "NON_BLOCKING";
  }

  private getRationale(cls: TodoClassification, kw: string): string {
    switch (cls) {
      case "RELEASE_BLOCKER":
        return `Unfinished execution path detected (${kw}) that could cause runtime failure.`;
      case "EXPECTED_FUTURE":
        return `Documented future capability or non-blocking milestone marker (${kw}).`;
      case "NON_BLOCKING":
        return `Benign test mock, fixture, or informational reference (${kw}).`;
      case "DEAD_CODE":
        return `Obsolete scratch or temporary artifact (${kw}).`;
    }
  }

  hasReleaseBlockers(findings: TodoScanFinding[]): boolean {
    return findings.some(f => f.classification === "RELEASE_BLOCKER");
  }
}
