/**
 * DecisionProvider Interface
 * Section 8 & 9: Model Architecture & Decision Models
 * Strictly separated from GenerativeModelProvider.
 * Used for cheap, sub-millisecond or fast System-1 classification, routing, and policy checks.
 */

export interface DecisionClassificationTarget {
  category: string;
  confidence: number;
  reason?: string;
}

export interface DecisionRequest {
  id: string;
  taskType: string;
  input: string;
  candidates: string[];
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface DecisionOutcome {
  requestId: string;
  providerId: string;
  selectedCandidate: string;
  confidence: number;
  rankings: DecisionClassificationTarget[];
  latencyMs: number;
  costUsd: number;
}

export interface DecisionProvider {
  readonly id: string;
  readonly name: string;

  isAvailable(): Promise<boolean>;
  classify(request: DecisionRequest): Promise<DecisionOutcome>;
  batchClassify?(requests: DecisionRequest[]): Promise<DecisionOutcome[]>;
}
