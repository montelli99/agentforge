import type { ProviderReadinessInfo } from "./core/types/providerReadiness.js";
import type { ExecutionReadiness } from "./core/runtime/taskWorkerRuntime.js";

export interface ReleaseReadinessReport {
  ready: boolean;
  blockers: string[];
  providers: { total: number; productionReady: number; notReady: string[] };
  execution: ExecutionReadiness;
}

/** Build one honest release gate from the current runtime and provider matrix. */
export function buildReleaseReadiness(
  providers: readonly ProviderReadinessInfo[],
  execution: ExecutionReadiness,
): ReleaseReadinessReport {
  const notReady = providers.filter(provider => !provider.productionReady).map(provider => provider.providerId);
  const blockers = [
    ...notReady.map(providerId => `Provider is not release-ready: ${providerId}`),
    ...execution.blockers,
  ];
  return {
    ready: blockers.length === 0,
    blockers,
    providers: { total: providers.length, productionReady: providers.length - notReady.length, notReady },
    execution,
  };
}
