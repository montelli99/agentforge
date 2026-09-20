import type { CanonicalEnvelope, RuntimeRequest } from "./types.js";

export function validateEnvelope(envelope: CanonicalEnvelope): string[] {
  const errors: string[] = [];
  if (!envelope.runId) errors.push("missing runId");
  if (!envelope.runtimeId) errors.push("missing runtimeId");
  if (!envelope.transport) errors.push("missing transport");
  if (!envelope.trustTier) errors.push("missing trustTier");
  if (!envelope.model?.provider) errors.push("missing model provider");
  if (!envelope.model?.model) errors.push("missing model id");
  if (envelope.sideEffecting && !envelope.idempotencyKey) {
    errors.push("missing idempotencyKey for side effecting request");
  }
  return errors;
}

export function translateEnvelope(envelope: CanonicalEnvelope): RuntimeRequest {
  const headers: Record<string, string> = {
    "x-agentforge-run-id": envelope.runId,
    "x-agentforge-runtime-id": envelope.runtimeId,
    "x-agentforge-trust-tier": envelope.trustTier,
    "x-agentforge-model-provider": envelope.model.provider,
    "x-agentforge-model-id": envelope.model.model,
  };
  if (envelope.imageModel) {
    headers["x-agentforge-image-model-provider"] = envelope.imageModel.provider;
    headers["x-agentforge-image-model-id"] = envelope.imageModel.model;
  }
  if (envelope.sideEffecting && envelope.idempotencyKey) {
    headers["idempotency-key"] = envelope.idempotencyKey;
  }
  return {
    runtime: envelope.runtimeId,
    transport: envelope.transport,
    model: envelope.model,
    imageModel: envelope.imageModel,
    payload: {
      request: envelope.request,
      policy: envelope.policy,
      reflection: envelope.reflection,
      sideEffecting: envelope.sideEffecting,
      model: envelope.model,
      imageModel: envelope.imageModel,
    },
    headers,
  };
}
