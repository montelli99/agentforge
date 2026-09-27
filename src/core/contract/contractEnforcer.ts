/**
 * Execution Contract Enforcer
 * Section 25: Execution Contract — Core Differentiator
 * Enforces policy and limits BELOW the model and harness.
 */

import fs from "node:fs";
import path from "node:path";
import type { ExecutionContract, AuthorityGates } from "../types/contract.js";

export interface EnforcementViolation {
  rule: "scope_allowed" | "scope_protected" | "authority_gate" | "max_files" | "evidence_missing";
  description: string;
  path?: string;
  gate?: keyof AuthorityGates;
}

export interface ContractValidationResult {
  allowed: boolean;
  violations: EnforcementViolation[];
}

export class ContractEnforcer {
  /**
   * Helper to match simple glob-like paths (supports * and **)
   */
  private matchPathPattern(pattern: string, filePath: string): boolean {
    const normalizedPattern = pattern.replace(/\\/g, "/");
    const normalizedPath = filePath.replace(/\\/g, "/");

    if (normalizedPattern.endsWith("/**")) {
      const prefix = normalizedPattern.slice(0, -3);
      return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
    }

    if (normalizedPattern.includes("*")) {
      const regexStr = "^" + normalizedPattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$";
      return new RegExp(regexStr).test(normalizedPath);
    }

    return normalizedPattern === normalizedPath;
  }

  /**
   * Validates planned or modified file paths against the execution contract
   */
  validateFileModifications(contract: ExecutionContract, modifiedPaths: string[], workspaceRoot?: string): ContractValidationResult {
    const violations: EnforcementViolation[] = [];

    // Check max files
    if (contract.scope.maxFilesChanged !== undefined && modifiedPaths.length > contract.scope.maxFilesChanged) {
      violations.push({
        rule: "max_files",
        description: `Modified files count (${modifiedPaths.length}) exceeds contract maximum (${contract.scope.maxFilesChanged})`,
      });
    }

    for (const filePath of modifiedPaths) {
      const access = this.validatePathAccess(filePath, "write", contract, workspaceRoot);
      if (!access.allowed && access.violation?.includes("protected")) {
        violations.push({
          rule: "scope_protected",
          description: access.violation,
          path: filePath,
        });
        continue;
      }
      if (!access.allowed) {
        violations.push({
          rule: "scope_allowed",
          description: access.violation ?? `Path '${filePath}' is outside contract scope`,
          path: filePath,
        });
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
    };
  }

  /**
   * Validates requested side-effecting operation against AuthorityGates
   */
  checkAuthority(contract: ExecutionContract, requestedAction: keyof AuthorityGates): ContractValidationResult {
    const isGranted = contract.authority[requestedAction] === true;

    if (!isGranted) {
      return {
        allowed: false,
        violations: [
          {
            rule: "authority_gate",
            description: `Operation '${requestedAction}' is denied by ExecutionContract authority gates`,
            gate: requestedAction,
          },
        ],
      };
    }

    return { allowed: true, violations: [] };
  }

  /**
   * Validates individual path access for path traversal, protected files, and allowed boundary
   */
  validatePathAccess(
    filePath: string,
    accessType: "read" | "write",
    contract: ExecutionContract,
    workspaceRoot?: string,
  ): { allowed: boolean; violation?: string } {
    const normalized = filePath.replace(/\\/g, "/");
    const segments = normalized.split("/");

    // 1. Check traversal or out-of-boundary escape
    if (normalized.includes("\0") || segments.some(segment => segment === "..") || normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
      return { allowed: false, violation: `Path outside allowed boundaries: path traversal detected (${filePath})` };
    }

    // 2. Check protected paths
    const isProtected = contract.scope.protectedPaths.some(pattern => this.matchPathPattern(pattern, normalized));
    if (isProtected) {
      return { allowed: false, violation: `Access to protected path forbidden: explicitly protected (${filePath})` };
    }

    // 3. Check allowed paths
    if (contract.scope.allowedPaths && contract.scope.allowedPaths.length > 0) {
      const isAllowed = contract.scope.allowedPaths.some(pattern => this.matchPathPattern(pattern, normalized));
      if (!isAllowed) {
        return { allowed: false, violation: `Path outside allowed boundaries: ${filePath}` };
      }
    }

    if (workspaceRoot) {
      try {
        const canonicalRoot = fs.realpathSync(workspaceRoot);
        const resolvedTarget = path.resolve(canonicalRoot, normalized);
        const relativeTarget = path.relative(canonicalRoot, resolvedTarget);
        if (relativeTarget === ".." || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget)) {
          return { allowed: false, violation: `Path outside allowed boundaries: resolved path escapes workspace (${filePath})` };
        }

        let existingAncestor = resolvedTarget;
        while (!fs.existsSync(existingAncestor)) {
          try {
            fs.lstatSync(existingAncestor);
            break;
          } catch {
            const parent = path.dirname(existingAncestor);
            if (parent === existingAncestor) throw new Error("No existing parent path");
            existingAncestor = parent;
          }
        }

        const canonicalAncestor = fs.realpathSync(existingAncestor);
        const relativeAncestor = path.relative(canonicalRoot, canonicalAncestor);
        if (relativeAncestor === ".." || relativeAncestor.startsWith(`..${path.sep}`) || path.isAbsolute(relativeAncestor)) {
          return { allowed: false, violation: `Path outside allowed boundaries: symlink escapes workspace (${filePath})` };
        }
      } catch {
        return { allowed: false, violation: `Path outside allowed boundaries: could not verify workspace path (${filePath})` };
      }
    }

    return { allowed: true };
  }

