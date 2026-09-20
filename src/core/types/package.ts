/**
 * AgentForge Package Standard & Marketplace Domain Model
 * Sections 4, 5, 6, 7, 28, 29
 */

export type PackageSource = "LOCAL" | "GITHUB" | "REGISTRY" | "MARKETPLACE" | "PRIVATE_REGISTRY";

export type PricingModel =
  | "FREE"
  | "ONE_TIME"
  | "SUBSCRIPTION"
  | "USAGE_BASED"
  | "PER_SEAT"
  | "FREEMIUM"
  | "OPEN_SOURCE_SUPPORT";

export interface PermissionManifest {
  filesystem?: {
    workspace?: { read: boolean; write: boolean };
    home?: { read: boolean };
    additionalPaths?: string[];
  };
  git?: {
    read?: boolean;
    branch?: boolean;
    commit?: boolean;
    forcePush?: boolean; // Default strictly false
  };
  messaging?: {
    draft?: boolean;
    send?: boolean;
    channels?: string[];
  };
  deployment?: {
    staging?: boolean;
    production?: boolean;
  };
  network?: {
    outbound?: boolean;
    allowedDomains?: string[];
  };
  secrets?: {
    requiredKeys?: string[];
  };
}

export interface ModelRequirements {
  structuredOutput?: boolean;
  toolCalling?: boolean;
  minimumContextTokens?: number;
  qualityClass?: "fast" | "standard" | "frontier";
  visionRequired?: boolean;
}

export interface HarnessRequirements {
  preferredHarness?: "pi" | "pydantic" | "native" | string;
  streamingRequired?: boolean;
  mcpRequired?: boolean;
}

export interface PackageCapability {
  id: string;
  name: string;
  description: string;
  type: "agent" | "skill" | "tool" | "workflow" | "process" | "voice" | "channel" | "policy";
}

export interface PackageDependency {
  packageId: string;
  versionRange: string;
  optional?: boolean;
}

export interface PackageManifest {
  schemaVersion: "1.0.0";
  name: string;
  version: string;
  publisher: {
    id: string;
    name: string;
    verified?: boolean;
  };
  description: string;
  license: string;
  agentforgeVersion: string;

  capabilities: PackageCapability[];
  dependencies?: PackageDependency[];
  permissions: PermissionManifest;
  modelRequirements?: ModelRequirements;
  harnessRequirements?: HarnessRequirements;

  pricing?: {
    model: PricingModel;
    amountUsd?: number;
    meterUnit?: string;
  };

  scripts?: {
    preinstall?: string;
    postinstall?: string;
  };

  files?: string[];
  sizeBytes?: number;

  testsPath?: string;
  documentationPath?: string;
}

export interface Publisher {
  id: string;
  name: string;
  email?: string;
  website?: string;
  verified: boolean;
  reputationScore: number;
  createdAt: string;
}

export interface PackageInstallation {
  id: string;
  packageId: string;
  version: string;
  source: PackageSource;
  installedByUserId: string;
  workspaceId: string;
  status: "active" | "disabled" | "error" | "pending_permissions";
  approvedPermissions: PermissionManifest;
  installedAt: string;
  updatedAt: string;
}

export interface RemoteCapabilityEndpoint {
  capabilityId: string;
  endpointUrl: string;
  authenticationType: "bearer" | "mTLS" | "hmac";
  rateLimitPerMinute?: number;
}
