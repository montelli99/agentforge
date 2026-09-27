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
import { inspectPackageZipArchive, type ArchiveInspection } from "./archiveInspector.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

function isSafeRelativePackagePath(file: string): boolean {
  const normalized = file.replaceAll("\\", "/");
  if (!normalized || normalized.includes("\0") || normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return false;
  const segments = normalized.split("/");
  return segments.every(segment => segment !== "" && segment !== "." && segment !== ".."
    && !segment.endsWith(".") && !segment.endsWith(" ")
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment));
}

function validatePermissionManifest(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("Permissions must be an object");
    return;
  }

  const validateSection = (
    key: string,
    booleanKeys: readonly string[],
    stringListKeys: readonly string[] = [],
    nested?: { key: string; booleanKeys: readonly string[] },
    additionalObjectKeys: readonly string[] = [],
  ): void => {
    const section = value[key];
    if (section === undefined) return;
    if (!isRecord(section)) {
      errors.push(`Permission section '${key}' must be an object`);
      return;
    }
    const allowedKeys = [...booleanKeys, ...stringListKeys, ...(nested ? [nested.key] : []), ...additionalObjectKeys];
    if (!hasOnlyKeys(section, allowedKeys)) errors.push(`Permission section '${key}' contains unsupported fields`);
    for (const field of booleanKeys) {
      if (section[field] !== undefined && typeof section[field] !== "boolean") {
        errors.push(`Permission '${key}.${field}' must be a boolean`);
      }
    }
    for (const field of stringListKeys) {
      if (section[field] !== undefined && !isStringArray(section[field])) {
        errors.push(`Permission '${key}.${field}' must be an array of strings`);
      }
    }
    if (nested && section[nested.key] !== undefined) {
      const nestedValue = section[nested.key];
      if (!isRecord(nestedValue)) {
        errors.push(`Permission '${key}.${nested.key}' must be an object`);
      } else {
        if (!hasOnlyKeys(nestedValue, nested.booleanKeys)) {
          errors.push(`Permission '${key}.${nested.key}' contains unsupported fields`);
        }
        for (const field of nested.booleanKeys) {
          if (nestedValue[field] !== undefined && typeof nestedValue[field] !== "boolean") {
            errors.push(`Permission '${key}.${nested.key}.${field}' must be a boolean`);
          }
        }
      }
    }
  };

  if (!hasOnlyKeys(value, ["filesystem", "git", "messaging", "deployment", "network", "secrets"])) {
    errors.push("Permissions contain unsupported sections");
  }
  validateSection("filesystem", [], ["additionalPaths"], { key: "workspace", booleanKeys: ["read", "write"] }, ["home"]);
  const filesystem = value.filesystem;
  if (isRecord(filesystem) && filesystem.home !== undefined) {
    if (!isRecord(filesystem.home) || !hasOnlyKeys(filesystem.home, ["read"])
      || (filesystem.home.read !== undefined && typeof filesystem.home.read !== "boolean")) {
      errors.push("Permission 'filesystem.home' must contain only a boolean read field");
    }
  }
  if (isRecord(filesystem) && isStringArray(filesystem.additionalPaths)) {
    for (const extraPath of filesystem.additionalPaths) {
      if (!isSafeRelativePackagePath(extraPath)) errors.push(`Filesystem permission path is unsafe: ${extraPath}`);
    }
  }
  validateSection("git", ["read", "branch", "commit", "forcePush"]);
  validateSection("messaging", ["draft", "send"], ["channels"]);
  validateSection("deployment", ["staging", "production"]);
  validateSection("network", ["outbound"], ["allowedDomains"]);
  validateSection("secrets", [], ["requiredKeys"]);
}

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

  inspectPackageArchive(manifest: PackageManifest, archive: Uint8Array): ArchiveInspection {
    const inspection = inspectPackageZipArchive(archive);
    const errors = [...inspection.errors, ...this.validatePackage(manifest).violations];
    if (!Array.isArray(manifest.files)) {
      errors.push("Package manifest must enumerate files before archive acceptance.");
    } else {
      const expected = new Set(manifest.files
        .filter((file): file is string => typeof file === "string")
        .map(file => file.replaceAll("\\", "/").toLowerCase()));
      const actual = new Set(inspection.entries.filter(entry => !entry.directory).map(entry => entry.path.replaceAll("\\", "/").toLowerCase()));
      for (const file of expected) if (!actual.has(file)) errors.push("Manifest file is missing from archive: " + file);
      for (const file of actual) if (!expected.has(file)) errors.push("Archive contains an undeclared file: " + file);
    }
    if (manifest.sizeBytes !== undefined && manifest.sizeBytes !== archive.byteLength) {
      errors.push("Manifest sizeBytes does not match the actual archive size.");
    }
    const uniqueErrors = [...new Set(errors)];
    return { ...inspection, valid: uniqueErrors.length === 0, errors: uniqueErrors };
  }

  hasRequestedPermissions(permissions: PermissionManifest): boolean {
    return this.hasGrantedValue(permissions);
  }

  isPermissionApprovalValid(requested: PermissionManifest, approved: unknown): approved is PermissionManifest {
    return this.isPermissionSubset(requested, approved);
  }

  private hasGrantedValue(value: unknown): boolean {
    if (value === true) return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object" && value !== null) {
      return Object.values(value).some(item => this.hasGrantedValue(item));
    }
    return false;
  }

  private isPermissionSubset(requested: unknown, approved: unknown): boolean {
    if (typeof approved === "boolean") return !approved || requested === true;
    if (Array.isArray(approved)) {
      return Array.isArray(requested) && approved.every(item => typeof item === "string" && requested.includes(item));
    }
    if (!approved || typeof approved !== "object") return false;
    if (Array.isArray(requested) || !requested || typeof requested !== "object") return false;
    return Object.entries(approved).every(([key, grant]) =>
      Object.hasOwn(requested, key) && this.isPermissionSubset((requested as Record<string, unknown>)[key], grant));
  }

  /**
   * Validates a package manifest structure
   */
  validateManifest(manifest: PackageManifest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!isRecord(manifest)) return { valid: false, errors: ["Package manifest must be a JSON object"] };
    if (typeof manifest.name !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(manifest.name)
      || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(manifest.name)) {
      errors.push("Package name must be a safe 1-64 character slug");
    }
    if (typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.version)) {
      errors.push("Package version must be a valid semantic version");
    }
    if (manifest.schemaVersion !== "1.0.0") {
      errors.push("Unsupported or missing schemaVersion (must be 1.0.0)");
    }
    if (!isRecord(manifest.publisher) || typeof manifest.publisher.id !== "string" || !manifest.publisher.id.trim()
      || typeof manifest.publisher.name !== "string" || !manifest.publisher.name.trim()
      || (manifest.publisher.verified !== undefined && typeof manifest.publisher.verified !== "boolean")) {
      errors.push("Publisher must include a non-empty id and name");
    }
    if (typeof manifest.description !== "string" || !manifest.description.trim()) errors.push("Package description is required");
    if (typeof manifest.license !== "string" || !manifest.license.trim()) errors.push("Package license declaration is required");
    if (typeof manifest.agentforgeVersion !== "string" || !manifest.agentforgeVersion.trim()) errors.push("AgentForge version range is required");
    if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
      errors.push("Package must declare at least one capability");
    } else {
      const ids = new Set<string>();
      for (const [index, capability] of manifest.capabilities.entries()) {
        if (!isRecord(capability) || typeof capability.id !== "string" || !capability.id.trim()
          || typeof capability.name !== "string" || !capability.name.trim()
          || typeof capability.description !== "string" || !capability.description.trim()
          || !["agent", "skill", "tool", "workflow", "process", "voice", "channel", "policy"].includes(String(capability.type))) {
          errors.push(`Capability at index ${index} is malformed`);
          continue;
        }
        if (ids.has(capability.id)) errors.push(`Duplicate capability id '${capability.id}'`);
        ids.add(capability.id);
      }
    }
    validatePermissionManifest(manifest.permissions, errors);

    if (manifest.publisher && isRecord(manifest.publisher) && manifest.publisher.verified !== undefined
      && typeof manifest.publisher.verified !== "boolean") errors.push("Publisher verified must be a boolean");
    if (manifest.dependencies !== undefined) {
      if (!Array.isArray(manifest.dependencies)) {
        errors.push("Package dependencies must be an array");
      } else {
        const dependencyIds = new Set<string>();
        for (const [index, dependency] of manifest.dependencies.entries()) {
          if (!isRecord(dependency) || typeof dependency.packageId !== "string" || !dependency.packageId.trim()
            || typeof dependency.versionRange !== "string" || !dependency.versionRange.trim()
            || (dependency.optional !== undefined && typeof dependency.optional !== "boolean")) {
            errors.push(`Dependency at index ${index} is malformed`);
            continue;
          }
          if (dependencyIds.has(dependency.packageId)) errors.push(`Duplicate dependency '${dependency.packageId}'`);
          dependencyIds.add(dependency.packageId);
        }
      }
    }
    if (manifest.pricing !== undefined) {
      const pricing = manifest.pricing;
      const models = ["FREE", "ONE_TIME", "SUBSCRIPTION", "USAGE_BASED", "PER_SEAT", "FREEMIUM", "OPEN_SOURCE_SUPPORT"];
      if (!isRecord(pricing) || !models.includes(String(pricing.model))
        || (pricing.amountUsd !== undefined && (typeof pricing.amountUsd !== "number" || !Number.isFinite(pricing.amountUsd) || pricing.amountUsd < 0))
        || (pricing.meterUnit !== undefined && typeof pricing.meterUnit !== "string")) {
        errors.push("Package pricing declaration is malformed");
      }
    }
    if (manifest.scripts !== undefined && (!isRecord(manifest.scripts)
      || !hasOnlyKeys(manifest.scripts, ["preinstall", "postinstall"])
      || Object.values(manifest.scripts).some(script => typeof script !== "string"))) {
      errors.push("Package scripts must be an object containing only string preinstall/postinstall values");
    }
    if (manifest.files !== undefined && !isStringArray(manifest.files)) errors.push("Package files must be an array of strings");
    if (manifest.sizeBytes !== undefined && (!Number.isSafeInteger(manifest.sizeBytes) || manifest.sizeBytes < 0)) {
      errors.push("Package sizeBytes must be a non-negative safe integer");
    }
    if (manifest.testsPath !== undefined && typeof manifest.testsPath !== "string") errors.push("testsPath must be a string");
    if (manifest.documentationPath !== undefined && typeof manifest.documentationPath !== "string") errors.push("documentationPath must be a string");

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
    if (errors.length > 0) {
      return { valid: false, errors, warnings: [], permissionDiscrepancies: [] };
    }
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
   * Validates package manifest and security boundaries against an ExecutionContract
   */
  validatePackage(
    manifest: PackageManifest,
    contract?: ExecutionContract,
  ): {
    valid: boolean;
    violations: string[];
    errors: string[];
    warnings: string[];
  } {
    const violations: string[] = [];
    const baseVal = this.validateManifest(manifest);
    violations.push(...baseVal.errors);

    if (!isRecord(manifest)) return { valid: false, violations, errors: violations, warnings: [] };

    if (contract) {
      const permissions = isRecord(manifest.permissions) ? manifest.permissions : {};
      const git = isRecord(permissions.git) ? permissions.git : {};
      const deployment = isRecord(permissions.deployment) ? permissions.deployment : {};
      const filesystem = isRecord(permissions.filesystem) ? permissions.filesystem : {};
      if (git.forcePush === true && !contract.authority.forcePush) {
        violations.push("Package requests unauthorized git force-push forbidden by contract");
      }
      if (deployment.production === true && !contract.authority.deployment) {
        violations.push("Package requests unauthorized production deployment forbidden by contract");
      }
      if (Array.isArray(filesystem.additionalPaths) && filesystem.additionalPaths.length > 0) {
        violations.push("Package requests unauthorized additionalPaths outside workspace boundary");
      }
    }

    // Check lifecycle scripts (postinstall / preinstall)
    if (isRecord(manifest.scripts) && (manifest.scripts.postinstall || manifest.scripts.preinstall)) {
      violations.push("Package contains forbidden lifecycle script (postinstall/preinstall execution forbidden)");
    }

    // Manifest-only validation cannot inspect archive symlinks; reject unsafe paths before extraction.
    if (Array.isArray(manifest.files)) {
      const binaryExtensions = [".exe", ".dll", ".so", ".dylib", ".bat", ".cmd", ".ps1", ".vbs"];
      const seenFiles = new Set<string>();
      for (const file of manifest.files.filter((item): item is string => typeof item === "string")) {
        const fileKey = file.replaceAll("\\", "/").toLowerCase();
        if (seenFiles.has(fileKey)) violations.push(`Duplicate package file path: ${file}`);
        seenFiles.add(fileKey);
        if (!isSafeRelativePackagePath(file)) {
          violations.push(`Path traversal or absolute path detected in package file: ${file}`);
        }
        const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
        if (binaryExtensions.includes(ext)) {
          violations.push(`Forbidden executable or binary file found in package: ${file}`);
        }
      }
    }

    // Check oversized package
    const MAX_PACKAGE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB limit
    if (typeof manifest.sizeBytes === "number" && manifest.sizeBytes > MAX_PACKAGE_SIZE_BYTES) {
      violations.push(`Oversized package: size ${manifest.sizeBytes} exceeds maximum allowed threshold of ${MAX_PACKAGE_SIZE_BYTES} bytes`);
    }

    // Check dependency cycles
    if (Array.isArray(manifest.dependencies)) {
      const selfRef = manifest.dependencies.find(d => isRecord(d) && d.packageId === manifest.name);
      if (selfRef) {
        violations.push(`Dependency cycle detected: package '${manifest.name}' cannot depend on itself`);
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      errors: violations,
      warnings: [],
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
    const validation = this.validatePackage(params.manifest);
    if (!validation.valid) throw new Error(`Package validation failed: ${validation.violations.join("; ")}`);
    if (!this.isPermissionApprovalValid(params.manifest.permissions, params.approvedPermissions)) {
      throw new Error("Approved package permissions must be a subset of the permissions requested by the manifest.");
    }
    // Package names are the durable installation key. Replacing an existing record
    // would silently discard the publisher/version that the owner reviewed.
    if (this.installedPackages.has(params.manifest.name)) {
      throw new Error("Package is already installed. Uninstall it before installing a replacement so publisher and permission review remain explicit.");
    }
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

  installFromArchive(params: {
    archiveBuffer: Buffer;
    manifest: PackageManifest;
    installedByUserId: string;
    workspaceId: string;
    approvedPermissions: PermissionManifest;
    contract?: ExecutionContract;
  }): { installation: PackageInstallation; inspection: ArchiveInspection } {
    // Installation must enforce the same manifest-to-archive binding as preview.
    // Inspecting ZIP structure alone would allow an undeclared file to be installed.
    const inspection = this.inspectPackageArchive(params.manifest, params.archiveBuffer);
    if (!inspection.valid) {
      throw new Error(`Archive inspection failed: ${inspection.errors.join("; ")}`);
    }

    const validation = this.validatePackage(params.manifest, params.contract);
    if (!validation.valid) {
      throw new Error(`Package validation failed: ${validation.violations.join("; ")}`);
    }

    const installation = this.installPackage({
      manifest: params.manifest,
      installedByUserId: params.installedByUserId,
      workspaceId: params.workspaceId,
      approvedPermissions: params.approvedPermissions,
    });

    return { installation, inspection };
  }

  uninstallPackage(packageName: string): boolean {
    return this.installedPackages.delete(packageName);
  }

  getInstalled(packageName: string): PackageInstallation | undefined {
    return this.installedPackages.get(packageName);
  }

  listInstalled(): PackageInstallation[] {
    return Array.from(this.installedPackages.values());
  }
}