  /**
   * Validates shell/bash command against destructive patterns and contract authority
   */
  validateBashCommand(
    command: string,
    contract: ExecutionContract,
  ): { allowed: boolean; violation?: string } {
    const deny = (reason: string) => ({ allowed: false, violation: reason });
    const forbiddenPatterns = [
      /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive|--force)/i,
      /git\s+push.*(--force|-f\b)/i,
      /drop\s+database/i,
      /truncate\s+table/i,
      /mkfs/i,
      /dd\s+if=/i,
      /:(){ :|:& };:/,
    ];

    for (const pat of forbiddenPatterns) {
      if (pat.test(command)) {
        return deny("Forbidden pattern detected in shell command; command text omitted from policy output");
      }
    }

    // These checks are defense in depth. The execution adapter must still run
    // commands inside an OS sandbox because shell syntax can obscure effects.
    const deletesFiles = /\b(?:rm|rmdir|unlink|del|erase)\b|\bRemove-Item\b|\bgit\s+clean\b|\bgit\s+reset\s+--hard\b/i.test(command);
    if (deletesFiles && !contract.authority.deleteFiles) {
      return deny("File deletion is denied by ExecutionContract authority gates");
    }

    const forcePush = /\bgit\s+push\b[^;&|]*(?:--force(?:-with-lease)?|(?:^|\s)-[a-z]*f[a-z]*)/i.test(command);
    if (forcePush && !contract.authority.forcePush) {
      return deny("Force push is denied by ExecutionContract authority gates");
    }

    const outboundNetwork = /\b(?:curl|wget|Invoke-WebRequest|Invoke-RestMethod|fetch|nc|ncat|netcat|ssh|scp|sftp)\b|\bgit\s+(?:push|fetch|pull|clone)\b|\b(?:npm|pnpm|yarn|bun)\s+(?:install|add|publish)\b/i.test(command);
    if (outboundNetwork && !contract.authority.networkOutbound) {
      return deny("Outbound network access is denied by ExecutionContract authority gates");
    }

    const deploysOrPublishes = /\b(?:fly|vercel|wrangler)\s+deploy\b|\b(?:npm|pnpm|yarn|bun)\s+publish\b|\bdocker\s+push\b|\bkubectl\s+apply\b/i.test(command);
    if (deploysOrPublishes && !contract.authority.deployment) {
      return deny("Deployment and package publishing are denied by ExecutionContract authority gates");
    }

    return { allowed: true };
  }

  /**
   * Validates spend amount against contract budget
   */
  validateSpend(
    amount: number,
    contract: ExecutionContract,
  ): { allowed: boolean; violation?: string } {
    const limit = contract.budget?.maxSpendUsd;
    if (limit !== undefined && amount > limit) {
      return {
        allowed: false,
        violation: `Budget limit exceeded: requested $${amount.toFixed(2)} exceeds maximum $${limit.toFixed(2)}`,
      };
    }
    return { allowed: true };
  }
}
