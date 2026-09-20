/**
 * Marketplace & Remote Capability Interfaces
 * Sections 5, 6, 29: Marketplace Domain & Developer Economy
 */

import type { PackageManifest, RemoteCapabilityEndpoint } from "../types/package.js";

export interface MarketplaceRegistryProvider {
  readonly id: string;

  searchPackages(query: { q?: string; category?: string; tags?: string[] }): Promise<PackageManifest[]>;
  getPackage(packageId: string, version?: string): Promise<PackageManifest | null>;
  downloadPackageBundle(packageId: string, version: string): Promise<Buffer>;
}

export interface RemoteCapabilityInvocation {
  capabilityId: string;
  action: string;
  payload: Record<string, unknown>;
  callerWorkspaceId: string;
  timeoutMs?: number;
}

export interface RemoteCapabilityResult {
  success: boolean;
  data: unknown;
  latencyMs: number;
  meteredUnitsUsed?: number;
  error?: string;
}

export interface RemoteCapabilityProvider {
  readonly id: string;

  registerEndpoint(endpoint: RemoteCapabilityEndpoint): void;
  invokeCapability(invocation: RemoteCapabilityInvocation): Promise<RemoteCapabilityResult>;
}

export interface MarketplaceBillingProvider {
  readonly id: string;

  recordUsage(params: {
    workspaceId: string;
    packageId: string;
    units: number;
    meterType: string;
  }): Promise<void>;

  checkEntitlement(params: {
    workspaceId: string;
    packageId: string;
  }): Promise<{ entitled: boolean; reason?: string }>;
}

export interface MarketplacePayoutProvider {
  readonly id: string;

  calculatePublisherRevenue(publisherId: string, period: string): Promise<{ amountUsd: number; netPayoutUsd: number }>;
}
