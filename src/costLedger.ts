import crypto from "node:crypto";

export type CostEntry = {
  id: string;
  timestamp: number;
  tenantId: string;
  userId?: string;
  projectId?: string;
  sessionId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  cacheHits: number;
  compressionSavingsTokens: number;
  deltaSavingsTokens: number;
  metadata: Record<string, unknown>;
};

export type TenantCostSummary = {
  tenantId: string;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheHits: number;
  totalCompressionSavings: number;
  totalDeltaSavings: number;
  entryCount: number;
  byProvider: Record<string, {
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
    requests: number;
  }>;
  byModel: Record<string, {
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
    requests: number;
  }>;
  byProject: Record<string, {
    costUsd: number;
    requests: number;
  }>;
  byUser: Record<string, {
    costUsd: number;
    requests: number;
  }>;
};

export type CostReport = {
  generatedAt: string;
  totalCostUsd: number;
  totalSavingsUsd: number;
  savingsPercent: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  tenants: TenantCostSummary[];
};

export class CostLedger {
  private entries: CostEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = 100000) {
    this.maxEntries = maxEntries;
  }

  record(params: {
    tenantId: string;
    userId?: string;
    projectId?: string;
    sessionId?: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    inputCostUsd: number;
    outputCostUsd: number;
    cacheHits?: number;
    compressionSavingsTokens?: number;
    deltaSavingsTokens?: number;
    metadata?: Record<string, unknown>;
  }): CostEntry {
    const entry: CostEntry = {
      id: `cost_${crypto.randomUUID().slice(0, 12)}`,
      timestamp: Date.now(),
      tenantId: params.tenantId,
      userId: params.userId,
      projectId: params.projectId,
      sessionId: params.sessionId,
      provider: params.provider,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      inputCostUsd: params.inputCostUsd,
      outputCostUsd: params.outputCostUsd,
      totalCostUsd: params.inputCostUsd + params.outputCostUsd,
      cacheHits: params.cacheHits || 0,
      compressionSavingsTokens: params.compressionSavingsTokens || 0,
      deltaSavingsTokens: params.deltaSavingsTokens || 0,
      metadata: params.metadata || {},
    };

    this.entries.push(entry);
    this.evictIfNeeded();

    return entry;
  }

  private evictIfNeeded(): void {
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  getTenantSummary(tenantId: string): TenantCostSummary {
    const tenantEntries = this.entries.filter((e) => e.tenantId === tenantId);

    const summary: TenantCostSummary = {
      tenantId,
      totalCostUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheHits: 0,
      totalCompressionSavings: 0,
      totalDeltaSavings: 0,
      entryCount: tenantEntries.length,
      byProvider: {},
      byModel: {},
      byProject: {},
      byUser: {},
    };

    for (const entry of tenantEntries) {
      summary.totalCostUsd += entry.totalCostUsd;
      summary.totalInputTokens += entry.inputTokens;
      summary.totalOutputTokens += entry.outputTokens;
      summary.totalCacheHits += entry.cacheHits;
      summary.totalCompressionSavings += entry.compressionSavingsTokens;
      summary.totalDeltaSavings += entry.deltaSavingsTokens;

      if (!summary.byProvider[entry.provider]) {
        summary.byProvider[entry.provider] = {
          costUsd: 0,
          inputTokens: 0,
          outputTokens: 0,
          requests: 0,
        };
      }
      summary.byProvider[entry.provider].costUsd += entry.totalCostUsd;
      summary.byProvider[entry.provider].inputTokens += entry.inputTokens;
      summary.byProvider[entry.provider].outputTokens += entry.outputTokens;
      summary.byProvider[entry.provider].requests++;

      const modelKey = `${entry.provider}/${entry.model}`;
      if (!summary.byModel[modelKey]) {
        summary.byModel[modelKey] = {
          costUsd: 0,
          inputTokens: 0,
          outputTokens: 0,
          requests: 0,
        };
      }
      summary.byModel[modelKey].costUsd += entry.totalCostUsd;
      summary.byModel[modelKey].inputTokens += entry.inputTokens;
      summary.byModel[modelKey].outputTokens += entry.outputTokens;
      summary.byModel[modelKey].requests++;

      if (entry.projectId) {
        if (!summary.byProject[entry.projectId]) {
          summary.byProject[entry.projectId] = { costUsd: 0, requests: 0 };
        }
        summary.byProject[entry.projectId].costUsd += entry.totalCostUsd;
        summary.byProject[entry.projectId].requests++;
      }

      if (entry.userId) {
        if (!summary.byUser[entry.userId]) {
          summary.byUser[entry.userId] = { costUsd: 0, requests: 0 };
        }
        summary.byUser[entry.userId].costUsd += entry.totalCostUsd;
        summary.byUser[entry.userId].requests++;
      }
    }

    return summary;
  }

  getReport(): CostReport {
    const tenantIds = [...new Set(this.entries.map((e) => e.tenantId))];
    const tenants = tenantIds.map((id) => this.getTenantSummary(id));

    let totalCostUsd = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheHits = 0;
    let totalCompressionSavings = 0;
    let totalDeltaSavings = 0;

    for (const tenant of tenants) {
      totalCostUsd += tenant.totalCostUsd;
      totalInputTokens += tenant.totalInputTokens;
      totalOutputTokens += tenant.totalOutputTokens;
      totalCacheHits += tenant.totalCacheHits;
      totalCompressionSavings += tenant.totalCompressionSavings;
      totalDeltaSavings += tenant.totalDeltaSavings;
    }

    const estimatedOriginalCost = totalCostUsd * 1.5;
    const totalSavingsUsd = Math.max(0, estimatedOriginalCost - totalCostUsd);
    const savingsPercent = estimatedOriginalCost > 0
      ? totalSavingsUsd / estimatedOriginalCost
      : 0;

    return {
      generatedAt: new Date().toISOString(),
      totalCostUsd,
      totalSavingsUsd,
      savingsPercent,
      totalRequests: this.entries.length,
      totalInputTokens,
      totalOutputTokens,
      tenants,
    };
  }

  getEntries(params: {
    tenantId?: string;
    provider?: string;
    model?: string;
    since?: number;
    limit?: number;
  } = {}): CostEntry[] {
    let filtered = [...this.entries];

    if (params.tenantId) {
      filtered = filtered.filter((e) => e.tenantId === params.tenantId);
    }
    if (params.provider) {
      filtered = filtered.filter((e) => e.provider === params.provider);
    }
    if (params.model) {
      filtered = filtered.filter((e) => e.model === params.model);
    }
    const since = params.since;
    if (since !== undefined) {
      filtered = filtered.filter((e) => e.timestamp >= since);
    }

    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (params.limit) {
      filtered = filtered.slice(0, params.limit);
    }

    return filtered;
  }

  clear(): void {
    this.entries = [];
  }

  getEntryCount(): number {
    return this.entries.length;
  }
}

let globalCostLedger: CostLedger | null = null;

export function getCostLedger(): CostLedger {
  if (!globalCostLedger) {
    globalCostLedger = new CostLedger();
  }
  return globalCostLedger;
}

export function resetCostLedger(): void {
  globalCostLedger = null;
}
