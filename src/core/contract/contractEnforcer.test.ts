import { describe, expect, it } from "vitest";
import { ContractEnforcer } from "./contractEnforcer.js";
import type { ExecutionContract } from "../types/contract.js";

const contract: ExecutionContract = {
  id: "contract-zero-file-limit",
  taskId: "task-zero-file-limit",
  version: 1,
  repository: { baseBranch: "main", baseSha: "a".repeat(40) },
  workspace: { requireIsolatedWorktree: true },
  scope: { allowedPaths: ["artifacts/**"], protectedPaths: [], maxFilesChanged: 0 },
  authority: { externalMessage: false, productionWrite: false, deployment: false, forcePush: false, deleteFiles: false, networkOutbound: false },
  requiredChecks: [],
  completion: { requireEvidencePack: true, requireHumanApproval: false },
  createdAt: new Date().toISOString(),
};

describe("ContractEnforcer", () => {
  it("enforces an explicit zero-file change limit", () => {
    const result = new ContractEnforcer().validateFileModifications(contract, ["artifacts/result.txt"]);
    expect(result.allowed).toBe(false);
    expect(result.violations).toContainEqual(expect.objectContaining({ rule: "max_files" }));
  });
});
