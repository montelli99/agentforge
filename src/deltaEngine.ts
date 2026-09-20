import crypto from "node:crypto";
import type { TokenEstimate } from "./optimization-types.js";
import { estimateTokens } from "./cost.js";

export type ConversationMessage = {
  role: "system" | "user" | "assistant" | "developer";
  content: string;
  timestamp: number;
  hash: string;
};

export type ConversationDelta = {
  sessionId: string;
  turnNumber: number;
  messages: ConversationMessage[];
  deltaMessages: ConversationMessage[];
  fullContextHash: string;
  deltaHash: string;
  originalTokens: TokenEstimate;
  deltaTokens: TokenEstimate;
  savingsPercent: number;
  metadata: {
    totalTurns: number;
    messagesReused: number;
    messagesAdded: number;
    systemPromptCached: boolean;
  };
};

export type SessionState = {
  sessionId: string;
  createdAt: number;
  lastUpdated: number;
  turnCount: number;
  messages: ConversationMessage[];
  systemPrompt: string;
  systemPromptHash: string;
  contextHashes: string[];
  totalTokensSaved: number;
};

const SYSTEM_PATTERNS = [
  /^system:/im,
  /^developer:/im,
  /^you are/i,
  /^act as/i,
  /^role:/im,
];

function isSystemMessage(content: string): boolean {
  return SYSTEM_PATTERNS.some((pattern) => pattern.test(content));
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function hashMessages(messages: ConversationMessage[]): string {
  const combined = messages.map((m) => m.hash).join(":");
  return hashContent(combined);
}

export class DeltaEngine {
  private sessions: Map<string, SessionState> = new Map();
  private maxHistoryTokens: number;
  private maxSessionAge: number;

  constructor(
    maxHistoryTokens: number = 50000,
    maxSessionAge: number = 30 * 60 * 1000,
  ) {
    this.maxHistoryTokens = maxHistoryTokens;
    this.maxSessionAge = maxSessionAge;
  }

  private getOrCreateSession(sessionId: string): SessionState {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        turnCount: 0,
        messages: [],
        systemPrompt: "",
        systemPromptHash: "",
        contextHashes: [],
        totalTokensSaved: 0,
      };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  private extractSystemPrompt(messages: ConversationMessage[]): string {
    const systemMsg = messages.find(
      (m) => m.role === "system" || m.role === "developer",
    );
    return systemMsg?.content || "";
  }

  private filterUserAssistant(messages: ConversationMessage[]): ConversationMessage[] {
    return messages.filter(
      (m) => m.role === "user" || m.role === "assistant",
    );
  }

  createMessage(role: ConversationMessage["role"], content: string): ConversationMessage {
    return {
      role,
      content,
      timestamp: Date.now(),
      hash: hashContent(content),
    };
  }

  processTurn(
    sessionId: string,
    newMessages: ConversationMessage[],
  ): ConversationDelta {
    const session = this.getOrCreateSession(sessionId);
    session.turnCount++;
    session.lastUpdated = Date.now();

    const systemPrompt = this.extractSystemPrompt(newMessages);
    if (systemPrompt && !session.systemPrompt) {
      session.systemPrompt = systemPrompt;
      session.systemPromptHash = hashContent(systemPrompt);
    }

    const userAssistantMessages = this.filterUserAssistant(newMessages);

    const existingHashes = new Set(session.messages.map((m) => m.hash));
    const newUniqueMessages = userAssistantMessages.filter(
      (m) => !existingHashes.has(m.hash),
    );

    session.messages.push(...newUniqueMessages);

    const fullContext = [
      ...(session.systemPrompt
        ? [this.createMessage("system", session.systemPrompt)]
        : []),
      ...session.messages,
    ];

    const fullContextHash = hashMessages(fullContext);

    const lastTurnIndex = session.contextHashes.length - 1;
    const previousHash = lastTurnIndex >= 0 ? session.contextHashes[lastTurnIndex] : "";

    let deltaMessages: ConversationMessage[];
    if (previousHash && previousHash === fullContextHash) {
      deltaMessages = [];
    } else if (session.messages.length > 2) {
      const recentCount = Math.min(4, session.messages.length);
      deltaMessages = session.messages.slice(-recentCount);
    } else {
      deltaMessages = [...session.messages];
    }

    const deltaContext = [
      ...(session.systemPrompt
        ? [this.createMessage("system", session.systemPrompt)]
        : []),
      ...deltaMessages,
    ];

    const deltaHash = hashMessages(deltaContext);
    session.contextHashes.push(fullContextHash);

    const originalTokens = estimateTokens(
      fullContext.map((m) => m.content).join("\n"),
    );
    const deltaTokens = estimateTokens(
      deltaContext.map((m) => m.content).join("\n"),
    );

    const savingsPercent = originalTokens.total > 0
      ? (originalTokens.total - deltaTokens.total) / originalTokens.total
      : 0;

    session.totalTokensSaved += originalTokens.total - deltaTokens.total;

    return {
      sessionId,
      turnNumber: session.turnCount,
      messages: fullContext,
      deltaMessages,
      fullContextHash,
      deltaHash,
      originalTokens,
      deltaTokens,
      savingsPercent,
      metadata: {
        totalTurns: session.turnCount,
        messagesReused: session.messages.length - newUniqueMessages.length,
        messagesAdded: newUniqueMessages.length,
        systemPromptCached: !!session.systemPrompt,
      },
    };
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionStats(sessionId: string): {
    turnCount: number;
    totalTokensSaved: number;
    averageSavingsPerTurn: number;
    messageCount: number;
  } | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    return {
      turnCount: session.turnCount,
      totalTokensSaved: session.totalTokensSaved,
      averageSavingsPerTurn: session.turnCount > 0
        ? session.totalTokensSaved / session.turnCount
        : 0,
      messageCount: session.messages.length,
    };
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  clearAllSessions(): void {
    this.sessions.clear();
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  cleanupExpiredSessions(): number {
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

  formatDeltaForTransmission(delta: ConversationDelta): {
    systemPrompt?: string;
    deltaMessages: ConversationMessage[];
    turnNumber: number;
    totalTurns: number;
    savingsPercent: number;
  } {
    const session = this.sessions.get(delta.sessionId);
    return {
      systemPrompt: session?.systemPrompt || undefined,
      deltaMessages: delta.deltaMessages,
      turnNumber: delta.turnNumber,
      totalTurns: delta.metadata.totalTurns,
      savingsPercent: delta.savingsPercent,
    };
  }
}

let globalDeltaEngine: DeltaEngine | null = null;

export function getDeltaEngine(): DeltaEngine {
  if (!globalDeltaEngine) {
    globalDeltaEngine = new DeltaEngine();
  }
  return globalDeltaEngine;
}

export function resetDeltaEngine(): void {
  globalDeltaEngine = null;
}
