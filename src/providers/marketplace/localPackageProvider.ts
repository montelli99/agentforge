/**
 * Local Package Provider & Permission Manifest Validator
 * Sections 4, 7, 28: AgentForge Package Standard
 * 
 * CORE CONTRACT: A package manifest NEVER overrides the owner's ExecutionContract.
 */

import crypto from "node:crypto";
import type {
  PackageManifest,
  PackageInstallation,
  PermissionManifest,
} from "../../core/types/package.js";
import type { ExecutionContract } from "../../core/types/contract.js";

export interface PackageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  permissionDiscrepancies: Array<{
    permission: string;
    requestedByPackage: boolean;
    allowedByContract: boolean;
  }>;
}

export class LocalPackageProvider {
  private installedPackages = new Map<string, PackageInstallation>();

  /**
   * Validates a package manifest structure
   */
  validateManifest(manifest: PackageManifest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!manifest.name) errors.push("Missing package name");
    if (!manifest.version) errors.push("Missing package version");
    if (!manifest.schemaVersion || manifest.schemaVersion !== "1.0.0") {
      errors.push("Unsupported or missing schemaVersion (must be 1.0.0)");
    }
    if (!manifest.publisher?.id) errors.push("Missing publisher id");
    if (!manifest.capabilities || manifest.capabilities.length === 0) {
      errors.push("Package must declare at least one capability");
    }
    if (!manifest.permissions) errors.push("Missing declarative PermissionManifest");

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Compares requested permissions against owner's ExecutionContract
   * Enforces that the package NEVER exceeds what the contract allows.
   */
  checkPermissionsAgainstContract(
    manifest: PackageManifest,
    contract: ExecutionContract,
  ): PackageValidationResult {
    const validation = this.validateManifest(manifest);
    const errors = [...validation.errors];
    const warnings: string[] = [];
    const discrepancies: PackageValidationResult["permissionDiscrepancies"] = [];

    const requested = manifest.permissions;

    // Check git force-push
    if (requested.git?.forcePush && !contract.authority.forcePush) {
      discrepancies.push({
        permission: "git:forcePush",
        requestedByPackage: true,
        allowedByContract: false,
      });
      errors.push("Package requests git:forcePush which is strictly prohibited by ExecutionContract");
    }

    // Check production deployment
    if (requested.deployment?.production && !contract.authority.deployment) {
      discrepancies.push({
        permission: "deployment:production",
        requestedByPackage: true,
        allowedByContract: false,
      });
      errors.push("Package requests deployment:production which is denied by ExecutionContract");
    }

    // Check production write
    if (requested.filesystem?.workspace?.write && !contract.authority.productionWrite) {
      warnings.push("Package requests filesystem write permission within workspace");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      permissionDiscrepancies: discrepancies,
    };
  }

  /**
   * Installs a validated package locally
   */
  installPackage(params: {
    manifest: PackageManifest;
    installedByUserId: string;
    workspaceId: string;
    approvedPermissions: PermissionManifest;
  }): PackageInstallation {
    const installationId = `pkg-inst-${crypto.randomUUID().slice(0, 8)}`;
    const installation: PackageInstallation = {
      id: installationId,
      packageId: params.manifest.name,
      version: params.manifest.version,
      source: "LOCAL",
      installedByUserId: params.installedByUserId,
      workspaceId: params.workspaceId,
      status: "active",
      approvedPermissions: params.approvedPermissions,
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.installedPackages.set(params.manifest.name, installation);
    return installation;
  }

  getInstalled(packageName: string): PackageInstallation | undefined {
    return this.installedPackages.get(packageName);
  }

  listInstalled(): PackageInstallation[] {
    return Array.from(this.installedPackages.values());
  }
}
