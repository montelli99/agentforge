import { browserObservationFingerprint, JevUltrafastBrowserPolicy, type BrowserAction, type BrowserObservation } from "./jevUltrafastBrowser.js";

export type BrowserSessionMode = "agent" | "human";
export type BrowserSessionState = "attached" | "released";

export type BrowserSession = {
  id: string;
  profileReference: string;
  mode: BrowserSessionMode;
  state: BrowserSessionState;
  currentObservationId?: string;
  /** A non-reversible fingerprint only; page contents remain in the bridge. */
  currentObservationFingerprint?: string;
  currentObservationCapturedAt?: string;
  pendingExternalWrite?: { action: BrowserAction; observationId: string; observationFingerprint: string; capturedAt: string };
  updatedAt: string;
};

/**
 * Provider-neutral ownership for a browser profile. The registry deliberately
 * stores references and observation IDs only; cookies, tokens, and page data
 * stay in the browser harness that supplies the bridge.
 */
export class BrowserSessionRegistry {
  private readonly sessions = new Map<string, BrowserSession>();

  constructor(private readonly now: () => number = Date.now) {}

  attach(id: string, profileReference: string): BrowserSession {
    if (!id.trim() || !profileReference.trim()) throw new Error("A browser session ID and profile reference are required.");
    if (this.sessions.get(id.trim())?.state === "attached") throw new Error(`Browser session ${id.trim()} is already attached.`);
    const session: BrowserSession = { id: id.trim(), profileReference: profileReference.trim(), mode: "agent", state: "attached", updatedAt: new Date().toISOString() };
    this.sessions.set(session.id, session);
    return session;
  }

  observe(id: string, observation: BrowserObservation): BrowserSession {
    const session = this.requireAttached(id);
    const reason = this.policy().validateObservation(observation);
    if (reason) throw new Error(reason);
    const updated = {
      ...session,
      currentObservationId: observation.id,
      currentObservationFingerprint: browserObservationFingerprint(observation),
      currentObservationCapturedAt: observation.capturedAt,
      pendingExternalWrite: undefined,
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(id, updated);
    return updated;
  }

  takeOver(id: string): BrowserSession {
    const session = this.requireAttached(id);
    // Human interaction can change the page without AgentForge observing it.
    // Require a new observation before control can return to the agent.
    const updated = this.clearObservation({ ...session, mode: "human" as const, updatedAt: new Date().toISOString() });
    this.sessions.set(id, updated);
    return updated;
  }

  returnToAgent(id: string): BrowserSession {
    const session = this.requireAttached(id);
    const updated = this.clearObservation({ ...session, mode: "agent" as const, updatedAt: new Date().toISOString() });
    this.sessions.set(id, updated);
    return updated;
  }

  requestExternalWrite(id: string, action: BrowserAction, observation: BrowserObservation): BrowserSession {
    const session = this.requireAttached(id);
    if (session.mode !== "agent") throw new Error("The human currently owns this browser session.");
    const validation = this.policy().validate(observation, action);
    if (!validation.accepted) throw new Error(validation.reason);
    const fingerprint = browserObservationFingerprint(observation);
    if (!session.currentObservationId || session.currentObservationId !== observation.id || session.currentObservationFingerprint !== fingerprint || session.currentObservationCapturedAt !== observation.capturedAt) {
      throw new Error("The action must use the current browser observation.");
    }
    const updated = {
      ...session,
      pendingExternalWrite: { action: { ...action }, observationId: action.observationId, observationFingerprint: fingerprint, capturedAt: observation.capturedAt },
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(id, updated);
    return updated;
  }

  approveExternalWrite(id: string, observationId: string): BrowserAction {
    const session = this.requireAttached(id);
    if (session.mode !== "agent") throw new Error("The human currently owns this browser session.");
    const pending = session.pendingExternalWrite;
    if (!pending || pending.observationId !== observationId || pending.observationFingerprint !== session.currentObservationFingerprint) throw new Error("No matching browser write is awaiting approval.");
    const capturedAt = Date.parse(pending.capturedAt);
    if (!Number.isFinite(capturedAt) || this.now() - capturedAt > 30_000) {
      this.sessions.set(id, { ...session, pendingExternalWrite: undefined, updatedAt: new Date().toISOString() });
      throw new Error("Browser write approval expired; capture a fresh observation and request it again.");
    }
    this.sessions.set(id, { ...session, pendingExternalWrite: undefined, updatedAt: new Date().toISOString() });
    return { ...pending.action };
  }

  release(id: string): BrowserSession {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Browser session ${id} not found.`);
    const updated = this.clearObservation({ ...session, state: "released" as const, updatedAt: new Date().toISOString() });
    this.sessions.set(id, updated);
    return updated;
  }

  get(id: string): BrowserSession | undefined { return this.sessions.get(id); }
  list(): BrowserSession[] {
    return [...this.sessions.values()].map(session => ({
      ...session,
      ...(session.pendingExternalWrite ? { pendingExternalWrite: { ...session.pendingExternalWrite, action: { ...session.pendingExternalWrite.action } } } : {}),
    }));
  }

  private clearObservation(session: BrowserSession): BrowserSession {
    const { currentObservationId: _currentObservationId, currentObservationFingerprint: _currentObservationFingerprint, currentObservationCapturedAt: _currentObservationCapturedAt, pendingExternalWrite: _pendingExternalWrite, ...withoutObservation } = session;
    return withoutObservation;
  }

  private policy(): JevUltrafastBrowserPolicy {
    return new JevUltrafastBrowserPolicy({ now: this.now });
  }

  private requireAttached(id: string): BrowserSession {
    const session = this.sessions.get(id);
    if (!session || session.state !== "attached") throw new Error(`Browser session ${id} is not attached.`);
    return session;
  }
}
