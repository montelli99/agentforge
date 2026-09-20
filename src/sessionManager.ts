import crypto from "node:crypto";
import type { AgentForgeModelChoice, TrustTier } from "./types.js";
import type { TokenEstimate, CostEstimate } from "./optimization-types.js";
import { estimateTokens, estimateCost } from "./cost.js";

export type SessionMessage = {
  role: "system" | "user" | "assistant" | "developer";
  content: string;
  timestamp: number;
  tokenCount: number;
  hash: string;
};

export type SessionState = {
  sessionId: string;
  tenantId: string;
  userId?: string;
  projectId?: string;
  createdAt: number;
  lastUpdated: number;
  turnCount: number;
  messages: SessionMessage[];
  systemPrompt: string;
  systemPromptHash: string;
  model: AgentForgeModelChoice;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  cacheHits: number;
  cacheMisses: number;
  compressionSavings: number;
  deltaSavings: number;
  metadata: Record<string, unknown>;
};

export type SessionMetrics = {
  sessionId: string;
  turnCount: number;
  totalTokens: number;
  totalCostUsd: number;
  averageTokensPerTurn: number;
  cacheHitRate: number;
  compressionSavingsPercent: number;
  deltaSavingsPercent: number;
  duration: number;
};

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export class SessionManager {
  private sessions: Map<string, SessionState> = new Map();
  private maxSessions: number;
  private maxSessionAge: number;

  constructor(
    maxSessions: number = 1000,
    maxSessionAge: number = 60 * 60 * 1000,
  ) {
    this.maxSessions = maxSessions;
    this.maxSessionAge = maxSessionAge;
  }

  createSession(
    tenantId: string,
    model: AgentForgeModelChoice,
    options: {
      userId?: string;
      projectId?: string;
      systemPrompt?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ): SessionState {
    const sessionId = `ses_${crypto.randomUUID().slice(0, 12)}`;
    const now = Date.now();

    const systemPrompt = options.systemPrompt || "";
    const systemPromptHash = hashContent(systemPrompt);

    const session: SessionState = {
      sessionId,
      tenantId,
      userId: options.userId,
      projectId: options.projectId,
      createdAt: now,
      lastUpdated: now,
      turnCount: 0,
      messages: [],
      systemPrompt,
      systemPromptHash,
      model,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      cacheHits: 0,
      cacheMisses: 0,
      compressionSavings: 0,
      deltaSavings: 0,
      metadata: options.metadata || {},
    };

    this.sessions.set(sessionId, session);
    this.evictIfNeeded();

    return session;
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  addMessage(
    sessionId: string,
    role: SessionMessage["role"],
    content: string,
  ): SessionMessage | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const tokenCount = estimateTokens(content);
    const message: SessionMessage = {
      role,
      content,
      timestamp: Date.now(),
      tokenCount: tokenCount.input,
      hash: hashContent(content),
    };

    session.messages.push(message);
    session.lastUpdated = Date.now();
    session.turnCount++;
    session.totalInputTokens += tokenCount.input;

    const cost = estimateCost(session.model, tokenCount);
    session.totalCostUsd += cost.totalCostUsd;

    return message;
  }

  addSystemPrompt(sessionId: string, prompt: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.systemPrompt = prompt;
    session.systemPromptHash = hashContent(prompt);
    session.lastUpdated = Date.now();
    return true;
  }

  updateModel(sessionId: string, model: AgentForgeModelChoice): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.model = model;
    session.lastUpdated = Date.now();
    return true;
  }

  recordCacheHit(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.cacheHits++;
      session.lastUpdated = Date.now();
    }
  }

  recordCacheMiss(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.cacheMisses++;
      session.lastUpdated = Date.now();
    }
  }

  recordCompressionSavings(sessionId: string, tokensSaved: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.compressionSavings += tokensSaved;
      session.lastUpdated = Date.now();
    }
  }

  recordDeltaSavings(sessionId: string, tokensSaved: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.deltaSavings += tokensSaved;
      session.lastUpdated = Date.now();
    }
  }

  getMetrics(sessionId: string): SessionMetrics | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const totalTokens = session.totalInputTokens + session.totalOutputTokens;
    const averageTokensPerTurn = session.turnCount > 0
      ? totalTokens / session.turnCount
      : 0;

    const totalCacheRequests = session.cacheHits + session.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0
      ? session.cacheHits / totalCacheRequests
      : 0;

    const compressionSavingsPercent = session.totalInputTokens > 0
      ? session.compressionSavings / session.totalInputTokens
      : 0;

    const deltaSavingsPercent = session.totalInputTokens > 0
      ? session.deltaSavings / session.totalInputTokens
      : 0;

    return {
      sessionId,
      turnCount: session.turnCount,
      totalTokens,
      totalCostUsd: session.totalCostUsd,
      averageTokensPerTurn,
      cacheHitRate,
      compressionSavingsPercent,
      deltaSavingsPercent,
      duration: session.lastUpdated - session.createdAt,
    };
  }

  getSessionMessages(sessionId: string): SessionMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? [...session.messages] : [];
  }

  getSystemPrompt(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    return session?.systemPrompt || "";
  }

  getRecentMessages(sessionId: string, count: number): SessionMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.messages.slice(-count);
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  listSessions(tenantId?: string): SessionState[] {
    const sessions = Array.from(this.sessions.values());
    if (tenantId) {
      return sessions.filter((s) => s.tenantId === tenantId);
    }
    return sessions;
  }

  private evictIfNeeded(): void {
    if (this.sessions.size <= this.maxSessions) return;

    const now = Date.now();
    const expired: string[] = [];

    for (const [id, session] of this.sessions) {
      if (now - session.lastUpdated > this.maxSessionAge) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      this.sessions.delete(id);
    }

    if (this.sessions.size > this.maxSessions) {
      const sorted = Array.from(this.sessions.entries())
        .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);

      const toRemove = sorted.slice(0, sorted.length - this.maxSessions);
      for (const [id] of toRemove) {
        this.sessions.delete(id);
      }
    }
  }

  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of this.sessions) {
      if (now - session.lastUpdated > this.maxSessionAge) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }

  getStats(): {
    totalSessions: number;
    activeSessions: number;
    totalTurns: number;
    totalTokens: number;
    totalCostUsd: number;
  } {
    const now = Date.now();
    let activeSessions = 0;
    let totalTurns = 0;
    let totalTokens = 0;
    let totalCostUsd = 0;

    for (const session of this.sessions.values()) {
      if (now - session.lastUpdated < this.maxSessionAge) {
        activeSessions++;
      }
      totalTurns += session.turnCount;
      totalTokens += session.totalInputTokens + session.totalOutputTokens;
      totalCostUsd += session.totalCostUsd;
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      totalTurns,
      totalTokens,
      totalCostUsd,
    };
  }
}

let globalSessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!globalSessionManager) {
    globalSessionManager = new SessionManager();
  }
  return globalSessionManager;
}

export function resetSessionManager(): void {
  globalSessionManager = null;
}
