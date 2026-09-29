import crypto from "node:crypto";
import type { EvidencePack } from "../types/evidence.js";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "integrityHash")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [key, canonicalize(entry)]));
  }
  return value;
}

/** Compute the stable digest used to detect evidence-pack tampering. */
export function evidencePackIntegrityHash(pack: EvidencePack): string {
  return crypto.createHash("sha256").update(JSON.stringify(canonicalize(pack))).digest("hex");
}

/** Return true only when the pack carries a matching integrity digest. */
export function verifyEvidencePackIntegrity(pack: EvidencePack): boolean {
  return typeof pack.integrityHash === "string"
    && /^[a-f0-9]{64}$/.test(pack.integrityHash)
    && pack.integrityHash === evidencePackIntegrityHash(pack);
}

/** Attach a fresh digest to a newly generated evidence pack. */
export function sealEvidencePack(pack: EvidencePack): EvidencePack {
  return { ...pack, integrityHash: evidencePackIntegrityHash(pack) };
}
