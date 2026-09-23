/**
 * Canonical Event Ledger & External Binding Manager
 * Section 15: External Bindings
 * Section 16: Event Ledger
 * Handles deduplication, idempotency, state transitions, and audit replay.
 */

import crypto from "node:crypto";
import type { EventLedgerEntry, EventStatus, ExternalBinding } from "../types/ledger.js";

export class EventLedger {
  private ledger: EventLedgerEntry[] = [];
  private seenEventIds = new Set<string>();
  private bindings = new Map<string, ExternalBinding>();

  constructor(private readonly onChange?: () => void) {}

  // Inbound: Receive and deduplicate
  async recordInboundEvent(params: {
    eventId: string;
    origin: EventLedgerEntry["origin"];
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<{ entry: EventLedgerEntry; isDuplicate: boolean }> {
    if (this.seenEventIds.has(params.eventId)) {
      const existing = this.ledger.find(e => e.eventId === params.eventId);
      return { entry: existing!, isDuplicate: true };
    }

    const entry: EventLedgerEntry = {
      id: `ledg-${crypto.randomUUID().slice(0, 8)}`,
      eventId: params.eventId,
      origin: params.origin,
      eventType: params.eventType,
      payload: params.payload,
      status: "accepted",
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    this.seenEventIds.add(params.eventId);
    this.ledger.push(entry);
    this.onChange?.();
    return { entry, isDuplicate: false };
  }

  // Update event transition status
  updateEventStatus(ledgerId: string, status: EventStatus, error?: string): void {
    const entry = this.ledger.find(e => e.id === ledgerId);
    if (entry) {
      entry.status = status;
      if (status === "applied" || status === "delivered") {
        entry.appliedAt = new Date().toISOString();
      }
      if (error) {
        entry.error = error;
      }
      this.onChange?.();
    }
  }

  // Replay events for audit / recovery
  replayEvents(filter?: { origin?: string; eventType?: string }): EventLedgerEntry[] {
    return this.ledger.filter(entry => {
      if (filter?.origin && entry.origin !== filter.origin) return false;
      if (filter?.eventType && entry.eventType !== filter.eventType) return false;
      return true;
    });
  }

  // External Binding Registration
  registerBinding(binding: Omit<ExternalBinding, "id" | "createdAt" | "updatedAt">): ExternalBinding {
    const id = `bind-${crypto.randomUUID().slice(0, 8)}`;
    const fullBinding: ExternalBinding = {
      ...binding,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.bindings.set(id, fullBinding);
    this.onChange?.();
    return fullBinding;
  }

  findBinding(provider: string, externalChannelId: string): ExternalBinding | undefined {
    return Array.from(this.bindings.values()).find(
      b => b.provider === provider && b.externalChannelId === externalChannelId
    );
  }

  getAllEntries(): EventLedgerEntry[] {
    return [...this.ledger];
  }

  getAllBindings(): ExternalBinding[] {
    return [...this.bindings.values()];
  }

  restore(entries: EventLedgerEntry[], bindings: ExternalBinding[]): void {
    this.ledger = [...entries];
    this.seenEventIds = new Set(entries.map(entry => entry.eventId));
    this.bindings = new Map(bindings.map(binding => [binding.id, binding]));
  }
}
