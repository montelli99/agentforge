/**
 * Execution Contract Enforcer
 * Section 25: Execution Contract — Core Differentiator
 * Enforces policy and limits BELOW the model and harness.
 */

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
  validateFileModifications(contract: ExecutionContract, modifiedPaths: string[]): ContractValidationResult {
    const violations: EnforcementViolation[] = [];

    // Check max files
    if (contract.scope.maxFilesChanged && modifiedPaths.length > contract.scope.maxFilesChanged) {
      violations.push({
        rule: "max_files",
        description: `Modified files count (${modifiedPaths.length}) exceeds contract maximum (${contract.scope.maxFilesChanged})`,
      });
    }

    for (const filePath of modifiedPaths) {
      // 1. Check protected paths (Strict veto)
      const isProtected = contract.scope.protectedPaths.some(pattern =>
        this.matchPathPattern(pattern, filePath)
      );

      if (isProtected) {
        violations.push({
          rule: "scope_protected",
          description: `Path '${filePath}' is explicitly protected by contract ${contract.id}`,
          path: filePath,
        });
        continue;
      }

      // 2. Check allowed paths (If allowedPaths specified, must match at least one)
      if (contract.scope.allowedPaths && contract.scope.allowedPaths.length > 0) {
        const isAllowed = contract.scope.allowedPaths.some(pattern =>
          this.matchPathPattern(pattern, filePath)
        );

        if (!isAllowed) {
          violations.push({
            rule: "scope_allowed",
            description: `Path '${filePath}' is outside allowed scope: [${contract.scope.allowedPaths.join(", ")}]`,
            path: filePath,
          });
        }
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
}
